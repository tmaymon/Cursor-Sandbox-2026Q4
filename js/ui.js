import {
  DEFAULT_MODE_ID,
  MODES,
  getMode,
  rotateMode,
  shouldSuggestPlan,
} from "./modes.js";
import {
  answerQuestion,
  buildPlan,
  createConversation,
  sendMessage,
  skipQuestions,
} from "./chat.js";

const STORAGE_KEY = "sandbox-chat-mode";

const thread = document.getElementById("thread");
const empty = document.getElementById("empty");
const emptyTitle = document.getElementById("empty-title");
const emptyCopy = document.getElementById("empty-copy");
const chips = document.getElementById("chips");
const prompt = document.getElementById("prompt");
const composer = document.getElementById("composer");
const modeBtn = document.getElementById("mode-btn");
const modeMenu = document.getElementById("mode-menu");
const modeLabel = document.getElementById("mode-label");
const modeDot = document.getElementById("mode-dot");
const modeBanner = document.getElementById("mode-banner");
const planSuggest = document.getElementById("plan-suggest");
const usePlan = document.getElementById("use-plan");

let modeId = localStorage.getItem(STORAGE_KEY) || DEFAULT_MODE_ID;
let conversation = createConversation();

const EXAMPLES = {
  agent: "Add a scoreboard to the arcade game",
  ask: "How does Plan mode differ from Agent?",
  plan: "Plan a 5×5 tic-tac-toe game for the browser",
  debug: "The win check fires on a broken diagonal",
};

function setMode(nextId, { close = true } = {}) {
  modeId = nextId;
  localStorage.setItem(STORAGE_KEY, modeId);
  const mode = getMode(modeId);
  modeLabel.textContent = mode.name;
  modeDot.style.background = mode.color;
  prompt.placeholder = mode.placeholder;
  modeBanner.textContent = mode.hint;
  composer.classList.toggle("plan-active", modeId === "plan");
  document.body.dataset.mode = modeId;
  emptyTitle.textContent = modeId === "plan" ? "What should we plan?" : "What should we do?";
  emptyCopy.innerHTML =
    modeId === "plan"
      ? "Plan is selected in chat options. I’ll ask a few questions, write a markdown plan, and wait for <strong>Build</strong>."
      : `Pick a mode under the input. <strong>Plan</strong> is now in the list — it asks a few questions, then writes a reviewable plan before any code.`;
  if (modeId === "plan") planSuggest.hidden = true;
  renderMenu();
  if (close) closeMenu();
  prompt.focus();
}

function renderMenu() {
  modeMenu.innerHTML = "";
  for (const mode of MODES) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mode-option";
    button.setAttribute("role", "option");
    button.dataset.mode = mode.id;
    button.setAttribute("aria-selected", String(mode.id === modeId));
    button.innerHTML = `
      <span class="mode-dot" style="background:${mode.color}"></span>
      <span>
        <span class="name">${mode.name}</span>
        <span class="desc">${mode.description}</span>
      </span>
      ${mode.added ? '<span class="badge">New</span>' : "<span></span>"}
    `;
    button.addEventListener("click", () => setMode(mode.id));
    item.append(button);
    modeMenu.append(item);
  }
}

function openMenu() {
  modeMenu.hidden = false;
  modeBtn.setAttribute("aria-expanded", "true");
}

function closeMenu() {
  modeMenu.hidden = true;
  modeBtn.setAttribute("aria-expanded", "false");
}

function toggleMenu() {
  if (modeMenu.hidden) openMenu();
  else closeMenu();
}

function renderChips() {
  chips.innerHTML = "";
  const examples = [
    EXAMPLES.plan,
    "Add plan mode to my chat options",
    EXAMPLES.ask,
  ];
  for (const example of examples) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip";
    button.textContent = example;
    button.addEventListener("click", () => {
      prompt.value = example;
      if (/plan/i.test(example)) setMode("plan");
      prompt.focus();
    });
    chips.append(button);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderQuestions(message) {
  const wrap = document.createElement("div");
  wrap.className = "q-list";
  for (const question of message.questions) {
    const block = document.createElement("div");
    block.className = "q-block";
    block.innerHTML = `<p>${escapeHtml(question.prompt)}</p>`;
    const opts = document.createElement("div");
    opts.className = "q-opts";
    for (const option of question.options) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "chip";
      button.textContent = option;
      button.setAttribute(
        "aria-pressed",
        String(conversation.answers[question.id] === option),
      );
      button.addEventListener("click", () => {
        answerQuestion(conversation, question.id, option);
        renderThread();
      });
      opts.append(button);
    }
    block.append(opts);
    wrap.append(block);
  }
  const actions = document.createElement("div");
  actions.className = "plan-actions";
  const draft = document.createElement("button");
  draft.type = "button";
  draft.className = "primary";
  draft.id = "draft-plan";
  const allAnswered = message.questions.every(
    (question) => conversation.answers[question.id],
  );
  draft.textContent = allAnswered ? "Draft plan" : "Skip and draft plan";
  draft.addEventListener("click", () => {
    skipQuestions(conversation);
    renderThread();
  });
  actions.append(draft);
  wrap.append(actions);
  return wrap;
}

function renderPlan(plan) {
  const card = document.createElement("div");
  card.className = "plan-card";
  card.innerHTML = `
    <h3>${escapeHtml(plan.title)}</h3>
    <p>${escapeHtml(plan.approach)}</p>
    <p><strong>Files</strong></p>
    <ul>${plan.files.map((file) => `<li><code>${escapeHtml(file)}</code></li>`).join("")}</ul>
    <p><strong>Todos</strong></p>
    <ul>${plan.todos.map((todo) => `<li>${escapeHtml(todo.label)}</li>`).join("")}</ul>
  `;
  const actions = document.createElement("div");
  actions.className = "plan-actions";
  const build = document.createElement("button");
  build.type = "button";
  build.className = "primary";
  build.id = "build-plan";
  build.textContent = "Build";
  build.addEventListener("click", () => {
    setMode("agent");
    buildPlan(conversation);
    renderThread();
  });
  const save = document.createElement("button");
  save.type = "button";
  save.textContent = "Save to workspace";
  save.addEventListener("click", () => {
    const blob = new Blob(
      [
        `# ${plan.title}\n\n${plan.approach}\n\n${plan.todos.map((todo) => `- [ ] ${todo.label}`).join("\n")}\n`,
      ],
      { type: "text/markdown" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "plan.md";
    link.click();
    URL.revokeObjectURL(url);
  });
  actions.append(build, save);
  card.append(actions);
  return card;
}

function renderThread() {
  for (const node of [...thread.querySelectorAll(".msg")]) node.remove();
  empty.hidden = conversation.messages.length > 0;

  for (const message of conversation.messages) {
    const article = document.createElement("article");
    article.className = `msg ${message.role}`;
    const mode = getMode(message.mode || modeId);
    article.innerHTML = `<div class="msg-meta"><span>${message.role === "user" ? "You" : mode.name}</span></div>`;
    const bubble = document.createElement("div");
    bubble.className = `bubble${message.kind === "plan" ? " plan" : ""}`;
    if (message.kind === "questions") {
      bubble.textContent = message.content.split("A few decisions")[0].trim();
      bubble.append(renderQuestions(message));
    } else if (message.kind === "plan") {
      bubble.append(renderPlan(message.plan));
    } else {
      bubble.textContent = message.content;
    }
    article.append(bubble);
    thread.append(article);
  }

  thread.scrollTop = thread.scrollHeight;
}

function submit() {
  const text = prompt.value.trim();
  if (!text) return;
  sendMessage(conversation, modeId, text);
  prompt.value = "";
  planSuggest.hidden = true;
  renderThread();
}

modeBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleMenu();
});

document.addEventListener("click", (event) => {
  if (!modeMenu.hidden && !modeBtn.contains(event.target) && !modeMenu.contains(event.target)) {
    closeMenu();
  }
});

prompt.addEventListener("input", () => {
  planSuggest.hidden = !shouldSuggestPlan(prompt.value, modeId);
});

prompt.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    submit();
  }
  if (event.key === "Tab" && event.shiftKey) {
    event.preventDefault();
    setMode(rotateMode(modeId));
  }
});

composer.addEventListener("submit", (event) => {
  event.preventDefault();
  submit();
});

usePlan.addEventListener("click", () => setMode("plan"));
document.getElementById("new-chat").addEventListener("click", () => {
  conversation = createConversation();
  renderThread();
  prompt.focus();
});

renderMenu();
renderChips();
setMode(hasStoredPlan(modeId) ? modeId : DEFAULT_MODE_ID);
renderThread();

function hasStoredPlan(id) {
  return MODES.some((mode) => mode.id === id);
}
