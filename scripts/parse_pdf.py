#!/usr/bin/env python3
"""
血統くん PDF出馬表パーサー
使い方:
  python scripts/parse_pdf.py pdfs/aobaSho2026.pdf aobaSho2026 --grade G2 --pace SLOW
"""
import re, json, sys, argparse
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    print("pip install pdfplumber")
    sys.exit(1)

REPO_ROOT = Path(__file__).parent.parent
REVIEWS_DIR = REPO_ROOT / "public" / "reviews"
STALLIONS_PATH = REPO_ROOT / "public" / "stallions.json"

PACE_MAP = {
    "SLOW": ["ワールドプレミア","キタサンブラック","ハービンジャー","ルーラーシップ",
             "オルフェーヴル","ゴールドシップ","ポエティックフレア","フィエールマン",
             "ステイゴールド","ディープインパクト","コントレイル","レイデオロ",
             "ゴールドアクター","ジャスタウェイ","リオンディーズ","ダノンバラード"],
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

def extract_sire_jockey(line):
    m = re.match(r'^[⽗父]\s+(.*?)\s+(\d+:\d+)', line)
    if not m:
        return None, ""
    before_time = m.group(1).strip()
    parts = before_time.split()
    # 外国人騎手（M.xxx D.xxx C.xxx形式）
    if len(parts) >= 2 and re.match(r'^[A-Za-z]\.[ァ-ヶー]+$', parts[-1]):
        return ' '.join(parts[:-1]), parts[-1]
    elif len(parts) >= 3:
        return ' '.join(parts[:-2]), ' '.join(parts[-2:])
    elif len(parts) == 2:
        return parts[0], parts[1]
    else:
        return parts[0], ""

def extract_bms(line):
    m = re.match(r'^[⺟母]\s+([\wァ-ヶーA-Za-z\s]+?)[（(]([\wァ-ヶーA-Za-z\s]+)[)）]', line)
    if m:
        return m.group(1).strip(), m.group(2).strip()
    return None, None

def parse_pdf(pdf_path):
    with pdfplumber.open(pdf_path) as pdf:
        text = "\n".join(p.extract_text() or "" for p in pdf.pages)
    lines = text.split("\n")

    # レース情報
    race_name_m = re.search(r'第\d+回\s+[\w\s・（）杯賞]+', text)
    race_name = race_name_m.group().strip() if race_name_m else "不明"
    course_m = re.search(r'コース\s+(\d+m\s+芝[・‧][左右])', text)
    course = course_m.group(1).replace('‧','·') if course_m else ""
    venue_m = re.search(r'^(\S+)\d+R', text, re.MULTILINE)
    venue = venue_m.group(1) if venue_m else ""

    # 馬名抽出
    horse_names = re.findall(
        r'([\u30A0-\u30FF\u4E00-\u9FFFa-zA-Z]{3,20})\s+[\d.]+\s+\(\d+番[人⼈]気\)',
        text
    )

    # 父・母父・騎手を行単位で抽出
    runners_data = []
    for i, line in enumerate(lines):
        if re.match(r'^[⽗父]\s+', line):
            sire, jockey = extract_sire_jockey(line)
            if not sire:
                continue
            dam, bms = "", ""
            for j in range(i+1, min(i+3, len(lines))):
                d, b = extract_bms(lines[j])
                if d and b:
                    dam, bms = d, b
                    break
            runners_data.append((sire, bms, dam, jockey))

    # 馬名と組み合わせ
    runners = []
    for idx, (sire, bms, dam, jockey) in enumerate(runners_data):
        name = horse_names[idx] if idx < len(horse_names) else ""
        runners.append({
            "num": idx+1,
            "name": name,
            "sire": sire,
            "bms": bms,
            "dam": dam,
            "jockey": jockey,
            "age": "3",
            "gradeWins": [],
            "paceType": get_pace_type(sire),
            "tan": None,
            "pop": None,
        })

    return race_name, venue, course, runners

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf_path")
    parser.add_argument("json_id")
    parser.add_argument("--grade", default="G2", choices=["G1","G2","G3"])
    parser.add_argument("--pace", default="BOTH", choices=["SLOW","HIGH","BOTH"])
    parser.add_argument("--dry", action="store_true")
    args = parser.parse_args()

    stallions = load_stallions()
    race_name, venue, course, runners = parse_pdf(args.pdf_path)

    print(f"✅ {race_name} ({len(runners)}頭)")
    print(f"   会場:{venue} コース:{course}")

    miss_s = {r["sire"] for r in runners if r["sire"] and r["sire"] not in stallions}
    miss_b = {r["bms"]  for r in runners if r["bms"]  and r["bms"]  not in stallions}
    if miss_s: print(f"⚠️  未登録 父: {miss_s}")
    else: print("✅ 父 全登録済み")
    if miss_b: print(f"⚠️  未登録 母父: {miss_b}")
    else: print("✅ 母父 全登録済み")

    print("\n=== パース結果 ===")
    for r in runners:
        ok = "✅" if r["sire"] in stallions else "❌"
        print(f"  {r['num']:2} {r['name']:<16} 父:{r['sire']:<20} 母父:{r['bms']:<16} {r['jockey']} {ok}")

    if args.dry:
        print("\n[DRY RUN] 保存しません")
        return

    output = {
        "id": args.json_id,
        "race_name": race_name,
        "expectedPace": args.pace,
        "runners": runners,
        "result": None, "review": None, "verification": None
    }
    out_path = REVIEWS_DIR / f"{args.json_id}.json"
    REVIEWS_DIR.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"\n✅ 保存: {out_path}")
    print(f"  git add public/reviews/{args.json_id}.json && git commit -m '{args.json_id} 追加' && git push")

if __name__ == "__main__":
    main()
