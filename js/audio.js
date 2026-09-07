/** Tiny Web Audio synth — no asset files required. */

export class AudioBus {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.ambience = null;
  }

  ensure() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.22;
      this.master.connect(this.ctx.destination);
      this._ambience();
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.22;
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  _tone(freq, duration, type = "sine", volume = 0.2, slide = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + duration);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  _noise(duration, volume = 0.08) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * duration, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 900;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t);
  }

  collect(combo) {
    const f = 620 + Math.min(combo, 12) * 42;
    this._tone(f, 0.12, "sine", 0.16);
    this._tone(f * 2, 0.1, "triangle", 0.06);
  }

  dash() {
    this._noise(0.12, 0.07);
    this._tone(240, 0.14, "sawtooth", 0.05, 420);
  }

  hit() {
    this._tone(90, 0.28, "square", 0.12, -50);
    this._noise(0.18, 0.1);
  }

  pulse() {
    this._tone(140, 0.35, "sine", 0.12, -80);
    this._noise(0.22, 0.06);
  }

  gameOver() {
    this._tone(330, 0.22, "sine", 0.1, -80);
    this._tone(220, 0.4, "triangle", 0.08, -120);
    this._tone(110, 0.7, "sine", 0.1, -40);
  }

  start() {
    this._tone(392, 0.12, "sine", 0.1);
    this._tone(523, 0.18, "sine", 0.08);
  }

  _ambience() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 56;
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = 8;
    gain.gain.value = 0.035;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start();
    lfo.start();
    this.ambience = { osc, lfo };
  }
}
