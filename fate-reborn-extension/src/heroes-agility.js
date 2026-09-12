import { game, get, ui } from "noname";
import { registerPhaseUseActiveSkills } from "./heroes-strength.js";
import { isUsefulCastTarget } from "./rules.js";

const other = (card, player, target) => player !== target;
const trick = (filterTarget, content) => ({ type: "trick", enable: false, wuxieable: true, filterTarget, content });
const hostileTarget = (target, player) => get.damageEffect(target, player, player);

async function medusaSnake(player) {
  const paid = await player.chooseToDiscard("h", 1, true).set("prompt", "秘术异蛇：弃置1张手牌作为费用").forResult();
  if (!paid.bool) return;
  await player.useCard({ name: "fate_medusa_snake_effect", isCard: true, storage: { pool: paid.cards } }, player);
}
async function razorField(player) {
  const cards = player.getCards("h"); const max = new Set(cards.map(card => get.suit(card))).size;
  const paid = await player.chooseToDiscard("h", [1, max], true).set("prompt", "等离子场：弃置不同花色的手牌").set("filterCard", card => !ui.selected.cards.some(selected => get.suit(selected) === get.suit(card))).forResult();
  if (!paid.bool) return;
  const targets = await player.chooseTarget([1, paid.cards.length], "等离子场：选择目标", other).forResult();
  if (targets.targets?.length) await player.useCard({ name: "fate_razor_field_effect", isCard: true, storage: { targetIds: targets.targets.map(target => target.playerid), suits: paid.cards.map(card => get.suit(card)) } }, player);
}
async function trollFocus(player) {
  await player.useCard({ name: "fate_troll_focus_effect_card", isCard: true }, player);
}
async function nyxBurn(player) {
  const paid = await player.chooseToDiscard("h", 1, true).set("prompt", "法力燃烧：弃置1张攻击").set("filterCard", card => get.name(card) === "sha").forResult();
  if (!paid.bool) return;
  const target = (await player.chooseTarget("法力燃烧：选择目标", true, other).forResult()).targets?.[0];
  if (!target) return;
  const guess = target.countCards("h") >= 2 ? await player.chooseControl("红色", "黑色").set("prompt", "法力燃烧：猜测目标另一张手牌颜色").forResult() : null;
  await player.useCard({ name: "fate_nyx_burn_effect", isCard: true, storage: { guess: guess?.control } }, target);
}

const active = {
  fate_medusa_snake: { info: { usable: 1, filter: (event, player) => player.countCards("h") > 0 && game.countPlayer() > 1 }, run: medusaSnake },
  fate_razor_field: { info: { usable: 1, filter: (event, player) => player.countCards("h") > 0 && game.hasPlayer(target => target !== player) }, run: razorField },
  fate_troll_focus: { info: { usable: 1, filter: () => true }, run: trollFocus },
  fate_nyx_burn: { info: { usable: 1, filter: (event, player) => player.countCards("h", card => get.name(card) === "sha") > 0 && game.hasPlayer(target => target !== player) }, run: nyxBurn },
};
registerPhaseUseActiveSkills(active);

export const AGILITY_HERO_CARDS = {
  fate_medusa_snake_effect: trick(() => true, async (event, trigger, player) => {
    const pool = event.card.storage?.pool?.slice() || [];
    for (const target of game.players.filter(target => target !== player)) {
      if (target.countCards("h")) { const card = target.getCards("h").randomGet(); await target.lose(card, "visible"); pool.push(card); }
      else if (target.countMark("fate_rage_rule")) target.removeMark("fate_rage_rule", 1);
      else await target.damage({ num: 1, source: player });
    }
    for (const card of pool) { const target = (await player.chooseTarget("秘术异蛇：分配明置牌", true).forResult()).targets?.[0]; if (target) await target.gain(card, "gain2"); }
  }),
  fate_razor_field_effect: trick(() => true, async (event, trigger, player) => {
    const suits = event.card.storage?.suits || [];
    for (const id of event.card.storage?.targetIds || []) {
      const target = game.players.find(current => current.playerid === id);
      if (!target?.isAlive()) continue;
      const result = await target.chooseToDiscard("h", 1).set("prompt", "等离子场：弃置一张未被雷泽弃过花色的手牌，否则受到1点伤害").set("filterCard", card => !suits.includes(get.suit(card))).forResult();
      if (!result.bool) await target.damage({ num: 1, source: player });
    }
  }),
  fate_troll_focus_effect_card: trick(() => true, async (event, trigger, player) => { const judge = await player.judge(card => get.color(card) === "red" ? 1 : -1).forResult(); if (judge.bool) player.addTempSkill("fate_troll_focus_effect", "phaseUseAfter"); }),
  fate_nyx_burn_effect: trick(other, async (event, trigger, player) => { const target = event.target; if (target.countCards("h")) await player.discardPlayerCard(target, "h", true); if (target.countCards("h") && event.card.storage?.guess) { const card = target.getCards("h").randomGet(); target.showCards(card, "法力燃烧"); if ((event.card.storage.guess === "红色" ? "red" : "black") === get.color(card)) await target.discard(card); } }),
  fate_bloodseeker_rupture_card: trick(() => true, async event => { event.target.addTempSkill("fate_bloodseeker_rupture_effect", { global: "phaseAfter" }); }),
};
export const AGILITY_HERO_SKILLS = {
  fate_medusa_snake: { enable: "phaseUse", usable: 1, filter: active.fate_medusa_snake.info.filter, async content(event, trigger, player) { await medusaSnake(player); } },
  fate_medusa_shield: { trigger: { player: "damageBegin4" }, direct: true, filter(event, player) { return event.num > 0 && player.countMark("fate_rage_rule") > 0 && player.countCards("h") > 0; }, async content(event, trigger, player) { while (trigger.num > 0 && player.countMark("fate_rage_rule") > 0 && player.countCards("h") > 0) { const result = await player.chooseBool(`魔法护盾：消耗1点怒气并弃1张手牌，防止1点伤害？（剩余${trigger.num}点）`).set("ai", () => true).forResult(); if (!result.bool) break; const paid = await player.chooseToDiscard("h", 1, true).set("prompt", "魔法护盾：弃置1张手牌").forResult(); if (!paid.bool) break; player.removeMark("fate_rage_rule", 1); trigger.num -= 1; } if (trigger.num <= 0) trigger.cancel(); } },
  fate_razor_field: { enable: "phaseUse", usable: 1, filter: active.fate_razor_field.info.filter, async content(event, trigger, player) { await razorField(player); } },
  fate_razor_current: { trigger: { player: "damageEnd" }, direct: true, filter(event) { return event.card?.name === "sha" && event.cards?.length; }, async content(event, trigger, player) { if ((await player.chooseBool("不定电流：获得造成伤害的攻击牌？").set("ai", () => true).forResult()).bool) await player.gain(trigger.cards, "gain2"); } },
  fate_juggernaut_omnislash: { trigger: { player: "phaseDrawBegin2" }, direct: true, filter(event, player) { return event.num > 0 && player.countCards("h", card => get.color(card) === "black") > 0; }, async content(event, trigger, player) { if ((await player.chooseBool("无敌斩：放弃摸牌，本回合黑色手牌均可当攻击且攻击次数不限？").forResult()).bool) { trigger.cancel(); player.addTempSkill("fate_juggernaut_omnislash_effect", "phaseAfter"); } } },
  fate_juggernaut_omnislash_effect: { charlotte: true, mod: { cardname(card) { if (get.color(card) === "black") return "sha"; }, cardUsable(card) { if (card.name === "sha") return Infinity; } } },
  fate_juggernaut_blade_dance: { trigger: { player: "useCardToPlayered" }, forced: true, filter(event) { return event.card?.name === "sha"; }, async content(event, trigger) { trigger.card.storage ||= {}; trigger.card.storage.fateDiamondDodge = true; } },
  fate_juggernaut_diamond_dodge: { trigger: { global: "respondBefore" }, forced: true, popup: false, filter(event) { return event.card?.name === "shan" && event.respondTo?.[1]?.storage?.fateDiamondDodge && get.suit(event.card) !== "diamond"; }, async content(event, trigger) { trigger.cancel(); } },
  fate_vengeful_swap: { trigger: { global: "judge" }, direct: true, filter(event, player) { return player.countCards("h") > 0; }, async content(event, trigger, player) { const result = await player.chooseCard("h", "移形换位：选择1张手牌替换判定牌").forResult(); if (result.cards?.[0]) { await player.lose(result.cards, "visible"); await game.cardsDiscard(trigger.player.judging[0]); trigger.player.judging[0] = result.cards[0]; } } },
  fate_vengeful_wave: { charlotte: true, popup: false },
  fate_bloodseeker_rupture: { trigger: { global: "fateCastPhase" }, forced: true, filter(event, player) { return player.countCards("h", card => get.color(card) === "red") > 0; }, async content(event, trigger, player) { const useful = target => target !== player && isUsefulCastTarget("bloodseeker", { attitude: get.attitude(player, target), hand: target.countCards("h") }); if (player !== game.me && !game.hasPlayer(useful)) return; if (player === game.me && !(await player.chooseBool("血之狂暴：是否发动？").forResult()).bool) return; const target = (await player.chooseTarget("血之狂暴：选择一名角色", true, (card, source, target) => target !== source).set("ai", target => useful(target) ? hostileTarget(target, player) : -Infinity).forResult()).targets?.[0]; if (!target) return; const paid = await player.chooseToDiscard("h", 1, true).set("filterCard", card => get.color(card) === "red").forResult(); if (paid.bool) await player.useCard({ name: "fate_bloodseeker_rupture_card", isCard: true }, target); } },
  fate_bloodseeker_rupture_effect: { charlotte: true, mark: true, marktext: "狂", intro: { content: "本回合只能使用基本牌；受到攻击伤害时额外+1。" }, mod: { cardEnabled(card) { if (get.type(card) !== "basic") return false; }, }, trigger: { source: "damageBegin1" }, forced: true, filter(event) { return event.card?.name === "sha"; }, async content(event, trigger) { trigger.num += 1; } },
  fate_bloodseeker_thirst: { trigger: { player: "useCardToPlayered" }, forced: true, filter(event) { return event.card?.name === "sha" && event.target.hp === 1; }, async content(event, trigger) { const map = trigger.getParent().customArgs; map[trigger.target.playerid] ||= {}; map[trigger.target.playerid].shanRequired = (map[trigger.target.playerid].shanRequired || 1) + 1; } },
  fate_bloodseeker_slaughter: { trigger: { source: "dieAfter" }, direct: true, filter(event, player) { return player.isDamaged(); }, async content(event, trigger, player) { if ((await player.chooseBool("屠戮：是否将血量回复至上限？").set("ai", () => true).forResult()).bool) await player.recover(player.maxHp - player.hp); } },
  fate_troll_focus: { enable: "phaseUse", usable: 1, async content(event, trigger, player) { await trollFocus(player); } },
  fate_troll_focus_effect: { charlotte: true, mod: { cardUsable(card) { if (card.name === "sha") return Infinity; } } },
  fate_troll_battle: { enable: "chooseToUse", filterCard(card) { return get.name(card) === "shan"; }, position: "h", viewAs: { name: "sha" }, prompt: "将闪避当普通攻击使用" },
  fate_sniper_headshot: { trigger: { player: "useCardToPlayered" }, direct: true, filter(event) { return event.card?.name === "sha"; }, async content(event, trigger, player) { const judge = await player.judge(card => get.color(card) === "black" ? 1 : -1).forResult(); if (judge.bool) trigger.getParent().baseDamage = (trigger.getParent().baseDamage || 1) + 1; } },
  fate_sniper_aim: { mod: { globalFrom(from, to, distance) { return distance - 1; } } },
  fate_nyx_burn: { enable: "phaseUse", usable: 1, filter: active.fate_nyx_burn.info.filter, async content(event, trigger, player) { await nyxBurn(player); } },
  fate_antimage_mana: { trigger: { source: "damageEnd" }, direct: true, filter(event) { return event.card?.name === "sha" && event.player?.countCards("h"); }, async content(event, trigger, player) { if ((await player.chooseBool("法力损毁：弃掉目标1张手牌？").set("ai", () => true).forResult()).bool) await player.discardPlayerCard(trigger.player, "h", true); } },
  fate_antimage_blink: { enable: "chooseToUse", filterCard(card) { return get.color(card) === "black"; }, position: "h", viewAs: { name: "shan" }, prompt: "将黑色手牌当闪避使用或打出" },
  fate_chen_judgement: { trigger: { global: "judgeAfter" }, direct: true, filter(event, player) { return !player.storage.fate_chen_judgement_lock && player.countCards("h") > 0; }, async content(event, trigger, player) { if (!(await player.chooseBool("神判：弃1张手牌，令此判定重新进行一次？").forResult()).bool) return; const paid = await player.chooseToDiscard("h", 1, true).forResult(); if (!paid.bool) return; player.storage.fate_chen_judgement_lock = true; try { await trigger.player.judge(trigger.judge); } finally { delete player.storage.fate_chen_judgement_lock; } } },
  fate_chen_body: { mod: { targetEnabled(card, player, target) { if (target.hp <= 2 && card.name === "sha") return false; } } },
};

export const AGILITY_HERO_TRANSLATIONS = Object.fromEntries(Object.entries({
  fate_medusa_snake:["秘术异蛇","出牌阶段限一次：弃1张手牌，依次抽取其他角色手牌并分配；无手牌者失怒气或受伤害。"], fate_medusa_shield:["魔法护盾","受到伤害前可消耗1怒气并弃1手牌防止伤害。"],
  fate_razor_field:["等离子场","出牌阶段限一次：弃不同花色手牌，令至多等量角色弃未曾弃过花色的牌或受伤害。"], fate_razor_current:["不定电流","受到攻击伤害后可获得该攻击牌。"],
  fate_juggernaut_omnislash:["无敌斩","摸牌阶段可放弃摸牌，本回合黑色手牌可当攻击且攻击不限次数。"], fate_juggernaut_blade_dance:["剑舞","你的攻击只能被方块闪避抵消。"],
  fate_vengeful_swap:["移形换位","判定翻开前可用1张手牌替换判定牌。"], fate_vengeful_wave:["恐怖波动","获得怒气时摸等量牌，最多3张。"],
  fate_bloodseeker_rupture:["血之狂暴","施法阶段可弃红色手牌，令目标本回合只能用基本牌，攻击伤害+1。"], fate_bloodseeker_rupture_effect:["血之狂暴","本回合只能使用基本牌；受到攻击伤害时额外+1。"], fate_bloodseeker_thirst:["嗜血","对1血角色使用攻击时，其须额外使用1张闪避。"], fate_bloodseeker_slaughter:["屠戮","杀死角色后可回复至上限。"],
  fate_troll_focus:["战斗专注","出牌阶段限一次判定；红色时本回合攻击不限次数。"], fate_troll_battle:["热血战魂","闪避可当普通攻击使用。"],
  fate_sniper_headshot:["爆头","使用攻击指定目标后可判定；黑色则伤害+1。"], fate_sniper_aim:["瞄准","计算与其他角色距离时始终-1。"],
  fate_nyx_burn:["法力燃烧","出牌阶段限一次：弃攻击，弃目标手牌并猜测其另一张手牌颜色。"], fate_antimage_mana:["法力损毁","攻击造成伤害后可弃目标1张手牌。"], fate_antimage_blink:["闪烁","黑色手牌可当闪避使用或打出。"], fate_chen_judgement:["神判","判定生效后可弃1手牌令其重新判定。"], fate_chen_body:["特殊体质","血量不高于2时，攻击对你无效。"],
}).flatMap(([id, [name, info]]) => [[id, name], [`${id}_info`, info]]));
