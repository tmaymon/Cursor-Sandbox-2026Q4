import assert from "node:assert/strict";
import test from "node:test";
import {
  applyAnswersFromMessage,
  draftPlan,
  draftQuestions,
  planToMarkdown,
} from "../js/planner.js";
import {
  buildPlan,
  createConversation,
  sendMessage,
  skipQuestions,
} from "../js/chat.js";

test("game prompts get game-specific questions", () => {
  const questions = draftQuestions("plan a tic-tac-toe game");
  assert.ok(questions.some((question) => /win/i.test(question.prompt)));
});

test("draftPlan includes files and todos", () => {
  const plan = draftPlan("add plan mode to my chat options", {
    surface: "Single page in the browser",
  });
  assert.match(plan.title, /plan mode/i);
  assert.ok(plan.files.includes("js/modes.js"));
  assert.ok(plan.todos.some((todo) => /Plan/i.test(todo.label)));
  const markdown = planToMarkdown(plan);
  assert.match(markdown, /## Todos/);
});

test("answers can be parsed from a short reply", () => {
  const questions = draftQuestions("code a browser chat ui");
  const answers = applyAnswersFromMessage(questions, "1 interactive demo, 2 session only");
  assert.ok(Object.keys(answers).length >= 1);
});

test("plan mode asks first, then writes a plan", () => {
  const conversation = createConversation();
  sendMessage(conversation, "plan", "Code a game, starting with plan mode");
  assert.equal(conversation.phase, "awaiting_answers");
  assert.equal(conversation.messages.at(-1).kind, "questions");

  skipQuestions(conversation);
  assert.equal(conversation.phase, "plan_ready");
  assert.equal(conversation.messages.at(-1).kind, "plan");
  assert.match(conversation.messages.at(-1).content, /# /);

  buildPlan(conversation);
  assert.equal(conversation.phase, "building");
  assert.equal(conversation.messages.at(-1).kind, "build");
});

test("agent mode can suggest Plan", () => {
  const conversation = createConversation();
  sendMessage(
    conversation,
    "agent",
    "Please plan how we should implement a multi-file chat composer with modes",
  );
  assert.equal(conversation.messages.at(-1).suggestPlan, true);
});
