import { lib, game, ui, get } from "noname";
import { S_RAGE_COST } from "./rules.js";
import { gainFateRage } from "./rage.js";

const MAGIC_ENHANCEMENT_TEXT = Object.freeze({
  fate_disarm: "获得目标装备区的一张牌，代替弃置它。",
  fate_moon_arrow: "指定一种花色，代替指定红色或黑色。",
  fate_energy_transfer: "指定一名角色获得2张牌，并指定另一名角色不获得牌。",
  fate_greed: "由你选择一张手牌交给目标，代替随机交给。",
  fate_siren_song: "可以对自己使用海妖之歌。",
});

const basicAi = (target = -1) => ({
  basic: { order: 6, useful: 2, value: 5 },
  result: { target },
});

function pathTo(start, end, direction) {
  const path = [];
  let current = start[direction];
  while (current && current !== start && path.length <= game.players.length) {
    path.push(current);
    if (current === end) return path;
    current = current[direction];
  }
  return [];
}

export const CARD_DEFINITIONS = {
  fate_fanatical: {
    type: "trick",
    enable: true,
    selectTarget: -1,
    toself: true,
    filterTarget(card, player, target) {
      return player === target;
    },
    async content(event, trigger, player) {
      if (player.isAlive()) player.addTempSkill("fate_unlimited_attack", { player: "phaseAfter" });
    },
    ai: basicAi(1),
  },
  fate_misdirection: {
    type: "trick",
    enable: true,
    filterTarget(card, player, target) {
      return target.countMark("fate_rage_rule") > 0 && game.hasPlayer(current => current !== target && current.countMark("fate_rage_rule") < 3);
    },
    async content(event, trigger, player) {
      const source = event.target;
      const result = await player
        .chooseTarget("选择获得1点怒气的角色", true, (card, player, target) => target !== get.event().rageSource && target.countMark("fate_rage_rule") < 3)
        .set("rageSource", source)
        .set("ai", target => get.attitude(player, target))
        .forResult();
      const recipient = result.targets?.[0];
      if (!recipient) return;
      source.removeMark("fate_rage_rule", 1);
      await gainFateRage(recipient, 1);
      await source.draw();
    },
    ai: basicAi(-0.5),
  },
  fate_chakra: {
    type: "trick",
    enable: true,
    selectTarget: -1,
    toself: true,
    filterTarget(card, player, target) {
      return player === target;
    },
    async content(event, trigger, player) {
      await player.draw();
      let keepGuessing = true;
      while (keepGuessing) {
        const guess = await player
          .chooseControl("红色", "黑色")
          .set("prompt", "查克拉：猜测牌堆顶牌的颜色")
          .set("ai", () => ["红色", "黑色"].randomGet())
          .forResult();
        const revealed = get.cards(1);
        if (!revealed.length) break;
        player.showCards(revealed, "查克拉展示");
        const matched = get.color(revealed[0], false) === (guess.control === "红色" ? "red" : "black");
        if (matched) await player.gain(revealed, "gain2");
        else {
          await game.cardsDiscard(revealed);
          keepGuessing = false;
        }
      }
    },
    ai: basicAi(1),
  },
  fate_wild_axes: {
    type: "trick",
    enable: true,
    filterTarget(card, player, target) {
      return player !== target;
    },
    async content(event, trigger, player) {
      const clockwise = pathTo(player, event.target, "next");
      const counterClockwise = pathTo(player, event.target, "previous");
      let targets;
      if (clockwise.length === counterClockwise.length) {
        const choice = await player
          .chooseControl("顺时针", "逆时针")
          .set("prompt", "野性之斧：两条路径等长，请选择结算方向")
          .forResult();
        targets = choice.control === "逆时针" ? counterClockwise : clockwise;
      } else targets = clockwise.length < counterClockwise.length ? clockwise : counterClockwise;
      for (const target of targets) {
        if (!target.isAlive()) continue;
        const result = await target
          .chooseToRespond({ card: { name: "shan" } })
          .set("prompt", "野性之斧：打出一张闪避，否则受到1点伤害")
          .set("respondTo", [player, event.card])
          .forResult();
        if (!result.bool) await target.damage(player);
      }
    },
    ai: basicAi(-1),
  },
  fate_disarm: {
    type: "trick",
    enable: true,
    filterTarget(card, player, target) {
      return target.countCards("e") > 0;
    },
    async content(event, trigger, player) {
      if (event.card.storage?.fateEnhanced) await player.gainPlayerCard(event.target, "e", true);
      else await player.discardPlayerCard(event.target, "e", true);
    },
    ai: basicAi(-1),
  },
  fate_moon_arrow: {
    type: "trick",
    enable: true,
    filterTarget(card, player, target) {
      return player !== target;
    },
    async content(event, trigger, player) {
      const target = event.target;
      const enhanced = event.card.storage?.fateEnhanced;
      const choices = enhanced ? ["黑桃", "红桃", "梅花", "方块"] : ["红色", "黑色"];
      const choice = await player.chooseControl(choices).set("prompt", `月神之箭：指定一种${enhanced ? "花色" : "颜色"}`).set("ai", () => choices.randomGet()).forResult();
      const suitMap = { 黑桃: "spade", 红桃: "heart", 梅花: "club", 方块: "diamond" };
      const color = choice.control === "红色" ? "red" : "black";
      const result = await target
        .chooseToDiscard("h", 1)
        .set("prompt", `弃置一张${choice.control}手牌，否则受到1点伤害`)
        .set("filterCard", card => (enhanced ? get.suit(card) === suitMap[choice.control] : get.color(card) === color))
        .forResult();
      if (!result.bool) await target.damage(player);
    },
    ai: basicAi(-1),
  },
  fate_energy_transfer: {
    type: "trick",
    enable: true,
    selectTarget: -1,
    toself: true,
    filterTarget(card, player, target) {
      return player === target;
    },
    async content(event, trigger, player) {
      const recipients = game.players.slice();
      recipients.sortBySeat(player);
      const cards = get.cards(recipients.length);
      if (!cards.length) return;
      await game.cardsGotoOrdering(cards);
      player.showCards(cards, "能量转移");
      const counts = Object.fromEntries(recipients.map(target => [target.playerid, 1]));
      if (event.card.storage?.fateEnhanced && recipients.length > 1) {
        const extraResult = await player.chooseTarget("选择获得2张牌的角色", true, (card, player, target) => target.isAlive()).forResult();
        const extra = extraResult.targets?.[0] || player;
        const skipResult = await player
          .chooseTarget("选择不能获得牌的角色", true, (card, player, target) => target.isAlive() && target !== get.event().extraTarget)
          .set("extraTarget", extra)
          .forResult();
        const skip = skipResult.targets?.[0];
        counts[extra.playerid] = 2;
        if (skip) counts[skip.playerid] = 0;
      }
      for (const recipient of recipients) {
        for (let index = 0; index < counts[recipient.playerid]; index += 1) {
          const choice = cards.length === 1 ? { links: [cards[0]] } : await player.chooseButton([`选择交给${get.translation(recipient)}的牌`, cards], true).forResult();
          const selected = choice.links?.[0] || cards[0];
          cards.remove(selected);
          await recipient.gain(selected, "gain2");
        }
      }
    },
    ai: basicAi(1),
  },
  fate_greed: {
    type: "trick",
    enable: true,
    filterTarget(card, player, target) {
      return player !== target && (target.countCards("h") >= 2 || target.countCards("e") > 0);
    },
    async content(event, trigger, player) {
      const target = event.target;
      const controls = [];
      if (target.countCards("h") >= 2) controls.push("抽取两张手牌");
      if (target.countCards("e") > 0) controls.push("抽取一张装备");
      const result = controls.length === 1 ? { control: controls[0] } : await player.chooseControl(controls).set("prompt", "贪婪：选择抽取区域").forResult();
      const hidden = result.control === "抽取一张装备" ? target.getCards("e").randomGets(1) : target.getCards("h").randomGets(2);
      await target.lose(hidden, ui.special);
      if (player.countCards("h") > 0) {
        if (event.card.storage?.fateEnhanced) {
          const gift = await player.chooseCard("h", true, "贪婪强化：选择交给目标的一张手牌").forResult();
          if (gift.cards?.length) await player.give(gift.cards, target);
        } else await target.gain(player.getCards("h").randomGet(), player, "giveAuto");
      }
      await player.gain(hidden, "gain2");
    },
    ai: basicAi(-1),
  },
  fate_siren_song: {
    type: "trick",
    enable: true,
    filterTarget(card, player, target) {
      if (target.hasSkill("fate_siren_song_effect")) return false;
      return target !== player || player.countMark("fate_rage_rule") > 0;
    },
    async content(event) {
      event.target.addTempSkill("fate_siren_song_effect", { player: "phaseAfter" });
    },
    ai: basicAi(-1.5),
  },
  fate_divine_strength: {
    type: "trick",
    enable(card, player) {
      return player.countMark("fate_rage_rule") >= S_RAGE_COST.fate_divine_strength;
    },
    wuxieable: false,
    selectTarget: -1,
    toself: true,
    filterTarget(card, player, target) {
      return player === target;
    },
    async content(event, trigger, player) {
      await player.draw();
      player.addTempSkill("fate_divine_strength_effect", { player: "phaseAfter" });
    },
    ai: basicAi(1),
  },
  fate_viper_strike: {
    type: "trick",
    enable(card, player) {
      return player.countMark("fate_rage_rule") >= S_RAGE_COST.fate_viper_strike;
    },
    wuxieable: false,
    filterTarget(card, player, target) {
      return player !== target && !target.hasSkill("fate_skip_draw_once");
    },
    async content(event, trigger, player) {
      await event.target.damage(player);
      if (event.target.isAlive()) event.target.addSkill("fate_skip_draw_once");
    },
    ai: basicAi(-1.5),
  },
  fate_time_stop: {
    type: "trick",
    enable(card, player) {
      return player.countMark("fate_rage_rule") >= S_RAGE_COST.fate_time_stop;
    },
    wuxieable: false,
    selectTarget: -1,
    filterTarget(card, player, target) {
      return player !== target && !target.hasSkill("fate_time_stop_effect");
    },
    async content(event) {
      event.target.addTempSkill("fate_time_stop_effect", { player: "phaseAfter" });
    },
    ai: basicAi(-1),
  },
  fate_soul_separation: {
    type: "trick",
    enable(card, player) {
      return player.countMark("fate_rage_rule") >= S_RAGE_COST.fate_soul_separation;
    },
    wuxieable: false,
    filterTarget(card, player, target) {
      return player !== target;
    },
    async content(event, trigger, player) {
      const target = event.target;
      const playerHp = player.hp;
      player.hp = target.hp;
      target.hp = playerHp;
      player.update();
      target.update();
      if (player.hp === 1) await player.recover();
      if (target.hp === 1) await target.recover();
    },
    ai: basicAi(-0.5),
  },
  fate_laguna_blade: {
    type: "trick",
    enable(card, player) {
      return player.countMark("fate_rage_rule") >= S_RAGE_COST.fate_laguna_blade;
    },
    wuxieable: false,
    filterTarget(card, player, target) {
      return player !== target;
    },
    async content(event, trigger, player) {
      const target = event.target;
      let dodged = 0;
      while (dodged < 3) {
        const result = await target
          .chooseToRespond({ card: { name: "shan" } })
          .set("prompt", `神灭斩：还需打出${3 - dodged}张闪避`)
          .set("respondTo", [player, event.card])
          .forResult();
        if (!result.bool) break;
        dodged += 1;
      }
      if (dodged < 3) await target.damage(3 - dodged, player);
    },
    ai: basicAi(-2),
  },
};

export const SPECIAL_SKILLS = {
  fate_magic_enhance: {
    trigger: { player: "useCard1" },
    direct: true,
    firstDo: true,
    priority: 20,
    filter(event, player) {
      const names = ["fate_disarm", "fate_moon_arrow", "fate_energy_transfer", "fate_greed", "fate_siren_song"];
      if (!names.includes(event.card?.name)) return false;
      if (player.hasSkill("fate_lina_soul_ready")) return true;
      if (player.countMark("fate_rage_rule") < 1) return false;
      if (event.card.name === "fate_siren_song") return event.targets?.includes(player);
      return true;
    },
    async content(event, trigger, player) {
      const free = player.hasSkill("fate_lina_soul_ready");
      const effect = MAGIC_ENHANCEMENT_TEXT[trigger.card.name] || "获得该魔法的强化效果。";
      const result = await player
        .chooseBool(`${free ? "炽魂：本次强化不消耗怒气。" : "是否消耗1点怒气强化"}【${get.translation(trigger.card)}】？\n强化效果：${effect}`)
        .set("ai", () => true)
        .forResult();
      const enhance = result.bool;
      if (!enhance) return;
      if (free) player.removeSkill("fate_lina_soul_ready");
      else player.removeMark("fate_rage_rule", 1);
      trigger.card.storage ||= {};
      trigger.card.storage.fateEnhanced = true;
      game.log(player, "消耗1点怒气，强化了", trigger.card);
    },
  },
  fate_s_card_cost: {
    trigger: { player: "useCard1" },
    forced: true,
    firstDo: true,
    popup: false,
    filter(event, player) {
      if (event.card?.name === "fate_fanatical") return true;
      return Boolean(S_RAGE_COST[event.card?.name]) && player.countMark("fate_rage_rule") >= S_RAGE_COST[event.card.name];
    },
    async content(event, trigger, player) {
      if (trigger.card.name === "fate_fanatical") await player.damage(player);
      else player.removeMark("fate_rage_rule", S_RAGE_COST[trigger.card.name]);
    },
  },
  fate_unlimited_attack: {
    charlotte: true,
    mod: {
      cardUsable(card) {
        if (card.name === "sha") return Infinity;
      },
    },
  },
  fate_divine_strength_effect: {
    charlotte: true,
    trigger: { source: "damageBegin1" },
    forced: true,
    filter(event) {
      return event.card?.name === "sha";
    },
    async content(event, trigger) {
      trigger.num += 1;
    },
  },
  fate_skip_draw_once: {
    charlotte: true,
    mark: true,
    marktext: "禁",
    trigger: { player: "phaseDrawBefore" },
    forced: true,
    async content(event, trigger, player) {
      trigger.cancel();
      player.removeSkill("fate_skip_draw_once");
    },
  },
  fate_time_stop_effect: {
    charlotte: true,
    mark: true,
    marktext: "停",
    trigger: { player: ["phaseDrawBefore", "phaseUseBefore", "phaseDiscardBefore"] },
    forced: true,
    async content(event, trigger) {
      trigger.cancel();
    },
  },
  fate_siren_song_effect: {
    charlotte: true,
    mark: true,
    marktext: "眠",
    trigger: { player: ["phaseDrawBefore", "phaseUseBefore", "phaseDiscardBefore"] },
    forced: true,
    mod: {
      targetEnabled(card, player, target) {
        if (player !== target) return false;
      },
    },
    async content(event, trigger) {
      trigger.cancel();
    },
  },
};

export const CARD_TRANSLATIONS = {
  fate_fanatical: "狂热",
  fate_fanatical_info: "出牌阶段，对自己使用。你对自己造成1点伤害；若仍存活，本回合可使用任意数量的攻击。",
  fate_misdirection: "误导",
  fate_misdirection_info: "将目标的1点怒气转移给另一名怒气未满的角色，然后目标摸1张牌。",
  fate_chakra: "查克拉",
  fate_chakra_info: "摸1张牌，然后猜牌堆顶牌的颜色；猜对则获得并继续，猜错则弃置并结束。",
  fate_wild_axes: "野性之斧",
  fate_wild_axes_info: "选择另一名角色，对你到该角色最短路径上的所有角色依次结算闪避，否则各受到1点伤害。",
  fate_disarm: "缴械",
  fate_disarm_info: "弃置目标装备区的一张牌。",
  fate_moon_arrow: "月神之箭",
  fate_moon_arrow_info: "指定红色或黑色；目标须弃置一张该颜色手牌，否则受到1点伤害。",
  fate_energy_transfer: "能量转移",
  fate_energy_transfer_info: "展示牌堆顶X张牌并按行动顺序分给所有角色。强化后，一名角色获得2张，另一名角色不获得牌。",
  fate_greed: "贪婪",
  fate_greed_info: "抽取目标两张手牌或一张装备；目标随机抽取你的一张手牌，然后你获得抽取的牌。",
  fate_siren_song: "海妖之歌",
  fate_siren_song_info: "令目标跳过下回合摸牌、出牌和弃牌阶段，并在此期间不能成为其他角色卡牌的目标。强化后只能对自己使用。",
  fate_magic_enhance: "魔法强化",
  fate_divine_strength: "神之力量",
  fate_divine_strength_info: "消耗2怒气。摸1张牌，本回合攻击伤害+1。不可被驱散。",
  fate_viper_strike: "蝮蛇突袭",
  fate_viper_strike_info: "消耗2怒气。对目标造成1点伤害，并令其跳过下个摸牌阶段。不可被驱散。",
  fate_time_stop: "时间静止",
  fate_time_stop_info: "消耗2怒气。除你外的角色跳过各自下回合的摸牌、出牌和弃牌阶段。不可被驱散。",
  fate_soul_separation: "灵魂隔断",
  fate_soul_separation_info: "消耗3怒气。与目标交换血量；交换后血量为1的角色回复至2。不可被驱散。",
  fate_laguna_blade: "神灭斩",
  fate_laguna_blade_info: "消耗3怒气。目标连续打出3张闪避，否则受到3-X点伤害。不可被驱散。",
  fate_s_card_cost: "S技费用",
  fate_unlimited_attack: "狂热",
  fate_divine_strength_effect: "神之力量",
  fate_skip_draw_once: "蝮蛇突袭",
  fate_time_stop_effect: "时间静止",
  fate_siren_song_effect: "海妖之歌",
};
