import {orderedTargets} from './action-order.js';
import { game, get, ui, _status } from "noname";
import { freezeIcePrison, releaseIcePrison } from "./ice-prison.js";
import { registerPhaseUseActiveSkills } from "./heroes-strength.js";
import { isUsefulCastTarget, MAGIC_DECK, requiredDodges } from "./rules.js";

const trick = (filterTarget, content) => ({ type: "trick", enable: false, wuxieable: true, filterTarget, content });
const other = (card, player, target) => player !== target;
const hand = player => player.countCards("h") > 0;
const hostileTarget = (target, player) => get.damageEffect(target, player, player);
const queueStatus = (target, skills) => {
  if (!target?.isAlive()) return;
  // Card content runs after the dispel chain has resolved.
  for (const skill of skills) target.addTempSkill(skill, { global: "phaseAfter" });
};
const MAGIC_NAMES = new Set(MAGIC_DECK.map(card => card[2]));
const discard = async (player, count, prompt, filterCard = () => true) =>
  player.chooseToDiscard("h", count, true).set("prompt", prompt).set("filterCard", filterCard).forResult();

async function linaSoul(player) {
  player.addTempSkill("fate_lina_soul_ready", "phaseUseAfter");
}
async function jakiroIce(player) {
  const paid = await discard(player, 1, "冰封：弃置1张手牌作为费用");
  if (!paid.bool) return;
  const result = await player.chooseTarget("冰封：选择另一名角色", true, other).forResult();
  const target = result.targets?.[0];
  if (!target) return;
  await player.useCard({ name: "fate_jakiro_ice_effect", isCard: true }, target);
}
async function lichFeast(player) {
  const paid = await discard(player, 1, "邪恶祭祀：弃置1张红色手牌", card => get.color(card) === "red");
  if (paid.bool) await player.useCard({ name: "fate_lich_feast_effect", isCard: true }, player);
}
async function dazzleWave(player) {
  const cards = player.getCards("h");
  const pairs = cards.filter(card => cards.some(otherCard => otherCard !== card && get.suit(otherCard) === get.suit(card)));
  if (pairs.length < 2) return;
  const suitNames={spade:"黑桃",heart:"红桃",club:"梅花",diamond:"方块"};
  const suitResult = await player.chooseControl(...[...new Set(pairs.map(card=>get.suit(card)))].map(suit=>suitNames[suit])).set("prompt", "暗影波：选择弃置的花色").forResult();
  const suit = { 黑桃: "spade", 红桃: "heart", 梅花: "club", 方块: "diamond" }[suitResult.control];
  const paid = await discard(player, 2, "暗影波：弃置2张相同花色手牌", card => get.suit(card) === suit);
  if (!paid.bool) return;
  const heal = await player.chooseTarget("暗影波：选择一名受伤角色回复1点血", true, (card, source, target) => target.isDamaged()).forResult();
  if (heal.targets?.[0]) await heal.targets[0].recover();
  const hurt = await player.chooseTarget("暗影波：选择回复目标以外的角色受到1点伤害", true, (card,source,target) => target !== heal.targets?.[0]).forResult();
  if (hurt.targets?.[0]) await player.useCard({ name: "fate_shadow_wave_effect", isCard: true }, hurt.targets[0]);
}
async function keeperWave(player) {
  const cards = player.getCards("h");
  if (new Set(cards.map(card => get.suit(card))).size < 3) return;
  const paid = await player.chooseToDiscard("h", 3, true).set("prompt", "冲击波：弃置3张不同花色的手牌").set("filterCard", card => !ui.selected.cards.some(selected => get.suit(selected) === get.suit(card))).forResult();
  if (!paid.bool) return;
  const targets = await player.chooseTarget([1, 2], "冲击波：选择至多2名角色", other).forResult();
  for (const target of orderedTargets(player,game.players,targets.targets || [])) await player.useCard({ name: "fate_keeper_wave_effect", isCard: true }, target);
}
async function techiesBomb(player) {
  const result = await player.chooseCard("h", true, "遥控炸弹：将1张攻击暗置为炸弹").set("filterCard", card => get.name(card) === "sha").forResult();
  if (result.cards?.length) await player.addToExpansion(result.cards, "give").gaintag.add("fate_bomb");
}
async function keeperFavor(player) {
  const target = (await player.chooseTarget("恩惠：选择一名角色使用【查克拉】", true).forResult()).targets?.[0];
  if (target) await player.useCard({ name: "fate_chakra", isCard: true }, target);
}

const active = {
  fate_lina_soul: { info: { usable: 1, filter: (event, player) => !player.hasSkill("fate_lina_soul_ready") }, run: linaSoul },
  fate_jakiro_ice: { info: { usable: 1, filter: (event, player) => hand(player) && game.hasPlayer(target => target !== player) }, run: jakiroIce },
  fate_lich_feast: { info: { usable: 1, filter: (event, player) => player.countCards("h", card => get.color(card) === "red") > 0 }, run: lichFeast },
  fate_dazzle_wave: { info: { usable: 1, filter: (event, player) => game.hasPlayer(target=>target.isDamaged()) && player.getCards("h").some((card,index,cards)=>cards.some((other,i)=>i!==index && get.suit(other)===get.suit(card))) }, run: dazzleWave },
  fate_keeper_wave: { info: { usable: 1, filter: (event, player) => new Set(player.getCards("h").map(card => get.suit(card))).size >= 3 }, run: keeperWave },
  fate_techies_bomb: { info: { usable: 1, filter: (event, player) => player.getExpansions("fate_bomb").length < 2 && player.countCards("h", card => get.name(card) === "sha") > 0 }, run: techiesBomb },
  fate_keeper_favor: { info: { usable: 1, filter: () => game.countPlayer() > 0 }, run: keeperFavor },
};
registerPhaseUseActiveSkills(active);

export const INTELLIGENCE_HERO_CARDS = {
  fate_jakiro_ice_effect: trick(other, async (event, trigger, player) => { const target = event.target; await freezeIcePrison(player, target, target.getCards("h").randomGets(2)); }),
  fate_lich_feast_effect: trick(() => true, async (event, trigger, player) => { await player.draw(2); }),
  fate_shadow_wave_effect: trick(() => true, async (event, trigger, player) => { await event.target.damage({ num: 1, source: player }); }),
  fate_keeper_wave_effect: trick(other, async (event, trigger, player) => { await event.target.damage({ num: 1, source: player }); }),
  fate_heartstopper_effect_card: trick(() => true, async event => { queueStatus(event.target, ["fate_heartstopper_effect"]); }),
  fate_crystal_frost_effect_card: trick(() => true, async event => { queueStatus(event.target, ["fate_crystal_frost_effect", "fate_crystal_frost_attack"]); }),
  fate_shallow_grave_effect_card: trick(() => true, async event => { queueStatus(event.target, ["fate_shallow_grave"]); }),
};

export const INTELLIGENCE_HERO_SKILLS = {
  fate_lina_soul: { enable: "phaseUse", usable: 1, filter: active.fate_lina_soul.info.filter, async content(event, trigger, player) { await linaSoul(player); } },
  fate_lina_soul_ready: { charlotte: true },
  fate_lina_laguna: { enable: "chooseToUse", filterCard: true, selectCard: 2, position: "h", viewAs: { name: "fate_laguna_blade" }, filterCard(card) { return get.color(card) === "red"; }, prompt: "将2张红色手牌当【神灭斩】使用" },
  fate_necro_heartstopper: { trigger: { global: "fateCastPhase" }, forced: true, filter(event, player) { return player.countCards("h", card => get.suit(card) === "spade") > 0; }, async content(event, trigger, player) { const useful = target => target !== player && isUsefulCastTarget("heartstopper", { attitude: get.attitude(player, target), damaged: target.isDamaged() }); if (player !== game.me && !game.hasPlayer(useful)) return; if (player === game.me && !(await player.chooseBool("竭心光环：是否发动？").forResult()).bool) return; const target = (await player.chooseTarget("竭心光环：选择一名角色", true).set("ai", target => useful(target) ? hostileTarget(target, player) : -Infinity).forResult()).targets?.[0]; if (!target) return; const paid = await discard(player, 1, "竭心光环：将1张黑桃手牌置入状态区", card => get.suit(card) === "spade"); if (paid.bool) await player.useCard({ name: "fate_heartstopper_effect_card", isCard: true }, target); } },
  fate_heartstopper_effect: { charlotte: true, mark: true, marktext: "竭", intro: { content: "本回合不能回复血量。" }, trigger: { player: "recoverBefore" }, forced: true, async content(event, trigger) { trigger.cancel(); } },
  fate_ice_prison_target: { charlotte: true, mark: true, marktext: "冰", intro: { content: "本回合结束时收回被冰封的手牌。" } },
  fate_necro_sadism: { trigger: { global: "dieAfter" }, direct: true, filter(event, player) { return event.player !== player; }, async content(event, trigger, player) { if ((await player.chooseBool("施虐之心：是否额外摸2张牌？").set("ai", () => true).forResult()).bool) await player.draw(2); } },
  fate_jakiro_ice: { enable: "phaseUse", usable: 1, filter: active.fate_jakiro_ice.info.filter, async content(event, trigger, player) { await jakiroIce(player); } },
  fate_ice_prison_release: { charlotte: true, trigger: { player: "phaseAfter" }, forced: true, popup: false, async content(event, trigger, player) { await releaseIcePrison(player, game.players.concat(game.dead)); } },
  fate_jakiro_liquid_fire: { enable: "chooseToUse", selectCard: 2, position: "h", viewAs: { name: "sha", nature: "fate_fire" }, filterCard(card) { return get.color(card) === "red"; }, prompt: "将2张红色手牌当火焰攻击使用，伤害+1", onuse(result) { result.card.storage ||= {}; result.card.storage.fateLiquidFire = true; }, group: "fate_jakiro_liquid_fire_damage" },
  fate_jakiro_liquid_fire_damage: { charlotte: true, trigger: { source: "damageBegin1" }, forced: true, popup: false, filter(event) { return event.card?.name === "sha" && event.card.storage?.fateLiquidFire; }, async content(event,trigger) { trigger.num += 1; } },
  fate_crystal_frost: { trigger: { global: "fateCastPhase" }, forced: true, filter(event, player) { return player.countCards("h") >= 2 && game.hasPlayer(target => target !== player); }, async content(event, trigger, player) { const useful = target => target !== player && isUsefulCastTarget("crystal_frost", { attitude: get.attitude(player, target), hand: target.countCards("h") }); if (player !== game.me && (player.countCards("h") < 3 || !game.hasPlayer(useful))) return; if (player === game.me && !(await player.chooseBool("冰霜禁制：是否发动？").forResult()).bool) return; const target = (await player.chooseTarget("冰霜禁制：选择一名角色", true).set("ai", target => useful(target) ? hostileTarget(target, player) : -Infinity).forResult()).targets?.[0]; if (!target) return; const paid = await discard(player, 2, "冰霜禁制：弃置2张手牌"); if (paid.bool) await player.useCard({ name: "fate_crystal_frost_effect_card", isCard: true }, target); } },
  fate_crystal_frost_effect: { charlotte: true, mark: true, marktext: "霜", intro: { content: "本回合攻击和闪避须额外支付同名牌。" }, trigger: { global: "useCardToTargeted" }, forced: true, popup: false, filter(event, player) { return event.card?.name === "sha" && event.player !== player && event.target === player; }, async content(event, trigger, player) { const use = trigger.getParent(); const map = use.customArgs || (use.customArgs = { default: {} }); map[player.playerid] ||= {}; const current = map[player.playerid].shanRequired || 1; map[player.playerid].shanRequired = requiredDodges({ base: current, frozen: true }); } },
  fate_crystal_frost_attack: { charlotte: true, trigger: { player: "useCardBefore" }, forced: true, popup: false, filter(event) { return event.card?.name === "sha"; }, async content(event, trigger, player) { const used = trigger.cards || []; const available = player.countCards("h", card => get.name(card) === "sha" && !used.includes(card)); if (!available) { trigger.cancel(); return; } const paid = await player.chooseToDiscard("h", 1, true).set("prompt", "冰霜禁制：额外弃置1张攻击").set("filterCard", card => get.name(card) === "sha" && !used.includes(card)).forResult(); if (!paid.bool) trigger.cancel(); } },
  fate_crystal_aura: { trigger: { player: "phaseDrawBegin2" }, direct: true, filter(event, player) { return event.num > 0; }, async content(event, trigger, player) { if (!(await player.chooseBool("辉煌光环：少摸1张牌，改为查看并均分牌堆顶牌？").forResult()).bool) return; trigger.num -= 1; const max = game.countPlayer(); const countResult = await player.chooseControl(...Array.from({ length: max }, (_, index) => `${index + 1}张`)).set("prompt", `辉煌光环：选择X（最多${max}）`).set("ai", () => `${max}张`).forResult(); const count = Number.parseInt(countResult.control, 10) || 1; const cards = get.cards(count); const assigned = []; player.showCards(cards, "辉煌光环"); for (const card of cards) { const target = (await player.chooseTarget("辉煌光环：选择一名未分配过此牌的角色", true, (card, source, current) => !assigned.includes(current)).forResult()).targets?.[0]; if (target) { assigned.push(target); await target.gain(card, "gain2"); } } } },
  fate_lich_feast: { enable: "phaseUse", usable: 1, filter: active.fate_lich_feast.info.filter, async content(event, trigger, player) { await lichFeast(player); } },
  fate_lich_armor: { trigger: { player: "damageEnd" }, direct: true, filter(event, player) { return event.num > 0 && event.source?.isAlive() && event.source.countCards("he") > 0; }, async content(event, trigger, player) { if ((await player.chooseBool(`霜冻护甲：是否弃掉${get.translation(trigger.source)}的1张牌？`).set("ai", () => true).forResult()).bool) await player.discardPlayerCard(trigger.source, "he", true); } },
  fate_dazzle_grave: { trigger: { global: "fateCastPhase" }, forced: true, filter(event, player) { return player.countCards("h", card => get.color(card) === "red") > 0; }, async content(event, trigger, player) { const useful = target => isUsefulCastTarget("shallow_grave", { attitude: get.attitude(player, target), hp: target.hp }); if (player !== game.me && !game.hasPlayer(useful)) return; if (player === game.me && !(await player.chooseBool("薄葬：是否发动？").forResult()).bool) return; const target = (await player.chooseTarget("薄葬：选择一名角色", true).set("ai", target => useful(target) ? get.attitude(player, target) * 4 : -Infinity).forResult()).targets?.[0]; if (!target) return; const paid = await discard(player, 1, "薄葬：弃置1张红色手牌", card => get.color(card) === "red"); if (paid.bool) await player.useCard({ name: "fate_shallow_grave_effect_card", isCard: true }, target); } },
  fate_shallow_grave: { charlotte: true, mark: true, marktext: "薄", intro: { content: "本回合濒死时回复至1点血。" }, trigger: { player: "dying" }, forced: true, async content(event, trigger, player) { if (player.hp <= 0) await player.recover(1 - player.hp); } },
  fate_dazzle_wave: { enable: "phaseUse", usable: 1, filter: active.fate_dazzle_wave.info.filter, async content(event, trigger, player) { await dazzleWave(player); } },
  fate_ogre_multicast: { trigger: { player: "useCardAfter" }, direct: true, filter(event) { return MAGIC_NAMES.has(event.card?.name) && event.card.name !== "wuxie" && !event.card.storage?.fateMulticast && !event._neutralized && !event.fateDispelledBy?.length && !event.all_excluded; }, async content(event, trigger, player) { const info = get.info(trigger.card, false); const canRetarget = target => { if (!target.isAlive()) return false; if (trigger.card.name === "fate_fanatical" && player.hasSkill("fate_unlimited_attack")) return false; return typeof info?.filterTarget === "function" && info.filterTarget(trigger.card, player, target); }; const candidates = game.filterPlayer(canRetarget); const useful = target => target === player || get.attitude(player, target) < 0; const aiCandidates = candidates.filter(useful); if (player !== game.me && !aiCandidates.length) return; if (!(await player.chooseBool("多重施法：是否进行判定？").set("ai",()=>aiCandidates.length>0).forResult()).bool) return; player.logSkill("fate_ogre_multicast"); const judge = await player.judge(card => get.color(card) === "red" ? 1 : -1).forResult(); if (!judge.bool) return; const target = (await player.chooseTarget(`多重施法：选择再次结算【${get.translation(trigger.card)}】的目标`, true, (card, source, current) => candidates.includes(current)).set("ai", target => useful(target) ? (target === player ? 2 : Math.max(0, hostileTarget(target, player))) : -Infinity).forResult()).targets?.[0]; if (target) await player.useCard({ name: trigger.card.name, isCard: true, storage: { ...(trigger.card.storage || {}), fateMulticast: true } }, target); } },
  fate_keeper_wave: { enable: "phaseUse", usable: 1, filter: active.fate_keeper_wave.info.filter, async content(event, trigger, player) { await keeperWave(player); } },
  fate_keeper_chakra: { enable: "phaseUse", usable: 1, filterCard(card) { return get.color(card) === "black"; }, position: "h", viewAs: { name: "fate_chakra" }, prompt: "将1张黑色手牌当【查克拉】使用" },
  fate_keeper_favor: { charlotte: true },
  fate_techies_bomb: { enable: "phaseUse", usable: 1, filter: active.fate_techies_bomb.info.filter, async content(event, trigger, player) { await techiesBomb(player); } },
  fate_techies_detonate: { trigger: { global: ["useCardBefore", "respondBefore"] }, direct: true, filter(event, player) { return event.player !== player && player.getExpansions("fate_bomb").some(card => get.suit(card) === get.suit(event.card)); }, async content(event, trigger, player) { const bombs = player.getExpansions("fate_bomb").filter(card => get.suit(card) === get.suit(trigger.card)); if (player !== game.me && !isUsefulCastTarget("techies_detonate", { attitude: get.attitude(player, trigger.player) })) return; if (player === game.me && !(await player.chooseBool("引爆：是否弃置同花色炸弹并造成伤害？").set("ai", () => true).forResult()).bool) return; const choices = Array.from({ length: bombs.length }, (_, index) => `${index + 1}枚`); const count = bombs.length === 1 ? 1 : Number.parseInt((await player.chooseControl(choices).set("prompt", "引爆：选择弃置数量").set("ai", () => `${bombs.length}枚`).forResult()).control, 10) || 1; const selected = bombs.slice(0, count); await player.loseToDiscardpile(selected); await player.draw(selected.length); await trigger.player.damage({ num: selected.length, source: player }); } },
  fate_techies_suicide: { trigger: { player: "die" }, direct: true, forceDie: true, filter(event) { return event.source?.isAlive(); }, async content(event, trigger, player) { if (!(await player.chooseBool("自爆：是否令击杀者判定？").set("forceDie",true).forResult()).bool) return; const judge = await trigger.source.judge(card => get.color(card) === "red" ? 1 : -1).forResult(); if (judge.bool) await trigger.source.damage({ num: 2, source: player }); } },
  fate_enchantress_heal: { trigger: { player: "recoverEnd" }, direct: true, filter(event,player) { return event.num>0 && player.countCards("h",card=>get.color(card)==="red")>0 && game.hasPlayer(target=>target!==player && target.isDamaged()); }, async content(event,trigger,player) {
    for(let i=0;i<trigger.num;i++) {
      if(!player.countCards("h",card=>get.color(card)==="red") || !game.hasPlayer(target=>target!==player && target.isDamaged())) break;
      if(!(await player.chooseBool("治疗术：弃1张红色手牌，令另一名角色回复1点血？").forResult()).bool) break;
      const target=(await player.chooseTarget("治疗术：选择另一名受伤角色",true,(card,source,target)=>source!==target && target.isDamaged()).forResult()).targets?.[0];
      if(!target) break;
      const paid=await discard(player,1,"治疗术：弃置1张红色手牌",card=>get.color(card)==="red");
      if(paid.bool) {player.logSkill("fate_enchantress_heal",target);await target.recover();}
    }
  } },
  fate_enchantress_dispel: { enable: ["chooseToUse","chooseToRespond"], hiddenCard(player,name) { return name === "wuxie" && player.countCards("h", card => get.suit(card) === "heart") > 0; }, viewAsFilter(player) { return player.countCards("h", card => get.suit(card) === "heart") > 0; }, filterCard(card) { return get.suit(card) === "heart"; }, position: "h", viewAs: { name: "wuxie" }, prompt: "将红桃手牌当【驱散】打出", ai: { respondWuxie: true } },
  fate_enchantress_control: { trigger: { global: "useCardAfter" }, direct: true, filter(event,player) { return MAGIC_NAMES.has(event.card?.name) && event.card.name!=="wuxie" && event.fateDispelledBy?.includes(player.playerid) && event.cards?.some(card=>["o","d"].includes(get.position(card,true))); }, async content(event,trigger,player) {
    const cards=trigger.cards.filter(card=>["o","d"].includes(get.position(card,true)));
    if(cards.length && (await player.chooseBool("魔法掌控：收回被成功驱散的魔法牌？").set("ai",()=>true).forResult()).bool) {player.logSkill("fate_enchantress_control");await player.gain(cards,"gain2");}
  } },
};

export const INTELLIGENCE_HERO_TRANSLATIONS = Object.fromEntries(Object.entries({
  fate_lina_soul: ["炽魂", "出牌阶段限一次：本回合首次强化魔法不消耗怒气。"], fate_lina_laguna: ["神灭斩", "将2张红色手牌当【神灭斩】使用。"],
  fate_necro_heartstopper: ["竭心光环", "施法阶段可弃1张黑桃手牌，令一名角色本回合无法回复血量。"], fate_heartstopper_effect: ["竭心光环", "本回合不能回复血量。"], fate_necro_sadism: ["施虐之心", "其他角色死亡后可摸2张牌。"],
  fate_jakiro_ice: ["冰封", "出牌阶段限一次：弃1张牌，抽取其他角色2张手牌暗置于桌面；你的回合结束时，该角色收回这些牌。"], fate_ice_prison_target: ["冰封", "本回合结束时收回被冰封的手牌。"], fate_jakiro_liquid_fire: ["液态火", "将2张红色手牌当火焰攻击使用；以此法使用的火焰攻击伤害+1。"],
  fate_crystal_frost: ["冰霜禁制", "施法阶段可弃2张手牌，令目标本回合使用攻击或闪避时须额外弃置同名牌。"], fate_crystal_frost_effect: ["冰霜禁制", "本回合攻击和闪避须额外支付同名牌。"], fate_crystal_aura: ["辉煌光环", "摸牌阶段可少摸1张，查看牌堆顶X张牌并分给X名不同角色（X不超过存活角色数）。"],
  fate_lich_feast: ["邪恶祭祀", "出牌阶段限一次：弃1张红色手牌，摸2张牌。"], fate_lich_armor: ["霜冻护甲", "受到伤害后可弃掉伤害来源1张牌。"],
  fate_dazzle_grave: ["薄葬", "施法阶段可弃1张红色手牌，令目标本回合濒死时回复至1点血。"], fate_shallow_grave: ["薄葬", "本回合濒死时回复至1点血。"], fate_dazzle_wave: ["暗影波", "出牌阶段限一次：弃2张同花色牌，令一名受伤角色回复1点血，并令另一名角色受到1点伤害。"],
  fate_ogre_multicast: ["多重施法", "魔法牌未被驱散且结算后可判定；红色时可更改目标，再结算一次该效果。"], fate_keeper_wave: ["冲击波", "出牌阶段限一次：弃3张不同花色牌，对至多2名角色各造成1点伤害。"], fate_keeper_chakra: ["查克拉", "出牌阶段每回合限一次：将1张黑色手牌当【查克拉】使用。"], fate_keeper_favor: ["恩惠", "你可以对任意1名角色使用【查克拉】。"],
  fate_techies_bomb: ["遥控炸弹", "出牌阶段限一次：将1张攻击暗置为炸弹，至多2枚。"], fate_techies_detonate: ["引爆", "其他角色使用或打出同花色牌的结算前，可弃置X枚该花色炸弹，摸X张牌并对其造成X点伤害。"], fate_techies_suicide: ["自爆", "死亡时可令击杀者判定；红色则对其造成2点伤害。"],
  fate_enchantress_heal: ["治疗术", "每回复1点血量，可弃1张红色手牌，令另一名受伤角色回复1点血。"], fate_enchantress_dispel: ["驱散精灵", "红桃手牌可当【驱散】使用。"], fate_enchantress_control: ["魔法掌控", "你可将你成功驱散的魔法牌收为手牌。"],
}).flatMap(([id, [name, info]]) => [[id, name], [`${id}_info`, info]]));
