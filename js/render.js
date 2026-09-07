import { ARENA_RADIUS, State } from "./game.js";
import { lightRadius, visibilityAt } from "./math.js";

const COLORS = {
  void: "#04050a",
  nebulaA: "rgba(52, 28, 92, 0.55)",
  nebulaB: "rgba(18, 78, 110, 0.4)",
  rim: "#6ee7ff",
  mote: "#ffe08a",
  rock: "#8aa0c8",
  seeker: "#ff5d8f",
  ship: "#e8fbff",
};

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.stars = buildStars(180);
    this.cssWidth = 1;
    this.cssHeight = 1;
    this.scale = 1;
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.cssWidth = window.innerWidth;
    this.cssHeight = window.innerHeight;
    this.canvas.width = Math.floor(this.cssWidth * dpr);
    this.canvas.height = Math.floor(this.cssHeight * dpr);
    this.canvas.style.width = `${this.cssWidth}px`;
    this.canvas.style.height = `${this.cssHeight}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  worldFromScreen(sx, sy) {
    const cx = this.cssWidth / 2;
    const cy = this.cssHeight / 2 + 8;
    const scale = Math.min(this.cssWidth, this.cssHeight) * 0.38 / ARENA_RADIUS;
    return { x: (sx - cx) / scale, y: (sy - cy) / scale };
  }

  draw(game) {
    const ctx = this.ctx;
    const w = this.cssWidth;
    const h = this.cssHeight;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = COLORS.void;
    ctx.fillRect(0, 0, w, h);

    const scale = Math.min(w, h) * 0.38 / ARENA_RADIUS;
    this.scale = scale;
    const cx = w / 2;
    const cy = h / 2 + 8;

    const shake = game.shake;
    const ox = shake ? (Math.random() - 0.5) * shake : 0;
    const oy = shake ? (Math.random() - 0.5) * shake : 0;

    ctx.save();
    ctx.translate(cx + ox, cy + oy);
    ctx.scale(scale, scale);

    this._stars(ctx, game.time);
    this._arena(ctx, game);
    this._pulses(ctx, game);
    this._motes(ctx, game);
    this._rocks(ctx, game);
    this._seekers(ctx, game);
    this._particles(ctx, game);
    if (game.state !== State.GAMEOVER || game.player.light > 0) this._player(ctx, game);
    this._popups(ctx, game);
    this._vignette(ctx, game);

    ctx.restore();

    if (game.flash > 0) {
      ctx.fillStyle = `rgba(255, 90, 130, ${game.flash * 0.28})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  _stars(ctx, time) {
    ctx.save();
    for (const s of this.stars) {
      const twinkle = 0.45 + 0.55 * Math.sin(time * s.tw + s.ph);
      ctx.globalAlpha = s.a * twinkle;
      ctx.fillStyle = "#cfe8ff";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _arena(ctx, game) {
    const R = ARENA_RADIUS;
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.clip();

    const bg = ctx.createRadialGradient(0, 0, 20, 0, 0, R);
    bg.addColorStop(0, "#12203a");
    bg.addColorStop(0.55, "#0a1020");
    bg.addColorStop(1, "#05060d");
    ctx.fillStyle = bg;
    ctx.fillRect(-R, -R, R * 2, R * 2);

    const n1 = ctx.createRadialGradient(-R * 0.3, -R * 0.2, 10, -R * 0.3, -R * 0.2, R * 0.9);
    n1.addColorStop(0, COLORS.nebulaA);
    n1.addColorStop(1, "transparent");
    ctx.fillStyle = n1;
    ctx.fillRect(-R, -R, R * 2, R * 2);

    const n2 = ctx.createRadialGradient(R * 0.35, R * 0.25, 8, R * 0.35, R * 0.25, R * 0.8);
    n2.addColorStop(0, COLORS.nebulaB);
    n2.addColorStop(1, "transparent");
    ctx.fillStyle = n2;
    ctx.fillRect(-R, -R, R * 2, R * 2);

    ctx.restore();

    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(110, 231, 255, 0.55)";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#6ee7ff";
    ctx.shadowBlur = 18;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(0, 0, R + 10, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(199, 160, 255, 0.18)";
    ctx.lineWidth = 8;
    ctx.stroke();

    const lightR = lightRadius(game.player.light);
    ctx.beginPath();
    ctx.arc(game.player.x, game.player.y, lightR, 0, Math.PI * 2);
    const glow = ctx.createRadialGradient(
      game.player.x,
      game.player.y,
      lightR * 0.12,
      game.player.x,
      game.player.y,
      lightR
    );
    glow.addColorStop(0, "rgba(126, 231, 255, 0.16)");
    glow.addColorStop(0.65, "rgba(126, 231, 255, 0.05)");
    glow.addColorStop(1, "rgba(126, 231, 255, 0)");
    ctx.fillStyle = glow;
    ctx.fill();
  }

  _motes(ctx, game) {
    const p = game.player;
    const lightR = lightRadius(p.light);
    for (const m of game.motes) {
      const vis = visibilityAt(p.x, p.y, m.x, m.y, lightR);
      const pulse = 1 + Math.sin(m.phase * 2) * 0.12;
      ctx.save();
      ctx.globalAlpha = vis;
      ctx.translate(m.x, m.y);
      ctx.shadowColor = COLORS.mote;
      ctx.shadowBlur = 16;
      ctx.fillStyle = COLORS.mote;
      ctx.beginPath();
      ctx.arc(0, 0, m.r * pulse * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = vis * 0.35;
      ctx.beginPath();
      ctx.arc(0, 0, m.r * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  _rocks(ctx, game) {
    const p = game.player;
    const lightR = lightRadius(p.light);
    for (const rock of game.rocks) {
      const vis = visibilityAt(p.x, p.y, rock.x, rock.y, lightR);
      ctx.save();
      ctx.globalAlpha = vis;
      ctx.translate(rock.x, rock.y);
      ctx.rotate(rock.rot);
      ctx.beginPath();
      rock.verts.forEach(([vx, vy], i) => {
        const x = vx * rock.r;
        const y = vy * rock.r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = "rgba(90, 110, 150, 0.85)";
      ctx.strokeStyle = `rgba(180, 205, 240, ${0.35 + vis * 0.4})`;
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  _seekers(ctx, game) {
    const p = game.player;
    const lightR = lightRadius(p.light);
    for (const s of game.seekers) {
      const vis = Math.max(0.12, visibilityAt(p.x, p.y, s.x, s.y, lightR));
      ctx.save();
      ctx.globalAlpha = vis;
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);
      ctx.shadowColor = COLORS.seeker;
      ctx.shadowBlur = 12;
      ctx.fillStyle = COLORS.seeker;
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-10, 8);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-10, -8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  _player(ctx, game) {
    const p = game.player;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    const blink = p.invuln > 0 && Math.sin(p.invuln * 40) > 0 ? 0.4 : 1;
    ctx.globalAlpha = blink;
    ctx.shadowColor = "#7ee7ff";
    ctx.shadowBlur = 20;
    ctx.fillStyle = COLORS.ship;
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(-11, 9);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-11, -9);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#7ee7ff";
    ctx.beginPath();
    ctx.arc(-1, 0, 3.2, 0, Math.PI * 2);
    ctx.fill();
    if (p.dashT > 0) {
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = "#7ee7ff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-18, 0);
      ctx.lineTo(-34, 0);
      ctx.stroke();
    }
    ctx.restore();
  }

  _particles(ctx, game) {
    for (const q of game.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, q.life / q.max);
      ctx.fillStyle = q.color;
      ctx.shadowColor = q.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(q.x, q.y, q.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  _pulses(ctx, game) {
    for (const pulse of game.pulses) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, pulse.life / 0.45);
      ctx.strokeStyle = "#d7b6ff";
      ctx.lineWidth = 4;
      ctx.shadowColor = "#d7b6ff";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(pulse.x, pulse.y, pulse.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  _popups(ctx, game) {
    ctx.save();
    ctx.font = "700 16px Outfit, sans-serif";
    ctx.textAlign = "center";
    for (const u of game.popups) {
      ctx.globalAlpha = Math.max(0, u.life / 0.85);
      ctx.fillStyle = u.color;
      ctx.fillText(u.text, u.x, u.y);
    }
    ctx.restore();
  }

  _vignette(ctx, game) {
    const p = game.player;
    const lightR = lightRadius(p.light);
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, ARENA_RADIUS, 0, Math.PI * 2);
    ctx.clip();
    const fog = ctx.createRadialGradient(p.x, p.y, lightR * 0.7, p.x, p.y, lightR * 1.45);
    fog.addColorStop(0, "rgba(4, 5, 10, 0)");
    fog.addColorStop(1, "rgba(4, 5, 10, 0.78)");
    ctx.fillStyle = fog;
    ctx.fillRect(-ARENA_RADIUS, -ARENA_RADIUS, ARENA_RADIUS * 2, ARENA_RADIUS * 2);
    ctx.restore();
  }
}

function buildStars(n) {
  const stars = [];
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * ARENA_RADIUS * 1.7;
    stars.push({
      x: Math.cos(a) * r,
      y: Math.sin(a) * r,
      r: Math.random() * 1.4 + 0.3,
      a: Math.random() * 0.55 + 0.15,
      tw: Math.random() * 2 + 0.4,
      ph: Math.random() * Math.PI * 2,
    });
  }
  return stars;
}
