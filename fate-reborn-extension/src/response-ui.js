export function isFateResponse(event) {
  return !!event?.isMine?.() && ['chooseToUse','chooseToRespond'].includes(event.name) && (!!event.respondTo || event.type === 'wuxie');
}

export function isFatePhaseUse(event) {
  // A skill/card target picker is a child of the phase-use event.  It still
  // belongs to the player's action phase, so it must keep the same operation
  // bar (including the end-turn control).
  let current = event;
  while (current) {
    if (current?.isMine?.() && current.name === 'chooseToUse' && current.type === 'phase' && !current.respondTo) return true;
    current = current.parent;
  }
  return false;
}

export function isFateInteraction(event, confirm) {
  if (!event?.isMine?.()) return false;
  // The root of a use phase can exist before the engine has mounted its
  // native confirm control.  Keep the Fate operation bar visible throughout.
  if (isFatePhaseUse(event)) return true;
  // chooseControl (for example Chakra's red/black guess) owns a native
  // control row rather than ui.confirm.  It is rendered in the same Fate bar.
  if (event.name === 'chooseControl') return true;
  if (!confirm?.isConnected) return false;
  return [
    'chooseToUse', 'chooseToRespond', 'chooseCard', 'chooseTarget',
    'chooseCardTarget', 'chooseToDiscard', 'choosePlayerCard', 'chooseBool',
  ].includes(event.name);
}

export function canConfirmInteraction(event, confirm) {
  return isFateInteraction(event, confirm) && !!confirm && typeof confirm.str === 'string' && confirm.str.includes('o');
}

export function canCancelInteraction(event, confirm) {
  return isFateInteraction(event, confirm) && !!confirm && typeof confirm.str === 'string' && confirm.str.includes('c');
}

export function shouldShowNativeConfirmation(event, confirm) {
  return !!event?.isMine?.() && !isFateInteraction(event, confirm);
}
