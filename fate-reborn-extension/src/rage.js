export async function gainFateRage(player, amount) {
  const gained = Math.max(0, Math.min(amount, 3 - player.countMark("fate_rage_rule")));
  if (!gained) return 0;
  player.storage.fate_last_rage_gain = gained;
  player.addMark("fate_rage_rule", gained);
  if (player.hasSkill?.("fate_vengeful_wave")) await player.draw(gained);
  return gained;
}
