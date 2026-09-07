import { getMode, shouldSuggestPlan } from "./modes.js";
import {
  applyAnswersFromMessage,
  draftPlan,
  draftQuestions,
  planToMarkdown,
} from "./planner.js";

export function createConversation() {
  return {
    messages: [],
    phase: "idle",
    questions: [],
    answers: {},
    plan: null,
  };
}

function push(conversation, role, content, extra = {}) {
  conversation.messages.push({
    id: `${Date.now()}-${conversation.messages.length}`,
    role,
    content,
    ...extra,
  });
  return conversation;
}

function agentReply(prompt) {
  return `I'll start implementing this directly:\n\n> ${prompt}\n\nSwitch to **Plan** in chat options if you want a reviewable approach before any files change.`;
}

function askReply(prompt) {
  return `Ask mode stays read-only.\n\nYou asked: “${prompt}”\n\nI can explain options and tradeoffs, but I will not edit files. Use **Agent** to build, or **Plan** to draft an implementation first.`;
}

function debugReply(prompt) {
  return `Debug mode would gather evidence before changing code.\n\nRepro notes:\n- What you saw: ${prompt}\n- Next: capture the failing path, then patch.\n\nIf this is a new feature rather than a bug, **Plan** is the better chat option.`;
}

export function sendMessage(conversation, modeId, text) {
  const prompt = String(text ?? "").trim();
  if (!prompt) return conversation;

  const mode = getMode(modeId);
  push(conversation, "user", prompt, { mode: mode.id });

  if (mode.id === "plan") {
    return handlePlanTurn(conversation, prompt);
  }

  if (mode.id === "ask") {
    return push(conversation, "assistant", askReply(prompt), { mode: mode.id });
  }
  if (mode.id === "debug") {
    return push(conversation, "assistant", debugReply(prompt), { mode: mode.id });
  }

  const suggest = shouldSuggestPlan(prompt, mode.id);
  return push(conversation, "assistant", agentReply(prompt), {
    mode: mode.id,
    suggestPlan: suggest,
  });
}

function handlePlanTurn(conversation, prompt) {
  if (conversation.phase === "awaiting_answers") {
    const parsed = applyAnswersFromMessage(conversation.questions, prompt);
    conversation.answers = { ...conversation.answers, ...parsed };
    return finalizePlan(conversation, conversation.goal);
  }

  conversation.goal = prompt;
  conversation.questions = draftQuestions(prompt);
  conversation.answers = {};
  conversation.phase = "awaiting_answers";
  conversation.plan = null;

  const lines = conversation.questions
    .map(
      (question, index) =>
        `${index + 1}. ${question.prompt}\n   ${question.options.map((option, optionIndex) => `${optionIndex + 1}) ${option}`).join("   ")}`,
    )
    .join("\n");

  return push(
    conversation,
    "assistant",
    `Plan mode — I'll draft an approach before any code.\n\nA few decisions will make the plan sharper:\n\n${lines}\n\nReply with choices (e.g. \`1 smallest, 2 browser\`) or press **Draft plan**.`,
    { mode: "plan", kind: "questions", questions: conversation.questions },
  );
}

function finalizePlan(conversation, prompt) {
  conversation.plan = draftPlan(prompt, conversation.answers);
  conversation.phase = "plan_ready";
  const markdown = planToMarkdown(conversation.plan);
  return push(conversation, "assistant", markdown, {
    mode: "plan",
    kind: "plan",
    plan: conversation.plan,
  });
}

export function skipQuestions(conversation) {
  if (conversation.phase !== "awaiting_answers" || !conversation.goal) {
    return conversation;
  }
  push(conversation, "user", "Draft plan", { mode: "plan" });
  return finalizePlan(conversation, conversation.goal);
}

export function answerQuestion(conversation, questionId, value) {
  conversation.answers[questionId] = value;
  return conversation;
}

export function buildPlan(conversation) {
  if (!conversation.plan) return conversation;
  conversation.phase = "building";
  const steps = conversation.plan.todos
    .map((todo, index) => `${index + 1}. ${todo.label}`)
    .join("\n");
  return push(
    conversation,
    "assistant",
    `Building the plan **${conversation.plan.title}**.\n\n${steps}\n\nThis demo stops at the plan → build handoff. In Cursor, Build would continue in Agent using this markdown.`,
    { mode: "agent", kind: "build", plan: conversation.plan },
  );
}
