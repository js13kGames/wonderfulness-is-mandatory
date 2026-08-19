const G = require('./harness');
console.log('levels:', G.LEV.length);
G.parseLevel(G.LEV[0].m); G.resetWorld();
// walk right for 200 frames, log position
let log = [];
for (let f = 0; f < 200; f++) { G.setK(2); G.step(); }
console.log('after 200f walking right: x=', G.pl.x.toFixed(1), 'y=', G.pl.y.toFixed(1), 'grounded=', G.pl.g, 'dead=', G.pl.dead);
console.log('plates:', JSON.stringify(G.plates), 'segs:', G.segs.length / 5, 'power:', G.power);
G.resetWorld();
// stand on plate: walk right 55 frames then stop
for (let f = 0; f < 120; f++) { G.setK(f < 52 ? 2 : 0); G.step(); }
console.log('on plate? x=', G.pl.x.toFixed(1), 'plates=', JSON.stringify(G.plates), 'segs=', G.segs.length / 5);
let bf = 0; for (let i = 0; i < G.bfloor.length; i++) if (G.bfloor[i]) bf++;
console.log('beam floor cells:', bf);
