// js13k build: concat -> terser -> roadroller -> inline html -> zip
const fs = require('fs'), cp = require('child_process');
const { minify } = require('terser');
const { Packer } = require('roadroller');

const ORDER = fs.readdirSync('src').filter(f => f.endsWith('.js')).sort();
const RAW = ORDER.map(f => fs.readFileSync('src/' + f, 'utf8')).join('\n');

const DEV = process.argv.includes('--dev');

// Minimal HTML shell. c = canvas. Body margin 0, black bg, canvas centered.
const SHELL = (body) =>
`<!DOCTYPE html><html lang=en><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1,user-scalable=no"><title>Wonderfulness Is Mandatory</title><style>html,body{margin:0;height:100%;background:#000;overflow:hidden;touch-action:none}canvas{position:absolute;inset:0;margin:auto;image-rendering:auto;touch-action:none}</style><canvas id=c></canvas>${body}`;

(async () => {
  if (DEV) {
    fs.writeFileSync('dist/index.html', SHELL(`<script>${RAW}</script>`));
    console.log('DEV build -> dist/index.html  (' + RAW.length + ' raw js chars)');
    return;
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

  const packer = new Packer([{ data: js, type: 'js', action: 'eval' }], {
    maxMemoryMB: 512,
  });
  await packer.optimize(2);
  const { firstLine, secondLine } = packer.makeDecoder();
  const packed = firstLine + secondLine;

  const html = SHELL(`<script>${packed}</script>`);
  fs.writeFileSync('dist/index.html', html);

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
})();
