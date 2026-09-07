import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_MODE_ID,
  MODES,
  getMode,
  hasMode,
  rotateMode,
  shouldSuggestPlan,
} from "../js/modes.js";

test("chat options include Plan", () => {
  assert.equal(hasMode("plan"), true);
  const plan = getMode("plan");
  assert.equal(plan.name, "Plan");
  assert.match(plan.description, /plan/i);
  assert.equal(plan.added, true);
});

test("Plan sits with the other chat options", () => {
  assert.deepEqual(
    MODES.map((mode) => mode.id),
    ["agent", "ask", "plan", "debug"],
  );
  assert.equal(DEFAULT_MODE_ID, "agent");
});

test("Shift+Tab rotation visits Plan", () => {
  assert.equal(rotateMode("agent"), "ask");
  assert.equal(rotateMode("ask"), "plan");
  assert.equal(rotateMode("plan"), "debug");
  assert.equal(rotateMode("debug"), "agent");
  assert.equal(rotateMode("plan", -1), "ask");
});

test("complex prompts suggest switching to Plan", () => {
  assert.equal(shouldSuggestPlan("hi", "agent"), false);
  assert.equal(
    shouldSuggestPlan("please plan a 5x5 tic-tac-toe game before coding", "agent"),
    true,
  );
  assert.equal(
    shouldSuggestPlan("please plan a 5x5 tic-tac-toe game before coding", "plan"),
    false,
  );
});
