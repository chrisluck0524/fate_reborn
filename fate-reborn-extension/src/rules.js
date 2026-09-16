export const FACTION = Object.freeze({
  SENTINEL: "fate_sentinel",
  SCOURGE: "fate_scourge",
  NEUTRAL: "fate_neutral",
});

export const FIVE_PLAYER_IDENTITIES = Object.freeze([
  FACTION.SENTINEL,
  FACTION.SENTINEL,
  FACTION.SCOURGE,
  FACTION.SCOURGE,
  FACTION.NEUTRAL,
]);

export const FATES = Object.freeze([
  { id: "shadow_punisher", name: "暗影惩戒者", text: "夜魇军团全灭。" },
  { id: "holy_conqueror", name: "圣光征服者", text: "天辉军团全灭。" },
  { id: "spreading_plague", name: "蔓延的瘟疫", text: "开局左侧和右侧的角色均已死亡。" },
  { id: "fate_gamble", name: "命运的博弈", text: "场上仅剩三名不同阵营的角色。" },
  { id: "backlash_puppet", name: "反噬的傀儡", text: "固定座位下家胜利时，代替其获胜。" },
  { id: "death_caller", name: "死神的召唤者", text: "结算结束后，除你外所有存活角色的血量均不高于2。" },
  { id: "paranoid_mathematician", name: "偏执的数学家", text: "结算结束后，所有存活角色的怒气均为奇数。" },
  { id: "roshan", name: "Roshan附体", text: "公布身份后杀死其他所有角色；其他角色改为以杀死你为胜利目标。" },
]);

const cards = (suit, numbers, name, nature) =>
  numbers.map(number => (nature ? [suit, number, name, nature] : [suit, number, name]));

export const BASIC_DECK = Object.freeze([
  ...cards("spade", [1, 2, 3, 4, 5, 6, 7], "sha"),
  ...cards("club", [1, 1, 2, 2], "sha"),
  ...cards("diamond", [5], "sha"),
  ...cards("spade", [1, 2, 3, 4, 5, 8], "sha", "fate_chaos"),
  ...cards("heart", [3], "sha", "fate_chaos"),
  ...cards("club", [3, 3], "sha", "fate_chaos"),
  ...cards("diamond", [4], "sha", "fate_chaos"),
  ...cards("heart", [1, 2, 4], "sha", "fate_fire"),
  ...cards("club", [8, 8], "sha", "fate_fire"),
  ...cards("diamond", [1, 2, 3], "sha", "fate_fire"),
  ...cards("heart", [6, 6, 7, 7, 8, 8], "shan"),
  ...cards("diamond", [1, 2, 3, 4, 5, 9, 9, 10, 11], "shan"),
  ...cards("heart", [1, 2, 3, 4, 5], "tao"),
  ...cards("diamond", [6, 7, 10], "tao"),
]);

export const MAGIC_DECK = Object.freeze([
  ...cards("diamond", [1, 2], "fate_fanatical"),
  ...cards("spade", [8, 9], "fate_misdirection"),
  ...cards("club", [11], "fate_misdirection"),
  ...cards("club", [9, 9], "fate_chakra"),
  ...cards("club", [10, 10], "fate_wild_axes"),
  ...cards("heart", [5, 9, 9], "wuxie"),
  ...cards("diamond", [6, 7, 8, 8], "wuxie"),
  ...cards("club", [4, 4, 6, 11, 11, 12, 12], "fate_disarm"),
  ...cards("spade", [6, 7], "fate_moon_arrow"),
  ...cards("heart", [1, 2], "fate_energy_transfer"),
  ...cards("heart", [10, 10], "fate_greed"),
  ...cards("club", [7, 7], "fate_greed"),
  ...cards("club", [5, 5], "fate_siren_song"),
]);

export const S_DECK = Object.freeze([
  ...cards("heart", [12, 12], "fate_divine_strength"),
  ...cards("heart", [11, 11], "fate_viper_strike"),
  ...cards("diamond", [12, 12], "fate_time_stop"),
  ...cards("heart", [13], "fate_soul_separation"),
  ...cards("diamond", [13, 13], "fate_laguna_blade"),
]);

export const EQUIPMENT_DECK = Object.freeze([
  ["spade", 11, "fate_eye_of_skadi"],
  ["spade", 13, "fate_claws_of_attack"],
  ["club", 13, "fate_sacred_relic"],
  ["club", 13, "fate_demon_edge"],
  ["spade", 9, "fate_diffusal_blade"],
  ["spade", 10, "fate_lothars_edge"],
  ["spade", 12, "fate_desolator"],
  ["spade", 13, "fate_sange_yasha"],
  ["spade", 11, "fate_looting_axe"],
  ["spade", 12, "fate_mystic_staff"],
  ["spade", 10, "fate_eaglehorn"],
  ["spade", 1, "fate_quelling_blade"],
  ["diamond", 11, "fate_ring"],
  ["spade", 2, "fate_blade_mail"],
  ["heart", 13, "fate_boots"],
  ["club", 2, "fate_mage_cloak"],
  ["club", 1, "fate_evasion_charm"],
]);

export const IMPLEMENTED_MAGIC = Object.freeze([
  "fate_fanatical",
  "fate_misdirection",
  "fate_chakra",
  "fate_wild_axes",
  "wuxie",
  "fate_disarm",
  "fate_moon_arrow",
  "fate_energy_transfer",
  "fate_greed",
  "fate_siren_song",
]);

export const ACTIVE_DECK = Object.freeze([
  ...BASIC_DECK,
  ...MAGIC_DECK.filter(card => IMPLEMENTED_MAGIC.includes(card[2])),
  ...S_DECK,
  ...EQUIPMENT_DECK,
]);

export const S_RAGE_COST = Object.freeze({
  fate_divine_strength: 2,
  fate_viper_strike: 2,
  fate_time_stop: 2,
  fate_soul_separation: 3,
  fate_laguna_blade: 3,
});

export function shuffled(values, random = Math.random) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function dealFivePlayerIdentities(random = Math.random) {
  return shuffled(FIVE_PLAYER_IDENTITIES, random);
}

export function dealPlayerIdentities(playerCount = 5, random = Math.random) {
  const total = Math.max(5, Math.min(8, Number(playerCount) || 5));
  // The eight-card identity pool contains three Sentinel, three Scourge and
  // two Neutral cards.  The five-player standard setup remains the fixed
  // 2/2/1 distribution; the second Neutral enters only in the full eight-
  // player setup so six- and seven-player games retain their existing
  // 2/3/1 and 3/3/1 distributions.
  const neutrals = total === 8 ? 2 : 1;
  const nonNeutral = total - neutrals;
  const sentinels = Math.floor(nonNeutral / 2);
  const scourges = nonNeutral - sentinels;
  return shuffled([
    ...Array(sentinels).fill(FACTION.SENTINEL),
    ...Array(scourges).fill(FACTION.SCOURGE),
    ...Array(neutrals).fill(FACTION.NEUTRAL),
  ], random);
}

export function gainRage(current, amount, maximum = 3) {
  return Math.min(maximum, current + Math.max(0, amount));
}

export function requiredDodges({ base = 1, extra = 0, frozen = false } = {}) {
  return (base + extra) * (frozen ? 2 : 1);
}

export function isUsefulCastTarget(kind, { attitude = 0, damaged = false, hp = Infinity, hand = 0 } = {}) {
  switch (kind) {
    case "heartstopper":
      return attitude < 0 && damaged;
    case "crystal_frost":
      return attitude < 0 && hand > 0;
    case "shallow_grave":
      return attitude > 0 && hp <= 1;
    case "bloodseeker":
      return attitude < 0 && hand > 0;
    case "techies_detonate":
      return attitude < 0;
    default:
      return false;
  }
}

export function evaluateNeutralFate(fateId, neutral, players) {
  if (!neutral?.alive) return false;
  const alive = players.filter(player => player.alive);
  switch (fateId) {
    case "shadow_punisher":
      return !alive.some(player => player.identity === FACTION.SCOURGE);
    case "holy_conqueror":
      return !alive.some(player => player.identity === FACTION.SENTINEL);
    case "spreading_plague": {
      const neighbors = neutral.neighbors || [];
      return neighbors.length > 0 && players.filter(player => neighbors.includes(player.id)).every(player => !player.alive);
    }
    case "fate_gamble":
      return alive.length === 3 && new Set(alive.map(player => player.identity)).size === 3;
    case "backlash_puppet": {
      const successorId = neutral.successorId || neutral.successor || neutral.neighbors?.[1];
      const successor = players.find(player => player.id === successorId);
      if (!successor) return false;
      if (successor.identity === FACTION.SENTINEL) return !alive.some(player => player.identity === FACTION.SCOURGE);
      if (successor.identity === FACTION.SCOURGE) return !alive.some(player => player.identity === FACTION.SENTINEL);
      return false;
    }
    case "death_caller":
      return alive.filter(player => player.id !== neutral.id).every(player => player.hp <= 2);
    case "paranoid_mathematician":
      return alive.every(player => player.rage % 2 === 1);
    case "roshan":
      return Boolean(neutral.roshanRevealed) && alive.length === 1 && alive[0].id === neutral.id;
    default:
      return false;
  }
}

export function evaluateWinner({ players, fateId, turnPlayerId, turnDirection = "clockwise" }) {
  const alive = players.filter(player => player.alive);
  const revealedRoshan = players.find(player => player.identity === FACTION.NEUTRAL && player.roshanRevealed);
  if (revealedRoshan && !revealedRoshan.alive) {
    return { kind: "roshan_defeated", winners: alive.map(player => player.id) };
  }

  const seats = players.some(player => Number.isFinite(player.seat));
  const ordered = seats
    ? players.slice().sort((a, b) => (a.seat ?? Number.MAX_SAFE_INTEGER) - (b.seat ?? Number.MAX_SAFE_INTEGER))
    : players.slice();
  const start = Math.max(0, ordered.findIndex(player => player.id === turnPlayerId));
  const step = turnDirection === "counterclockwise" ? -1 : 1;
  const resolutionOrder = Array.from(
    { length: ordered.length },
    (_, offset) => ordered[(start + step * offset + ordered.length) % ordered.length],
  );
  const neutralWinner = resolutionOrder.find(player =>
    player.identity === FACTION.NEUTRAL && evaluateNeutralFate(fateId, player, players),
  );
  if (neutralWinner) return { kind: "neutral", winners: [neutralWinner.id] };

  if (!alive.some(player => player.identity === FACTION.SCOURGE)) {
    return { kind: "sentinel", winners: players.filter(player => player.identity === FACTION.SENTINEL).map(player => player.id) };
  }
  if (!alive.some(player => player.identity === FACTION.SENTINEL)) {
    return { kind: "scourge", winners: players.filter(player => player.identity === FACTION.SCOURGE).map(player => player.id) };
  }
  return null;
}
