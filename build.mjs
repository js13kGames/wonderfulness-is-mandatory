// js13k build: concat -> terser -> roadroller -> inline html -> zip
//
// This is an ES module on purpose. Roadroller's CommonJS entry (index.cjs) loads
// the legacy `esm` shim, which throws on Node >= 22. Its index.mjs is clean, and
// `import` resolves to that, so the build works on current Node.
import fs from 'fs';
import cp from 'child_process';
import { minify } from 'terser';
import { Packer } from 'roadroller';

const ORDER = fs.readdirSync('src').filter(f => f.endsWith('.js')).sort();
const RAW = ORDER.map(f => fs.readFileSync('src/' + f, 'utf8')).join('\n');

const DEV = process.argv.includes('--dev');

// Minimal HTML shell. c = canvas. Body margin 0, black bg, canvas centered.
const SHELL = (body) =>
`<!DOCTYPE html><html lang=en><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1,user-scalable=no"><title>Wonderfulness Is Mandatory</title><style>html,body{margin:0;height:100%;background:#000;overflow:hidden;touch-action:none}canvas{position:absolute;inset:0;margin:auto;image-rendering:auto;touch-action:none}</style><canvas id=c></canvas>${body}`;

if (DEV) {
  fs.writeFileSync('dist/index.html', SHELL(`<script>${RAW}</script>`));
  console.log('DEV build -> dist/index.html  (' + RAW.length + ' raw js chars)');
  process.exit(0);
}

const min = await minify(RAW, {
  ecma: 2020,
  module: false,
  toplevel: true,
  compress: {
    passes: 4, unsafe: true, unsafe_arrows: true, unsafe_comps: true,
    unsafe_math: true, unsafe_methods: true, unsafe_proto: true,
    booleans_as_integers: true, pure_getters: true, hoist_funs: true,
    drop_console: true, keep_fargs: false,
  },
  mangle: { toplevel: true, properties: { regex: /^_/ } },
  format: { comments: false },
});
if (min.error) throw min.error;
const js = min.code;
fs.writeFileSync('dist/min.js', js);

// Roadroller's optimiser calls Math.random, so two builds of identical source
// produce different bytes and the committed zip drifts from a rebuild. Seed it so
// the artifact is reproducible: same source in, same zip out.
const realRandom = Math.random;
let seed = 0x13c0ffee >>> 0;   // any fixed value; this one just says 13
Math.random = () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const packer = new Packer([{ data: js, type: 'js', action: 'eval' }], {
  maxMemoryMB: 512,
});
await packer.optimize(2);
Math.random = realRandom;
const { firstLine, secondLine } = packer.makeDecoder();
const packed = firstLine + secondLine;

const html = SHELL(`<script>${packed}</script>`);
fs.writeFileSync('dist/index.html', html);

// GitHub Pages serves docs/ from the default branch - keep it byte-identical
fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync('docs/index.html', html);
fs.writeFileSync('docs/.nojekyll', '');

// Pin the stored mtime too, or two builds differ by the 2 timestamp bytes in the
// local header and the central directory. 13 Aug 2026 is the day the compo opened.
cp.execSync('touch -t 202608131300 dist/index.html');
cp.execSync('cd dist && rm -f game.zip && zip -9 -X -q game.zip index.html');
// try advzip/ect if present
try { cp.execSync('cd dist && advzip -z -4 -q game.zip', { stdio: 'ignore' }); } catch (e) {}

const zs = fs.statSync('dist/game.zip').size;
const LIMIT = 13312;
const bar = (n) => '█'.repeat(Math.round(n * 40)) + '░'.repeat(40 - Math.round(n * 40));
console.log(`raw js     ${RAW.length}`);
console.log(`terser     ${js.length}`);
console.log(`roadroller ${packed.length}`);
console.log(`html       ${html.length}`);
console.log(`ZIP        ${zs} / ${LIMIT}  (${(zs / LIMIT * 100).toFixed(1)}%)  ${LIMIT - zs} bytes free`);
console.log(bar(Math.min(1, zs / LIMIT)));
if (zs > LIMIT) { console.log('!! OVER LIMIT !!'); process.exitCode = 1; }

