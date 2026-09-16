import test from 'node:test';
import assert from 'node:assert/strict';
import { hudSeats,hudSelfSeat } from '../src/hud-geometry.js';
test('五至八人场英雄、标记及手牌计数不重叠，玩家右下完整显示',()=>{
  for(const [width,height] of [[1500,852],[1366,690],[2048,1060]]) for(let count=4;count<=7;count++) {
    const seats=[...hudSeats(width,height,count),hudSelfSeat(width,height)];
    assert.equal(seats.length,count+1);
    for(const [x,y] of seats){assert.ok(x>=0&&y>=0);assert.ok(x+181<=width);assert.ok(y+176<=height);}
    for(let i=0;i<seats.length;i++) for(let j=i+1;j<seats.length;j++) {
      const [ax,ay]=seats[i],[bx,by]=seats[j];
      assert.ok(ax+181<=bx||bx+181<=ax||ay+176<=by||by+176<=ay,`${width}×${height}, ${count+1}人, 座位${i}/${j}`);
    }
  }
});
