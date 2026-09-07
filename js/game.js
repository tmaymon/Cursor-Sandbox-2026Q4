import {
  bounceInsideCircle,
  circlesOverlap,
  clamp,
  collectScore,
  dist,
  lightDrainPerSecond,
  lightRadius,
  mulberry32,
  randRange,
  randSign,
  turnToward,
} from "./math.js";

export const ARENA_RADIUS = 400;
export const HS_KEY = "lumen-drift-hiscore";

export const State = {
  MENU: "menu",
  PLAYING: "playing",
  PAUSED: "paused",
  GAMEOVER: "gameover",
};

function readHighScore() {
  try {
    return Number(localStorage.getItem(HS_KEY)) || 0;
  } catch {
    return 0;
  }
}

function writeHighScore(score) {
  try {
    localStorage.setItem(HS_KEY, String(score));
  } catch {
    /* ignore quota / private mode */
  }
}

export class Game {
  constructor(rng = Math.random) {
    this.rng = rng;
    this.highScore = readHighScore();
    this.reset(State.MENU);
  }

  reset(state = State.MENU) {
    this.state = state;
    this.time = 0;
    this.score = 0;
    this.wave = 1;
    this.waveT = 0;
    this.motesCollected = 0;
    this.shake = 0;
    this.flash = 0;
    this.events = [];
    this.popups = [];
    this.particles = [];
    this.pulses = [];
    this.player = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      r: 12,
      light: 100,
      dashT: 0,
      invuln: 0,
      combo: 0,
      comboT: 0,
      thrusting: false,
    };
    this.motes = [];
    this.rocks = [];
    this.seekers = [];
    this._seedDemo();
  }

  start() {
    this.reset(State.PLAYING);
    this.motes = [];
    this.rocks = [];
    this.seekers = [];
    this.particles = [];
    for (let i = 0; i < 4; i++) this._spawnMote(55, 150);
    for (let i = 0; i < 5; i++) this._spawnMote();
    for (let i = 0; i < 4; i++) this._spawnRock(0.55);
    this.events.push({ type: "start" });
  }

  pauseToggle() {
    if (this.state === State.PLAYING) this.state = State.PAUSED;
    else if (this.state === State.PAUSED) this.state = State.PLAYING;
  }

  _seedDemo() {
    for (let i = 0; i < 10; i++) this._spawnMote();
    for (let i = 0; i < 5; i++) this._spawnRock(0.4);
    for (let i = 0; i < 2; i++) this._spawnSeeker(0.45);
  }

  _ringPoint(minR, maxR) {
    const a = this.rng() * Math.PI * 2;
    const r = randRange(minR, maxR, this.rng);
    return { x: Math.cos(a) * r, y: Math.sin(a) * r };
  }

  _spawnMote(minR = 70, maxR = ARENA_RADIUS - 46) {
    const p = this._ringPoint(minR, maxR);
    this.motes.push({
      x: p.x,
      y: p.y,
      r: 10,
      phase: this.rng() * Math.PI * 2,
    });
  }

  _spawnRock(speedScale = 1) {
    const p = this._ringPoint(120, ARENA_RADIUS - 70);
    const a = this.rng() * Math.PI * 2;
    const speed = randRange(28, 70, this.rng) * speedScale;
    const seed = (this.rng() * 1e9) | 0;
    const sides = 5 + ((this.rng() * 4) | 0);
    this.rocks.push({
      x: p.x,
      y: p.y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      r: randRange(16, 34, this.rng),
      rot: this.rng() * Math.PI * 2,
      spin: randSign(this.rng) * randRange(0.25, 1.1, this.rng),
      sides,
      seed,
      verts: rockVerts(seed, sides, 1),
    });
  }

  _spawnSeeker(speedScale = 1) {
    const p = this._ringPoint(180, ARENA_RADIUS - 50);
    const angle = Math.atan2(-p.y, -p.x);
    this.seekers.push({
      x: p.x,
      y: p.y,
      vx: 0,
      vy: 0,
      angle,
      r: 11,
      speed: randRange(78, 108, this.rng) * speedScale,
    });
  }

  _burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i++) {
      const a = this.rng() * Math.PI * 2;
      const s = randRange(speed * 0.3, speed, this.rng);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: randRange(0.28, 0.7, this.rng),
        max: 0.7,
        size: randRange(1.4, 3.6, this.rng),
        color,
      });
    }
  }

  _popup(x, y, text, color) {
    this.popups.push({ x, y, text, color, life: 0.85 });
  }

  _pulse(x, y) {
    this.pulses.push({ x, y, r: 16, max: 150, life: 0.45 });
    this.events.push({ type: "pulse" });
  }

  _hitPlayer(amount) {
    const p = this.player;
    if (p.invuln > 0 || p.dashT > 0) return;
    p.light = Math.max(0, p.light - amount);
    p.invuln = 0.9;
    p.combo = 0;
    p.comboT = 0;
    this.shake = 14;
    this.flash = 0.35;
    this._burst(p.x, p.y, "#ff6b9a", 18, 220);
    this.events.push({ type: "hit" });
    if (p.light <= 0) this._gameOver();
  }

  _gameOver() {
    this.state = State.GAMEOVER;
    this.player.light = 0;
    const best = this.score > this.highScore;
    if (best) {
      this.highScore = this.score;
      writeHighScore(this.score);
    }
    this.newBest = best;
    this.events.push({ type: "gameover" });
    this._burst(this.player.x, this.player.y, "#7ee7ff", 28, 280);
  }

  update(dt, input) {
    this.events = [];
    if (this.state === State.MENU) {
      this._updateAmbient(dt);
      return;
    }
    if (this.state === State.PAUSED || this.state === State.GAMEOVER) {
      this._updateParticles(dt * 0.4);
      return;
    }
    this._updatePlaying(dt, input);
  }

  _updateAmbient(dt) {
    this.time += dt;
    this.player.angle += dt * 0.35;
    this.player.x = Math.cos(this.time * 0.4) * 18;
    this.player.y = Math.sin(this.time * 0.32) * 14;
    this._floatMotes(dt);
    for (const rock of this.rocks) {
      rock.x += rock.vx * dt;
      rock.y += rock.vy * dt;
      rock.rot += rock.spin * dt;
      bounceInsideCircle(rock, rock.r, ARENA_RADIUS);
    }
    for (const s of this.seekers) {
      s.angle += dt * 0.5;
      s.vx = Math.cos(s.angle) * 20;
      s.vy = Math.sin(s.angle) * 20;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      bounceInsideCircle(s, s.r, ARENA_RADIUS);
    }
    this._updateParticles(dt);
  }

  _floatMotes(dt) {
    for (const mote of this.motes) {
      mote.phase += dt * 2.1;
      mote.x += Math.cos(mote.phase) * 8 * dt;
      mote.y += Math.sin(mote.phase * 0.85) * 8 * dt;
      const d = dist(0, 0, mote.x, mote.y);
      const max = ARENA_RADIUS - 40;
      if (d > max) {
        const s = max / d;
        mote.x *= s;
        mote.y *= s;
      }
    }
  }

  _updatePlaying(dt, input) {
    this.time += dt;
    this.waveT += dt;
    this.shake = Math.max(0, this.shake - dt * 28);
    this.flash = Math.max(0, this.flash - dt);
    const p = this.player;

    if (this.waveT >= 18) {
      this.waveT = 0;
      this.wave += 1;
      this._spawnRock(0.7 + this.wave * 0.08);
      if (this.wave >= 2) this._spawnSeeker(0.75 + this.wave * 0.06);
      this._popup(p.x, p.y - 28, `WAVE ${this.wave}`, "#c9b6ff");
    }

    while (this.motes.length < 6 + Math.min(this.wave, 5)) this._spawnMote();
    while (this.rocks.length < 3 + Math.min(this.wave, 7)) this._spawnRock(0.65);

    const desiredSeekers = Math.max(0, this.wave - 1);
    while (this.seekers.length < desiredSeekers) this._spawnSeeker(0.8);

    p.dashT = Math.max(0, p.dashT - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    if (p.comboT > 0) {
      p.comboT -= dt;
      if (p.comboT <= 0) p.combo = 0;
    }

    let ax = input.ax;
    let ay = input.ay;
    if (input.pointer && input.pointer.active) {
      const dx = input.pointer.x - p.x;
      const dy = input.pointer.y - p.y;
      const mag = Math.hypot(dx, dy) || 1;
      ax = dx / mag;
      ay = dy / mag;
    }

    p.thrusting = ax !== 0 || ay !== 0;
    if (p.thrusting) p.angle = Math.atan2(ay, ax);

    const accel = 920;
    p.vx += ax * accel * dt;
    p.vy += ay * accel * dt;

    if (input.dash && p.dashT <= 0 && p.light > 6) {
      const dx = Math.cos(p.angle);
      const dy = Math.sin(p.angle);
      p.vx += dx * 520;
      p.vy += dy * 520;
      p.dashT = 0.18;
      p.invuln = Math.max(p.invuln, 0.2);
      p.light -= 7;
      this._burst(p.x, p.y, "#7ee7ff", 10, 180);
      this.events.push({ type: "dash" });
    }

    const drag = Math.pow(0.14, dt);
    p.vx *= drag;
    p.vy *= drag;
    const maxSpeed = p.dashT > 0 ? 620 : 310;
    const spd = Math.hypot(p.vx, p.vy);
    if (spd > maxSpeed) {
      p.vx = (p.vx / spd) * maxSpeed;
      p.vy = (p.vy / spd) * maxSpeed;
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    bounceInsideCircle(p, p.r, ARENA_RADIUS, 0.55);

    if (p.thrusting) {
      this.particles.push({
        x: p.x - Math.cos(p.angle) * 12,
        y: p.y - Math.sin(p.angle) * 12,
        vx: -Math.cos(p.angle) * 40 + randRange(-20, 20, this.rng),
        vy: -Math.sin(p.angle) * 40 + randRange(-20, 20, this.rng),
        life: 0.28,
        max: 0.28,
        size: 2.2,
        color: "#7ee7ff",
      });
    }

    p.light -= lightDrainPerSecond(this.wave) * dt;
    this.score += dt * 8 * this.wave;
    if (p.light <= 0) this._gameOver();

    this._floatMotes(dt);
    this._collectMotes();
    this._updateRocks(dt);
    this._updateSeekers(dt);
    this._updatePulses(dt);
    this._updateParticles(dt);
    this._updatePopups(dt);
  }

  _collectMotes() {
    const p = this.player;
    for (let i = this.motes.length - 1; i >= 0; i--) {
      const m = this.motes[i];
        const d = dist(p.x, p.y, m.x, m.y);
      if (d < 78) {
        const pull = (78 - d) * 6.5;
        const inv = 1 / (d || 1);
        m.x += (p.x - m.x) * inv * pull * 0.016;
        m.y += (p.y - m.y) * inv * pull * 0.016;
      }
      if (!circlesOverlap(p.x, p.y, p.r + 6, m.x, m.y, m.r + 4)) continue;
      const pts = collectScore(p.combo);
      this.score += pts;
      this.motesCollected += 1;
      p.light = clamp(p.light + 16, 0, 100);
      p.combo += 1;
      p.comboT = 2.6;
      this._popup(m.x, m.y, `+${pts}`, "#ffe08a");
      this._burst(m.x, m.y, "#ffe08a", 12, 160);
      this.events.push({ type: "collect", combo: p.combo });
      this.motes.splice(i, 1);
      if (p.combo > 0 && p.combo % 5 === 0) {
        this._pulse(p.x, p.y);
        this._popup(p.x, p.y - 20, "BLOOM", "#d7b6ff");
      }
    }
  }

  _updateRocks(dt) {
    const p = this.player;
    for (const rock of this.rocks) {
      rock.x += rock.vx * dt;
      rock.y += rock.vy * dt;
      rock.rot += rock.spin * dt;
      bounceInsideCircle(rock, rock.r, ARENA_RADIUS);
      if (circlesOverlap(p.x, p.y, p.r - 1, rock.x, rock.y, rock.r)) {
        this._hitPlayer(24);
        const dx = p.x - rock.x;
        const dy = p.y - rock.y;
        const inv = 1 / (Math.hypot(dx, dy) || 1);
        p.vx += dx * inv * 240;
        p.vy += dy * inv * 240;
      }
    }
  }

  _updateSeekers(dt) {
    const p = this.player;
    const lightR = lightRadius(p.light);
    for (const s of this.seekers) {
      const target = Math.atan2(p.y - s.y, p.x - s.x);
      const turn = p.dashT > 0 ? 1.1 : 2.6;
      s.angle = turnToward(s.angle, target, turn * dt);
      const hunt = dist(p.x, p.y, s.x, s.y) < lightR + 40 ? 1.15 : 0.72;
      const speed = s.speed * hunt + this.wave * 6;
      s.vx = Math.cos(s.angle) * speed;
      s.vy = Math.sin(s.angle) * speed;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      bounceInsideCircle(s, s.r, ARENA_RADIUS, 0.4);
      if (circlesOverlap(p.x, p.y, p.r - 1, s.x, s.y, s.r)) {
        this._hitPlayer(28);
        s.x -= Math.cos(s.angle) * 30;
        s.y -= Math.sin(s.angle) * 30;
      }
    }
  }

  _updatePulses(dt) {
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const pulse = this.pulses[i];
      pulse.life -= dt;
      const t = 1 - pulse.life / 0.45;
      pulse.r = 16 + (pulse.max - 16) * t;
      for (const rock of this.rocks) {
        if (dist(pulse.x, pulse.y, rock.x, rock.y) < pulse.r + rock.r) {
          const dx = rock.x - pulse.x;
          const dy = rock.y - pulse.y;
          const inv = 1 / (Math.hypot(dx, dy) || 1);
          rock.vx += dx * inv * 90;
          rock.vy += dy * inv * 90;
        }
      }
      for (const s of this.seekers) {
        if (dist(pulse.x, pulse.y, s.x, s.y) < pulse.r + s.r) {
          const dx = s.x - pulse.x;
          const dy = s.y - pulse.y;
          const inv = 1 / (Math.hypot(dx, dy) || 1);
          s.x += dx * inv * 8;
          s.y += dy * inv * 8;
          s.angle = Math.atan2(dy, dx);
        }
      }
      if (pulse.life <= 0) this.pulses.splice(i, 1);
    }
  }

  _updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const q = this.particles[i];
      q.life -= dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.vx *= 0.96;
      q.vy *= 0.96;
      if (q.life <= 0) this.particles.splice(i, 1);
    }
    if (this.particles.length > 220) this.particles.splice(0, this.particles.length - 220);
  }

  _updatePopups(dt) {
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const u = this.popups[i];
      u.life -= dt;
      u.y -= 28 * dt;
      if (u.life <= 0) this.popups.splice(i, 1);
    }
  }
}

function rockVerts(seed, sides, scale) {
  const rng = mulberry32(seed);
  const verts = [];
  const count = sides;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const rr = scale * (0.72 + rng() * 0.42);
    verts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  return verts;
}
