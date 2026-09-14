import { lib, game, ui, get, _status } from "noname";
import { BASIC_CARD_IMAGES, CARD_DEFINITIONS, CARD_TRANSLATIONS, SPECIAL_SKILLS } from "./cards.js";
import { EQUIPMENT_DEFINITIONS, EQUIPMENT_SKILLS, EQUIPMENT_TRANSLATIONS } from "./equipment.js";
import { ACTIVE_SKILL_PROMPT, STRENGTH_HERO_CARDS, STRENGTH_HERO_SKILLS, STRENGTH_HERO_TRANSLATIONS } from "./heroes-strength.js";
import { INTELLIGENCE_HERO_CARDS, INTELLIGENCE_HERO_SKILLS, INTELLIGENCE_HERO_TRANSLATIONS } from "./heroes-intelligence.js";
import { AGILITY_HERO_CARDS, AGILITY_HERO_SKILLS, AGILITY_HERO_TRANSLATIONS } from "./heroes-agility.js";
import { gainFateRage } from "./rage.js";
import { ACTIVE_DECK, FATES, FACTION, dealPlayerIdentities, evaluateWinner } from "./rules.js";
import { FATE_LAYOUT_STYLE, installFateLayout } from "./ui-layout.js";

export const type = "extension";

const HEROES = {
  fate_abaddon: ["male", "fate_strength", 4, ["fate_rage_rule", "fate_hand_limit_rule", "fate_death_coil", "fate_frostmourne"]],
  fate_skeleton_king: ["male", "fate_strength", 4, ["fate_rage_rule", "fate_hand_limit_rule", "fate_reincarnation", "fate_vampiric_aura"]],
  fate_bristleback: ["male", "fate_strength", 4, ["fate_rage_rule", "fate_hand_limit_rule", "fate_warpath", "fate_bristleback"]],
  fate_huskar: ["male", "fate_strength", 4, ["fate_rage_rule", "fate_hand_limit_rule", "fate_sacrifice", "fate_berserkers_blood"]],
  fate_omniknight: ["male", "fate_strength", 4, ["fate_rage_rule", "fate_hand_limit_rule", "fate_purification"]],
  fate_axe: ["male", "fate_strength", 4, ["fate_rage_rule", "fate_hand_limit_rule", "fate_battle_hunger", "fate_counter_helix"]],
  fate_guardian_knight: ["male", "fate_strength", 4, ["fate_rage_rule", "fate_hand_limit_rule", "fate_guard", "fate_faith", "fate_fatherly_love"]],
  fate_lina: ["female", "fate_intelligence", 4, ["fate_rage_rule", "fate_hand_limit_rule", "fate_lina_soul", "fate_lina_laguna"]],
  fate_necrophos: ["male", "fate_intelligence", 4, ["fate_rage_rule", "fate_hand_limit_rule", "fate_necro_heartstopper", "fate_necro_sadism"]],
  fate_jakiro: ["male", "fate_intelligence", 4, ["fate_rage_rule", "fate_hand_limit_rule", "fate_jakiro_ice", "fate_jakiro_liquid_fire"]],
  fate_crystal_maiden: ["female", "fate_intelligence", 4, ["fate_rage_rule", "fate_hand_limit_rule", "fate_crystal_frost", "fate_crystal_aura"]],
  fate_lich: ["male", "fate_intelligence", 3, ["fate_rage_rule", "fate_hand_limit_rule", "fate_lich_feast", "fate_lich_armor"]],
  fate_dazzle: ["male", "fate_intelligence", 4, ["fate_rage_rule", "fate_hand_limit_rule", "fate_dazzle_grave", "fate_dazzle_wave"]],
  fate_ogre_magi: ["male", "fate_intelligence", 4, ["fate_rage_rule", "fate_hand_limit_rule", "fate_ogre_multicast"]],
  fate_keeper_of_the_light: ["male", "fate_intelligence", 4, ["fate_rage_rule", "fate_hand_limit_rule", "fate_keeper_wave", "fate_keeper_chakra", "fate_keeper_favor"]],
  fate_techies: ["male", "fate_intelligence", 3, ["fate_rage_rule", "fate_hand_limit_rule", "fate_techies_bomb", "fate_techies_detonate", "fate_techies_suicide"]],
  fate_enchantress: ["female", "fate_intelligence", 3, ["fate_rage_rule", "fate_hand_limit_rule", "fate_enchantress_heal", "fate_enchantress_dispel", "fate_enchantress_control"]],
  fate_medusa: ["female", "fate_agility", 3, ["fate_rage_rule", "fate_hand_limit_rule", "fate_medusa_snake", "fate_medusa_shield"]],
  fate_razor: ["male", "fate_agility", 4, ["fate_rage_rule", "fate_hand_limit_rule", "fate_razor_field", "fate_razor_current"]],
  fate_juggernaut: ["male", "fate_agility", 4, ["fate_rage_rule", "fate_hand_limit_rule", "fate_juggernaut_omnislash", "fate_juggernaut_blade_dance", "fate_juggernaut_diamond_dodge"]],
  fate_vengeful_spirit: ["female", "fate_agility", 4, ["fate_rage_rule", "fate_hand_limit_rule", "fate_vengeful_swap", "fate_vengeful_wave"]],
  fate_bloodseeker: ["male", "fate_agility", 4, ["fate_rage_rule", "fate_hand_limit_rule", "fate_bloodseeker_rupture", "fate_bloodseeker_thirst", "fate_bloodseeker_slaughter"]],
  fate_troll_warlord: ["male", "fate_agility", 4, ["fate_rage_rule", "fate_hand_limit_rule", "fate_troll_focus", "fate_troll_battle"]],
  fate_sniper: ["male", "fate_agility", 4, ["fate_rage_rule", "fate_hand_limit_rule", "fate_sniper_headshot", "fate_sniper_aim"]],
  fate_nyx_assassin: ["male", "fate_agility", 4, ["fate_rage_rule", "fate_hand_limit_rule", "fate_nyx_burn"]],
  fate_anti_mage: ["male", "fate_agility", 4, ["fate_rage_rule", "fate_hand_limit_rule", "fate_antimage_mana", "fate_antimage_blink"]],
  fate_chen_yunsheng: ["male", "fate_agility", 3, ["fate_rage_rule", "fate_hand_limit_rule", "fate_chen_judgement", "fate_chen_body"]],
};

const HAND_LIMITS = {
  fate_lich: 5,
  fate_techies: 5,
  fate_enchantress: 5,
  fate_medusa: 5,
  fate_chen_yunsheng: 5,
};

const TEST_CARD_NAMES = Array.from(new Set(ACTIVE_DECK.map(card => card[2])));
const TEST_IDENTITIES = Object.freeze({ 近卫: FACTION.SENTINEL, 天灾: FACTION.SCOURGE, 中立: FACTION.NEUTRAL });

function selectedCardName(link) {
  if (typeof link === "string") return link;
  if (Array.isArray(link)) return link[2] || link[0];
  return link?.name;
}

async function chooseTestParticipant(controller, label, pool) {
  const heroResult = await controller.chooseButton(true, [`测试对局：设置${label}的英雄`, [pool, "character"]]).forResult();
  const hero = heroResult.links?.[0] || pool[0];
  const identityResult = await controller.chooseControl("近卫", "天灾", "中立").set("prompt", `测试对局：设置${label}的身份`).forResult();
  const maxHp = HEROES[hero][2];
  const hpResult = await controller
    .chooseControl(...Array.from({ length: maxHp }, (_, index) => `${index + 1}血`))
    .set("prompt", `测试对局：设置${label}的初始血量（上限${maxHp}）`)
    .forResult();
  const rageResult = await controller
    .chooseControl("0怒气", "1怒气", "2怒气", "3怒气")
    .set("prompt", `测试对局：设置${label}的初始怒气`)
    .forResult();
  const handResult = await controller
    .chooseButton([0, 12], [`测试对局：设置${label}的至多12张起始手牌`, [TEST_CARD_NAMES, "vcard"]])
    .forResult();
  return {
    hero,
    identity: TEST_IDENTITIES[identityResult.control] || FACTION.SENTINEL,
    hp: Number.parseInt(hpResult.control, 10) || maxHp,
    rage: Number.parseInt(rageResult.control, 10) || 0,
    cards: (handResult.links || []).map(selectedCardName).filter(Boolean),
  };
}

async function chooseStandardAiHero(player, label, pool) {
  const choices = pool.randomRemove(Math.min(3, pool.length));
  if (!choices.length) return null;
  const result = await player
    .chooseButton(true, [`${label}：从3名候选英雄中选择`, [choices, "character"]])
    .set("ai", button => {
      const hero = HEROES[button.link];
      return hero ? hero[2] * 10 + hero[3].length : 0;
    })
    .forResult();
  return result.links?.[0] || choices[0];
}

async function activateRoshan(player) {
  if (
    !player?.isAlive?.() ||
    player.identity !== FACTION.NEUTRAL ||
    game.fateReborn?.fate?.id !== "roshan" ||
    player.storage.fate_roshan_revealed
  ) return false;

  player.storage.fate_roshan_revealed = true;
  player.storage.fate_roshan_resolving = true;
  game.fateReborn.roshanPlayerId = player.playerid;
  game.log(player, "公开了", "#yRoshan附体");
  try {
    for (const target of game.players.slice()) {
      if (target !== player && target.isAlive()) await target.die(player);
    }
  } finally {
    delete player.storage.fate_roshan_resolving;
  }
  game.checkResult?.();
  return true;
}

const HERO_NAMES = {
  fate_abaddon: "亚巴顿",
  fate_skeleton_king: "骷髅王",
  fate_bristleback: "刚背兽",
  fate_huskar: "哈斯卡",
  fate_omniknight: "全能骑士",
  fate_axe: "斧王",
  fate_guardian_knight: "守护骑士",
  fate_lina: "莉娜",
  fate_necrophos: "死灵法师",
  fate_jakiro: "杰奇洛",
  fate_crystal_maiden: "水晶室女",
  fate_lich: "巫妖",
  fate_dazzle: "戴泽",
  fate_ogre_magi: "食人魔魔法师",
  fate_keeper_of_the_light: "光之守卫",
  fate_techies: "工程师",
  fate_enchantress: "精灵莉莉",
  fate_medusa: "美杜莎",
  fate_razor: "雷泽",
  fate_juggernaut: "主宰",
  fate_vengeful_spirit: "复仇之魂",
  fate_bloodseeker: "血魔",
  fate_troll_warlord: "巨魔战将",
  fate_sniper: "狙击手",
  fate_nyx_assassin: "司夜刺客",
  fate_anti_mage: "敌法师",
  fate_chen_yunsheng: "陈云生",
};

for (const [heroId, hero] of Object.entries(HEROES)) {
  hero[4] = [`ext:fate-reborn/assets/heroes/${heroId}.jpg`];
}

function playerState(player) {
  const seat = player.getSeatNum?.();
  return {
    id: player.playerid,
    identity: player.identity,
    alive: player.isAlive(),
    hp: player.hp,
    rage: player.countMark("fate_rage_rule"),
    neighbors: player.storage.fate_neighbors || [],
    successorId: player.storage.fate_successor || player.storage.fate_neighbors?.[1],
    roshanRevealed: Boolean(player.storage.fate_roshan_revealed),
    seat: Number.isFinite(seat) && seat > 0 ? seat : undefined,
  };
}

function createMode(testing = false) {
  return {
    name: testing ? "fate_reborn_test" : "fate_reborn",
    splash: "ext:fate-reborn/assets/fate-splash.jpeg",
    start: [
      async () => {
        lib.card.list = ACTIVE_DECK.map(card => [...card]);
        lib.inpile = Array.from(new Set(ACTIVE_DECK.map(card => card[2])));
        lib.card.sha.fullimage = true;
        // The engine resolves a card image before it applies the card's nature.
        // Nature-specific artwork is therefore selected by the CSS rules below.
        lib.card.sha.image = BASIC_CARD_IMAGES.normal;
        lib.card.shan.fullimage = true;
        lib.card.shan.image = BASIC_CARD_IMAGES.dodge;
        lib.card.tao.fullimage = true;
        lib.card.tao.image = BASIC_CARD_IMAGES.healing;
        lib.card.wuxie.fullimage = true;
        lib.card.wuxie.image = BASIC_CARD_IMAGES.dispel;
        game.fixedPile = true;
        lib.translate.sha = "攻击";
        lib.translate.shan = "闪避";
        lib.translate.tao = "治疗药膏";
        lib.translate.wuxie = "驱散";
        lib.translate.sha_bg = "攻";
        lib.translate.shan_bg = "闪";
        lib.translate.tao_bg = "疗";
        lib.translate.wuxie_bg = "驱";
        lib.translate.fate_fire_sha = "火焰攻击";
        lib.translate.fate_chaos_sha = "混乱攻击";
        lib.translate.cai = "未知";
        lib.translate.cai2 = "身份未知";
        lib.translate.cai_bg = "？";
        for (const cardName of ["sha", "shan", "tao", "wuxie"]) {
          if (lib.card[cardName]) lib.card[cardName].fullskin = false;
        }
        game.prepareArena(Number.parseInt(get.config("player_number"), 10) || 5);
      },
      async () => {
        for (const player of game.players) player.getId();
        const identities = dealPlayerIdentities(game.players.length);
        game.players.forEach((player, index) => {
          player.identity = identities[index];
          player.ai.shown = 0;
          player.setIdentity("cai");
          player.node.identity.classList.add("guessing");
        });

        const pool = Object.keys(HEROES);
        let selected;
        let testSetup;
        let isTesting = testing;
        if (!testing) {
          const modeResult = await game.me
            .chooseControl("标准对局", "测试对局")
            .set("prompt", "选择对局类型")
            .set("prompt2", "测试对局可分别设置你和每名AI的英雄、身份、血量、怒气、手牌与宿命任务。")
            .set("ai", () => "标准对局")
            .forResult();
          isTesting = modeResult.control === "测试对局";
        }
        if (isTesting) {
          testSetup = await chooseTestParticipant(game.me, "你", pool);
          selected = testSetup.hero;
          pool.remove(selected);
          game.me.init(selected);
          game.me.identity = testSetup.identity;
          for (let index = 0; index < game.players.length; index += 1) {
            const player = game.players[index];
            if (player === game.me) continue;
            const setup = await chooseTestParticipant(game.me, `AI ${index}`, pool);
            pool.remove(setup.hero);
            player.init(setup.hero);
            player.identity = setup.identity;
            player.storage.fate_test_setup = setup;
          }
        } else {
          const availableHeroes = pool.slice();
          const result = await game.me
            .chooseButton(true, ["选择一名宿命英雄（完整英雄池）", [availableHeroes, "character"]])
            .forResult();
          selected = result.links?.[0] || availableHeroes[0];
          pool.remove(selected);
          game.me.init(selected);
          for (let index = 0; index < game.players.length; index += 1) {
            const player = game.players[index];
            if (player === game.me) continue;
            const aiHero = await chooseStandardAiHero(player, `AI ${index}`, pool);
            if (aiHero) player.init(aiHero);
          }
        }

        for (const neutral of game.players.filter(player => player.identity === FACTION.NEUTRAL)) {
          neutral.storage.fate_neighbors = [neutral.previous.playerid, neutral.next.playerid];
          // The Fate rules advance turns counterclockwise, so a neutral's
          // fixed-seat successor is the engine's previous seat.
          neutral.storage.fate_successor = neutral.previous.playerid;
        }
        let fate = FATES.randomGet();
        if (isTesting) {
          const fateResult = await game.me.chooseControl(...FATES.map(item => item.name)).set("prompt", "测试对局：选择宿命任务").forResult();
          fate = FATES.find(current => current.name === fateResult.control) || FATES[0];
        }
        game.fateReborn = {
          fate,
          turnDirection: "counterclockwise",
          openingPlayers: game.players.map(player => player.playerid),
          testing: isTesting,
          testSetup,
        };

        const knownNext = game.me.previous;
        game.me.setIdentity(game.me.identity);
        game.me.node.identity.classList.remove("guessing");
        knownNext.setIdentity(knownNext.identity);
        knownNext.node.identity.classList.remove("guessing");
        const visibleRoshan = [game.me, knownNext].find(player => player.identity === FACTION.NEUTRAL && player.isAlive());
        if (visibleRoshan) game.fateReborn.pendingRoshanId = visibleRoshan.playerid;
        if (isTesting) {
          game.showIdentity();
          const testRoshan = game.players.find(player => player.identity === FACTION.NEUTRAL && player.isAlive());
          if (testRoshan) game.fateReborn.pendingRoshanId = testRoshan.playerid;
          game.log("#y测试对局：胜负检查已关闭，可自由验证技能。");
        }
        if (game.me.identity === FACTION.NEUTRAL) {
          await game.me
            .chooseControl("我已了解")
            .set("prompt", `你的中立任务：${game.fateReborn.fate.name}`)
            .set("prompt2", game.fateReborn.fate.text)
            .forResult();
        }
      },
      async (event) => {
        game.addGlobalSkill("fate_ui_layout");
        game.addGlobalSkill("fate_cast_phase");
        game.addGlobalSkill("fate_settled_victory_check");
        game.addGlobalSkill("fate_s_card_cost");
        game.addGlobalSkill("fate_magic_enhance");
        game.addGlobalSkill("fate_card_confirmation");
        // Phase-use skills use the engine's native skill controls beside the
        // player portrait.  Do not interrupt the whole table with a temporary
        // “activate / skip” chooser at the start of every phase.
        event.trigger("gameStart");
        game.fateReborn.firstPlayer = game.players.randomGet();
        // This mode uses async start content, so child events must be awaited.
        // Merely creating them leaves the phase loop outside the active event
        // chain and the table appears to remain at round zero.
        await game.gameDraw(game.fateReborn.firstPlayer, 4);
        if (game.fateReborn.testing) {
          for (const player of game.players) {
            const setup = player === game.me ? game.fateReborn.testSetup : player.storage.fate_test_setup;
            const currentCards = player.getCards("h");
            if (currentCards.length) await player.discard(currentCards);
            const cards = setup.cards.map(name => {
              const entry = ACTIVE_DECK.find(card => card[2] === name) || ["spade", 1, name];
              return game.createCard2(entry[2], entry[0], entry[1], entry[3]);
            });
            if (cards.length) await player.gain(cards, "gain2");
            player.hp = Math.min(setup.hp, player.maxHp);
            player.update();
            if (setup.rage) player.addMark("fate_rage_rule", setup.rage);
          }
        }
        const pendingRoshan = game.players.find(player => player.playerid === game.fateReborn.pendingRoshanId);
        if (pendingRoshan) await activateRoshan(pendingRoshan);
        delete game.fateReborn.pendingRoshanId;
        await game.phaseLoop(game.fateReborn.firstPlayer || game.players.randomGet());
      },
    ],
    game: {
      showIdentity() {
        for (const player of game.players.concat(game.dead)) {
          player.identityShown = true;
          player.setIdentity(player.identity);
          player.node.identity.classList.remove("guessing");
        }
      },
      checkResult() {
        if (!game.fateReborn || game.fateReborn.testing || _status.over) return;
        const allPlayers = game.players.concat(game.dead);
        const result = evaluateWinner({
          players: allPlayers.map(playerState),
          fateId: game.fateReborn.fate.id,
          turnPlayerId: _status.currentPhase?.playerid || allPlayers[0]?.playerid,
          turnDirection: game.fateReborn.turnDirection,
        });
        if (!result) return;
        const me = game.me._trueMe || game.me;
        game.showIdentity();
        game.over(result.winners.includes(me.playerid));
      },
      getState() {
        return Object.fromEntries(
          Object.entries(lib.playerOL || {}).map(([id, player]) => [id, { identity: player.identity }]),
        );
      },
      updateState(state) {
        for (const [id, value] of Object.entries(state)) {
          if (lib.playerOL?.[id]) lib.playerOL[id].identity = value.identity;
        }
      },
      checkOnlineResult(player) {
        return _status.winners?.includes(player) ?? false;
      },
    },
    element: {
      player: {
        dieAfter() {
          this.identityShown = true;
          this.setIdentity(this.identity);
          this.node.identity.classList.remove("guessing");
          if (this.identity === FACTION.NEUTRAL && this.storage.fate_roshan_revealed) game.checkResult();
        },
        async dieAfter2(source) {
          if (source && source !== this && !source.storage?.fate_roshan_resolving) {
            const result = await source
              .chooseControl("摸两张牌", "查看身份")
              .set("prompt", "请选择击杀奖励")
              .set("ai", () => (game.players.some(player => !player.identityShown) ? "查看身份" : "摸两张牌"))
              .forResult();
            const choice = result.control || "摸两张牌";
            if (choice === "查看身份") {
              const candidates = game.players.filter(player => player !== source && player.isAlive());
              const targetResult = candidates.length
                ? await source
                  .chooseTarget("请选择查看身份的存活角色", true, (card, chooser, target) => target !== chooser && target.isAlive())
                  .set("ai", target => target.identityShown ? 0 : 1)
                  .forResult()
                : null;
              const target = targetResult?.targets?.[0];
              if (target) {
                source.storage.fate_known_identities ||= {};
                source.storage.fate_known_identities[target.playerid] = target.identity;
                if (source === game.me) game.log("你查看了", target, "的身份：", `#y${get.translation(target.identity)}`);
              } else source.draw(2);
            } else source.draw(2);
          }
        },
      },
    },
    get: {
      rawAttitude(from, to) {
        if (from === to) return 10;
        if (from.identity === FACTION.NEUTRAL || to.identity === FACTION.NEUTRAL) return -6;
        return from.identity === to.identity ? 6 : -6;
      },
    },
    skill: {
      fate_cast_phase: {
        trigger: { global: "phaseBefore" },
        forced: true,
        popup: false,
        firstDo: true,
        async content(event, trigger) {
          game.log("进入", trigger.player, "回合前的", "#y施法阶段");
          // Use an independent event for the cast window.  Re-triggering the
          // live phaseBefore event made its trigger queue wait on itself and
          // left a new game at round zero.
          const castEvent = game.createEvent("fateCastPhase", false, event);
          castEvent.player = trigger.player;
          castEvent.setContent(async current => {
            await current.trigger(current.name);
          });
          await castEvent;
          game.log("进入", trigger.player, "回合前的", "#y状态判定阶段");
          const statusEvent = game.createEvent("fateStatusPhase", false, event);
          statusEvent.player = trigger.player;
          statusEvent.setContent(async current => {
            await current.trigger(current.name);
            const pending = game.fateReborn?.pendingStatuses?.splice(0) || [];
            for (const status of pending) {
              const target = game.players.concat(game.dead).find(player => player.playerid === status.targetId);
              if (!target?.isAlive()) continue;
              for (const skill of status.skills || []) target.addTempSkill(skill, { global: "phaseAfter" });
            }
          });
          await statusEvent;
        },
      },
      fate_settled_victory_check: {
        trigger: { global: ["useCardAfter", "phaseAfter"] },
        forced: true,
        popup: false,
        lastDo: true,
        async content() {
          game.checkResult();
        },
      },
      fate_card_confirmation: {
        trigger: { player: ["useCardBefore", "respondBefore"] },
        forced: true,
        popup: false,
        firstDo: true,
        priority: 100,
        filter(event, player) {
          if (player !== game.me || !event.card) return false;
          return get.type(event.card) === "equip" || (event.name === "respond" && event.card.name === "shan");
        },
        async content(event, trigger, player) {
          const isEquip = get.type(trigger.card) === "equip";
          const prompt = isEquip
            ? `确认装备【${get.translation(trigger.card)}】？已有同类装备会被替换。`
            : "确认使用【闪避】？";
          const result = await player.chooseBool(prompt).set("choice", true).forResult();
          if (!result.bool) trigger.cancel();
        },
      },
      fate_active_skill_prompt: ACTIVE_SKILL_PROMPT,
      fate_ui_layout: {
        trigger: { global: "gameStart" },
        forced: true,
        popup: false,
        lastDo: true,
        content() {
          game.fateInstallLayout?.();
        },
      },
    },
    translate: {
      fate_reborn: "宿命",
      fate_reborn_info: "5—8人标准局：5人时2近卫、2天灾、1中立；8人时3近卫、3天灾、2中立。",
      fate_reborn_test: "宿命测试",
      fate_reborn_test_info: "选择英雄、身份、血量、怒气与起始手牌，胜负检查关闭。",
      fate_cast_phase: "施法阶段",
      fate_cast_phase_info: "每名角色回合开始前，所有存活角色依次获得施法机会。",
      fate_settled_victory_check: "宿命检查",
      fate_settled_victory_check_info: "一次用牌或一个回合结算完成后检查宿命及阵营胜利。",
      fate_card_confirmation: "使用确认",
      fate_card_confirmation_info: "使用装备牌或打出闪避前，需要再次确认。",
      fate_active_skill_prompt: "主动技能",
      fate_active_skill_prompt_info: "你的出牌阶段开始时，可选择发动当前英雄已实现的主动技能。",
      fate_sentinel: "近卫",
      fate_sentinel2: "近卫阵营",
      fate_sentinel_bg: "卫",
      fate_scourge: "天灾",
      fate_scourge2: "天灾阵营",
      fate_scourge_bg: "灾",
      fate_neutral: "中立",
      fate_neutral2: "中立阵营",
      fate_neutral_bg: "中",
    },
  };
}

export default function fateRebornExtension() {
  return {
    name: "fate-reborn",
    editable: false,
    connect: false,
    content() {},
    precontent() {
      document.title = "宿命 Reborn";
      document.documentElement.classList.add("fate-standalone");
      const standaloneStyle = document.createElement("style");
      standaloneStyle.id = "fate-reborn-standalone-style";
      standaloneStyle.textContent = `
        .fate-standalone #splash > div {
          width: min(82vw, 920px);
          height: min(68vw, 768px);
          max-height: 78vh;
          top: 50%;
          margin: 0;
          transform: translateY(-50%);
          box-shadow: 0 14px 48px rgba(0,0,0,.72);
        }
        .fate-standalone #splash > div > .avatar { width: calc(100% - 10px); }
        .fate-standalone #splash > div > .splashtext { display: none; }
        .fate-standalone #splash > div::after {
          content: "点击进入游戏";
          position: absolute;
          left: 50%;
          bottom: 5.5%;
          z-index: 2;
          transform: translateX(-50%);
          padding: 10px 28px;
          border: 1px solid rgba(226,194,115,.9);
          border-radius: 4px;
          color: #fff0bd;
          background: rgba(8,16,25,.82);
          font: 600 20px/1.2 serif;
          letter-spacing: 5px;
          text-shadow: 0 2px 6px #000;
          white-space: nowrap;
        }
        .fate-standalone #splash:not(.touch) > div:hover:not(.clicked) { transform: translateY(calc(-50% - 8px)); }
        .fate-standalone #splash > div.hidden { transform: translateY(calc(-50% - 280px)) scale(.86); }
        .fate-standalone #splash > div.clicked { transform: translateY(-50%) scale(1.05); opacity: 0; }
        .fate-standalone .menu-tab > div:nth-child(n+4),
        .fate-standalone .new-menu-tab > div:nth-child(n+4) { display: none !important; }
        .card.fate_chaos.fullimage { background-image: url("extension/fate-reborn/assets/cards/fate_chaos_attack.jpg") !important; }
        .card.fate_fire.fullimage { background-image: url("extension/fate-reborn/assets/cards/fate_fire_attack.jpg") !important; }
        ${FATE_LAYOUT_STYLE}
      `;
      document.head.appendChild(standaloneStyle);
      game.fateInstallLayout = installFateLayout;
      game.addNature("fate_chaos", "混乱", { linked: false, order: 5, color: "#7d5ba6" });
      game.addNature("fate_fire", "火焰", { linked: false, order: 6, color: "#b64a35" });
      game.addGroup("fate_strength", "力", "力量", { color: "#a33" });
      game.addGroup("fate_intelligence", "智", "智力", { color: "#4b72a8" });
      game.addGroup("fate_agility", "敏", "敏捷", { color: "#478d57" });
      if (!lib.mode.fate_reborn) {
        game.addMode("fate_reborn", createMode(false), {
          translate: "宿命",
          extension: "fate-reborn",
          config: {
            player_number: {
              name: "玩家人数",
              init: "5",
              item: { 5: "5人（4名AI）", 6: "6人（5名AI）", 7: "7人（6名AI）", 8: "8人（7名AI）" },
              restart: true,
            },
          },
        });
        game.addMode("fate_reborn_test", createMode(true), {
          translate: "宿命测试",
          extension: "fate-reborn",
          config: {
            player_number: {
              name: "测试局人数",
              init: "5",
              item: { 5: "5人（4名AI）", 6: "6人（5名AI）", 7: "7人（6名AI）", 8: "8人（7名AI）" },
              restart: true,
            },
          },
        });
      }
    },
    config: {},
    help: {
      "宿命 Reborn": "当前版本接入5—8人身份、27名英雄技能、怒气、固定手牌上限、施法阶段、112张实体牌和宿命胜负判定。",
    },
    package: {
      character: { character: HEROES, translate: { ...HERO_NAMES, fate_character_config: "宿命英雄" } },
      card: {
        card: { ...CARD_DEFINITIONS, ...EQUIPMENT_DEFINITIONS, ...STRENGTH_HERO_CARDS, ...INTELLIGENCE_HERO_CARDS, ...AGILITY_HERO_CARDS },
        translate: { ...CARD_TRANSLATIONS, ...EQUIPMENT_TRANSLATIONS, ...STRENGTH_HERO_TRANSLATIONS, ...INTELLIGENCE_HERO_TRANSLATIONS, ...AGILITY_HERO_TRANSLATIONS },
        list: [],
      },
      skill: {
        skill: {
          ...SPECIAL_SKILLS,
          ...EQUIPMENT_SKILLS,
          ...STRENGTH_HERO_SKILLS,
          ...INTELLIGENCE_HERO_SKILLS,
          ...AGILITY_HERO_SKILLS,
          fate_rage_rule: {
            mark: true,
            marktext: "怒",
            init(player) {
              player.storage.fate_rage_rule = 0;
            },
            intro: {
              content(storage, player) {
                return `当前怒气：${player.countMark("fate_rage_rule")}/3`;
              },
            },
            trigger: { player: "damageEnd" },
            forced: true,
            popup: false,
            async content(event, trigger, player) {
              const received = trigger.num + (game.hasNature(trigger, "fate_fire") ? 1 : 0);
              await gainFateRage(player, received);
              if (trigger.source?.isAlive() && game.hasNature(trigger, "fate_chaos")) {
                await gainFateRage(trigger.source, 1);
              }
            },
          },
          fate_hand_limit_rule: {
            charlotte: true,
            mod: {
              maxHandcard(player) {
                return HAND_LIMITS[player.name] || 4;
              },
            },
          },
        },
        translate: {
          ...CARD_TRANSLATIONS,
          ...EQUIPMENT_TRANSLATIONS,
          ...STRENGTH_HERO_TRANSLATIONS,
          ...INTELLIGENCE_HERO_TRANSLATIONS,
          ...AGILITY_HERO_TRANSLATIONS,
          fate_rage_rule: "怒气",
          fate_rage_rule_info: "每受到1点实际伤害获得1点怒气。火焰攻击使目标额外获得1点，混乱攻击命中后使攻击者获得1点，至多3点。",
          fate_hand_limit_rule: "手牌上限",
          fate_hand_limit_rule_info: "手牌上限由英雄牌固定为4或5。",
        },
      },
      intro: "宿命 Reborn 5—8人身份对战试玩版。",
      author: "宿命 Reborn",
      diskURL: "",
      forumURL: "",
      version: "0.1.0",
    },
    files: { character: [], card: [], skill: [], audio: [] },
  };
}
