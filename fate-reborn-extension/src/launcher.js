import {game,lib,ui,get} from "noname";
const asset=name=>`${lib.assetURL}extension/fate-reborn/assets/heroes/${name==='fate_anti_mage'?'fate_antimage':name}.jpg`;
function front() {
  document.title='宿命 Reborn';
  if(!document.getElementById('fate-front-style')) {
    const style=document.createElement('style');style.id='fate-front-style';
    style.textContent=`
.fate-front,.fate-front *{box-sizing:border-box}.fate-front *{position:relative;left:auto;top:auto;}
.fate-front{position:fixed;inset:0;z-index:10000;color:#e8dfcb;font:16px sans-serif;background:#10191e;overflow:hidden;}
.fate-front::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 70% 35%,#48585a55,transparent 65%),linear-gradient(140deg,#18282c,#0b1116);pointer-events:none;}
.fate-front button{color:#ddd4c1;cursor:pointer;font:16px sans-serif;border:1px solid #746449;background:linear-gradient(#303b3e,#172228);border-radius:3px;}
.fate-front button:hover{border-color:#dcc18a;color:#fff3d0;background:#344448;}.fate-front button:focus-visible{outline:2px solid #6cdfed;outline-offset:3px;}
.fate-front .gold{background:linear-gradient(#8c6c35,#46351c);border-color:#d6b777;color:#fff0c9;}
.fate-front header{height:72px;display:flex;align-items:center;justify-content:space-between;padding:0 4%;border-bottom:1px solid #88744c;background:#0c141abf;z-index:2;}
.fate-front .brand{font:24px Georgia;color:#dcbf85;letter-spacing:2px}.fate-front .subtle{color:#95a5a9;font-size:13px;letter-spacing:2px;}
.fate-front .menu-art{position:absolute;right:0;top:72px;bottom:0;width:64%;background-size:cover;background-position:center 20%;opacity:.8;filter:saturate(.8);}
.fate-front .menu-art::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,#10191e,transparent 65%),linear-gradient(0deg,#10191e,transparent 45%);}
.fate-front .menu-content{position:absolute;left:8%;top:20%;width:440px;max-width:45%;}
.fate-front h1{font:clamp(42px,5vw,76px) Georgia;margin:0;color:#e7c68c;text-shadow:0 4px 20px #000;letter-spacing:3px;}
.fate-front .subtitle{margin:18px 0 36px;color:#a8b7b8;line-height:1.8;}
.fate-front .number-row{display:flex;gap:10px;margin:14px 0 26px}.fate-front .number-row button{width:66px;height:44px}.fate-front .number-row button.active{border-color:#e4c68c;background:#4c452e;color:#ffe2a3;}
.fate-front .start{display:block;width:100%;height:62px;font-size:22px;letter-spacing:4px;margin-bottom:12px}.fate-front .test-start{width:100%;height:44px;}
.fate-front footer{position:absolute;bottom:24px;left:4%;right:4%;display:flex;justify-content:space-between;color:#8e9d9f;font-size:13px;border-top:1px solid #5d5540;padding-top:16px;}
.fate-front .selection{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:28px;padding:22px 4%;height:calc(100% - 72px);}
.fate-front .roster{display:flex;flex-direction:column;min-height:0}.fate-front h2{margin:0 0 15px;font:26px Georgia;color:#e2c58e;}
.fate-front .filters{display:flex;gap:10px;margin-bottom:16px}.fate-front .filters button{padding:9px 22px}.fate-front .filters .active{border-color:#e0c48d;color:#ffe0a0;}
.fate-front .hero-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:12px;overflow:auto;padding:4px 8px 12px 4px;align-content:start;grid-auto-rows:max-content;min-height:0;}
.fate-front .hero-choice{padding:0;overflow:hidden;min-width:0;background:#172027;}.fate-front .hero-choice img{display:block;width:100%;aspect-ratio: .83;object-fit:cover;}.fate-front .hero-choice span{display:block;font-size:14px;white-space:nowrap;padding:8px 2px;}.fate-front .hero-choice.selected{border-color:#56dce7!important;box-shadow:0 0 12px #24a4b565!important;outline:1px solid #56dce7!important;}
.fate-front .preview{border:1px solid #7d6b49;background:#101a20;display:flex;flex-direction:column;min-height:0;}.fate-front .preview-art{width:100%;height:30%;min-height:140px;object-fit:cover;object-position:center 20%;}.fate-front .hero-detail{padding:16px;overflow:auto;flex:1;}.fate-front .stats{color:#a8c39e;font-size:14px;margin-bottom:20px;}.fate-front .skill-detail{border-top:1px solid #435053;padding:12px 0;line-height:1.6;font-size:13px;color:#b7c2c3;}.fate-front .skill-detail strong{display:block;font-size:15px;color:#e2c994;margin-bottom:5px;}.fate-front .skill-icon{display:inline-block;width:24px;height:24px;background:#4c5559;border:1px solid #839091;margin-right:8px;vertical-align:middle;}.fate-front .confirm-hero{height:52px;margin:12px;flex:none;}
.fate-preparing #window{visibility:hidden!important;}
@media(max-width:1000px){.fate-front .selection{grid-template-columns:minmax(0,1fr) 250px;gap:15px;}.fate-front .menu-content{left:5%;}.fate-front .hero-grid{grid-template-columns:repeat(auto-fill,minmax(90px,1fr));}}
`;
    document.head.appendChild(style);
  }
  document.documentElement.classList.add('fate-preparing');
  if(ui.window) ui.window.inert=true;
  const overlay=document.createElement('main');overlay.className='fate-front';document.body.appendChild(overlay);return overlay;
}
function finish(overlay,ready=false){overlay.remove();if(ready){document.documentElement.classList.remove('fate-preparing');if(ui.window)ui.window.inert=false;}}
export async function showFateLauncher() {
  const overlay=front();
  overlay.innerHTML='<header><span class="brand">宿命 REBORN</span><span class="subtle">试玩版 · 本地对局</span></header><div class="menu-art"></div><section class="menu-content"><span class="subtle">FATE REBORN</span><h1>宿命 Reborn</h1><p class="subtitle">天辉 · 夜魇 · 中立<br>选择你的英雄，书写你的宿命。</p><div>对局人数</div><div class="number-row"></div><button class="gold start">开始对局</button><button class="test-start">测试对局</button></section><footer><span>行动与施法按逆时针进行</span><span>标准对局 · 全英雄可选 · AI 三选一</span></footer>';
  overlay.querySelector('.menu-art').style.backgroundImage=`url("${asset('fate_abaddon')}")`;
  let count=Number(lib.config.mode_config.fate_reborn?.player_number)||5;
  const numbers=overlay.querySelector('.number-row');
  for(const n of [5,6,7,8]){const button=document.createElement('button');button.textContent=n+' 人';button.setAttribute('aria-pressed',String(n===count));button.classList.toggle('active',n===count);numbers.appendChild(button);button.onclick=()=>{count=n;for(const item of numbers.children){item.classList.toggle('active',item===button);item.setAttribute('aria-pressed',String(item===button));}};}
  const testing=await new Promise(resolve=>{overlay.querySelector('.start').onclick=()=>resolve(false);overlay.querySelector('.test-start').onclick=()=>resolve(true);});
  game.saveConfig('player_number',String(count),'fate_reborn');finish(overlay,testing);return testing;
}
export async function chooseFateHero(pool,heroes) {
  const overlay=front();
  overlay.innerHTML='<header><span class="brand">宿命 REBORN</span><button class="back">返回主菜单</button></header><section class="selection"><div class="roster"><h2>选择你的英雄</h2><div class="filters"></div><div class="hero-grid"></div></div><aside class="preview"><img class="preview-art" alt=""><div class="hero-detail"></div><button class="gold confirm-hero">确认英雄 · 进入对局</button></aside></section>';
  overlay.querySelector('.back').onclick=()=>game.reload();
  let selected=pool[0],filter='all';const grid=overlay.querySelector('.hero-grid');
  const preview=()=>{
    const data=heroes[selected],name=get.translation(selected),image=overlay.querySelector('.preview-art');image.onerror=()=>{image.onerror=null;image.src=`${lib.assetURL}image/character/default_silhouette_${data[0]}.jpg`;};image.src=asset(selected);image.alt=name;
    const detail=overlay.querySelector('.hero-detail');detail.replaceChildren();
    const heading=document.createElement('h2');heading.textContent=name;detail.appendChild(heading);
    const stats=document.createElement('div');stats.className='stats';stats.textContent=`${{fate_strength:'力量',fate_intelligence:'智力',fate_agility:'敏捷'}[data[1]]} · 生命上限 ${data[2]} · 手牌上限 ${data[2]===3?5:4}`;detail.appendChild(stats);
    for(const skill of data[3].filter(name=>!['fate_rage_rule','fate_hand_limit_rule'].includes(name))){const row=document.createElement('div');row.className='skill-detail';const title=document.createElement('strong');const icon=document.createElement('i');icon.className='skill-icon';title.append(icon,document.createTextNode(get.translation(skill)));row.append(title,document.createTextNode(get.translation(skill+'_info')));detail.appendChild(row);}
    for(const button of grid.children){button.classList.toggle('selected',button.dataset.hero===selected);button.setAttribute('aria-pressed',String(button.dataset.hero===selected));}
  };
  const render=()=>{grid.replaceChildren();for(const hero of pool.filter(name=>filter==='all'||heroes[name][1]===filter)){const button=document.createElement('button');button.className='hero-choice';button.dataset.hero=hero;const image=document.createElement('img');image.onerror=()=>{image.onerror=null;image.src=`${lib.assetURL}image/character/default_silhouette_${heroes[hero][0]}.jpg`;};image.src=asset(hero);image.alt='';const name=document.createElement('span');name.textContent=get.translation(hero);button.append(image,name);button.onclick=()=>{selected=hero;preview();};grid.appendChild(button);}preview();};
  const filters=overlay.querySelector('.filters');for(const [key,label] of [['all','全部'],['fate_strength','力量'],['fate_intelligence','智力'],['fate_agility','敏捷']]){const button=document.createElement('button');button.textContent=label;button.classList.toggle('active',key==='all');button.onclick=()=>{filter=key;for(const item of filters.children)item.classList.toggle('active',item===button);render();};filters.appendChild(button);}
  render();await new Promise(resolve=>overlay.querySelector('.confirm-hero').onclick=resolve);finish(overlay,true);return selected;
}
export function installFateMenu() {
  if(ui.config2){const button=ui.config2.cloneNode(true);ui.config2.replaceWith(button);ui.config2=button;button.textContent='主菜单';button.onclick=()=>game.reload();}
  if(ui.roundmenu) ui.roundmenu.style.display='none';
  if(ui.menuContainer) ui.menuContainer.style.display='none';
}
