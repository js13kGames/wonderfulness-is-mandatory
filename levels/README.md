# Level authoring

Map: exactly 17 lines x 30 columns.

```
  .  empty            #  solid rock/grass       =  cloud (one-way platform, land on top)
  x  thorn (kills)    S  spawn (1 per level)    C  castle / goal
  *  star (portable)  O  socket (star slot; seating the star powers channel 8)

  >  <  v  ^   emitter, fires a WHITE (mask 7 = full rainbow) beam in that direction
  /  \         fixed mirror
  A a          toggle mirror, group 0   (A rests as '/', a rests as '\')
  D d          toggle mirror, group 1
  E e          toggle mirror, group 2
  !  @  $      pressure plate for group 0 / 1 / 2  (put it IN the floor row)
  p            prism: splits an incoming beam - RED turns left, GREEN goes straight, BLUE turns right
  r g b y k m  colour filter, passes mask 1 / 2 / 4 / 3 / 6 / 5
  R G B Y K M W  receiver, needs mask 1 / 2 / 4 / 3 / 6 / 5 / 7
  1..9         door, mask = the digit. SOLID until (power & mask) == mask, then passable.
```

Rules that matter when designing:

1. **Beams are floors.** A horizontal beam segment is a one-way platform whose surface is
   `row*16 + 8`. A solid floor tile's surface is `row*16`. So route a bridge through the
   *same row* as the floor it spans: you step off the ledge, drop 8px onto the rainbow, and
   step-assist lifts you back up on the far side. A bridge one row ABOVE the floor is 8px
   too high to walk onto and reads as broken.
2. **Bodies eclipse beams.** A unicorn's torso (feet-11 .. feet-3) blocks any beam passing
   through it. Standing ON a horizontal beam does NOT cut it (the beam is at the feet).
   A unicorn standing on the floor DOES cut a beam running in the row above the floor.
3. **Rest state must be harmless.** A toggle mirror's un-pressed orientation should send the
   beam into a wall or off-screen, never into a useful position, or there is no puzzle.
4. Solid: `#`, all optics (emitter/mirror/prism/filter/receiver), plates, and closed doors.
   Not solid: cloud, thorn, goal, socket, open doors.
5. Jump clears ~49px (3 tiles). A gate must be 4 tiles tall to be un-jumpable.
6. Receivers OR-accumulate every beam that hits them, so a `Y` (mask 3) receiver is satisfied
   by a red beam AND a green beam arriving from different directions.
7. Power is global and 1 frame behind: a lit receiver sets `power |= mask`; a door with that
   mask opens. The star in a socket sets bit 8.

Verify with:
```
node test/try.js levels/L04.txt          # lint + rest-state preview
node test/try.js levels/L04.txt --plan   # also prove it is solvable
```

Plan file `levels/L04.plan.json` — one entry per loop, last entry is the player:
```json
[ { "steps": [ { "x": 168, "hold": 900 } ] },
  { "steps": [ { "x": 424 } ] } ]
```
step fields: `x` target world-x (col*16+8), `hold` frames to wait after arriving,
`j` bunny-hop while moving, `a` press the drop/action button once on arrival.
