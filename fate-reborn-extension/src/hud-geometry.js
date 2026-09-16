export function hudSeats(width, height, opponents) {
  const right=width-420, center=(190+right)/2;
  if(opponents>=6) {
    const topCount=opponents-4, upper=height*.04, lower=Math.max(height*.29,upper+192);
    return [[right,lower],[right,upper],...Array.from({length:topCount},(_,i)=>[center+(topCount/2-i-.5)*205-69,12]),[18,upper],[18,lower]];
  }
  const topCount=Math.max(0,opponents-2);
  return [[right,height*.2],...Array.from({length:topCount},(_,i)=>[center+(topCount/2-i-.5)*220-69,12]),[18,height*.2]];
}
export function hudSelfSeat(width,height) {return [width-190,height-186];}
