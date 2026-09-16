/** Counterclockwise seat order, anchored at the acting character. Keeps dead seats stable. */
export function actionOrder(first, players) {
  const seats=[...players].sort((a,b)=>Number(b.dataset.position)-Number(a.dataset.position));
  const index=seats.indexOf(first);
  return index<0?seats:seats.slice(index).concat(seats.slice(0,index));
}
export function orderedTargets(first, seats, targets) {
  const selected=new Set(targets);
  return actionOrder(first,seats).filter(player=>selected.has(player));
}
