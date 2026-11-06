export const WORLD = { w: 420, h: 800 };
export const ZONES = {
  house: {x:91,y:245}, storage: {x:211,y:232}, tai: {x:340,y:254},
  stove: {x:101,y:388}, table: {x:286,y:407}, straw: {x:344,y:332},
  water: {x:54,y:456}, plot: {x:107,y:570}, wild: {x:333,y:557},
  compost: {x:234,y:599}, plot2: {x:200,y:540},
};
export const NAMES = {wild:'野菜',leaf:'自产青菜',seed:'种子',straw:'秸秆',grass:'杂草',fertilizer:'肥料',wood:'修缮木料',flour:'面粉',soup:'野菜汤',pie:'野菜饼',noodle:'清汤面'};
export const KEYS = Object.keys(NAMES);
export const RECIPES = {
  soup: {name:'野菜汤',leaf:2,flour:0,fuel:1,work:1,output:2,tags:['热食','清淡','不辣']},
  pie: {name:'野菜饼',leaf:2,flour:1,fuel:1,work:1,output:2,tags:['热食','家常','面食','不辣','香脆']},
  noodle: {name:'清汤面',leaf:1,flour:2,fuel:1,work:1,output:2,tags:['热食','家常','面食','不辣','汤食']},
};
export const BUILDS = {
  roof:{name:'修补屋顶',wood:1,work:2,desc:'旧屋顶补好，储物位置获得遮雨保护'},
  stove:{name:'修复灶台',wood:2,work:2,desc:'锅灶完整，留下后续宴席加工能力'},
  field:{name:'开垦第二块地',wood:1,work:2,desc:'第一次查办放行后，增加一个并行种植空间'},
};
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const emit=(e,type,data={})=>e.push({type,...data});
const empty=()=>Object.fromEntries(KEYS.map(k=>[k,0]));
const plot=cleared=>({cleared,state:'empty',progress:0,cared:false,fertilized:false,seedProgress:0});
export function checkpoint(s){const copy=structuredClone(s);delete copy.dayStart;return copy;}
export function createState(){const s={version:4,mode:'life',day:1,work:4,maxWork:4,selfEaten:false,
  player:{x:211,y:436,face:1,walk:0,dock:null,snap:null,releaseUntil:0,dockIntent:0},
  inventory:{bag:empty(),house:empty()},plan:null,foodReservations:{},cooking:null,
  flags:{gathered:false,soupMade:false,introServed:false,firstSeedRequested:false,firstSeedClaimed:false,firstPlanted:false,bedClean:false,composted:false,harvested:false},
  builds:{roof:false,stove:false,field:false,storage:false},plots:[plot(false),plot(false)],
  waterKnown:false,wildDay:0,strawDay:0,waterDay:0,relation:'dismissive',helpUsed:false,
  pending:null,requests:[],rationPending:false,visitor:{status:'none',day:0},
  presentation:null,clock:0,actionSeq:0,totalHarvest:0,started:false,sweep:0,
  seedOverlay:false,dayStart:null};s.inventory.house.wood=1;s.dayStart=checkpoint(s);return s;}
export const total=(s,k)=>s.inventory.bag[k]+s.inventory.house[k];
export function reserved(s,k){let n=s.plan?.items[k]||0;for(const r of Object.values(s.foodReservations))if(r.key===k)n+=r.n;return n;}
export const available=(s,k)=>Math.max(0,total(s,k)-reserved(s,k));
export function add(s,k,n,where='bag'){s.inventory[where][k]+=n;}
function debit(s,k,n){if(total(s,k)<n)return false;const bag=Math.min(n,s.inventory.bag[k]);s.inventory.bag[k]-=bag;s.inventory.house[k]-=n-bag;return true;}
function fail(e,text){emit(e,'tip',{text});return false;}
function action(s,e){s.actionSeq++;if(s.pending?.type==='firstSeed'&&s.pending.status==='pending'&&s.plots[0].cleared&&s.flags.bedClean){s.pending.status='ready';emit(e,'requestReady',{text:'太监把首包种子带回来了，去侧门领取。'});}maybeVisitor(s,e);}
export function stations(s){const list=[['house','屋舍',ZONES.house],['storage','储物架',ZONES.storage],['tai','看管太监',ZONES.tai],['stove','旧灶台',ZONES.stove],['table','小桌分饭',ZONES.table],['straw','干秸秆',ZONES.straw],['water','取水井',ZONES.water],['plot','第一畦地',ZONES.plot],['wild','野菜丛',ZONES.wild],['compost','堆肥处',ZONES.compost]];if(s.builds.field)list.push(['plot2','第二畦地',ZONES.plot2]);return list.map(([id,name,p])=>({id,name,...p}));}
export function movePlayer(s,dt,input,e){const p=s.player;s.clock+=dt;
  const len=Math.hypot(input.x||0,input.y||0),intent=input.intent||0;
  if((p.dock||p.snap)&&intent!==p.dockIntent&&(len>.05||input.targetId||input.fresh)){
    p.dock=null;p.snap=null;p.releaseUntil=s.clock+.55;emit(e,'undock');
  }
  if(p.snap){p.snap.t+=dt;const t=Math.min(1,p.snap.t/.18),ease=1-(1-t)**3;
    p.x=p.snap.from.x+(p.snap.to.x-p.snap.from.x)*ease;p.y=p.snap.from.y+(p.snap.to.y-p.snap.from.y)*ease;
    if(t>=1){p.dock=p.snap.id;p.snap=null;emit(e,'dock',{id:p.dock});}return;
  }
  if(p.dock)return;
  const unit=Math.max(1,len),mx=(input.x||0)/unit,my=(input.y||0)/unit;
  p.x=Math.max(32,Math.min(388,p.x+mx*128*dt));p.y=Math.max(213,Math.min(626,p.y+my*128*dt));
  if(Math.abs(mx)>.05)p.face=mx>0?1:-1;if(len>.05)p.walk+=dt*11;
  if(s.clock<p.releaseUntil)return;
  const list=stations(s).filter(a=>!input.targetId||a.id===input.targetId).sort((a,b)=>distance(a,p)-distance(b,p));
  const near=list[0];if(near&&distance(near,p)<(input.targetId?43:32)){
    p.snap={id:near.id,from:{x:p.x,y:p.y},to:{x:near.x,y:near.y},t:0};p.dockIntent=intent;
  }
}
export function gatherWild(s,e){if(s.wildDay===s.day)return fail(e,'今日已采过，这片野菜下一经营日恢复。');if(s.work<1)return fail(e,'采野菜需要1次劳作，可整理今日安排或重排今日。');s.work--;s.wildDay=s.day;add(s,'wild',4);const first=!s.flags.gathered;s.flags.gathered=true;emit(e,'gather',{key:'wild',n:4,station:'wild',joint:first});action(s,e);return true;}
export function gatherStraw(s,e){if(s.strawDay===s.day)return fail(e,'今天手边干秸秆已拾完，下一经营日有新的整理来源。');s.strawDay=s.day;add(s,'straw',3);emit(e,'gather',{key:'straw',n:3,station:'straw'});action(s,e);return true;}
export function visitWater(s,e){s.waterKnown=true;s.waterDay=s.day;emit(e,'tip',{text:'清水来自这口固定水井。首次演示后，取水并入每次做饭，不另记水库存。'});action(s,e);return true;}
export function previewRecipe(s,id,fuel='straw'){const r=RECIPES[id];if(!r)return null;
  const items={},missing=[];const wild=Math.min(total(s,'wild'),r.leaf);if(wild)items.wild=wild;const leaf=Math.min(total(s,'leaf'),r.leaf-wild);if(leaf)items.leaf=leaf;if(wild+leaf<r.leaf)missing.push({key:'wild',n:r.leaf-wild-leaf});
  if(r.flour){items.flour=Math.min(total(s,'flour'),r.flour);if(items.flour<r.flour)missing.push({key:'flour',n:r.flour-items.flour});}
  items[fuel]=Math.min(total(s,fuel),r.fuel);if(items[fuel]<r.fuel)missing.push({key:fuel,n:r.fuel-items[fuel]});
  if(!s.waterKnown)missing.push({key:'water',n:1});if(s.work<r.work)missing.push({key:'work',n:r.work-s.work});
  if(id==='noodle'&&s.visitor.status==='none')missing.push({key:'recipe',n:1});
  return {id,fuel,items,missing,ready:!missing.length,work:r.work,output:r.output};
}
export function reserveRecipe(s,id,fuel,e){if(!RECIPES[id]||!['straw','wood'].includes(fuel)||s.cooking)return false;
  s.plan=null;const p=previewRecipe(s,id,fuel);s.plan={recipe:id,fuel,items:p.items};emit(e,'reserved',{text:'仅预留已经持有的物资；未取得的材料仍是缺口。'});return true;}
export function cancelPlan(s,e){s.plan=null;emit(e,'tip',{text:'方案预留已释放，库存数量不变。'});return true;}
export function cook(s,id,fuel,e){if(s.cooking)return fail(e,'灶上这一锅尚未做好。');if(s.plan&&s.plan.recipe!==id)return fail(e,'先明确更换方案，释放上一方案的预留。');const p=previewRecipe(s,id,fuel);if(!p?.ready)return fail(e,'还有材料、清水来源或劳作缺口，请先查看获取途径。');
  for(const [key,n]of Object.entries(p.items))debit(s,key,n);s.work-=p.work;s.plan=null;s.cooking={recipe:id,left:2.2,total:2.2};emit(e,'cooking',{id});action(s,e);return true;}
function finishCooking(s,e){const id=s.cooking.recipe;add(s,id,2);s.cooking=null;if(id==='soup')s.flags.soupMade=true;
  if(!s.selfEaten&&!s.foodReservations.self)s.foodReservations.self={key:id,n:1};
  const guest=!s.flags.introServed?'intro':s.visitor.status==='waiting'?'investigator':null;
  if(guest&&!s.foodReservations.guest&&total(s,id)-(s.foodReservations.self?.key===id?1:0)>=1)s.foodReservations.guest={key:id,n:1,for:guest};
  emit(e,'cooked',{id,n:2});action(s,e);
}
export function eat(s,id,e){if(!RECIPES[id]||s.selfEaten)return fail(e,'今天已经安排了自食，饭菜可以留到明日。');const guest=s.foodReservations.guest?.key===id?s.foodReservations.guest.n:0;if(total(s,id)-guest<1)return fail(e,'这份已预留给来人，先改分配再用，不能误吃。');debit(s,id,1);s.selfEaten=true;delete s.foodReservations.self;emit(e,'ate',{id});action(s,e);return true;}
export function canServe(s,id,guest){if(!RECIPES[id])return {ok:false,reason:'请选择现有成品。'};const own=s.foodReservations.self?.key===id?s.foodReservations.self.n:0;if(total(s,id)-own<1)return {ok:false,reason:'需要一份可供待客的成品；自食预留不能偷偷占用。'};if(guest==='intro')return !s.flags.introServed&&id==='soup'?{ok:true}:{ok:false,reason:'第一顿请太监喝野菜汤。'};if(guest==='investigator'){if(s.visitor.status!=='waiting')return {ok:false,reason:'本次查办已放行或尚未到来。'};return RECIPES[id].tags.includes('面食')?{ok:true}:{ok:false,reason:'来人要不辣的热家常面食。汤不含面食标签；可选野菜饼或清汤面。'};}return {ok:false,reason:'这个招待对象当前没有要求。'};}
export function serve(s,id,guest,e){const check=canServe(s,id,guest);if(!check.ok)return fail(e,check.reason);debit(s,id,1);delete s.foodReservations.guest;
  if(guest==='intro'){s.flags.introServed=true;s.relation='helpful';s.rationPending=s.day>1;}else{s.visitor.status='cleared';s.relation='reliable';}
  s.presentation={guest,step:0};emit(e,'served',{id,guest});action(s,e);return true;}
export function clearFoodReservation(s,owner,e){if(!s.foodReservations[owner])return false;delete s.foodReservations[owner];emit(e,'tip',{text:'该份成品预留已取消，饭菜仍在库存。'});return true;}
export function requestHelp(s,type,e){if(!s.flags.introServed)return fail(e,'太监尚未认可你。先做野菜汤请他喝。');if(s.pending)return fail(e,'先领取或等完已答应的事情。');
  if(type==='firstSeed'){if(s.flags.firstSeedRequested)return false;s.flags.firstSeedRequested=true;s.pending={type,status:'pending',due:'清好菜地、理好旧铺位后',grant:{seed:1},left:0};emit(e,'request',{requestType:type});action(s,e);return true;}
  if(s.helpUsed||s.work<1)return fail(e,'普通帮忙每日一次，且需要1劳作。首包种子另算。');
  const defs={seed:{seed:1},flour:{flour:1},straw:{straw:2},wood:{wood:1}};if(!defs[type])return false;
  if(type==='wood'){const food=['pie','soup','noodle'].find(k=>available(s,k)>=1);if(!food)return fail(e,'换木料需要一份未预留的成品食物。');debit(s,food,1);}
  s.helpUsed=true;s.work--;s.pending={type,status:'pending',due:'本经营日侧门交接后',grant:defs[type],left:3};s.requests.push({day:s.day,type,status:'pending'});emit(e,'request',{requestType:type});action(s,e);return true;
}
export function completeHandoff(s,e){if(!s.pending||s.pending.type==='firstSeed'||s.pending.status!=='pending')return false;s.pending.status='ready';s.pending.left=0;emit(e,'requestReady',{text:'侧门交接结束，可以领取实际带回的物资。'});action(s,e);return true;}
export function claimHelp(s,e){const p=s.pending;if(!p||p.status!=='ready')return fail(e,'还没到交付节点。预计物资不能当成库存。');for(const [key,n]of Object.entries(p.grant))add(s,key,n);if(p.type==='firstSeed')s.flags.firstSeedClaimed=true;const record=s.requests.findLast(r=>r.type===p.type&&r.status==='pending');if(record)record.status='done';s.pending=null;emit(e,'delivered',{grant:p.grant});action(s,e);return true;}
export function claimRation(s,e){if(!s.rationPending)return false;s.rationPending=false;add(s,'flour',1);emit(e,'delivered',{grant:{flour:1}});action(s,e);return true;}
export function clearPlot(s,index,e){const p=s.plots[index];if(!p||p.cleared)return false;if(index===1)return fail(e,'第二块地需先办理开垦修缮。');if(s.work<1)return fail(e,'清地需1劳作。');s.work--;p.cleared=true;add(s,'grass',2);emit(e,'cleared',{index});action(s,e);return true;}
export function cleanBed(s,e){if(s.flags.bedClean)return false;s.flags.bedClean=true;emit(e,'built',{id:'bed',text:'旧铺位理好了，小小的改善留下来了。'});action(s,e);return true;}
export function plant(s,index,e){const p=s.plots[index];if(!p?.cleared||p.state!=='empty')return fail(e,'需要先清出一块空地。');if(available(s,'seed')<1||s.work<1)return fail(e,'播种需要种子1包、劳作1。');debit(s,'seed',1);s.work--;Object.assign(p,{state:'growing',progress:0,cared:true,fertilized:false,seedProgress:0});s.flags.firstPlanted=true;emit(e,'planted',{index});action(s,e);return true;}
export function care(s,index,method,e){const p=s.plots[index];if(!p||p.state!=='growing'||p.cared)return fail(e,'这块地今日已照料，或当前无需普通照料。');if(method==='mulch'){if(available(s,'straw')<1)return fail(e,'铺地需要未预留的秸秆1。');debit(s,'straw',1);}else{if(s.work<1)return fail(e,'照料需要1劳作，也可选择用秸秆铺地保湿。');s.work--;}
  p.cared=true;emit(e,'tip',{text:method==='mulch'?'秸秆铺地后已扣除，不能再用于烧火。':'今日已批量照料，结束今日时推进生长。'});action(s,e);return true;}
export function makeCompost(s,e){if(available(s,'grass')<2||s.work<1)return fail(e,'制肥需要杂草2、劳作1。');debit(s,'grass',2);s.work--;add(s,'fertilizer',1);s.flags.composted=true;emit(e,'gather',{key:'fertilizer',n:1,station:'compost'});action(s,e);return true;}
export function fertilize(s,index,e){const p=s.plots[index];if(p?.state!=='growing'||p.fertilized||available(s,'fertilizer')<1)return fail(e,'只能给当前生长中的一茬施一次肥，需要肥料1。');debit(s,'fertilizer',1);p.fertilized=true;emit(e,'tip',{text:'本茬已施肥，收获时额外得到青菜2。'});action(s,e);return true;}
export function harvest(s,index,e){const p=s.plots[index];if(p?.state!=='mature'||s.work<1)return fail(e,'收菜需成熟作物、劳作1。');s.work--;const n=6+(p.fertilized?2:0);add(s,'leaf',n);Object.assign(p,plot(true));s.flags.harvested=true;s.totalHarvest+=n;emit(e,'gather',{key:'leaf',n,station:index?'plot2':'plot'});action(s,e);return true;}
export function leaveSeed(s,index,e){const p=s.plots[index];if(p?.state!=='mature')return false;p.state='seed';p.seedProgress=0;emit(e,'tip',{text:'这茬不收菜，留种占地两次跨日，之后可取种2包。'});action(s,e);return true;}
export function takeSeed(s,index,e){const p=s.plots[index];if(p?.state!=='seed'||p.seedProgress<2||s.work<1)return fail(e,'留种需经过2次跨日，取种需1劳作。');s.work--;add(s,'seed',2);Object.assign(p,plot(true));emit(e,'gather',{key:'seed',n:2,station:index?'plot2':'plot'});action(s,e);return true;}
export function build(s,id,e){const b=BUILDS[id];if(!b||s.builds[id]||s.work<b.work||available(s,'wood')<b.wood)return fail(e,'修缮条件不足，查看木料、劳作与完成后的用途。');if(id==='field'&&s.visitor.status!=='cleared')return fail(e,'先完成首次查办，取得使用第二块地的机会。');debit(s,'wood',b.wood);s.work-=b.work;s.builds[id]=true;if(id==='field'){s.plots[1].cleared=true;add(s,'grass',2);}emit(e,'built',{id,text:b.name+'完成：'+b.desc});action(s,e);return true;}
export function storeAll(s,e){for(const key of KEYS){s.inventory.house[key]+=s.inventory.bag[key];s.inventory.bag[key]=0;}emit(e,'tip',{text:'背包物资已存进屋内；数量与预留都没变，制作仍会合并读取。'});return true;}
export function maybeVisitor(s,e){if(s.visitor.status==='none'&&s.day>=4&&s.flags.harvested&&s.flags.introServed&&s.work===4&&!s.helpUsed&&total(s,'wild')+total(s,'leaf')>=4&&total(s,'flour')>=1&&total(s,'straw')>=1){s.visitor={status:'waiting',day:s.day};emit(e,'visitor',{text:'查物资的来人到了。太监先留人，今日可用菜饼或补面粉做汤面招待。'});}}
export function endDay(s,e,allowDefer=false){if(s.cooking)return fail(e,'先等这锅完成，再确认日末分配。');if(!s.selfEaten)return fail(e,'今天还没有安排一份自食，先吃饭再结束今日。');if(s.visitor.status==='waiting'&&!allowDefer)return fail(e,'来人还在等，先完成招待；或明确选择延期与重排今日。');
  for(const p of s.plots){if(p.state==='growing'&&p.cared){p.progress++;if(p.progress>=2)p.state='mature';}if(p.state==='growing')p.cared=false;if(p.state==='seed')p.seedProgress=Math.min(2,p.seedProgress+1);}
  s.day++;s.work=4;s.selfEaten=false;delete s.foodReservations.self;s.helpUsed=false;s.rationPending=s.flags.introServed;if(s.pending&&s.pending.type!=='firstSeed')s.pending.status='ready';
  s.player.dock=null;s.player.snap=null;s.player.releaseUntil=s.clock+.3;action(s,e);s.dayStart=checkpoint(s);emit(e,'newDay',{day:s.day});return true;}
export function restartDay(s){const saved=s.dayStart;if(!saved)return s;const restored=structuredClone(saved);restored.dayStart=structuredClone(saved);restored.started=true;restored.player.dock=null;restored.player.snap=null;return restored;}
export function createEventState(){const s=createState();s.mode='event';s.day=4;s.waterKnown=true;s.flags={...s.flags,gathered:true,soupMade:true,introServed:true,firstSeedRequested:true,firstSeedClaimed:true,firstPlanted:true,bedClean:true,harvested:true};s.plots[0].cleared=true;s.inventory.bag.wild=4;s.inventory.bag.flour=1;s.inventory.bag.seed=1;s.inventory.bag.straw=2;s.relation='helpful';s.visitor={status:'waiting',day:4};s.dayStart=checkpoint(s);return s;}
export function tick(s,dt,input,e){if(!s.started)return;movePlayer(s,dt,input,e);s.sweep=Math.max(0,s.sweep-dt);
  if(s.cooking){s.cooking.left-=dt;if(s.cooking.left<=0)finishCooking(s,e);}
  if(s.pending?.status==='pending'&&s.pending.type!=='firstSeed'){s.pending.left-=dt;if(s.pending.left<=0){s.pending.status='ready';emit(e,'requestReady',{text:'太监办好侧门交接，可以领取。'});}}
}
export function sweep(s,e){if(!s.started||s.sweep>0)return false;const index=distance(s.player,ZONES.plot2)<distance(s.player,ZONES.plot)?1:0;if(distance(s.player,index?ZONES.plot2:ZONES.plot)>90)return fail(e,'走近成熟菜地再收割；未成熟时不会提前长大。');if(s.plots[index].state!=='mature')return fail(e,'这茬还没成熟，查看经营日进度。');s.sweep=3;return harvest(s,index,e);}
export function objective(s){if(!s.flags.gathered)return {n:1,text:'请太监搭把手，挖一篮野菜',id:'wild'};if(!total(s,'straw')&&!s.flags.soupMade)return {n:2,text:'拾干秸秆，留作野菜汤的燃料',id:'straw'};if(!s.waterKnown)return {n:3,text:'去固定水井，确认清水来源',id:'water'};if(!s.flags.soupMade)return {n:4,text:s.cooking?'野菜和秸秆，正在变成一锅热汤':'去旧灶煮野菜汤，预览材料和劳作',id:'stove'};if(!s.flags.introServed)return {n:5,text:'一份自食、一份请太监喝，看看他的反应',id:'table'};if(!s.flags.firstSeedRequested)return {n:6,text:'太监改观了，向他请求第一包种子',id:'tai'};if(!s.plots[0].cleared)return {n:7,text:'清理第一块菜地，杂草先收进背包',id:'plot'};if(!s.flags.bedClean)return {n:8,text:'等种子的空当，顺手理好旧铺位',id:'house'};if(s.pending?.type==='firstSeed')return {n:9,text:'种子已带回，去侧门领取',id:'tai'};if(!s.flags.firstPlanted)return {n:10,text:'用种子播下第一畦菜，今日已算照料',id:'plot'};
  if(s.visitor.status==='waiting')return {n:14,text:'来人要不辣的热家常面食：菜饼或汤面均可',id:total(s,'pie')+total(s,'noodle')?'table':'stove'};
  if(!s.selfEaten)return {n:11,text:'今日还需一份自食；储备饭菜也能用',id:total(s,'soup')+total(s,'pie')+total(s,'noodle')?'table':'stove'};
  const p=s.plots[0];if(p.state==='mature')return {n:13,text:'第一畦菜成熟了：收菜，还是保留植株留种？',id:'plot'};if(p.state==='growing'&&!p.cared)return {n:12,text:'照料一次，或用秸秆铺地节省劳作',id:'plot'};
  if(s.visitor.status==='cleared')return {n:15,text:'这次物资保住了。选择修屋、修灶或开新地',id:'house'};
  return {n:12,text:'安排余下劳作，自食后确认结束今日',id:'house'};}
