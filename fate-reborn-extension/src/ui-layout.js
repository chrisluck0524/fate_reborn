import { game, get, lib, ui } from "noname";

/**
 * Gray-box table layout for the standalone Fate client.
 *
 * The layout deliberately uses percentages and named seat slots so the same
 * structure survives window resizing and 5-8 player games. Artwork can be
 * added later without changing the engine-facing DOM.
 */
export const FATE_LAYOUT_STYLE = `
  .fate-standalone #arena.fate-table-layout {
    width: 100%;
    height: 100%;
    left: 0;
    top: 0;
    background: #7f7f7f;
    overflow: hidden;
  }

  .fate-standalone #arena.fate-table-layout > .fate-table-ui {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
  }

  .fate-standalone .fate-playfield,
  .fate-standalone .fate-self-status,
  .fate-standalone .fate-equipment,
  .fate-standalone .fate-skill-panel,
  .fate-standalone .fate-round-info,
  .fate-standalone .fate-alive-info {
    box-sizing: border-box;
    border: 2px solid #171717;
    background: #969696;
    color: #f5f5f5;
    font-weight: 700;
    text-shadow: 0 1px 1px #333;
  }

  .fate-standalone .fate-playfield {
    left: 18.4%;
    top: 30.8%;
    width: 47.8%;
    height: 42.2%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: clamp(18px, 1.7vw, 30px);
  }

  .fate-standalone .fate-playfield::before {
    content: "出牌区";
  }

  .fate-standalone .fate-self-status {
    left: 1.3%;
    top: 70.3%;
    width: 12.1%;
    height: 8.5%;
    padding: 4px 5px;
    overflow: hidden;
    font-size: clamp(11px, 1vw, 16px);
  }

  .fate-standalone .fate-self-status-title {
    display: block;
    height: 16px;
    line-height: 16px;
    margin-bottom: 2px;
    font-size: .95em;
  }

  .fate-standalone .fate-self-status-row {
    display: inline-block;
    width: 49%;
    line-height: 1.25;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    vertical-align: top;
    font-size: .78em;
  }

  .fate-standalone .fate-self-status > .marks {
    position: absolute !important;
    top: 4px !important;
    right: 3px !important;
    width: 27px !important;
    min-height: 27px;
    max-height: calc(100% - 8px);
    padding: 1px !important;
    border: 1px solid #282828;
    background: rgba(95, 95, 95, .9);
    overflow-y: auto;
    z-index: 2;
  }

  .fate-standalone .fate-self-status > .marks > div {
    position: relative !important;
    left: 0 !important;
    top: 0 !important;
    width: 23px !important;
    height: 23px !important;
    margin: 1px !important;
    transform: none !important;
    opacity: 1 !important;
  }

  .fate-standalone .fate-self-status > .marks > div:first-child {
    display: none !important;
  }

  .fate-standalone .fate-self-status > .marks > div > .markcount {
    left: 14px !important;
    top: 12px !important;
    width: 9px !important;
    height: 9px !important;
    line-height: 9px !important;
    font-size: 7px !important;
  }

  .fate-standalone .fate-self-status-empty {
    display: block;
    color: #d4d4d4;
    font-size: .8em;
    line-height: 1.25;
  }

  .fate-standalone .fate-equipment {
    left: 0;
    bottom: 1.5%;
    width: 12.7%;
    height: 18.3%;
    padding: 7px;
    overflow: hidden;
  }

  .fate-standalone .fate-equipment-title,
  .fate-standalone .fate-skill-panel-title {
    display: block;
    height: 21px;
    line-height: 21px;
    font-size: clamp(12px, 1.05vw, 17px);
  }

  .fate-standalone .fate-equipment > .equips {
    position: absolute !important;
    left: 7px !important;
    right: 7px !important;
    top: 32px !important;
    bottom: 7px !important;
    width: auto !important;
    height: auto !important;
    overflow-y: auto;
    text-align: left;
  }

  .fate-standalone .fate-equipment > .equips > .card {
    display: block;
    width: 100% !important;
    height: 24px !important;
    margin: 0 !important;
    border: 1px solid #252525;
    background: #858585 !important;
    color: #f4f4f4 !important;
    line-height: 22px !important;
  }

  .fate-standalone .fate-equipment > .equips > .card > .name2 {
    display: block !important;
    margin-left: 5px !important;
    font-size: clamp(10px, .85vw, 14px);
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .fate-standalone .fate-skill-panel {
    right: 13.1%;
    bottom: 1.5%;
    width: 11.1%;
    height: 18.3%;
    padding: 7px;
    overflow: hidden;
    pointer-events: auto;
  }

  .fate-standalone .fate-persistent-skills {
    position: absolute;
    left: 6px;
    right: 6px;
    top: 34px;
    bottom: 6px;
    overflow-y: auto;
    overflow-x: hidden;
    pointer-events: auto;
  }

  .fate-standalone .fate-persistent-skill {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    width: 100%;
    min-height: 28px;
    margin: 2px 0;
    padding: 2px 3px 2px 29px;
    border: 1px solid #272727;
    background: #858585;
    color: #d0d0d0;
    text-align: left;
    line-height: 1.15;
    font-size: clamp(10px, .86vw, 14px);
    overflow-wrap: anywhere;
    cursor: default;
    position: relative;
  }

  .fate-standalone .fate-persistent-skill::before {
    content: "";
    position: absolute;
    left: 4px;
    width: 20px;
    height: 20px;
    border: 1px solid #4a4a4a;
    background: #b7b7b7;
  }

  .fate-standalone .fate-persistent-skill.fate-skill-ready {
    color: #fff;
    border-color: #e0e0e0;
    background: #6f6f6f;
    cursor: pointer;
  }

  .fate-standalone .fate-persistent-skill.fate-skill-ready::before {
    background: #d6d6d6;
  }

  /* The engine control remains mounted for its click and cleanup semantics;
     the permanent rows above are the user-facing controls. */
  .fate-standalone #arena.fate-table-layout > .fate-table-ui > .fate-skill-panel > .control.fate-skill-control {
    display: none !important;
  }

  .fate-standalone .fate-skill-panel-title::before {
    content: "玩家技能按钮";
  }

  .fate-standalone .fate-round-info {
    right: 17.2%;
    top: 0;
    width: 12.4%;
    min-height: 6.2%;
    padding: 4px 6px;
    font-size: clamp(11px, 1vw, 16px);
  }

  .fate-standalone .fate-alive-info {
    right: 0;
    top: 0;
    width: 16.3%;
    min-height: 6.2%;
    padding: 4px 6px;
    font-size: clamp(11px, 1vw, 16px);
  }

  .fate-standalone #arena.fate-table-layout > #arenalog {
    box-sizing: border-box;
    right: 0;
    left: auto;
    top: 9.5%;
    width: 16.3%;
    height: 66.5%;
    padding: 7px;
    border: 2px solid #171717;
    background: #969696;
    color: #f5f5f5;
    overflow-x: hidden;
    overflow-y: auto;
    scrollbar-width: thin;
  }

  .fate-standalone #arena.fate-table-layout > #arenalog > div {
    box-sizing: border-box;
    width: 100%;
    left: 0;
    padding: 2px 3px;
    line-height: 1.35;
    color: #f5f5f5;
    overflow-wrap: anywhere;
  }

  .fate-standalone #arena.fate-table-layout > #me {
    left: 13.4%;
    top: auto;
    bottom: 0;
    width: 60%;
    height: 19.7%;
    z-index: 3;
    pointer-events: none;
  }

  .fate-standalone #arena.fate-table-layout > #handcards1,
  .fate-standalone #arena.fate-table-layout > #me > #handcards1 {
    box-sizing: border-box;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    padding: 4px 8px;
    overflow-x: auto;
    overflow-y: hidden;
    pointer-events: auto;
  }

  .fate-standalone #arena.fate-table-layout > #handcards1 > div,
  .fate-standalone #arena.fate-table-layout > #me > #handcards1 > div {
    height: 100%;
  }

  .fate-standalone #arena.fate-table-layout > .player {
    box-sizing: border-box;
    width: 12.2% !important;
    height: 24.5% !important;
    margin: 0 !important;
    border: 2px solid #171717;
    background: #969696;
    z-index: 2;
    overflow: visible;
  }

  .fate-standalone #arena.fate-table-layout > .player[data-position="0"] {
    left: 86.6% !important;
    top: 79.8% !important;
    width: 12.1% !important;
    height: 18.3% !important;
  }

  .fate-standalone #arena.fate-table-layout > .player > .avatar,
  .fate-standalone #arena.fate-table-layout > .player > .avatar2 {
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    height: 100% !important;
    border-radius: 0;
    background-color: #8b8b8b;
    background-size: cover;
  }

  .fate-standalone #arena.fate-table-layout > .player > .name,
  .fate-standalone #arena.fate-table-layout > .player > .name2 {
    box-sizing: border-box;
    left: 3px !important;
    right: 3px !important;
    top: 3px !important;
    width: auto !important;
    height: 21px;
    line-height: 21px;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: clamp(11px, 1vw, 16px);
    text-shadow: 0 1px 2px #000;
  }

  .fate-standalone #arena.fate-table-layout > .player > .identity {
    left: auto !important;
    right: 3px !important;
    top: 26px !important;
    width: auto !important;
    height: 18px;
    line-height: 18px;
    font-size: clamp(10px, .82vw, 14px);
  }

  .fate-standalone #arena.fate-table-layout > .player > .hp {
    left: 3px !important;
    right: auto !important;
    bottom: 3px !important;
    width: auto !important;
    min-width: 35px;
    height: 18px;
    line-height: 18px;
    font-size: clamp(10px, .82vw, 14px);
    text-align: left;
  }

  .fate-standalone #arena.fate-table-layout > .player > .marks {
    box-sizing: border-box;
    top: 4px !important;
    width: 31px !important;
    min-height: 40px;
    max-height: calc(100% - 8px);
    padding: 2px !important;
    border: 1px solid #282828;
    background: rgba(95, 95, 95, .9);
    overflow-y: auto;
    z-index: 5;
  }

  .fate-standalone #arena.fate-table-layout > .player.fate-marks-left > .marks {
    left: calc(100% + 4px) !important;
  }

  .fate-standalone #arena.fate-table-layout > .player.fate-marks-right > .marks {
    left: auto !important;
    right: calc(100% + 4px) !important;
  }

  .fate-standalone #arena.fate-table-layout > .player > .marks > div {
    position: relative !important;
    left: 0 !important;
    top: 0 !important;
    width: 25px !important;
    height: 25px !important;
    margin: 1px !important;
    transform: none !important;
    opacity: 1 !important;
  }

  .fate-standalone #arena.fate-table-layout > .player > .marks > div:first-child {
    display: none !important;
  }

  .fate-standalone #arena.fate-table-layout > .player > .marks > div > .markcount {
    left: 15px !important;
    top: 13px !important;
    width: 10px !important;
    height: 10px !important;
    line-height: 10px !important;
    font-size: 8px !important;
  }

  .fate-standalone #arena.fate-table-layout > .player.fate-seat-top-left { left: 20.1% !important; top: 3.5% !important; }
  .fate-standalone #arena.fate-table-layout > .player.fate-seat-top-center { left: 35.2% !important; top: 3.5% !important; }
  .fate-standalone #arena.fate-table-layout > .player.fate-seat-top-right { left: 50.3% !important; top: 3.5% !important; }
  .fate-standalone #arena.fate-table-layout > .player.fate-seat-right-upper { left: 70.0% !important; top: 15.8% !important; }
  .fate-standalone #arena.fate-table-layout > .player.fate-seat-right-lower { left: 70.0% !important; top: 44.0% !important; }
  .fate-standalone #arena.fate-table-layout > .player.fate-seat-left-lower { left: 1.3% !important; top: 44.0% !important; }
  .fate-standalone #arena.fate-table-layout > .player.fate-seat-left-upper { left: 1.3% !important; top: 15.8% !important; }

  .fate-standalone #arena.fate-table-layout > #control {
    inset: 0;
    width: 100%;
    height: 100%;
    left: 0;
    top: 0;
    pointer-events: none;
    z-index: 12;
  }

  .fate-standalone #arena.fate-table-layout > #control > .control {
    box-sizing: border-box;
    pointer-events: auto;
    border: 2px solid #171717;
    background: #969696;
    color: #f5f5f5;
    text-shadow: 0 1px 1px #333;
  }

  .fate-standalone #arena.fate-table-layout > #control > .control.fate-skill-control {
    position: absolute !important;
    right: 13.1% !important;
    bottom: 1.5% !important;
    left: auto !important;
    width: 11.1% !important;
    min-height: 18.3%;
    max-height: 18.3%;
    padding: 28px 6px 6px;
    overflow-y: auto;
    transform: none !important;
  }

  /* Skill controls are moved into the reserved panel when the engine creates
     them as ordinary controls. This keeps the native click handlers intact
     while giving every skill choice the same stable location. */
  .fate-standalone #arena.fate-table-layout > .fate-table-ui > .fate-skill-panel > .control.fate-skill-control {
    box-sizing: border-box;
    display: block;
    position: static !important;
    width: 100% !important;
    min-height: 0;
    max-height: none;
    margin: 0;
    padding: 28px 6px 6px;
    border: 2px solid #171717;
    background: #969696;
    color: #f5f5f5;
    overflow-y: auto;
    transform: none !important;
  }

  .fate-standalone #arena.fate-table-layout > #control > .control.fate-skill-control::before,
  .fate-standalone #arena.fate-table-layout > .fate-table-ui > .fate-skill-panel > .control.fate-skill-control::before {
    content: "技能";
    position: absolute;
    left: 7px;
    right: 7px;
    top: 5px;
    height: 20px;
    line-height: 20px;
    text-align: center;
    font-size: clamp(11px, 1vw, 16px);
  }

  .fate-standalone #arena.fate-table-layout > #control > .control.fate-skill-control > div,
  .fate-standalone #arena.fate-table-layout > .fate-table-ui > .fate-skill-panel > .control.fate-skill-control > div {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    width: 100%;
    min-height: 30px;
    margin: 2px 0;
    padding: 2px 3px 2px 31px;
    border: 1px solid #272727;
    background: #858585;
    white-space: normal;
    line-height: 1.15;
    text-align: left;
    font-size: clamp(10px, .86vw, 14px);
    overflow-wrap: anywhere;
  }

  .fate-standalone #arena.fate-table-layout > #control > .control.fate-skill-control > div::before,
  .fate-standalone #arena.fate-table-layout > .fate-table-ui > .fate-skill-panel > .control.fate-skill-control > div::before {
    content: "";
    position: absolute;
    left: 4px;
    width: 22px;
    height: 22px;
    border: 1px solid #4a4a4a;
    background: #b7b7b7;
  }

  .fate-standalone #arena.fate-table-layout > #control > .control.fate-skill-control.fate-has-skill-footer > div:last-child,
  .fate-standalone #arena.fate-table-layout > .fate-table-ui > .fate-skill-panel > .control.fate-skill-control.fate-has-skill-footer > div:last-child {
    display: none;
  }

  .fate-standalone #arena.fate-table-layout > #control > .control.fate-confirm-control,
  .fate-standalone #arena.fate-table-layout > #control > .control.fate-end-control {
    position: absolute !important;
    left: 18.4% !important;
    bottom: 21.2% !important;
    transform: none !important;
    min-width: 82px;
    padding: 4px 7px;
    background: #858585;
  }

  .fate-standalone #arena.fate-table-layout > #control > .control.fate-end-control {
    left: 55% !important;
  }

  .fate-standalone #arena.fate-table-layout > .dialog {
    box-sizing: border-box;
    left: 18.4% !important;
    bottom: 22.8% !important;
    top: auto !important;
    width: 47.8% !important;
    max-height: 15%;
    min-height: 0;
    border: 2px solid #171717;
    background: #969696;
    color: #f5f5f5;
    overflow-y: auto;
    z-index: 11;
  }

  .fate-standalone #arena.fate-table-layout > .dialog .caption,
  .fate-standalone #arena.fate-table-layout > .dialog .text,
  .fate-standalone #arena.fate-table-layout > .dialog .content {
    color: #f5f5f5;
    text-shadow: 0 1px 1px #333;
  }

  .fate-standalone #arena.fate-table-layout > .card[data-position="0"],
  .fate-standalone #arena.fate-table-layout > .popup[data-position="0"] {
    z-index: 9;
  }
`;

const SEAT_SLOTS = [
  "fate-seat-left-lower",
  "fate-seat-left-upper",
  "fate-seat-top-left",
  "fate-seat-top-center",
  "fate-seat-top-right",
  "fate-seat-right-upper",
  "fate-seat-right-lower",
];

const SLOT_SELECTIONS = {
  1: [3],
  2: [2, 4],
  3: [1, 3, 5],
  4: [0, 2, 4, 6],
  5: [0, 1, 3, 5, 6],
  6: [0, 1, 2, 4, 5, 6],
  7: [0, 1, 2, 3, 4, 5, 6],
};

const PERMANENT_SKILL_EXCLUDE = /(?:_effect|_card|_ready|_once|_cost|_target|_rule)$/;
const LOG_NOISE = [
  /进入.*(?:准备|摸牌|判定|出牌|弃牌)阶段/,
  /进入.*施法阶段/,
  /的回合开始$/,
  /摸了[^ ]*张牌$/,
];
const LOG_REPEAT_WINDOW = 10;

function text(value) {
  return value == null ? "—" : String(value);
}

function createPanel(className, parent) {
  const node = document.createElement("div");
  node.className = className;
  parent.appendChild(node);
  return node;
}

function updateSeatLayout() {
  if (!ui.arena || !game.me) return;
  for (const player of game.players) {
    if (player !== game.me) player.classList.remove(...SEAT_SLOTS, "fate-marks-left", "fate-marks-right");
  }
  const opponents = game.players.filter(player => player !== game.me && player.isAlive());
  const positions = SLOT_SELECTIONS[Math.min(7, opponents.length)] || SLOT_SELECTIONS[7];
  opponents.forEach((player, index) => {
    const slotIndex = positions[index] ?? index;
    const slot = SEAT_SLOTS[slotIndex];
    if (!slot) return;
    player.classList.add(slot);
    const rightSide = slot.includes("right");
    player.classList.add(rightSide ? "fate-marks-left" : "fate-marks-right");
  });
  game.me.classList.remove(...SEAT_SLOTS, "fate-marks-left", "fate-marks-right");
}

function updateSelfStatus(panel) {
  if (!game.me || !panel) return;
  const player = game.me;
  const marks = player.node?.marks;
  const activeMarks = marks ? Math.max(0, marks.childElementCount - 1) : 0;
  panel.innerHTML = `
    <span class="fate-self-status-title">玩家状态</span>
    <span class="fate-self-status-empty">${activeMarks ? "" : "暂无状态"}</span>
  `;
  // The status text is refreshed as cards and rage change. Reattach the native
  // mark strip after replacing that text so self buffs remain visible here.
  if (marks) panel.appendChild(marks);
}

function getPermanentSkills() {
  if (!game.me) return [];
  const skills = game.me.getSkills?.() || game.me.skills || [];
  return [...new Set(skills)].filter(skill =>
    typeof skill === "string" &&
    skill.startsWith("fate_") &&
    !PERMANENT_SKILL_EXCLUDE.test(skill) &&
    lib.translate[skill] &&
    lib.translate[`${skill}_info`],
  );
}

function createPersistentSkills(panel) {
  if (!panel || panel._fatePersistentSkills) return;
  const container = document.createElement("div");
  container.className = "fate-persistent-skills";
  panel.appendChild(container);
  const buttons = new Map();
  for (const skill of getPermanentSkills()) {
    const button = document.createElement("div");
    button.className = "fate-persistent-skill";
    button.dataset.skill = skill;
    button.textContent = get.translation(skill);
    button.title = lib.translate[`${skill}_info`];
    button.addEventListener("click", () => {
      const native = panel.querySelector(`.control.fate-skill-control [data-fate-skill="${skill}"]`);
      if (native) native.click();
    });
    container.appendChild(button);
    buttons.set(skill, button);
  }
  panel._fatePersistentSkills = { container, buttons };
}

function syncPersistentSkills(panel) {
  const state = panel?._fatePersistentSkills;
  if (!state) return;
  const nativeButtons = Array.from(panel.querySelectorAll(".control.fate-skill-control > div"));
  for (const native of nativeButtons) {
    if (typeof native.link === "string") native.dataset.fateSkill = native.link;
  }
  for (const [skill, button] of state.buttons) {
    const active = nativeButtons.some(native => native.dataset.fateSkill === skill);
    button.classList.toggle("fate-skill-ready", active);
    button.setAttribute("aria-disabled", active ? "false" : "true");
  }
}

function cleanLog(log) {
  if (!log || log.dataset.fateCleaning === "1") return;
  log.dataset.fateCleaning = "1";
  try {
    const entries = Array.from(log.children);
    let previous = "";
    const recent = [];
    for (const entry of entries) {
      const content = entry.textContent?.replace(/\s+/g, " ").trim() || "";
      const repeated = content && recent.includes(content);
      if (LOG_NOISE.some(pattern => pattern.test(content)) || content === previous || repeated) {
        entry.remove();
        continue;
      }
      previous = content;
      recent.push(content);
      if (recent.length > LOG_REPEAT_WINDOW) recent.shift();
    }
    while (log.children.length > 120) log.firstElementChild?.remove();
  } finally {
    log.dataset.fateCleaning = "0";
  }
}

function updateTableInfo(roundInfo, aliveInfo) {
  if (!roundInfo || !aliveInfo) return;
  const round = Number(game.roundNumber) || 0;
  const pile = ui.cardPile?.childElementCount || 0;
  roundInfo.textContent = `第${round}轮  摸牌堆剩余 ${pile}`;
  const all = game.players.concat(game.dead || []);
  const maxByFaction = { fate_sentinel: 0, fate_scourge: 0, fate_neutral: 0 };
  const aliveByFaction = { fate_sentinel: 0, fate_scourge: 0, fate_neutral: 0 };
  for (const player of all) {
    if (!(player.identity in maxByFaction)) continue;
    maxByFaction[player.identity] += 1;
    if (player.isAlive()) aliveByFaction[player.identity] += 1;
  }
  const label = faction => {
    const name = get.translation(faction) || faction;
    return `${name}${aliveByFaction[faction]}/${maxByFaction[faction]}`;
  };
  aliveInfo.textContent = `场上存活  ${label("fate_scourge")}  ${label("fate_sentinel")}  ${label("fate_neutral")}`;
}

function classifyControls() {
  if (!ui.control) return;
  const skillPanel = ui.arena?.querySelector(".fate-skill-panel");
  for (const node of Array.from(ui.control.children)) {
    node.classList.remove("fate-skill-control", "fate-confirm-control", "fate-end-control", "fate-has-skill-footer");
    const links = Array.from(node.children).map(child => child.link).filter(Boolean);
    const labels = Array.from(node.children)
      .map(child => child.textContent?.trim())
      .filter(Boolean);
    const hasKnownSkill = links.some(link => typeof link === "string" && Boolean(lib.skill[link]));
    const skillLike = node === ui.skills || node === ui.skills2 || node === ui.skills3 ||
      Array.isArray(node.skills) || hasKnownSkill;
    if (skillLike) {
      node.classList.add("fate-skill-control");
      if (links.at(-1) === ui.click?.skill) node.classList.add("fate-has-skill-footer");
      if (skillPanel && node.parentNode !== skillPanel) skillPanel.appendChild(node);
    } else if (node === ui.confirm) {
      node.classList.add("fate-confirm-control");
    } else if (node.stayleft) {
      node.classList.add("fate-end-control");
    } else {
      // Some Fate prompts are created as ordinary controls rather than through
      // ui.create.skills. Keep those choices in the same skill panel instead
      // of letting the engine place them over the hero card.
      const nonSkillLabels = new Set([
        "确定", "取消", "结束", "结束回合", "全选", "取消选择", "AI代选",
        "确定选择", "取消选择", "cancel", "ok",
      ]);
      if (labels.some(label => !nonSkillLabels.has(label))) {
        node.classList.add("fate-skill-control");
        if (skillPanel && node.parentNode !== skillPanel) skillPanel.appendChild(node);
      }
    }
  }
}

function enableLogScroll(log) {
  if (!log || log.dataset.fateScrollReady) return;
  log.dataset.fateScrollReady = "1";
  log.dataset.fateAutoScroll = "1";
  cleanLog(log);
  log.addEventListener("scroll", () => {
    const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight <= 4;
    log.dataset.fateAutoScroll = atBottom ? "1" : "0";
  });
  const observer = new MutationObserver(() => {
    cleanLog(log);
    if (log.dataset.fateAutoScroll === "1") log.scrollTop = log.scrollHeight;
  });
  observer.observe(log, { childList: true, subtree: true, characterData: true });
  log._fateScrollObserver = observer;
}

export function installFateLayout() {
  if (!lib.config.fate_standalone || !ui.arena || !game.me) return;
  if (ui.arena.classList.contains("fate-table-layout")) return;
  ui.arena.classList.add("fate-table-layout");

  const tableUi = createPanel("fate-table-ui", ui.arena);
  const playfield = createPanel("fate-playfield", tableUi);
  playfield.setAttribute("aria-label", "出牌区");

  const selfStatus = createPanel("fate-self-status", tableUi);
  const equipment = createPanel("fate-equipment", tableUi);
  createPanel("fate-equipment-title", equipment).textContent = "装备栏";
  if (game.me.node?.equips) equipment.appendChild(game.me.node.equips);
  if (game.me.node?.marks) selfStatus.appendChild(game.me.node.marks);

  const skillPanel = createPanel("fate-skill-panel", tableUi);
  createPanel("fate-skill-panel-title", skillPanel);
  createPersistentSkills(skillPanel);

  const roundInfo = createPanel("fate-round-info", tableUi);
  const aliveInfo = createPanel("fate-alive-info", tableUi);
  if (ui.cardPileNumber) ui.cardPileNumber.style.display = "none";

  updateSeatLayout();
  updateSelfStatus(selfStatus);
  updateTableInfo(roundInfo, aliveInfo);
  enableLogScroll(ui.arenalog);
  classifyControls();
  syncPersistentSkills(skillPanel);

  const controlObserver = ui.control
    ? new MutationObserver(classifyControls)
    : null;
  controlObserver?.observe(ui.control, { childList: true });

  const timer = setInterval(() => {
    if (!ui.arena || !ui.arena.classList.contains("fate-table-layout")) {
      clearInterval(timer);
      controlObserver?.disconnect();
      return;
    }
    updateSeatLayout();
    updateSelfStatus(selfStatus);
    updateTableInfo(roundInfo, aliveInfo);
    classifyControls();
    syncPersistentSkills(skillPanel);
  }, 500);
  ui.fateLayout = { tableUi, selfStatus, equipment, skillPanel, roundInfo, aliveInfo, timer, controlObserver };
}
