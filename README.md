# WONDERFULNESS IS MANDATORY

A js13kGames 2026 entry. Theme: **Unicorns and Rainbows**.

You are a tiny unicorn with thirteen seconds. When the loop ends, a ghost is left
behind that replays your recorded inputs *exactly* — so you build a herd of
time-looping unicorns to hold every switch at once.

The rainbows are not scenery. They are the circuitry **and** the floor. You route a
beam through mirrors, prisms and colour filters, and then you walk across the beam
you just routed. And your body casts a shadow: a unicorn's torso blocks a beam
passing through it — but never the beam it is standing on.

Everything is procedural. No images, no fonts, no libraries, no network. One file.

---

## Play

Open `dist/index.html`, or unzip `dist/game.zip`.

| | Desktop | Gamepad | Touch |
|---|---|---|---|
| Move | `←` `→` / `A` `D` | left stick / d-pad | left pads |
| Jump | `↑` `W` `Z` `Space` | A / d-pad up | `▲` pad |
| Drop star | `↓` `S` `X` | X | `✦` pad |
| New loop | `R` / `Enter` | B | top-right `↻` |
| Undo last unicorn | `Q` / `Backspace` | Y | top-right `↶` |
| Fast-forward | hold `Shift` / `Tab` | shoulder | top-left `»` |
| Restart level | `T` | start | — |
| Mute | `M` | — | — |

---

## Build

```bash
npm install
npm run build        # -> dist/index.html + dist/game.zip  (must be <= 13312 bytes)
npm run dev          # readable single-file build, no minification
npm test             # every check below
```

Pipeline: concatenate `src/*.js` in filename order → **terser** → **Roadroller** →
inline into a minimal HTML shell → `zip -9` → `advzip` if installed.

Never open `dist/index.html` in an editor — Roadroller output contains raw control
bytes and any tool that normalises line endings will destroy it.

## Source layout

```
src/00_core.js     canvas, tile glyph table, colour masks, unified input map
src/10_audio.js    procedural SFX + the 13.000s song, rendered to one buffer
src/20_levels.js   GENERATED - edit levels/*.txt instead
src/30_sim.js      physics, beam propagation, body occlusion, the time loop
src/40_render.js   tiles, devices, beams, the procedural unicorn, particles
src/50_game.js     game states, curtain call, HUD, title, ending

levels/LNN.txt          17x30 ASCII maps          (see levels/README.md)
levels/LNN.plan.json    a proof that the level is solvable
levels/meta.json        level names and intertitles
build.js                the whole build
```

## Tests

| command | what it proves |
|---|---|
| `node test/lint.js` | no glyph collisions; every map is 17x30 with a spawn and a goal |
| `node test/devices.js` | 23 unit tests over emitters, mirrors, prisms, filters, receivers, doors, plates, the star, and body occlusion |
| `node test/batch.js` | every level is solvable, with the ghost count its plan claims |
| `node test/playthrough.js` | the whole game runs start → ending |
| `node test/prod.js` | the **terser-minified** bundle survives ~1500 real frames |
| `node test/try.js levels/L07.txt --plan` | lint + ASCII beam preview + solvability for one level |

`test/prod.js` is the important one: Roadroller is lossless, so if the minified
bundle runs clean the packed `index.html` does too. It is the guard against
`unsafe` compression and top-level mangling quietly breaking the game.

---

## Design notes

**Colour is the wiring.** Every beam carries a 3-bit mask (R=1, G=2, B=4). A filter
ANDs it. A prism splits it: red turns left, green goes straight, blue turns right.
A receiver ORs together *everything* that hits it, so a yellow receiver is satisfied
by a red beam and a green beam arriving from different directions — which means two
unicorns can each deliver half a colour. There is no "combiner" device; the union
happens at the receiver, which is one line of code and one fewer rule to teach.

**Beams are floors.** A horizontal beam segment is a one-way platform. Bridges are
always routed in the same row as the floor they span: you step off a ledge, drop 8px
onto the rainbow, and a step-assist lifts you back up on the far side.

**Determinism.** Ghost *k* collides only with ghosts *0..k-1*, so causality is strictly
ordered and a ghost can never be disturbed by a unicorn from its future. Devices are
driven by every actor, so breaking a past self's plan is a real, intended consequence.
Door state lags the receivers by one frame, which makes the whole beam network a pure
function of the ordered input tapes and removes any need for fixpoint iteration.

**The music is the clock.** The song is exactly 13.000 seconds, rendered once into a
single `AudioBuffer` and restarted with every time loop, so it can never desync. It
is 13 beats with an accent on each second — 13/4 is a subtly wrong meter, which is
free cosmic horror. One `dread` scalar re-renders it from major to minor, adds a
detuned sub drone and tape hiss, and drops the hats.

**The world drains, the rainbows never do.** Desaturation is composited *before* the
beams are drawn, so as the game decays the world goes grey while the circuitry stays
impossibly vivid.
