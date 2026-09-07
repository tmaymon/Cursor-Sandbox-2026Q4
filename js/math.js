/** Vector helpers and arena physics used by the simulation. */

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function length(x, y) {
  return Math.hypot(x, y);
}

export function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

export function circlesOverlap(ax, ay, ar, bx, by, br) {
  return dist(ax, ay, bx, by) < ar + br;
}

export function randRange(min, max, rng = Math.random) {
  return min + (max - min) * rng();
}

export function randSign(rng = Math.random) {
  return rng() < 0.5 ? -1 : 1;
}

/** Deterministic 32-bit RNG — used for asteroid silhouettes. */
export function mulberry32(seed) {
  let t = seed >>> 0;
  return function next() {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Keep a moving body (x, y, vx, vy) inside a larger circle and reflect
 * on the rim. Mutates the body. Returns whether a bounce happened.
 */
export function bounceInsideCircle(body, bodyRadius, arenaRadius, restitution = 0.72) {
  const max = arenaRadius - bodyRadius;
  const d = length(body.x, body.y);
  if (d <= max) return false;
  const inv = 1 / (d || 1);
  const nx = body.x * inv;
  const ny = body.y * inv;
  body.x = nx * max;
  body.y = ny * max;
  const outgoing = body.vx * nx + body.vy * ny;
  if (outgoing > 0) {
    body.vx -= (1 + restitution) * outgoing * nx;
    body.vy -= (1 + restitution) * outgoing * ny;
  }
  return true;
}

export function lightRadius(light) {
  return lerp(52, 292, clamp(light / 100, 0, 1));
}

export function collectScore(combo) {
  return Math.round(100 * (1 + combo * 0.15));
}

export function lightDrainPerSecond(wave) {
  return 3.15 + wave * 0.38;
}

export function visibilityAt(px, py, x, y, radius) {
  const d = dist(px, py, x, y);
  const inner = radius * 0.82;
  if (d <= inner) return 1;
  return clamp(1 - (d - inner) / (radius * 0.75 + 36), 0.035, 1);
}

export function turnToward(current, target, maxStep) {
  let delta = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return current + clamp(delta, -maxStep, maxStep);
}
