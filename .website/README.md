---
directors_cut: https://mvnshi.github.io/js13k-2026/
# See github.com/js13kGames/hello-world for supported frontmatter
---

**WONDERFULNESS IS MANDATORY** - a 13 KB time-loop puzzle platformer where rainbows are circuitry *and* the floor.

You have 13 seconds. When the loop ends, a ghost replays your exact moves - so you build a herd of unicorns to hold every switch at once. The rainbows aren't scenery: they're the wiring. Route beams through mirrors, prisms, and color filters, then walk across the beam you just routed. Your body blocks beams - but never the one you're standing on.

**Controls**  
Desktop: `←→ / A / D` move · `↑ / W / Z / Space` jump · `↓ / S / X` drop star · `R / Enter` new loop · `Q / Backspace` undo · `Shift / Tab` fast-forward · `T` restart · `M` mute · `Esc` pause  
Mobile: the screen becomes a **Game Boy** - D-pad (move / jump / drop), magenta A (jump), pills for undo / pause / fast-forward / loop. Screen tap = jump / start / skip.

**Why it sticks**  
- The music *is* the clock - exactly 13.000 seconds, restarts every loop, world pulses with each beat (even at 5x speed)  
- Ghost route dots show exactly where every unicorn walks - plan multi-loop timing visually  
- The "loan bridge" level: ghost holds a mirror to make a rainbow bridge; you cross, then it steps off so the beam swings to open the gate  
- Par+1 unicorns per level; overspending draws from a 13-unicorn reserve. Finish at par = 1 unicorn returned. Reserve 13/13 at the end  
- 13 KB. One file. No images, fonts, or libraries. Runs offline.  

**Tech details**  
- Deterministic: ghost *k* collides only with ghosts 0..k-1; devices driven by ordered input tapes; door state lags receivers by one frame = pure function, no fixpoint iteration  
- Music IS the clock: 13.000 s rendered once into a single AudioBuffer, restarted every loop so it never desyncs  
- 13 beats, one accent per second - 13/4 meter = free cosmic horror  
- Procedural unicorn, beams, particles, sky, audio - zero assets, zero libraries, runs offline  
- 13,308 bytes gzipped, one self-contained HTML file. Tested by a bot that plays all 13 chapters to the ending at par - reserve 13/13. !!!