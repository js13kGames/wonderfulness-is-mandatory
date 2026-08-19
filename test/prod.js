// Runs the TERSER-MINIFIED bundle (dist/min.js) in a stubbed DOM and drives real frames.
// Roadroller is lossless, so if min.js runs clean the packed index.html does too.
// This is the guard against mangling/unsafe-compress breakage.
const fs = require('fs');
function stubCtx() {
  const grad = { addColorStop() {} };
  return new Proxy({}, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'canvas') return { width: 240, height: 136 };
      return t[k] = (...a) => {
        if (String(k).startsWith('create')) return grad;
        if (k === 'measureText') return { width: 10 };
        if (k === 'getImageData') return { data: new Uint8ClampedArray(4) };
        return undefined;
      };
    },
    set(t, k, v) { t[k] = v; return true },
  });
}
const mk = (w, h) => ({ width: w || 300, height: h || 150, style: {}, getContext: () => stubCtx() });
const g = globalThis;
g.self = g;
g.c = mk(1280, 720);
g.document = { getElementById: () => g.c, createElement: () => mk(240, 136) };
g.devicePixelRatio = 2; g.innerWidth = 1280; g.innerHeight = 720;
g.navigator = { getGamepads: () => [null] };
g.localStorage = {};
let RAF = null, listeners = {};
g.requestAnimationFrame = fn => { RAF = fn; return 1 };
g.addEventListener = (n, f) => { (listeners[n] = listeners[n] || []).push(f) };
g.removeEventListener = () => {};
g.performance = { now: () => TNOW };
let TNOW = 0;
const gainStub = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
g.AudioContext = function () {
  return {
    state: 'running', currentTime: 0, sampleRate: 44100, destination: {}, resume() {},
    createGain: () => ({ gain: gainStub(), connect() {} }),
    createDynamicsCompressor: () => ({ connect() {} }),
    createOscillator: () => ({ type: '', frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }),
    createBuffer: (ch, n) => ({ getChannelData: () => new Float32Array(n), length: n }),
    createBufferSource: () => ({ buffer: 0, loop: 0, connect() {}, start() {}, stop() {} }),
  };
};

const code = fs.readFileSync(__dirname + '/../dist/min.js', 'utf8');
let errs = 0;
try { (0, eval)(code) } catch (e) { console.log('LOAD THREW: ' + e.stack); process.exit(1) }
if (!RAF) { console.log('no requestAnimationFrame registered - game never started'); process.exit(1) }

function key(code, down) {
  const h = down ? g.onkeydown : g.onkeyup;
  if (h) h({ code, preventDefault() {}, metaKey: 0, ctrlKey: 0 });
}
function frames(n, keys) {
  for (const k of keys || []) key(k, 1);
  for (let i = 0; i < n; i++) {
    TNOW += 16.7;
    const fn = RAF; RAF = null;
    try { fn(TNOW) } catch (e) { console.log('FRAME THREW: ' + e.stack); errs++; if (errs > 2) process.exit(1) }
    if (!RAF) { console.log('rAF not re-registered at frame ' + i); process.exit(1) }
  }
  for (const k of keys || []) key(k, 0);
}
console.log('loaded, driving frames...');
frames(5);
key('Enter', 1); key('Enter', 0); frames(5);          // title -> level 1
frames(120, ['ArrowRight']);                            // run right
key('KeyR', 1); key('KeyR', 0); frames(60);             // new loop
frames(200, ['ArrowRight']);
key('KeyQ', 1); key('KeyQ', 0); frames(30);             // undo
key('Space', 1); frames(30); key('Space', 0);           // jump
key('ShiftLeft', 1); frames(120, ['ArrowRight']); key('ShiftLeft', 0);  // fast forward
frames(900, ['ArrowRight']);                            // run past a full 13s loop
frames(60);
console.log(errs ? errs + ' FRAME ERRORS' : 'production bundle ran ' + '~1500 frames with no errors');
process.exitCode = errs ? 1 : 0;
