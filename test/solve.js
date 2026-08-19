const G = require('./harness');
// scripted input: array of [frames, keybits]
function run(script) {
  let f = 0;
  for (const [n, k] of script) for (let i = 0; i < n; i++) { G.setK(k); G.step(); f++; if (G.won) return { won: 1, f } }
  return { won: G.won, f };
}
const L = 1, R = 2, J = 4, A = 8;

G.parseLevel(G.LEV[0].m); G.resetWorld();
// loop 1: walk right onto plate then hold
let r = run([[24, R], [40, 0]]);
console.log('loop1 x=', G.pl.x.toFixed(1), 'plates=', JSON.stringify(G.plates), 'segs=', G.segs.length / 5);
// dump beam segments
console.log('segments:', JSON.stringify([...G.segs].reduce((a, v, i) => (i % 5 ? a[a.length - 1].push(v) : a.push([v]), a), [])));
let bf = []; for (let i = 0; i < G.bfloor.length; i++) if (G.bfloor[i]) bf.push([i % G.GW, (i / G.GW) | 0]);
console.log('bridge cells:', JSON.stringify(bf));
