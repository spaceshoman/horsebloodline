#!/usr/bin/env python3
"""
血統くん 出馬表自動取得スクリプト
使い方:
  python scripts/fetch_race.py <race_id> <json_id> --grade G1 --pace SLOW

例:
  python scripts/fetch_race.py 202606020811 tennoshoS2026 --grade G1 --pace SLOW
"""

import sys
import json
import time
import argparse
import re
from pathlib import Path

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("pip install requests beautifulsoup4")
    sys.exit(1)

SCRIPT_DIR = Path(__file__).parent
REPO_ROOT = SCRIPT_DIR.parent
STALLIONS_PATH = REPO_ROOT / "public" / "stallions.json"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

PACE_MAP = {
    "SLOW": ["ワールドプレミア","キタサンブラック","ハービンジャー","ルーラーシップ",
              "オルフェーヴル","ゴールドシップ","ポエティックフレア","フィエールマン",
              "ステイゴールド","ディープインパクト"],
    "HIGH": ["エピファネイア","キングカメハメハ","ヘニーヒューズ","モーリス",
              "リアルスティール","ロードカナロア","ドゥラメンテ"],
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

def fetch_entries(race_id):
    url = f"https://race.netkeiba.com/race/shutuba.html?race_id={race_id}"
    print(f"取得中: {url}")
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
            name = row.select_one(".HorseName a").text.strip()
            jockey_el = row.select_one(".Jockey a")
            jockey = jockey_el.text.strip() if jockey_el else ""
            peds = row.select(".Pedigree a")
            sire = peds[0].text.strip() if len(peds) > 0 else ""
            dam  = peds[1].text.strip() if len(peds) > 1 else ""
            bms  = peds[2].text.strip() if len(peds) > 2 else ""
            age_el = row.select_one(".Barei")
            age_m = re.search(r"\d+", age_el.text) if age_el else None
            age = age_m.group() if age_m else "3"
            runners.append({
                "num": num, "name": name,
                "sire": sire, "bms": bms, "dam": dam,
                "jockey": jockey, "age": age,
                "gradeWins": [], "paceType": get_pace_type(sire)
            })
        except Exception as e:
            print(f"  行スキップ: {e}")
    return race_name, sorted(runners, key=lambda x: x["num"])

def check_db(runners, stallions):
    print("\n=== DB チェック ===")
    miss_s = {r["sire"] for r in runners if r["sire"] and r["sire"] not in stallions}
    miss_b = {r["bms"]  for r in runners if r["bms"]  and r["bms"]  not in stallions}
    if miss_s: print(f"❌ 未登録 父  : {', '.join(sorted(miss_s))}")
    else:       print("✅ 父 全登録済み")
    if miss_b: print(f"❌ 未登録 母父: {', '.join(sorted(miss_b))}")
    else:       print("✅ 母父 全登録済み")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("race_id")
    parser.add_argument("json_id")
    parser.add_argument("--grade", default="G1", choices=["G1","G2","G3"])
    parser.add_argument("--pace",  default="BOTH", choices=["SLOW","HIGH","BOTH"])
    parser.add_argument("--dry",   action="store_true")
    args = parser.parse_args()

    stallions = load_stallions()
    print(f"種牡馬DB: {len(stallions)}頭")

    race_name, runners = fetch_entries(args.race_id)
    print(f"\n✅ {race_name} ({len(runners)}頭)\n")

    check_db(runners, stallions)

    print("\n=== 出走馬 ===")
    for r in runners:
        ok = "✅" if r["sire"] in stallions else "❌"
        print(f"  {r['num']:2} {r['name']:<16} 父:{r['sire']:<18} 母父:{r['bms']:<16} {r['jockey']:<10} {ok} ペース:{r['paceType']}")

    output = {
        "id": args.json_id,
        "expectedPace": args.pace,
        "runners": runners,
        "result": None, "review": None, "verification": None
    }

    if not args.dry:
        out_path = REPO_ROOT / "public" / "reviews" / f"{args.json_id}.json"
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
        print(f"\n✅ 保存: {out_path}")
        print(f"\n次のステップ:")
        print(f"  git add public/reviews/{args.json_id}.json")
        print(f"  git commit -m '{args.json_id} 出走馬データ追加'")
        print(f"  git push  ← 自動デプロイが走ります")
    else:
        print("\n[DRY RUN]")

if __name__ == "__main__":
    main()
