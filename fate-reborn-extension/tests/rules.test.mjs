import test from "node:test";
import assert from "node:assert/strict";
import {
  FACTION,
  BASIC_DECK,
  ACTIVE_DECK,
  EQUIPMENT_DECK,
  MAGIC_DECK,
  S_DECK,
  S_RAGE_COST,
  dealFivePlayerIdentities,
  dealPlayerIdentities,
  evaluateNeutralFate,
  evaluateWinner,
  gainRage,
  requiredDodges,
  isUsefulCastTarget,
} from "../src/rules.js";
import { gainFateRage } from "../src/rage.js";

test("基础牌堆严格包含53张实体牌", () => {
  assert.equal(BASIC_DECK.length, 53);
  assert.equal(BASIC_DECK.filter(card => card[2] === "sha" && !card[3]).length, 12);
  assert.equal(BASIC_DECK.filter(card => card[3] === "fate_chaos").length, 10);
  assert.equal(BASIC_DECK.filter(card => card[3] === "fate_fire").length, 8);
  assert.equal(BASIC_DECK.filter(card => card[2] === "shan").length, 15);
  assert.equal(BASIC_DECK.filter(card => card[2] === "tao").length, 8);
});

test("魔法与S技实体牌数量符合规则书", () => {
  assert.equal(MAGIC_DECK.length, 33);
  assert.equal(S_DECK.length, 9);
  assert.equal(EQUIPMENT_DECK.length, 17);
  assert.equal(S_RAGE_COST.fate_divine_strength, 2);
  assert.equal(S_RAGE_COST.fate_laguna_blade, 3);
});

test("完整牌堆包含112张实体牌", () => {
  assert.equal(ACTIVE_DECK.length, 112);
  assert.equal(ACTIVE_DECK.filter(card => card[2] === "wuxie").length, 7);
});

test("五人身份固定为2近卫、2天灾、1中立", () => {
  const identities = dealFivePlayerIdentities(() => 0.42);
  assert.equal(identities.filter(value => value === FACTION.SENTINEL).length, 2);
  assert.equal(identities.filter(value => value === FACTION.SCOURGE).length, 2);
  assert.equal(identities.filter(value => value === FACTION.NEUTRAL).length, 1);
});

test("六至七人局保持一名中立，八人局使用3/3/2身份配比", () => {
  for (const count of [6, 7]) {
    const identities = dealPlayerIdentities(count, () => 0.42);
    assert.equal(identities.length, count);
    assert.equal(identities.filter(value => value === FACTION.NEUTRAL).length, 1);
    assert.equal(identities.filter(value => value === FACTION.SENTINEL).length + identities.filter(value => value === FACTION.SCOURGE).length, count - 1);
  }
  const identities = dealPlayerIdentities(8, () => 0.42);
  assert.equal(identities.filter(value => value === FACTION.SENTINEL).length, 3);
  assert.equal(identities.filter(value => value === FACTION.SCOURGE).length, 3);
  assert.equal(identities.filter(value => value === FACTION.NEUTRAL).length, 2);
});

test("怒气按实际伤害增加且不超过上限", () => {
  assert.equal(gainRage(2, 2, 3), 3);
  assert.equal(gainRage(1, 0, 3), 1);
});

test("实际获得怒气会让复仇之魂摸等量牌，满怒时不触发", async () => {
  let drawn = 0;
  const player = {
    storage: {},
    marks: 2,
    countMark() { return this.marks; },
    addMark(name, amount) { this.marks += amount; },
    hasSkill(name) { return name === "fate_vengeful_wave"; },
    async draw(amount) { drawn += amount; },
  };
  assert.equal(await gainFateRage(player, 2), 1);
  assert.equal(player.storage.fate_last_rage_gain, 1);
  assert.equal(drawn, 1);
  assert.equal(await gainFateRage(player, 1), 0);
  assert.equal(drawn, 1);
});

test("冰霜禁制将叠加后的闪避数翻倍", () => {
  assert.equal(requiredDodges({ base: 1, frozen: true }), 2);
  assert.equal(requiredDodges({ base: 2, frozen: true }), 4);
  assert.equal(requiredDodges({ base: 2, extra: 1, frozen: true }), 6);
});

test("施法技能的AI目标只在有明确收益时成立", () => {
  assert.equal(isUsefulCastTarget("heartstopper", { attitude: -3, damaged: true }), true);
  assert.equal(isUsefulCastTarget("heartstopper", { attitude: -3, damaged: false }), false);
  assert.equal(isUsefulCastTarget("crystal_frost", { attitude: -3, hand: 2 }), true);
  assert.equal(isUsefulCastTarget("crystal_frost", { attitude: -3, hand: 0 }), false);
  assert.equal(isUsefulCastTarget("shallow_grave", { attitude: 3, hp: 1 }), true);
  assert.equal(isUsefulCastTarget("shallow_grave", { attitude: -3, hp: 1 }), false);
  assert.equal(isUsefulCastTarget("bloodseeker", { attitude: -3, hand: 1 }), true);
  assert.equal(isUsefulCastTarget("techies_detonate", { attitude: 3 }), false);
});

test("中立宿命优先于阵营胜利", () => {
  const players = [
    { id: "a", identity: FACTION.NEUTRAL, alive: true, hp: 2, rage: 1 },
    { id: "b", identity: FACTION.SENTINEL, alive: true, hp: 2, rage: 1 },
    { id: "c", identity: FACTION.SCOURGE, alive: false, hp: 0, rage: 1 },
  ];
  assert.deepEqual(evaluateWinner({ players, fateId: "paranoid_mathematician", turnPlayerId: "b" }), {
    kind: "neutral",
    winners: ["a"],
  });
});

test("反噬的傀儡在固定下家阵营获胜时替代其获胜", () => {
  const players = [
    { id: "neutral", identity: FACTION.NEUTRAL, alive: true, successorId: "successor", rage: 1 },
    { id: "successor", identity: FACTION.SENTINEL, alive: true, rage: 1 },
    { id: "scourge", identity: FACTION.SCOURGE, alive: false, rage: 1 },
  ];
  assert.equal(evaluateNeutralFate("backlash_puppet", players[0], players), true);
  assert.deepEqual(evaluateWinner({ players, fateId: "backlash_puppet", turnPlayerId: "successor" }), {
    kind: "neutral",
    winners: ["neutral"],
  });
});

test("宿命结算按当前回合角色逆时针遍历座位", () => {
  const players = [
    { id: "p1", seat: 1, identity: FACTION.NEUTRAL, alive: true, successorId: "p1", rage: 1 },
    { id: "p2", seat: 2, identity: FACTION.NEUTRAL, alive: true, successorId: "sentinel", rage: 1 },
    { id: "p3", seat: 3, identity: FACTION.NEUTRAL, alive: true, successorId: "sentinel", rage: 1 },
    { id: "sentinel", seat: 4, identity: FACTION.SENTINEL, alive: true, rage: 1 },
  ];
  assert.deepEqual(evaluateWinner({ players, fateId: "backlash_puppet", turnPlayerId: "p1", turnDirection: "counterclockwise" }), {
    kind: "neutral",
    winners: ["p3"],
  });
  assert.deepEqual(evaluateWinner({ players, fateId: "backlash_puppet", turnPlayerId: "p1", turnDirection: "clockwise" }), {
    kind: "neutral",
    winners: ["p2"],
  });
});

test("蔓延的瘟疫未建立邻座信息时不应误判胜利", () => {
  const neutral = { id: "neutral", identity: FACTION.NEUTRAL, alive: true };
  const players = [neutral, { id: "sentinel", identity: FACTION.SENTINEL, alive: true }];
  assert.equal(evaluateNeutralFate("spreading_plague", neutral, players), false);
});

test("Roshan死亡立即让其他存活角色获胜", () => {
  const players = [
    { id: "a", identity: FACTION.NEUTRAL, alive: false, roshanRevealed: true },
    { id: "b", identity: FACTION.SENTINEL, alive: true },
    { id: "c", identity: FACTION.SCOURGE, alive: true },
  ];
  assert.deepEqual(evaluateWinner({ players, fateId: "roshan", turnPlayerId: "b" }), {
    kind: "roshan_defeated",
    winners: ["b", "c"],
  });
});
