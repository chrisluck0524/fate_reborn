export async function freezeIcePrison(caster, target, cards) {
  if (!cards.length) return;
  // Tag the expansion event before it runs; awaiting it returns its result.
  const expansion = caster.addToExpansion(cards, target, 'give');
  expansion.gaintag.add('fate_ice_prison');
  await expansion;
  caster.storage.fate_ice_prison_target = target.playerid;
  // The frozen cards last through the caster's whole turn.  A global
  // phaseAfter temp expiry may remove this marker after an unrelated player
  // finishes first, so keep it until the release routine clears it.
  target.addSkill('fate_ice_prison_target');
  caster.addSkill('fate_ice_prison_release');
}

export async function releaseIcePrison(caster, players) {
  const target = players.find(player => player.playerid === caster.storage.fate_ice_prison_target);
  const cards = caster.getExpansions('fate_ice_prison');
  if (cards.length) {
    if (target?.isAlive()) await target.gain(cards, 'gain2');
    else await caster.loseToDiscardpile(cards);
  }
  target?.removeSkill('fate_ice_prison_target');
  delete caster.storage.fate_ice_prison_target;
  caster.removeSkill('fate_ice_prison_release');
}
