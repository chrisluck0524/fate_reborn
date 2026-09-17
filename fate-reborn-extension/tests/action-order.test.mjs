import test from 'node:test';
import assert from 'node:assert/strict';
import {actionOrder,orderedTargets} from '../src/action-order.js';
test('所有起点的结算均逆时针绕座位一周，输入顺序不影响结果',()=>{
 const seats=Array.from({length:8},(_,i)=>({dataset:{position:String(i)},id:i}));
 for(let first=0;first<8;first++) assert.deepEqual(actionOrder(seats[first],[...seats].reverse()).map(p=>p.id),Array.from({length:8},(_,i)=>(first-i+8)%8));
 assert.deepEqual(seats.map(p=>p.id),[0,1,2,3,4,5,6,7]);
});
test('跳过死亡与未选目标，不按点选顺序结算，多张分配不改变角色顺序',()=>{
 const seats=Array.from({length:5},(_,i)=>({dataset:{position:String(i)},id:i}));
 assert.deepEqual(actionOrder(seats[0],seats.filter(p=>p.id!==4)).map(p=>p.id),[0,3,2,1]);
 assert.deepEqual(orderedTargets(seats[0],seats,[seats[1],seats[3]]).map(p=>p.id),[3,1]);
});
test('尚未写入界面位置时，结算仍按原生座位号逆时针进行',()=>{
 const seats=Array.from({length:4},(_,i)=>({id:i,getSeatNum:()=>i+1}));
 assert.deepEqual(actionOrder(seats[0],[...seats].reverse()).map(player=>player.id),[0,3,2,1]);
});
