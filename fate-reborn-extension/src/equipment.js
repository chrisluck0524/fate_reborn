import { lib, game, get } from "noname";
import { MAGIC_DECK } from "./rules.js";
import { gainFateRage } from "./rage.js";

const MAGIC_NAMES = new Set(MAGIC_DECK.map(card => card[2]));

const weapon = (range, skills = [], canEquipOthers = false) => ({
  type: "equip",
  subtype: "equip1",
  distance: { attackFrom: 1 - range },
  skills,
  ...(canEquipOthers
    ? {
        selectTarget: 1,
        filterTarget: true,
      }
    : {}),
  ai: { basic: { equipValue: 4 } },
});

const armor = (skills = []) => ({
  type: "equip",
  subtype: "equip2",
  skills,
  ai: { basic: { equipValue: 4 } },
});

export const EQUIPMENT_DEFINITIONS = {
  fate_eye_of_skadi: weapon(1, ["fate_eye_of_skadi_skill"]),
  fate_claws_of_attack: weapon(2, ["fate_claws_of_attack_skill"]),
  fate_sacred_relic: {
    ...weapon(2, ["fate_sacred_relic_skill"]),
    async onEquip(event, trigger, player) {
      const currentArmor = player.getEquip(2);
      if (currentArmor) await player.discard(currentArmor);
    },
  },
  fate_demon_edge: weapon(2, ["fate_demon_edge_skill"]),
  fate_diffusal_blade: weapon(3, ["fate_diffusal_blade_skill"]),
  fate_lothars_edge: weapon(3, ["fate_lothars_edge_skill"]),
  fate_desolator: weapon(3, ["fate_desolator_skill"]),
  fate_sange_yasha: weapon(3, ["fate_sange_yasha_skill", "fate_sange_yasha_unavoidable"]),
  fate_looting_axe: weapon(3, ["fate_looting_axe_skill"], true),
  fate_mystic_staff: weapon(3, ["fate_mystic_staff_skill"], true),
  fate_eaglehorn: weapon(4, ["fate_eaglehorn_skill"], true),
  fate_quelling_blade: weapon(4, ["fate_quelling_blade_skill"]),
  fate_ring: armor(["fate_ring_skill"]),
  fate_blade_mail: armor(["fate_blade_mail_skill"]),
  fate_boots: armor(["fate_boots_skill"]),
  fate_mage_cloak: armor(["fate_mage_cloak_skill"]),
  fate_evasion_charm: armor(["fate_evasion_charm_ready", "fate_evasion_charm_block"]),
};

for (const name of Object.keys(EQUIPMENT_DEFINITIONS)) {
  EQUIPMENT_DEFINITIONS[name].fullimage = true;
  EQUIPMENT_DEFINITIONS[name].image = `ext:fate-reborn/assets/cards/${name}.jpg`;
}

export const EQUIPMENT_SKILLS = {
  fate_eye_of_skadi_skill: {
    equipSkill: true,
    trigger: { player: "useCardToPlayered" },
    forced: true,
    filter(event) {
      return event.card.name === "sha";
    },
    async content(event, trigger) {
      const id = trigger.target.playerid;
      const map = trigger.getParent().customArgs;
      map[id] ||= {};
      map[id].shanRequired = Math.max(2, map[id].shanRequired || 1);
    },
  },
  fate_claws_of_attack_skill: {
    equipSkill: true,
    enable: ["chooseToUse", "chooseToRespond"],
    position: "h",
    filterCard(card) {
      return get.color(card) === "red";
    },
    viewAs: { name: "sha" },
    prompt: "将一张红色手牌当普通攻击使用或打出",
    check(card) {
      return 5 - get.value(card);
    },
  },
  fate_sacred_relic_skill: {
    equipSkill: true,
    mod: {
      cardEnabled(card) {
        if (get.subtype(card) === "equip2") return false;
      },
    },
    trigger: { source: "damageBegin1" },
    forced: true,
    filter(event) {
      return event.card?.name === "sha" && get.color(event.card) === "black";
    },
    async content(event, trigger) {
      trigger.num += 1;
    },
  },
  fate_demon_edge_skill: {
    equipSkill: true,
    trigger: { source: "dying" },
    forced: true,
    lastDo: true,
    priority: -100,
    filter(event) {
      const damage = event.getParent("damage");
      return event.player.hp <= 0 && damage?.card?.name === "sha";
    },
    async content(event, trigger, player) {
      await trigger.player.die(player);
    },
  },
  fate_diffusal_blade_skill: {
    equipSkill: true,
    enable: ["chooseToUse", "chooseToRespond"],
    position: "h",
    selectCard: 2,
    filterCard: true,
    hiddenCard(player, name) { return name === "wuxie" && player.countCards("h") >= 2; },
    viewAsFilter(player) { return player.countCards("h") >= 2; },
    viewAs: { name: "wuxie" },
    prompt: "将两张手牌当驱散使用",
    check(card) {
      return 4 - get.value(card);
    },
  },
  fate_lothars_edge_skill: {
    equipSkill: true,
    enable: ["chooseToUse", "chooseToRespond"],
    position: "h",
    filterCard(card) {
      return get.color(card) === "black";
    },
    hiddenCard(player, name) { return name === "shan" && player.countCards("h", card => get.color(card) === "black") > 0; },
    viewAsFilter(player) { return player.countCards("h", card => get.color(card) === "black") > 0; },
    viewAs: { name: "shan" },
    prompt: "将一张黑色手牌当闪避使用或打出",
    check(card) {
      return 6 - get.value(card);
    },
    ai: { respondShan: true },
  },
  fate_desolator_skill: {
    equipSkill: true,
    trigger: { source: "damageEnd" },
    forced: true,
    filter(event, player) {
      return event.num > 0 && event.card?.name === "sha" && player.countMark("fate_rage_rule") < 3;
    },
    async content(event, trigger, player) {
      await gainFateRage(player, 1);
    },
  },
  fate_sange_yasha_skill: {
    equipSkill: true,
    enable: ["chooseToUse", "chooseToRespond"],
    position: "h",
    selectCard: 2,
    filterCard: true,
    viewAs: { name: "sha" },
    prompt: "将两张手牌当普通攻击使用",
    onuse(result) {
      result.card.storage ||= {};
      result.card.storage.fateUnavoidable = result.cards?.length === 2 && result.cards.every(card => get.name(card) === "sha");
    },
    check(card) {
      return 5 - get.value(card);
    },
  },
  fate_sange_yasha_unavoidable: {
    equipSkill: true,
    trigger: { player: "useCardToPlayered" },
    forced: true,
    popup: false,
    filter(event) {
      return event.card?.storage?.fateUnavoidable;
    },
    async content(event, trigger) {
      trigger.getParent().directHit.add(trigger.target);
    },
  },
  fate_looting_axe_skill: {
    equipSkill: true,
    trigger: { source: "damageEnd" },
    filter(event, player) {
      return player.group === "fate_strength" && event.num > 0 && event.card?.name === "sha";
    },
    async content(event, trigger, player) {
      await player.draw();
    },
  },
  fate_mystic_staff_skill: {
    equipSkill: true,
    enable: "phaseUse",
    usable: 1,
    position: "he",
    selectCard: [2, Infinity],
    filter(event, player) {
      return player.group === "fate_intelligence" && player.countCards("he") >= 2;
    },
    filterCard(card, player) {
      return card !== player.getEquip("fate_mystic_staff");
    },
    prompt: "弃置至少两张牌，然后摸少一张牌",
    async content(event, trigger, player) {
      await player.draw(event.cards.length - 1);
    },
    check(card) {
      return 5 - get.value(card);
    },
  },
  fate_eaglehorn_skill: {
    equipSkill: true,
    trigger: { source: "damageEnd" },
    forced: true,
    popup: false,
    filter(event, player) {
      return player.group === "fate_agility" && event.num > 0 && event.card?.name === "sha";
    },
    async content(event, trigger, player) {
      player.addTempSkill("fate_eaglehorn_extra", "phaseUseAfter");
      player.addMark("fate_eaglehorn_extra", 1, false);
    },
    group: "fate_eaglehorn_extra",
  },
  fate_eaglehorn_extra: {
    charlotte: true,
    onremove: true,
    mod: {
      cardUsable(card, player, num) {
        if (card.name === "sha") return num + player.countMark("fate_eaglehorn_extra");
      },
    },
  },
  fate_quelling_blade_skill: {
    equipSkill: true,
    trigger: { global: "dieBegin" },
    direct: true,
    filter(event, player) {
      return event.player !== player && player.countCards("h", card => get.name(card) === "sha") > 0;
    },
    async content(event, trigger, player) {
      const result = await player
        .chooseToDiscard("h", 1)
        .set("prompt", `是否打出一张攻击，将${get.translation(trigger.player)}视为由你击杀？`)
        .set("filterCard", card => get.name(card) === "sha")
        .forResult();
      if (result.bool) {
        trigger.source = player;
        game.log(player, "发动补刀斧，成为", trigger.player, "的击杀者");
      }
    },
  },
  fate_ring_skill: {
    equipSkill: true,
    trigger: { player: "phaseDrawBegin2" },
    forced: true,
    filter(event) {
      return !event.numFixed;
    },
    async content(event, trigger) {
      trigger.num += 1;
    },
  },
  fate_blade_mail_skill: {
    equipSkill: true,
    trigger: { player: "damageEnd" },
    filter(event) {
      return event.num > 0 && event.source?.isAlive();
    },
    async content(event, trigger, player) {
      const result = await player.judge(card => (get.color(card) === "red" ? 1 : -1)).forResult();
      if (result.bool && trigger.source?.isAlive()) await trigger.source.damage(player);
    },
  },
  fate_boots_skill: {
    equipSkill: true,
    mod: {
      globalFrom(from, to, distance) {
        return distance - 1;
      },
      globalTo(from, to, distance) {
        return distance + 1;
      },
    },
  },
  fate_mage_cloak_skill: {
    equipSkill: true,
    trigger: { target: "useCardToTargeted" },
    filter(event) {
      return MAGIC_NAMES.has(event.card?.name);
    },
    async content(event, trigger, player) {
      const result = await player.judge(card => (get.suit(card) === "heart" ? 1 : -1)).forResult();
      if (result.bool) trigger.getParent().excluded.add(player);
    },
  },
  fate_evasion_charm_ready: {
    equipSkill: true,
    enable: "phaseUse",
    usable: 1,
    position: "h",
    filter(event, player) {
      return player.countCards("h") > 0 && player.countMark("fate_evasion_charm_block") === 0;
    },
    filterCard: true,
    prompt: "弃置一张手牌，将闪避护符竖置",
    async content(event, trigger, player) {
      player.addMark("fate_evasion_charm_block", 1);
    },
    check(card) {
      return 6 - get.value(card);
    },
  },
  fate_evasion_charm_block: {
    equipSkill: true,
    mark: true,
    marktext: "闪",
    intro: { content: "可抵消下一次以你为目标的攻击" },
    trigger: { target: "useCardToTargeted" },
    forced: true,
    filter(event, player) {
      return event.card?.name === "sha" && player.countMark("fate_evasion_charm_block") > 0;
    },
    async content(event, trigger, player) {
      player.removeMark("fate_evasion_charm_block", 1);
      trigger.getParent().excluded.add(player);
    },
  },
};

export const EQUIPMENT_TRANSLATIONS = {
  fate_eye_of_skadi: "冰魄之眼·距离1",
  fate_eye_of_skadi_info: "攻击距离1。目标须使用2张闪避才能抵消你的攻击。",
  fate_claws_of_attack: "攻击之爪·距离2",
  fate_claws_of_attack_info: "攻击距离2。你的红色手牌可当普通攻击使用或打出。",
  fate_sacred_relic: "圣者遗物·距离2",
  fate_sacred_relic_info: "攻击距离2。黑色攻击伤害+1；不能装备防具。",
  fate_demon_edge: "恶魔刀锋·距离2",
  fate_demon_edge_info: "攻击距离2。你的攻击令目标濒死时，保命技能结算后若仍濒死则立即死亡。",
  fate_diffusal_blade: "散失之刃·距离3",
  fate_diffusal_blade_info: "攻击距离3。可将两张手牌当驱散使用。",
  fate_lothars_edge: "洛萨之锋·距离3",
  fate_lothars_edge_info: "攻击距离3。黑色手牌可当闪避使用或打出。",
  fate_desolator: "黯灭之刃·距离3",
  fate_desolator_info: "攻击距离3。你的攻击命中后额外获得1点怒气。",
  fate_sange_yasha: "散夜对剑·距离3",
  fate_sange_yasha_info: "攻击距离3。可将两张手牌当普通攻击；若两张均为攻击，目标不能闪避。",
  fate_looting_axe: "掠夺之斧·距离3",
  fate_looting_axe_info: "攻击距离3。可装备给任意英雄；力量英雄攻击命中后摸1张牌。",
  fate_mystic_staff: "神秘法杖·距离3",
  fate_mystic_staff_info: "攻击距离3。可装备给任意英雄；智力英雄每回合一次弃X张牌并摸X-1张。",
  fate_eaglehorn: "鹰角弓·距离4",
  fate_eaglehorn_info: "攻击距离4。可装备给任意英雄；敏捷英雄攻击命中后可继续攻击。",
  fate_quelling_blade: "补刀斧·距离4",
  fate_quelling_blade_info: "攻击距离4。角色死亡时可打出一张攻击，使其视为由你击杀。",
  fate_ring: "菲丽丝之戒",
  fate_ring_info: "摸牌阶段额外摸1张牌。",
  fate_blade_mail: "刃甲",
  fate_blade_mail_info: "每受到一次伤害，判定为红色时对伤害来源造成1点伤害。",
  fate_boots: "速度之靴",
  fate_boots_info: "其他角色计算与你的距离+1；你计算与其他角色的距离-1。",
  fate_mage_cloak: "流浪法师斗篷",
  fate_mage_cloak_info: "成为魔法牌目标时判定；若为红桃，该魔法牌对你无效。",
  fate_evasion_charm: "闪避护符",
  fate_evasion_charm_info: "出牌阶段可弃1张手牌竖置；竖置时抵消下一次以你为目标的攻击。",
};
