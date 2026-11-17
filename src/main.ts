import {Plugin,ItemView,WorkspaceLeaf,TFile,Modal,Notice,normalizePath} from 'obsidian';
import {type Board,type Card,type Source,type Place,type Lane,type Kind,type Supply,LANES,KINDS,SUPPLIES,emptyBoard,uid,readBoard,initialText,replaceBoard,addSource,moveCard,removeCard,shopping,distance,navigation,dayString,coordinates,validDate} from './model.ts';
import {catalogue,buyableFoods} from './sources.ts';
const VIEW='food-workbench-view';
const STATE='30_项目/个人生活记录系统/食物工作空间.md';
const TEXT={recent:'先把想吃的挑出来，不必定时间。',home:'用相同的组合名，把食材与餐食放在一起。',out:'把想去的餐馆、想用的券和顺路采购放在一起。',done:'只结束工作卡片，原券和库存不会因此改变。',later:'暂时不想吃的放这里，之后随时拿回来。'};
export default class FoodPlugin extends Plugin {
 queue:Promise<void>=Promise.resolve();
 async onload(){
  this.registerView(VIEW,leaf=>new FoodView(leaf,this));
  this.addRibbonIcon('utensils','打开食物工作台',()=>void this.open());
  this.addCommand({id:'open-workbench',name:'打开食物工作台',callback:()=>void this.open()});
  this.registerEvent(this.app.metadataCache.on('changed',()=>{for(const leaf of this.app.workspace.getLeavesOfType(VIEW)){const view=leaf.view;if(view instanceof FoodView)view.refreshSources();}}));
 }
 onunload(){this.app.workspace.detachLeavesOfType(VIEW);}
 async open(){const leaf=this.app.workspace.getLeavesOfType(VIEW)[0]??this.app.workspace.getLeaf('tab');await leaf.setViewState({type:VIEW,active:true});this.app.workspace.setActiveLeaf(leaf,{focus:true});}
 async loadBoard():Promise<Board>{const f=this.app.vault.getAbstractFileByPath(STATE);if(!f)return emptyBoard();if(!(f instanceof TFile))throw Error('工作空间路径不是文件');return readBoard(await this.app.vault.read(f));}
 async write(expected:Board,next:Board):Promise<Board>{
  const job=this.queue.then(async()=>{
   const f=this.app.vault.getAbstractFileByPath(STATE);
   let saved='';
   if(f instanceof TFile){saved=await this.app.vault.process(f,text=>replaceBoard(text,expected,next));}
   else {if(f)throw Error('工作空间路径被文件夹占用');if(expected.revision!==0||expected.cards.length||expected.stops.length)throw Error('工作空间已被移走，请刷新');saved=initialText({...next,revision:1});await this.app.vault.create(STATE,saved);}
   return readBoard(saved);
  });
  this.queue=job.then(()=>undefined,()=>undefined);return job;
 }
 sources(){return catalogue(this.app.vault.getMarkdownFiles().filter(f=>f.path.startsWith('50_实体/')||f.path.startsWith('30_项目/做饭与食物实验/菜式/')).map(f=>({path:f.path,name:f.basename,fm:this.app.metadataCache.getFileCache(f)?.frontmatter??{}})));}
 async createIngredient(title:string,note:string,supply:Supply):Promise<void>{
  const folder='50_实体/记录/券食条目';
  if(!this.app.vault.getAbstractFileByPath(folder))await this.app.vault.createFolder(folder);
  const alphabet='0123456789abcdefghjkmnpqrstvwxyz';let time=BigInt(Date.now());let prefix='';for(let i=0;i<10;i++){prefix=alphabet[Number(time%32n)]+prefix;time/=32n;}
  const random=crypto.getRandomValues(new Uint8Array(16));const id='csi_'+prefix+[...random].map(n=>alphabet[n%32]).join('');
  const clean=title.replace(/[\\/:*?"<>|\n\r]/g,' ').trim();if(!clean)throw Error('请填写食材名称');
  const fm={couponSchedulerItem:true,recordType:'coupon-calendar-item',schemaVersion:1,itemId:id,title:title.trim(),aliases:[],calendarType:'food',merchantName:'',placeIds:[],placeRefs:[],sourcePlatform:'用户记录',purchasePrice:null,faceValue:null,validFrom:null,validTo:null,usableStart:null,usableEnd:null,desire:3,itemStatus:'active',foodSupply:supply,foodNote:note,created:new Date().toISOString(),updated:new Date().toISOString(),tags:['记录/券食条目','券食日历/食材']};
  const yaml=Object.entries(fm).map(([k,v])=>k+': '+JSON.stringify(v)).join('\n');
  await this.app.vault.create(folder+'/'+clean+'-'+id.slice(-6)+'.md','---\n'+yaml+'\n---\n\n# '+title.trim()+'\n\n## 备注\n\n'+note+'\n');
 }
 async openPath(path:string){await this.app.workspace.openLinkText(path,'',true);}
}
class FoodView extends ItemView {
 board:Board=emptyBoard();sources:Source[]=[];places:Place[]=[];search='';tab='picked';busy=false;error='';dragId='';laneFilter='all';mapMode='walk';mapLeaf:WorkspaceLeaf|null=null;
 constructor(leaf:WorkspaceLeaf,public plugin:FoodPlugin){super(leaf);}
 getViewType(){return VIEW;}getDisplayText(){return '食物工作台';}getIcon(){return 'utensils';}
 async onOpen(){this.contentEl.addClass('food-workbench');try{this.board=await this.plugin.loadBoard();}catch(e){this.error=String(e);}this.refreshSources();}
 refreshSources(){const c=this.plugin.sources();this.sources=c.sources;this.places=c.places;const focused=this.contentEl.ownerDocument.activeElement;if(focused&&this.contentEl.contains(focused)&&['INPUT','TEXTAREA','SELECT'].includes(focused.tagName))return;this.render();}
 async change(update:(b:Board)=>Board){if(this.busy||this.error)return;this.busy=true;this.render();try{this.board=await this.plugin.write(this.board,update(structuredClone(this.board)));}catch(e){new Notice(String(e),8000);this.error=String(e);}finally{this.busy=false;this.render();}}
 async reload(){try{this.board=await this.plugin.loadBoard();this.error='';}catch(e){this.error=String(e);}this.refreshSources();}
 button(el:HTMLElement,label:string,fn:()=>void,cls=''){const b=el.createEl('button',{text:label,cls});b.disabled=this.busy||!!this.error;b.onclick=fn;return b;}
 render(){
  const root=this.contentEl;root.empty();
  const head=root.createDiv({cls:'fw-header'});head.createDiv({text:'食物工作空间',cls:'fw-eyebrow'});head.createEl('h1',{text:'把想吃的，慢慢拼成一顿'});
  head.createEl('p',{text:'先挑选，再组合；想好了才定时间。在家吃、外出吃和买食材都可以一起想。'});
  const tools=head.createDiv({cls:'fw-toolbar'});
  this.button(tools,'＋ 自由加一张',()=>this.edit());this.button(tools,'＋ 记录食材',()=>new IngredientModal(this.plugin,this).open());
  const refresh=tools.createEl('button',{text:'刷新来源与工作空间'});refresh.onclick=()=>void this.reload();refresh.disabled=this.busy;
  const open=tools.createEl('button',{text:'打开工作空间笔记'});open.onclick=()=>void this.plugin.openPath(STATE);
  this.button(tools,'并排看地图',()=>void this.mapBeside());this.button(tools,'券食日历',()=>this.openCalendar());this.button(tools,'做饭与实验',()=>void this.plugin.openPath('30_项目/做饭与食物实验/做饭与食物实验.md'));
  if(this.error){root.createDiv({cls:'fw-error',text:this.error+'。为避免覆盖，编辑已暂停；修正原笔记或刷新后继续。'});return;}
  if(this.busy)root.createDiv({text:'正在保存…',cls:'fw-status'});
  const layout=root.createDiv({cls:'fw-layout'});this.renderLibrary(layout.createDiv({cls:'fw-library'}));
  const center=layout.createDiv({cls:'fw-center fw-board'});center.createDiv({cls:'fw-handle',attr:{'aria-hidden':'true'}});
  const filter=center.createDiv({cls:'fw-toolbar'});filter.createSpan({text:`工作台 · ${this.board.cards.filter(c=>c.lane!=='done'&&c.lane!=='later').length} 张候选`});
  const sel=filter.createEl('select',{attr:{'aria-label':'显示区域'}});sel.createEl('option',{value:'all',text:'全部区域'});for(const [value,label] of Object.entries(LANES))sel.createEl('option',{value,text:label});sel.value=this.laneFilter;sel.onchange=()=>{this.laneFilter=sel.value;this.render();};
  const lanes=center.createDiv({cls:'fw-lanes'});
  for(const [key,title] of Object.entries(LANES)){const lane=key as Lane;if(this.laneFilter!=='all'&&this.laneFilter!==lane)continue;const col=lanes.createDiv({cls:'fw-lane',attr:{'data-lane':lane}});col.createEl('h3',{text:title});col.createEl('p',{text:TEXT[lane],cls:'fw-muted'});
   col.ondragover=e=>{e.preventDefault();};col.ondrop=e=>{e.preventDefault();const id=e.dataTransfer?.getData('text/food-workbench');if(id&&this.board.cards.some(c=>c.id===id))void this.change(b=>moveCard(b,id,lane));};
   const cards=this.board.cards.filter(c=>c.lane===lane);if(!cards.length)col.createDiv({cls:'fw-empty',text:lane==='recent'?'从左边挑选，或自由添加':'拖入卡片，也可用卡片上的选择菜单'});
   const groups=[...new Set(cards.map(c=>c.group))];for(const group of groups){if(group)col.createDiv({cls:'fw-group',text:group});for(const card of cards.filter(c=>c.group===group))this.renderCard(col,card);}
  }
  const side=layout.createDiv({cls:'fw-side'});this.renderRoute(side);this.renderShopping(side);
 }
 renderLibrary(el:HTMLElement){
  el.createEl('h2',{text:'从这里挑'});const search=el.createEl('input',{type:'search',placeholder:'找券、食材、菜或门店',attr:{'aria-label':'搜索来源'}});search.value=this.search;
  const tabs=el.createDiv({cls:'fw-tabs'});for(const [id,name] of [['picked','券食里挑出的'],['voucher','全部券'],['home','家里有的'],['buy','可购买食材'],['dish','做饭候选'],['place','地点']]){const b=tabs.createEl('button',{text:name,cls:this.tab===id?'is-active':''});b.onclick=()=>{this.tab=id;this.render();};}
  const results=el.createDiv({cls:'fw-results'});
  const list=()=>{
   results.empty();let items:Source[];
   if(this.tab==='home')items=this.sources.filter(s=>s.kind==='stock');
   else if(this.tab==='buy')items=buyableFoods;
   else if(this.tab==='place')items=this.places.map(p=>({key:p.id,path:p.path,title:p.title,kind:'place',supply:'unknown',note:'路线停靠点；不会成为食品库存',expiry:'',places:[p]}));
   else if(this.tab==='picked')items=this.sources.filter(s=>s.picked);
   else items=this.sources.filter(s=>s.kind===this.tab);
   const q=this.search.trim().toLocaleLowerCase();items=items.filter(s=>(s.title+' '+s.note+' '+s.places.map(p=>p.title).join(' ')).toLocaleLowerCase().includes(q));
   results.createDiv({cls:'fw-muted',text:`${items.length} 个来源${this.tab==='picked'?' · 原日期仅作挑选线索':''}`});
   for(const s of items){const row=results.createDiv({cls:'fw-source'});row.createEl('strong',{text:s.title});row.createDiv({cls:'fw-muted',text:s.kind==='stock'?'数量／状态需核实':s.expiry?`主档期限 ${s.expiry}${s.expiry<dayString()?' · 日期已过，待核':''}`:KINDS[s.kind]});if(s.ended)row.createDiv({cls:'fw-muted',text:'原主档已结束；可查看来源'});if(s.note)row.createDiv({cls:'fw-source-note',text:s.note});
    const buttons=row.createDiv({cls:'fw-actions'});const active=this.board.cards.some(c=>c.sourceKey===s.key&&c.lane!=='done'&&c.lane!=='later');const add=this.button(buttons,active?'已在工作台':'挑到工作台',()=>void this.change(b=>addSource(b,s)));if(active)add.disabled=true;
    if(s.path)this.button(buttons,'来源',()=>void this.plugin.openPath(s.path));
   }
   if(!items.length)results.createDiv({cls:'fw-empty',text:'这里还没有匹配内容。可切换分类，或自由添加想吃的。'});
  };search.oninput=()=>{this.search=search.value;list();};list();
 }
 renderCard(el:HTMLElement,c:Card){
  const card=el.createDiv({cls:'fw-card',attr:{draggable:'true','data-card-id':c.id}});card.ondragstart=e=>{e.dataTransfer?.setData('text/food-workbench',c.id);};
  card.createDiv({cls:'fw-card-kind',text:KINDS[c.kind]+' · '+SUPPLIES[c.supply]});card.createEl('h4',{text:c.title});
  if(c.amount)card.createDiv({text:c.amount});if(c.note)card.createDiv({text:c.note,cls:'fw-note'});if(c.date)card.createDiv({text:'意向日期 '+c.date,cls:'fw-date'});
  const source=this.sources.find(s=>s.key===c.sourceKey);const ps=source?.places??[];const selected=this.places.find(p=>p.id===c.placeId);if(source?.expiry)card.createDiv({text:'主档期限 '+source.expiry+(source.expiry<dayString()?' · 需核实':''),cls:'fw-muted'});
  const actions=card.createDiv({cls:'fw-actions'});this.button(actions,'编辑／搭配',()=>this.edit(c));if(source?.path||c.sourcePath)this.button(actions,'原记录',()=>void this.plugin.openPath(source?.path||c.sourcePath));
  const routePlaces=selected?[selected]:ps;if(routePlaces.length===1)this.button(actions,'＋ 路线',()=>this.addStop(routePlaces[0]));else if(routePlaces.length>1)this.button(actions,'选择门店',()=>this.edit(c));
  const move=actions.createEl('select',{attr:{'aria-label':'移动 '+c.title}});for(const [value,text]of Object.entries(LANES))move.createEl('option',{value,text});move.value=c.lane;move.disabled=this.busy;move.onchange=()=>void this.change(b=>moveCard(b,c.id,move.value as Lane));
  this.button(actions,'移出工作台',()=>void this.change(b=>removeCard(b,c.id)));
 }
 addStop(p:Place){if(this.board.stops.some(s=>s.id===p.id)){new Notice('路线里已经有这个地点');return;}void this.change(b=>({...b,stops:[...b.stops,p]}));}
 renderRoute(el:HTMLElement){
  const panel=el.createDiv({cls:'fw-panel'});panel.createEl('h2',{text:'这次出门怎么走'});panel.createEl('p',{cls:'fw-muted',text:'从卡片加入门店，也可加买菜停靠点。先手动排顺序；距离是直线参考，不是实际路程或耗时。'});
  const pick=panel.createEl('select',{attr:{'aria-label':'添加路线地点'}});pick.createEl('option',{value:'',text:'选择已有地点…'});for(const p of this.places)pick.createEl('option',{value:p.id,text:p.title});pick.onchange=()=>{const p=this.places.find(p=>p.id===pick.value);if(p)this.addStop(p);};
  const mode=panel.createEl('select',{attr:{'aria-label':'导航方式'}});for(const [value,text]of [['walk','步行'],['bus','公共交通'],['car','驾车'],['ride','骑行']])mode.createEl('option',{value,text});mode.value=this.mapMode;mode.onchange=()=>{this.mapMode=mode.value;this.render();};
  const stops=this.board.stops.map(p=>this.places.find(x=>x.id===p.id)??p);
  if(!stops.length)panel.createDiv({cls:'fw-empty',text:'还没选路线。先挑几家想吃的，再决定哪些能放在一次出门里。'});
  stops.forEach((p,i)=>{const stop=panel.createDiv({cls:'fw-stop'});stop.createEl('strong',{text:`${i+1}. ${p.title}`});if(i>0){const km=distance(stops[i-1],p);stop.createDiv({cls:'fw-muted',text:km===null?'与上一站距离未知':`距上一站直线约 ${km.toFixed(1)} km`});}
   const tools=stop.createDiv({cls:'fw-actions'});if(i>0)this.button(tools,'↑',()=>void this.change(b=>{[b.stops[i-1],b.stops[i]]=[b.stops[i],b.stops[i-1]];return b;}));if(i<stops.length-1)this.button(tools,'↓',()=>void this.change(b=>{[b.stops[i+1],b.stops[i]]=[b.stops[i],b.stops[i+1]];return b;}));
   if(p.path)this.button(tools,'地点笔记',()=>void this.plugin.openPath(p.path));
   if(coordinates(p)){const a=tools.createEl('a',{text:i?'导航这一段':'导航到这里',href:navigation(p,i?stops[i-1]:undefined,this.mapMode)});a.target='_blank';a.rel='noopener noreferrer';}else stop.createDiv({text:'缺少高德坐标，先在个人地图确认地点',cls:'fw-muted'});
   this.button(tools,'移出路线',()=>void this.change(b=>({...b,stops:b.stops.filter(s=>s.id!==p.id)})));
  });
  this.button(panel,'并排看个人地图',()=>void this.mapBeside());
 }
 renderShopping(el:HTMLElement){const panel=el.createDiv({cls:'fw-panel'});panel.createEl('h2',{text:'组合里要买的'});panel.createEl('p',{cls:'fw-muted',text:'来自在家／外出组合中标为“可购买”的卡片。这里是规划，不是已下单或已入库。'});const cards=shopping(this.board);for(const c of cards)panel.createDiv({cls:'fw-shopping-item',text:`${c.title}${c.amount?' · '+c.amount:''}${c.group?' · '+c.group:''}`});if(!cards.length)panel.createDiv({cls:'fw-empty',text:'把可购买食材放进组合，就会出现在这里。'});}
 edit(card?:Card){new EditModal(this.plugin,this,card).open();}
 async mapBeside(){
  if(!(this.app as any).plugins.enabledPlugins.has('personal-map')){new Notice('请先启用个人地图插件');return;}
  try{if(!this.mapLeaf || !this.app.workspace.getLeavesOfType('personal-map-view').includes(this.mapLeaf)){this.app.workspace.setActiveLeaf(this.leaf,{focus:false});this.mapLeaf=this.app.workspace.getLeaf('split','vertical');await this.mapLeaf.setViewState({type:'personal-map-view',active:true});}await this.app.workspace.revealLeaf(this.mapLeaf);}catch(e){new Notice('无法并排打开地图：'+String(e));}
 }
 openMap(){const enabled=(this.app as any).commands.executeCommandById('personal-map:open-personal-map');if(!enabled)new Notice('请先启用个人地图插件');}
 openCalendar(){const enabled=(this.app as any).commands.executeCommandById('coupon-scheduler:open-calendar');if(!enabled)new Notice('请先启用券食日历插件');}
}
class EditModal extends Modal {
 constructor(public plugin:FoodPlugin,public view:FoodView,public original?:Card){super(plugin.app);}
 onOpen(){
  const c:Card=this.original?structuredClone(this.original):{id:uid(),sourceKey:'',sourcePath:'',title:'',kind:'ingredient',supply:'buyable',lane:'recent',group:'',date:'',note:'',amount:'',placeId:''};if(!c.sourceKey)c.sourceKey='custom:'+c.id;
  this.titleEl.setText(this.original?'调整这张工作卡片':'加一个想吃的／想买的');const form=this.contentEl.createEl('form',{cls:'fw-form'});
  const input=(label:string,key:'title'|'group'|'date'|'note'|'amount',type='text')=>{const l=form.createEl('label',{text:label});const field=type==='textarea'?l.createEl('textarea'):l.createEl('input',{type});field.value=c[key];field.oninput=()=>{c[key]=field.value;};if(key==='title')field.required=true;};
  input('叫什么','title');const select=(label:string,key:'kind'|'supply'|'lane',options:Record<string,string>)=>{const l=form.createEl('label',{text:label});const field=l.createEl('select');for(const[value,text]of Object.entries(options))field.createEl('option',{value,text});field.value=c[key];field.onchange=()=>{(c as any)[key]=field.value;};};
  select('类型','kind',KINDS);select('获取方式','supply',SUPPLIES);select('放在哪里','lane',LANES);input('组合／行程名（同名卡片会放在一起）','group');input('份量／准备多少（可空）','amount');input('意向日期（可空，不代表已预约）','date','date');input('想法、搭配或准备要求','note','textarea');
  const label=form.createEl('label',{text:'关联地点（门店或买菜地点，可空）'});const places=label.createEl('select');places.createEl('option',{value:'',text:'暂不关联'});for(const p of this.view.places)places.createEl('option',{value:p.id,text:p.title});places.value=c.placeId;places.onchange=()=>{c.placeId=places.value;};
  form.createEl('p',{cls:'fw-muted',text:'保存和移动只改变工作空间。券核销、库存变化和真正的日程仍由你确认后处理。'});
  const submit=form.createEl('button',{text:'保存卡片',type:'submit',cls:'mod-cta'});form.onsubmit=e=>{e.preventDefault();if(!c.title.trim()||!validDate(c.date)){new Notice('请填写名称与有效的意向日期，日期也可以留空');return;}c.title=c.title.trim();submit.disabled=true;void this.view.change(b=>({...b,cards:this.original?b.cards.map(x=>x.id===c.id?c:x):[...b.cards,c]}));this.close();};
 }
 onClose(){this.contentEl.empty();}
}

class IngredientModal extends Modal {
 constructor(public plugin:FoodPlugin,public view:FoodView){super(plugin.app);}
 onOpen(){this.titleEl.setText('记录到券食日历的食材');const form=this.contentEl.createEl('form',{cls:'fw-form'});const label=form.createEl('label',{text:'食材名称'});const title=label.createEl('input');title.required=true;const l=form.createEl('label',{text:'获取方式'});const supply=l.createEl('select');for(const value of ['have','buyable','unknown'] as Supply[])supply.createEl('option',{value,text:SUPPLIES[value]});const n=form.createEl('label',{text:'余量、口味或保存备注（可空）'});const note=n.createEl('textarea');form.createEl('p',{text:'保存后，券食日历和食物工作台共用这条食材记录。不会自动加入最近想吃。',cls:'fw-muted'});const button=form.createEl('button',{text:'保存食材',type:'submit',cls:'mod-cta'});form.onsubmit=e=>{e.preventDefault();if(!title.value.trim())return;button.disabled=true;void this.plugin.createIngredient(title.value,note.value,supply.value as Supply).then(()=>{new Notice('食材已保存到券食条目');this.close();this.view.refreshSources();}).catch(e=>{new Notice(String(e));button.disabled=false;});};}
 onClose(){this.contentEl.empty();}
}
