// 血統くん スコアリングエンジン v2
// インシデント教訓: 中核関数のため独立ファイル化
import { GROWTH } from './constants.js';

export function calcAptitude(stallion, race) {
  let score = 0;
  let details = [];
  // Lower base weights → more room for differentiation
  // Max from base categories: 15+15+10+10+10 = 60
  // Ability bonus can add up to ~15, total realistic max ~75
  const w = race.weights || {surface:15,distance:15,course:10,track:10,growth:10};

  // Surface match (max 15) — harsher mismatch
  const surfMax = w.surface;
  if(stallion.surface===race.surface){score+=surfMax;details.push({label:"馬場",pts:surfMax,max:surfMax,note:"完全一致"});}
  else if(stallion.surface==="BOTH"){score+=surfMax*0.7;details.push({label:"馬場",pts:+(surfMax*0.7).toFixed(1),max:surfMax,note:"兼用"});}
  else{score+=0;details.push({label:"馬場",pts:0,max:surfMax,note:"不適合"});}

  // Distance match (max 15) — center-fit model
  // Core idea: if race distance is within range, score is high.
  // Bonus when race distance = center of stallion's range.
  // Wide-range stallions are NOT penalized — they just get slightly less center-fit bonus.
  const distMax = w.distance;
  const dOrder=["SPRINT","MILE","MIDDLE","LONG"];
  const ri=dOrder.indexOf(race.distance);
  const sMin=dOrder.indexOf(stallion.distanceMin);
  const sMax=dOrder.indexOf(stallion.distanceMax);
  if(stallion.distanceMin==="VERSATILE"||stallion.distanceMax==="VERSATILE"){
    score+=distMax*0.7;details.push({label:"距離",pts:+(distMax*0.7).toFixed(1),max:distMax,note:"万能"});
  } else if(ri>=sMin&&ri<=sMax){
    // In range — base 85% + center-fit bonus up to 15%
    const center=(sMin+sMax)/2; // e.g. SPRINT(0)-MIDDLE(2) → center=1.0 (MILE)
    const distFromCenter=Math.abs(ri-center);
    const range=sMax-sMin;
    const maxDistFromCenter=range/2||0.5;
    const centerFit=1-distFromCenter/maxDistFromCenter; // 1.0=perfect center, 0.0=edge
    const pts=+(distMax*(0.85+centerFit*0.15)).toFixed(1);
    const note=centerFit>=0.8?"距離ど真ん中◎":centerFit>=0.4?"距離適性内○":"適性範囲の端";
    score+=pts;details.push({label:"距離",pts,max:distMax,note});
  } else {
    const gap=ri<sMin?sMin-ri:ri-sMax;
    const pts=Math.max(0,+(distMax*(0.25-gap*0.15)).toFixed(1));
    score+=pts;details.push({label:"距離",pts,max:distMax,note:gap===1?"やや範囲外":"大きく範囲外"});
  }

  // Course match (max 10) — mismatch = nearly 0
  const cMax = w.course;
  if(stallion.course===race.course){score+=cMax;details.push({label:"コース",pts:cMax,max:cMax,note:"完全一致"});}
  else if(stallion.course==="BOTH"){score+=cMax*0.65;details.push({label:"コース",pts:+(cMax*0.65).toFixed(1),max:cMax,note:"左右兼用"});}
  else{score+=cMax*0.15;details.push({label:"コース",pts:+(cMax*0.15).toFixed(1),max:cMax,note:"逆回り"});}

  // Track condition (max 10) — good = rewards firm-ground types, heavy = rewards heavy-track types
  const tMax = w.track;
  const condMap={GOOD:0,SLIGHTLY_HEAVY:1,HEAVY:2,BAD:3};
  const condLevel=condMap[race.trackCondition]||0;
  if(condLevel===0){
    // Good track: low heavyTrack = firm-ground specialist = higher score
    const firmFit=(10-stallion.heavyTrack)/10; // heavyTrack 1→0.9, 5→0.5, 10→0.0
    const pts=+(tMax*(0.3+firmFit*0.7)).toFixed(1);
    score+=pts;details.push({label:"馬場状態",pts,max:tMax,note:`良馬場適性${10-stallion.heavyTrack}/10`});
  } else if(condLevel===1){
    // Slightly heavy: balanced, moderate heavyTrack does best
    const balanced=1-Math.abs(stallion.heavyTrack-5)/5;
    const pts=+(tMax*(0.3+balanced*0.6)).toFixed(1);
    score+=pts;details.push({label:"馬場状態",pts,max:tMax,note:`稍重適性(重${stallion.heavyTrack})`});
  } else {
    // Heavy/Bad: high heavyTrack = big advantage
    const heavyFit=stallion.heavyTrack/10;
    const severity=condLevel/3;
    const pts=+(tMax*(heavyFit*severity*0.9+0.05)).toFixed(1);
    const realPts=Math.min(tMax,pts);
    score+=realPts;details.push({label:"馬場状態",pts:realPts,max:tMax,note:`重適性${stallion.heavyTrack}/10`});
  }

  // Growth match (max 10) — sharper curve
  const gMax = w.growth;
  if(!race.horseAge||race.horseAge==="ANY"){
    score+=gMax*0.5;details.push({label:"成長",pts:+(gMax*0.5).toFixed(1),max:gMax,note:"年齢不問"});
  } else {
    const age=parseInt(race.horseAge);
    let fit=0.3;
    if(stallion.growth==="EARLY") fit=age<=3?1.0:age===4?0.5:0.15;
    else if(stallion.growth==="NORMAL") fit=age<=2?0.4:age<=4?0.9:0.5;
    else fit=age<=3?0.2:age<=5?0.7:1.0;
    const pts=+(gMax*fit).toFixed(1);
    score+=pts;details.push({label:"成長",pts,max:gMax,note:`${GROWTH[stallion.growth]}×${age}歳`});
  }

  // Ability bonus — up to ~15 points, more variance
  let bonus = 0;
  if(race.distance==="SPRINT") bonus+=stallion.speedScore*0.6;
  else if(race.distance==="MILE") bonus+=stallion.speedScore*0.4+stallion.staminaScore*0.15;
  else if(race.distance==="MIDDLE") bonus+=stallion.speedScore*0.2+stallion.staminaScore*0.35;
  else if(race.distance==="LONG") bonus+=stallion.staminaScore*0.6;
  if(race.surface==="DIRT") bonus+=stallion.powerScore*0.35;
  else bonus+=stallion.powerScore*0.1;
  score+=bonus;

  return {score:Math.min(100,+score.toFixed(1)),details,bonus:+bonus.toFixed(1)};
}
