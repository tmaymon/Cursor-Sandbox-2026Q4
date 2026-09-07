/** Chat options shown in the composer mode picker. */

export const MODES = [
  {
    id: "agent",
    name: "Agent",
    description: "Build, edit, and run",
    placeholder: "Ask Agent to do anything…",
    hint: "Full access to files and terminal",
    color: "#8aa4ff",
    rotateKey: "Shift+Tab",
  },
  {
    id: "ask",
    name: "Ask",
    description: "Read-only answers, no edits",
    placeholder: "Ask about the codebase…",
    hint: "Explains code without changing it",
    color: "#6ec8c8",
    rotateKey: "Shift+Tab",
  },
  {
    id: "plan",
    name: "Plan",
    description: "Create a plan before writing code",
    placeholder: "Describe the feature. Plan mode will research and draft an approach first.",
    hint: "Asks questions, then writes a reviewable plan",
    color: "#e8a547",
    rotateKey: "Shift+Tab",
    added: true,
  },
  {
    id: "debug",
    name: "Debug",
    description: "Find and fix bugs with evidence",
    placeholder: "Describe the bug or paste an error…",
    hint: "Gathers runtime clues before changing code",
    color: "#e06c75",
    rotateKey: "Shift+Tab",
  },
];

export const DEFAULT_MODE_ID = "agent";

export function getMode(id) {
  return MODES.find((mode) => mode.id === id) ?? MODES[0];
}

export function modeIndex(id) {
  const index = MODES.findIndex((mode) => mode.id === id);
  return index < 0 ? 0 : index;
}

export function rotateMode(currentId, direction = 1) {
  const index = modeIndex(currentId);
  const next = (index + direction + MODES.length) % MODES.length;
  return MODES[next].id;
}

export function hasMode(id) {
  return MODES.some((mode) => mode.id === id);
}

const PLAN_HINT =
  /\b(plan|architect|architecture|design (a|an|the)|implement (a|an|the) .{10,}|how should we|before (we |you )?cod|multi[- ]file|roadmap)\b/i;

export function shouldSuggestPlan(text, currentModeId) {
  if (currentModeId === "plan") return false;
  const prompt = String(text ?? "").trim();
  if (prompt.length < 8) return false;
  if (PLAN_HINT.test(prompt)) return true;
  return prompt.length >= 160;
}
