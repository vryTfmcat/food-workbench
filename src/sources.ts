import type {Kind,Place,Source} from './model.ts';
import {coordinates} from './model.ts';
export interface RecordFile {path:string;name:string;fm:Record<string,unknown>;}
const str=(v:unknown):string=> typeof v==='string'||typeof v==='number'?String(v):'';
const arr=(v:unknown):unknown[]=>Array.isArray(v)?v:[];
export function catalogue(records:RecordFile[]):{sources:Source[];places:Place[]} {
 const places:Place[]=records.filter(r=>r.fm.personalMapPlace===true).map(r=>{
  const p:Place={id:str(r.fm.placeId),path:r.path,title:str(r.fm.title)||r.name};
  // Only coordinates in the map's GCJ-02 system may be sent to Amap.
  if(r.fm.coordinateSystem==='GCJ-02') {p.longitude=typeof r.fm.longitude==='number'?r.fm.longitude:undefined;p.latitude=typeof r.fm.latitude==='number'?r.fm.latitude:undefined;}
  if(!coordinates(p)){delete p.longitude;delete p.latitude;}
  return p;
 }).filter(p=>p.id);
 const byId=new Map(places.map(p=>[p.id,p]));
 // A schedule is a user's selection clue here, never proof of commitment or consumption.
 const selected=new Set(records.filter(r=>r.fm.recordType==='coupon-calendar-schedule' && r.fm.eventStatus==='planned').map(r=>str(r.fm.subjectId)));
 const sources:Source[]=[];
 for(const r of records){const f=r.fm;let kind:Kind|undefined;let id='';
  if(f.couponSchedulerItem===true && f.entityType==='benefit'){kind='voucher';id=str(f.benefitId);}
  else if(f.couponSchedulerItem===true && f.calendarType==='food'){kind='stock';id=str(f.itemId);}
  else if(f.entityType==='item-batch' && /^食品\/|^食物\//.test(str(f.category))){kind='stock';id=str(f.entityId);}
  else if(r.path.startsWith('30_项目/做饭与食物实验/菜式/')){kind='dish';}
  if(!kind) continue;
  const placeIds=[...arr(f.usablePlaceIds),...arr(f.placeIds)].map(str);
  const ended=['used','expired','refunded','void','archived','consumed','disposed'].includes(str(f.benefitStatus||f.itemStatus||f.status));
  sources.push({key:id||r.path,path:r.path,title:str(f.title)||r.name,kind,supply:kind==='stock'?(['have','buyable','unknown'].includes(str(f.foodSupply))?str(f.foodSupply) as Source['supply']:'unknown'):kind==='voucher'?'entitled':'buyable',note:kind==='stock'?(str(f.foodNote)||`历史／主档来源；现场余量与状态待核${f.quantity!==undefined && f.quantity!==null?'；记录数量 '+str(f.quantity)+' '+str(f.unit):''}`):kind==='voucher'?'已持有权益；是否核销以平台与原主档为准':'做饭候选；材料可以购买',expiry:str(f.validTo),places:placeIds.map(id=>byId.get(id)).filter((p):p is Place=>!!p),picked:selected.has(id),ended});
 }
 return {sources,places};
}
export const buyableFoods:Source[]=['鸡蛋','青菜','土豆','胡萝卜','豆腐','番茄','茄子','米／面等主食'].map(title=>({key:'buyable:'+title,path:'',title,kind:'ingredient',supply:'buyable',note:'按需购买的材料候选；不代表已购买、附近有货或必须买',expiry:'',places:[]}));
