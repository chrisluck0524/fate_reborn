import { game, get, _status } from "noname";

const pendingGuardDamage = new Map();
let nextGuardToken = 1;
const hostileTarget = (target, player) => get.damageEffect(target, player, player);

const trickAi = target => ({
  basic: { order: 7, useful: 1, value: 1 },
  result: { target },
});

function activeEffect(filterTarget, content, targetAi = -1) {
  return {
    type: "trick",
    enable: false,
    wuxieable: true,
    filterTarget,
    content,
    ai: trickAi(targetAi),
  };
}

const phaseUseActiveSkills = ["fate_death_coil", "fate_sacrifice", "fate_battle_hunger"];
const phaseUseActiveRegistry = new Map();

export function registerPhaseUseActiveSkills(entries) {
  for (const [skill, entry] of Object.entries(entries)) {
    phaseUseActiveRegistry.set(skill, entry);
    if (!phaseUseActiveSkills.includes(skill)) phaseUseActiveSkills.push(skill);
  }
}

function canUsePhaseSkill(player, skill) {
  const info = phaseUseActiveRegistry.get(skill)?.info || STRENGTH_HERO_SKILLS[skill];
  if (!info || !player.hasSkill(skill)) return false;
  if ((player.getStat().skill?.[skill] || 0) >= (info.usable || Infinity)) return false;
  return !info.filter || info.filter(null, player);
}

function recordPhaseSkillUse(player, skill) {
  const stat = player.getStat();
  stat.skill ||= {};
  stat.skill[skill] = (stat.skill[skill] || 0) + 1;
}

async function performDeathCoil(player) {
  await player.damage({ num: 1, source: player, nocard: true });
  if (!player.isAlive()) return;
  const targetResult = await player.chooseTarget("死亡缠绕：选择另一名角色", true, (card, source, target) => source !== target).set("ai", target => Math.max(hostileTarget(target, player), get.attitude(player, target) > 0 && target.isDamaged() ? 3 : -2)).forResult();
  const target = targetResult.targets?.[0];
  if (!target) return;
  const control = await player.chooseControl("令其回复1点血", "削减手牌与怒气").set("prompt", "死亡缠绕：选择效果").set("ai", () => get.attitude(player, target) > 0 && target.isDamaged() ? "令其回复1点血" : "削减手牌与怒气").forResult();
  const mode = control.control === "令其回复1点血" ? "heal" : "harm";
  await player.useCard({ name: "fate_death_coil_effect", isCard: true, storage: { mode } }, target);
}

async function performSacrifice(player) {
  await player.damage({ num: 1, source: player, nocard: true });
  if (!player.isAlive()) return;
  const result = await player.chooseTarget("牺牲：选择弃掉其两张手牌的角色", true, (card, source, target) => source !== target && target.countCards("h") > 0).set("ai", target => hostileTarget(target, player)).forResult();
  if (result.targets?.[0]) await player.useCard({ name: "fate_sacrifice_effect", isCard: true }, result.targets[0]);
}

async function performBattleHunger(player) {
  const paid = await player.chooseToDiscard("h", 1, true).set("prompt", "战争饥渴：弃置1张手牌作为费用").forResult();
  if (!paid.bool) return;
  const targetResult = await player.chooseTarget("战争饥渴：选择另一名角色", true, (card, source, target) => source !== target).set("ai", target => hostileTarget(target, player)).forResult();
  if (targetResult.targets?.[0]) await player.useCard({ name: "fate_battle_hunger_effect", isCard: true }, targetResult.targets[0]);
}

export async function usePhaseUseActiveSkill(player, skill) {
  const runner = phaseUseActiveRegistry.get(skill)?.run;
  if (runner) return runner(player);
  if (skill === "fate_death_coil") return performDeathCoil(player);
  if (skill === "fate_sacrifice") return performSacrifice(player);
  if (skill === "fate_battle_hunger") return performBattleHunger(player);
}

export const ACTIVE_SKILL_PROMPT = {
  trigger: { player: "phaseUseBegin" },
  forced: true,
  popup: false,
  filter(event, player) {
    return !_status.auto && phaseUseActiveSkills.some(skill => canUsePhaseSkill(player, skill));
  },
  async content(event, trigger, player) {
    const skills = phaseUseActiveSkills.filter(skill => canUsePhaseSkill(player, skill));
    const controls = ["暂不发动", ...skills.map(skill => get.translation(skill))];
    const result = await player
      .chooseControl(controls)
      .set("prompt", "主动技能：选择要发动的技能")
      .set("prompt2", "主动技能每回合限一次；选择“暂不发动”后仍可继续正常出牌。")
      .set("ai", () => skills[0] ? get.translation(skills[0]) : "暂不发动")
      .forResult();
    const skill = skills.find(name => get.translation(name) === result.control);
    if (!skill) return;
    recordPhaseSkillUse(player, skill);
    await usePhaseUseActiveSkill(player, skill);
  },
};

export const STRENGTH_HERO_CARDS = {
  fate_death_coil_effect: activeEffect(
    (card, player, target) => player !== target,
    async (event, trigger, player) => {
      const target = event.target;
      if (event.card.storage?.mode === "heal") {
        await target.recover();
        return;
      }
      if (target.countCards("h") > 0 && target.countMark("fate_rage_rule") > 0) {
        await target.discard(target.getCards("h").randomGet());
        target.removeMark("fate_rage_rule", 1);
      } else await target.damage({ num: 1, source: player });
    },
  ),
  fate_sacrifice_effect: activeEffect(
    (card, player, target) => player !== target && target.countCards("h") > 0,
    async event => {
      const cards = event.target.getCards("h").randomGets(2);
      if (cards.length) await event.target.discard(cards);
    },
  ),
  fate_purification_effect: activeEffect(
    () => true,
    async (event, trigger, player) => {
      const target = event.target;
      await target.recover();
      const source = game.players.concat(game.dead).find(current => current.playerid === event.card.storage?.damageSourceId);
      if (source?.isAlive()) await source.damage({ num: 1, source: player });
    },
    1,
  ),
  fate_battle_hunger_effect: activeEffect(
    (card, player, target) => player !== target,
    async (event, trigger, player) => {
      const result = await event.target
        .chooseToUse({
          filterCard: card => get.name(card) === "sha",
          filterTarget: (card, source, target) => target === get.event().hungerSource,
          selectTarget: 1,
          targetRequired: true,
          prompt: `战争饥渴：对${get.translation(player)}使用一张攻击，否则受到1点伤害`,
          hungerSource: player,
        })
        .forResult();
      if (!result.bool && event.target.isAlive()) await event.target.damage({ num: 1, source: player });
    },
  ),
  fate_guard_effect: activeEffect(
    () => true,
    async (event, trigger, player) => {
      const damage = pendingGuardDamage.get(event.card.storage?.guardToken);
      if (!damage || damage._cancelled || damage.player?.isDead()) return;
      damage.cancel();
      await player.damage({
        num: damage.num,
        nature: damage.nature,
        source: damage.source,
        card: damage.card,
        cards: damage.cards,
      });
    },
    1,
  ),
};

export const STRENGTH_HERO_SKILLS = {
  fate_death_coil: {
    enable: "phaseUse",
    usable: 1,
    filter(event, player) {
      return player.hp > 0 && game.hasPlayer(target => target !== player);
    },
    async content(event, trigger, player) {
      await performDeathCoil(player);
    },
    ai: { order: 7, result: { player: 1 } },
  },
  fate_frostmourne: {
    trigger: { source: "damageEnd" },
    direct: true,
    filter(event, player) {
      return event.num > 0 && event.card?.name === "sha" && event.player?.isAlive() && player.countCards("hs", card => get.name(card) === "sha") > 0;
    },
    async content(event, trigger, player) {
      await player
        .chooseToUse({
          filterCard: card => get.name(card) === "sha",
          filterTarget: (card, source, target) => target === get.event().frostmourneTarget,
          selectTarget: 1,
          targetRequired: true,
          addCount: false,
          prompt: `霜之哀伤：可继续对${get.translation(trigger.player)}使用一张攻击`,
          frostmourneTarget: trigger.player,
        });
    },
  },
  fate_reincarnation: {
    trigger: { player: "dying" },
    limited: true,
    skillAnimation: true,
    animationColor: "orange",
    filter(event, player) {
      return player.hp <= 0;
    },
    async content(event, trigger, player) {
      player.awakenSkill("fate_reincarnation");
      const cards = player.getCards("h");
      if (cards.length) await player.discard(cards);
      const rage = player.countMark("fate_rage_rule");
      if (rage) player.removeMark("fate_rage_rule", rage);
      await player.recover(player.maxHp - player.hp);
    },
  },
  fate_vampiric_aura: {
    trigger: { source: "damageEnd" },
    filter(event, player) {
      return event.num > 0 && event.card?.name === "sha" && player.isDamaged();
    },
    async content(event, trigger, player) {
      const result = await player.judge(card => (get.color(card) === "red" ? 1 : -1)).forResult();
      if (result.bool) await player.recover();
    },
  },
  fate_warpath: {
    trigger: { player: "damageEnd" },
    filter(event) {
      return event.num > 0;
    },
    async content(event, trigger, player) {
      const result = await player.judge(card => (get.color(card) === "red" ? 1 : -1)).forResult();
      if (!result.bool) return;
      const chosen = await player.chooseTarget("战意：选择一名角色", true).forResult();
      const target = chosen.targets?.[0];
      if (!target) return;
      const dodge = await target.chooseToRespond({ card: { name: "shan" } }).set("prompt", "战意：打出一张闪避，否则受到1点伤害").forResult();
      if (!dodge.bool && target.isAlive()) await target.damage({ num: 1, source: player });
    },
  },
  fate_bristleback: {
    trigger: { player: "damageBegin4" },
    forced: true,
    filter(event) {
      return event.num > 1;
    },
    async content(event, trigger) {
      trigger.num -= 1;
    },
  },
  fate_sacrifice: {
    enable: "phaseUse",
    usable: 1,
    filter(event, player) {
      return player.hp > 0 && game.hasPlayer(target => target !== player && target.countCards("h") > 0);
    },
    async content(event, trigger, player) {
      await performSacrifice(player);
    },
    ai: { order: 7, result: { player: 1 } },
  },
  fate_berserkers_blood: {
    trigger: { source: "damageBegin1" },
    forced: true,
    filter(event, player) {
      return player.hp <= 2 && event.card?.name === "sha";
    },
    async content(event, trigger) {
      trigger.num += 1;
    },
  },
  fate_purification: {
    trigger: { global: "damageEnd" },
    direct: true,
    filter(event, player) {
      if (!event.player?.isAlive() || event.num <= 0) return false;
      const hasTao = player.countCards("h", card => get.name(card) === "tao") > 0;
      const redCount = player.countCards("h", card => get.color(card) === "red");
      return hasTao || redCount >= 2;
    },
    async content(event, trigger, player) {
      const wantsToUse = await player
        .chooseBool(`是否发动洗礼救助${get.translation(trigger.player)}？`)
        .set("ai", () => get.attitude(player, trigger.player) > 0)
        .forResult();
      if (!wantsToUse.bool) return;
      const hasTao = player.countCards("h", card => get.name(card) === "tao") > 0;
      const hasTwoRed = player.countCards("h", card => get.color(card) === "red") >= 2;
      let payment = hasTao ? "治疗药膏" : "两张红色牌";
      if (hasTao && hasTwoRed) {
        const choice = await player.chooseControl("治疗药膏", "两张红色牌").set("prompt", "洗礼：选择支付方式").forResult();
        payment = choice.control;
      }
      if (!payment) return;
      const result = await player
        .chooseToDiscard("h", payment === "治疗药膏" ? 1 : 2, true)
        .set("prompt", `洗礼：弃置${payment}`)
        .set("filterCard", card => (payment === "治疗药膏" ? get.name(card) === "tao" : get.color(card) === "red"))
        .forResult();
      if (!result.bool) return;
      await player.useCard(
        { name: "fate_purification_effect", isCard: true, storage: { damageSourceId: trigger.source?.playerid } },
        trigger.player,
      );
    },
  },
  fate_battle_hunger: {
    enable: "phaseUse",
    usable: 1,
    position: "h",
    filterCard: true,
    filterTarget(card, player, target) {
      return player !== target;
    },
    async content(event, trigger, player) {
      await player.useCard({ name: "fate_battle_hunger_effect", isCard: true }, event.target);
    },
    ai: { order: 7, result: { target: -1 } },
  },
  fate_counter_helix: {
    trigger: { target: "useCardToTargeted" },
    filter(event) {
      return event.card?.name === "sha" && event.player?.isAlive();
    },
    async content(event, trigger, player) {
      const result = await player.judge(card => {
        const number = get.number(card);
        return get.color(card) === "red" && number >= 2 && number <= 10 ? 1 : -1;
      }).forResult();
      if (result.bool && trigger.player.isAlive()) await trigger.player.damage({ num: 1, source: player });
    },
  },
  fate_guard: {
    trigger: { global: "damageBegin4" },
    direct: true,
    filter(event, player) {
      return event.player !== player && event.player?.isAlive() && event.num > 0 && player.countCards("h") > 0;
    },
    async content(event, trigger, player) {
      const paid = await player.chooseToDiscard("h", 1).set("prompt", `援护：弃1张手牌，替${get.translation(trigger.player)}承受此次伤害`).forResult();
      if (!paid.bool) return;
      const guardToken = nextGuardToken++;
      pendingGuardDamage.set(guardToken, trigger);
      await player.useCard({ name: "fate_guard_effect", isCard: true, storage: { guardToken } }, trigger.player);
      pendingGuardDamage.delete(guardToken);
    },
  },
  fate_faith: {
    trigger: { player: "damageEnd" },
    filter(event) {
      return event.num > 0;
    },
    async content(event, trigger, player) {
      const cards = get.cards(trigger.num);
      if (!cards.length) return;
      const expansion = player.addToExpansion(cards, "gain2");
      expansion.gaintag.add("fate_faith");
    },
    group: "fate_faith_collect",
  },
  fate_faith_collect: {
    trigger: { player: "phaseUseBegin" },
    forced: true,
    popup: false,
    filter(event, player) {
      return player.getExpansions("fate_faith").length > 0;
    },
    async content(event, trigger, player) {
      await player.gain(player.getExpansions("fate_faith"), "gain2");
    },
  },
  fate_fatherly_love: {
    trigger: { player: "phaseDrawBegin" },
    direct: true,
    filter(event, player) {
      return player.getExpansions("fate_faith").length > 0 && game.hasPlayer(target => target !== player);
    },
    async content(event, trigger, player) {
      let distributed = 0;
      for (const card of player.getExpansions("fate_faith").slice()) {
        const result = await player
          .chooseTarget(`父爱：将一张“信仰”牌交给其他角色（已分配${distributed}张）`, (current, source, target) => source !== target)
          .set("ai", target => get.attitude(player, target))
          .forResult();
        const target = result.targets?.[0];
        if (!target) break;
        await player.give(card, target);
        distributed += 1;
      }
      if (distributed >= 2 && player.isDamaged()) await player.recover(Math.floor(distributed / 2));
    },
  },
};

export const STRENGTH_HERO_TRANSLATIONS = {
  fate_death_coil: "死亡缠绕",
  fate_death_coil_info: "出牌阶段限一次：先对自己造成1点伤害；若存活，令另一名角色回复1点血，或弃其1张手牌并令其失去1点怒气。其缺少手牌或怒气时，改为对其造成1点伤害。后续效果可被驱散。",
  fate_frostmourne: "霜之哀伤",
  fate_frostmourne_info: "你的攻击命中后，可继续对该目标使用一张攻击。",
  fate_reincarnation: "重生",
  fate_reincarnation_info: "限定技。濒死时可弃置所有手牌并清空怒气，将血量回复至上限。",
  fate_vampiric_aura: "吸血",
  fate_vampiric_aura_info: "攻击造成伤害后可判定；若为红色，你回复1点血。",
  fate_warpath: "战意",
  fate_warpath_info: "受到伤害后可判定；若为红色，指定一名角色打出闪避，否则其受到你造成的1点伤害。",
  fate_bristleback: "刚毛后背",
  fate_bristleback_info: "你受到大于1点的伤害时，该伤害-1。",
  fate_sacrifice: "牺牲",
  fate_sacrifice_info: "出牌阶段限一次：先对自己造成1点伤害；若存活，弃掉另一名角色至多2张手牌。后续效果可被驱散。",
  fate_berserkers_blood: "沸血之矛",
  fate_berserkers_blood_info: "血量不高于2时，你的攻击伤害+1。",
  fate_purification: "洗礼",
  fate_purification_info: "角色受到伤害后，可弃1张治疗药膏或2张红色手牌：该角色回复1点血，你对伤害来源造成1点伤害。效果可被驱散。",
  fate_battle_hunger: "战争饥渴",
  fate_battle_hunger_info: "出牌阶段限一次：弃1张手牌，令另一名角色对你使用攻击，否则其受到你造成的1点伤害。效果可被驱散。",
  fate_counter_helix: "反转螺旋",
  fate_counter_helix_info: "成为攻击目标时可判定；若为红色2至10，你对攻击来源造成1点伤害。",
  fate_guard: "援护",
  fate_guard_info: "其他角色受到伤害前，可弃1张手牌替其承受该伤害。效果可被驱散。",
  fate_faith: "信仰",
  fate_faith_info: "每受到1点伤害，将牌堆顶1张牌暗置为“信仰”；出牌阶段开始时收入手牌。",
  fate_fatherly_love: "父爱",
  fate_fatherly_love_info: "摸牌阶段，可将任意张“信仰”牌交给其他角色；每分配2张，你回复1点血。",
  fate_death_coil_effect: "死亡缠绕",
  fate_sacrifice_effect: "牺牲",
  fate_purification_effect: "洗礼",
  fate_battle_hunger_effect: "战争饥渴",
  fate_guard_effect: "援护",
};
