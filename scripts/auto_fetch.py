#!/usr/bin/env python3
import json, re, time, argparse, sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("pip install requests beautifulsoup4")
    sys.exit(1)

REPO_ROOT = Path(__file__).parent.parent
REVIEWS_DIR = REPO_ROOT / "public" / "reviews"
STALLIONS_PATH = REPO_ROOT / "public" / "stallions.json"
SCHEDULE_PATH = REPO_ROOT / "scripts" / "race_schedule.json"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
JST = timezone(timedelta(hours=9))

PACE_MAP = {
    "SLOW": ["ワールドプレミア","キタサンブラック","ハービンジャー","ルーラーシップ",
             "オルフェーヴル","ゴールドシップ","ポエティックフレア","フィエールマン",
             "ステイゴールド","ディープインパクト","ジャスタウェイ"],
    "HIGH": ["エピファネイア","キングカメハメハ","ヘニーヒューズ","モーリス",
             "リアルスティール","ロードカナロア","ドゥラメンテ","ホッコータルマエ"],
}

def get_pace_type(sire):
    for pace, sires in PACE_MAP.items():
        if sire in sires:
            return pace
    return "BOTH"

def load_stallions():
    if STALLIONS_PATH.exists():
        with open(STALLIONS_PATH) as f:
            return {s["name"]: s for s in json.load(f)}
    return {}

def fetch_grade_wins(horse_name, horse_url):
    try:
        time.sleep(1)
        res = requests.get(horse_url, headers=HEADERS, timeout=15)
        res.encoding = "EUC-JP"
        soup = BeautifulSoup(res.text, "html.parser")
        grade_wins = []
        for row in soup.select(".race_table_01 tr")[1:]:
            cells = row.select("td")
            if len(cells) < 12:
                continue
            race_name = cells[4].text.strip() if len(cells) > 4 else ""
            place_text = cells[11].text.strip() if len(cells) > 11 else ""
            grade = "G1" if "G1" in race_name else "G2" if "G2" in race_name else "G3" if "G3" in race_name else None
            if grade:
                try:
                    place = int(re.search(r"\d+", place_text).group())
                    if place <= 3:
                        race_clean = re.sub(r"[（(]G[123][)）]", "", race_name).strip()
                        grade_wins.append({"race": race_clean, "grade": grade, "place": place})
                except:
                    pass
        return grade_wins
    except Exception as e:
        print(f"  重賞実績取得失敗 {horse_name}: {e}")
        return []

def fetch_entries(race_id, json_id, grade="G1", expected_pace="BOTH"):
    url = f"https://race.netkeiba.com/race/shutuba.html?race_id={race_id}"
    print(f"[entries] {url}")
    res = requests.get(url, headers=HEADERS, timeout=15)
    res.encoding = "EUC-JP"
    if res.status_code != 200:
        raise Exception(f"HTTP {res.status_code}")
    soup = BeautifulSoup(res.text, "html.parser")
    race_name_el = soup.select_one(".RaceName")
    race_name = race_name_el.text.strip() if race_name_el else "不明"
    runners = []
    for row in soup.select(".HorseList"):
        try:
            num = int(row.select_one(".Umaban").text.strip())
            name_el = row.select_one(".HorseName a")
            name = name_el.text.strip() if name_el else ""
            horse_href = name_el["href"] if name_el and name_el.has_attr("href") else ""
            horse_url = f"https://db.netkeiba.com{horse_href}" if horse_href else ""
            jockey_el = row.select_one(".Jockey a")
            jockey = jockey_el.text.strip() if jockey_el else ""
            peds = row.select(".Pedigree a")
            sire = peds[0].text.strip() if len(peds) > 0 else ""
            dam  = peds[1].text.strip() if len(peds) > 1 else ""
            bms  = peds[2].text.strip() if len(peds) > 2 else ""
            age_el = row.select_one(".Barei")
            age_m = re.search(r"\d+", age_el.text) if age_el else None
            age = age_m.group() if age_m else "3"
            grade_wins = fetch_grade_wins(name, horse_url) if horse_url else []
            runners.append({"num":num,"name":name,"sire":sire,"bms":bms,"dam":dam,
                "jockey":jockey,"age":age,"gradeWins":grade_wins,
                "paceType":get_pace_type(sire),"tan":None,"pop":None})
        except Exception as e:
            print(f"  行スキップ: {e}")
    runners.sort(key=lambda x: x["num"])
    stallions = load_stallions()
    miss_s = {r["sire"] for r in runners if r["sire"] and r["sire"] not in stallions}
    miss_b = {r["bms"]  for r in runners if r["bms"]  and r["bms"]  not in stallions}
    if miss_s: print(f"  未登録 父: {miss_s}")
    if miss_b: print(f"  未登録 母父: {miss_b}")
    out_path = REVIEWS_DIR / f"{json_id}.json"
    existing = {}
    if out_path.exists():
        with open(out_path) as f:
            existing = json.load(f)
    output = {"id":json_id,"race_id":race_id,"race_name":race_name,
        "expectedPace":expected_pace,"runners":runners,
        "result":existing.get("result"),"review":existing.get("review"),
        "verification":existing.get("verification")}
    REVIEWS_DIR.mkdir(parents=True, exist_ok=True)
    with open(out_path,"w",encoding="utf-8") as f:
        json.dump(output,f,ensure_ascii=False,indent=2)
    print(f"  保存: {out_path} ({len(runners)}頭)")
    return output

def fetch_result(race_id, json_id):
    out_path = REVIEWS_DIR / f"{json_id}.json"
    if not out_path.exists():
        print(f"  スキップ（JSONなし）: {json_id}")
        return
    with open(out_path) as f:
        data = json.load(f)
    if data.get("result") and data["result"].get("time"):
        print(f"  スキップ（取得済み）: {json_id}")
        return
    url = f"https://race.netkeiba.com/race/result.html?race_id={race_id}"
    print(f"[results] {url}")
    time.sleep(2)
    res = requests.get(url, headers=HEADERS, timeout=15)
    res.encoding = "EUC-JP"
    if res.status_code != 200:
        print(f"  取得失敗: HTTP {res.status_code}")
        return
    soup = BeautifulSoup(res.text, "html.parser")
    top_finishers, full_order = [], []
    for row in soup.select(".RaceResults_Table tr")[1:]:
        cells = row.select("td")
        if len(cells) < 6:
            continue
        try:
            rank_text = cells[0].text.strip()
            rank = int(re.search(r"\d+", rank_text).group()) if re.search(r"\d+", rank_text) else 0
            num = int(cells[2].text.strip())
            name_el = cells[3].select_one("a")
            name = name_el.text.strip() if name_el else cells[3].text.strip()
            pop_text = cells[-1].text.strip()
            pop = int(re.search(r"\d+", pop_text).group()) if re.search(r"\d+", pop_text) else 0
            jockey_el = cells[6].select_one("a") if len(cells) > 6 else None
            jockey = jockey_el.text.strip() if jockey_el else ""
            full_order.append({"rank":rank,"name":name,"pop":pop})
            if rank <= 5:
                runner_data = next((r for r in data.get("runners",[]) if r["num"]==num), {})
                top_finishers.append({"rank":rank,"num":num,"name":name,"pop":pop,
                    "jockey":jockey,"sire":runner_data.get("sire",""),
                    "bms":runner_data.get("bms",""),"margin":"","style":"","note":""})
        except Exception as e:
            print(f"  行パースエラー: {e}")
    if not full_order:
        print(f"  結果テーブルが空: {json_id}")
        return
    payouts = {}
    payout_map = {"単勝":"tansho","複勝":"fukusho","枠連":"wakuren",
        "馬連":"umaren","ワイド":"wide","馬単":"umatan","3連複":"sanrenpuku","3連単":"sanrentan"}
    for row in soup.select(".Payout_Detail_Table tr"):
        th = row.select_one("th")
        tds = row.select("td")
        if th and tds:
            key = payout_map.get(th.text.strip())
            if key:
                nums = [td.text.strip() for td in tds if td.text.strip()]
                payouts[key] = " / ".join(nums[:2]) if len(nums)>=2 else nums[0] if nums else ""
    data["result"] = {"time":"","payouts":payouts,"topFinishers":top_finishers,"fullOrder":full_order}
    with open(out_path,"w",encoding="utf-8") as f:
        json.dump(data,f,ensure_ascii=False,indent=2)
    print(f"  結果更新: {out_path}")

def load_schedule():
    if not SCHEDULE_PATH.exists():
        print(f"スケジュールファイルなし: {SCHEDULE_PATH}")
        return []
    with open(SCHEDULE_PATH) as f:
        return json.load(f)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["entries","results"], required=True)
    parser.add_argument("--race", nargs=4, metavar=("RACE_ID","JSON_ID","GRADE","PACE"))
    args = parser.parse_args()
    now = datetime.now(JST)
    print(f"実行時刻(JST): {now.strftime('%Y-%m-%d %H:%M')} / モード: {args.mode}")
    if args.race:
        race_id, json_id, grade, pace = args.race
        if args.mode == "entries":
            fetch_entries(race_id, json_id, grade, pace)
        else:
            fetch_result(race_id, json_id)
        return
    schedule = load_schedule()
    if not schedule:
        print("スケジュールが空です")
        return
    processed = 0
    for race in schedule:
        json_id  = race["json_id"]
        race_id  = race.get("race_id","")
        grade    = race.get("grade","G1")
        pace     = race.get("expectedPace","BOTH")
        race_date = race.get("date","")
        if not race_id:
            print(f"スキップ（race_id未設定）: {json_id}")
            continue
        if args.mode == "entries":
            out_path = REVIEWS_DIR / f"{json_id}.json"
            has_runners = False
            if out_path.exists():
                with open(out_path) as f:
                    d = json.load(f)
                has_runners = bool(d.get("runners"))
            if not has_runners:
                print(f"\n--- {json_id} ({race_date}) ---")
                try:
                    fetch_entries(race_id, json_id, grade, pace)
                    processed += 1
                except Exception as e:
                    print(f"  エラー: {e}")
        elif args.mode == "results":
            try:
                race_date_dt = datetime.strptime(race_date,"%Y/%m/%d").replace(tzinfo=JST)
            except:
                continue
            if race_date_dt.date() <= now.date():
                out_path = REVIEWS_DIR / f"{json_id}.json"
                has_result = False
                if out_path.exists():
                    with open(out_path) as f:
                        d = json.load(f)
                    has_result = bool(d.get("result") and d["result"].get("time"))
                if not has_result:
                    print(f"\n--- {json_id} ({race_date}) ---")
                    try:
                        fetch_result(race_id, json_id)
                        processed += 1
                    except Exception as e:
                        print(f"  エラー: {e}")
    print(f"\n完了: {processed}件処理")

if __name__ == "__main__":
    main()
