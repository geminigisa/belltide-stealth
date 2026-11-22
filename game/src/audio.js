// BELLTIDE audio: 100% procedural Web Audio — no audio files, no network.
// Bell tolls, footsteps on different floors, chime lures, alert stings, pickups.
export class BellAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  _tone(freq, dur, type, vol, when = 0, slideTo = null) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  _noise(dur, vol, filterFreq, when = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t0);
  }

  // The tower bell: deep toll with harmonics, masks footsteps for a few seconds.
  bell() {
    this._tone(98, 2.6, 'sine', 0.5);
    this._tone(147, 2.2, 'sine', 0.28, 0.02);
    this._tone(196, 1.8, 'triangle', 0.18, 0.03);
    this._tone(294, 1.2, 'sine', 0.08, 0.05);
    this._noise(0.4, 0.12, 900);
  }

  footstep(floor) {
    if (floor === '~') { this._noise(0.16, 0.22, 1200); this._tone(320, 0.1, 'sine', 0.08, 0, 180); }
    else if (floor === 'w') { this._tone(210, 0.09, 'triangle', 0.16, 0, 140); this._noise(0.06, 0.08, 700); }
    else if (floor === 'g') { this._tone(1240, 0.22, 'sine', 0.2, 0, 900); this._tone(1860, 0.14, 'sine', 0.1); }
    else { this._noise(0.05, 0.06, 500); }
  }

  chime() {
    this._tone(880, 0.5, 'sine', 0.25);
    this._tone(1318, 0.7, 'sine', 0.18, 0.06);
    this._tone(1760, 0.5, 'sine', 0.1, 0.12);
  }

  snuff() {
    this._noise(0.35, 0.25, 500);
    this._tone(220, 0.25, 'sine', 0.12, 0, 90);
  }

  smoke() {
    this._noise(0.5, 0.2, 300);
  }

  alert() {
    this._tone(220, 0.35, 'sawtooth', 0.22, 0, 330);
    this._tone(233, 0.35, 'sawtooth', 0.22, 0.02, 349);
  }

  suspicious() {
    this._tone(440, 0.18, 'triangle', 0.16, 0, 520);
  }

  pickup() {
    this._tone(660, 0.16, 'sine', 0.2);
    this._tone(990, 0.3, 'sine', 0.2, 0.08);
  }

  relic() {
    [523, 659, 784, 1046].forEach((f, i) => this._tone(f, 0.4, 'sine', 0.2, i * 0.09));
  }

  door() {
    this._tone(130, 0.4, 'triangle', 0.2, 0, 90);
    this._noise(0.3, 0.12, 400, 0.05);
  }

  caught() {
    this._tone(110, 0.8, 'sawtooth', 0.25, 0, 55);
    this._tone(116, 0.8, 'sawtooth', 0.25, 0.02, 58);
  }

  clear() {
    [392, 523, 659, 784].forEach((f, i) => this._tone(f, 0.5, 'triangle', 0.18, i * 0.11));
  }
}
