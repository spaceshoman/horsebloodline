import { useState, useEffect, useMemo, useCallback, useRef } from "react";

/* ===== Constants ===== */
const SURFACE = { TURF:"芝", DIRT:"ダート", BOTH:"芝・ダート兼用" };
const DISTANCE = { SPRINT:"短距離 (~1400m)", MILE:"マイル (1400~1800m)", MIDDLE:"中距離 (1800~2400m)", LONG:"長距離 (2400m~)", VERSATILE:"万能" };
const DIST_SHORT = { SPRINT:"短距離", MILE:"マイル", MIDDLE:"中距離", LONG:"長距離" };
const COURSE = { RIGHT:"右回り", LEFT:"左回り", BOTH:"左右兼用" };
const GROWTH = { EARLY:"早熟", NORMAL:"普通", LATE:"晩成" };
const TRACK_COND = { GOOD:"良", SLIGHTLY_HEAVY:"稍重", HEAVY:"重", BAD:"不良" };
const VENUES = {
  tokyo:{name:"東京",course:"LEFT",surface:["TURF","DIRT"],distances:["SPRINT","MILE","MIDDLE","LONG"]},
  nakayama:{name:"中山",course:"RIGHT",surface:["TURF","DIRT"],distances:["SPRINT","MILE","MIDDLE","LONG"]},
  hanshin:{name:"阪神",course:"RIGHT",surface:["TURF","DIRT"],distances:["SPRINT","MILE","MIDDLE","LONG"]},
  kyoto:{name:"京都",course:"RIGHT",surface:["TURF","DIRT"],distances:["SPRINT","MILE","MIDDLE","LONG"]},
  chukyo:{name:"中京",course:"LEFT",surface:["TURF","DIRT"],distances:["SPRINT","MILE","MIDDLE"]},
  kokura:{name:"小倉",course:"RIGHT",surface:["TURF","DIRT"],distances:["SPRINT","MILE","MIDDLE"]},
  niigata:{name:"新潟",course:"LEFT",surface:["TURF","DIRT"],distances:["SPRINT","MILE","MIDDLE"]},
  sapporo:{name:"札幌",course:"RIGHT",surface:["TURF","DIRT"],distances:["SPRINT","MILE","MIDDLE"]},
  hakodate:{name:"函館",course:"RIGHT",surface:["TURF","DIRT"],distances:["SPRINT","MILE"]},
  ooi:{name:"大井",course:"RIGHT",surface:["DIRT"],distances:["SPRINT","MILE","MIDDLE"]},
  funabashi:{name:"船橋",course:"LEFT",surface:["DIRT"],distances:["SPRINT","MILE","MIDDLE"]},
  kawasaki:{name:"川崎",course:"LEFT",surface:["DIRT"],distances:["SPRINT","MILE"]},
  monbetsu:{name:"門別",course:"RIGHT",surface:["DIRT"],distances:["SPRINT","MILE","MIDDLE"]},
};

/* ===== Stallion Data (50 horses) ===== */
const STALLIONS=[
  {id:"1",name:"ディープインパクト",nameEn:"Deep Impact",pedigree:{sire:"サンデーサイレンス",dam:"ウインドインハーヘア",sireOfSire:"ヘイロー",damOfSire:"ワキア",sireOfDam:"アルザオ",damOfDam:"バーグクレア"},surface:"TURF",distanceMin:"MILE",distanceMax:"LONG",course:"BOTH",growth:"NORMAL",heavyTrack:2,staminaScore:8,speedScore:9,powerScore:6,notes:"日本競馬史上最高の種牡馬。芝中長距離で圧倒的。瞬発力に優れた産駒多数。"},
  {id:"2",name:"キングカメハメハ",nameEn:"King Kamehameha",pedigree:{sire:"キングマンボ",dam:"マンファス",sireOfSire:"ミスタープロスペクター",damOfSire:"ミエスク",sireOfDam:"ラストタイクーン",damOfDam:"パイロットバード"},surface:"BOTH",distanceMin:"SPRINT",distanceMax:"MIDDLE",course:"BOTH",growth:"EARLY",heavyTrack:7,staminaScore:7,speedScore:8,powerScore:9,notes:"芝ダート兼用の万能種牡馬。パワーとスピードの両立。重馬場にも強い。"},
  {id:"3",name:"ドゥラメンテ",nameEn:"Duramente",pedigree:{sire:"キングカメハメハ",dam:"アドマイヤグルーヴ",sireOfSire:"キングマンボ",damOfSire:"マンファス",sireOfDam:"サンデーサイレンス",damOfDam:"エアグルーヴ"},surface:"TURF",distanceMin:"MILE",distanceMax:"MIDDLE",course:"BOTH",growth:"NORMAL",heavyTrack:5,staminaScore:7,speedScore:9,powerScore:8,notes:"二冠馬。キンカメ×SSの黄金配合。タイトルホルダー等輩出。"},
  {id:"4",name:"ハーツクライ",nameEn:"Heart's Cry",pedigree:{sire:"サンデーサイレンス",dam:"アイリッシュダンス",sireOfSire:"ヘイロー",damOfSire:"ワキア",sireOfDam:"トニービン",damOfDam:"ビューパーダンス"},surface:"TURF",distanceMin:"MIDDLE",distanceMax:"LONG",course:"LEFT",growth:"LATE",heavyTrack:5,staminaScore:9,speedScore:7,powerScore:7,notes:"晩成型の中長距離種牡馬。東京コース（左回り）に強い。"},
  {id:"5",name:"キタサンブラック",nameEn:"Kitasan Black",pedigree:{sire:"ブラックタイド",dam:"シュガーハート",sireOfSire:"サンデーサイレンス",damOfSire:"ウインドインハーヘア",sireOfDam:"サクラバクシンオー",damOfDam:"オトメゴコロ"},surface:"TURF",distanceMin:"MILE",distanceMax:"LONG",course:"BOTH",growth:"NORMAL",heavyTrack:6,staminaScore:9,speedScore:8,powerScore:8,notes:"年度代表馬2回。イクイノックスを輩出した大種牡馬。万能型。"},
  {id:"6",name:"エピファネイア",nameEn:"Epiphaneia",pedigree:{sire:"シンボリクリスエス",dam:"シーザリオ",sireOfSire:"クリスエス",damOfSire:"ティーケイ",sireOfDam:"スペシャルウィーク",damOfDam:"キロフプリミエール"},surface:"TURF",distanceMin:"MILE",distanceMax:"LONG",course:"BOTH",growth:"NORMAL",heavyTrack:4,staminaScore:8,speedScore:8,powerScore:7,notes:"ジャパンC圧勝。デアリングタクト、エフフォーリア等輩出。"},
  {id:"7",name:"ロードカナロア",nameEn:"Lord Kanaloa",pedigree:{sire:"キングカメハメハ",dam:"レディブラッサム",sireOfSire:"キングマンボ",damOfSire:"マンファス",sireOfDam:"ストームキャット",damOfDam:"サラトガデュー"},surface:"TURF",distanceMin:"SPRINT",distanceMax:"MILE",course:"BOTH",growth:"EARLY",heavyTrack:4,staminaScore:5,speedScore:10,powerScore:7,notes:"スプリント〜マイルの絶対王者。アーモンドアイ等輩出。"},
  {id:"8",name:"キズナ",nameEn:"Kizuna",pedigree:{sire:"ディープインパクト",dam:"キャットクイル",sireOfSire:"サンデーサイレンス",damOfSire:"ウインドインハーヘア",sireOfDam:"ストームキャット",damOfDam:"キューキュー"},surface:"TURF",distanceMin:"MILE",distanceMax:"MIDDLE",course:"BOTH",growth:"NORMAL",heavyTrack:5,staminaScore:7,speedScore:8,powerScore:7,notes:"ダービー馬。ディープ後継。ソングライン等輩出。"},
  {id:"9",name:"オルフェーヴル",nameEn:"Orfevre",pedigree:{sire:"ステイゴールド",dam:"オリエンタルアート",sireOfSire:"サンデーサイレンス",damOfSire:"ゴールデンサッシュ",sireOfDam:"メジロマックイーン",damOfDam:"エレクトロアート"},surface:"TURF",distanceMin:"MIDDLE",distanceMax:"LONG",course:"BOTH",growth:"NORMAL",heavyTrack:6,staminaScore:9,speedScore:8,powerScore:8,notes:"三冠馬。凱旋門賞2着2回。ラッキーライラック等輩出。"},
  {id:"10",name:"ステイゴールド",nameEn:"Stay Gold",pedigree:{sire:"サンデーサイレンス",dam:"ゴールデンサッシュ",sireOfSire:"ヘイロー",damOfSire:"ワキア",sireOfDam:"ディクタス",damOfDam:"ダイナサッシュ"},surface:"TURF",distanceMin:"MIDDLE",distanceMax:"LONG",course:"BOTH",growth:"LATE",heavyTrack:5,staminaScore:9,speedScore:7,powerScore:7,notes:"オルフェーヴル、ゴールドシップ等を輩出。晩成型多い。"},
  {id:"11",name:"サンデーサイレンス",nameEn:"Sunday Silence",pedigree:{sire:"ヘイロー",dam:"ワキア",sireOfSire:"ヘイルトゥリーズン",damOfSire:"コスマー",sireOfDam:"ミスワキ",damOfDam:"マジックスリッカー"},surface:"TURF",distanceMin:"MILE",distanceMax:"LONG",course:"BOTH",growth:"NORMAL",heavyTrack:4,staminaScore:8,speedScore:9,powerScore:7,notes:"日本競馬を変革した大種牡馬。13回のリーディングサイアー。"},
  {id:"12",name:"サクラバクシンオー",nameEn:"Sakura Bakushin O",pedigree:{sire:"サクラユタカオー",dam:"サクラハゴロモ",sireOfSire:"テスコボーイ",damOfSire:"アンジェリカ",sireOfDam:"ノーザンテースト",damOfDam:"クリノハナ"},surface:"TURF",distanceMin:"SPRINT",distanceMax:"SPRINT",course:"BOTH",growth:"EARLY",heavyTrack:4,staminaScore:3,speedScore:10,powerScore:6,notes:"スプリントの絶対王者。産駒もスプリント〜マイルに集中。"},
  {id:"13",name:"ダイワメジャー",nameEn:"Daiwa Major",pedigree:{sire:"サンデーサイレンス",dam:"スカーレットブーケ",sireOfSire:"ヘイロー",damOfSire:"ワキア",sireOfDam:"ノーザンテースト",damOfDam:"スカーレットインク"},surface:"TURF",distanceMin:"SPRINT",distanceMax:"MILE",course:"BOTH",growth:"EARLY",heavyTrack:5,staminaScore:6,speedScore:9,powerScore:8,notes:"マイル王。先行力のある産駒多い。"},
  {id:"14",name:"フジキセキ",nameEn:"Fuji Kiseki",pedigree:{sire:"サンデーサイレンス",dam:"ミルレーサー",sireOfSire:"ヘイロー",damOfSire:"ワキア",sireOfDam:"ミルジョージ",damOfDam:"イットー"},surface:"BOTH",distanceMin:"SPRINT",distanceMax:"MILE",course:"BOTH",growth:"EARLY",heavyTrack:6,staminaScore:5,speedScore:9,powerScore:7,notes:"SS初年度産駒の最高傑作。芝ダート兼用。"},
  {id:"15",name:"ジャスタウェイ",nameEn:"Just a Way",pedigree:{sire:"ハーツクライ",dam:"シビル",sireOfSire:"サンデーサイレンス",damOfSire:"アイリッシュダンス",sireOfDam:"ワイルドアゲイン",damOfDam:"シャーリーリーダー"},surface:"TURF",distanceMin:"MILE",distanceMax:"MIDDLE",course:"LEFT",growth:"LATE",heavyTrack:4,staminaScore:7,speedScore:9,powerScore:6,notes:"ドバイDF圧勝のレーティング世界1位馬。晩成型。"},
  {id:"16",name:"ヴィクトワールピサ",nameEn:"Victoire Pisa",pedigree:{sire:"ネオユニヴァース",dam:"ホワイトウォーターアフェア",sireOfSire:"サンデーサイレンス",damOfSire:"ポインテッドパス",sireOfDam:"マキャヴェリアン",damOfDam:"ホワイトスター"},surface:"BOTH",distanceMin:"MILE",distanceMax:"MIDDLE",course:"BOTH",growth:"NORMAL",heavyTrack:6,staminaScore:7,speedScore:7,powerScore:7,notes:"ドバイWC優勝馬。芝ダート兼用。"},
  {id:"17",name:"ルーラーシップ",nameEn:"Rulership",pedigree:{sire:"キングカメハメハ",dam:"エアグルーヴ",sireOfSire:"キングマンボ",damOfSire:"マンファス",sireOfDam:"トニービン",damOfDam:"ダイナカール"},surface:"TURF",distanceMin:"MILE",distanceMax:"MIDDLE",course:"BOTH",growth:"NORMAL",heavyTrack:6,staminaScore:7,speedScore:7,powerScore:8,notes:"QE2世C優勝。パワー型の産駒多い。"},
  {id:"18",name:"ブラックタイド",nameEn:"Black Tide",pedigree:{sire:"サンデーサイレンス",dam:"ウインドインハーヘア",sireOfSire:"ヘイロー",damOfSire:"ワキア",sireOfDam:"アルザオ",damOfDam:"バーグクレア"},surface:"TURF",distanceMin:"MILE",distanceMax:"MIDDLE",course:"BOTH",growth:"NORMAL",heavyTrack:5,staminaScore:7,speedScore:7,powerScore:7,notes:"ディープの全兄。キタサンブラックの父。"},
  {id:"19",name:"ゴールドシップ",nameEn:"Gold Ship",pedigree:{sire:"ステイゴールド",dam:"ポイントフラッグ",sireOfSire:"サンデーサイレンス",damOfSire:"ゴールデンサッシュ",sireOfDam:"メジロマックイーン",damOfDam:"パストラリズム"},surface:"TURF",distanceMin:"MIDDLE",distanceMax:"LONG",course:"RIGHT",growth:"LATE",heavyTrack:8,staminaScore:10,speedScore:6,powerScore:9,notes:"重馬場の鬼。右回り巧者。"},
  {id:"20",name:"タニノギムレット",nameEn:"Tanino Gimlet",pedigree:{sire:"ブライアンズタイム",dam:"タニノクリスタル",sireOfSire:"ロベルト",damOfSire:"ケリーズデイ",sireOfDam:"クリスタルパレス",damOfDam:"タニノシーバード"},surface:"TURF",distanceMin:"MILE",distanceMax:"MIDDLE",course:"BOTH",growth:"NORMAL",heavyTrack:5,staminaScore:7,speedScore:8,powerScore:7,notes:"ダービー馬。ウオッカの父。"},
  {id:"21",name:"クロフネ",nameEn:"Kurofune",pedigree:{sire:"フレンチデピュティ",dam:"ブルーアヴェニュー",sireOfSire:"デピュティミニスター",damOfSire:"ミッターバルト",sireOfDam:"クラシックゴーゴー",damOfDam:"プロパーリアリティ"},surface:"BOTH",distanceMin:"SPRINT",distanceMax:"MILE",course:"BOTH",growth:"EARLY",heavyTrack:8,staminaScore:5,speedScore:9,powerScore:8,notes:"芝ダート兼用。ホエールキャプチャ等輩出。"},
  {id:"22",name:"ネオユニヴァース",nameEn:"Neo Universe",pedigree:{sire:"サンデーサイレンス",dam:"ポインテッドパス",sireOfSire:"ヘイロー",damOfSire:"ワキア",sireOfDam:"カリスタグローリ",damOfDam:"ベストパス"},surface:"TURF",distanceMin:"MILE",distanceMax:"MIDDLE",course:"BOTH",growth:"NORMAL",heavyTrack:5,staminaScore:7,speedScore:8,powerScore:7,notes:"二冠馬。ヴィクトワールピサ等輩出。"},
  {id:"23",name:"アグネスタキオン",nameEn:"Agnes Tachyon",pedigree:{sire:"サンデーサイレンス",dam:"アグネスフローラ",sireOfSire:"ヘイロー",damOfSire:"ワキア",sireOfDam:"ロイヤルスキー",damOfDam:"アグネスレディー"},surface:"TURF",distanceMin:"MILE",distanceMax:"MIDDLE",course:"BOTH",growth:"EARLY",heavyTrack:3,staminaScore:6,speedScore:10,powerScore:6,notes:"幻の三冠馬。驚異的なスピード。"},
  {id:"24",name:"アドマイヤムーン",nameEn:"Admire Moon",pedigree:{sire:"エンドスウィープ",dam:"マイケイティーズ",sireOfSire:"フォーティナイナー",damOfSire:"ブルームダンス",sireOfDam:"サンデーサイレンス",damOfDam:"ケイティーズファースト"},surface:"BOTH",distanceMin:"MILE",distanceMax:"MIDDLE",course:"BOTH",growth:"NORMAL",heavyTrack:6,staminaScore:7,speedScore:8,powerScore:7,notes:"宝塚記念・JC優勝。芝ダート兼用。"},
  {id:"25",name:"スマートファルコン",nameEn:"Smart Falcon",pedigree:{sire:"ゴールドアリュール",dam:"ケイシュウハーブ",sireOfSire:"サンデーサイレンス",damOfSire:"ニキーヤ",sireOfDam:"ブライアンズタイム",damOfDam:"エビスファミリー"},surface:"DIRT",distanceMin:"MILE",distanceMax:"MIDDLE",course:"BOTH",growth:"NORMAL",heavyTrack:9,staminaScore:8,speedScore:8,powerScore:9,notes:"ダートの帝王。ゴールドアリュール産駒。"},
  {id:"26",name:"ヘニーヒューズ",nameEn:"Hennessy Hughes",pedigree:{sire:"ヘネシー",dam:"メドウフライヤー",sireOfSire:"ストームキャット",damOfSire:"アイランドキティ",sireOfDam:"メドウレイク",damOfDam:"フロムアフリカ"},surface:"DIRT",distanceMin:"SPRINT",distanceMax:"MILE",course:"BOTH",growth:"EARLY",heavyTrack:9,staminaScore:5,speedScore:9,powerScore:10,notes:"ダート短距離のスペシャリスト。モーニン等輩出。"},
  {id:"27",name:"ダイワスカーレット",nameEn:"Daiwa Scarlet",pedigree:{sire:"アグネスタキオン",dam:"スカーレットブーケ",sireOfSire:"サンデーサイレンス",damOfSire:"アグネスフローラ",sireOfDam:"ノーザンテースト",damOfDam:"スカーレットインク"},surface:"TURF",distanceMin:"MILE",distanceMax:"MIDDLE",course:"BOTH",growth:"EARLY",heavyTrack:5,staminaScore:7,speedScore:9,powerScore:7,notes:"無敗の有馬記念馬（繁殖牝馬）。"},
  {id:"28",name:"シンボリクリスエス",nameEn:"Symboli Kris S",pedigree:{sire:"クリスエス",dam:"ティーケイ",sireOfSire:"ロベルト",damOfSire:"シャープクイーン",sireOfDam:"ゴールドメリディアン",damOfDam:"ウェルシュマフィン"},surface:"TURF",distanceMin:"MIDDLE",distanceMax:"LONG",course:"BOTH",growth:"NORMAL",heavyTrack:5,staminaScore:8,speedScore:7,powerScore:8,notes:"有馬記念連覇。エピファネイア等輩出。"},
  {id:"29",name:"ハービンジャー",nameEn:"Harbinger",pedigree:{sire:"デインヒル",dam:"ペナンパール",sireOfSire:"ダンジグ",damOfSire:"ラズヤナ",sireOfDam:"ベリングリー",damOfDam:"コーラルケイヴ"},surface:"TURF",distanceMin:"MILE",distanceMax:"LONG",course:"BOTH",growth:"LATE",heavyTrack:6,staminaScore:8,speedScore:7,powerScore:8,notes:"キングジョージ圧勝。ナミュール等輩出。パワー型。"},
  {id:"30",name:"ディープブリランテ",nameEn:"Deep Brillante",pedigree:{sire:"ディープインパクト",dam:"ラヴアンドバブルズ",sireOfSire:"サンデーサイレンス",damOfSire:"ウインドインハーヘア",sireOfDam:"アサーティヴ",damOfDam:"ミリオンズインライト"},surface:"TURF",distanceMin:"MILE",distanceMax:"MIDDLE",course:"BOTH",growth:"NORMAL",heavyTrack:4,staminaScore:7,speedScore:8,powerScore:6,notes:"ダービー馬。ディープインパクト産駒。"},
  {id:"31",name:"メイショウサムソン",nameEn:"Meisho Samson",pedigree:{sire:"オペラハウス",dam:"マイヴィヴィアン",sireOfSire:"サドラーズウェルズ",damOfSire:"カラーズフライング",sireOfDam:"ダンシングブレーヴ",damOfDam:"マイクリスタル"},surface:"TURF",distanceMin:"MIDDLE",distanceMax:"LONG",course:"RIGHT",growth:"LATE",heavyTrack:7,staminaScore:9,speedScore:6,powerScore:8,notes:"二冠馬。欧州血統の重厚さ。スタミナ・重馬場に優れた産駒。"},
  {id:"32",name:"タートルボウル",nameEn:"Turtle Bowl",pedigree:{sire:"ディンヒル",dam:"クララボウ",sireOfSire:"ダンジグ",damOfSire:"ラズヤナ",sireOfDam:"セクレタリアト",damOfDam:"バブルカンパニー"},surface:"TURF",distanceMin:"MILE",distanceMax:"MIDDLE",course:"BOTH",growth:"NORMAL",heavyTrack:5,staminaScore:6,speedScore:7,powerScore:7,notes:"仏マイルG1馬。トリオンフ等輩出。"},
  {id:"33",name:"キングヘイロー",nameEn:"King Halo",pedigree:{sire:"ダンシングブレーヴ",dam:"グッバイヘイロー",sireOfSire:"リファール",damOfSire:"ナバジョプリンセス",sireOfDam:"ヘイロー",damOfDam:"パウンドフーリッシュ"},surface:"TURF",distanceMin:"SPRINT",distanceMax:"MILE",course:"BOTH",growth:"EARLY",heavyTrack:4,staminaScore:5,speedScore:9,powerScore:6,notes:"高松宮記念優勝。カワカミプリンセス等輩出。"},
  {id:"34",name:"アドマイヤベガ",nameEn:"Admire Vega",pedigree:{sire:"サンデーサイレンス",dam:"ベガ",sireOfSire:"ヘイロー",damOfSire:"ワキア",sireOfDam:"トニービン",damOfDam:"アンティックヴァリュー"},surface:"TURF",distanceMin:"MILE",distanceMax:"MIDDLE",course:"BOTH",growth:"NORMAL",heavyTrack:4,staminaScore:7,speedScore:8,powerScore:6,notes:"ダービー馬。母ベガもオークス馬。"},
  {id:"35",name:"ライスシャワー",nameEn:"Rice Shower",pedigree:{sire:"リアルシャダイ",dam:"ライラックポイント",sireOfSire:"ロベルト",damOfSire:"デザートヴィクセン",sireOfDam:"ラッキーキャスト",damOfDam:"クリスパーレ"},surface:"TURF",distanceMin:"LONG",distanceMax:"LONG",course:"RIGHT",growth:"LATE",heavyTrack:7,staminaScore:10,speedScore:5,powerScore:8,notes:"天皇賞(春)2勝。長距離のスペシャリスト。"},
  {id:"36",name:"マンハッタンカフェ",nameEn:"Manhattan Cafe",pedigree:{sire:"サンデーサイレンス",dam:"サトルチェンジ",sireOfSire:"ヘイロー",damOfSire:"ワキア",sireOfDam:"ローソサエティー",damOfDam:"サンタルチアナ"},surface:"TURF",distanceMin:"MIDDLE",distanceMax:"LONG",course:"BOTH",growth:"LATE",heavyTrack:5,staminaScore:9,speedScore:7,powerScore:7,notes:"菊花賞・有馬記念・天皇賞(春)制覇。"},
  {id:"37",name:"エイシンフラッシュ",nameEn:"Eishin Flash",pedigree:{sire:"キングズベスト",dam:"ムーンレディ",sireOfSire:"キングマンボ",damOfSire:"アリリアン",sireOfDam:"モンズン",damOfDam:"ムーンイズアップ"},surface:"TURF",distanceMin:"MIDDLE",distanceMax:"MIDDLE",course:"LEFT",growth:"NORMAL",heavyTrack:3,staminaScore:7,speedScore:8,powerScore:6,notes:"ダービー馬・天皇賞(秋)優勝。東京に強い。"},
  {id:"38",name:"ロゴタイプ",nameEn:"Logotype",pedigree:{sire:"ローエングリン",dam:"ステレオタイプ",sireOfSire:"シングスピール",damOfSire:"カーリング",sireOfDam:"クロフネ",damOfDam:"ステレオティカル"},surface:"TURF",distanceMin:"SPRINT",distanceMax:"MILE",course:"BOTH",growth:"EARLY",heavyTrack:4,staminaScore:5,speedScore:8,powerScore:7,notes:"皐月賞・安田記念優勝。マイル前後に強い。"},
  {id:"39",name:"ミッキーアイル",nameEn:"Mikki Isle",pedigree:{sire:"ディープインパクト",dam:"スターアイル",sireOfSire:"サンデーサイレンス",damOfSire:"ウインドインハーヘア",sireOfDam:"ロックオブジブラルタル",damOfDam:"アイルドフランス"},surface:"TURF",distanceMin:"SPRINT",distanceMax:"MILE",course:"BOTH",growth:"EARLY",heavyTrack:3,staminaScore:4,speedScore:9,powerScore:6,notes:"NHKマイルC・マイルCS優勝。スピード特化型。"},
  {id:"40",name:"リアルスティール",nameEn:"Real Steel",pedigree:{sire:"ディープインパクト",dam:"ラヴズオンリーミー",sireOfSire:"サンデーサイレンス",damOfSire:"ウインドインハーヘア",sireOfDam:"ストームキャット",damOfDam:"マイグッドネス"},surface:"TURF",distanceMin:"MILE",distanceMax:"MIDDLE",course:"BOTH",growth:"NORMAL",heavyTrack:4,staminaScore:7,speedScore:8,powerScore:7,notes:"ドバイターフ優勝。ディープ後継種牡馬。"},
  {id:"41",name:"ダノンシャンティ",nameEn:"Danon Chantilly",pedigree:{sire:"フジキセキ",dam:"シャンソネット",sireOfSire:"サンデーサイレンス",damOfSire:"ミルレーサー",sireOfDam:"ノーザンテースト",damOfDam:"サエキスイレン"},surface:"TURF",distanceMin:"MILE",distanceMax:"MILE",course:"BOTH",growth:"EARLY",heavyTrack:3,staminaScore:5,speedScore:9,powerScore:6,notes:"NHKマイルCレコード勝ち。マイル専門。"},
  {id:"42",name:"モーリス",nameEn:"Maurice",pedigree:{sire:"スクリーンヒーロー",dam:"メジロフランシス",sireOfSire:"グラスワンダー",damOfSire:"ランニングヒロイン",sireOfDam:"カーネギー",damOfDam:"メジロモントレー"},surface:"TURF",distanceMin:"MILE",distanceMax:"MIDDLE",course:"BOTH",growth:"LATE",heavyTrack:5,staminaScore:7,speedScore:9,powerScore:8,notes:"安田記念・マイルCS・香港マイル・香港C制覇。ジャックドール等輩出。"},
  {id:"43",name:"シュヴァルグラン",nameEn:"Cheval Grand",pedigree:{sire:"ハーツクライ",dam:"ハルーワスウィート",sireOfSire:"サンデーサイレンス",damOfSire:"アイリッシュダンス",sireOfDam:"マキャヴェリアン",damOfDam:"ハルーワソング"},surface:"TURF",distanceMin:"MIDDLE",distanceMax:"LONG",course:"LEFT",growth:"LATE",heavyTrack:5,staminaScore:9,speedScore:7,powerScore:7,notes:"ジャパンC優勝。晩成型。左回りに強い。"},
  {id:"44",name:"サトノダイヤモンド",nameEn:"Satono Diamond",pedigree:{sire:"ディープインパクト",dam:"マルペンサ",sireOfSire:"サンデーサイレンス",damOfSire:"ウインドインハーヘア",sireOfDam:"オルペン",damOfDam:"マルカバニラ"},surface:"TURF",distanceMin:"MIDDLE",distanceMax:"LONG",course:"BOTH",growth:"NORMAL",heavyTrack:4,staminaScore:8,speedScore:8,powerScore:7,notes:"菊花賞・有馬記念優勝。ディープ後継の中長距離型。"},
  {id:"45",name:"リオンディーズ",nameEn:"Leontes",pedigree:{sire:"キングカメハメハ",dam:"シーザリオ",sireOfSire:"キングマンボ",damOfSire:"マンファス",sireOfDam:"スペシャルウィーク",damOfDam:"キロフプリミエール"},surface:"TURF",distanceMin:"MILE",distanceMax:"MIDDLE",course:"BOTH",growth:"NORMAL",heavyTrack:5,staminaScore:7,speedScore:8,powerScore:8,notes:"朝日杯FS優勝。エピファネイアの全弟。"},
  {id:"46",name:"タワーオブロンドン",nameEn:"Tower of London",pedigree:{sire:"レイヴンズパス",dam:"スノーパイン",sireOfSire:"エルーシヴクオリティ",damOfSire:"アスキリー",sireOfDam:"パインブラフ",damOfDam:"アスペンリーフ"},surface:"TURF",distanceMin:"SPRINT",distanceMax:"SPRINT",course:"BOTH",growth:"EARLY",heavyTrack:4,staminaScore:4,speedScore:10,powerScore:7,notes:"スプリンターズS優勝。スプリント特化型。"},
  {id:"47",name:"シニスターミニスター",nameEn:"Sinister Minister",pedigree:{sire:"オールドトリエステ",dam:"スウィートミニスター",sireOfSire:"エーピーインディ",damOfSire:"トリコロールアイ",sireOfDam:"ザプライムミニスター",damOfDam:"スウィートビド"},surface:"DIRT",distanceMin:"MILE",distanceMax:"MIDDLE",course:"BOTH",growth:"NORMAL",heavyTrack:9,staminaScore:7,speedScore:7,powerScore:9,notes:"ダート中距離のスペシャリスト。テーオーケインズ等輩出。"},
  {id:"48",name:"パイロ",nameEn:"Pyro",pedigree:{sire:"プルピット",dam:"ワイルドヴィジョン",sireOfSire:"エーピーインディ",damOfSire:"プレイ",sireOfDam:"ワイルドアゲイン",damOfDam:"キャロルズクリスマス"},surface:"DIRT",distanceMin:"SPRINT",distanceMax:"MILE",course:"BOTH",growth:"EARLY",heavyTrack:8,staminaScore:5,speedScore:8,powerScore:9,notes:"ダート短距離〜マイル。メイショウハリオ等輩出。"},
  {id:"49",name:"フェノーメノ",nameEn:"Fenomeno",pedigree:{sire:"ステイゴールド",dam:"ディアデラノビア",sireOfSire:"サンデーサイレンス",damOfSire:"ゴールデンサッシュ",sireOfDam:"サンデーサイレンス",damOfDam:"ポトリザリス"},surface:"TURF",distanceMin:"MIDDLE",distanceMax:"LONG",course:"LEFT",growth:"LATE",heavyTrack:5,staminaScore:9,speedScore:6,powerScore:7,notes:"天皇賞(春)連覇。左回り巧者。スタミナ型。"},
  {id:"50",name:"ゴールドアリュール",nameEn:"Gold Allure",pedigree:{sire:"サンデーサイレンス",dam:"ニキーヤ",sireOfSire:"ヘイロー",damOfSire:"ワキア",sireOfDam:"ヌレイエフ",damOfDam:"アンティックヴァリュー"},surface:"DIRT",distanceMin:"MILE",distanceMax:"MIDDLE",course:"BOTH",growth:"NORMAL",heavyTrack:9,staminaScore:7,speedScore:7,powerScore:9,notes:"ダートの大種牡馬。コパノリッキー、スマートファルコン等輩出。"},
  {id:"51",name:"ファインニードル",nameEn:"Fine Needle",pedigree:{sire:"アドマイヤムーン",dam:"ニードルクラフト",sireOfSire:"エンドスウィープ",damOfSire:"マイケイティーズ",sireOfDam:"マークオブエスティーム",damOfDam:"ニードルクラフト母"},surface:"TURF",distanceMin:"SPRINT",distanceMax:"MILE",course:"BOTH",growth:"EARLY",heavyTrack:6,staminaScore:4,speedScore:9,powerScore:7,notes:"高松宮記念・スプリンターズS制覇。春秋スプリントGI連覇。産駒は短距離中心、道悪にも強い。"},
  {id:"52",name:"ドレフォン",nameEn:"Drefong",pedigree:{sire:"ジオポンティ",dam:"エルティマース",sireOfSire:"テイルオブザキャット",damOfSire:"チアリーディーダー",sireOfDam:"ゴーストザッパー",damOfDam:"エルティマース母"},surface:"BOTH",distanceMin:"SPRINT",distanceMax:"MIDDLE",course:"RIGHT",growth:"EARLY",heavyTrack:7,staminaScore:6,speedScore:9,powerScore:9,notes:"BCスプリント優勝。ストームキャット系。ジオグリフ(皐月賞)等輩出。芝ダート兼用でパワー型。"},
  {id:"53",name:"ダノンプレミアム",nameEn:"Danon Premium",pedigree:{sire:"ディープインパクト",dam:"インディアナギャル",sireOfSire:"サンデーサイレンス",damOfSire:"ウインドインハーヘア",sireOfDam:"インティカブ",damOfDam:"レッドカメリア"},surface:"TURF",distanceMin:"MILE",distanceMax:"MIDDLE",course:"BOTH",growth:"EARLY",heavyTrack:3,staminaScore:6,speedScore:9,powerScore:6,notes:"朝日杯FS・マイルCS制覇。ディープ産駒の早熟マイラー。新種牡馬。"},
  {id:"54",name:"シルバーステート",nameEn:"Silver State",pedigree:{sire:"ディープインパクト",dam:"シルヴァースカヤ",sireOfSire:"サンデーサイレンス",damOfSire:"ウインドインハーヘア",sireOfDam:"シルヴァーホーク",damOfDam:"ハサナ"},surface:"TURF",distanceMin:"MILE",distanceMax:"MIDDLE",course:"BOTH",growth:"NORMAL",heavyTrack:4,staminaScore:7,speedScore:8,powerScore:7,notes:"重賞未出走ながら種牡馬で大成功。ソールオリエンス(皐月賞)等輩出。ディープ後継の注目株。"},
  {id:"55",name:"サートゥルナーリア",nameEn:"Saturnalia",pedigree:{sire:"ロードカナロア",dam:"シーザリオ",sireOfSire:"キングカメハメハ",damOfSire:"レディブラッサム",sireOfDam:"スペシャルウィーク",damOfDam:"キロフプリミエール"},surface:"TURF",distanceMin:"MILE",distanceMax:"MIDDLE",course:"BOTH",growth:"EARLY",heavyTrack:4,staminaScore:7,speedScore:9,powerScore:8,notes:"皐月賞・ホープフルS制覇。エピファネイアの半弟。ロードカナロア×シーザリオの黄金配合。"},
  {id:"56",name:"ポエティックフレア",nameEn:"Poetic Flare",pedigree:{sire:"ドーンアプローチ",dam:"マリーリー",sireOfSire:"ニューアプローチ",damOfSire:"ヒムオブザドーン",sireOfDam:"ガリレオ",damOfDam:"カレドニア"},surface:"TURF",distanceMin:"MILE",distanceMax:"MILE",course:"BOTH",growth:"EARLY",heavyTrack:5,staminaScore:5,speedScore:8,powerScore:7,notes:"英2000ギニー・セントジェームズパレスS制覇。欧州マイル王。ガリレオ系の仕上がり早タイプ。"},
  {id:"57",name:"リアルインパクト",nameEn:"Real Impact",pedigree:{sire:"ディープインパクト",dam:"リアルサファイア",sireOfSire:"サンデーサイレンス",damOfSire:"ウインドインハーヘア",sireOfDam:"Belong to Me",damOfDam:"リアルサファイア母"},surface:"TURF",distanceMin:"MILE",distanceMax:"MILE",course:"BOTH",growth:"NORMAL",heavyTrack:4,staminaScore:5,speedScore:9,powerScore:6,notes:"安田記念・ジョージライダーS(豪G1)優勝。ディープ産駒のマイラー種牡馬。ラウダシオン等輩出。"},
  {id:"58",name:"アメリカンペイトリオット",nameEn:"American Patriot",pedigree:{sire:"ウォーフロント",dam:"ライフウェルリヴド",sireOfSire:"ダンジグ",damOfSire:"スターリーデイ",sireOfDam:"ティズナウ",damOfDam:"ウェルドレスド"},surface:"BOTH",distanceMin:"SPRINT",distanceMax:"MILE",course:"BOTH",growth:"EARLY",heavyTrack:6,staminaScore:5,speedScore:8,powerScore:8,notes:"米芝G1メイカーズ46マイルS優勝。ダンジグ系ウォーフロント後継。芝で穴馬出しやすい。"},
  {id:"59",name:"パドトロワ",nameEn:"Pas de Trois",pedigree:{sire:"ファルブラヴ",dam:"パドブレ",sireOfSire:"フェアリーキング",damOfSire:"ギフトオブザナイト",sireOfDam:"ダンスインザダーク",damOfDam:"パドシス"},surface:"TURF",distanceMin:"SPRINT",distanceMax:"SPRINT",course:"BOTH",growth:"EARLY",heavyTrack:5,staminaScore:3,speedScore:9,powerScore:6,notes:"CBC賞・アイビスSD制覇。超短距離のスペシャリスト。"},
  {id:"60",name:"トゥザワールド",nameEn:"To the World",pedigree:{sire:"キングカメハメハ",dam:"トゥザヴィクトリー",sireOfSire:"キングマンボ",damOfSire:"マンファス",sireOfDam:"サンデーサイレンス",damOfDam:"フェアリードール"},surface:"TURF",distanceMin:"MILE",distanceMax:"MIDDLE",course:"BOTH",growth:"NORMAL",heavyTrack:5,staminaScore:7,speedScore:7,powerScore:8,notes:"弥生賞優勝・皐月賞2着・有馬記念2着。キングカメハメハ×サンデーサイレンスの配合。"},
  {id:"61",name:"American Pharoah",nameEn:"American Pharoah",pedigree:{sire:"パイオニアオブザナイル",dam:"リトルプリンセスエマ",sireOfSire:"エンパイアメーカー",damOfSire:"スタークリフト",sireOfDam:"ヤンキージェントルマン",damOfDam:"エスキモーキス"},surface:"BOTH",distanceMin:"MILE",distanceMax:"LONG",course:"BOTH",growth:"NORMAL",heavyTrack:6,staminaScore:9,speedScore:8,powerScore:9,notes:"米三冠馬(2015)。BCクラシック優勝。距離万能のスーパーホース。種牡馬としても世界的に成功。"},
  {id:"62",name:"ワークフォース",nameEn:"Workforce",pedigree:{sire:"キングズベスト",dam:"ソヴィエトムーン",sireOfSire:"キングマンボ",damOfSire:"アリリアン",sireOfDam:"サドラーズウェルズ",damOfDam:"エヴァルーナ"},surface:"TURF",distanceMin:"MIDDLE",distanceMax:"LONG",course:"LEFT",growth:"LATE",heavyTrack:5,staminaScore:9,speedScore:6,powerScore:7,notes:"英ダービー・凱旋門賞優勝。キングマンボ系の欧州中長距離型。母父サドラーズウェルズ。"},
  {id:"63",name:"City Zip",nameEn:"City Zip",pedigree:{sire:"カーソンシティ",dam:"ベイビーズィップ",sireOfSire:"ミスタープロスペクター",damOfSire:"ボンジュールヴァル",sireOfDam:"リローンチ",damOfDam:"ブランシュバレー"},surface:"BOTH",distanceMin:"SPRINT",distanceMax:"MILE",course:"BOTH",growth:"EARLY",heavyTrack:5,staminaScore:4,speedScore:9,powerScore:7,notes:"米芝ダート兼用スプリンター。カーソンシティ系の快速血統。種牡馬としてスピード伝える。"},
  {id:"64",name:"ジョーカプチーノ",nameEn:"Jo Cappuccino",pedigree:{sire:"マンハッタンカフェ",dam:"ジョーサンキュー",sireOfSire:"サンデーサイレンス",damOfSire:"サトルチェンジ",sireOfDam:"フジキセキ",damOfDam:"ジョーライラック"},surface:"TURF",distanceMin:"SPRINT",distanceMax:"MILE",course:"BOTH",growth:"EARLY",heavyTrack:4,staminaScore:5,speedScore:9,powerScore:6,notes:"NHKマイルC優勝。マンハッタンカフェ産駒の快速マイラー。スピード型。"},
  {id:"65",name:"ハードスパン",nameEn:"Hard Spun",pedigree:{sire:"ダンジグ",dam:"ターキッシュトライスト",sireOfSire:"ノーザンダンサー",damOfSire:"パドリーナ",sireOfDam:"トルカノ",damOfDam:"カルバリーナ"},surface:"BOTH",distanceMin:"MILE",distanceMax:"MIDDLE",course:"BOTH",growth:"EARLY",heavyTrack:7,staminaScore:7,speedScore:8,powerScore:8,notes:"ケンタッキーダービー2着・ハスケル招待S優勝。ダンジグ直仔。芝ダート兼用でパワー豊富。"},
  {id:"66",name:"Sligo Bay",nameEn:"Sligo Bay",pedigree:{sire:"サドラーズウェルズ",dam:"アクアナ",sireOfSire:"ノーザンダンサー",damOfSire:"フェアリーブリッジ",sireOfDam:"カーリアン",damOfDam:"アクアレラ"},surface:"TURF",distanceMin:"MIDDLE",distanceMax:"LONG",course:"BOTH",growth:"LATE",heavyTrack:6,staminaScore:9,speedScore:6,powerScore:7,notes:"愛チャンピオンS等G1を2勝。サドラーズウェルズ産駒の欧州中長距離型。スタミナ豊富。"},
  {id:"67",name:"First Dude",nameEn:"First Dude",pedigree:{sire:"スティーヴンゴットイーヴン",dam:"グレイスオブフォレスト",sireOfSire:"エーピーインディ",damOfSire:"ティクティクティク",sireOfDam:"フォレストリー",damOfDam:"トリニティプレイス"},surface:"DIRT",distanceMin:"MILE",distanceMax:"MIDDLE",course:"BOTH",growth:"NORMAL",heavyTrack:7,staminaScore:7,speedScore:7,powerScore:8,notes:"米ダートG2勝ち・BCクラシック3着。エーピーインディ系。ダートのパワー型。"},
];

/* ===== Broodmare Data (桜花賞2026) ===== */
const BROODMARES=[
  {name:"ミュージアムヒル",bms:"ハーツクライ",surface:"TURF",distanceMin:"MILE",distanceMax:"MIDDLE",course:"BOTH",growth:"NORMAL",heavyTrack:4,staminaScore:7,speedScore:7,powerScore:6,notes:"母父ハーツクライで中距離寄りのスタミナ。"},
  {name:"サンティール",bms:"ハービンジャー",surface:"TURF",distanceMin:"MILE",distanceMax:"MIDDLE",course:"BOTH",growth:"LATE",heavyTrack:6,staminaScore:7,speedScore:6,powerScore:7,notes:"母父ハービンジャーでパワー型。晩成傾向。"},
  {name:"スカイダイヤモンズ",bms:"First Dude",surface:"BOTH",distanceMin:"MILE",distanceMax:"MIDDLE",course:"BOTH",growth:"NORMAL",heavyTrack:6,staminaScore:6,speedScore:7,powerScore:7,notes:"米血統配合。ダートの下地もあり。"},
  {name:"ネヴァーハーツ",bms:"ハーツクライ",surface:"TURF",distanceMin:"MILE",distanceMax:"LONG",course:"LEFT",growth:"LATE",heavyTrack:4,staminaScore:8,speedScore:6,powerScore:6,notes:"母父ハーツクライ。スタミナ豊富で晩成型。"},
  {name:"レキシールー",bms:"Sligo Bay",surface:"TURF",distanceMin:"MIDDLE",distanceMax:"LONG",course:"BOTH",growth:"LATE",heavyTrack:6,staminaScore:9,speedScore:5,powerScore:7,notes:"豪州G1馬。母父サドラーズ系で重厚なスタミナ。馬格大型。"},
  {name:"プリディカメント",bms:"ハードスパン",surface:"BOTH",distanceMin:"SPRINT",distanceMax:"MILE",course:"BOTH",growth:"EARLY",heavyTrack:6,staminaScore:5,speedScore:8,powerScore:7,notes:"母父ハードスパンで芝ダート兼用。先行力あり。"},
  {name:"シンハライト",bms:"ディープインパクト",surface:"TURF",distanceMin:"MILE",distanceMax:"MIDDLE",course:"BOTH",growth:"NORMAL",heavyTrack:3,staminaScore:7,speedScore:8,powerScore:6,notes:"オークス馬。ディープ×シンボリクリスエスの良血。瞬発力◎。"},
  {name:"パセンジャーシップ",bms:"ダイワメジャー",surface:"TURF",distanceMin:"SPRINT",distanceMax:"MILE",course:"BOTH",growth:"EARLY",heavyTrack:5,staminaScore:5,speedScore:8,powerScore:7,notes:"母父ダイワメジャーでマイル以下のスピード型。先行力。"},
  {name:"ルールブリタニア",bms:"ディープインパクト",surface:"TURF",distanceMin:"MILE",distanceMax:"MIDDLE",course:"BOTH",growth:"NORMAL",heavyTrack:3,staminaScore:7,speedScore:8,powerScore:6,notes:"母父ディープ。瞬発力に優れた芝中距離血統。"},
  {name:"ナムラリコリス",bms:"ジョーカプチーノ",surface:"TURF",distanceMin:"SPRINT",distanceMax:"MILE",course:"BOTH",growth:"EARLY",heavyTrack:4,staminaScore:4,speedScore:8,powerScore:6,notes:"母父ジョーカプチーノでスピード寄り。早熟マイル血統。"},
  {name:"ジペッサ",bms:"City Zip",surface:"TURF",distanceMin:"SPRINT",distanceMax:"MILE",course:"BOTH",growth:"EARLY",heavyTrack:4,staminaScore:4,speedScore:9,powerScore:6,notes:"母父City Zipで米スプリント血統。快速型。"},
  {name:"フラル",bms:"ワークフォース",surface:"TURF",distanceMin:"MILE",distanceMax:"MIDDLE",course:"BOTH",growth:"LATE",heavyTrack:5,staminaScore:8,speedScore:6,powerScore:7,notes:"母父ワークフォースで凱旋門賞馬の血。スタミナ型。"},
  {name:"デサフィアンテ",bms:"キングカメハメハ",surface:"TURF",distanceMin:"MILE",distanceMax:"MIDDLE",course:"BOTH",growth:"NORMAL",heavyTrack:5,staminaScore:7,speedScore:7,powerScore:8,notes:"母父キングカメハメハでパワーとスピードのバランス型。"},
  {name:"ノームコア",bms:"ハービンジャー",surface:"TURF",distanceMin:"MILE",distanceMax:"MIDDLE",course:"LEFT",growth:"LATE",heavyTrack:5,staminaScore:7,speedScore:8,powerScore:7,notes:"VM・札幌記念優勝のG1馬。左回り巧者。母としての能力◎。"},
  {name:"エピセアローム",bms:"ダイワメジャー",surface:"TURF",distanceMin:"SPRINT",distanceMax:"MILE",course:"BOTH",growth:"EARLY",heavyTrack:4,staminaScore:5,speedScore:9,powerScore:6,notes:"秋華賞馬。母父ダイワメジャーのスピード×マイル適性。"},
  {name:"ロシアンサモワール",bms:"American Pharoah",surface:"BOTH",distanceMin:"MILE",distanceMax:"MIDDLE",course:"BOTH",growth:"NORMAL",heavyTrack:6,staminaScore:7,speedScore:7,powerScore:8,notes:"母父アメリカンファラオで米三冠馬の血。距離万能。"},
  {name:"ゴールドチャリス",bms:"トゥザワールド",surface:"TURF",distanceMin:"MILE",distanceMax:"MIDDLE",course:"BOTH",growth:"NORMAL",heavyTrack:5,staminaScore:7,speedScore:7,powerScore:7,notes:"母父トゥザワールドでキンカメ系のバランス型。"},
  {name:"パネットーネ",bms:"エピファネイア",surface:"TURF",distanceMin:"MILE",distanceMax:"MIDDLE",course:"BOTH",growth:"NORMAL",heavyTrack:4,staminaScore:7,speedScore:7,powerScore:7,notes:"母父エピファネイアで芝中距離型。末脚活かす。"},
];

const STORAGE_KEY="keiba-v4";
function load(){try{const r=localStorage.getItem(STORAGE_KEY);return r?JSON.parse(r):null}catch{return null}}
function save(d){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(d))}catch{}}

/* ===== Aptitude Engine ===== */
function calcAptitude(stallion, race) {
  let score = 0;
  let details = [];
  const w = race.weights || {surface:25,distance:25,course:20,track:15,growth:15};

  const surfMax = w.surface;
  if(stallion.surface==="BOTH"){score+=surfMax*0.9;details.push({label:"馬場",pts:+(surfMax*0.9).toFixed(1),max:surfMax,note:"兼用"});}
  else if(stallion.surface===race.surface){score+=surfMax;details.push({label:"馬場",pts:surfMax,max:surfMax,note:"完全一致"});}
  else{score+=0;details.push({label:"馬場",pts:0,max:surfMax,note:"不適合"});}

  const distMax = w.distance;
  const dOrder=["SPRINT","MILE","MIDDLE","LONG"];
  const ri=dOrder.indexOf(race.distance);
  const sMin=dOrder.indexOf(stallion.distanceMin);
  const sMax=dOrder.indexOf(stallion.distanceMax);
  if(stallion.distanceMin==="VERSATILE"||stallion.distanceMax==="VERSATILE"){
    score+=distMax*0.8;details.push({label:"距離",pts:+(distMax*0.8).toFixed(1),max:distMax,note:"万能"});
  } else if(ri>=sMin&&ri<=sMax){
    score+=distMax;details.push({label:"距離",pts:distMax,max:distMax,note:"適性範囲内"});
  } else {
    const gap=ri<sMin?sMin-ri:ri-sMax;
    const pts=Math.max(0,distMax*(1-gap*0.4));
    score+=pts;details.push({label:"距離",pts:+pts.toFixed(1),max:distMax,note:gap===1?"やや範囲外":"大きく範囲外"});
  }

  const cMax = w.course;
  if(stallion.course==="BOTH"){score+=cMax*0.85;details.push({label:"コース",pts:+(cMax*0.85).toFixed(1),max:cMax,note:"左右兼用"});}
  else if(stallion.course===race.course){score+=cMax;details.push({label:"コース",pts:cMax,max:cMax,note:"完全一致"});}
  else{score+=cMax*0.3;details.push({label:"コース",pts:+(cMax*0.3).toFixed(1),max:cMax,note:"逆回り"});}

  const tMax = w.track;
  const condMap={GOOD:0,SLIGHTLY_HEAVY:1,HEAVY:2,BAD:3};
  const condLevel=condMap[race.trackCondition]||0;
  if(condLevel===0){
    const pts=tMax;score+=pts;details.push({label:"馬場状態",pts,max:tMax,note:"良馬場"});
  } else {
    const heavyFit=stallion.heavyTrack/10;
    const pts=tMax*(0.3+0.7*heavyFit*(condLevel/3));
    const realPts=Math.min(tMax,+pts.toFixed(1));
    score+=realPts;details.push({label:"馬場状態",pts:realPts,max:tMax,note:`重適性${stallion.heavyTrack}/10`});
  }

  const gMax = w.growth;
  if(!race.horseAge||race.horseAge==="ANY"){
    score+=gMax*0.7;details.push({label:"成長",pts:+(gMax*0.7).toFixed(1),max:gMax,note:"年齢不問"});
  } else {
    const age=parseInt(race.horseAge);
    let fit=0.5;
    if(stallion.growth==="EARLY") fit=age<=3?1.0:age<=4?0.7:0.4;
    else if(stallion.growth==="NORMAL") fit=age<=2?0.6:age<=4?1.0:0.7;
    else fit=age<=3?0.4:age<=5?0.8:1.0;
    const pts=+(gMax*fit).toFixed(1);
    score+=pts;details.push({label:"成長",pts,max:gMax,note:`${GROWTH[stallion.growth]}×${age}歳`});
  }

  let bonus = 0;
  if(race.distance==="SPRINT"||race.distance==="MILE") bonus+=stallion.speedScore*0.3;
  if(race.distance==="LONG") bonus+=stallion.staminaScore*0.3;
  if(race.distance==="MIDDLE") bonus+=(stallion.speedScore+stallion.staminaScore)*0.15;
  if(race.surface==="DIRT") bonus+=stallion.powerScore*0.2;
  score+=bonus;

  return {score:Math.min(100,+score.toFixed(1)),details,bonus:+bonus.toFixed(1)};
}

/* ===== Shared UI Components ===== */
const Badge=({children,variant="default"})=>{
  const C={turf:{bg:"#E1F5EE",text:"#085041",b:"#5DCAA5"},dirt:{bg:"#FAEEDA",text:"#633806",b:"#EF9F27"},both:{bg:"#EEEDFE",text:"#3C3489",b:"#AFA9EC"},right:{bg:"#FAECE7",text:"#712B13",b:"#F0997B"},left:{bg:"#E6F1FB",text:"#0C447C",b:"#85B7EB"},bothC:{bg:"#F1EFE8",text:"#444441",b:"#B4B2A9"},early:{bg:"#FCEBEB",text:"#791F1F",b:"#F09595"},normal:{bg:"#EAF3DE",text:"#27500A",b:"#97C459"},late:{bg:"#FBEAF0",text:"#72243E",b:"#ED93B1"},default:{bg:"var(--color-background-secondary)",text:"var(--color-text-secondary)",b:"var(--color-border-tertiary)"}};
  const c=C[variant]||C.default;
  return <span style={{display:"inline-block",padding:"2px 10px",borderRadius:20,fontSize:11,fontWeight:500,background:c.bg,color:c.text,border:`1px solid ${c.b}`,whiteSpace:"nowrap"}}>{children}</span>;
};
const surfBadge=k=><Badge variant={k==="TURF"?"turf":k==="DIRT"?"dirt":"both"}>{SURFACE[k]}</Badge>;
const courseBadge=k=><Badge variant={k==="RIGHT"?"right":k==="LEFT"?"left":"bothC"}>{COURSE[k]}</Badge>;
const growthBadge=k=><Badge variant={k==="EARLY"?"early":k==="LATE"?"late":"normal"}>{GROWTH[k]}</Badge>;

const StatBar=({label,value,max=10,color})=>(
  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
    <span style={{width:72,fontSize:11,color:"var(--color-text-secondary)",textAlign:"right"}}>{label}</span>
    <div style={{flex:1,height:8,borderRadius:4,background:"var(--color-background-tertiary)",overflow:"hidden"}}>
      <div style={{width:`${(value/max)*100}%`,height:"100%",borderRadius:4,background:color,transition:"width 0.3s"}}/>
    </div>
    <span style={{width:20,fontSize:11,fontWeight:500,color:"var(--color-text-primary)",textAlign:"right"}}>{value}</span>
  </div>
);

const PedigreeTable=({pedigree})=>{
  if(!pedigree)return null;
  const{sire,dam,sireOfSire,damOfSire,sireOfDam,damOfDam}=pedigree;
  const m={background:"#E6F1FB",border:"1px solid #85B7EB",color:"#0C447C"};
  const f={background:"#FBEAF0",border:"1px solid #ED93B1",color:"#72243E"};
  const cs={display:"flex",alignItems:"center",justifyContent:"center",padding:"5px 6px",borderRadius:6,textAlign:"center",fontSize:11,fontWeight:500,lineHeight:1.3};
  return(
    <div style={{marginBottom:12}}>
      <div style={{fontSize:11,fontWeight:500,color:"var(--color-text-secondary)",marginBottom:6}}>3代血統表</div>
      <div style={{display:"grid",gridTemplateColumns:"2fr 2fr 3fr",gridTemplateRows:"repeat(4,auto)",gap:2}}>
        <div style={{gridRow:"1/3",...cs,...m}}>父<br/><span style={{fontWeight:400,fontSize:10}}>{sire}</span></div>
        <div style={{gridRow:"1/2",...cs,...m}}>父父<br/><span style={{fontWeight:400,fontSize:10}}>{sireOfSire}</span></div>
        <div style={{gridRow:"1",...cs,...m,fontSize:10,fontWeight:400}}>{sireOfSire}系</div>
        <div style={{gridRow:"2",...cs,...f,fontSize:10,fontWeight:400}}>{damOfSire}</div>
        <div style={{gridRow:"2/3",...cs,...f}}>父母<br/><span style={{fontWeight:400,fontSize:10}}>{damOfSire}</span></div>
        <div style={{gridRow:"3/5",...cs,...f}}>母<br/><span style={{fontWeight:400,fontSize:10}}>{dam}</span></div>
        <div style={{gridRow:"3/4",...cs,...m}}>母父<br/><span style={{fontWeight:400,fontSize:10}}>{sireOfDam}</span></div>
        <div style={{gridRow:"3",...cs,...m,fontSize:10,fontWeight:400}}>{sireOfDam}系</div>
        <div style={{gridRow:"4",...cs,...f,fontSize:10,fontWeight:400}}>{damOfDam}</div>
        <div style={{gridRow:"4/5",...cs,...f}}>母母<br/><span style={{fontWeight:400,fontSize:10}}>{damOfDam}</span></div>
      </div>
    </div>
  );
};

const Field=({label,children})=>(<div style={{display:"flex",flexDirection:"column",gap:3}}><label style={{fontSize:11,color:"var(--color-text-secondary)",fontWeight:500}}>{label}</label>{children}</div>);
const inputStyle={padding:"6px 8px",borderRadius:8,border:"1px solid var(--color-border-tertiary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:12};

/* ===== DB Card ===== */
const StallionCard=({stallion,onEdit,onDelete})=>{
  const[expanded,setExpanded]=useState(false);
  return(
    <div style={{background:"var(--color-background-primary)",border:"1px solid var(--color-border-tertiary)",borderRadius:12,overflow:"hidden"}}>
      <div onClick={()=>setExpanded(!expanded)} style={{padding:"12px 16px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:4}}>
            <span style={{fontSize:15,fontWeight:500,color:"var(--color-text-primary)"}}>{stallion.name}</span>
            <span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>{stallion.nameEn}</span>
          </div>
          <div style={{fontSize:11,color:"var(--color-text-secondary)",marginBottom:6}}>父: {stallion.pedigree?.sire||"—"} / 母父: {stallion.pedigree?.sireOfDam||"—"}</div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{surfBadge(stallion.surface)}{courseBadge(stallion.course)}{growthBadge(stallion.growth)}</div>
        </div>
        <span style={{fontSize:16,color:"var(--color-text-tertiary)",transform:expanded?"rotate(180deg)":"none",transition:"transform 0.2s",marginTop:4}}>▾</span>
      </div>
      {expanded&&(<div style={{padding:"0 16px 16px",borderTop:"1px solid var(--color-border-tertiary)"}}><div style={{paddingTop:12}}>
        <PedigreeTable pedigree={stallion.pedigree}/>
        <div style={{fontSize:11,color:"var(--color-text-secondary)",marginBottom:8}}>適性距離: {DISTANCE[stallion.distanceMin]} 〜 {DISTANCE[stallion.distanceMax]}</div>
        <StatBar label="スピード" value={stallion.speedScore} color="#1D9E75"/>
        <StatBar label="スタミナ" value={stallion.staminaScore} color="#378ADD"/>
        <StatBar label="パワー" value={stallion.powerScore} color="#D85A30"/>
        <StatBar label="重馬場" value={stallion.heavyTrack} color="#7F77DD"/>
      </div>
      {stallion.notes&&<div style={{fontSize:11,color:"var(--color-text-secondary)",lineHeight:1.6,padding:"8px 10px",background:"var(--color-background-tertiary)",borderRadius:8,margin:"8px 0"}}>{stallion.notes}</div>}
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button onClick={e=>{e.stopPropagation();onEdit(stallion)}} style={{padding:"5px 12px",borderRadius:6,border:"1px solid var(--color-border-tertiary)",background:"var(--color-background-primary)",color:"var(--color-text-secondary)",fontSize:11,cursor:"pointer"}}>編集</button>
        <button onClick={e=>{e.stopPropagation();onDelete(stallion.id)}} style={{padding:"5px 12px",borderRadius:6,border:"1px solid var(--color-border-tertiary)",background:"var(--color-background-primary)",color:"#A32D2D",fontSize:11,cursor:"pointer"}}>削除</button>
      </div></div>)}
    </div>
  );
};

/* ===== DB Form ===== */
const StallionForm=({stallion,onSave,onCancel})=>{
  const[f,setF]=useState({...stallion,pedigree:{...stallion.pedigree}});
  const s=(k,v)=>setF(p=>({...p,[k]:v}));
  const sp=(k,v)=>setF(p=>({...p,pedigree:{...p.pedigree,[k]:v}}));
  return(
    <div style={{background:"var(--color-background-primary)",border:"1px solid var(--color-border-tertiary)",borderRadius:12,padding:20,marginBottom:12}}>
      <h3 style={{fontSize:15,fontWeight:500,color:"var(--color-text-primary)",margin:"0 0 14px"}}>{stallion.name?"編集":"新規登録"}</h3>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        <Field label="馬名"><input value={f.name} onChange={e=>s("name",e.target.value)} style={inputStyle}/></Field>
        <Field label="英名"><input value={f.nameEn} onChange={e=>s("nameEn",e.target.value)} style={inputStyle}/></Field>
      </div>
      <div style={{fontSize:11,fontWeight:500,color:"var(--color-text-secondary)",marginBottom:6}}>3代血統</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        <Field label="父"><input value={f.pedigree?.sire||""} onChange={e=>sp("sire",e.target.value)} style={inputStyle}/></Field>
        <Field label="母"><input value={f.pedigree?.dam||""} onChange={e=>sp("dam",e.target.value)} style={inputStyle}/></Field>
        <Field label="父の父"><input value={f.pedigree?.sireOfSire||""} onChange={e=>sp("sireOfSire",e.target.value)} style={inputStyle}/></Field>
        <Field label="父の母"><input value={f.pedigree?.damOfSire||""} onChange={e=>sp("damOfSire",e.target.value)} style={inputStyle}/></Field>
        <Field label="母の父"><input value={f.pedigree?.sireOfDam||""} onChange={e=>sp("sireOfDam",e.target.value)} style={inputStyle}/></Field>
        <Field label="母の母"><input value={f.pedigree?.damOfDam||""} onChange={e=>sp("damOfDam",e.target.value)} style={inputStyle}/></Field>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
        <Field label="馬場"><select value={f.surface} onChange={e=>s("surface",e.target.value)} style={inputStyle}>{Object.entries(SURFACE).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="コース"><select value={f.course} onChange={e=>s("course",e.target.value)} style={inputStyle}>{Object.entries(COURSE).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="成長型"><select value={f.growth} onChange={e=>s("growth",e.target.value)} style={inputStyle}>{Object.entries(GROWTH).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></Field>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        <Field label="距離(下限)"><select value={f.distanceMin} onChange={e=>s("distanceMin",e.target.value)} style={inputStyle}>{Object.entries(DISTANCE).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="距離(上限)"><select value={f.distanceMax} onChange={e=>s("distanceMax",e.target.value)} style={inputStyle}>{Object.entries(DISTANCE).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></Field>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        {[["speedScore","スピード"],["staminaScore","スタミナ"],["powerScore","パワー"],["heavyTrack","重馬場"]].map(([k,l])=>(
          <Field key={k} label={`${l}: ${f[k]}`}><input type="range" min={1} max={10} value={f[k]} onChange={e=>s(k,Number(e.target.value))} style={{width:"100%"}}/></Field>
        ))}
      </div>
      <Field label="メモ"><textarea value={f.notes} onChange={e=>s("notes",e.target.value)} rows={2} style={{...inputStyle,resize:"vertical"}}/></Field>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:14}}>
        <button onClick={onCancel} style={{padding:"7px 14px",borderRadius:8,border:"1px solid var(--color-border-tertiary)",background:"var(--color-background-primary)",color:"var(--color-text-secondary)",fontSize:12,cursor:"pointer"}}>キャンセル</button>
        <button onClick={()=>onSave(f)} disabled={!f.name} style={{padding:"7px 14px",borderRadius:8,border:"none",background:f.name?"#1D9E75":"var(--color-border-tertiary)",color:"#fff",fontSize:12,fontWeight:500,cursor:f.name?"pointer":"default",opacity:f.name?1:0.5}}>保存</button>
      </div>
    </div>
  );
};

/* ===== Aptitude Result Card ===== */
const AptitudeCard=({stallion,result,rank})=>{
  const[open,setOpen]=useState(false);
  const scoreColor=result.score>=80?"#1D9E75":result.score>=60?"#378ADD":result.score>=40?"#EF9F27":"#A32D2D";
  return(
    <div style={{background:"var(--color-background-primary)",border:"1px solid var(--color-border-tertiary)",borderRadius:12,overflow:"hidden"}}>
      <div onClick={()=>setOpen(!open)} style={{padding:"10px 16px",cursor:"pointer",display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:32,height:32,borderRadius:8,background:scoreColor,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:500,fontSize:13,flexShrink:0}}>{rank}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"baseline",gap:6}}>
            <span style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)"}}>{stallion.name}</span>
            <span style={{fontSize:10,color:"var(--color-text-tertiary)"}}>{stallion.nameEn}</span>
          </div>
          <div style={{fontSize:10,color:"var(--color-text-secondary)",marginTop:2}}>父: {stallion.pedigree?.sire} / 母父: {stallion.pedigree?.sireOfDam}</div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <div style={{fontSize:20,fontWeight:500,color:scoreColor}}>{result.score}</div>
          <div style={{fontSize:9,color:"var(--color-text-tertiary)"}}>/ 100</div>
        </div>
        <span style={{fontSize:14,color:"var(--color-text-tertiary)",transform:open?"rotate(180deg)":"none",transition:"transform 0.2s"}}>▾</span>
      </div>
      {open&&(
        <div style={{padding:"0 16px 14px",borderTop:"1px solid var(--color-border-tertiary)"}}>
          <div style={{paddingTop:10}}>
            <div style={{fontSize:11,fontWeight:500,color:"var(--color-text-secondary)",marginBottom:8}}>適性スコア内訳</div>
            {result.details.map((d,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                <span style={{width:60,fontSize:11,color:"var(--color-text-secondary)",textAlign:"right"}}>{d.label}</span>
                <div style={{flex:1,height:8,borderRadius:4,background:"var(--color-background-tertiary)",overflow:"hidden"}}>
                  <div style={{width:`${(d.pts/d.max)*100}%`,height:"100%",borderRadius:4,background:d.pts>=d.max*0.8?"#1D9E75":d.pts>=d.max*0.5?"#378ADD":"#EF9F27",transition:"width 0.3s"}}/>
                </div>
                <span style={{width:50,fontSize:10,color:"var(--color-text-secondary)",textAlign:"right"}}>{d.pts}/{d.max}</span>
                <span style={{fontSize:10,color:"var(--color-text-tertiary)",width:80}}>{d.note}</span>
              </div>
            ))}
            <div style={{display:"flex",alignItems:"center",gap:8,marginTop:2,marginBottom:8}}>
              <span style={{width:60,fontSize:11,color:"var(--color-text-secondary)",textAlign:"right"}}>能力補正</span>
              <span style={{fontSize:11,fontWeight:500,color:"#7F77DD"}}>+{result.bonus}</span>
            </div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>
              {surfBadge(stallion.surface)}{courseBadge(stallion.course)}{growthBadge(stallion.growth)}
            </div>
            <PedigreeTable pedigree={stallion.pedigree}/>
            {stallion.notes&&<div style={{fontSize:10,color:"var(--color-text-secondary)",lineHeight:1.5,padding:"6px 10px",background:"var(--color-background-tertiary)",borderRadius:8}}>{stallion.notes}</div>}
          </div>
        </div>
      )}
    </div>
  );
};

/* ================================================================
   ===== PHASE 3: ANALYSIS COMPONENTS =====
   ================================================================ */

/* --- Utility: Sire Line Classification --- */
const SIRE_LINES = {
  "サンデーサイレンス系": ["サンデーサイレンス","ディープインパクト","ステイゴールド","ハーツクライ","アグネスタキオン","フジキセキ","マンハッタンカフェ","ダイワメジャー","ネオユニヴァース","ゴールドアリュール","ブラックタイド","アドマイヤベガ","キタサンブラック","ダノンプレミアム","シルバーステート","ジョーカプチーノ"],
  "キングマンボ系": ["キングカメハメハ","キングマンボ","ドゥラメンテ","ロードカナロア","ルーラーシップ","リオンディーズ","エイシンフラッシュ","キングズベスト","サートゥルナーリア","トゥザワールド","ワークフォース"],
  "ロベルト系": ["シンボリクリスエス","クリスエス","ブライアンズタイム","タニノギムレット","リアルシャダイ","ロベルト","スクリーンヒーロー","グラスワンダー","モーリス"],
  "ノーザンダンサー系": ["デインヒル","ダンジグ","ハービンジャー","タートルボウル","サドラーズウェルズ","オペラハウス","ダンシングブレーヴ","リファール","ノーザンテースト","ディンヒル","ローエングリン","シングスピール","ウォーフロント","アメリカンペイトリオット","ドーンアプローチ","ポエティックフレア","ファルブラヴ","パドトロワ","ハードスパン","Sligo Bay"],
  "ミスタープロスペクター系": ["エンドスウィープ","フォーティナイナー","アドマイヤムーン","ファインニードル","リアルインパクト","カーソンシティ","City Zip"],
  "ストームキャット系": ["ヘネシー","ヘニーヒューズ","ストームキャット","レイヴンズパス","エルーシヴクオリティ","ジオポンティ","ドレフォン"],
  "エーピーインディ系": ["エーピーインディ","プルピット","パイロ","シニスターミニスター","オールドトリエステ","パイオニアオブザナイル","American Pharoah","スティーヴンゴットイーヴン","First Dude"],
  "その他": [],
};

function getSireLine(sireName) {
  for(const [line, sires] of Object.entries(SIRE_LINES)){
    if(sires.includes(sireName)) return line;
  }
  return "その他";
}

const LINE_COLORS = {
  "サンデーサイレンス系":"#1D9E75",
  "キングマンボ系":"#378ADD",
  "ロベルト系":"#D85A30",
  "ノーザンダンサー系":"#7F77DD",
  "ミスタープロスペクター系":"#EF9F27",
  "ストームキャット系":"#E05C97",
  "エーピーインディ系":"#44B8A8",
  "その他":"#999",
};

/* --- 1. Distance Range Chart --- */
const DistanceRangeChart=({stallions})=>{
  const distOrder=["SPRINT","MILE","MIDDLE","LONG"];
  const distX={SPRINT:0, MILE:1, MIDDLE:2, LONG:3};
  const sorted=[...stallions].sort((a,b)=>{
    const aMid=(distX[a.distanceMin]+distX[a.distanceMax])/2;
    const bMid=(distX[b.distanceMin]+distX[b.distanceMax])/2;
    return aMid-bMid || a.name.localeCompare(b.name,"ja");
  });
  const [hovered,setHovered]=useState(null);
  const barH=22, gap=3, padTop=36, padLeft=110, padRight=20;
  const chartW=500;
  const totalH=padTop+(barH+gap)*sorted.length+20;
  const colW=(chartW-padLeft-padRight)/4;

  return(
    <div style={{overflowX:"auto"}}>
      <svg viewBox={`0 0 ${chartW} ${totalH}`} style={{width:"100%",maxWidth:chartW,display:"block"}}>
        {/* Column headers */}
        {distOrder.map((d,i)=>(
          <g key={d}>
            <rect x={padLeft+i*colW} y={0} width={colW} height={totalH} fill={i%2===0?"transparent":"var(--color-background-secondary)"} opacity={0.3}/>
            <text x={padLeft+i*colW+colW/2} y={24} textAnchor="middle" fontSize={11} fontWeight={500} fill="var(--color-text-secondary)">{DIST_SHORT[d]}</text>
          </g>
        ))}
        {/* Bars */}
        {sorted.map((s,i)=>{
          const minI=distX[s.distanceMin]||0;
          const maxI=distX[s.distanceMax]||0;
          const x1=padLeft+minI*colW+4;
          const x2=padLeft+(maxI+1)*colW-4;
          const y=padTop+i*(barH+gap);
          const surfColor=s.surface==="TURF"?"#1D9E75":s.surface==="DIRT"?"#EF9F27":"#7F77DD";
          const isHover=hovered===s.id;
          return(
            <g key={s.id} onMouseEnter={()=>setHovered(s.id)} onMouseLeave={()=>setHovered(null)} style={{cursor:"pointer"}}>
              <text x={padLeft-6} y={y+barH/2+4} textAnchor="end" fontSize={10} fontWeight={isHover?600:400} fill={isHover?surfColor:"var(--color-text-primary)"}>{s.name}</text>
              <rect x={x1} y={y+2} width={Math.max(x2-x1,8)} height={barH-4} rx={6} fill={surfColor} opacity={isHover?1:0.7}/>
              {isHover&&<text x={x2+6} y={y+barH/2+4} fontSize={9} fill="var(--color-text-secondary)">SP:{s.speedScore} ST:{s.staminaScore} PW:{s.powerScore}</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

/* --- 2. Surface Aptitude Scatter --- */
const SurfaceScatter=({stallions})=>{
  const [hovered,setHovered]=useState(null);
  const padL=50,padR=30,padT=40,padB=50;
  const w=480,h=380;
  const innerW=w-padL-padR, innerH=h-padT-padB;

  // X = speed, Y = stamina, color = surface, size = power
  return(
    <div>
      <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginBottom:8}}>X軸: スピード / Y軸: スタミナ / 円の大きさ: パワー / 色: 馬場適性</div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{width:"100%",maxWidth:w,display:"block"}}>
        {/* Grid */}
        {[...Array(10)].map((_,i)=>{
          const x=padL+(i/9)*innerW;
          const y=padT+(i/9)*innerH;
          return(<g key={i}>
            <line x1={x} y1={padT} x2={x} y2={padT+innerH} stroke="var(--color-border-tertiary)" strokeWidth={0.5}/>
            <line x1={padL} y1={y} x2={padL+innerW} y2={y} stroke="var(--color-border-tertiary)" strokeWidth={0.5}/>
            <text x={x} y={h-padB+16} textAnchor="middle" fontSize={9} fill="var(--color-text-tertiary)">{i+1}</text>
            <text x={padL-8} y={padT+innerH-(i/9)*innerH+3} textAnchor="end" fontSize={9} fill="var(--color-text-tertiary)">{i+1}</text>
          </g>);
        })}
        <text x={w/2} y={h-6} textAnchor="middle" fontSize={11} fill="var(--color-text-secondary)">スピード →</text>
        <text x={10} y={h/2} textAnchor="middle" fontSize={11} fill="var(--color-text-secondary)" transform={`rotate(-90,10,${h/2})`}>スタミナ →</text>
        {/* Bubbles */}
        {stallions.map(s=>{
          const cx=padL+((s.speedScore-1)/9)*innerW;
          const cy=padT+innerH-((s.staminaScore-1)/9)*innerH;
          const r=6+s.powerScore*1.5;
          const surfColor=s.surface==="TURF"?"#1D9E75":s.surface==="DIRT"?"#EF9F27":"#7F77DD";
          const isH=hovered===s.id;
          return(
            <g key={s.id} onMouseEnter={()=>setHovered(s.id)} onMouseLeave={()=>setHovered(null)} style={{cursor:"pointer"}}>
              <circle cx={cx} cy={cy} r={r} fill={surfColor} opacity={isH?0.95:0.55} stroke={isH?surfColor:"none"} strokeWidth={2}/>
              {isH&&<>
                <text x={cx} y={cy-r-4} textAnchor="middle" fontSize={10} fontWeight={600} fill="var(--color-text-primary)">{s.name}</text>
                <text x={cx} y={cy-r-16} textAnchor="middle" fontSize={9} fill="var(--color-text-secondary)">{SURFACE[s.surface]} / PW:{s.powerScore}</text>
              </>}
            </g>
          );
        })}
        {/* Legend */}
        {[{l:"芝",c:"#1D9E75"},{l:"ダート",c:"#EF9F27"},{l:"兼用",c:"#7F77DD"}].map((item,i)=>(
          <g key={i} transform={`translate(${padL+i*70},${padT-28})`}>
            <circle cx={6} cy={0} r={5} fill={item.c} opacity={0.7}/>
            <text x={16} y={4} fontSize={10} fill="var(--color-text-secondary)">{item.l}</text>
          </g>
        ))}
      </svg>
    </div>
  );
};

/* --- 3. Sire x BMS Heatmap --- */
const SireBmsHeatmap=({stallions})=>{
  // Build unique sire and sireOfDam (BMS) names from actual data
  const sireNames=[...new Set(stallions.map(s=>s.pedigree?.sire).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"ja"));
  const bmsNames=[...new Set(stallions.map(s=>s.pedigree?.sireOfDam).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"ja"));
  
  // For the heatmap, pick top sires and top BMS that appear at least once
  const sireCount={};
  stallions.forEach(s=>{if(s.pedigree?.sire)sireCount[s.pedigree.sire]=(sireCount[s.pedigree.sire]||0)+1;});
  const bmsCount={};
  stallions.forEach(s=>{if(s.pedigree?.sireOfDam)bmsCount[s.pedigree.sireOfDam]=(bmsCount[s.pedigree.sireOfDam]||0)+1;});

  const topSires=Object.entries(sireCount).sort((a,b)=>b[1]-a[1]).slice(0,10).map(e=>e[0]);
  const topBms=Object.entries(bmsCount).sort((a,b)=>b[1]-a[1]).slice(0,10).map(e=>e[0]);

  // Build matrix: for each (sire, bms) pair, average total ability
  const matrix={};
  stallions.forEach(s=>{
    const sr=s.pedigree?.sire;
    const bm=s.pedigree?.sireOfDam;
    if(!sr||!bm) return;
    const key=`${sr}|${bm}`;
    if(!matrix[key]) matrix[key]={sum:0,count:0,names:[]};
    const total=(s.speedScore+s.staminaScore+s.powerScore)/3;
    matrix[key].sum+=total;
    matrix[key].count++;
    matrix[key].names.push(s.name);
  });

  // Also show sire-line affinity scores (simulated from data)
  const cellSize=42, padL=90, padT=90, padR=10, padB=10;
  const w=padL+topSires.length*cellSize+padR;
  const h=padT+topBms.length*cellSize+padB;

  const [hoverCell,setHoverCell]=useState(null);

  const getColor=(val)=>{
    if(!val) return "var(--color-background-secondary)";
    const t=Math.max(0,Math.min(1,(val-4)/5));
    const r=Math.round(29+t*0);
    const g=Math.round(158*t);
    const b=Math.round(117*t);
    return `rgb(${r},${g},${b})`;
  };

  return(
    <div>
      <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginBottom:8}}>父 × 母父の組み合わせ別 平均能力値（データが存在するセルのみ着色）</div>
      <div style={{overflowX:"auto"}}>
        <svg viewBox={`0 0 ${w} ${h}`} style={{width:"100%",maxWidth:w,minWidth:400,display:"block"}}>
          {/* Column headers (sires) */}
          {topSires.map((sr,i)=>(
            <text key={sr} x={padL+i*cellSize+cellSize/2} y={padT-8} textAnchor="end" fontSize={9} fill="var(--color-text-secondary)" transform={`rotate(-45,${padL+i*cellSize+cellSize/2},${padT-8})`}>{sr.slice(0,6)}</text>
          ))}
          {/* Row headers (BMS) */}
          {topBms.map((bm,j)=>(
            <text key={bm} x={padL-6} y={padT+j*cellSize+cellSize/2+3} textAnchor="end" fontSize={9} fill="var(--color-text-secondary)">{bm.slice(0,7)}</text>
          ))}
          {/* Cells */}
          {topSires.map((sr,i)=>
            topBms.map((bm,j)=>{
              const key=`${sr}|${bm}`;
              const cell=matrix[key];
              const avg=cell?cell.sum/cell.count:null;
              const isH=hoverCell===key;
              return(
                <g key={key} onMouseEnter={()=>setHoverCell(key)} onMouseLeave={()=>setHoverCell(null)} style={{cursor:cell?"pointer":"default"}}>
                  <rect x={padL+i*cellSize+1} y={padT+j*cellSize+1} width={cellSize-2} height={cellSize-2} rx={4}
                    fill={avg?getColor(avg):"var(--color-background-secondary)"} opacity={avg?(isH?1:0.8):0.3}
                    stroke={isH&&avg?"var(--color-text-primary)":"none"} strokeWidth={1.5}/>
                  {avg&&<text x={padL+i*cellSize+cellSize/2} y={padT+j*cellSize+cellSize/2+4} textAnchor="middle" fontSize={10} fontWeight={500} fill="#fff">{avg.toFixed(1)}</text>}
                </g>
              );
            })
          )}
          {/* Hover tooltip */}
          {hoverCell&&matrix[hoverCell]&&(()=>{
            const [sr,bm]=hoverCell.split("|");
            const cell=matrix[hoverCell];
            const i=topSires.indexOf(sr);
            const j=topBms.indexOf(bm);
            const tx=padL+i*cellSize+cellSize+4;
            const ty=padT+j*cellSize;
            return(
              <g>
                <rect x={tx} y={ty} width={130} height={40} rx={6} fill="var(--color-background-primary)" stroke="var(--color-border-tertiary)"/>
                <text x={tx+8} y={ty+14} fontSize={9} fontWeight={500} fill="var(--color-text-primary)">{sr}×{bm}</text>
                <text x={tx+8} y={ty+28} fontSize={9} fill="var(--color-text-secondary)">{cell.names.join(", ")}</text>
              </g>
            );
          })()}
        </svg>
      </div>
    </div>
  );
};

/* --- 4. Sire Line Trend (Stacked Bar) --- */
const SireLineTrend=({stallions})=>{
  // Group stallions by sire line
  const lineData={};
  const allLines=new Set();
  
  stallions.forEach(s=>{
    const sireName=s.pedigree?.sire||"不明";
    const line=getSireLine(sireName);
    allLines.add(line);
    if(!lineData[line]) lineData[line]={count:0,stallions:[],avgSpeed:0,avgStamina:0,avgPower:0};
    lineData[line].count++;
    lineData[line].stallions.push(s);
    lineData[line].avgSpeed+=s.speedScore;
    lineData[line].avgStamina+=s.staminaScore;
    lineData[line].avgPower+=s.powerScore;
  });

  // Compute averages
  Object.values(lineData).forEach(d=>{
    d.avgSpeed=+(d.avgSpeed/d.count).toFixed(1);
    d.avgStamina=+(d.avgStamina/d.count).toFixed(1);
    d.avgPower=+(d.avgPower/d.count).toFixed(1);
  });

  const lines=Object.entries(lineData).sort((a,b)=>b[1].count-a[1].count);
  const total=stallions.length;
  const [hoveredLine,setHoveredLine]=useState(null);

  // Surface distribution per line
  const surfDist=(lst)=>{
    const t=lst.filter(s=>s.surface==="TURF").length;
    const d=lst.filter(s=>s.surface==="DIRT").length;
    const b=lst.filter(s=>s.surface==="BOTH").length;
    return {turf:t,dirt:d,both:b};
  };

  // Growth distribution per line
  const growthDist=(lst)=>{
    const e=lst.filter(s=>s.growth==="EARLY").length;
    const n=lst.filter(s=>s.growth==="NORMAL").length;
    const l=lst.filter(s=>s.growth==="LATE").length;
    return {early:e,normal:n,late:l};
  };

  const barMaxW=300, barH=32, gap=8, padL=140, padR=60;
  const svgW=padL+barMaxW+padR;
  const svgH=40+lines.length*(barH+gap)+60;

  return(
    <div>
      <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginBottom:12}}>父系統（サイアーライン）ごとの頭数分布と平均能力値</div>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{width:"100%",maxWidth:svgW,display:"block"}}>
        <text x={padL} y={20} fontSize={11} fontWeight={500} fill="var(--color-text-secondary)">系統別構成比（{total}頭）</text>
        {lines.map(([name,data],i)=>{
          const y=40+i*(barH+gap);
          const bw=(data.count/total)*barMaxW;
          const pct=((data.count/total)*100).toFixed(0);
          const col=LINE_COLORS[name]||"#999";
          const isH=hoveredLine===name;
          const sd=surfDist(data.stallions);
          const gd=growthDist(data.stallions);
          return(
            <g key={name} onMouseEnter={()=>setHoveredLine(name)} onMouseLeave={()=>setHoveredLine(null)} style={{cursor:"pointer"}}>
              <text x={padL-8} y={y+barH/2+4} textAnchor="end" fontSize={10} fontWeight={isH?600:400} fill={isH?col:"var(--color-text-primary)"}>{name}</text>
              <rect x={padL} y={y+2} width={Math.max(bw,4)} height={barH-4} rx={6} fill={col} opacity={isH?1:0.7}/>
              <text x={padL+bw+8} y={y+barH/2+4} fontSize={10} fontWeight={500} fill="var(--color-text-secondary)">{data.count}頭 ({pct}%)</text>
              {isH&&(
                <g>
                  <rect x={padL} y={y+barH+2} width={barMaxW+padR} height={52} rx={6} fill="var(--color-background-primary)" stroke="var(--color-border-tertiary)" strokeWidth={0.5}/>
                  <text x={padL+8} y={y+barH+18} fontSize={9} fill="var(--color-text-secondary)">
                    平均 — SP: {data.avgSpeed}　ST: {data.avgStamina}　PW: {data.avgPower}
                  </text>
                  <text x={padL+8} y={y+barH+32} fontSize={9} fill="var(--color-text-secondary)">
                    馬場 — 芝:{sd.turf} ダ:{sd.dirt} 兼:{sd.both}　成長 — 早:{gd.early} 普:{gd.normal} 晩:{gd.late}
                  </text>
                  <text x={padL+8} y={y+barH+46} fontSize={8} fill="var(--color-text-tertiary)">
                    {data.stallions.map(s=>s.name).join("、")}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

/* --- Analysis Tab Wrapper --- */
const AnalysisTab=({stallions})=>{
  const [subTab,setSubTab]=useState("distance");
  const tabs=[
    {id:"distance",label:"距離適性"},
    {id:"surface",label:"芝/ダート"},
    {id:"heatmap",label:"父×母父"},
    {id:"trend",label:"系統トレンド"},
  ];
  const subBtn=(id,label)=>(
    <button key={id} onClick={()=>setSubTab(id)} style={{
      padding:"6px 14px",borderRadius:20,border:subTab===id?"none":"1px solid var(--color-border-tertiary)",
      background:subTab===id?"#378ADD":"transparent",
      color:subTab===id?"#fff":"var(--color-text-secondary)",
      fontSize:11,fontWeight:500,cursor:"pointer",transition:"all 0.2s"
    }}>{label}</button>
  );

  return(
    <div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
        {tabs.map(t=>subBtn(t.id,t.label))}
      </div>
      <div style={{background:"var(--color-background-primary)",border:"1px solid var(--color-border-tertiary)",borderRadius:12,padding:16}}>
        {subTab==="distance"&&<DistanceRangeChart stallions={stallions}/>}
        {subTab==="surface"&&<SurfaceScatter stallions={stallions}/>}
        {subTab==="heatmap"&&<SireBmsHeatmap stallions={stallions}/>}
        {subTab==="trend"&&<SireLineTrend stallions={stallions}/>}
      </div>
    </div>
  );
};

/* ================================================================
   ===== PHASE 4: RACE PREDICTION =====
   ================================================================ */

const SAMPLE_RACES = [
  { name:"🏆 第86回 桜花賞 (G1) 阪神芝1600m 4/12", venue:"hanshin", surface:"TURF", distance:"MILE", cond:"GOOD", isG1:true,
    runners:[
      {name:"フェスティバルヒル",sire:"サートゥルナーリア",bms:"ハーツクライ",dam:"ミュージアムヒル",age:"3"},
      {name:"サンアントワーヌ",sire:"ドレフォン",bms:"ハービンジャー",dam:"サンティール",age:"3"},
      {name:"ディアダイヤモンド",sire:"サートゥルナーリア",bms:"First Dude",dam:"スカイダイヤモンズ",age:"3"},
      {name:"エレガンスアスク",sire:"ポエティックフレア",bms:"ハーツクライ",dam:"ネヴァーハーツ",age:"3"},
      {name:"ギャラボーグ",sire:"ロードカナロア",bms:"Sligo Bay",dam:"レキシールー",age:"3"},
      {name:"アイニードユー",sire:"ファインニードル",bms:"ハードスパン",dam:"プリディカメント",age:"3"},
      {name:"アランカール",sire:"エピファネイア",bms:"ディープインパクト",dam:"シンハライト",age:"3"},
      {name:"ロンギングセリーヌ",sire:"モーリス",bms:"ダイワメジャー",dam:"パセンジャーシップ",age:"3"},
      {name:"ルールザウェイヴ",sire:"ロードカナロア",bms:"ディープインパクト",dam:"ルールブリタニア",age:"3"},
      {name:"ナムラコスモス",sire:"ダノンプレミアム",bms:"ジョーカプチーノ",dam:"ナムラリコリス",age:"3"},
      {name:"ジッピーチューン",sire:"ロードカナロア",bms:"City Zip",dam:"ジペッサ",age:"3"},
      {name:"スウィートハピネス",sire:"リアルインパクト",bms:"ワークフォース",dam:"フラル",age:"3"},
      {name:"リリージョワ",sire:"シルバーステート",bms:"キングカメハメハ",dam:"デサフィアンテ",age:"3"},
      {name:"ドリームコア",sire:"キズナ",bms:"ハービンジャー",dam:"ノームコア",age:"3"},
      {name:"スターアニス",sire:"ドレフォン",bms:"ダイワメジャー",dam:"エピセアローム",age:"3"},
      {name:"ショウナンカリス",sire:"リアルスティール",bms:"American Pharoah",dam:"ロシアンサモワール",age:"3"},
      {name:"ブラックチャリス",sire:"キタサンブラック",bms:"トゥザワールド",dam:"ゴールドチャリス",age:"3"},
      {name:"プレセピオ",sire:"パドトロワ",bms:"エピファネイア",dam:"パネットーネ",age:"3"},
    ]},
  { name:"東京11R 芝2400m (サンプル)", venue:"tokyo", surface:"TURF", distance:"MIDDLE", cond:"GOOD",
    runners:[
      {name:"ナチュラルボーン",sire:"ディープインパクト",bms:"キングカメハメハ",age:"3"},
      {name:"スターライトレイン",sire:"キタサンブラック",bms:"ハーツクライ",age:"3"},
      {name:"ロイヤルブレイブ",sire:"ドゥラメンテ",bms:"ディープインパクト",age:"3"},
      {name:"ミラクルウィンド",sire:"エピファネイア",bms:"サンデーサイレンス",age:"4"},
      {name:"ゴールデンクラウン",sire:"ロードカナロア",bms:"ステイゴールド",age:"4"},
      {name:"サンダーボルト",sire:"オルフェーヴル",bms:"キングカメハメハ",age:"3"},
    ]},
  { name:"阪神10R ダ1800m (サンプル)", venue:"hanshin", surface:"DIRT", distance:"MILE", cond:"SLIGHTLY_HEAVY",
    runners:[
      {name:"ダートキング",sire:"ヘニーヒューズ",bms:"サンデーサイレンス",age:"4"},
      {name:"パワーストーム",sire:"シニスターミニスター",bms:"ブライアンズタイム",age:"5"},
      {name:"サンドブラスト",sire:"ゴールドアリュール",bms:"フレンチデピュティ",age:"4"},
      {name:"ミッドナイトラン",sire:"パイロ",bms:"キングカメハメハ",age:"3"},
      {name:"アイアンフィスト",sire:"クロフネ",bms:"サンデーサイレンス",age:"5"},
    ]},
];

/* Runner entry row */
const RunnerRow=({runner,index,onChange,onRemove,matchedSire,matchedBms,matchedDam})=>{
  return(
    <div style={{display:"flex",gap:4,alignItems:"center",padding:"6px 0",borderBottom:"1px solid var(--color-border-tertiary)"}}>
      <span style={{width:20,fontSize:12,fontWeight:500,color:"var(--color-text-tertiary)",textAlign:"center",flexShrink:0}}>{index+1}</span>
      <input value={runner.name} onChange={e=>onChange("name",e.target.value)} placeholder="馬名"
        style={{flex:2,padding:"5px 6px",borderRadius:6,border:"1px solid var(--color-border-tertiary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:11,minWidth:0}}/>
      <div style={{flex:1.5,position:"relative"}}>
        <input value={runner.sire} onChange={e=>onChange("sire",e.target.value)} placeholder="父"
          style={{width:"100%",padding:"5px 6px",borderRadius:6,border:`1px solid ${matchedSire?"#1D9E75":"var(--color-border-tertiary)"}`,background:matchedSire?"#E1F5EE":"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:11,boxSizing:"border-box"}}/>
        {matchedSire&&<span style={{position:"absolute",right:3,top:6,fontSize:8,color:"#1D9E75"}}>✓</span>}
      </div>
      <div style={{flex:1.5,position:"relative"}}>
        <input value={runner.bms||""} onChange={e=>onChange("bms",e.target.value)} placeholder="母父"
          style={{width:"100%",padding:"5px 6px",borderRadius:6,border:`1px solid ${matchedBms?"#378ADD":"var(--color-border-tertiary)"}`,background:matchedBms?"#E6F1FB":"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:11,boxSizing:"border-box"}}/>
        {matchedBms&&<span style={{position:"absolute",right:3,top:6,fontSize:8,color:"#378ADD"}}>✓</span>}
      </div>
      <div style={{flex:1.5,position:"relative"}}>
        <input value={runner.dam||""} onChange={e=>onChange("dam",e.target.value)} placeholder="母"
          style={{width:"100%",padding:"5px 6px",borderRadius:6,border:`1px solid ${matchedDam?"#E05C97":"var(--color-border-tertiary)"}`,background:matchedDam?"#FBEAF0":"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:11,boxSizing:"border-box"}}/>
        {matchedDam&&<span style={{position:"absolute",right:3,top:6,fontSize:8,color:"#E05C97"}}>✓</span>}
      </div>
      <select value={runner.age} onChange={e=>onChange("age",e.target.value)}
        style={{width:42,padding:"5px 2px",borderRadius:6,border:"1px solid var(--color-border-tertiary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:10,flexShrink:0}}>
        <option value="ANY">齢</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6+</option>
      </select>
      <button onClick={onRemove} style={{width:22,height:22,borderRadius:6,border:"none",background:"transparent",color:"var(--color-text-tertiary)",fontSize:13,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
    </div>
  );
};

/* Prediction result card */
const PredictionCard=({entry,rank,expanded,onToggle})=>{
  const scoreColor=entry.score>=75?"#1D9E75":entry.score>=55?"#378ADD":entry.score>=35?"#EF9F27":"#A32D2D";
  const recLabel=entry.score>=80?"◎ 本命":entry.score>=70?"○ 対抗":entry.score>=60?"▲ 単穴":entry.score>=50?"△ 連下":"☆ 穴";
  const recColor=entry.score>=80?"#1D9E75":entry.score>=70?"#378ADD":entry.score>=60?"#7F77DD":entry.score>=50?"#EF9F27":"#E05C97";
  return(
    <div style={{background:"var(--color-background-primary)",border:"1px solid var(--color-border-tertiary)",borderRadius:12,overflow:"hidden",marginBottom:6}}>
      <div onClick={onToggle} style={{padding:"10px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:30,height:30,borderRadius:8,background:scoreColor,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:600,fontSize:12,flexShrink:0}}>{rank}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
            <span style={{fontSize:14,fontWeight:600,color:"var(--color-text-primary)"}}>{entry.runner.name||"(未入力)"}</span>
            <span style={{fontSize:10,padding:"1px 8px",borderRadius:10,background:recColor,color:"#fff",fontWeight:600}}>{recLabel}</span>
          </div>
          <div style={{fontSize:10,color:"var(--color-text-secondary)"}}>
            父: {entry.runner.sire||"—"} / 母父: {entry.runner.bms||"—"}{entry.runner.dam?` / 母: ${entry.runner.dam}`:""}{entry.runner.age&&entry.runner.age!=="ANY"?` / ${entry.runner.age}歳`:""}
          </div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <div style={{fontSize:22,fontWeight:600,color:scoreColor}}>{entry.score}</div>
          <div style={{fontSize:9,color:"var(--color-text-tertiary)"}}>/ 100</div>
        </div>
        <span style={{fontSize:14,color:"var(--color-text-tertiary)",transform:expanded?"rotate(180deg)":"none",transition:"transform 0.2s"}}>▾</span>
      </div>
      {expanded&&(
        <div style={{padding:"0 14px 14px",borderTop:"1px solid var(--color-border-tertiary)"}}>
          <div style={{paddingTop:10}}>
            {/* Score breakdown */}
            <div style={{fontSize:11,fontWeight:500,color:"var(--color-text-secondary)",marginBottom:8}}>血統スコア内訳</div>
            {entry.details.map((d,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                <span style={{width:65,fontSize:10,color:"var(--color-text-secondary)",textAlign:"right"}}>{d.label}</span>
                <div style={{flex:1,height:7,borderRadius:4,background:"var(--color-background-tertiary)",overflow:"hidden"}}>
                  <div style={{width:`${(d.pts/d.max)*100}%`,height:"100%",borderRadius:4,background:d.pts>=d.max*0.8?"#1D9E75":d.pts>=d.max*0.5?"#378ADD":"#EF9F27",transition:"width 0.3s"}}/>
                </div>
                <span style={{width:45,fontSize:9,color:"var(--color-text-secondary)",textAlign:"right"}}>{d.pts}/{d.max}</span>
                <span style={{fontSize:9,color:"var(--color-text-tertiary)",width:75}}>{d.note}</span>
              </div>
            ))}
            {entry.bonus>0&&(
              <div style={{display:"flex",alignItems:"center",gap:8,marginTop:2}}>
                <span style={{width:65,fontSize:10,color:"var(--color-text-secondary)",textAlign:"right"}}>能力補正</span>
                <span style={{fontSize:11,fontWeight:500,color:"#7F77DD"}}>+{entry.bonus}</span>
              </div>
            )}
            {/* Matched DB info */}
            {entry.matchedSire&&(
              <div style={{marginTop:10,padding:"8px 10px",background:"var(--color-background-tertiary)",borderRadius:8}}>
                <div style={{fontSize:10,fontWeight:500,color:"#1D9E75",marginBottom:4}}>父 {entry.matchedSire.name} — DB照合済</div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:4}}>
                  {surfBadge(entry.matchedSire.surface)}{courseBadge(entry.matchedSire.course)}{growthBadge(entry.matchedSire.growth)}
                </div>
                <div style={{fontSize:10,color:"var(--color-text-secondary)"}}>
                  SP:{entry.matchedSire.speedScore} / ST:{entry.matchedSire.staminaScore} / PW:{entry.matchedSire.powerScore} / 重:{entry.matchedSire.heavyTrack}
                </div>
                {entry.matchedSire.notes&&<div style={{fontSize:9,color:"var(--color-text-tertiary)",marginTop:4}}>{entry.matchedSire.notes}</div>}
              </div>
            )}
            {entry.matchedBms&&(
              <div style={{marginTop:6,padding:"8px 10px",background:"var(--color-background-tertiary)",borderRadius:8}}>
                <div style={{fontSize:10,fontWeight:500,color:"#378ADD",marginBottom:4}}>母父 {entry.matchedBms.name} — DB照合済</div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:4}}>
                  {surfBadge(entry.matchedBms.surface)}{courseBadge(entry.matchedBms.course)}{growthBadge(entry.matchedBms.growth)}
                </div>
                <div style={{fontSize:10,color:"var(--color-text-secondary)"}}>
                  SP:{entry.matchedBms.speedScore} / ST:{entry.matchedBms.staminaScore} / PW:{entry.matchedBms.powerScore} / 重:{entry.matchedBms.heavyTrack}
                </div>
              </div>
            )}
            {entry.matchedDam&&(
              <div style={{marginTop:6,padding:"8px 10px",background:"var(--color-background-tertiary)",borderRadius:8,border:"1px solid #E05C97"}}>
                <div style={{fontSize:10,fontWeight:500,color:"#E05C97",marginBottom:4}}>母 {entry.matchedDam.name} — 繁殖牝馬DB照合済</div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:4}}>
                  {surfBadge(entry.matchedDam.surface)}{courseBadge(entry.matchedDam.course)}{growthBadge(entry.matchedDam.growth)}
                </div>
                <div style={{fontSize:10,color:"var(--color-text-secondary)"}}>
                  SP:{entry.matchedDam.speedScore} / ST:{entry.matchedDam.staminaScore} / PW:{entry.matchedDam.powerScore} / 重:{entry.matchedDam.heavyTrack}
                </div>
                {entry.matchedDam.notes&&<div style={{fontSize:9,color:"var(--color-text-tertiary)",marginTop:3}}>{entry.matchedDam.notes}</div>}
              </div>
            )}
            {/* Strengths / Weaknesses */}
            {entry.strengths.length>0&&(
              <div style={{marginTop:8,fontSize:10,color:"#1D9E75"}}>
                <span style={{fontWeight:500}}>強み: </span>{entry.strengths.join(" / ")}
              </div>
            )}
            {entry.weaknesses.length>0&&(
              <div style={{marginTop:3,fontSize:10,color:"#A32D2D"}}>
                <span style={{fontWeight:500}}>弱点: </span>{entry.weaknesses.join(" / ")}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* Mini radar chart for comparing top runners */
const MiniRadar=({entries,labels})=>{
  const size=200, cx=size/2, cy=size/2, r=70;
  const axes=labels||["馬場","距離","コース","馬場状態","成長"];
  const n=axes.length;
  const angleStep=(Math.PI*2)/n;
  const colors=["#1D9E75","#378ADD","#D85A30","#7F77DD","#E05C97"];

  const getPoint=(i,val)=>{
    const angle=-Math.PI/2+i*angleStep;
    const dist=(val/100)*r;
    return [cx+Math.cos(angle)*dist, cy+Math.sin(angle)*dist];
  };

  return(
    <svg viewBox={`0 0 ${size} ${size}`} style={{width:"100%",maxWidth:size}}>
      {/* Grid rings */}
      {[0.25,0.5,0.75,1].map((s,i)=>(
        <polygon key={i} points={Array.from({length:n},(_,j)=>{const a=-Math.PI/2+j*angleStep;return `${cx+Math.cos(a)*r*s},${cy+Math.sin(a)*r*s}`;}).join(" ")}
          fill="none" stroke="var(--color-border-tertiary)" strokeWidth={0.5}/>
      ))}
      {/* Axis lines & labels */}
      {axes.map((label,i)=>{
        const a=-Math.PI/2+i*angleStep;
        const lx=cx+Math.cos(a)*(r+18);
        const ly=cy+Math.sin(a)*(r+18);
        return(<g key={i}>
          <line x1={cx} y1={cy} x2={cx+Math.cos(a)*r} y2={cy+Math.sin(a)*r} stroke="var(--color-border-tertiary)" strokeWidth={0.5}/>
          <text x={lx} y={ly+3} textAnchor="middle" fontSize={8} fill="var(--color-text-tertiary)">{label}</text>
        </g>);
      })}
      {/* Data polygons */}
      {entries.slice(0,4).map((e,ei)=>{
        const vals=e.details.map(d=>(d.pts/d.max)*100);
        const points=vals.map((v,i)=>getPoint(i,v).join(",")).join(" ");
        return(<g key={ei}>
          <polygon points={points} fill={colors[ei]} fillOpacity={0.12} stroke={colors[ei]} strokeWidth={1.5}/>
          {vals.map((v,i)=>{const[px,py]=getPoint(i,v);return <circle key={i} cx={px} cy={py} r={2.5} fill={colors[ei]}/>;})}
        </g>);
      })}
    </svg>
  );
};

/* Main Prediction Tab */
const RacePredictionTab=({stallions})=>{
  const [pVenue,setPVenue]=useState("tokyo");
  const [pSurface,setPSurface]=useState("TURF");
  const [pDistance,setPDistance]=useState("MIDDLE");
  const [pCond,setPCond]=useState("GOOD");
  const [runners,setRunners]=useState([
    {name:"",sire:"",bms:"",dam:"",age:"3"},
    {name:"",sire:"",bms:"",dam:"",age:"3"},
    {name:"",sire:"",bms:"",dam:"",age:"3"},
  ]);
  const [results,setResults]=useState(null);
  const [expandedId,setExpandedId]=useState(null);
  const [showInput,setShowInput]=useState(true);

  const pVenueData=VENUES[pVenue];
  const pCourse=pVenueData?.course||"RIGHT";

  // Update surface if venue doesn't support it
  useEffect(()=>{
    const v=VENUES[pVenue];
    if(v&&!v.surface.includes(pSurface)) setPSurface(v.surface[0]);
  },[pVenue]);

  const updateRunner=(i,field,val)=>{
    setRunners(prev=>{const n=[...prev];n[i]={...n[i],[field]:val};return n;});
  };
  const removeRunner=(i)=>{
    setRunners(prev=>prev.filter((_,j)=>j!==i));
  };
  const addRunner=()=>{
    if(runners.length<18) setRunners(prev=>[...prev,{name:"",sire:"",bms:"",dam:"",age:"3"}]);
  };

  // Find matching stallion in DB
  const findStallion=(name)=>{
    if(!name) return null;
    const q=name.trim();
    return stallions.find(s=>s.name===q)||stallions.find(s=>s.nameEn?.toLowerCase()===q.toLowerCase())||null;
  };

  // Find matching broodmare
  const findBroodmare=(name)=>{
    if(!name) return null;
    const q=name.trim();
    return BROODMARES.find(m=>m.name===q)||null;
  };

  // Load sample race
  const loadSample=(sample)=>{
    setPVenue(sample.venue);
    setPSurface(sample.surface);
    setPDistance(sample.distance);
    setPCond(sample.cond);
    setRunners(sample.runners.map(r=>({...r})));
    setResults(null);
  };

  // Calculate predictions
  const calcPredictions=()=>{
    const validRunners=runners.filter(r=>r.name||r.sire);
    if(validRunners.length===0) return;

    const raceConfig={surface:pSurface, distance:pDistance, course:pCourse, trackCondition:pCond};
    
    const scored=validRunners.map(runner=>{
      const matchedSire=findStallion(runner.sire);
      const matchedBms=findStallion(runner.bms);
      const matchedDam=findBroodmare(runner.dam);
      
      // Weights: sire 55%, BMS 20%, dam 25% (when dam available)
      // Without dam: sire 70%, BMS 30% (fallback)
      const hasDam=!!matchedDam;
      const wSire=hasDam?0.55:0.70;
      const wBms=hasDam?0.20:0.30;
      const wDam=hasDam?0.25:0;
      
      let score=0, details=[], bonus=0, strengths=[], weaknesses=[];

      if(matchedSire){
        const sireResult=calcAptitude(matchedSire, {...raceConfig, horseAge:runner.age});
        const sireContrib=sireResult.score*wSire;
        details=sireResult.details.map(d=>({...d,pts:+(d.pts*wSire).toFixed(1),max:+(d.max*wSire).toFixed(1)}));
        score+=sireContrib;
        bonus+=sireResult.bonus*wSire;

        if(matchedSire.speedScore>=9) strengths.push("父のスピード◎");
        if(matchedSire.staminaScore>=9) strengths.push("父のスタミナ◎");
        if(matchedSire.powerScore>=9) strengths.push("父のパワー◎");
        if(matchedSire.heavyTrack>=8&&(pCond==="HEAVY"||pCond==="BAD")) strengths.push("重馬場巧者の血統");
        if(matchedSire.heavyTrack<=3&&(pCond==="HEAVY"||pCond==="BAD")) weaknesses.push("父は重馬場苦手");
        if(matchedSire.growth==="LATE"&&runner.age&&parseInt(runner.age)<=2) weaknesses.push("晩成血統×若駒");
        if(matchedSire.growth==="EARLY"&&runner.age&&parseInt(runner.age)>=5) weaknesses.push("早熟血統×高齢");
      } else if(runner.sire) {
        score+=40;
        details=[
          {label:"馬場",pts:7,max:17.5,note:"DB未登録"},
          {label:"距離",pts:7,max:17.5,note:"DB未登録"},
          {label:"コース",pts:6,max:14,note:"DB未登録"},
          {label:"馬場状態",pts:4,max:10.5,note:"DB未登録"},
          {label:"成長",pts:4,max:10.5,note:"DB未登録"},
        ];
        weaknesses.push("父がDB未登録");
      } else {
        score+=30;
        details=[
          {label:"馬場",pts:5,max:17.5,note:"父不明"},
          {label:"距離",pts:5,max:17.5,note:"父不明"},
          {label:"コース",pts:4,max:14,note:"父不明"},
          {label:"馬場状態",pts:3,max:10.5,note:"父不明"},
          {label:"成長",pts:3,max:10.5,note:"父不明"},
        ];
        weaknesses.push("父情報なし");
      }

      if(matchedBms){
        const bmsResult=calcAptitude(matchedBms, {...raceConfig, horseAge:runner.age});
        const bmsContrib=bmsResult.score*wBms;
        details=details.map((d,i)=>{
          const bmsD=bmsResult.details[i];
          if(bmsD){
            return {...d, pts:+(d.pts+bmsD.pts*wBms).toFixed(1), max:+(d.max+bmsD.max*wBms).toFixed(1)};
          }
          return d;
        });
        score+=bmsContrib;
        bonus+=bmsResult.bonus*wBms;

        if(matchedBms.speedScore>=9) strengths.push("母父のスピード◎");
        if(matchedBms.staminaScore>=9) strengths.push("母父のスタミナ◎");
        if(matchedBms.powerScore>=9&&pSurface==="DIRT") strengths.push("母父パワー×ダート◎");
      } else if(!matchedSire) {
        // Neither matched
      } else {
        score*=0.95;
      }

      // Dam (broodmare) contribution
      if(matchedDam){
        const damApt=calcAptitude(matchedDam, {...raceConfig, horseAge:runner.age});
        const damContrib=damApt.score*wDam;
        details=details.map((d,i)=>{
          const damD=damApt.details[i];
          if(damD){
            return {...d, pts:+(d.pts+damD.pts*wDam).toFixed(1), max:+(d.max+damD.max*wDam).toFixed(1)};
          }
          return d;
        });
        score+=damContrib;
        bonus+=damApt.bonus*wDam;

        // Dam-specific analysis
        if(matchedDam.speedScore>=8) strengths.push("母のスピード○");
        if(matchedDam.staminaScore>=8) strengths.push("母のスタミナ○");
        if(matchedDam.notes&&matchedDam.notes.includes("G1")) strengths.push("母がG1級の良血");
        if(matchedDam.growth==="EARLY"&&runner.age==="3") strengths.push("母系の仕上がり早さ○");
        if(matchedDam.growth==="LATE"&&runner.age==="3") weaknesses.push("母系は晩成型");
      }

      // Sire-BMS synergy bonus
      if(matchedSire&&matchedBms){
        if(matchedSire.speedScore>=8&&matchedBms.staminaScore>=8) {bonus+=3;strengths.push("スピード×スタミナの補完◎");}
        if(matchedSire.surface==="TURF"&&matchedBms.surface==="BOTH") {bonus+=1;strengths.push("芝適性を幅広くカバー");}
        if(matchedSire.surface===pSurface&&matchedBms.surface===pSurface) {bonus+=2;strengths.push("父母父ともに馬場一致");}
        if(matchedSire.surface!==pSurface&&matchedSire.surface!=="BOTH"&&matchedBms.surface!==pSurface&&matchedBms.surface!=="BOTH") weaknesses.push("父母父ともに馬場不適合");
      }

      // Sire-Dam synergy bonus
      if(matchedSire&&matchedDam){
        const avgSpeed=(matchedSire.speedScore+matchedDam.speedScore)/2;
        const avgStamina=(matchedSire.staminaScore+matchedDam.staminaScore)/2;
        if(avgSpeed>=8&&pDistance==="MILE") {bonus+=2;strengths.push("父母ともにマイル適性高");}
        if(avgStamina>=8&&(pDistance==="MIDDLE"||pDistance==="LONG")) {bonus+=2;strengths.push("父母ともにスタミナ豊富");}
        if(matchedSire.surface===matchedDam.surface&&matchedDam.surface===pSurface) {bonus+=1.5;strengths.push("父母の馬場適性が一致");}
      }

      return {
        runner,
        matchedSire,
        matchedBms,
        matchedDam,
        score:Math.min(100,Math.max(0,+((score+bonus)).toFixed(1))),
        details,
        bonus:+bonus.toFixed(1),
        strengths:[...new Set(strengths)],
        weaknesses:[...new Set(weaknesses)],
      };
    });

    scored.sort((a,b)=>b.score-a.score);
    setResults(scored);
    setShowInput(false);
  };

  return(
    <div>
      {/* Sample race shortcuts */}
      <div style={{marginBottom:12}}>
        <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginBottom:6}}>サンプルレースを読み込む:</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {SAMPLE_RACES.map((sr,i)=>(
            <button key={i} onClick={()=>loadSample(sr)} style={{padding:"5px 12px",borderRadius:8,border:sr.isG1?"2px solid #D85A30":"1px solid var(--color-border-tertiary)",background:sr.isG1?"#FFF3EE":"var(--color-background-primary)",color:sr.isG1?"#D85A30":"var(--color-text-secondary)",fontSize:11,fontWeight:sr.isG1?600:400,cursor:"pointer"}}>
              {sr.name}
            </button>
          ))}
        </div>
      </div>

      {/* Toggle input/results */}
      {results&&(
        <button onClick={()=>setShowInput(!showInput)} style={{marginBottom:12,padding:"6px 14px",borderRadius:8,border:"1px solid var(--color-border-tertiary)",background:"var(--color-background-primary)",color:"var(--color-text-secondary)",fontSize:11,cursor:"pointer"}}>
          {showInput?"▲ 入力を閉じる":"▼ 出走馬を編集"}
        </button>
      )}

      {/* Race conditions & runner input */}
      {showInput&&(
        <div style={{background:"var(--color-background-secondary)",borderRadius:12,padding:16,marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)",marginBottom:12}}>レース条件</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginBottom:16}}>
            <Field label="競馬場">
              <select value={pVenue} onChange={e=>setPVenue(e.target.value)} style={inputStyle}>
                {Object.entries(VENUES).map(([k,v])=><option key={k} value={k}>{v.name}</option>)}
              </select>
            </Field>
            <Field label="馬場">
              <select value={pSurface} onChange={e=>setPSurface(e.target.value)} style={inputStyle}>
                {(pVenueData?.surface||["TURF","DIRT"]).map(k=><option key={k} value={k}>{SURFACE[k]}</option>)}
              </select>
            </Field>
            <Field label="距離">
              <select value={pDistance} onChange={e=>setPDistance(e.target.value)} style={inputStyle}>
                {(pVenueData?.distances||Object.keys(DISTANCE)).filter(k=>k!=="VERSATILE").map(k=><option key={k} value={k}>{DISTANCE[k]}</option>)}
              </select>
            </Field>
            <Field label="馬場状態">
              <select value={pCond} onChange={e=>setPCond(e.target.value)} style={inputStyle}>
                {Object.entries(TRACK_COND).map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
          </div>

          {/* Runner condition summary */}
          <div style={{padding:"6px 10px",background:"var(--color-background-primary)",borderRadius:8,display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:14}}>
            <span style={{fontSize:11,fontWeight:500,color:"var(--color-text-primary)"}}>{pVenueData?.name}</span>
            <Badge variant={pSurface==="TURF"?"turf":"dirt"}>{SURFACE[pSurface]}</Badge>
            <Badge>{DISTANCE[pDistance]}</Badge>
            <Badge variant={pCourse==="RIGHT"?"right":"left"}>{COURSE[pCourse]}</Badge>
            <Badge>{TRACK_COND[pCond]}</Badge>
          </div>

          {/* Runner list header */}
          <div style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)",marginBottom:8}}>出走馬リスト</div>
          <div style={{display:"flex",gap:4,alignItems:"center",padding:"0 0 6px",borderBottom:"1px solid var(--color-border-tertiary)",marginBottom:2}}>
            <span style={{width:20,fontSize:9,color:"var(--color-text-tertiary)",textAlign:"center"}}>枠</span>
            <span style={{flex:2,fontSize:9,color:"var(--color-text-tertiary)"}}>馬名</span>
            <span style={{flex:1.5,fontSize:9,color:"var(--color-text-tertiary)"}}>父</span>
            <span style={{flex:1.5,fontSize:9,color:"var(--color-text-tertiary)"}}>母父(BMS)</span>
            <span style={{flex:1.5,fontSize:9,color:"var(--color-text-tertiary)"}}>母</span>
            <span style={{width:42,fontSize:9,color:"var(--color-text-tertiary)"}}>齢</span>
            <span style={{width:22}}/>
          </div>
          {runners.map((r,i)=>(
            <RunnerRow key={i} runner={r} index={i}
              onChange={(f,v)=>updateRunner(i,f,v)}
              onRemove={()=>removeRunner(i)}
              matchedSire={!!findStallion(r.sire)}
              matchedBms={!!findStallion(r.bms)}
              matchedDam={!!findBroodmare(r.dam)}/>
          ))}
          <div style={{display:"flex",gap:8,marginTop:10}}>
            <button onClick={addRunner} disabled={runners.length>=18}
              style={{padding:"6px 14px",borderRadius:8,border:"1px solid var(--color-border-tertiary)",background:"var(--color-background-primary)",color:runners.length>=18?"var(--color-text-tertiary)":"var(--color-text-secondary)",fontSize:11,cursor:runners.length>=18?"default":"pointer"}}>
              + 馬を追加 ({runners.length}/18)
            </button>
            <button onClick={calcPredictions}
              style={{padding:"6px 20px",borderRadius:8,border:"none",background:"#1D9E75",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",marginLeft:"auto"}}>
              🏇 血統診断を実行
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {results&&(
        <div>
          <div style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)",marginBottom:4}}>血統診断結果</div>
          <div style={{fontSize:10,color:"var(--color-text-tertiary)",marginBottom:12}}>
            {pVenueData?.name} {SURFACE[pSurface]} {DISTANCE[pDistance]} / {TRACK_COND[pCond]} — {results.length}頭を診断
          </div>

          {/* Top pick summary */}
          {results.length>=3&&(
            <div style={{background:"var(--color-background-secondary)",borderRadius:12,padding:14,marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:500,color:"var(--color-text-primary)",marginBottom:10}}>血統的注目馬</div>
              <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:10}}>
                {results.slice(0,3).map((e,i)=>{
                  const marks=["◎","○","▲"];
                  const cols=["#1D9E75","#378ADD","#7F77DD"];
                  return(
                    <div key={i} style={{flex:1,minWidth:120,background:"var(--color-background-primary)",borderRadius:10,padding:"10px 12px",border:`2px solid ${cols[i]}`}}>
                      <div style={{fontSize:18,fontWeight:700,color:cols[i],marginBottom:2}}>{marks[i]} {e.runner.name||"(未入力)"}</div>
                      <div style={{fontSize:22,fontWeight:700,color:cols[i]}}>{e.score}<span style={{fontSize:11,fontWeight:400,color:"var(--color-text-tertiary)"}}> pts</span></div>
                      <div style={{fontSize:9,color:"var(--color-text-secondary)",marginTop:3}}>
                        {e.strengths.slice(0,2).join(" / ")||"—"}
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Radar comparison */}
              <div style={{display:"flex",justifyContent:"center"}}>
                <MiniRadar entries={results} labels={["馬場","距離","コース","馬場状態","成長"]}/>
              </div>
              <div style={{display:"flex",gap:12,justifyContent:"center",marginTop:4}}>
                {results.slice(0,4).map((e,i)=>{
                  const cols=["#1D9E75","#378ADD","#D85A30","#7F77DD"];
                  return <span key={i} style={{fontSize:9,color:cols[i],fontWeight:500}}>{`● ${e.runner.name||"—"}`}</span>;
                })}
              </div>
            </div>
          )}

          {/* Full ranking */}
          <div style={{display:"flex",flexDirection:"column"}}>
            {results.map((e,i)=>(
              <PredictionCard key={i} entry={e} rank={i+1}
                expanded={expandedId===i} onToggle={()=>setExpandedId(expandedId===i?null:i)}/>
            ))}
          </div>

          {/* Disclaimer */}
          <div style={{marginTop:12,padding:"8px 12px",background:"var(--color-background-secondary)",borderRadius:8,fontSize:10,color:"var(--color-text-tertiary)",lineHeight:1.6}}>
            ※ この診断は血統データベースに基づく適性評価です。実際のレース結果は馬の能力・調教状態・騎手・展開など多くの要素に左右されます。投票の最終判断はご自身の責任でお願いします。
          </div>
        </div>
      )}
    </div>
  );
};

/* ===== Main App ===== */
export default function App(){
  const[stallions,setStallions]=useState(()=>load()||STALLIONS);
  const[tab,setTab]=useState("aptitude");
  const[dbView,setDbView]=useState("list");
  const[editing,setEditing]=useState(null);
  const[search,setSearch]=useState("");
  const[fSurf,setFSurf]=useState("ALL");
  const[fCourse,setFCourse]=useState("ALL");
  const[fDist,setFDist]=useState("ALL");
  const[sortBy,setSortBy]=useState("name");

  // Aptitude state
  const[raceVenue,setRaceVenue]=useState("tokyo");
  const[raceSurface,setRaceSurface]=useState("TURF");
  const[raceDistance,setRaceDistance]=useState("MIDDLE");
  const[raceCond,setRaceCond]=useState("GOOD");
  const[raceAge,setRaceAge]=useState("ANY");
  const[showTop,setShowTop]=useState(20);

  useEffect(()=>{save(stallions)},[stallions]);

  // Auto-set course from venue
  const venueData=VENUES[raceVenue];
  const raceCourse=venueData?.course||"RIGHT";

  const aptitudeResults=useMemo(()=>{
    const race={surface:raceSurface,distance:raceDistance,course:raceCourse,trackCondition:raceCond,horseAge:raceAge};
    return stallions.map(s=>({stallion:s,result:calcAptitude(s,race)})).sort((a,b)=>b.result.score-a.result.score);
  },[stallions,raceSurface,raceDistance,raceCourse,raceCond,raceAge]);

  const filtered=useMemo(()=>{
    let list=stallions.filter(s=>{
      if(search){const q=search.toLowerCase();const fields=[s.name,s.nameEn,s.pedigree?.sire,s.pedigree?.dam,s.pedigree?.sireOfSire,s.pedigree?.damOfSire,s.pedigree?.sireOfDam,s.pedigree?.damOfDam].filter(Boolean);if(!fields.some(f=>f.toLowerCase().includes(q)))return false;}
      if(fSurf!=="ALL"&&s.surface!==fSurf&&s.surface!=="BOTH")return false;
      if(fCourse!=="ALL"&&s.course!==fCourse&&s.course!=="BOTH")return false;
      if(fDist!=="ALL"){const order=["SPRINT","MILE","MIDDLE","LONG"];const di=order.indexOf(fDist);const mi=order.indexOf(s.distanceMin);const ma=order.indexOf(s.distanceMax);if(s.distanceMin!=="VERSATILE"&&s.distanceMax!=="VERSATILE"&&(di<mi||di>ma))return false;}
      return true;
    });
    if(sortBy==="name")list.sort((a,b)=>a.name.localeCompare(b.name,"ja"));
    else if(sortBy==="speed")list.sort((a,b)=>b.speedScore-a.speedScore);
    else if(sortBy==="stamina")list.sort((a,b)=>b.staminaScore-a.staminaScore);
    else if(sortBy==="power")list.sort((a,b)=>b.powerScore-a.powerScore);
    return list;
  },[stallions,search,fSurf,fCourse,fDist,sortBy]);

  const handleSave=f=>{setStallions(p=>{const i=p.findIndex(s=>s.id===f.id);if(i>=0){const n=[...p];n[i]=f;return n;}return[...p,f];});setEditing(null);setDbView("list");};
  const stats=useMemo(()=>({total:stallions.length,turf:stallions.filter(s=>s.surface==="TURF").length,dirt:stallions.filter(s=>s.surface==="DIRT").length,both:stallions.filter(s=>s.surface==="BOTH").length}),[stallions]);
  const empty=()=>({id:Date.now().toString(),name:"",nameEn:"",pedigree:{sire:"",dam:"",sireOfSire:"",damOfSire:"",sireOfDam:"",damOfDam:""},surface:"TURF",distanceMin:"MILE",distanceMax:"MIDDLE",course:"BOTH",growth:"NORMAL",heavyTrack:5,staminaScore:5,speedScore:5,powerScore:5,notes:""});

  const tabBtn=(id,label)=>(<button key={id} onClick={()=>setTab(id)} style={{padding:"8px 20px",borderRadius:8,border:"none",background:tab===id?"#1D9E75":"var(--color-background-secondary)",color:tab===id?"#fff":"var(--color-text-secondary)",fontSize:13,fontWeight:500,cursor:"pointer",transition:"all 0.2s"}}>{label}</button>);

  return(
    <div style={{maxWidth:720,margin:"0 auto",fontFamily:"var(--font-sans)"}}>
      <div style={{marginBottom:16}}>
        <h1 style={{fontSize:22,fontWeight:500,color:"var(--color-text-primary)",margin:"0 0 2px",letterSpacing:"-0.02em"}}>血統くん（プロトタイプ）</h1>
        <p style={{fontSize:12,color:"var(--color-text-tertiary)",margin:0}}>サラブレッド血統分析 — {stats.total} stallions</p>
      </div>

      {/* Tab navigation */}
      <div style={{display:"flex",gap:6,marginBottom:20}}>
        {tabBtn("aptitude","適性判定")}{tabBtn("database","血統DB")}{tabBtn("analysis","分析")}{tabBtn("predict","予想")}
      </div>

      {/* ===== APTITUDE TAB ===== */}
      {tab==="aptitude"&&(
        <div>
          {/* Race condition input */}
          <div style={{background:"var(--color-background-secondary)",borderRadius:12,padding:16,marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)",marginBottom:12}}>レース条件を設定</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>
              <Field label="競馬場">
                <select value={raceVenue} onChange={e=>{setRaceVenue(e.target.value);const v=VENUES[e.target.value];if(v&&!v.surface.includes(raceSurface))setRaceSurface(v.surface[0]);}} style={inputStyle}>
                  {Object.entries(VENUES).map(([k,v])=><option key={k} value={k}>{v.name}</option>)}
                </select>
              </Field>
              <Field label="馬場">
                <select value={raceSurface} onChange={e=>setRaceSurface(e.target.value)} style={inputStyle}>
                  {(venueData?.surface||["TURF","DIRT"]).map(k=><option key={k} value={k}>{SURFACE[k]}</option>)}
                </select>
              </Field>
              <Field label="距離">
                <select value={raceDistance} onChange={e=>setRaceDistance(e.target.value)} style={inputStyle}>
                  {(venueData?.distances||Object.keys(DISTANCE)).filter(k=>k!=="VERSATILE").map(k=><option key={k} value={k}>{DISTANCE[k]}</option>)}
                </select>
              </Field>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              <Field label="馬場状態">
                <select value={raceCond} onChange={e=>setRaceCond(e.target.value)} style={inputStyle}>
                  {Object.entries(TRACK_COND).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="出走馬の馬齢">
                <select value={raceAge} onChange={e=>setRaceAge(e.target.value)} style={inputStyle}>
                  <option value="ANY">指定なし</option>
                  <option value="2">2歳</option>
                  <option value="3">3歳</option>
                  <option value="4">4歳</option>
                  <option value="5">5歳</option>
                  <option value="6">6歳以上</option>
                </select>
              </Field>
              <Field label="表示件数">
                <select value={showTop} onChange={e=>setShowTop(Number(e.target.value))} style={inputStyle}>
                  <option value={10}>上位10頭</option>
                  <option value={20}>上位20頭</option>
                  <option value={50}>全頭表示</option>
                </select>
              </Field>
            </div>
            {/* Race summary */}
            <div style={{marginTop:12,padding:"8px 12px",background:"var(--color-background-primary)",borderRadius:8,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
              <span style={{fontSize:12,fontWeight:500,color:"var(--color-text-primary)"}}>{venueData?.name}</span>
              <Badge variant={raceSurface==="TURF"?"turf":"dirt"}>{SURFACE[raceSurface]||raceSurface}</Badge>
              <Badge>{DISTANCE[raceDistance]}</Badge>
              <Badge variant={raceCourse==="RIGHT"?"right":"left"}>{COURSE[raceCourse]}</Badge>
              <Badge>{TRACK_COND[raceCond]}</Badge>
              {raceAge!=="ANY"&&<Badge>{raceAge}歳</Badge>}
            </div>
          </div>

          {/* Results */}
          <div style={{fontSize:12,fontWeight:500,color:"var(--color-text-primary)",marginBottom:8}}>適性ランキング</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {aptitudeResults.slice(0,showTop).map((r,i)=>(
              <AptitudeCard key={r.stallion.id} stallion={r.stallion} result={r.result} rank={i+1}/>
            ))}
          </div>
        </div>
      )}

      {/* ===== DATABASE TAB ===== */}
      {tab==="database"&&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:16}}>
            {[{l:"登録数",v:stats.total,c:"var(--color-text-primary)"},{l:"芝",v:stats.turf,c:"#1D9E75"},{l:"ダート",v:stats.dirt,c:"#EF9F27"},{l:"兼用",v:stats.both,c:"#7F77DD"}].map(s=>(
              <div key={s.l} style={{background:"var(--color-background-secondary)",borderRadius:10,padding:"8px 10px",textAlign:"center"}}>
                <div style={{fontSize:18,fontWeight:500,color:s.c}}>{s.v}</div>
                <div style={{fontSize:10,color:"var(--color-text-tertiary)"}}>{s.l}</div>
              </div>
            ))}
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="馬名・血統名で検索..." style={{width:"100%",padding:"9px 12px",borderRadius:10,border:"1px solid var(--color-border-tertiary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:13,boxSizing:"border-box",marginBottom:8}}/>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16,alignItems:"center"}}>
            {[[fSurf,setFSurf,{ALL:"馬場:すべて",...SURFACE}],[fCourse,setFCourse,{ALL:"コース:すべて",...COURSE}],[fDist,setFDist,{ALL:"距離:すべて",...DISTANCE}],[sortBy,setSortBy,{name:"名前順",speed:"スピード順",stamina:"スタミナ順",power:"パワー順"}]].map(([v,fn,opts],i)=>(
              <select key={i} value={v} onChange={e=>fn(e.target.value)} style={{padding:"5px 8px",borderRadius:8,border:"1px solid var(--color-border-tertiary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:11}}>
                {Object.entries(opts).map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select>
            ))}
            <button onClick={()=>{setEditing(empty());setDbView("form")}} style={{marginLeft:"auto",padding:"5px 12px",borderRadius:8,border:"none",background:"#1D9E75",color:"#fff",fontSize:11,fontWeight:500,cursor:"pointer"}}>+ 追加</button>
            <button onClick={()=>{if(confirm("サンプルデータに戻しますか？")){setStallions(STALLIONS);save(STALLIONS);}}} style={{padding:"5px 12px",borderRadius:8,border:"1px solid var(--color-border-tertiary)",background:"var(--color-background-primary)",color:"var(--color-text-secondary)",fontSize:11,cursor:"pointer"}}>リセット</button>
          </div>
          {dbView==="form"&&editing?(
            <StallionForm stallion={editing} onSave={handleSave} onCancel={()=>{setEditing(null);setDbView("list")}}/>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginBottom:2}}>{filtered.length}件表示</div>
              {filtered.length===0?(<div style={{textAlign:"center",padding:32,color:"var(--color-text-tertiary)",fontSize:13}}>該当なし</div>):filtered.map(s=>(
                <StallionCard key={s.id} stallion={s} onEdit={st=>{setEditing(st);setDbView("form")}} onDelete={id=>setStallions(p=>p.filter(x=>x.id!==id))}/>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== ANALYSIS TAB (Phase 3) ===== */}
      {tab==="analysis"&&<AnalysisTab stallions={stallions}/>}

      {/* ===== PREDICTION TAB (Phase 4) ===== */}
      {tab==="predict"&&<RacePredictionTab stallions={stallions}/>}

      <div style={{marginTop:20,padding:"10px 0",borderTop:"1px solid var(--color-border-tertiary)",fontSize:10,color:"var(--color-text-tertiary)",textAlign:"center"}}>
        Phase 1〜4: 血統DB + 適性判定 + 分析 + レース予想 v4.0 (繁殖牝馬DB対応) / {stats.total}頭登録
      </div>
    </div>
  );
}
