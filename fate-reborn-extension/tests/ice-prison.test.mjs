import test from 'node:test';
import assert from 'node:assert/strict';
import {freezeIcePrison,releaseIcePrison} from '../src/ice-prison.js';
test('冰封在移动前标记牌，返还技能不会在回合结束前过期，结束时返还原牌并清理状态',async()=>{
  const cards=[{},{}], tags=new Set(),skills=new Set();let gained;
  const target={playerid:'target',isAlive:()=>true,addTempSkill(){},removeSkill(){},async gain(value){gained=value;}};
  const caster={storage:{},addToExpansion(value,source){assert.equal(value,cards);assert.equal(source,target);return {gaintag:tags,then(resolve){assert.ok(tags.has('fate_ice_prison'));resolve({});}};},addSkill(skill){skills.add(skill);},removeSkill(skill){skills.delete(skill);},getExpansions(tag){assert.equal(tag,'fate_ice_prison');return cards;}};
  await freezeIcePrison(caster,target,cards);
  assert.ok(skills.has('fate_ice_prison_release'));
  await releaseIcePrison(caster,[target]);
  assert.equal(gained,cards);
  assert.equal(caster.storage.fate_ice_prison_target,undefined);
  assert.equal(skills.size,0);
});
test('冰封目标死亡时将暂存牌移入弃牌堆',async()=>{
  const cards=[{}];let discarded;
  const caster={storage:{fate_ice_prison_target:'dead'},getExpansions:()=>cards,async loseToDiscardpile(value){discarded=value;},removeSkill(){}};
  await releaseIcePrison(caster,[{playerid:'dead',isAlive:()=>false,removeSkill(){}}]);
  assert.equal(discarded,cards);
});
