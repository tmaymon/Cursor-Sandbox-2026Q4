import { AudioBus } from "./audio.js";
import { Game, State } from "./game.js";
import { Input } from "./input.js";
import { Renderer } from "./render.js";

const canvas = document.getElementById("game");
const overlay = document.getElementById("overlay");
const hud = document.getElementById("hud");
const scoreEl = document.getElementById("score");
const comboEl = document.getElementById("combo");
const waveEl = document.getElementById("wave");
const timeEl = document.getElementById("time");
const lightFill = document.getElementById("light-fill");
const muteBtn = document.getElementById("mute-btn");
const overlayTitle = document.getElementById("overlay-title");
const overlayTag = document.getElementById("overlay-tag");
const overlayStats = document.getElementById("overlay-stats");
const overlayHelp = document.getElementById("overlay-help");
const hiscoreLine = document.getElementById("hiscore-line");
const primaryBtn = document.getElementById("primary-btn");
const secondaryBtn = document.getElementById("secondary-btn");
const hiScoreEls = document.querySelectorAll("[data-hiscore]");

const game = new Game();
const input = new Input(canvas);
const renderer = new Renderer(canvas);
const audio = new AudioBus();

let last = performance.now();
let shownState = null;

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function startRun() {
  audio.ensure();
  game.start();
}

function bindUi() {
  primaryBtn.addEventListener("click", () => {
    audio.ensure();
    if (game.state === State.PAUSED) game.pauseToggle();
    else startRun();
  });
  secondaryBtn.addEventListener("click", () => {
    audio.ensure();
    startRun();
  });
  muteBtn.addEventListener("click", () => {
    audio.ensure();
    muteBtn.textContent = audio.toggleMute() ? "Sound off" : "Sound on";
  });
  window.addEventListener("resize", () => renderer.resize());
  renderer.resize();
}

function syncOverlay() {
  if (shownState === game.state) {
    if (game.state === State.MENU || game.state === State.GAMEOVER) {
      for (const el of hiScoreEls) el.textContent = String(Math.floor(game.highScore));
    }
    return;
  }
  shownState = game.state;
  overlay.classList.toggle("hidden", game.state === State.PLAYING);
  hud.classList.toggle("hidden", game.state !== State.PLAYING);
  overlay.classList.toggle("compact", game.state === State.PAUSED);

  if (game.state === State.MENU) {
    overlayTitle.textContent = "Lumen Drift";
    overlayTag.textContent = "Your light is all that remains.";
    overlayStats.hidden = true;
    overlayStats.innerHTML = "";
    overlayHelp.hidden = false;
    hiscoreLine.hidden = false;
    primaryBtn.textContent = "Begin";
    secondaryBtn.hidden = true;
  } else if (game.state === State.PAUSED) {
    overlayTitle.textContent = "Paused";
    overlayTag.textContent = "The nebula holds still.";
    overlayStats.hidden = true;
    overlayStats.innerHTML = "";
    overlayHelp.hidden = true;
    hiscoreLine.hidden = true;
    primaryBtn.textContent = "Resume";
    secondaryBtn.hidden = false;
    secondaryBtn.textContent = "Restart";
  } else if (game.state === State.GAMEOVER) {
    overlayTitle.textContent = game.newBest ? "New best light" : "Light faded";
    overlayTag.textContent = game.newBest
      ? "The well remembers your glow."
      : "Collect motes. Stay in the bloom.";
    overlayStats.hidden = false;
    overlayHelp.hidden = true;
    hiscoreLine.hidden = false;
    overlayStats.innerHTML = `
      <div><span>Score</span><strong>${Math.floor(game.score)}</strong></div>
      <div><span>Wave</span><strong>${game.wave}</strong></div>
      <div><span>Motes</span><strong>${game.motesCollected}</strong></div>
      <div><span>Time</span><strong>${formatTime(game.time)}</strong></div>
    `;
    primaryBtn.textContent = "Again";
    secondaryBtn.hidden = true;
  }
  for (const el of hiScoreEls) el.textContent = String(Math.floor(game.highScore));
}

function syncHud() {
  if (game.state !== State.PLAYING) return;
  scoreEl.textContent = String(Math.floor(game.score));
  comboEl.textContent = game.player.combo > 1 ? `×${game.player.combo}` : "";
  waveEl.textContent = String(game.wave);
  timeEl.textContent = formatTime(game.time);
  lightFill.style.width = `${Math.max(0, game.player.light)}%`;
  lightFill.classList.toggle("critical", game.player.light < 28);
}

function playEvents() {
  for (const event of game.events) {
    if (event.type === "collect") audio.collect(event.combo);
    if (event.type === "dash") audio.dash();
    if (event.type === "hit") audio.hit();
    if (event.type === "pulse") audio.pulse();
    if (event.type === "gameover") audio.gameOver();
    if (event.type === "start") audio.start();
  }
}

function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;

  if (input.consumeMute()) {
    audio.ensure();
    muteBtn.textContent = audio.toggleMute() ? "Sound off" : "Sound on";
  }
  if (input.consumePause() && (game.state === State.PLAYING || game.state === State.PAUSED)) {
    game.pauseToggle();
  }
  if (input.consumeStart()) {
    audio.ensure();
    if (game.state === State.PAUSED) game.pauseToggle();
    else if (game.state !== State.PLAYING) startRun();
  }

  const axis = input.axis();
  const pointerWorld = renderer.worldFromScreen(input.pointerX, input.pointerY);
  const simInput = {
    ax: axis.x,
    ay: axis.y,
    dash: input.consumeDash(),
    pointer: input.pointerDown ? { active: true, x: pointerWorld.x, y: pointerWorld.y } : null,
  };

  game.update(dt, simInput);
  playEvents();
  renderer.draw(game);
  syncOverlay();
  syncHud();
  requestAnimationFrame(frame);
}

bindUi();
syncOverlay();
requestAnimationFrame(frame);
