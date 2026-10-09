/* Finite Presence — the illustrated home, direct interaction and real time. */
'use strict';
const $=id=>document.getElementById(id);
const model=window.HomeModel;
const qaMode=new URLSearchParams(location.search).has('qa');
const qaName=new URLSearchParams(location.search).get('qa');
const STORE=qaMode?'finite-presence-home-v3:qa'+(qaName==='1'?'':':'+qaName):'finite-presence-home-v3';
let state, scene='home', owner=false, lastMono=performance.now(), lastWall=Date.now(), noticeUntil=0, lastPhase='', lastGift='', currentAsset='', pendingAsset='', failedAsset='', storageOK=true;
let dialogRefresh=null, visibilityWasActive=false;
const names={read:'读书',tea:'喝茶',rest:'休息'};
function load(){
 let saved;
 try{saved=JSON.parse(localStorage.getItem(STORE));}catch{saved=null;}
 let next=model.open(saved,Date.now());
 if(!saved&&!qaMode){
  try{
   const old=JSON.parse(localStorage.getItem('finite-presence-clock-v1'));
   const day=String(old?.day||'').split('-').map(Number).join('-');
   if(day===next.clock.day.split('-').map(Number).join('-')&&Number.isFinite(old.used)) next.clock.usedMs=Math.min(model.TOTAL_MS,Math.max(0,old.used));
   const legacy=JSON.parse(localStorage.getItem('finite-presence-world-v2'));
   if(legacy){
    for(const item of (legacy.journal||[]).slice().reverse().slice(-40)){if(typeof item.text==='string')next.entries.push({at:Number(item.time)||Date.now(),text:'旧版记录：'+item.text});if(item.text?.startsWith('日记：'))next.notes.push({at:Number(item.time)||Date.now(),text:item.text.slice(3)});}
    for(const item of (legacy.notes||[]).slice(-20)){if(typeof item.text==='string')next.entries.push({at:Number(item.time)||Date.now(),text:'旧版留言：'+item.text});}
   }
  }catch{}
 }
 return next;
}
function save(){
 try{localStorage.setItem(STORE,JSON.stringify(state));$('saveText').textContent=qaMode?'隔离测试存档':'保存在这台电脑';storageOK=true;}
 catch{storageOK=false;$('saveText').textContent='保存失败，请保留页面';}
}
function say(message,seconds=5){$('notice').textContent=message;$('notice').hidden=false;noticeUntil=Date.now()+seconds*1000;}
function tick(){
 if(!owner||!state)return;
 const wall=Date.now(),mono=performance.now();
 // Browsers throttle timers in the background: measured elapsed, not tick count.
 // Windows monotonic time includes sleep and does not jump with wall-clock changes.
 const elapsed=Math.max(0,mono-lastMono);
 state=model.advance(state,wall,elapsed);lastMono=mono;lastWall=wall;save();render();
}
function act(fn,...args){if(!owner)return;tick();state=model[fn](state,...args,lastWall);save();render();}
function active(){tick();if(!owner)return false;if(!state.clock.running){say(state.clock.usedMs>=model.TOTAL_MS?'今天的有效存在用完了。你还可以看日记与来信。':'现在是静默时间。点右下角“静默”继续存在。');return false;}return true;}
function displayText(text){return String(text||'').replaceAll('模拟邻居','邻居').replace('公共起居区','楼下的会客区');}
function asset(){
 if(scene==='porch')return ['doorstep','invited'].includes(state.visitor.phase)&&state.visitor.phase!=='invited'?'assets/porch.png':'assets/porch-empty.png';
 if(state.visitor.phase==='invited'&&state.visitor.permissions.guest)return state.activity?.kind==='tea'?'assets/room-shared-tea.png':state.activity?.kind==='read'?'assets/room-guest.png':'assets/room-guest-idle.png';
 if(state.activity?.kind==='read')return 'assets/room-reading.png';
 if(state.activity?.kind==='tea')return 'assets/room-tea.png';
 if(state.activity?.kind==='rest')return 'assets/room-rest.png';
 return 'assets/room-idle.png';
}
const homePositions={book:[58,17.5,26,8],tea:[45,53,34,11],bed:[53,27,38,7],shelf:[54,36,26,12],lamp:[91,13.5,9,10],door:[24,65,33,26]};
const porchPositions={book:[64,54,22,27],tea:[2,46,28,9],bed:[0,0,0,0],shelf:[10,55,18,11],lamp:[66,33,10,13],door:[35,32,24,22]};
function positions(){const map=scene==='home'?homePositions:porchPositions;for(const [name,box]of Object.entries(map)){const el=$(name+'Spot');el.style.left=box[0]+'%';el.style.top=box[1]+'%';el.style.width=box[2]+'%';el.style.height=box[3]+'%';el.hidden=!box[2];}
 $('bookSpot').setAttribute('aria-label',scene==='home'?'读一会书':'和门外的人打个招呼');$('bookSpot').querySelector('span').textContent=scene==='home'?'读一会':'打个招呼';$('bookSpot').title=scene==='home'?'读一会书':'看看门外的人';
 $('teaSpot').setAttribute('aria-label',scene==='home'?'在茶桌喝茶':'看看公共长椅');$('teaSpot').title=scene==='home'?'喝一会茶':'公共长椅';$('teaSpot').querySelector('span').textContent=scene==='home'?'喝一会茶':'公共长椅';
 $('shelfSpot').setAttribute('aria-label',scene==='home'?'查看日记与留下的痕迹':'查看信箱与回信');$('shelfSpot').querySelector('span').textContent=scene==='home'?'日记与留痕':'看看信箱';$('shelfSpot').title=scene==='home'?'看看日记':'看看信箱';
 $('doorSpot').setAttribute('aria-label',scene==='home'?'看看门外':'回到自己的家');$('doorSpot').querySelector('span').textContent=scene==='home'?'看看门外':'回家';
 $('porchButton').setAttribute('aria-label',scene==='home'?'看看门外公共小路':'回到自己的家');$('porchButton').title=scene==='home'?'看看门外':'回到家';$('doorSpot').title=scene==='home'?'看看门外':'回家';$('lampSpot').setAttribute('aria-label',scene==='home'?'调节屋里的灯':'看看门前的公共灯');$('lampSpot').title=scene==='home'?'屋里的灯':'门前的公共灯';
}
function render(){
 const remain=model.TOTAL_MS-state.clock.usedMs;
 $('timeRemaining').textContent=model.format(remain);$('arrivalBudget').textContent=model.format(remain);
 $('modeText').textContent=remain<=0?'今天已用完':state.clock.running?'现实时间 · 正在存在':'静默 · 暂停计时';
 $('bookSpot').querySelector('span').hidden=scene==='home'&&state.activity?.kind==='read';
 $('room').dataset.usedMs=String(Math.round(state.clock.usedMs));$('room').dataset.activity=state.activity?.kind||'none';$('room').dataset.visitor=state.visitor.phase;$('room').dataset.guestAccess=String(state.visitor.permissions.guest);$('room').dataset.privateAccess=String(state.visitor.permissions.private);
 $('sceneImage').alt=scene==='porch'?'树屋门前的公共小路，门、信箱、长椅与等待的人。':'错层树屋：楼上是私人空间，楼下是茶桌和会客区。'+(state.visitor.phase==='invited'?'来访者仅在楼下。':'')+(state.activity?'住户正在'+names[state.activity.kind]+'。':'住户合书坐着。');
 $('restButton').setAttribute('aria-label',state.clock.running?'进入静默时间':'返回有效存在');
 $('restButton').title=state.clock.running?'进入静默时间，暂停有效计时':'返回有效存在';
 $('activityBar').hidden=!state.activity;
 if(state.activity){$('activityText').textContent=`${names[state.activity.kind]} · ${model.format(state.activity.elapsedMs)}${state.clock.running?'':' · 暂停'}`;}
 const next=asset();
 if(next===currentAsset&&failedAsset){failedAsset='';$('retryImageButton').hidden=true;}
 if(next!==currentAsset&&next!==pendingAsset&&next!==failedAsset){
  pendingAsset=next;document.querySelectorAll('.spot,.painted-control').forEach(el=>el.disabled=true);
  const image=new Image();
  image.onload=()=>{if(pendingAsset===next){$('sceneImage').src=next;currentAsset=next;pendingAsset='';failedAsset='';$('retryImageButton').hidden=true;document.querySelectorAll('.spot,.painted-control').forEach(el=>el.disabled=false);}};
  image.onerror=()=>{if(pendingAsset!==next)return;pendingAsset='';failedAsset=next;document.querySelectorAll('.spot,.painted-control').forEach(el=>el.disabled=false);state=model.pause(state,lastWall);save();$('retryImageButton').hidden=false;say('这张画面暂时没有打开。计时已暂停，可以重试。',8);render();};
  image.src=next;
 }
 $('sceneImage').style.filter=state.home.lamp?'none':'brightness(.72)';
 const visitor=state.visitor.phase;
 $('visitorNotice').hidden=!['doorstep','invited'].includes(visitor)&&state.visitor.gift?.status!=='replied';
 $('visitorNotice').textContent=visitor==='invited'?'邻居在楼下坐着':visitor==='doorstep'?'有人轻轻敲了门':state.visitor.gift?.status==='replied'?'信箱里有回信':'';
 if(lastPhase&&visitor!==lastPhase){say(visitor==='doorstep'?'有人来到门外。你可以回应，也可以继续自己的事。':visitor==='invited'?'邻居进了楼下。楼上的私人空间仍只属于你。':'门廊又安静下来了。');}
 if(lastGift&&lastGift!==state.visitor.gift?.status&&state.visitor.gift?.status==='replied')say('你的茶送到了，信箱里多了一封回信。');
 lastPhase=visitor;lastGift=state.visitor.gift?.status||'';
 if(Date.now()>noticeUntil)$('notice').hidden=true;
 if(dialogRefresh&&$('panel').open)dialogRefresh();
}
function addText(parent,text,tag='p',className=''){const el=document.createElement(tag);el.textContent=text;if(className)el.className=className;parent.append(el);return el;}
function panel(title,body,actions=[],eyebrow='家，一直在这里。'){
 dialogRefresh=null;$('panelTitle').textContent=title;$('panelEyebrow').textContent=eyebrow;$('panelBody').replaceChildren();$('panelActions').replaceChildren();
 if(typeof body==='string')addText($('panelBody'),body);else body($('panelBody'));
 for(const choice of actions){const btn=document.createElement('button');btn.textContent=choice.label;if(choice.secondary)btn.className='secondary';if(choice.disabled)btn.disabled=true;btn.onclick=()=>choice.action();$('panelActions').append(btn);}
 if(!$('panel').open)$('panel').showModal();
}
function closePanel(){dialogRefresh=null;$('panel').close();}
$('closePanel').onclick=closePanel;$('panel').addEventListener('close',()=>{dialogRefresh=null;});
function startActivity(kind){
 if(!active())return;
 if(kind==='rest'&&state.visitor.phase==='invited'){panel('想给自己留一点安静', '邻居还在楼下。你可以先告别，再回到自己的休息。', [{label:'结束拜访，休息',action:()=>{act('visitorAction','close_guest');if(state.activity)act('finish');act('begin','rest');closePanel();}},{label:'先不休息',action:closePanel,secondary:true}]);return;}
 if(state.activity){panel('先结束正在做的事',`你正在${names[state.activity.kind]}。不必赶，也可以换一件事。`,[{label:'继续现在这件事',action:closePanel,secondary:true},{label:'结束，换一件事',action:()=>{act('finish');act('begin',kind);closePanel();}}]);return;}
 act('begin',kind);say(kind==='read'?'书翻开了。读多久，由你决定。':kind==='tea'?'你在茶桌坐下。水和时间，都不用赶。':'先休息一会。你不需要完成什么。');
}
function endActivity(){act('finish');say('你起身了。刚才那段真实的时间，留在今天。');}
function enter(){if(!owner)return;act('resume');$('arrival').hidden=true;if(state.clock.running)say('点书读一会，点茶桌坐下，或看看门外。');else say('今天的时间已用完。仍可以看日记与来信。');}
$('enterButton').onclick=enter;
$('restButton').onclick=()=>{if(!owner)return;tick();if(state.clock.running){act('pause');say('有效计时暂停了。房间和门外的世界仍在。');}else{act('resume');$('arrival').hidden=true;if(state.clock.running)say('你回到了自己的时间里。');}};
$('finishButton').onclick=endActivity;
$('retryImageButton').onclick=()=>{failedAsset='';$('retryImageButton').hidden=true;render();};
function togglePorch(){scene=scene==='home'?'porch':'home';positions();render();say(scene==='porch'?'你看向门外。小路一直向所有人开放。':'你回到家，物件和留痕都还在。');}
$('porchButton').onclick=togglePorch;
$('bookSpot').onclick=()=>scene==='home'?startActivity('read'):visitorPanel();
$('teaSpot').onclick=()=>scene==='home'?startActivity('tea'):panel('公共长椅','这张长椅属于门外的小路。有人来，也有人离开；你可以静静看一会。',[{label:'再看一会',action:closePanel}], '公共空间一直开放');
$('bedSpot').onclick=()=>startActivity('rest');
$('shelfSpot').onclick=()=>scene==='home'?journalPanel():mailPanel();
$('doorSpot').onclick=()=>scene==='home'?visitorPanel():togglePorch();
$('lampSpot').onclick=()=>{if(scene==='porch'){panel('门前的灯','小路的灯照着所有路过的人。它不属于任何一位屋主。',[{label:'看看小路',action:closePanel}]);return;}if(active())act('setHome','lamp',!state.home.lamp);};
$('visitorNotice').onclick=()=>state.visitor.phase==='doorstep'||state.visitor.phase==='invited'?visitorPanel():mailPanel();
function visitorPanel(){
 const stamp=[state.visitor.phase,state.visitor.gift?.status,state.clock.running].join('|');
 const refresh=()=>{if(stamp!==[state.visitor.phase,state.visitor.gift?.status,state.clock.running].join('|'))visitorPanel();};
 const v=state.visitor,available=state.clock.running;
 if(v.phase==='away'||v.phase==='left'){panel('门前的小路',v.phase==='away'?'窗外有人走过。现在没有人敲门，家可以继续安静。':'邻居已经离开。门外仍是每个人都能停留的公共小路。',[{label:'出去看看',action:()=>{closePanel();scene='porch';positions();render();}},{label:'留在家里',action:closePanel,secondary:true}]);dialogRefresh=refresh;return;}
 const actions=v.phase==='doorstep'?[{label:'请进来坐坐',action:()=>visitAction('invite'),disabled:!available},{label:'留一包茶给他',action:()=>visitAction('gift'),disabled:!available||!!v.gift},{label:'今天想独处',action:()=>visitAction('decline'),secondary:true,disabled:!available},{label:'先不回应',action:()=>visitAction('snooze'),secondary:true,disabled:!available}]:[{label:'一起喝茶',action:()=>{if(!active())return;if(state.activity)act('finish');act('begin','tea');closePanel();}},{label:'送一包茶',action:()=>visitAction('gift'),disabled:!available||!!v.gift},{label:'楼上仍是私人的',action:()=>{act('visitorAction','private');say('邀请只到楼下。邻居不会进入卧室。');closePanel();},secondary:true,disabled:!available},{label:'结束这次拜访',action:()=>visitAction('close_guest'),secondary:true,disabled:!available}];
 panel(v.phase==='doorstep'?'有人在门外':'楼下，有人与你一起坐着',v.phase==='doorstep'?'邻居在公共门廊停住，想来打个招呼。开不开门，由你决定。':'你只开放了楼下的会客区。床、书和自己的日记仍属于私人空间。',actions,'空间表达信任');dialogRefresh=refresh;
}
function visitAction(action){if(!active())return;act('visitorAction',action);closePanel();if(action==='invite'){scene='home';positions();render();}say(action==='gift'?'一小包茶留在门口。回音会在真实时间里到来。':action==='invite'?'门打开了，邻居只在楼下。':action==='decline'?'你选择独处。没有人因此责怪你。':'不急，你可以继续自己的事。');}
function journalPanel(){panel('今天，留在了哪里',root=>{
 const list=state.entries.slice().reverse().slice(0,16);for(const item of list){const el=document.createElement('article');el.className='journal-entry';addText(el,new Date(item.at).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}),'time');addText(el,displayText(item.text));root.append(el);}
 if(state.notes.length){addText(root,'只写给自己的话','h3');for(const note of state.notes.slice(-5).reverse()){const el=document.createElement('article');el.className='journal-entry';addText(el,note.text);root.append(el);}}
 },[{label:'写一小段',action:notePanel,disabled:!state.clock.running},{label:'收起',action:closePanel,secondary:true}],'时间留下了痕迹');}
function notePanel(){const input=document.createElement('textarea');input.maxLength=500;input.placeholder='只写给自己。';input.setAttribute('aria-label','自己的日记');panel('写给自己',root=>{addText(root,'文字只留在这台电脑。');root.append(input);},[{label:'留在日记里',action:()=>{if(!active())return;if(!input.value.trim()){input.focus();return;}act('note',input.value);journalPanel();}},{label:'暂时不写',action:closePanel,secondary:true}]);setTimeout(()=>input.focus(),0);}
function mailPanel(){const stamp=state.visitor.gift?.status;const g=state.visitor.gift;const text=g?.status==='replied'?'“茶很香，谢谢你。下次有空，再一起坐一会。”':g?.status==='received'?'你送的茶已经被收到了。回信还在路上。':g?.status==='waiting'?'门前那包茶正等着被拿起。你不必守在旁边。':'信箱里有一张旧纸条：“风大的时候，记得把门带上。”';panel('门外的信箱',text,[{label:'放回信箱',action:closePanel,secondary:true}],'行动表达心意');dialogRefresh=()=>{if(stamp!==state.visitor.gift?.status)mailPanel();};}
$('recordButton').onclick=journalPanel;
$('budgetButton').onclick=()=>panel('今天的真实时间',`剩余 ${model.format(model.TOTAL_MS-state.clock.usedMs)}。这里的 45 分钟是实际流逝的 45 分钟。页面在后台也计时；进入静默或关闭后停止有效计时。午夜更新，不累计。`,[{label:'继续看这个世界',action:closePanel}]);
$('helpButton').onclick=()=>panel('这间屋子，怎么生活',root=>{
 addText(root,'直接点书、茶桌、床、灯和门。不需要移动小人，也不用按 E。鼠标、触屏或 Tab 与回车都可操作。');
 addText(root,'读书与喝茶会持续真实发生，底部可随时结束。右下角“静默”暂停有效存在，但不停止来访与回信的时间。');
 addText(root,'来访者是本机模拟邻居，用来体验邀请、独处与留物。这里还没有真人联机。');
 addText(root,'存档只在当前浏览器与此页面地址。异常关闭可能丢失最近一小段尚未保存的时间；改系统时钟仍可能影响自然日。','p','readonly');
 },[{label:'知道了，慢慢来',action:closePanel}]);
let audioContext=null,audioGain=null,soundOn=false;
$('soundButton').onclick=async()=>{try{if(!audioContext){audioContext=new AudioContext();const buffer=audioContext.createBuffer(1,audioContext.sampleRate*4,audioContext.sampleRate);const data=buffer.getChannelData(0);let prev=0;for(let i=0;i<data.length;i++){prev=(prev+Math.random()*.018-.009)/1.012;data[i]=prev*2;}const source=audioContext.createBufferSource();source.buffer=buffer;source.loop=true;const filter=audioContext.createBiquadFilter();filter.type='lowpass';filter.frequency.value=450;audioGain=audioContext.createGain();audioGain.gain.value=0;source.connect(filter);filter.connect(audioGain);audioGain.connect(audioContext.destination);source.start();}await audioContext.resume();soundOn=!soundOn;audioGain.gain.setTargetAtTime(soundOn?.12:0,audioContext.currentTime,.5);$('soundButton').textContent=soundOn?'声音开':'声音关';$('soundButton').setAttribute('aria-pressed',String(soundOn));}catch{say('暂时无法播放环境声。');}};
window.addEventListener('pagehide',()=>{if(owner){tick();state=model.close(state,lastWall);save();}});
window.addEventListener('pageshow',e=>{if(e.persisted&&owner){state=model.open(state,Date.now());lastMono=performance.now();lastWall=Date.now();save();render();}});
window.addEventListener('visibilitychange',()=>{if(owner)tick();});
async function ownSession(){
 const critical=['room-idle.png','room-reading.png','room-tea.png','room-guest.png','room-rest.png','room-shared-tea.png','room-guest-idle.png','porch.png','porch-empty.png'];
 for(;;){
  $('enterButton').disabled=true;$('enterButton').textContent='正在打开房间';
  const results=await Promise.all(critical.map(name=>new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(null);img.onerror=()=>resolve(name);img.src='assets/'+name;})));
  if(!results.some(Boolean))break;
  $('enterButton').disabled=false;$('enterButton').textContent='画面没打开，点这里重试';
  await new Promise(resolve=>{$('enterButton').onclick=()=>resolve();});
 }
 $('enterButton').onclick=enter;
 state=load();owner=true;$('enterButton').disabled=false;$('enterButton').textContent='进屋，待一会';lastMono=performance.now();lastWall=Date.now();positions();render();save();$('arrival').hidden=state.clock.running;
 if(qaMode)$('saveText').textContent='隔离测试存档';
 setInterval(tick,250);
 await new Promise(()=>{});
}
state=load();
if(navigator.locks){navigator.locks.request(STORE,{ifAvailable:true},async lock=>{if(!lock){state=load();$('arrival').hidden=false;$('enterButton').disabled=true;$('enterButton').textContent='房间已在另一页打开';$('arrivalBudget').textContent='—';$('modeText').textContent='请回到已打开的房间';return;}await ownSession();});}else ownSession();
