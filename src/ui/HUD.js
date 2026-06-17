/**
 * HUD — In-game heads-up display.
 * Adapts to the current phase (preparation / hunt) and role (hider / seeker).
 * Binds to existing DOM elements defined in index.html.
 */
export class HUD {
  constructor() {
    this._bindElements();
  }

  // ───────────────────────────── DOM Binding ─────────────────────────────

  _bindElements() {
    this.hud = document.getElementById('game-hud');
    this.phaseLabel = document.getElementById('hud-phase');
    this.timerLabel = document.getElementById('hud-timer');
    this.aliveCount = document.getElementById('hud-alive-count');
    this.aliveIcon = document.getElementById('hud-alive-icon');
    this.roleLabel = document.getElementById('hud-role');
    this.controls = document.getElementById('hud-controls');
    this.tagPrompt = document.getElementById('tag-prompt');
    this.crosshair = document.getElementById('crosshair');
  }

  // ───────────────────────────── Visibility ─────────────────────────────

  /** Show the full HUD overlay. */
  show() {
    this.hud.classList.remove('hidden');
  }

  /** Hide the full HUD overlay. */
  hide() {
    this.hud.classList.add('hidden');
    this.hideTagPrompt();
    this.hideCrosshair();
  }

  // ───────────────────────────── Phase ───────────────────────────────────

  /**
   * Update the phase label and its colour.
   * @param {'preparation' | 'hunt' | 'ended'} phase
   */
  setPhase(phase) {
    const config = {
      prep:        { text: 'PREPARATION', color: '#00e5ff' },
      preparation: { text: 'PREPARATION', color: '#00e5ff' },
      hunt:        { text: 'HUNT',        color: '#ff1744' },
      ended:       { text: 'ROUND OVER',  color: '#ffc107' },
      results:     { text: 'ROUND OVER',  color: '#ffc107' },
    };

    const key = String(phase).toLowerCase();
    const entry = config[key] || config.preparation;
    this.phaseLabel.textContent = entry.text;
    this.phaseLabel.style.color = entry.color;

    // Remove previous phase classes, add current
    this.phaseLabel.classList.remove('phase-preparation', 'phase-hunt', 'phase-ended', 'phase-prep', 'phase-results');
    this.phaseLabel.classList.add(`phase-${key}`);
  }

  // ───────────────────────────── Timer ───────────────────────────────────

  /**
   * Update the timer display and apply warning / critical styling.
   * @param {number} seconds
   */
  setTimer(seconds) {
    const secs = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    this.timerLabel.textContent = mins > 0
      ? `${mins}:${String(rem).padStart(2, '0')}`
      : `${rem}`;

    // Warning / critical classes
    this.timerLabel.classList.remove('warning', 'critical');
    if (secs <= 10) {
      this.timerLabel.classList.add('critical');
    } else if (secs <= 30) {
      this.timerLabel.classList.add('warning');
    }
  }

  // ───────────────────────────── Alive Count ─────────────────────────────

  /**
   * Update the hiders remaining display.
   * @param {number} alive
   * @param {number} total
   */
  setAliveCount(alive, total) {
    this.aliveCount.textContent = `${alive} / ${total}`;
  }

  // ───────────────────────────── Role ────────────────────────────────────

  /**
   * Set the current role badge.
   * @param {'hider' | 'seeker'} role
   */
  setRole(role) {
    const isSeeker = role === 'seeker';
    this.roleLabel.textContent = isSeeker ? 'SEEKER' : 'HIDER';
    this.roleLabel.classList.toggle('seeker', isSeeker);
    this.roleLabel.classList.toggle('hider', !isSeeker);
  }

  // ───────────────────────────── Controls Hint ──────────────────────────

  /**
   * Show the relevant control hints for the given role and phase.
   * - Hider during preparation: move, paint, pose, camera, lock
   * - Hider during hunt: hidden (frozen in place)
   * - Seeker during hunt: move, tag, camera
   * @param {'hider' | 'seeker'} role
   * @param {'preparation' | 'hunt'} phase
   */
  showControls(role, phase) {
    this.controls.innerHTML = '';
    this.controls.classList.remove('hidden');

    /** @type {Array<{key: string, action: string}>} */
    let hints = [];

    if (role === 'hider' && phase === 'preparation') {
      hints = [
        { key: 'WASD', action: 'Move' },
        { key: 'F', action: 'Paint Tool' },
        { key: 'Q', action: 'Pose Menu' },
        { key: 'V', action: 'Camera' },
        { key: 'Enter', action: 'Lock Pose' },
      ];
    } else if (role === 'hider' && phase === 'hunt') {
      // Hiders are frozen during the hunt — no controls to show
      this.controls.classList.add('hidden');
      return;
    } else if (role === 'seeker' && phase === 'hunt') {
      hints = [
        { key: 'WASD', action: 'Move' },
        { key: 'E', action: 'Tag' },
        { key: 'V', action: 'Camera' },
      ];
    } else if (role === 'seeker' && phase === 'preparation') {
      // Seeker waits; no in-game controls
      this.controls.classList.add('hidden');
      return;
    }

    for (const hint of hints) {
      const span = document.createElement('span');
      span.className = 'control-hint';

      const kbd = document.createElement('kbd');
      kbd.textContent = hint.key;

      span.appendChild(kbd);
      span.append(` ${hint.action}`);
      this.controls.appendChild(span);
    }
  }

  /** Hide the controls hint bar. */
  hideControls() {
    this.controls.classList.add('hidden');
  }

  // ───────────────────────────── Tag Prompt ──────────────────────────────

  /** Show the "Press E to Tag" prompt (seeker only). */
  showTagPrompt() {
    this.tagPrompt.classList.remove('hidden');
  }

  /** Hide the tag prompt. */
  hideTagPrompt() {
    this.tagPrompt.classList.add('hidden');
  }

  // ───────────────────────────── Crosshair ──────────────────────────────

  /** Show the center crosshair. */
  showCrosshair() {
    this.crosshair.classList.remove('hidden');
  }

  /** Hide the center crosshair. */
  hideCrosshair() {
    this.crosshair.classList.add('hidden');
  }
}
