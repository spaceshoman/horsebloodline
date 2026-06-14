// 血統くん localStorage ユーティリティ
const STORAGE_KEY = "keiba-v6";

export function load(minLen=0){
  try{
    const r = localStorage.getItem(STORAGE_KEY);
    if(!r) return null;
    const d = JSON.parse(r);
    if(minLen>0 && d.length<minLen) return null;
    return d;
  } catch { return null; }
}

export function save(d){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
  } catch {}
}
