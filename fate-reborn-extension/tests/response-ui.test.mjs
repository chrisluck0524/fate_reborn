import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isFateResponse, isFatePhaseUse, isFateInteraction,
  canConfirmInteraction, canCancelInteraction, shouldShowNativeConfirmation,
} from '../src/response-ui.js';

const confirm = str => ({isConnected:true,str});

test('响应和主动出牌都进入统一操作条',()=>{
  const response={name:'chooseToUse',isMine:()=>true,type:'respondShan',respondTo:[{},{}]};
  const phase={name:'chooseToUse',isMine:()=>true,type:'phase'};
  assert.equal(isFateResponse(response),true);
  assert.equal(isFateResponse(phase),false);
  assert.equal(isFatePhaseUse(phase),true);
  assert.equal(isFateInteraction(response,confirm('oc')),true);
  assert.equal(isFateInteraction(phase,confirm('c')),true);
  assert.equal(isFateInteraction({name:'chooseControl',isMine:()=>true,controls:['红色','黑色']},undefined),true);
  assert.equal(isFateInteraction({...phase,isMine:()=>false},confirm('oc')),false);
});

test('确定只在引擎允许提交时亮起',()=>{
  const event={name:'chooseCardTarget',isMine:()=>true};
  assert.equal(canConfirmInteraction(event,confirm('c')),false);
  assert.equal(canConfirmInteraction(event,confirm('oc')),true);
  assert.equal(canConfirmInteraction(event,{isConnected:false,str:'oc'}),false);
  assert.equal(canConfirmInteraction({name:'chooseToUse',isMine:()=>true,type:'phase'},undefined),false);
});

test('阶段根事件也保留取消按钮，取消只由界面清除当前选择',()=>{
  const phase={name:'chooseToUse',isMine:()=>true,type:'phase'};
  assert.equal(canCancelInteraction(phase,confirm('c')),true);
  assert.equal(canCancelInteraction({...phase,skill:'fate_antimage_blink'},confirm('c')),true);
  assert.equal(canCancelInteraction({name:'chooseToRespond',isMine:()=>true},confirm('c')),true);
});

test('统一操作条接管选择事件的原生确认控件',()=>{
  assert.equal(shouldShowNativeConfirmation({name:'useCard',isMine:()=>false},confirm('oc')),false);
  assert.equal(shouldShowNativeConfirmation({name:'chooseToDiscard',isMine:()=>true},confirm('oc')),false);
  assert.equal(shouldShowNativeConfirmation({name:'chooseBool',isMine:()=>true},confirm('oc')),false);
  assert.equal(shouldShowNativeConfirmation(undefined,confirm('oc')),false);
});
