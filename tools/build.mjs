#!/usr/bin/env node
// build.mjs -- terser -> document.write(html/css) -> Roadroller -> index.html -> zip
// usage: node build.mjs [--opt 0|1|2] [--fresh]
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'fs';
import { execFileSync } from 'child_process';
import { Packer } from 'roadroller';
import { minify } from 'terser';

const OPT     = Number((process.argv.find(a => a.startsWith('--opt=')) || '--opt=1').slice(6));
const FRESH   = process.argv.includes('--fresh');
const CACHE   = 'roadroller-params.json';
const LIMIT   = 13312;

// 1 ---------------------------------------------------------------- terser
const src = readFileSync('src/game.js', 'utf8');
const min = await minify(src, JSON.parse(readFileSync('terser2.json', 'utf8')));
if (min.error) throw min.error;

// 2 ------------------------------------------- prepend the HTML/CSS payload
const SHELL = '<body style=margin:0;overflow:hidden;background:#000><canvas id=c>';
const combined = 'document.write`' + SHELL + '`;' + min.code;
mkdirSync('out', { recursive: true });
writeFileSync('out/combined.js', combined);

// 3 ------------------------------------------------------------ roadroller
let options = { maxMemoryMB: 150 };
if (!FRESH && existsSync(CACHE)) Object.assign(options, JSON.parse(readFileSync(CACHE, 'utf8')));
const packer = new Packer([{ data: combined, type: 'js', action: 'eval' }], options);
if (FRESH || !existsSync(CACHE)) {
  const r = await packer.optimize(OPT);          // 1 = ~10s, 2 = ~1-2 min
  writeFileSync(CACHE, JSON.stringify(r.best, null, 1));
  console.error('roadroller search:', r.bestSize, 'bytes,', (r.elapsedMsecs/1000).toFixed(1) + 's');
}
const { firstLine, secondLine } = packer.makeDecoder();

// 4 --------------------------------------------------------------- inline
mkdirSync('dist', { recursive: true });
writeFileSync('dist/index.html', '<script>' + firstLine + secondLine + '</script>');

// 5 ------------------------------------------------------------------ zip
execFileSync('sh', ['-c', 'rm -f dist/index.zip && cd dist && zip -q -9 -X index.zip index.html']);
try { execFileSync('advzip', ['-z', '-4', '-i', '99', '-q', 'dist/index.zip']); } catch {}
try { execFileSync('ect',    ['-9', '-zip', '-strip', 'dist/index.zip']); } catch {}

const z = statSync('dist/index.zip').size;
console.log(`src ${src.length}  terser ${min.code.length}  roadroller ${firstLine.length + secondLine.length}  zip ${z}  (${LIMIT - z} bytes left)`);
if (z > LIMIT) process.exitCode = 1;
