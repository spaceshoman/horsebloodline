import { useState, useEffect, useMemo, useCallback } from "react";

/* ===== Constants ===== */
const SURFACE = { TURF:"芝", DIRT:"ダート", BOTH:"芝・ダート兼用" };
const DISTANCE = { SPRINT:"短距離 (~1400m)", MILE:"マイル (1400~1800m)", MIDDLE:"中距離 (1800~2400m)", LONG:"長距離 (2400m~)", VERSATILE:"万能" };
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
];

const STORAGE_KEY="keiba-v4";
function load(){try{const r=localStorage.getItem(STORAGE_KEY);return r?JSON.parse(r):null}catch{return null}}
function save(d){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(d))}catch{}}

/* ===== Aptitude Engine ===== */
function calcAptitude(stallion, race) {
  let score = 0;
  let details = [];
  const w = race.weights || {surface:25,distance:25,course:20,track:15,growth:15};

  // Surface match (max 25)
  const surfMax = w.surface;
  if(stallion.surface==="BOTH"){score+=surfMax*0.9;details.push({label:"馬場",pts:+(surfMax*0.9).toFixed(1),max:surfMax,note:"兼用"});}
  else if(stallion.surface===race.surface){score+=surfMax;details.push({label:"馬場",pts:surfMax,max:surfMax,note:"完全一致"});}
  else{score+=0;details.push({label:"馬場",pts:0,max:surfMax,note:"不適合"});}

  // Distance match (max 25)
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

  // Course match (max 20)
  const cMax = w.course;
  if(stallion.course==="BOTH"){score+=cMax*0.85;details.push({label:"コース",pts:+(cMax*0.85).toFixed(1),max:cMax,note:"左右兼用"});}
  else if(stallion.course===race.course){score+=cMax;details.push({label:"コース",pts:cMax,max:cMax,note:"完全一致"});}
  else{score+=cMax*0.3;details.push({label:"コース",pts:+(cMax*0.3).toFixed(1),max:cMax,note:"逆回り"});}

  // Track condition (max 15)
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

  // Growth match (max 15)
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

  // Bonus: ability scores context
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
        <h1 style={{fontSize:22,fontWeight:500,color:"var(--color-text-primary)",margin:"0 0 2px",letterSpacing:"-0.02em"}}>競馬血統分析</h1>
        <p style={{fontSize:12,color:"var(--color-text-tertiary)",margin:0}}>Thoroughbred bloodline analyzer — {stats.total} stallions</p>
      </div>

      {/* Tab navigation */}
      <div style={{display:"flex",gap:6,marginBottom:20}}>
        {tabBtn("aptitude","適性判定")}{tabBtn("database","血統DB")}
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

      <div style={{marginTop:20,padding:"10px 0",borderTop:"1px solid var(--color-border-tertiary)",fontSize:10,color:"var(--color-text-tertiary)",textAlign:"center"}}>
        Phase 1+2: 血統DB + 適性判定エンジン v1.0 / {stats.total}頭登録
      </div>
    </div>
  );
}