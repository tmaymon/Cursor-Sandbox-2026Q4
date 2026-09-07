import assert from "node:assert/strict";
import test from "node:test";
import {
  bounceInsideCircle,
  circlesOverlap,
  collectScore,
  lightDrainPerSecond,
  lightRadius,
  mulberry32,
  turnToward,
  visibilityAt,
} from "../js/math.js";
import { ARENA_RADIUS, Game, State } from "../js/game.js";

test("collectScore scales with combo", () => {
  assert.equal(collectScore(0), 100);
  assert.equal(collectScore(5), 175);
  assert.ok(collectScore(10) > collectScore(5));
});

test("lightRadius grows with remaining light", () => {
  assert.ok(lightRadius(100) > lightRadius(40));
  assert.ok(lightRadius(0) >= 50);
});

test("light drain increases with wave", () => {
  assert.ok(lightDrainPerSecond(5) > lightDrainPerSecond(1));
});

test("circlesOverlap detects intersection", () => {
  assert.equal(circlesOverlap(0, 0, 10, 15, 0, 6), true);
  assert.equal(circlesOverlap(0, 0, 10, 40, 0, 6), false);
});

test("bounceInsideCircle reflects outward velocity on the rim", () => {
  const body = { x: ARENA_RADIUS + 20, y: 0, vx: 80, vy: 0 };
  const bounced = bounceInsideCircle(body, 12, ARENA_RADIUS, 1);
  assert.equal(bounced, true);
  assert.ok(body.x <= ARENA_RADIUS - 12 + 1e-6);
  assert.ok(body.vx < 0);
});

test("mulberry32 is deterministic", () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  assert.equal(a(), b());
  assert.equal(a(), b());
});

test("visibility falls off outside the light radius", () => {
  const inner = visibilityAt(0, 0, 10, 0, 100);
  const outer = visibilityAt(0, 0, 400, 0, 100);
  assert.equal(inner, 1);
  assert.ok(outer < 0.2);
});

test("turnToward steps toward the target without overshooting a small delta", () => {
  const next = turnToward(0, 0.1, 0.5);
  assert.ok(Math.abs(next - 0.1) < 1e-9);
});

test("starting a run enters the playing state with motes", () => {
  const game = new Game(() => 0.3);
  game.start();
  assert.equal(game.state, State.PLAYING);
  assert.ok(game.motes.length >= 6);
  assert.equal(game.player.light, 100);
});

test("collecting a mote increases score, combo, and light", () => {
  const game = new Game(() => 0.4);
  game.start();
  game.player.x = 0;
  game.player.y = 0;
  game.player.light = 50;
  game.motes = [{ x: 4, y: 0, r: 8, phase: 0 }];
  const before = game.score;
  game.update(0.016, { ax: 0, ay: 0, dash: false, pointer: null });
  assert.equal(game.motesCollected, 1);
  assert.ok(game.score > before);
  assert.equal(game.player.combo, 1);
  assert.ok(game.player.light > 50);
});

test("light reaching zero ends the run", () => {
  const game = new Game(() => 0.2);
  game.start();
  game.player.light = 0.01;
  game.motes = [];
  game.rocks = [];
  game.seekers = [];
  game.update(0.05, { ax: 0, ay: 0, dash: false, pointer: null });
  assert.equal(game.state, State.GAMEOVER);
});

test("dash spends light and grants a burst of speed", () => {
  const game = new Game(() => 0.5);
  game.start();
  game.player.angle = 0;
  game.player.vx = 0;
  game.player.vy = 0;
  const light = game.player.light;
  game.update(0.016, { ax: 1, ay: 0, dash: true, pointer: null });
  assert.ok(game.player.dashT > 0);
  assert.ok(game.player.light < light);
  assert.ok(game.player.vx > 400);
});
