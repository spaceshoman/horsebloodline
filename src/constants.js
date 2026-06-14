// 血統くん 共通定数
// この定数は App.jsx と calcAptitude.js から参照される
// インシデント教訓: 巨大単一ファイルで誤削除されたため独立ファイル化

export const SURFACE = { TURF:"芝", DIRT:"ダート", BOTH:"芝・ダート兼用" };
export const DISTANCE = { SPRINT:"短距離 (~1400m)", MILE:"マイル (1400~1800m)", MIDDLE:"中距離 (1800~2400m)", LONG:"長距離 (2400m~)", VERSATILE:"万能" };
export const DIST_SHORT = { SPRINT:"短距離", MILE:"マイル", MIDDLE:"中距離", LONG:"長距離" };
export const COURSE = { RIGHT:"右回り", LEFT:"左回り", BOTH:"左右兼用" };
export const GROWTH = { EARLY:"早熟", NORMAL:"普通", LATE:"晩成" };
export const TRACK_COND = { GOOD:"良", SLIGHTLY_HEAVY:"稍重", HEAVY:"重", BAD:"不良" };
export const VENUES = {
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
