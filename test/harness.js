// Headless harness: runs the REAL game source in Node with a stubbed canvas.
const fs = require('fs');
function stubCtx() {
  const grad = { addColorStop() {} };
  const h = {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'canvas') return { width: 168, height: 96 };
      return t[k] = (...a) => {
        if (String(k).startsWith('create')) return grad;
        if (k === 'measureText') return { width: 10 };
        return undefined;
      };
    },
    set(t, k, v) { t[k] = v; return true },
  };
  return new Proxy({}, h);
}
function mkCanvas(w, h) {
  const cv = { width: w || 300, height: h || 150, style: {}, getContext: () => stubCtx(), toDataURL: () => '' };
  return cv;
}
const g = globalThis;
g.c = mkCanvas(800, 450);
g.document = { getElementById: () => g.c, createElement: () => mkCanvas(168, 96) };
g.devicePixelRatio = 1; g.innerWidth = 800; g.innerHeight = 450;
g.addEventListener = () => {}; g.removeEventListener = () => {};
g.requestAnimationFrame = () => 0;
g.performance = { now: () => 0 };
g.self = g;
g.AudioContext = function () {
  return { state: 'running', currentTime: 0, destination: {}, resume() {},
    createGain: () => ({ gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }),
    createOscillator: () => ({ type: '', frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }) };
};

const ORDER = fs.readdirSync(__dirname + '/../src').filter(f => f.endsWith('.js')).sort();
let SRC = ORDER.map(f => fs.readFileSync(__dirname + '/../src/' + f, 'utf8')).join('\n');
// don't autostart the rAF loop
SRC = SRC.replace('requestAnimationFrame(loop);', '');
// expose everything
SRC += '\n;globalThis.G={parseLevel,resetWorld,step,commitLoop,undoLoop,LEV,startLevel,' +
  'get ghosts(){return ghosts},get actors(){return actors},get frame(){return frame},' +
  'get won(){return won},get pl(){return pl},get power(){return power},get segs(){return segs},' +
  'get plates(){return plates},get star(){return star},get bfloor(){return bfloor},' +
  'get TT(){return TT},get TP(){return TP},get racc(){return racc},' +
  'setK(v){K=v},get K(){return K},LOOPF,GW,GH,TS,W,H,idx,solidCell,owTop,CH,' +
  'tick,get st(){return st},set st(v){st=v},get li(){return li},get total(){return total},' +
  'get cc(){return cc},nextLevel,get gndY(){return gndY},get cr(){return cr}};';
(0, eval)(SRC);
module.exports = globalThis.G;
