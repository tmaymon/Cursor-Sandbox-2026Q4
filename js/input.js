/** Keyboard + pointer input. Dash is edge-triggered. */

const KEY_MAP = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "up",
  KeyA: "left",
  KeyS: "down",
  KeyD: "right",
  Space: "dash",
  ShiftLeft: "dash",
  ShiftRight: "dash",
  KeyP: "pause",
  Escape: "pause",
  Enter: "start",
  KeyM: "mute",
};

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.dashQueued = false;
    this.pauseQueued = false;
    this.startQueued = false;
    this.muteQueued = false;
    this.pointerDown = false;
    this.pointerX = 0;
    this.pointerY = 0;
    this._canvas = canvas;
    this._onKeyDown = (e) => this._key(e, true);
    this._onKeyUp = (e) => this._key(e, false);
    this._onPointerMove = (e) => this._pointer(e, this.pointerDown);
    this._onPointerDown = (e) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      this._pointer(e, true);
    };
    this._onPointerUp = () => {
      this.pointerDown = false;
    };
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    canvas.addEventListener("pointerdown", this._onPointerDown);
    window.addEventListener("pointermove", this._onPointerMove);
    window.addEventListener("pointerup", this._onPointerUp);
    window.addEventListener("blur", () => {
      this.keys.clear();
      this.pointerDown = false;
    });
  }

  _key(event, down) {
    const action = KEY_MAP[event.code];
    if (!action) return;
    event.preventDefault();
    if (down) {
      if (action === "dash") this.dashQueued = true;
      if (action === "pause") this.pauseQueued = true;
      if (action === "start") this.startQueued = true;
      if (action === "mute") this.muteQueued = true;
      this.keys.add(action);
    } else {
      this.keys.delete(action);
    }
  }

  _pointer(event, down) {
    const rect = this._canvas.getBoundingClientRect();
    this.pointerX = event.clientX - rect.left;
    this.pointerY = event.clientY - rect.top;
    this.pointerDown = down;
  }

  consumeDash() {
    const v = this.dashQueued;
    this.dashQueued = false;
    return v;
  }

  consumePause() {
    const v = this.pauseQueued;
    this.pauseQueued = false;
    return v;
  }

  consumeStart() {
    const v = this.startQueued;
    this.startQueued = false;
    return v;
  }

  consumeMute() {
    const v = this.muteQueued;
    this.muteQueued = false;
    return v;
  }

  axis() {
    let x = (this.keys.has("right") ? 1 : 0) - (this.keys.has("left") ? 1 : 0);
    let y = (this.keys.has("down") ? 1 : 0) - (this.keys.has("up") ? 1 : 0);
    const mag = Math.hypot(x, y);
    if (mag > 1) {
      x /= mag;
      y /= mag;
    }
    return { x, y };
  }
}
