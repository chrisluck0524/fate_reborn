/** Counterclockwise seat order, anchored at the acting character. Keeps dead seats stable. */
function seatPosition(player) {
  const position = Number(player?.dataset?.position);
  if (Number.isFinite(position)) return position;
  const seat = Number(player?.getSeatNum?.());
  if (Number.isFinite(seat)) return seat;
  return Number.MAX_SAFE_INTEGER;
}

export function actionOrder(first, players) {
  // Native seats expose either dataset.position or getSeatNum(), depending on
  // when the arena was created.  Falling back to the latter keeps every
  // multi-target effect (including 能量转移) counterclockwise at startup.
  const seats=[...players].sort((a,b)=>seatPosition(b)-seatPosition(a));
  const index=seats.indexOf(first);
  return index<0?seats:seats.slice(index).concat(seats.slice(0,index));
}
export function orderedTargets(first, seats, targets) {
  const selected=new Set(targets);
  return actionOrder(first,seats).filter(player=>selected.has(player));
}
