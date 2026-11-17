export type Lane = 'recent' | 'home' | 'out' | 'done' | 'later';
export type Kind = 'voucher' | 'stock' | 'ingredient' | 'dish' | 'place';
export type Supply = 'have' | 'buyable' | 'unknown' | 'entitled';
export interface Place { id: string; path: string; title: string; longitude?: number; latitude?: number; }
export interface Source { key: string; path: string; title: string; kind: Kind; supply: Supply; note: string; expiry: string; places: Place[]; picked?: boolean; ended?: boolean; }
export interface Card { id: string; sourceKey: string; sourcePath: string; title: string; kind: Kind; supply: Supply; lane: Lane; group: string; date: string; note: string; amount: string; placeId: string; }
export interface Board { schemaVersion: 1; revision: number; cards: Card[]; stops: Place[]; }
export const LANES: Record<Lane,string> = { recent:'最近想吃', home:'在家组合', out:'外出候选', done:'已处理', later:'先放一放' };
export const KINDS: Record<Kind,string> = {voucher:'团购券',stock:'家中食品',ingredient:'食材',dish:'菜／餐食',place:'地点'};
export const SUPPLIES: Record<Supply,string> = {have:'家里有，状态待核',buyable:'可购买',unknown:'是否有待确认',entitled:'已持有权益'};
export const START = '<!-- food-workbench:start -->';
export const END = '<!-- food-workbench:end -->';
export function emptyBoard(): Board { return {schemaVersion:1,revision:0,cards:[],stops:[]}; }
export function uid(): string { return globalThis.crypto.randomUUID(); }
const string = (v: unknown): v is string => typeof v === 'string';
export function validDate(value: string): boolean {
 if(value==='') return true;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
 const d=new Date(value+'T12:00:00Z'); return !Number.isNaN(d.getTime()) && d.toISOString().slice(0,10)===value;
}
export function validate(value: unknown): Board {
 const b=value as Board;
 if(!b || b.schemaVersion!==1 || !Number.isSafeInteger(b.revision) || b.revision<0 || !Array.isArray(b.cards) || !Array.isArray(b.stops)) throw Error('工作空间格式或版本不支持，原文件未改动');
 const ids=new Set<string>();
 for(const c of b.cards){
  if(!c || ![c.id,c.sourceKey,c.sourcePath,c.title,c.group,c.date,c.note,c.amount,c.placeId].every(string) || !Object.hasOwn(LANES,c.lane) || !Object.hasOwn(KINDS,c.kind) || !Object.hasOwn(SUPPLIES,c.supply) || !c.id || !c.title.trim() || !validDate(c.date) || ids.has(c.id)) throw Error('工作卡片格式有误，原文件未改动');
  ids.add(c.id);
 }
 const stops=new Set<string>();
 for(const p of b.stops){if(!p || ![p.id,p.path,p.title].every(string) || !p.id || stops.has(p.id) || ((p.longitude!==undefined || p.latitude!==undefined) && !coordinates(p))) throw Error('路线格式有误，原文件未改动');stops.add(p.id);}
 return structuredClone(b);
}
export function coordinates(p: Place): boolean {return typeof p.longitude==='number' && Number.isFinite(p.longitude) && p.longitude>=-180 && p.longitude<=180 && typeof p.latitude==='number' && Number.isFinite(p.latitude) && p.latitude>=-90 && p.latitude<=90;}
export function readBoard(text: string): Board {
 if(text.split(START).length!==2 || text.split(END).length!==2 || text.indexOf(END)<text.indexOf(START)) throw Error('工作空间标记缺失或重复，未覆盖原内容');
 const block=text.slice(text.indexOf(START)+START.length,text.indexOf(END));
 const match=block.match(/```json\s*\n([\s\S]*?)\n```/);
 if(!match) throw Error('找不到工作空间数据，未覆盖原内容');
 return validate(JSON.parse(match[1]));
}
function cell(text:string):string {return text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('|','\\|').replaceAll('\n',' ');}
export function renderBlock(board:Board):string {
 validate(board);
 const summary=board.cards.map(c=>`| ${cell(c.title)} | ${LANES[c.lane]} | ${cell(c.group)} | ${c.date || '未定'} | ${SUPPLIES[c.supply]} |`).join('\n');
 return `${START}\n\n## 工作卡片\n\n| 内容 | 放置区 | 组合／行程 | 意向日期 | 获取方式 |\n| --- | --- | --- | --- | --- |\n${summary}\n\n## 路线顺序\n\n${board.stops.map((p,i)=>`${i+1}. ${cell(p.title)}`).join('\n') || '尚未选择停靠点。'}\n\n## 工作空间数据\n\n下方由食物工作台维护；正文其他位置可以自由写笔记。\n\n\`\`\`json\n${JSON.stringify(board,null,2).replaceAll("<", "\\u003c")}\n\`\`\`\n\n${END}`;
}
export function initialText(board: Board):string {return `---\ntitle: 食物工作空间\ntype: food-workbench-state\nschemaVersion: 1\n---\n\n# 食物工作空间\n\n这是最近想吃、在家组合和外出候选的工作空间。加入或移动卡片不等于预约、核销、吃完或扣库存。意向日期由你主动填写；不写日期也能规划。\n\n${renderBlock(board)}\n`;}
export function replaceBoard(text:string, expected:Board, next:Board):string {
 const actual=readBoard(text);
 if(JSON.stringify(actual)!==JSON.stringify(expected)) throw Error('其他设备或笔记已修改工作空间：本次未覆盖，请刷新后重试');
 const revised=validate({...next,revision:actual.revision+1});
 return text.slice(0,text.indexOf(START))+renderBlock(revised)+text.slice(text.indexOf(END)+END.length);
}
export function newCard(source:Source):Card { return {id:uid(),sourceKey:source.key,sourcePath:source.path,title:source.title,kind:source.kind,supply:source.supply,lane:'recent',group:'',date:'',note:source.note,amount:'',placeId:source.places.length===1?source.places[0].id:''}; }
export function addSource(board:Board,source:Source):Board {
 if(board.cards.some(c=>c.sourceKey===source.key && c.lane!=='done' && c.lane!=='later')) return board;
 return {...board,cards:[...board.cards,newCard(source)]};
}
export function moveCard(board:Board,id:string,lane:Lane):Board {return {...board,cards:board.cards.map(c=>c.id===id?{...c,lane}:c)};}
export function removeCard(board:Board,id:string):Board {return {...board,cards:board.cards.filter(c=>c.id!==id)};}
export function shopping(board:Board):Card[] {return board.cards.filter(c=>(c.lane==='home'||c.lane==='out') && c.supply==='buyable' && c.kind!=='voucher' && c.kind!=='place');}
export function distance(a:Place,b:Place):number | null {
 if(!coordinates(a)||!coordinates(b)) return null;
 const rad=Math.PI/180, lat1=a.latitude!*rad,lat2=b.latitude!*rad,deltaLat=lat2-lat1,deltaLon=(b.longitude!-a.longitude!)*rad;
 const h=Math.sin(deltaLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(deltaLon/2)**2;
 return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
}
export function navigation(to:Place,from?:Place,mode='walk'):string {
 if(!coordinates(to)) throw Error('地点缺少有效坐标');
 const params=new URLSearchParams({to:`${to.longitude},${to.latitude},${to.title}`,mode,src:'food-workbench',coordinate:'gaode',callnative:'0'});
 if(from && coordinates(from)) params.set('from',`${from.longitude},${from.latitude},${from.title}`);
 return 'https://uri.amap.com/navigation?'+params.toString();
}
export function dayString(date=new Date()):string {return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
