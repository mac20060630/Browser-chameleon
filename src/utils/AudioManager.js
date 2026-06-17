/**
 * AudioManager — Procedural sound effects using the Web Audio API.
 * All sounds are synthesised on-the-fly with OscillatorNode, GainNode,
 * and BiquadFilterNode. No external audio files required.
 *
 * Usage:
 *   import { audio } from '../utils/AudioManager.js';
 *   audio.playButtonClick();
 */
export class AudioManager {
  constructor() {
    /** @type {AudioContext | null} */
    this.ctx = null;
    this.masterVolume = 0.5;
  }

  // ───────────────────────── Context ────────────────────────────────────

  /** Lazy-create the AudioContext (must happen after a user gesture). */
  _ensureContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // ───────────────────────── Helpers ────────────────────────────────────

  /**
   * Create a gain node connected to the destination with master volume.
   * @returns {GainNode}
   */
  _masterGain() {
    const gain = this.ctx.createGain();
    gain.gain.value = this.masterVolume;
    gain.connect(this.ctx.destination);
    return gain;
  }

  /**
   * Play a tone with an ADSR-style envelope.
   * @param {number} freq      - Frequency in Hz
   * @param {string} type      - Oscillator type ('sine', 'square', 'sawtooth', 'triangle')
   * @param {number} attack    - Attack time in seconds
   * @param {number} sustain   - Sustain time in seconds
   * @param {number} decay     - Decay/release time in seconds
   * @param {number} volume    - Peak volume 0-1
   * @param {number} [delay=0] - Start delay in seconds
   */
  _playTone(freq, type, attack, sustain, decay, volume, delay = 0) {
    this._ensureContext();
    const now = this.ctx.currentTime + delay;

    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume * this.masterVolume, now + attack);
    gain.gain.setValueAtTime(volume * this.masterVolume, now + attack + sustain);
    gain.gain.linearRampToValueAtTime(0, now + attack + sustain + decay);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + attack + sustain + decay + 0.01);
  }

  /**
   * Play a burst of filtered noise.
   * @param {number} duration  - Duration in seconds
   * @param {number} volume    - Peak volume 0-1
   * @param {number} filterFreq - Lowpass filter cutoff frequency
   * @param {number} [delay=0]
   */
  _playNoise(duration, volume, filterFreq, delay = 0) {
    this._ensureContext();
    const now = this.ctx.currentTime + delay;

    // Create noise buffer
    const sampleRate = this.ctx.sampleRate;
    const samples = Math.ceil(sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, samples, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < samples; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    // Lowpass filter
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;

    // Gain envelope
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume * this.masterVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    source.start(now);
    source.stop(now + duration + 0.01);
  }

  // ───────────────────────── Sound Effects ──────────────────────────────

  /** Sharp hit sound — short burst of noise for tagging a player. */
  playTag() {
    this._playNoise(0.15, 0.8, 3000);
    this._playTone(300, 'square', 0.005, 0.05, 0.1, 0.6);
    this._playTone(150, 'sawtooth', 0.005, 0.05, 0.15, 0.5, 0.02);
    this._playTone(80, 'sine', 0.005, 0.05, 0.2, 0.4, 0.05); // punchy bass drop
  }

  /** Starts playing a looping background music track. */
  playBGM() {
    if (this._bgmInterval) return;
    // Play silence to ensure AudioContext starts if it hasn't
    this._playTone(0, 'sine', 0, 0, 0, 0);

    const notes = [
      261.63, 329.63, 392.00, 329.63, // C4 E4 G4 E4
      349.23, 440.00, 523.25, 440.00, // F4 A4 C5 A4
      392.00, 493.88, 587.33, 493.88, // G4 B4 D5 B4
      261.63, 329.63, 392.00, 523.25  // C4 E4 G4 C5
    ];
    let step = 0;
    
    const playNext = () => {
      // Melody
      this._playTone(notes[step], 'sine', 0.05, 0.1, 0.2, 0.1);
      // Bassline (one octave down)
      this._playTone(notes[step] / 2, 'triangle', 0.05, 0.1, 0.3, 0.05);
      step = (step + 1) % notes.length;
    };
    
    playNext();
    this._bgmInterval = setInterval(playNext, 400); // 150 BPM
  }

  /** Stops the background music. */
  stopBGM() {
    if (this._bgmInterval) {
      clearInterval(this._bgmInterval);
      this._bgmInterval = null;
    }
  }

  /** Soft tick — very short sine beep for timer. */
  playTimerTick() {
    this._playTone(800, 'sine', 0.002, 0.01, 0.04, 0.15);
  }

  /** Louder beep for low timer warning. */
  playTimerWarning() {
    this._playTone(1000, 'square', 0.005, 0.04, 0.08, 0.35);
  }

  /** Ascending chime — 3 quick ascending tones for phase change. */
  playPhaseChange() {
    this._playTone(523, 'sine', 0.01, 0.06, 0.08, 0.4, 0);
    this._playTone(659, 'sine', 0.01, 0.06, 0.08, 0.4, 0.1);
    this._playTone(784, 'sine', 0.01, 0.08, 0.12, 0.5, 0.2);
  }

  /** Confirmation ding for ready-up. */
  playReady() {
    this._playTone(880, 'sine', 0.005, 0.06, 0.15, 0.35);
    this._playTone(1108, 'sine', 0.005, 0.08, 0.2, 0.3, 0.08);
  }

  /** Soft splat — short noise burst with filter for painting. */
  playPaint() {
    this._playNoise(0.08, 0.2, 1500);
  }

  /** Victory fanfare — ascending arpeggio. */
  playWin() {
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      this._playTone(freq, 'sine', 0.01, 0.1, 0.15, 0.4, i * 0.12);
    });
    // Final sustained chord
    this._playTone(1047, 'triangle', 0.02, 0.2, 0.4, 0.3, 0.48);
    this._playTone(784, 'triangle', 0.02, 0.2, 0.4, 0.2, 0.48);
  }

  /** Sad descending tones for losing. */
  playLose() {
    const notes = [523, 494, 440, 330]; // C5, B4, A4, E4
    notes.forEach((freq, i) => {
      this._playTone(freq, 'sine', 0.01, 0.12, 0.2, 0.35, i * 0.18);
    });
  }

  /** Subtle UI click for buttons. */
  playButtonClick() {
    this._playTone(600, 'sine', 0.001, 0.008, 0.035, 0.15);
  }

  // ───────────────────────── Volume Control ─────────────────────────────

  /**
   * Set the master volume.
   * @param {number} vol - Volume level between 0 and 1.
   */
  setVolume(vol) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
  }
}

/** Singleton instance for convenient import. */
export const audio = new AudioManager();
