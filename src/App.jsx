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

/* Data loaded via fetch - see stallions.json, broodmares.json, jockeys.json */


const STORAGE_KEY="keiba-v6";
function load(minLen=0){try{const r=localStorage.getItem(STORAGE_KEY);if(!r)return null;const d=JSON.parse(r);if(minLen>0&&d.length<minLen)return null;return d;}catch{return null}}
function save(d){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(d))}catch{}}

/* ===== Aptitude Engine v2 — spread-oriented scoring ===== */
function calcAptitude(stallion, race) {
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

  // Distance match (max 15) — center of range = full, edges penalized
  const distMax = w.distance;
  const dOrder=["SPRINT","MILE","MIDDLE","LONG"];
  const ri=dOrder.indexOf(race.distance);
  const sMin=dOrder.indexOf(stallion.distanceMin);
  const sMax=dOrder.indexOf(stallion.distanceMax);
  if(stallion.distanceMin==="VERSATILE"||stallion.distanceMax==="VERSATILE"){
    score+=distMax*0.6;details.push({label:"距離",pts:+(distMax*0.6).toFixed(1),max:distMax,note:"万能"});
  } else if(ri>=sMin&&ri<=sMax){
    // In range, but reward narrow specialists more
    const range=sMax-sMin; // 0=specialist, 3=ultra-wide
    const specialistBonus=range===0?1.0:range===1?0.9:range===2?0.8:0.7;
    const pts=+(distMax*specialistBonus).toFixed(1);
    score+=pts;details.push({label:"距離",pts,max:distMax,note:range===0?"距離特化◎":"適性範囲内"});
  } else {
    const gap=ri<sMin?sMin-ri:ri-sMax;
    const pts=Math.max(0,+(distMax*(0.3-gap*0.2)).toFixed(1));
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


// findJockey/calcJockeyVenueScore are initialized after data loads
let _jockeysData=[];
const setJockeysData=(d)=>{_jockeysData=d;};
const findJockey=(name)=>{
  if(!name) return null;
  return _jockeysData.find(j=>j.name===name)||null;
};

const calcJockeyVenueScore=(jockeyName,venueKey)=>{
  const j=findJockey(jockeyName);
  if(!j) return {score:0,aff:0,label:"騎手DB未登録"};
  const aff=j.venueAff[venueKey]||5;
  // Score out of 10: venue affinity + win rate bonus + G1 bonus
  const wrBonus=Math.min(3,j.winRate*15);
  const g1Bonus=Math.min(2,j.g1Wins/20);
  const total=Math.min(10,+(aff*0.6+wrBonus+g1Bonus).toFixed(1));
  const label=total>=8?"◎ 絶好":total>=6.5?"○ 好相性":total>=5?"▲ 普通":total>=3.5?"✖ やや不安":"⭐ 未知数";
  return {score:total,aff,label,jockey:j};
};

/* Runner entry row */
const RunnerRow=({runner,index,onChange,onRemove,matchedSire,matchedBms,matchedDam})=>{
  const jMatch=!!findJockey(runner.jockey);
  return(
    <div style={{display:"flex",gap:3,alignItems:"center",padding:"5px 0",borderBottom:"1px solid var(--color-border-tertiary)"}}>
      <span style={{width:18,fontSize:11,fontWeight:500,color:"var(--color-text-tertiary)",textAlign:"center",flexShrink:0}}>{index+1}</span>
      <input value={runner.name} onChange={e=>onChange("name",e.target.value)} placeholder="馬名"
        style={{flex:2,padding:"4px 5px",borderRadius:6,border:"1px solid var(--color-border-tertiary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:10,minWidth:0}}/>
      <div style={{flex:1.3,position:"relative"}}>
        <input value={runner.sire} onChange={e=>onChange("sire",e.target.value)} placeholder="父"
          style={{width:"100%",padding:"4px 5px",borderRadius:6,border:`1px solid ${matchedSire?"#1D9E75":"var(--color-border-tertiary)"}`,background:matchedSire?"#E1F5EE":"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:10,boxSizing:"border-box"}}/>
        {matchedSire&&<span style={{position:"absolute",right:2,top:5,fontSize:7,color:"#1D9E75"}}>✓</span>}
      </div>
      <div style={{flex:1.3,position:"relative"}}>
        <input value={runner.bms||""} onChange={e=>onChange("bms",e.target.value)} placeholder="母父"
          style={{width:"100%",padding:"4px 5px",borderRadius:6,border:`1px solid ${matchedBms?"#378ADD":"var(--color-border-tertiary)"}`,background:matchedBms?"#E6F1FB":"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:10,boxSizing:"border-box"}}/>
        {matchedBms&&<span style={{position:"absolute",right:2,top:5,fontSize:7,color:"#378ADD"}}>✓</span>}
      </div>
      <div style={{flex:1.3,position:"relative"}}>
        <input value={runner.dam||""} onChange={e=>onChange("dam",e.target.value)} placeholder="母"
          style={{width:"100%",padding:"4px 5px",borderRadius:6,border:`1px solid ${matchedDam?"#E05C97":"var(--color-border-tertiary)"}`,background:matchedDam?"#FBEAF0":"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:10,boxSizing:"border-box"}}/>
        {matchedDam&&<span style={{position:"absolute",right:2,top:5,fontSize:7,color:"#E05C97"}}>✓</span>}
      </div>
      <div style={{flex:1.2,position:"relative"}}>
        <input value={runner.jockey||""} onChange={e=>onChange("jockey",e.target.value)} placeholder="騎手"
          style={{width:"100%",padding:"4px 5px",borderRadius:6,border:`1px solid ${jMatch?"#D85A30":"var(--color-border-tertiary)"}`,background:jMatch?"#FFF3EE":"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:10,boxSizing:"border-box"}}/>
        {jMatch&&<span style={{position:"absolute",right:2,top:5,fontSize:7,color:"#D85A30"}}>✓</span>}
      </div>
      <select value={runner.age} onChange={e=>onChange("age",e.target.value)}
        style={{width:36,padding:"4px 1px",borderRadius:6,border:"1px solid var(--color-border-tertiary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:9,flexShrink:0}}>
        <option value="ANY">齢</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6+</option>
      </select>
      <button onClick={onRemove} style={{width:20,height:20,borderRadius:6,border:"none",background:"transparent",color:"var(--color-text-tertiary)",fontSize:12,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
    </div>
  );
};

/* Prediction result card */
const PredictionCard=({entry,rank,expanded,onToggle,venueKey})=>{
  const scoreColor=entry.score>=75?"#1D9E75":entry.score>=55?"#378ADD":entry.score>=35?"#EF9F27":"#A32D2D";
  const recLabel=entry.score>=80?"◎":entry.score>=70?"○":entry.score>=60?"▲":entry.score>=50?"✖":"⭐";
  const recFull=entry.score>=80?"◎ 本命":entry.score>=70?"○ 対抗":entry.score>=60?"▲ 単穴":entry.score>=50?"✖ 軽視":"⭐ 大穴";
  const recColor=entry.score>=80?"#1D9E75":entry.score>=70?"#378ADD":entry.score>=60?"#7F77DD":entry.score>=50?"#A32D2D":"#E05C97";
  const jvs=entry.jockeyVenue;
  return(
    <div style={{background:"var(--color-background-primary)",border:"1px solid var(--color-border-tertiary)",borderRadius:12,overflow:"hidden",marginBottom:6}}>
      <div onClick={onToggle} style={{padding:"10px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:30,height:30,borderRadius:8,background:scoreColor,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:600,fontSize:12,flexShrink:0}}>{rank}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2,flexWrap:"wrap"}}>
            <span style={{fontSize:16,fontWeight:700,color:recColor}}>{recLabel}</span>
            <span style={{fontSize:14,fontWeight:600,color:"var(--color-text-primary)"}}>{entry.runner.name||"(未入力)"}</span>
            {entry.runner.jockey&&<span style={{fontSize:9,padding:"1px 6px",borderRadius:8,background:"var(--color-background-secondary)",color:"var(--color-text-secondary)",fontWeight:500}}>{entry.runner.jockey}</span>}
          </div>
          <div style={{fontSize:10,color:"var(--color-text-secondary)"}}>
            父: {entry.runner.sire||"—"} / 母父: {entry.runner.bms||"—"}{entry.runner.dam?` / 母: ${entry.runner.dam}`:""}{entry.runner.age&&entry.runner.age!=="ANY"?` / ${entry.runner.age}歳`:""}
          </div>
          {jvs&&jvs.jockey&&(
            <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3}}>
              <span style={{fontSize:9,color:jvs.score>=7?"#1D9E75":jvs.score>=5?"#378ADD":"#EF9F27",fontWeight:600}}>🏇 騎手×会場: {jvs.label}</span>
              <span style={{fontSize:9,color:"var(--color-text-tertiary)"}}>({jvs.score}/10)</span>
            </div>
          )}
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
const RacePredictionTab=({stallions,broodmares=[]})=>{
  const [pVenue,setPVenue]=useState("tokyo");
  const [pSurface,setPSurface]=useState("TURF");
  const [pDistance,setPDistance]=useState("MIDDLE");
  const [pCond,setPCond]=useState("GOOD");
  const [runners,setRunners]=useState([
    {name:"",sire:"",bms:"",dam:"",jockey:"",age:"3"},
    {name:"",sire:"",bms:"",dam:"",jockey:"",age:"3"},
    {name:"",sire:"",bms:"",dam:"",jockey:"",age:"3"},
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
    if(runners.length<18) setRunners(prev=>[...prev,{name:"",sire:"",bms:"",dam:"",jockey:"",age:"3"}]);
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
    return broodmares.find(m=>m.name===q)||null;
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

      // Jockey × Venue affinity
      const jvs=calcJockeyVenueScore(runner.jockey, pVenue);
      if(jvs.jockey){
        // Jockey adds up to 5 points to total
        const jockeyBonus=jvs.score*0.5;
        bonus+=jockeyBonus;
        if(jvs.score>=8) strengths.push(`騎手${runner.jockey}×${pVenueData?.name||""}は${jvs.label}`);
        if(jvs.score<=4) weaknesses.push(`騎手${runner.jockey}は${pVenueData?.name||""}苦手`);
      }

      return {
        runner,
        matchedSire,
        matchedBms,
        matchedDam,
        jockeyVenue:jvs,
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
          <div style={{display:"flex",gap:3,alignItems:"center",padding:"0 0 5px",borderBottom:"1px solid var(--color-border-tertiary)",marginBottom:2}}>
            <span style={{width:18,fontSize:8,color:"var(--color-text-tertiary)",textAlign:"center"}}>枠</span>
            <span style={{flex:2,fontSize:8,color:"var(--color-text-tertiary)"}}>馬名</span>
            <span style={{flex:1.3,fontSize:8,color:"var(--color-text-tertiary)"}}>父</span>
            <span style={{flex:1.3,fontSize:8,color:"var(--color-text-tertiary)"}}>母父</span>
            <span style={{flex:1.3,fontSize:8,color:"var(--color-text-tertiary)"}}>母</span>
            <span style={{flex:1.2,fontSize:8,color:"var(--color-text-tertiary)"}}>騎手</span>
            <span style={{width:36,fontSize:8,color:"var(--color-text-tertiary)"}}>齢</span>
            <span style={{width:20}}/>
          </div>
          {runners.map((r,i)=>(
            <RunnerRow key={i} runner={r} index={i}
              onChange={(f,v)=>updateRunner(i,f,v)}
              onRemove={()=>removeRunner(i)}
              matchedSire={!!findStallion(r.sire)}
              matchedBms={!!findStallion(r.bms)}
              matchedDam={!!broodmares.find(m=>m.name===r.dam)}/>
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
              <PredictionCard key={i} entry={e} rank={i+1} venueKey={pVenue}
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

/* ================================================================
   ===== G1 RACE DATA & PAGES =====
   ================================================================ */
const G1_RACES = {
  ouka2026: {
    id:"ouka2026", name:"第86回 桜花賞", date:"2026/4/12", venue:"阪神", course:"芝1600m（外）",
    weather:"晴", trackCond:"良", emoji:"🌸",
    trends: {
      popularity:[
        {label:"1番人気",val:"【1.4.1.4】複勝率60%"},
        {label:"2番人気",val:"【5.2.0.3】複勝率70%",hl:true},
        {label:"3番人気",val:"【3.3.2.2】複勝率80%",hl:true},
        {label:"4-5番人気",val:"【0.0.1.9】複勝率10%"},
        {label:"6-9番人気",val:"【1.1.6.32】複勝率20%"},
        {label:"10番人気以下",val:"【0.0.0.88】好走ゼロ"},
      ],
      popTip:"2番人気が最多5勝。3番人気以内が全滅した年はゼロ。",
      draw:[{label:"1-2枠",val:"連対は2番人気以内のG1馬のみ"},{label:"3-6枠",val:"勝ち馬集中ゾーン",hl:true},{label:"7枠",val:"複勝率17%"},{label:"8枠",val:"過去10年勝ちなし"}],
      drawTip:"3-6枠が狙い目。8枠は厳しい。",
      style:[{label:"逃げ",val:"複勝率20%"},{label:"先行",val:"複勝率21%"},{label:"差し",val:"複勝率22%",hl:true},{label:"追込",val:"複勝率11%"},{label:"上がり3F上位",val:"複勝率51%",hl:true}],
      styleTip:"差し・追込優勢。上がり上位は半数以上が馬券圏内。",
      bloodTip:"キングカメハメハ系が圧倒的。ロードカナロア産駒、ドゥラメンテ産駒が活躍。",
      roteTip:"阪神JF直行×2番人気以内は連対率100%。前走1600m＋3着以内が必須条件。",
    },
    result: {
      time:"1:31.5",
      payouts:{tansho:"290円",fukusho:"140円, 370円, 1,050円",umaren:"1,570円",umatan:"2,280円",sanrenpuku:"17,060円",sanrentan:"82,710円"},
      topFinishers:[
        {rank:1,num:15,name:"スターアニス",pop:1,jockey:"松山弘平",sire:"ドレフォン",bms:"ダイワメジャー",margin:"",style:"差し",note:"中団から直線外一気。2馬身半差の完勝。阪神JF直行の黄金ローテ。"},
        {rank:2,num:5,name:"ギャラボーグ",pop:5,jockey:"西村淳也",sire:"ロードカナロア",bms:"Sligo Bay",margin:"2 1/2",style:"差し",note:"好位から脚を伸ばし2着。阪神JF2着の実力を証明。"},
        {rank:3,num:11,name:"ジッピーチューン",pop:12,jockey:"北村友一",sire:"ロードカナロア",bms:"City Zip",margin:"3/4",style:"差し",note:"12番人気の大穴。6枠から鋭い末脚で3着。"},
        {rank:4,num:6,name:"アイニードユー",pop:13,jockey:"川田将雅",sire:"ファインニードル",bms:"ハードスパン",margin:"",style:"先行",note:"13番人気ながら先行粘りで4着激走。"},
        {rank:5,num:7,name:"アランカール",pop:4,jockey:"武豊",sire:"エピファネイア",bms:"ディープインパクト",margin:"",style:"追込",note:"上がり最速級も届かず5着。"},
      ],
      fullOrder:[
        {rank:1,name:"スターアニス",pop:1},{rank:2,name:"ギャラボーグ",pop:5},{rank:3,name:"ジッピーチューン",pop:12},
        {rank:4,name:"アイニードユー",pop:13},{rank:5,name:"アランカール",pop:4},{rank:6,name:"ナムラコスモス",pop:7},
        {rank:7,name:"サンアントワーヌ",pop:11},{rank:8,name:"エレガンスアスク",pop:14},{rank:9,name:"ドリームコア",pop:2},
        {rank:10,name:"ショウナンカリス",pop:17},{rank:11,name:"リリージョワ",pop:3},{rank:12,name:"ディアダイヤモンド",pop:6},
        {rank:13,name:"スウィートハピネス",pop:9},{rank:14,name:"ルールザウェイヴ",pop:15},{rank:15,name:"ブラックチャリス",pop:10},
        {rank:16,name:"プレセピオ",pop:18},{rank:17,name:"フェスティバルヒル",pop:8},{rank:18,name:"ロンギングセリーヌ",pop:16},
      ],
    },
    review: {
      summary:"2歳女王スターアニスが阪神JFから直行し、1:31.5の好タイムで完勝。中団追走から直線外に持ち出し、2馬身半差で桜の女王に。松山弘平騎手はデアリングタクト以来の桜花賞2勝目。高野友和調教師は桜花賞初制覇。",
      展開:"ロンギングセリーヌがハナに立ち軽快なペース。スターアニスとドリームコアはともに中団を追走。3〜4コーナーでスターアニスは好手応えでスパート開始。対するドリームコアは後方外で伸びあぐねて後退。直線半ばで完全に抜け出したスターアニスが、最後は力強い脚で後続を突き放した。",
      bloodAnalysis:[
        {icon:"🏆",t:"勝ち馬の血統",d:"父ドレフォン（ストームキャット系）×母父ダイワメジャー。スプリント〜マイルのスピード配合。母エピセアロームは秋華賞馬で母系のスタミナも裏付けあり。"},
        {icon:"📊",t:"キンカメ系が2-3着独占",d:"2着ギャラボーグ、3着ジッピーチューンともにロードカナロア産駒。桜花賞におけるキングカメハメハ系の強さがまた証明された。"},
        {icon:"❌",t:"ディープ系は不振",d:"2番人気ドリームコア（父キズナ）9着、3番人気リリージョワ（父シルバーステート）11着。ディープ後継は阪神マイルG1で苦戦が続く。"},
        {icon:"💡",t:"データ通りだった点",d:"阪神JF直行馬が優勝。差し・追込馬が上位独占。3-6枠が好走。8枠は15着以下。上がり上位馬が馬券圏内。"},
        {icon:"⚠️",t:"次走注目",d:"スターアニスはオークスかNHKマイルCか。2着ギャラボーグはオークスで距離延長が合いそう。穴のジッピーチューンも要注目。"},
      ],
      jockeyComment:"「混戦でしたが2歳女王として負けられない気持ちでした。直線に向く時も手応え十分で、追い出しを我慢してから最後は力強い脚を使ってくれました。一冠目、これからも楽しみです」（松山弘平騎手）",
    },
    // 血統分析 vs 実績 検証データ
    verification: {
      intro:"血統分析アプリの予想スコア（父55%+母父20%、母・騎手加算前）と実際の結果を照らし合わせ、分析精度を検証します。全体的にスコアが38〜43点に密集しており、差別化が課題。",
      runners:[
        {name:"スターアニス",num:15,predMark:"▲",predScore:40.5,actualRank:1,actualPop:1,sire:"ドレフォン",bms:"ダイワメジャー",dam:"エピセアローム",
         predComment:"父ドレフォンは芝ダート兼用で阪神右回り◎だが、スプリント寄りの距離適性がマイルでやや減点。スコアは中位の40.5点。",
         actualComment:"1番人気で完勝。1:31.5の好タイム。スコアが中位に留まったのは、ドレフォンの距離レンジの広さ（SPRINT〜MIDDLE）が「距離特化ボーナス」を得られなかったため。実力を過小評価。",
         verdict:"過小評価",vColor:"#EF9F27"},
        {name:"ギャラボーグ",num:5,predMark:"△",predScore:38.8,actualRank:2,actualPop:5,sire:"ロードカナロア",bms:"Sligo Bay",dam:"レキシールー",
         predComment:"父ロードカナロアはスプリント〜マイル特化でスピード◎。ただし母父Sligo Bayが長距離型でマイル適性が低く、母父スコアが35.3と足を引っ張った。",
         actualComment:"5番人気で2着。ロードカナロア産駒の桜花賞適性は血統スコア以上。母父の数値が低くても、ロードカナロアのマイルスピードが勝った。",
         verdict:"過小評価",vColor:"#EF9F27"},
        {name:"ジッピーチューン",num:11,predMark:"▲",predScore:42.1,actualRank:3,actualPop:12,sire:"ロードカナロア",bms:"City Zip",dam:"ジペッサ",
         predComment:"ロードカナロア×City Zipでスピード配合。母父もマイル以下のスピード型で相性◎。スコア42.1は上位グループ。",
         actualComment:"12番人気ながら3着激走！スコア的には上位で、血統評価は正しかった。人気の盲点だったが、スコアは実力を反映していた。",
         verdict:"的中",vColor:"#1D9E75"},
        {name:"アイニードユー",num:6,predMark:"▲",predScore:40.8,actualRank:4,actualPop:13,sire:"ファインニードル",bms:"ハードスパン",dam:"プリディカメント",
         predComment:"父ファインニードルはスプリント〜マイル。母父ハードスパンは芝ダート兼用でパワー型。スコア40.8は中位。",
         actualComment:"13番人気で4着の大激走。川田騎手の先行策が奏功。スコア的には中位で、大外れではないが穴としてピックアップできなかった。",
         verdict:"概ね妥当",vColor:"#378ADD"},
        {name:"アランカール",num:7,predMark:"▲",predScore:41.4,actualRank:5,actualPop:4,sire:"エピファネイア",bms:"ディープインパクト",dam:"シンハライト",
         predComment:"エピファネイア×ディープの配合。マイル〜長距離のスタミナ型。母シンハライトはオークス馬。スコア41.4。",
         actualComment:"4番人気で5着。上がり最速級の末脚を使ったが届かず。血統評価は妥当で、展開が向かなかっただけ。",
         verdict:"概ね妥当",vColor:"#378ADD"},
        {name:"ナムラコスモス",num:10,predMark:"◎",predScore:43.3,actualRank:6,actualPop:7,sire:"ダノンプレミアム",bms:"ジョーカプチーノ",dam:"ナムラリコリス",
         predComment:"スコア最高の43.3点！ダノンプレミアム×ジョーカプチーノのマイル特化配合。距離特化ボーナスが効いた。",
         actualComment:"7番人気で6着。スコア最高だったが馬券圏内には入れず。血統的なマイル適性は高いが、能力面で一枚足りなかった。",
         verdict:"やや過大評価",vColor:"#EF9F27"},
        {name:"ドリームコア",num:14,predMark:"△",predScore:39.7,actualRank:9,actualPop:2,sire:"キズナ",bms:"ハービンジャー",dam:"ノームコア",
         predComment:"父キズナはマイル〜中距離型。母父ハービンジャーは晩成型で3歳春にはマイナス。スコア39.7は下位寄り。",
         actualComment:"2番人気ながら9着に大敗。スコアの低評価が的中。キズナ産駒の阪神G1不振、母父ハービンジャーの晩成マイナスが出た。",
         verdict:"的中（低評価が正解）",vColor:"#1D9E75"},
        {name:"リリージョワ",num:13,predMark:"▲",predScore:40.8,actualRank:11,actualPop:3,sire:"シルバーステート",bms:"キングカメハメハ",dam:"デサフィアンテ",
         predComment:"シルバーステート×キンカメで芝マイル型。スコア40.8は中位。母父キンカメがプラス。",
         actualComment:"3番人気で11着に大敗。スコア的には中位だが、3番人気ほど推すデータではなかった。市場の過大評価を見抜けた可能性あり。",
         verdict:"概ね妥当",vColor:"#378ADD"},
      ],
      summary:{
        hitCount:2,
        nearCount:3,
        missCount:2,
        overCount:1,
        total:8,
        accuracy:"的中2 + 妥当3 = 62.5%（8頭中5頭が妥当以上）",
        lessons:[
          "スコア最高のナムラコスモス(43.3)が6着、中位のスターアニス(40.5)が1着 → スコアの絶対値よりも、種牡馬ごとのG1適性実績データ（ロードカナロアの桜花賞成績など）を加味すべき。",
          "ロードカナロア産駒は3頭出走して2着・3着・14着。スコアに関係なくキンカメ系のG1実績補正が必要。",
          "ドリームコア(39.7)の低スコアが2番人気9着を的中。母父ハービンジャー（晩成型）×3歳の成長マイナスが正しく効いた。",
          "全体のスコアレンジが38〜43点と5点幅に密集 → 差別化が不十分。距離特化ボーナスやG1実績補正の重みを大きくすべき。",
          "騎手×会場の加算（松山×阪神◎、川田×阪神◎）を含めると順位は変動する。血統だけでなく騎手データの統合が重要。",
          "12番人気ジッピーチューン(42.1)がスコア上位で3着 → 穴馬発掘にはスコアが有効だった。人気に惑わされずスコア上位を拾う戦略は正しい。",
        ],
      },
    },
  },
  // === 2026 G1 Calendar (追加はここにオブジェクトを足すだけ) ===
  satsuki2026:{id:"satsuki2026",name:"第86回 皐月賞",date:"2026/4/19",venue:"中山",course:"芝2000m",weather:"",trackCond:"",emoji:"🏇",trends:null,result:null,review:null},
  nhkmile2026:{id:"nhkmile2026",name:"第29回 NHKマイルC",date:"2026/5/10",venue:"東京",course:"芝1600m",weather:"",trackCond:"",emoji:"🎯",trends:null,result:null,review:null},
  victoria2026:{id:"victoria2026",name:"第21回 ヴィクトリアマイル",date:"2026/5/17",venue:"東京",course:"芝1600m",weather:"",trackCond:"",emoji:"👑",trends:null,result:null,review:null},
  oaks2026:{id:"oaks2026",name:"第87回 優駿牝馬（オークス）",date:"2026/5/24",venue:"東京",course:"芝2400m",weather:"",trackCond:"",emoji:"🌹",trends:null,result:null,review:null},
  derby2026:{id:"derby2026",name:"第93回 東京優駿（日本ダービー）",date:"2026/5/31",venue:"東京",course:"芝2400m",weather:"",trackCond:"",emoji:"🏆",trends:null,result:null,review:null},
  yasuda2026:{id:"yasuda2026",name:"第76回 安田記念",date:"2026/6/7",venue:"東京",course:"芝1600m",weather:"",trackCond:"",emoji:"⚡",trends:null,result:null,review:null},
  takarazuka2026:{id:"takarazuka2026",name:"第67回 宝塚記念",date:"2026/6/28",venue:"阪神",course:"芝2200m",weather:"",trackCond:"",emoji:"🌟",trends:null,result:null,review:null},
  sprinters2026:{id:"sprinters2026",name:"第60回 スプリンターズS",date:"2026/10/4",venue:"中山",course:"芝1200m",weather:"",trackCond:"",emoji:"💨",trends:null,result:null,review:null},
  shuka2026:{id:"shuka2026",name:"第29回 秋華賞",date:"2026/10/18",venue:"京都",course:"芝2000m",weather:"",trackCond:"",emoji:"🍂",trends:null,result:null,review:null},
  kikka2026:{id:"kikka2026",name:"第87回 菊花賞",date:"2026/10/25",venue:"京都",course:"芝3000m",weather:"",trackCond:"",emoji:"🌻",trends:null,result:null,review:null},
  tennoshoA2026:{id:"tennoshoA2026",name:"第174回 天皇賞（秋）",date:"2026/11/1",venue:"東京",course:"芝2000m",weather:"",trackCond:"",emoji:"👑",trends:null,result:null,review:null},
  elizabethQC2026:{id:"elizabethQC2026",name:"第51回 エリザベス女王杯",date:"2026/11/15",venue:"京都",course:"芝2200m",weather:"",trackCond:"",emoji:"💎",trends:null,result:null,review:null},
  mileCS2026:{id:"mileCS2026",name:"第43回 マイルCS",date:"2026/11/22",venue:"京都",course:"芝1600m",weather:"",trackCond:"",emoji:"🎯",trends:null,result:null,review:null},
  japanCup2026:{id:"japanCup2026",name:"第46回 ジャパンカップ",date:"2026/11/29",venue:"東京",course:"芝2400m",weather:"",trackCond:"",emoji:"🌍",trends:null,result:null,review:null},
  championsCup2026:{id:"championsCup2026",name:"第23回 チャンピオンズC",date:"2026/12/6",venue:"中京",course:"ダ1800m",weather:"",trackCond:"",emoji:"🔥",trends:null,result:null,review:null},
  hanshinJF2026:{id:"hanshinJF2026",name:"第78回 阪神JF",date:"2026/12/13",venue:"阪神",course:"芝1600m",weather:"",trackCond:"",emoji:"🌸",trends:null,result:null,review:null},
  asahiFS2026:{id:"asahiFS2026",name:"第78回 朝日杯FS",date:"2026/12/20",venue:"阪神",course:"芝1600m",weather:"",trackCond:"",emoji:"⭐",trends:null,result:null,review:null},
  arima2026:{id:"arima2026",name:"第71回 有馬記念",date:"2026/12/27",venue:"中山",course:"芝2500m",weather:"",trackCond:"",emoji:"🎄",trends:null,result:null,review:null},
  hopeful2026:{id:"hopeful2026",name:"第10回 ホープフルS",date:"2026/12/28",venue:"中山",course:"芝2000m",weather:"",trackCond:"",emoji:"🌅",trends:null,result:null,review:null},
};

const G1RacePage=({raceId})=>{
  const race=G1_RACES[raceId];
  if(!race) return <div style={{textAlign:"center",padding:32,color:"var(--color-text-tertiary)"}}>G1データが見つかりません</div>;
  const [section,setSection]=useState(race.result?"review":"overview");
  const hasResult=!!race.result;
  const hasVerify=!!race.verification;
  const sections=[
    ...(hasResult?[{id:"review",label:"回顧"},{id:"result",label:"結果"}]:[]),
    ...(hasVerify?[{id:"verify",label:"検証"}]:[]),
    {id:"overview",label:"傾向"},{id:"draw",label:"枠順"},{id:"style",label:"脚質"},{id:"blood",label:"血統"},{id:"rotation",label:"ローテ"},
  ];
  const DataRow=({label,value,highlight})=>(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:"1px solid var(--color-border-tertiary)"}}>
      <span style={{fontSize:11,color:"var(--color-text-secondary)"}}>{label}</span>
      <span style={{fontSize:11,fontWeight:highlight?600:400,color:highlight?"#1D9E75":"var(--color-text-primary)"}}>{value}</span>
    </div>
  );
  const t=race.trends, r=race.result, rv=race.review;
  return(
    <div style={{background:"var(--color-background-primary)",border:"1px solid var(--color-border-tertiary)",borderRadius:12,padding:16,marginBottom:16}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
        <span style={{fontSize:20}}>{race.emoji}</span>
        <div>
          <div style={{fontSize:15,fontWeight:600,color:"var(--color-text-primary)"}}>{race.name}</div>
          <div style={{fontSize:10,color:"var(--color-text-tertiary)"}}>{race.date} {race.venue} {race.course} / {race.weather}・{race.trackCond}</div>
        </div>
      </div>
      {hasResult&&<div style={{fontSize:11,color:"#1D9E75",fontWeight:500,marginBottom:10}}>✅ レース終了 — タイム {r.time}</div>}
      <div style={{display:"flex",gap:3,flexWrap:"wrap",marginBottom:14}}>
        {sections.map(s=><button key={s.id} onClick={()=>setSection(s.id)} style={{padding:"4px 10px",borderRadius:16,border:section===s.id?"none":"1px solid var(--color-border-tertiary)",background:section===s.id?(s.id==="review"||s.id==="result"?"#D85A30":"#378ADD"):"transparent",color:section===s.id?"#fff":"var(--color-text-secondary)",fontSize:10,fontWeight:500,cursor:"pointer"}}>{s.label}</button>)}
      </div>
      {/* REVIEW */}
      {section==="review"&&rv&&(<div>
        <div style={{fontSize:11,color:"var(--color-text-secondary)",lineHeight:1.8,marginBottom:12}}>{rv.summary}</div>
        <div style={{background:"var(--color-background-secondary)",borderRadius:10,padding:"10px 12px",marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:500,color:"var(--color-text-primary)",marginBottom:4}}>🏇 レース展開</div>
          <div style={{fontSize:10,color:"var(--color-text-secondary)",lineHeight:1.7}}>{rv.展開}</div>
        </div>
        {rv.jockeyComment&&(
          <div style={{background:"#FFF3EE",borderRadius:10,padding:"10px 12px",marginBottom:12,borderLeft:"3px solid #D85A30"}}>
            <div style={{fontSize:10,fontWeight:500,color:"#D85A30",marginBottom:3}}>🎤 勝利騎手コメント</div>
            <div style={{fontSize:10,color:"var(--color-text-secondary)",lineHeight:1.7,fontStyle:"italic"}}>{rv.jockeyComment}</div>
          </div>
        )}
        <div style={{fontSize:11,fontWeight:500,color:"var(--color-text-primary)",marginBottom:8}}>血統分析・振り返り</div>
        {rv.bloodAnalysis.map((a,i)=>(
          <div key={i} style={{background:"var(--color-background-secondary)",borderRadius:8,padding:"8px 10px",marginBottom:5}}>
            <div style={{fontSize:11,fontWeight:600,color:"var(--color-text-primary)",marginBottom:2}}>{a.icon} {a.t}</div>
            <div style={{fontSize:10,color:"var(--color-text-secondary)",lineHeight:1.6}}>{a.d}</div>
          </div>
        ))}
      </div>)}
      {/* RESULT */}
      {section==="result"&&r&&(<div>
        {r.topFinishers.map((f,i)=>{
          const c=i===0?"#1D9E75":i===1?"#378ADD":i===2?"#7F77DD":"var(--color-text-secondary)";
          return(<div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"8px 0",borderBottom:"1px solid var(--color-border-tertiary)"}}>
            <div style={{width:26,height:26,borderRadius:8,background:c,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:12,flexShrink:0}}>{f.rank}</div>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"baseline",gap:6}}><span style={{fontSize:13,fontWeight:600}}>{f.name}</span><span style={{fontSize:9,color:"var(--color-text-tertiary)"}}>{f.pop}人気</span><span style={{fontSize:9,padding:"1px 6px",borderRadius:8,background:"var(--color-background-secondary)",color:"var(--color-text-secondary)"}}>{f.jockey}</span></div>
              <div style={{fontSize:9,color:"var(--color-text-secondary)",marginTop:2}}>父:{f.sire} / 母父:{f.bms} / {f.style}{f.margin?` / ${f.margin}差`:""}</div>
              <div style={{fontSize:9,color:"var(--color-text-tertiary)",marginTop:1}}>{f.note}</div>
            </div>
          </div>);
        })}
        <div style={{fontSize:11,fontWeight:500,margin:"10px 0 4px"}}>全着順</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:2}}>
          {r.fullOrder.map(f=>(<div key={f.rank} style={{display:"flex",gap:4,alignItems:"center",padding:"2px 5px",background:f.rank<=3?"var(--color-background-secondary)":"transparent",borderRadius:4}}>
            <span style={{fontSize:10,fontWeight:f.rank<=3?600:400,color:f.rank<=3?"#1D9E75":"var(--color-text-tertiary)",width:14}}>{f.rank}</span>
            <span style={{fontSize:9,color:"var(--color-text-primary)"}}>{f.name}</span>
            <span style={{fontSize:8,color:"var(--color-text-tertiary)",marginLeft:"auto"}}>{f.pop}人</span>
          </div>))}
        </div>
        <div style={{fontSize:11,fontWeight:500,margin:"10px 0 4px"}}>払戻金</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:3}}>
          {Object.entries(r.payouts).map(([k,v])=>(<div key={k} style={{display:"flex",justifyContent:"space-between",padding:"3px 8px",background:"var(--color-background-secondary)",borderRadius:6}}>
            <span style={{fontSize:10,color:"var(--color-text-secondary)"}}>{({tansho:"単勝",fukusho:"複勝",umaren:"馬連",umatan:"馬単",sanrenpuku:"3連複",sanrentan:"3連単"})[k]}</span>
            <span style={{fontSize:10,fontWeight:500}}>{v}</span>
          </div>))}
        </div>
      </div>)}
      {/* VERIFY (検証) */}
      {section==="verify"&&race.verification&&(()=>{
        const v=race.verification;
        const s=v.summary;
        return(<div>
          <div style={{fontSize:11,color:"var(--color-text-secondary)",lineHeight:1.6,marginBottom:12}}>{v.intro}</div>
          {/* Accuracy summary */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:4,marginBottom:14}}>
            {[{l:"的中",v:s.hitCount,c:"#1D9E75"},{l:"妥当",v:s.nearCount,c:"#378ADD"},{l:"過小評価",v:s.missCount,c:"#EF9F27"},{l:"過大評価",v:s.overCount,c:"#A32D2D"}].map(d=>(
              <div key={d.l} style={{background:"var(--color-background-secondary)",borderRadius:8,padding:"8px",textAlign:"center"}}>
                <div style={{fontSize:20,fontWeight:700,color:d.c}}>{d.v}</div>
                <div style={{fontSize:9,color:"var(--color-text-tertiary)"}}>{d.l}</div>
              </div>
            ))}
          </div>
          <div style={{padding:"8px 10px",background:"var(--color-background-secondary)",borderRadius:8,marginBottom:14}}>
            <div style={{fontSize:10,color:"var(--color-text-secondary)"}}>分析精度: <span style={{fontWeight:600,color:"var(--color-text-primary)"}}>{s.accuracy}</span></div>
          </div>
          {/* Per-horse comparison */}
          <div style={{fontSize:12,fontWeight:500,color:"var(--color-text-primary)",marginBottom:8}}>馬別 予想 vs 実績</div>
          {v.runners.map((h,i)=>(
            <div key={i} style={{border:"1px solid var(--color-border-tertiary)",borderRadius:10,marginBottom:8,overflow:"hidden"}}>
              {/* Header */}
              <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:"var(--color-background-secondary)"}}>
                <span style={{fontSize:16,fontWeight:700,color:h.vColor}}>{h.predMark}</span>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"baseline",gap:6}}>
                    <span style={{fontSize:13,fontWeight:600,color:"var(--color-text-primary)"}}>{h.name}</span>
                    <span style={{fontSize:9,color:"var(--color-text-tertiary)"}}>馬番{h.num}</span>
                  </div>
                  <div style={{fontSize:9,color:"var(--color-text-secondary)"}}>父:{h.sire} / 母父:{h.bms} / 母:{h.dam}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:h.vColor,color:"#fff",fontWeight:600}}>{h.verdict}</span>
                </div>
              </div>
              {/* Comparison */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
                <div style={{padding:"8px 12px",borderRight:"1px solid var(--color-border-tertiary)"}}>
                  <div style={{fontSize:9,fontWeight:600,color:"#378ADD",marginBottom:4}}>📊 血統分析の予想</div>
                  <div style={{display:"flex",alignItems:"baseline",gap:6,marginBottom:4}}>
                    <span style={{fontSize:18,fontWeight:700,color:"#378ADD"}}>{h.predMark}</span>
                    <span style={{fontSize:12,color:"var(--color-text-secondary)"}}>スコア {h.predScore}</span>
                  </div>
                  <div style={{fontSize:9,color:"var(--color-text-secondary)",lineHeight:1.5}}>{h.predComment}</div>
                </div>
                <div style={{padding:"8px 12px"}}>
                  <div style={{fontSize:9,fontWeight:600,color:"#D85A30",marginBottom:4}}>🏁 実際の結果</div>
                  <div style={{display:"flex",alignItems:"baseline",gap:6,marginBottom:4}}>
                    <span style={{fontSize:18,fontWeight:700,color:h.actualRank<=3?"#1D9E75":h.actualRank<=6?"#378ADD":"var(--color-text-tertiary)"}}>{h.actualRank}着</span>
                    <span style={{fontSize:12,color:"var(--color-text-secondary)"}}>{h.actualPop}番人気</span>
                  </div>
                  <div style={{fontSize:9,color:"var(--color-text-secondary)",lineHeight:1.5}}>{h.actualComment}</div>
                </div>
              </div>
            </div>
          ))}
          {/* Lessons learned */}
          <div style={{fontSize:12,fontWeight:500,color:"var(--color-text-primary)",margin:"14px 0 8px"}}>📝 今後への教訓</div>
          {s.lessons.map((l,i)=>(
            <div key={i} style={{display:"flex",gap:8,padding:"6px 0",borderBottom:"1px solid var(--color-border-tertiary)"}}>
              <span style={{fontSize:12,color:"#D85A30",flexShrink:0}}>{i+1}.</span>
              <span style={{fontSize:10,color:"var(--color-text-secondary)",lineHeight:1.6}}>{l}</span>
            </div>
          ))}
        </div>);
      })()}
      {/* TRENDS */}
      {section==="overview"&&t&&(<div>
        <div style={{fontSize:12,fontWeight:500,marginBottom:6}}>人気別成績（過去10年）</div>
        {t.popularity.map((d,i)=><DataRow key={i} label={d.label} value={d.val} highlight={d.hl}/>)}
        <div style={{marginTop:8,padding:"8px 10px",background:"#FFF3EE",borderRadius:8,fontSize:10,color:"#D85A30",lineHeight:1.6}}>💡 {t.popTip}</div>
      </div>)}
      {section==="draw"&&t&&(<div>
        <div style={{fontSize:12,fontWeight:500,marginBottom:6}}>枠順別傾向</div>
        {t.draw.map((d,i)=><DataRow key={i} label={d.label} value={d.val} highlight={d.hl}/>)}
        <div style={{marginTop:8,padding:"8px 10px",background:"#FFF3EE",borderRadius:8,fontSize:10,color:"#D85A30",lineHeight:1.6}}>💡 {t.drawTip}</div>
      </div>)}
      {section==="style"&&t&&(<div>
        <div style={{fontSize:12,fontWeight:500,marginBottom:6}}>脚質別傾向</div>
        {t.style.map((d,i)=><DataRow key={i} label={d.label} value={d.val} highlight={d.hl}/>)}
        <div style={{marginTop:8,padding:"8px 10px",background:"#FFF3EE",borderRadius:8,fontSize:10,color:"#D85A30",lineHeight:1.6}}>💡 {t.styleTip}</div>
      </div>)}
      {section==="blood"&&t&&(<div>
        <div style={{fontSize:12,fontWeight:500,marginBottom:6}}>血統傾向</div>
        <div style={{fontSize:10,color:"var(--color-text-secondary)",lineHeight:1.7}}>{t.bloodTip}</div>
      </div>)}
      {section==="rotation"&&t&&(<div>
        <div style={{fontSize:12,fontWeight:500,marginBottom:6}}>前走ローテ傾向</div>
        <div style={{fontSize:10,color:"var(--color-text-secondary)",lineHeight:1.7}}>{t.roteTip}</div>
      </div>)}
    </div>
  );
};

/* ================================================================
   ===== BETTING CALCULATOR =====
   ================================================================ */
const BET_TYPES=[
  {id:"win",name:"単勝",desc:"1着を当てる",minSelect:1,from:1,formula:(n)=>n},
  {id:"place",name:"複勝",desc:"3着以内を当てる",minSelect:1,from:1,formula:(n)=>n},
  {id:"exacta",name:"馬単",desc:"1-2着を順番通りに",minSelect:2,from:2,formula:(n,s)=>{if(s.mode==="box")return n*(n-1);if(s.mode==="nagashi")return(n-1)*(s.axis==="1st"?1:1)+(s.multi?n-1:0);return 1;}},
  {id:"quinella",name:"馬連",desc:"1-2着を順不同",minSelect:2,from:2,formula:(n)=>n*(n-1)/2},
  {id:"wide",name:"ワイド",desc:"3着以内の2頭",minSelect:2,from:2,formula:(n)=>n*(n-1)/2},
  {id:"trio",name:"3連複",desc:"1-2-3着を順不同",minSelect:3,from:3,formula:(n)=>n*(n-1)*(n-2)/6},
  {id:"trifecta",name:"3連単",desc:"1-2-3着を順番通り",minSelect:3,from:3,formula:(n)=>n*(n-1)*(n-2)},
];

const BettingCalculator=()=>{
  const [betType,setBetType]=useState("quinella");
  const [mode,setMode]=useState("box"); // box, nagashi, formation
  const [unitPrice,setUnitPrice]=useState(100);
  const [headCount,setHeadCount]=useState(18);
  // Box mode
  const [boxSelected,setBoxSelected]=useState([]);
  // Nagashi mode
  const [axisHorses,setAxisHorses]=useState([]);
  const [partnerHorses,setPartnerHorses]=useState([]);
  // Formation mode (3連単/3連複)
  const [formA,setFormA]=useState([]); // 1着
  const [formB,setFormB]=useState([]); // 2着
  const [formC,setFormC]=useState([]); // 3着

  const bt=BET_TYPES.find(b=>b.id===betType);
  const isTrio=betType==="trio"||betType==="trifecta";
  const isExacta=betType==="exacta";
  const isPair=betType==="quinella"||betType==="wide";
  const isSingle=betType==="win"||betType==="place";

  // Calculate points
  const calcPoints=()=>{
    if(isSingle){
      return boxSelected.length;
    }
    if(mode==="box"){
      const n=boxSelected.length;
      if(isPair||isExacta) return isExacta?n*(n-1):n*(n-1)/2;
      if(isTrio) return betType==="trifecta"?n*(n-1)*(n-2):n*(n-1)*(n-2)/6;
      return 0;
    }
    if(mode==="nagashi"){
      const a=axisHorses.length;
      const p=partnerHorses.filter(h=>!axisHorses.includes(h)).length;
      if(isPair) return a*p;
      if(isExacta) return a*p*2; // 軸→相手 and 相手→軸
      if(isTrio){
        // 軸1頭流し: 相手からの2頭組み合わせ
        if(a===1) return betType==="trifecta"?p*(p-1):p*(p-1)/2;
        // 軸2頭流し: 相手N頭
        if(a===2) return betType==="trifecta"?p*2:p;
        return 0;
      }
      return 0;
    }
    if(mode==="formation"){
      // For trifecta/trio: unique combos from A×B×C excluding duplicates
      if(!isTrio&&!isExacta) return 0;
      let count=0;
      const aa=formA, bb=formB, cc=isTrio||isExacta?formC:[];
      if(isExacta){
        // 馬単フォーメーション: A→B (no dups)
        for(const a of aa) for(const b of bb) if(a!==b) count++;
        return count;
      }
      // 3連単/3連複
      for(const a of aa) for(const b of bb) for(const c of cc){
        if(a!==b&&b!==c&&a!==c){
          if(betType==="trifecta") count++;
          else {
            // 3連複: sort to avoid counting same combo twice
            const key=[a,b,c].sort().join("-");
            count++; // We'll deduplicate below
          }
        }
      }
      if(betType==="trio"){
        // Deduplicate
        const seen=new Set();
        count=0;
        for(const a of aa) for(const b of bb) for(const c of cc){
          if(a!==b&&b!==c&&a!==c){
            const key=[a,b,c].sort((x,y)=>x-y).join("-");
            if(!seen.has(key)){seen.add(key);count++;}
          }
        }
      }
      return count;
    }
    return 0;
  };

  const points=calcPoints();
  const totalCost=points*unitPrice;

  const toggleInList=(list,setList,val)=>{
    setList(prev=>prev.includes(val)?prev.filter(v=>v!==val):[...prev,val]);
  };

  const HorseGrid=({selected,onToggle,label})=>(
    <div>
      {label&&<div style={{fontSize:10,color:"var(--color-text-secondary)",marginBottom:4,fontWeight:500}}>{label}</div>}
      <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
        {Array.from({length:headCount},(_,i)=>i+1).map(n=>{
          const sel=selected.includes(n);
          return <button key={n} onClick={()=>onToggle(n)} style={{
            width:32,height:32,borderRadius:8,border:sel?"2px solid #1D9E75":"1px solid var(--color-border-tertiary)",
            background:sel?"#E1F5EE":"var(--color-background-primary)",color:sel?"#1D9E75":"var(--color-text-secondary)",
            fontSize:12,fontWeight:sel?600:400,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"
          }}>{n}</button>;
        })}
      </div>
    </div>
  );

  // Available modes per bet type
  const availModes=isSingle?["box"]:isPair?["box","nagashi"]:isExacta?["box","nagashi","formation"]:["box","nagashi","formation"];

  return(
    <div>
      {/* Bet type selector */}
      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:14}}>
        {BET_TYPES.map(b=>(
          <button key={b.id} onClick={()=>{setBetType(b.id);setBoxSelected([]);setAxisHorses([]);setPartnerHorses([]);setFormA([]);setFormB([]);setFormC([]);}}
            style={{padding:"6px 12px",borderRadius:8,border:betType===b.id?"none":"1px solid var(--color-border-tertiary)",
              background:betType===b.id?"#1D9E75":"var(--color-background-primary)",
              color:betType===b.id?"#fff":"var(--color-text-secondary)",fontSize:12,fontWeight:500,cursor:"pointer"}}>
            {b.name}
          </button>
        ))}
      </div>
      <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginBottom:12}}>{bt?.desc}</div>

      {/* Head count & unit price */}
      <div style={{display:"flex",gap:12,marginBottom:14,alignItems:"center"}}>
        <Field label="出走頭数">
          <select value={headCount} onChange={e=>setHeadCount(Number(e.target.value))} style={{...inputStyle,width:70}}>
            {Array.from({length:14},(_,i)=>i+5).map(n=><option key={n} value={n}>{n}頭</option>)}
          </select>
        </Field>
        <Field label="1点あたり">
          <select value={unitPrice} onChange={e=>setUnitPrice(Number(e.target.value))} style={{...inputStyle,width:90}}>
            {[100,200,300,500,1000,2000,5000,10000].map(p=><option key={p} value={p}>{p.toLocaleString()}円</option>)}
          </select>
        </Field>
      </div>

      {/* Mode selector (not for single bets) */}
      {!isSingle&&(
        <div style={{display:"flex",gap:6,marginBottom:14}}>
          {availModes.map(m=>(
            <button key={m} onClick={()=>{setMode(m);setBoxSelected([]);setAxisHorses([]);setPartnerHorses([]);setFormA([]);setFormB([]);setFormC([]);}}
              style={{padding:"5px 14px",borderRadius:20,border:mode===m?"none":"1px solid var(--color-border-tertiary)",
                background:mode===m?"#378ADD":"transparent",color:mode===m?"#fff":"var(--color-text-secondary)",
                fontSize:11,fontWeight:500,cursor:"pointer"}}>
              {m==="box"?"ボックス":m==="nagashi"?"流し":"フォーメーション"}
            </button>
          ))}
        </div>
      )}

      {/* Selection grids by mode */}
      <div style={{background:"var(--color-background-secondary)",borderRadius:12,padding:14,marginBottom:16}}>
        {(isSingle||mode==="box")&&(
          <HorseGrid selected={boxSelected} onToggle={n=>toggleInList(boxSelected,setBoxSelected,n)} label={isSingle?"買い目の馬番を選択":"ボックスに入れる馬番を選択"}/>
        )}
        {mode==="nagashi"&&!isSingle&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <HorseGrid selected={axisHorses} onToggle={n=>toggleInList(axisHorses,setAxisHorses,n)} label="軸馬（1〜2頭）"/>
            <div style={{borderTop:"1px solid var(--color-border-tertiary)",paddingTop:10}}>
              <HorseGrid selected={partnerHorses} onToggle={n=>toggleInList(partnerHorses,setPartnerHorses,n)} label="相手馬"/>
            </div>
          </div>
        )}
        {mode==="formation"&&!isSingle&&(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <HorseGrid selected={formA} onToggle={n=>toggleInList(formA,setFormA,n)} label={isExacta?"1着候補":"1着候補"}/>
            <div style={{borderTop:"1px solid var(--color-border-tertiary)",paddingTop:8}}>
              <HorseGrid selected={formB} onToggle={n=>toggleInList(formB,setFormB,n)} label={isExacta?"2着候補":"2着候補"}/>
            </div>
            {isTrio&&(
              <div style={{borderTop:"1px solid var(--color-border-tertiary)",paddingTop:8}}>
                <HorseGrid selected={formC} onToggle={n=>toggleInList(formC,setFormC,n)} label="3着候補"/>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      <div style={{background:"var(--color-background-primary)",border:"2px solid #1D9E75",borderRadius:12,padding:16,textAlign:"center"}}>
        <div style={{fontSize:11,color:"var(--color-text-secondary)",marginBottom:4}}>{bt?.name} {mode==="box"?"ボックス":mode==="nagashi"?"流し":"フォーメーション"}</div>
        <div style={{display:"flex",justifyContent:"center",gap:24,alignItems:"baseline"}}>
          <div>
            <div style={{fontSize:32,fontWeight:700,color:"#1D9E75"}}>{points}</div>
            <div style={{fontSize:11,color:"var(--color-text-secondary)"}}>点</div>
          </div>
          <div style={{fontSize:20,color:"var(--color-text-tertiary)"}}>×</div>
          <div>
            <div style={{fontSize:18,fontWeight:500,color:"var(--color-text-primary)"}}>{unitPrice.toLocaleString()}円</div>
          </div>
          <div style={{fontSize:20,color:"var(--color-text-tertiary)"}}>=</div>
          <div>
            <div style={{fontSize:28,fontWeight:700,color:totalCost>10000?"#D85A30":"var(--color-text-primary)"}}>{totalCost.toLocaleString()}</div>
            <div style={{fontSize:11,color:"var(--color-text-secondary)"}}>円</div>
          </div>
        </div>
        {totalCost>10000&&<div style={{fontSize:10,color:"#D85A30",marginTop:6}}>※ 1万円を超えています</div>}
      </div>
    </div>
  );
};

/* ===== Main App ===== */
export default function App(){
  const[stallions,setStallions]=useState([]);
  const[broodmares,setBroodmares]=useState([]);
  const[dataLoading,setDataLoading]=useState(true);

  // Fetch JSON data on mount
  useEffect(()=>{
    const base=import.meta.env.BASE_URL||"/";
    Promise.all([
      fetch(base+"stallions.json").then(r=>r.json()),
      fetch(base+"broodmares.json").then(r=>r.json()),
      fetch(base+"jockeys.json").then(r=>r.json()),
    ]).then(([sData,bData,jData])=>{
      const saved=load(sData.length);
      setStallions(saved&&saved.length>0?saved:sData);
      setBroodmares(bData);
      setJockeysData(jData);
      setDataLoading(false);
    }).catch(err=>{
      console.error("Failed to load data:",err);
      setDataLoading(false);
    });
  },[]);
  const[tab,setTab]=useState("predict");
  const[predMode,setPredMode]=useState("g1");
  const[selectedG1,setSelectedG1]=useState("ouka2026");
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

  if(dataLoading) return(
    <div style={{maxWidth:720,margin:"0 auto",fontFamily:"var(--font-sans)",textAlign:"center",padding:"60px 20px"}}>
      <div style={{fontSize:32,marginBottom:12}}>🐴</div>
      <div style={{fontSize:14,color:"var(--color-text-secondary)"}}>データを読み込み中...</div>
    </div>
  );

  return(
    <div style={{maxWidth:720,margin:"0 auto",fontFamily:"var(--font-sans)"}}>
      <div style={{marginBottom:16}}>
        <h1 style={{fontSize:22,fontWeight:500,color:"var(--color-text-primary)",margin:"0 0 2px",letterSpacing:"-0.02em"}}>競馬血統分析</h1>
        <p style={{fontSize:12,color:"var(--color-text-tertiary)",margin:0}}>Thoroughbred bloodline analyzer — {stats.total} stallions</p>
      </div>

      {/* Tab navigation */}
      <div style={{display:"flex",gap:6,marginBottom:20}}>
        {tabBtn("predict","予想")}{tabBtn("database","血統DB")}{tabBtn("betting","馬券計算")}
      </div>

      {/* ===== INTEGRATED PREDICTION TAB ===== */}
      {tab==="predict"&&(
        <div>
          {/* Mode switch: G1 / 平場 */}
          <div style={{display:"flex",gap:0,marginBottom:16,borderRadius:10,overflow:"hidden",border:"1px solid var(--color-border-tertiary)"}}>
            <button onClick={()=>setPredMode("g1")} style={{flex:1,padding:"10px 0",border:"none",background:predMode==="g1"?"#D85A30":"var(--color-background-primary)",color:predMode==="g1"?"#fff":"var(--color-text-secondary)",fontSize:13,fontWeight:600,cursor:"pointer"}}>🏆 G1モード</button>
            <button onClick={()=>setPredMode("hiraba")} style={{flex:1,padding:"10px 0",border:"none",borderLeft:"1px solid var(--color-border-tertiary)",background:predMode==="hiraba"?"#378ADD":"var(--color-background-primary)",color:predMode==="hiraba"?"#fff":"var(--color-text-secondary)",fontSize:13,fontWeight:600,cursor:"pointer"}}>📋 平場モード</button>
          </div>

          {/* G1 Mode: G1 selector + detail page */}
          {predMode==="g1"&&(
            <div>
              {/* G1 Race Selector */}
              <div style={{marginBottom:16}}>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                  {Object.values(G1_RACES).map(g=>{
                    const isSel=selectedG1===g.id;
                    const hasData=!!g.result;
                    return(
                      <button key={g.id} onClick={()=>setSelectedG1(g.id)} style={{
                        padding:"6px 10px",borderRadius:8,cursor:"pointer",
                        border:isSel?"2px solid #D85A30":"1px solid var(--color-border-tertiary)",
                        background:isSel?"#FFF3EE":hasData?"var(--color-background-primary)":"var(--color-background-secondary)",
                        color:isSel?"#D85A30":hasData?"var(--color-text-primary)":"var(--color-text-tertiary)",
                        fontSize:10,fontWeight:isSel?600:400,opacity:hasData||isSel?1:0.6,
                      }}>
                        <span style={{marginRight:3}}>{g.emoji}</span>{g.name.replace(/第\d+回\s*/,"")}
                        {hasData&&<span style={{fontSize:8,marginLeft:3,color:"#1D9E75"}}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Selected G1 detail page */}
              <G1RacePage raceId={selectedG1}/>
            </div>
          )}

          {/* 平場 Mode: condition-based stallion ranking */}
          {predMode==="hiraba"&&(
            <div>
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
                  <Field label="馬齢">
                    <select value={raceAge} onChange={e=>setRaceAge(e.target.value)} style={inputStyle}>
                      <option value="ANY">指定なし</option>
                      {["2","3","4","5","6"].map(a=><option key={a} value={a}>{a}歳{a==="6"?"+":""}</option>)}
                    </select>
                  </Field>
                  <Field label="表示">
                    <select value={showTop} onChange={e=>setShowTop(Number(e.target.value))} style={inputStyle}>
                      <option value={10}>上位10頭</option><option value={20}>上位20頭</option><option value={50}>全頭</option>
                    </select>
                  </Field>
                </div>
                {/* Race summary bar */}
                <div style={{marginTop:12,padding:"8px 12px",background:"var(--color-background-primary)",borderRadius:8,display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                  <span style={{fontSize:12,fontWeight:600,color:"var(--color-text-primary)"}}>{venueData?.name}</span>
                  <Badge variant={raceSurface==="TURF"?"turf":"dirt"}>{SURFACE[raceSurface]}</Badge>
                  <Badge>{DIST_SHORT[raceDistance]||raceDistance}</Badge>
                  <Badge variant={raceCourse==="RIGHT"?"right":"left"}>{COURSE[raceCourse]}</Badge>
                  <Badge>{TRACK_COND[raceCond]}</Badge>
                  {raceAge!=="ANY"&&<Badge>{raceAge}歳</Badge>}
                </div>
              </div>

              {/* Aptitude ranking */}
              <div style={{fontSize:12,fontWeight:500,color:"var(--color-text-primary)",marginBottom:8}}>
                種牡馬適性ランキング — {venueData?.name} {SURFACE[raceSurface]} {DIST_SHORT[raceDistance]}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                {aptitudeResults.slice(0,showTop).map((r,i)=>(
                  <AptitudeCard key={r.stallion.id} stallion={r.stallion} result={r.result} rank={i+1}/>
                ))}
              </div>
            </div>
          )}
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

      {/* ===== BETTING CALCULATOR TAB ===== */}
      {tab==="betting"&&<BettingCalculator/>}

      <div style={{marginTop:20,padding:"10px 0",borderTop:"1px solid var(--color-border-tertiary)",fontSize:10,color:"var(--color-text-tertiary)",textAlign:"center"}}>
        v7.0 — 血統DB({stats.total}頭) + 繁殖牝馬DB + 騎手DB + 予想 + 馬券計算
      </div>
    </div>
  );
}
