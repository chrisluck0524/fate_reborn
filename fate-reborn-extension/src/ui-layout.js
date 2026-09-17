import { game, lib, ui, get, _status } from "noname";
import { hudSeats, hudSelfSeat } from "./hud-geometry.js";
import { isFateResponse, isFatePhaseUse, isFateInteraction, canConfirmInteraction, canCancelInteraction, shouldShowNativeConfirmation } from "./response-ui.js";

export function fateMission() {
  const fate = game.fateReborn?.fate;
  return fate ? { name: fate.name, text: fate.text } : null;
}

function fateMissionProgress() {
  const fate = game.fateReborn?.fate;
  const players = allPlayers();
  const alive = players.filter(player => player.isAlive?.());
  const count = identity => alive.filter(player => player.identity === identity).length;
  switch (fate?.id) {
    case 'shadow_punisher': return `任务进度：夜魇存活 ${count('fate_scourge')} 名`;
    case 'holy_conqueror': return `任务进度：天辉存活 ${count('fate_sentinel')} 名`;
    case 'spreading_plague': {
      const neighbours = game.me?.storage?.fate_neighbors || [];
      const dead = neighbours.filter(id => !alive.some(player => player.playerid === id)).length;
      return `任务进度：相邻角色已死亡 ${dead}/2 名`;
    }
    case 'fate_gamble': return `任务进度：存活 ${alive.length} 名，存活阵营 ${new Set(alive.map(player => player.identity)).size} 种`;
    case 'backlash_puppet': {
      const successor = players.find(player => player.playerid === game.me?.storage?.fate_successor);
      return `固定下家：${successor ? get.translation(successor.name) : '未确定'}胜利时，由你代替其胜利。`;
    }
    case 'death_caller': return `任务进度：其他存活角色血量不高于2点 ${alive.filter(player => player !== game.me && player.hp <= 2).length}/${Math.max(0, alive.length - 1)} 名`;
    case 'paranoid_mathematician': return `任务进度：怒气为奇数的存活角色 ${alive.filter(player => player.countMark?.('fate_rage_rule') % 2 === 1).length}/${alive.length} 名`;
    case 'roshan': return game.me?.storage?.fate_roshan_revealed ? 'Roshan已公开：成为场上最后的存活角色。' : 'Roshan尚未公开。';
    default: return '任务进度将在每次结算后更新。';
  }
}

/** A Fate-native mission sheet, used both at setup and from the HUD. */
export function showFateMission({ blocking = false } = {}) {
  const mission = fateMission();
  if (!mission || !document.body) return Promise.resolve();
  document.querySelector('.fate-mission-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'fate-mission-overlay';
  overlay.innerHTML = `<section class="fate-mission-sheet" role="dialog" aria-modal="true" aria-label="中立宿命任务">
    <div class="fate-mission-kicker">中立 · 宿命任务</div>
    <h2></h2><p></p><div class="fate-mission-progress"></div><div class="fate-mission-rule">达成条件会在每次结算后检查。中立任务优先于阵营胜利。</div>
    <button type="button">${blocking ? '我已了解' : '关闭'}</button>
  </section>`;
  overlay.querySelector('h2').textContent = mission.name;
  overlay.querySelector('p').textContent = mission.text;
  overlay.querySelector('.fate-mission-progress').textContent = fateMissionProgress();
  document.body.appendChild(overlay);
  return new Promise(resolve => {
    const close = () => { document.removeEventListener('keydown', onKeydown); overlay.remove(); resolve(); };
    const onKeydown = event => { if (event.key === 'Escape') close(); };
    document.addEventListener('keydown', onKeydown);
    overlay.querySelector('button').addEventListener('click', close, { once: true });
  });
}

/**
 * Fate Reborn table HUD; native engine handlers still own game interactions.
 *
 * Existing card and portrait assets are retained. Skill and status artwork
 * can replace the reserved square placeholders later.
 */
export const FATE_LAYOUT_STYLE = `
  /* The native hp node and rage mark are replaced by the two bars below. */
  .fate-standalone #arena .player.fate-bars-installed > .hp {
    display: none !important;
  }

  .fate-standalone #arena .player.fate-bars-installed > .fate-player-resources {
    box-sizing: border-box;
    position: absolute;
    left: 3px;
    right: 3px;
    bottom: 3px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    z-index: 20;
    pointer-events: none;
  }

  .fate-standalone #arena .fate-player-resource {
    box-sizing: border-box;
    position: relative;
    display: flex;
    align-items: center;
    height: 20px;
    min-height: 20px;
    padding: 0 5px;
    border: 1px solid #202020;
    background: #29405f;
    color: #fff;
    font-size: 13px;
    line-height: 18px;
    text-shadow: 0 1px 1px #222;
    overflow: hidden;
  }

  .fate-standalone #arena .fate-player-resource::before {
    content: "";
    position: absolute;
    inset: 0 auto 0 0;
    width: var(--fate-resource-percent, 0%);
    background: #3f9d49;
    z-index: 0;
  }

  .fate-standalone #arena .fate-rage-resource::before {
    background: #4c82d7;
  }

  .fate-standalone #arena .fate-player-resource-label,
  .fate-standalone #arena .fate-player-resource-value {
    position: relative;
    z-index: 1;
    white-space: nowrap;
  }

  .fate-standalone #arena .fate-player-resource-value {
    margin-left: auto;
  }

  .fate-standalone #arena .fate-rage-native-mark {
    display: none !important;
  }

  /* The native count badge sits at the lower-right corner of a hero card.
   * Widen it just enough for the Fate format's current/limit hand count. */
  .fate-standalone #arena .player.fate-bars-installed > .count {
    width: 42px;
    min-width: 42px;
    padding: 2px 1px;
    text-align: center;
    font-size: 12px;
    line-height: 24px;
    white-space: nowrap;
    /* Resource rows are deliberately painted above the card image.  Keep
     * the native hand-count badge above those rows so the current/limit
     * value remains readable at the card's lower-right corner. */
    z-index: 21 !important;
  }

  /* A short chooseBool prompt is rendered as a nobutton dialog.  The
   * engine's long2 layout places it just under the top player cards, where
   * its text can overlap their lower-right hand-count badge in an eight-player
   * game.  Keep it in the empty middle of the table instead. */
  .fate-standalone #arena > .dialog.nobutton {
    top: 52% !important;
    bottom: auto !important;
  }
`;

function isRageMark(mark) {
  return mark?.name === "fate_rage_rule" ||
    mark?.skill === "fate_rage_rule" ||
    mark?.dataset?.skill === "fate_rage_rule" ||
    mark?.dataset?.name === "fate_rage_rule";
}

function hideNativeRageMark(player) {
  const marks = player?.node?.marks;
  if (!marks) return;
  for (const mark of Array.from(marks.children)) {
    mark.classList.toggle("fate-rage-native-mark", isRageMark(mark));
    mark.classList.toggle("fate-nonstatus-mark", !mark.name || mark === marks.firstElementChild);
  }
}

function ensureResourceRows(player) {
  let resources = player.querySelector?.(":scope > .fate-player-resources");
  if (resources) return resources;

  resources = document.createElement("div");
  resources.className = "fate-player-resources";
  resources.innerHTML = `
    <div class="fate-player-resource fate-health-resource">
      <span class="fate-player-resource-label">生命</span>
      <span class="fate-player-resource-value"></span>
    </div>
    <div class="fate-player-resource fate-rage-resource">
      <span class="fate-player-resource-label">怒气</span>
      <span class="fate-player-resource-value"></span>
    </div>
  `;
  player.appendChild(resources);
  return resources;
}

function updateHandCount(player) {
  const countNode = player?.node?.count;
  if (!countNode) return;

  const handCount = Math.max(0, Number(player.countCards?.("h")) || 0);
  let handLimit = 4;
  try {
    const calculatedLimit = Number(player.getHandcardLimit?.());
    if (Number.isFinite(calculatedLimit)) handLimit = Math.max(0, calculatedLimit);
    else if (calculatedLimit === Infinity) handLimit = "∞";
  } catch {
    // The native hand-limit method is not available while a player is being
    // created; the next timer tick will replace this fallback.
  }

  const text = `${handCount}/${handLimit}`;
  if (countNode.textContent !== text) countNode.textContent = text;
}

function updatePlayerResources(player) {
  if (!player || !player.isConnected) return;
  hideNativeRageMark(player);
  player.classList.add("fate-bars-installed");
  updateHandCount(player);

  const resources = ensureResourceRows(player);
  const hp = Math.max(0, Number(player.hp) || 0);
  const maxHp = Math.max(1, Number(player.maxHp) || 1);
  const rage = Math.max(0, Number(player.countMark?.("fate_rage_rule")) || 0);
  const rows = [
    [".fate-health-resource", hp, maxHp],
    [".fate-rage-resource", rage, 3],
  ];

  for (const [selector, value, max] of rows) {
    const row = resources.querySelector(selector);
    if (!row) continue;
    const valueNode = row.querySelector(".fate-player-resource-value");
    if (valueNode) valueNode.textContent = `${value}/${max}`;
    row.style.setProperty("--fate-resource-percent", `${Math.min(100, (value / max) * 100)}%`);
  }
}

function allPlayers() {
  return [...new Set([...(game.players || []), ...(game.dead || [])])];
}

function phaseUseRoot(event) {
  const visited = new Set();
  let current = event;
  while (current && !visited.has(current)) {
    if (current.name === 'chooseToUse' && current.type === 'phase' && !current.respondTo) return current;
    visited.add(current);
    current = current.getParent?.(1, true) || current.parent;
  }
}

/**
 * Install the HUD and keep resource values in sync.
 * Kept under the old export name because the game mode already calls it.
 */
export function installFateLayout() {
  if (!lib.config.fate_standalone || !ui.arena) return;

  for (const player of allPlayers()) updatePlayerResources(player);
  updateHud();

  if (ui.fateResourceTimer) clearInterval(ui.fateResourceTimer);
  ui.fateResourceTimer = setInterval(() => {
    if (!ui.arena?.isConnected) {
      clearInterval(ui.fateResourceTimer);
      ui.fateResourceTimer = null;
      return;
    }
    for (const player of allPlayers()) updatePlayerResources(player);
    updateHud();
  }, 250);
}

const HUD_STYLE = `
.fate-hud .fate-inactive-confirm {display:none!important;}
.fate-hud .fate-action-order {position:absolute;left:5px;top:32px;padding:3px 5px;background:#121b23d9;border:1px solid #8f7952;color:#ddcfad;font:12px sans-serif;z-index:22;border-radius:3px;}
.fate-hud .fate-action-order.current {border-color:#eac570;color:#fff2c4;}
.fate-hud #arena {inset:48px 0 0!important;width:100%!important;height:calc(100% - 48px)!important;}
.fate-hud .touchinfo {display:none!important;}
.fate-hud #arena > .player:not(.dead) {opacity:1!important;}
.fate-hud #window {background:#171d20!important;}
.fate-hud #arena::before {content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 45% 40%,#343a3a,#141a1e);pointer-events:none;z-index:0;}
.fate-hud #system {top:7px!important;left:10px!important;width:calc(100% - 20px)!important;}
.fate-hud #system .system {background:#20272b;border:1px solid #75654b;border-radius:4px;font-size:14px;}
.fate-hud #arena > .player {width:138px!important;height:176px!important;transform:none!important;transition:left .2s,top .2s;}
.fate-hud #arena > .player > .avatar {inset:0!important;width:100%!important;height:100%!important;border-radius:5px!important;background-size:cover!important;}
.fate-hud #arena > .player > .name {top:5px!important;left:6px!important;writing-mode:horizontal-tb!important;font:14px sans-serif!important;white-space:nowrap;background:#101519b8;padding:3px;max-width:95px;}
.fate-hud #arena > .player > .identity {left:auto!important;right:4px!important;top:5px!important;font:14px sans-serif!important;}
.fate-hud #arena > .player > .identity > div {writing-mode:horizontal-tb!important;}
.fate-hud #arena .player > .count {left:auto!important;right:-43px!important;top:auto!important;bottom:0!important;transform:none!important;background:#151c21!important;border:1px solid #8d7954!important;border-radius:4px!important;width:38px!important;min-width:38px!important;line-height:22px!important;z-index:21!important;}
.fate-hud #arena .player > .marks {left:auto!important;right:-42px!important;top:auto!important;bottom:32px!important;width:34px!important;height:auto!important;padding:0!important;display:flex;flex-direction:column;gap:4px;}
.fate-hud #arena .player .marks > .mark:not(.fate-rage-native-mark) {position:relative!important;left:auto!important;top:auto!important;transform:none!important;opacity:1!important;width:30px!important;height:30px!important;background:#4e5355!important;border:1px solid #898d8e!important;border-radius:3px!important;}
.fate-hud #arena .player .marks > .mark:not(.fate-rage-native-mark)::before {content:'';position:absolute;inset:5px;border:1px solid #737879;pointer-events:none;}
.fate-hud #arena .player .marks > div:not(.mark) {display:none!important;}
.fate-hud #arena .player .marks .marktext {font:11px sans-serif!important;writing-mode:horizontal-tb!important;}
.fate-hud #arena > #me,.fate-hud #arena > #mebg,.fate-hud #arena > #autonode {left:174px!important;width:calc(100% - 650px)!important;bottom:10px!important;top:auto!important;height:176px!important;border-radius:4px!important;}
.fate-hud #me {z-index:4!important;background:#10171dcc!important;border:1px solid #79674a;}
.fate-hud #mebg,.fate-hud #autonode {display:none!important;}
.fate-hud #me .fakeme {display:none!important;}
.fate-hud #me #handcards1 {left:8px!important;top:6px!important;width:calc(100% - 16px)!important;height:150px!important;padding:0!important;}
.fate-hud #me #handcards2 {display:none!important;}
.fate-hud #me .handcards {left:0!important;top:0!important;}
.fate-hud #arena > #control {left:190px!important;width:calc(100% - 680px)!important;top:auto!important;bottom:198px!important;height:34px!important;z-index:30!important;}
.fate-hud #control {display:flex!important;justify-content:center;gap:8px;}
.fate-hud #control > .control {position:relative!important;left:auto!important;transform:none!important;flex:none;}
.fate-hud .fate-nonstatus-mark {display:none!important;}
.fate-hud #control .control {background:linear-gradient(#3c4141,#20282c);border:1px solid #9d865c;border-radius:4px;color:#eee;font:16px sans-serif;}
.fate-hud #arena > .dialog.nobutton {left:190px!important;width:calc(100% - 680px)!important;top:auto!important;bottom:240px!important;min-height:30px!important;background:#141c22df!important;border:1px solid #685b45;border-radius:5px;padding:6px;}
.fate-hud #arena > .dialog.nobutton .caption {font:16px sans-serif!important;}
.fate-hud #arena > .dialog:not(.nobutton) {z-index:25;}
.fate-hud .fate-response-bar {position:absolute;left:174px;width:calc(100% - 650px);bottom:196px;height:76px;box-sizing:border-box;padding:8px 14px;display:flex;align-items:center;gap:12px;background:linear-gradient(#20282a,#10171b);border:1px solid #998257;border-radius:5px;z-index:35;color:#eee;font:16px sans-serif;}
.fate-hud .fate-response-bar[hidden] {display:none!important;}
.fate-hud .fate-response-text {position:relative;flex:1;min-width:0;line-height:1.5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.fate-hud .fate-response-controls {position:relative;display:flex;align-items:center;gap:10px;flex:none;}
.fate-hud .fate-response-bar button {position:relative;flex:none;min-width:94px;padding:10px 12px;font:16px sans-serif;color:#eee;background:linear-gradient(#45494b,#20282c);border:1px solid #818582;border-radius:4px;cursor:pointer;}
.fate-hud .fate-response-bar .fate-response-confirm {background:linear-gradient(#77602f,#433419);border-color:#d6b267;color:#fff0c2;}
.fate-hud .fate-response-bar button:disabled {opacity:.4;cursor:default;}
.fate-hud .fate-end-turn {background:linear-gradient(#70352c,#3e1d19)!important;border-color:#bd745e!important;color:#ffe0d7!important;}
.fate-hud #arena.fate-interaction-active > .dialog.nobutton,.fate-hud #arena.fate-interaction-active > #control {display:none!important;}
.fate-hud #me .handcards > .card.selected {outline:2px solid #4ce8f2!important;box-shadow:0 0 12px #2fd7ef!important;}
.fate-hud .fate-response-source {color:#f17b67;}
.fate-hud .fate-response-needed {color:#60d7ec;}
.fate-hud #arena > #arenalog {display:none!important;}
.fate-hud .fate-hud-panel {position:absolute;box-sizing:border-box;background:linear-gradient(145deg,#263034,#11191e);border:1px solid #75664c;border-radius:5px;color:#e4ded1;font:14px sans-serif;z-index:3;}
.fate-hud .fate-equipment {left:10px;bottom:10px;width:150px;height:176px;display:flex;padding:10px;gap:8px;}
.fate-hud .fate-equipment-slot {position:relative;flex:1;display:flex;flex-direction:column;align-items:center;gap:10px;padding:8px 3px;border:1px solid #555a58;border-radius:3px;overflow:hidden;}
.fate-hud .fate-equipment-slot small {writing-mode:vertical-rl;font-size:13px;}
.fate-hud .fate-skill-panel {right:200px;bottom:10px;width:266px;height:176px;padding:8px;overflow:auto;z-index:25;}
.fate-hud .fate-skill-button {width:100%;min-height:48px;display:flex;align-items:center;gap:10px;padding:5px 8px;margin:4px 0;background:#222c32;color:#9aa0a2;border:1px solid #4e585b;border-radius:4px;font:15px sans-serif;text-align:left;cursor:default;}
.fate-hud .fate-skill-button:not(:disabled) {color:#f2e2b5;border-color:#c6a565;box-shadow:inset 0 0 8px #ad842637;cursor:pointer;}
.fate-hud .fate-icon-placeholder {width:34px;height:34px;flex:none;background:#565b5e;border:1px solid #85898b;border-radius:3px;display:inline-block;}
.fate-hud .fate-log-panel {right:10px;top:12px;bottom:202px;width:216px;padding:10px;z-index:3;}
.fate-hud .fate-log-content {position:absolute;inset:40px 8px 8px;overflow:auto;font-size:13px;line-height:1.6;}
.fate-hud .fate-log-content > div {position:relative!important;margin:0 0 9px!important;}
.fate-hud .fate-summary {position:absolute;left:430px;right:430px;top:-39px;text-align:center;color:#dfd6be;font:14px sans-serif;z-index:5;pointer-events:none;}
.fate-hud .fate-self-status {position:absolute;left:174px;bottom:190px;display:flex;gap:6px;z-index:5;color:#ddd;font:13px sans-serif;}
.fate-hud .fate-self-status > span {display:flex;align-items:center;gap:4px;background:#172027;border:1px solid #655b49;padding:3px 6px;border-radius:3px;}
.fate-hud .fate-self-status .fate-icon-placeholder {width:24px;height:24px;}
.fate-hud #arena .fate-native-skills {display:none!important;}
.fate-hud #arena .fate-self > .equips,.fate-hud #arena .fate-self > .marks {display:none!important;}
.fate-hud .fate-mission-toggle {position:absolute;right:242px;top:12px;z-index:8;padding:7px 12px;color:#ead7a8;background:linear-gradient(#394047,#1c2429);border:1px solid #9b8353;border-radius:4px;font:14px sans-serif;cursor:pointer;}
.fate-hud .fate-mission-toggle:hover {border-color:#e1c27c;color:#fff1c9;}
.fate-mission-overlay {position:fixed;inset:0;z-index:10020;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse at center,#172229cc,#060a0ddd);font:16px sans-serif;color:#e8dfcb;}
.fate-mission-sheet {width:min(520px,calc(100vw - 48px));box-sizing:border-box;padding:34px 38px 30px;background:linear-gradient(145deg,#273338,#10181d);border:1px solid #a98a50;box-shadow:0 18px 50px #000b,inset 0 0 38px #9270311a;text-align:center;}
.fate-mission-kicker {color:#9db8af;letter-spacing:4px;font-size:13px;}
.fate-mission-sheet h2 {margin:17px 0 12px;color:#e8c77e;font:30px Georgia,serif;}
.fate-mission-sheet p {margin:0;color:#f2eee4;font-size:20px;line-height:1.7;}
.fate-mission-progress {margin:20px 0 0;padding:10px 13px;background:#0b1116a6;border:1px solid #4f674f;color:#b8e3ad;font-size:14px;line-height:1.5;}
.fate-mission-rule {margin:18px 0 20px;padding-top:15px;border-top:1px solid #665942;color:#aeb9b6;font-size:13px;line-height:1.6;}
.fate-mission-sheet button {min-width:130px;padding:10px 20px;color:#fff0c9;background:linear-gradient(#806637,#43341d);border:1px solid #d9b768;border-radius:3px;font:16px sans-serif;cursor:pointer;}
`;

function element(tag, className, parent, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  parent.appendChild(node);
  return node;
}

function ensureHud() {
  if (ui.fateHud?.arena === ui.arena) return ui.fateHud;
  document.title='宿命 Reborn';
  ui.fateHud?.observer?.disconnect();
  document.documentElement.classList.add('fate-hud');
  if (!document.getElementById('fate-hud-style')) {
    const style = element('style', '', document.head);
    style.id = 'fate-hud-style'; style.textContent = HUD_STYLE;
  }
  const equipment = element('div', 'fate-hud-panel fate-equipment', ui.arena);
  const slots = ['武器', '防具'].map(name => {
    const slot = element('div', 'fate-equipment-slot', equipment);
    element('strong', '', slot, name);
    return element('small', '', slot, '未装备');
  });
  const skills = element('div', 'fate-hud-panel fate-skill-panel', ui.arena);
  const logPanel = element('div', 'fate-hud-panel fate-log-panel', ui.arena);
  element('strong', '', logPanel, '对局记录');
  const log = element('div', 'fate-log-content', logPanel);
  const summary = element('div', 'fate-summary', ui.arena);
  const missionButton = element('button', 'fate-mission-toggle', ui.arena, '宿命任务');
  missionButton.addEventListener('click', () => { showFateMission(); });
  const status = element('div', 'fate-self-status', ui.arena);
  const response = element('div','fate-response-bar',ui.arena); response.hidden=true;
  const responseText=element('span','fate-response-text',response);
  const responseControls=element('span','fate-response-controls',response);
  const responseConfirm=element('button','fate-response-confirm',response,'确定');
  const responseCancel=element('button','',response,'放弃响应');
  const endTurn=element('button','fate-end-turn',response,'结束回合');
  responseConfirm.addEventListener('click',()=>{if(hud.responseEvent===_status.event&&canConfirmInteraction(_status.event,ui.confirm)){_status.event.fateManualResponseConfirmed=true;ui.click.ok();}});
  responseCancel.addEventListener('click',()=>{
    const current=_status.event;
    if(hud.responseEvent!==current)return;
    // At the root of the action phase, cancellation means "do not use this
    // card": remove the current card/target choice and leave the phase open.
    const directPhase=current?.name==='chooseToUse'&&current.type==='phase'&&!current.respondTo;
    if(directPhase) {
      if(!ui.selected.cards.length&&!ui.selected.targets.length&&!ui.selected.buttons.length) return;
      game.uncheck();
      game.check();
      return;
    }
    if(!canCancelInteraction(current,ui.confirm))return;
    ui.click.cancel();
  });
  endTurn.addEventListener('click',()=>{
    const current=_status.event;
    if(hud.responseEvent!==current||!isFatePhaseUse(current))return;
    const root=phaseUseRoot(current);
    // A child picker (for example, a skill target) must first be dismissed.
    // updateHud then finishes the resumed root phase on the next UI tick.
    if(root&&root!==current) {
      hud.endPhaseRoot=root;
      ui.click.cancel();
      return;
    }
    ui.click.cancel();
  });
  const hud = ui.fateHud = {arena:ui.arena, slots, skills, log, summary, missionButton, status, response, responseText, responseControls, responseConfirm, responseCancel, endTurn, follow:true, entries:new WeakSet(), skillNodes:new Map(), width:0};
  log.addEventListener('scroll', () => {hud.follow = log.scrollHeight-log.scrollTop-log.clientHeight < 24;});
  if (ui.sidebar) {
    const observer = new MutationObserver(records => {
      const follow = hud.follow;
      for (const record of records) for (const entry of record.addedNodes) {
        if (entry.nodeType !== 1 || hud.entries.has(entry)) continue;
        hud.entries.add(entry);
        if (/获得了.*怒气|移去了.*怒气|进入.*阶段|的回合开始/.test(entry.textContent)) continue;
        if(log.lastElementChild?.textContent===entry.textContent) continue;
        log.appendChild(entry.cloneNode(true));
      }
      while (log.children.length > 400) log.firstChild.remove();
      if (follow) {log.scrollTop=log.scrollHeight;hud.follow=true;}
    });
    observer.observe(ui.sidebar,{childList:true}); hud.observer=observer;
  }
  return hud;
}

function updateHud() {
  if (!game.me?.name) return;
  const hud = ensureHud();
  hud.missionButton.hidden = game.me.identity !== 'fate_neutral' || !fateMission();
  if(hud.endPhaseRoot&&_status.event===hud.endPhaseRoot) {
    hud.endPhaseRoot=null;
    ui.click.cancel();
    return;
  }
  const interacting=isFateInteraction(_status.event,ui.confirm);
  const responding=isFateResponse(_status.event);
  ui.confirm?.classList.toggle('fate-inactive-confirm',!shouldShowNativeConfirmation(_status.event,ui.confirm));
  hud.response.hidden=!interacting;ui.arena.classList.toggle('fate-interaction-active',interacting);
  hud.responseEvent=interacting?_status.event:null;
  if(interacting) {
    const current=_status.event;
    const controlChoice=current.name==='chooseControl';
    const directPhase=current?.name==='chooseToUse'&&current.type==='phase'&&!current.respondTo;
    const phaseUse=isFatePhaseUse(current);
    hud.responseControls.replaceChildren();
    if(controlChoice) {
      for(const control of current.controls||[]) {
        const choice=element('button','',hud.responseControls,control==='cancel2'?'取消':get.translation(control));
        choice.addEventListener('click',()=>{
          if(hud.responseEvent!==_status.event)return;
          const native=[...(ui.controls||[])].flatMap(bar=>[...bar.children]).find(node=>node.link===control);
          if(native) ui.click.control.call(native);
        });
      }
    }
    hud.responseControls.hidden=!controlChoice;
    hud.responseConfirm.hidden=controlChoice;
    hud.responseCancel.hidden=controlChoice;
    hud.responseConfirm.disabled=!canConfirmInteraction(current,ui.confirm);
    const hasPhaseSelection=!!(ui.selected.cards.length||ui.selected.targets.length||ui.selected.buttons.length);
    const cancellable=canCancelInteraction(current,ui.confirm);
    if(!controlChoice) {
      hud.responseCancel.hidden=false;
      hud.responseCancel.disabled=directPhase?!hasPhaseSelection:!cancellable;
    }
    hud.responseCancel.textContent=responding?'放弃响应':'取消';
    hud.endTurn.hidden=!phaseUse||controlChoice;
    hud.endTurn.disabled=!phaseUse;
    if(current.type==='respondShan'&&current.respondTo) {
      const [source,card]=current.respondTo;
      const attack=game.hasNature(card,'fate_fire')?'火焰攻击':game.hasNature(card,'fate_chaos')?'混乱攻击':'普通攻击';
      hud.responseText.replaceChildren();
      element('span','fate-response-source',hud.responseText,get.translation(source.name));
      element('span','',hud.responseText,`对你使用${attack}，请使用`);
      element('span','fate-response-needed',hud.responseText,`${current.shanRequired>1?current.shanRequired+'张':'一张'}闪避`);
      element('span','',hud.responseText,'。');
    } else {
      const caption=ui.dialog?.querySelector('.caption')?.textContent;
      const fallback=directPhase?'请选择要使用的牌。':responding?'请选择响应牌，或放弃响应。':'请选择牌或目标，然后确认。';
      hud.responseText.textContent=caption||(typeof current.prompt==='string'?current.prompt:fallback);
    }
  }
  const arena = ui.arena, width=arena.clientWidth, height=arena.clientHeight;
  for(const [key,value] of Object.entries({left:'174px',width:`${width-650}px`,bottom:'10px',top:'auto',height:'176px'})) ui.me?.style.setProperty(key,value,'important');
  if(ui.cardPileNumber) ui.cardPileNumber.style.setProperty('display','none','important');
  if(ui.handcards1Container) for(const [key,value] of Object.entries({left:'8px',top:'12px',width:`${width-666}px`,height:'150px'})) ui.handcards1Container.style.setProperty(key,value,'important');
  const opponents = allPlayers().filter(player=>player!==game.me).sort((a,b)=>Number(b.dataset.position)-Number(a.dataset.position));
  for (const player of allPlayers()) {
    let badge=player.querySelector('.fate-action-order');
    if(!badge) badge=element('span','fate-action-order',player);
    const index=game.fateReborn?.actionOrder?.indexOf(player.playerid) ?? -1;
    badge.textContent=index<0?'':'行动 '+(index+1);
    badge.classList.toggle('current',_status.currentPhase===player);
  }
  const positions=hudSeats(width,height,opponents.length);
  const place=(player,x,y)=>{
    player.style.setProperty('width','138px','important');
    player.style.setProperty('height','176px','important');
    if(player.node?.avatar) {player.node.avatar.style.setProperty('width','100%','important');player.node.avatar.style.setProperty('height','100%','important');}
    player.style.setProperty('left',`${Math.round(x)}px`,'important');
    player.style.setProperty('top',`${Math.round(y)}px`,'important');
    player.style.setProperty('bottom','auto','important');
  };
  opponents.forEach((player,i)=>place(player,...positions[i]));
  game.me.classList.add('fate-self'); place(game.me,...hudSelfSeat(width,height));
  for (const player of allPlayers()) if(player.node?.name) player.node.name.textContent=get.translation(player.name);
  if(hud.width!==width) {hud.width=width;ui.updatehl?.();}
  // Use actual identity keys from the mode, rather than exposing hidden identities.
  const names={fate_scourge:'夜魇',fate_guard:'天辉',fate_neutral:'中立',fate_sentinel:'天辉'};
  const counts=new Map();
  for(const player of allPlayers()) {const name=names[player.identity]||get.translation(player.identity);if(!counts.has(name)) counts.set(name,[0,0]);const count=counts.get(name);count[1]++;if(game.players.includes(player))count[0]++;}
  hud.summary.textContent=`第${game.roundNumber||0}轮 · 摸牌堆 ${ui.cardPile?.childElementCount||0}　${[...counts].map(([name,c])=>`${name} ${c[0]}/${c[1]}`).join('　')}`;
  const equipped=game.me.getCards('e');
  hud.slots.forEach((slot,i)=>{const card=equipped.find(card=>get.subtype(card)===(i?'equip2':'equip1'));slot.textContent=card?get.translation(card.name):'未装备';slot.title=card?get.translation(`${card.name}_info`):'';slot.onclick=card?(event)=>ui.click.card.call(card,event):null;slot.parentElement.style.backgroundImage=card?.style.backgroundImage||'';slot.parentElement.style.backgroundSize='cover';});
  const native=[ui.skills,ui.skills2,ui.skills3].filter(Boolean);
  const available=new Set();
  for(const control of native) {if(control.isConnected && control.style.display!=='none' && _status.event?.isMine?.()) for(const skill of control.skills||[]) available.add(skill);control.classList.add('fate-native-skills');}
  const hero=lib.character[game.me.name];
  const skills=(hero?.skills||hero?.[3]||game.me.getSkills()).filter(skill=>skill.startsWith('fate_')&&!['fate_rage_rule','fate_hand_limit_rule'].includes(skill));
  for(const [skill,node] of hud.skillNodes) if(!skills.includes(skill)){node.remove();hud.skillNodes.delete(skill);}
  for(const skill of skills) {
    let button=hud.skillNodes.get(skill);
    if(!button) {button=element('button','fate-skill-button',hud.skills);element('span','fate-icon-placeholder',button);element('span','',button,get.translation(skill));button.title=get.translation(`${skill}_info`);button.addEventListener('click',()=>{if(!button.disabled)ui.click.skill(skill);});hud.skillNodes.set(skill,button);}
    button.disabled=!available.has(skill);
  }
  const marks=Array.from(game.me.node.marks.children).slice(1).filter(mark=>mark.name&&mark.classList.contains("mark")&&!isRageMark(mark));
  const signature=marks.map(mark=>mark.name||mark.skill||mark.textContent).join('|');
  if(hud.statusSignature!==signature){hud.statusSignature=signature;hud.status.replaceChildren();for(const mark of marks){const chip=element('span','',hud.status);element('i','fate-icon-placeholder',chip);element('span','',chip,get.translation(mark.name||mark.skill||mark.textContent));chip.title=mark.title||chip.textContent;}}
}
