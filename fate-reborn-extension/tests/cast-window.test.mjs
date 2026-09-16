import test from 'node:test';
import assert from 'node:assert/strict';
import { limitCastSkills } from '../src/cast-window.js';
test('同一施法阶段每名英雄只能获得一次发动机会，下一个阶段恢复，其他英雄不受影响', async () => {
  const calls=[];
  const skills=limitCastSkills({a:{trigger:{global:'fateCastPhase'},filter:()=>true,async content(e,t,p){calls.push(p);}},b:{trigger:{global:'fateCastPhase'},async content(e,t,p){calls.push(p);}}});
  const hero={},other={},window={};
  assert.equal(skills.a.filter(window,hero),true);
  await skills.a.content({},window,hero);
  assert.equal(skills.a.filter(window,hero),false);
  assert.equal(skills.b.filter(window,hero),false);
  await skills.a.content({},window,hero);
  await skills.b.content({},window,other);
  await skills.a.content({}, {},hero);
  assert.deepEqual(calls,[hero,other,hero]);
});
test('发动条件不满足时不会消耗机会，非施法技能保持原实现',()=>{
  const regular={enable:'phaseUse'}, hero={}, window={};
  const skills=limitCastSkills({a:{trigger:{global:'fateCastPhase'},filter:()=>false},regular});
  assert.equal(skills.a.filter(window,hero),false);
  assert.equal(window.fateCastParticipants,undefined);
  assert.equal(skills.regular,regular);
});
test('施法从下一回合角色开始逆时针，跳过死亡角色；每次只开放当前施法者',async()=>{
  const {castOrder}=await import('../src/cast-window.js');
  const a={},b={},c={};a.previousSeat=b;b.previousSeat=c;c.previousSeat=a;
  assert.deepEqual(castOrder(a,[a,c]),[a,c]);
  const skills=limitCastSkills({a:{trigger:{global:'fateCastPhase'},async content(){}}});
  assert.equal(skills.a.filter({fateCaster:a},b),false);
  assert.equal(skills.a.filter({fateCaster:a},a),true);
});
