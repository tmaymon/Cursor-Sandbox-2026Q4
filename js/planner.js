/** Local Plan-mode engine: questions, a reviewable plan, then a build checklist. */

const GENERIC_QUESTIONS = [
  {
    id: "scope",
    prompt: "What is in v1 versus later?",
    options: ["Smallest useful v1", "Full feature as described", "Prototype only"],
  },
  {
    id: "surface",
    prompt: "Where should this run?",
    options: ["Browser", "CLI", "Both"],
  },
  {
    id: "persist",
    prompt: "Does state need to survive a refresh?",
    options: ["No, session only", "Yes, localStorage", "Yes, a backend"],
  },
];

function titleFromPrompt(prompt) {
  const cleaned = String(prompt).replace(/\s+/g, " ").trim();
  if (!cleaned) return "Implementation plan";
  const clipped = cleaned.length > 72 ? `${cleaned.slice(0, 69)}…` : cleaned;
  return clipped.charAt(0).toUpperCase() + clipped.slice(1);
}

function looksLikeGame(prompt) {
  return /\b(game|board|tic[- ]?tac[- ]?toe|arcade|player|score|level)\b/i.test(prompt);
}

function looksLikeUi(prompt) {
  return /\b(ui|chat|page|dashboard|form|button|layout|mode picker|dropdown)\b/i.test(prompt);
}

export function draftQuestions(prompt) {
  const text = String(prompt ?? "").trim();
  if (looksLikeGame(text)) {
    return [
      {
        id: "players",
        prompt: "Who is playing?",
        options: ["Two humans on one screen", "Human vs computer", "Single-player"],
      },
      {
        id: "win",
        prompt: "How does someone win?",
        options: ["3 in a row", "Score / survive", "Complete an objective"],
      },
      {
        id: "surface",
        prompt: "Where should it run?",
        options: ["Browser", "CLI"],
      },
    ];
  }
  if (looksLikeUi(text)) {
    return [
      {
        id: "surface",
        prompt: "What is the primary surface?",
        options: ["Single page in the browser", "Embedded widget", "Multi-page app"],
      },
      {
        id: "scope",
        prompt: "How complete should v1 be?",
        options: ["Interactive demo", "Full product flow", "Visual mock only"],
      },
      {
        id: "persist",
        prompt: "Should chats or settings persist?",
        options: ["Session only", "localStorage", "Backend"],
      },
    ];
  }
  return GENERIC_QUESTIONS;
}

function filesFor(prompt) {
  if (looksLikeGame(prompt)) {
    return ["index.html", "styles.css", "game.js", "README.md"];
  }
  if (looksLikeUi(prompt)) {
    return ["index.html", "css/app.css", "js/app.js", "js/modes.js", "README.md"];
  }
  return ["README.md", "src/main.js", "src/lib.js"];
}

function todosFor(prompt, answers) {
  const surface = answers.surface || answers.players || "Browser";
  const todos = [
    {
      id: "clarify",
      label: "Lock v1 scope from the answers above",
    },
    {
      id: "scaffold",
      label: `Scaffold the ${String(surface).toLowerCase()} entry point and styles`,
    },
    {
      id: "core",
      label: "Implement the core behavior described in the prompt",
    },
    {
      id: "verify",
      label: "Manually verify the happy path and one edge case",
    },
  ];
  if (looksLikeGame(prompt)) {
    todos.splice(2, 0, {
      id: "rules",
      label: "Encode win / draw / restart rules so they cannot wrap or skip cells",
    });
  }
  if (looksLikeUi(prompt)) {
    todos.splice(2, 0, {
      id: "picker",
      label: "Wire the chat options picker, including Plan, with keyboard rotation",
    });
  }
  return todos;
}

export function draftPlan(prompt, answers = {}) {
  const text = String(prompt ?? "").trim() || "the requested change";
  const questions = draftQuestions(text);
  const resolved = { ...answers };
  for (const question of questions) {
    if (!resolved[question.id]) resolved[question.id] = question.options[0];
  }

  const approach = looksLikeGame(text)
    ? "Keep logic in plain JavaScript so rules can be unit-tested without a browser. Render a simple board or canvas, then layer polish."
    : looksLikeUi(text)
      ? "Ship a single-page chat shell. The mode picker is the source of truth for behavior; Plan mode asks questions, writes a markdown plan, then waits for Build."
      : "Research the current files, write a short plan with concrete file paths, then implement in small steps after approval.";

  return {
    title: titleFromPrompt(text),
    goal: text,
    answers: resolved,
    approach,
    files: filesFor(text),
    risks: [
      "Scope creeping past v1 before the first playable or reviewable result",
      "Skipping clarifying questions and coding the wrong shape",
    ],
    todos: todosFor(text, resolved),
  };
}

export function planToMarkdown(plan) {
  const answerLines = Object.entries(plan.answers)
    .map(([key, value]) => `- **${key}:** ${value}`)
    .join("\n");
  const fileLines = plan.files.map((file) => `- \`${file}\``).join("\n");
  const todoLines = plan.todos.map((todo) => `- [ ] ${todo.label}`).join("\n");
  return `# ${plan.title}

## Goal
${plan.goal}

## Decisions
${answerLines}

## Approach
${plan.approach}

## Files
${fileLines}

## Risks
${plan.risks.map((risk) => `- ${risk}`).join("\n")}

## Todos
${todoLines}
`;
}

export function applyAnswersFromMessage(questions, message) {
  const text = String(message ?? "").toLowerCase();
  const answers = {};
  for (const question of questions) {
    const match = question.options.find((option) =>
      text.includes(option.toLowerCase()),
    );
    if (match) answers[question.id] = match;
  }
  const numbered = text.match(/\b(\d)\b/g) || [];
  numbered.forEach((raw, index) => {
    const question = questions[index];
    if (!question) return;
    const choice = Number(raw) - 1;
    if (question.options[choice]) answers[question.id] = question.options[choice];
  });
  return answers;
}
