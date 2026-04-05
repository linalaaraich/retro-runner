// ═══════════════════════════════════════════
//  Retro Runner — Game logic tests
// ═══════════════════════════════════════════
// Extracts and tests core game mechanics in Node.js

const T = 32;
let pass = 0, fail = 0;

function assert(cond, msg) {
  if (cond) { pass++; console.log(`  ✓ ${msg}`); }
  else { fail++; console.error(`  ✗ FAIL: ${msg}`); }
}

// ── Replicate core game functions ──

function boxOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function isSolid(t) {
  return t.type === 'ground' || t.type === 'brick' || t.type === 'qblock' || t.type === 'pipe_top' || t.type === 'pipe_body';
}

const LEVELS = [
  [
    '                                                                                              F',
    '                                                                                              |',
    '                                                                                              |',
    '                                                                                              |',
    '                                                                                              |',
    '               CC            CC                  CCC                       CC                  |',
    '                                                QBQ                                           |',
    '                                                                                              |',
    '                                   BBB                          BBQ                            |',
    '                                             E          P              E                      |',
    'GGGGGGGGGGGGGGGG GGGGGGGGGGGGG  GGGGGGGGGGGGGGGGG  GGGGGGGGGGGGGGG  GGGGGGGGGGGGGGGGGGGGGGGGGGGG',
    'GGGGGGGGGGGGGGGG GGGGGGGGGGGGG  GGGGGGGGGGGGGGGGG  GGGGGGGGGGGGGGG  GGGGGGGGGGGGGGGGGGGGGGGGGGGG',
  ],
  [
    '                                                                                                    F',
    '                                                                                                    |',
    '                                                                                                    |',
    '                                                                                                    |',
    '                CC                    C C                         CCC                                |',
    '                              CCC                    CCC                                             |',
    '                             QBQ                    QBQ                                              |',
    '                                                                                                    |',
    '                    BBB                      BBB                       BBQ                           |',
    '          E              P          E              P          E               P         E            |',
    'GGGGGGGGGGGGGG  GGGGGGGGGGGG   GGGGGGGGGGGGG  GGGGGGGGGGGGG   GGGGGGGGGGGG  GGGGGGGGGGGGGGGGGGGGGGGGGG',
    'GGGGGGGGGGGGGG  GGGGGGGGGGGG   GGGGGGGGGGGGG  GGGGGGGGGGGGG   GGGGGGGGGGGG  GGGGGGGGGGGGGGGGGGGGGGGGGG',
  ],
  [
    '                                                                                                            F',
    '                                                                                                            |',
    '                                                                                                            |',
    '                                                                                                            |',
    '               CC                 C C                    CC                    CCC                           |',
    '                          CCC                  CCC                    CCC                                    |',
    '                         QBQ                  QBQ                   QBQ                                      |',
    '                                                                                                            |',
    '                   BBB                  BBB                  BBQ                  BBB                        |',
    '         E              P       E             P       E              P       E             E                 |',
    'GGGGGGGGGGGGG  GGGGGGGGGGGG   GGGGGGGGGGG   GGGGGGGGGGG   GGGGGGGGGGGG  GGGGGGGGGGG   GGGGGGGGGGGGGGGGGGGGGGGGG',
    'GGGGGGGGGGGGG  GGGGGGGGGGGG   GGGGGGGGGGG   GGGGGGGGGGG   GGGGGGGGGGGG  GGGGGGGGGGG   GGGGGGGGGGGGGGGGGGGGGGGGG',
  ],
];

function loadLevel(n) {
  const tiles = [], coins = [], enemies = [];
  let flagX = 0;
  const map = LEVELS[n];
  const rows = map.length;
  const cols = Math.max(...map.map(r => r.length));

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const ch = map[y]?.[x] || ' ';
      const px = x * T, py = y * T;
      if (ch === 'G') tiles.push({ x: px, y: py, type: 'ground' });
      else if (ch === 'B') tiles.push({ x: px, y: py, type: 'brick' });
      else if (ch === 'Q') tiles.push({ x: px, y: py, type: 'qblock', active: true });
      else if (ch === 'C') coins.push({ x: px + 8, y: py + 4, w: 16, h: 24, alive: true });
      else if (ch === 'P') {
        tiles.push({ x: px, y: py, type: 'pipe_top' });
        tiles.push({ x: px, y: py + T, type: 'pipe_body' });
      }
      else if (ch === 'E') {
        enemies.push({ x: px, y: py, vx: -1, vy: 0, w: 24, h: 24, alive: true, stomped: false });
      }
      else if (ch === 'F') flagX = px;
      else if (ch === '|') tiles.push({ x: px, y: py, type: 'flagpole' });
    }
  }
  return { tiles, coins, enemies, flagX, rows, cols };
}

// ──────────────────────────────────────────
// TEST 1: Level parsing
// ──────────────────────────────────────────
console.log('\n== Level Parsing ==');

for (let i = 0; i < LEVELS.length; i++) {
  const { tiles, coins, enemies, flagX } = loadLevel(i);
  const groundTiles = tiles.filter(t => t.type === 'ground');
  assert(groundTiles.length > 10, `Level ${i+1}: has ground tiles (${groundTiles.length})`);
  assert(coins.length > 0, `Level ${i+1}: has coins (${coins.length})`);
  assert(enemies.length > 0, `Level ${i+1}: has enemies (${enemies.length})`);
  assert(flagX > 0, `Level ${i+1}: has a flag at x=${flagX}`);
}

// ──────────────────────────────────────────
// TEST 2: Player starts on solid ground
// ──────────────────────────────────────────
console.log('\n== Player Start Position ==');

for (let i = 0; i < LEVELS.length; i++) {
  const { tiles, rows } = loadLevel(i);
  const playerStartX = T * 2;
  const playerStartY = (rows - 3) * T;
  const playerW = 20, playerH = 26;

  // Simulate falling until landing
  let py = playerStartY, vy = 0;
  let landed = false;
  for (let frame = 0; frame < 120; frame++) {
    vy += 0.5;
    if (vy > 12) vy = 12;
    py += vy;

    for (const t of tiles) {
      if (!isSolid(t)) continue;
      if (playerStartX < t.x + T && playerStartX + playerW > t.x && py < t.y + T && py + playerH > t.y) {
        if (vy > 0) {
          py = t.y - playerH;
          vy = 0;
          landed = true;
        }
      }
    }
    if (landed) break;
  }
  assert(landed, `Level ${i+1}: player lands on ground (y=${Math.round(py)})`);
  assert(py < 400, `Level ${i+1}: player lands within canvas (y=${Math.round(py)} < 400)`);
}

// ──────────────────────────────────────────
// TEST 3: Enemies fall to ground with gravity
// ──────────────────────────────────────────
console.log('\n== Enemy Gravity ==');

for (let i = 0; i < LEVELS.length; i++) {
  const { tiles, enemies } = loadLevel(i);
  let allLanded = true;
  let anyTested = false;

  let landedCount = 0;
  for (const e of enemies) {
    let ey = e.y, evy = e.vy;
    let landed = false;

    for (let frame = 0; frame < 120; frame++) {
      evy += 0.4;
      if (evy > 10) evy = 10;
      ey += evy;

      // Fell off map — enemy dies, that's OK
      if (ey > 500) break;

      for (const t of tiles) {
        if (!isSolid(t)) continue;
        if (e.x < t.x + T && e.x + e.w > t.x && ey < t.y + T && ey + e.h > t.y) {
          if (evy >= 0) {
            ey = t.y - e.h;
            evy = 0;
            landed = true;
          }
        }
      }
      if (landed) break;
    }

    if (landed) landedCount++;
    anyTested = true;
  }
  // Most enemies should land (some may spawn over gaps — that's fine)
  const landRatio = landedCount / enemies.length;
  assert(anyTested && landRatio >= 0.8, `Level ${i+1}: ${landedCount}/${enemies.length} enemies land (${Math.round(landRatio*100)}%)`);
}

// ──────────────────────────────────────────
// TEST 4: All gaps are jumpable
// ──────────────────────────────────────────
console.log('\n== Gap Analysis ==');

for (let i = 0; i < LEVELS.length; i++) {
  const { tiles } = loadLevel(i);
  const rows = LEVELS[i].length;
  const groundY = (rows - 2) * T; // top ground row

  // Find ground tiles at groundY
  const groundTiles = tiles.filter(t => t.type === 'ground' && t.y === groundY).map(t => t.x).sort((a, b) => a - b);

  // Find gaps
  let maxGap = 0;
  for (let j = 1; j < groundTiles.length; j++) {
    const gap = groundTiles[j] - (groundTiles[j-1] + T);
    if (gap > maxGap) maxGap = gap;
  }

  // Max jump distance: airtime * maxSpeed
  // jumpForce = -10.5, gravity = 0.5, maxSpeed = 5
  // airtime = 2 * 10.5 / 0.5 = 42 frames
  // distance = 42 * 5 = 210 px
  const maxJumpDist = 210;

  assert(maxGap < maxJumpDist, `Level ${i+1}: max gap ${maxGap}px < max jump ${maxJumpDist}px`);
}

// ──────────────────────────────────────────
// TEST 5: Player rendering uses correct Y
// ──────────────────────────────────────────
console.log('\n== Player Rendering (source check) ==');

const fs = require('fs');
const src = fs.readFileSync('index.html', 'utf8');

// Check that translate uses dy, not 0
const hasCorrectTranslate = src.includes('ctx.translate(dx, dy)') && src.includes('ctx.translate(dx + player.w, dy)');
assert(hasCorrectTranslate, 'drawPixelChar uses dy in translate (not 0)');

// Check no ctx.translate(dx, 0) or ctx.translate(dx + player.w, 0) remains
const hasBrokenTranslate = /ctx\.translate\(dx\s*(\+\s*player\.w)?\s*,\s*0\s*\)/.test(src);
assert(!hasBrokenTranslate, 'No translate(..., 0) calls for player rendering');

// ──────────────────────────────────────────
// TEST 6: Enemies have vy property
// ──────────────────────────────────────────
console.log('\n== Enemy Initialization ==');

const hasEnemyVy = src.includes('vy: 0') && src.includes('e.vy +=');
assert(hasEnemyVy, 'Enemies initialized with vy and have gravity applied');

// Check enemy gravity constant
const hasEnemyGravity = /e\.vy\s*\+=\s*0\.\d/.test(src);
assert(hasEnemyGravity, 'Enemy gravity is applied each frame');

// ──────────────────────────────────────────
// TEST 7: Collision detection
// ──────────────────────────────────────────
console.log('\n== Collision Detection ==');

assert(boxOverlap({x:0,y:0,w:10,h:10}, {x:5,y:5,w:10,h:10}), 'Overlapping boxes detected');
assert(!boxOverlap({x:0,y:0,w:10,h:10}, {x:20,y:20,w:10,h:10}), 'Non-overlapping boxes pass');
assert(!boxOverlap({x:0,y:0,w:10,h:10}, {x:10,y:0,w:10,h:10}), 'Edge-touching boxes do not overlap');
assert(boxOverlap({x:0,y:0,w:10,h:10}, {x:9,y:0,w:10,h:10}), '1px overlap detected');

// ──────────────────────────────────────────
// TEST 8: Player can reach the flag
// ──────────────────────────────────────────
console.log('\n== Flag Reachability ==');

for (let i = 0; i < LEVELS.length; i++) {
  const { tiles, flagX, rows } = loadLevel(i);
  const groundY = (rows - 2) * T;

  // Check there's ground near the flag
  const groundNearFlag = tiles.some(t =>
    t.type === 'ground' && t.y === groundY && Math.abs(t.x - flagX) < T * 3
  );
  assert(groundNearFlag, `Level ${i+1}: ground exists near flag (x=${flagX})`);
}

// ──────────────────────────────────────────
// TEST 9: Simulate 5 seconds of gameplay
// ──────────────────────────────────────────
console.log('\n== Gameplay Simulation (300 frames) ==');

{
  const { tiles, enemies } = loadLevel(0);
  const rows = LEVELS[0].length;
  const p = { x: T*2, y: (rows-3)*T, vx: 0, vy: 0, w: 20, h: 26, onGround: false };

  // Simulate player running right for 300 frames
  let maxX = p.x;
  let everLanded = false;

  for (let frame = 0; frame < 300; frame++) {
    // Hold right
    p.vx += 0.65;
    p.vx *= 0.88;
    if (p.vx > 5) p.vx = 5;

    p.vy += 0.5;
    if (p.vy > 12) p.vy = 12;

    // Move X
    p.x += p.vx;
    for (const t of tiles) {
      if (!isSolid(t)) continue;
      if (p.x < t.x+T && p.x+p.w > t.x && p.y < t.y+T && p.y+p.h > t.y) {
        if (p.vx > 0) p.x = t.x - p.w;
        p.vx = 0;
      }
    }

    // Move Y
    p.y += p.vy;
    p.onGround = false;
    for (const t of tiles) {
      if (!isSolid(t)) continue;
      if (p.x < t.x+T && p.x+p.w > t.x && p.y < t.y+T && p.y+p.h > t.y) {
        if (p.vy > 0) {
          p.y = t.y - p.h;
          p.vy = 0;
          p.onGround = true;
          everLanded = true;
        }
      }
    }

    // Jump when approaching a gap or an obstacle ahead
    if (p.onGround) {
      const aheadX = p.x + p.w + 16;
      const hasFloor = tiles.some(t => isSolid(t) && aheadX >= t.x && aheadX < t.x+T && Math.abs((p.y+p.h)-t.y) < 8);
      const hasWall = tiles.some(t => isSolid(t) && aheadX >= t.x && aheadX < t.x+T && p.y < t.y+T && p.y+p.h > t.y);
      if (!hasFloor || hasWall) {
        p.vy = -10.5;
        p.onGround = false;
      }
    }

    if (p.x > maxX) maxX = p.x;

    // Death check
    if (p.y > 450) {
      // Respawn
      p.x = T*2; p.y = (rows-3)*T; p.vx = 0; p.vy = 0;
    }
  }

  assert(everLanded, 'Player lands on ground during simulation');
  assert(maxX > T * 10, `Player progresses rightward (reached x=${Math.round(maxX)})`);

  // Check enemies moved
  let enemyMoved = false;
  const origPositions = enemies.map(e => e.x);
  for (let frame = 0; frame < 60; frame++) {
    for (const e of enemies) {
      if (!e.alive || e.stomped) continue;
      e.x += e.vx;
      e.vy += 0.4;
      if (e.vy > 10) e.vy = 10;
      e.y += e.vy;
      for (const t of tiles) {
        if (!isSolid(t)) continue;
        if (e.x < t.x+T && e.x+e.w > t.x && e.y < t.y+T && e.y+e.h > t.y) {
          if (e.vy >= 0) { e.y = t.y-e.h; e.vy = 0; }
        }
      }
    }
  }
  for (let j = 0; j < enemies.length; j++) {
    if (Math.abs(enemies[j].x - origPositions[j]) > 5) enemyMoved = true;
  }
  assert(enemyMoved, 'Enemies move during simulation');
}

// ──────────────────────────────────────────
// Results
// ──────────────────────────────────────────
console.log(`\n${'═'.repeat(40)}`);
console.log(`Results: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
