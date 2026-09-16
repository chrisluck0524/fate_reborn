/**
 * Reserve stable audio paths for later voice uploads.
 * Skill files: assets/audio/skill/<skill id>1.mp3 and <skill id>2.mp3
 * Death file:  assets/audio/die/<hero id>.mp3
 */
export function addSkillVoiceInterfaces(skills, heroSkillIds) {
  const result = { ...skills };
  for (const id of heroSkillIds) {
    if (!result[id]) continue;
    result[id] = { ...result[id], audio: 'ext:fate-reborn/assets/audio/skill:2' };
  }
  return result;
}

export function heroDeathVoiceTag(heroId) {
  return `die:ext:fate-reborn/assets/audio/die/${heroId}.mp3`;
}
