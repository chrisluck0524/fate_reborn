export function castOrder(first, alive) {
  const result=[], seen=new Set();
  let current=first;
  while(current&&!seen.has(current)) {
    seen.add(current);
    if(alive.includes(current)) result.push(current);
    current=current.previousSeat||current.previous;
  }
  return result;
}

/** One cast opportunity per hero in the shared cast event, including off-turn heroes. */
export function limitCastSkills(skills) {
  return Object.fromEntries(Object.entries(skills).map(([name, skill]) => {
    if (skill.trigger?.global !== 'fateCastPhase') return [name, skill];
    return [name, {
      ...skill,
      filter(event, player) {
        return (!event.fateCaster || event.fateCaster === player) && !event.fateCastParticipants?.has(player) && (!skill.filter || skill.filter(event, player));
      },
      async content(event, trigger, player) {
        const used = trigger.fateCastParticipants ||= new Set();
        if (used.has(player)) return;
        used.add(player);
        return await skill.content(event, trigger, player);
      },
    }];
  }));
}
