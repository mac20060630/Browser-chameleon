/**
 * HUD — In-game heads-up display.
 * Matches the screenshot layout:
 *   - Top bar: hider life icons | ⏳ timer | seeker icons
 *   - Left: role badge
 *   - Right: sidebar (F/V/Q buttons)
 *   - Bottom-left: ammo/paint bars
 *   - Bottom-right: 残り人数 remaining count
 *   - Bottom-center: controls hint
 */
export class HUD {
  constructor() {
    this._bindElements();
    this._totalHiders = 0;
    this._aliveHiders = 0;
    this._totalSeekers = 0;
  }

  // ─────────────────────────── DOM Binding ──────────────────────────

  _bindElements() {
    this.hud        = document.getElementById('game-hud');
    this.timerLabel = document.getElementById('hud-timer');
    this.timerLabel2= document.getElementById('hud-timer-label');
    this.phaseBadge = document.getElementById('hud-phase-badge');
    this.lives      = document.getElementById('hud-lives');
    this.seekers    = document.getElementById('hud-seekers');
    this.roleLabel  = document.getElementById('hud-role');
    this.controls   = document.getElementById('hud-controls');
    this.tagPrompt  = document.getElementById('tag-prompt');
    this.crosshair  = document.getElementById('crosshair');
    this.sidebar    = document.getElementById('hud-sidebar');
    this.ammo       = document.getElementById('hud-ammo');
    this.remaining  = document.getElementById('hud-remaining');
    this.remainingCount = document.getElementById('hud-remaining-count');
  }

  // ─────────────────────────── Visibility ──────────────────────────

  show() { this.hud.classList.remove('hidden'); }
  hide() {
    this.hud.classList.add('hidden');
    this.hideTagPrompt();
    this.hideCrosshair();
  }

  // ─────────────────────────── Phase ───────────────────────────────

  setPhase(phase) {
    const isHunt = phase === 'hunt';
    if (this.phaseBadge) {
      this.phaseBadge.textContent = isHunt ? 'HUNT' : 'PREP';
      this.phaseBadge.classList.toggle('hunt', isHunt);
    }
    if (this.timerLabel2) {
      this.timerLabel2.textContent = isHunt ? '残り時間' : '準備時間';
    }
  }

  // ─────────────────────────── Timer ───────────────────────────────

  setTimer(seconds) {
    const secs = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(secs / 60);
    const rem  = secs % 60;
    if (this.timerLabel) {
      this.timerLabel.textContent = mins > 0
        ? `${mins}:${String(rem).padStart(2, '0')}`
        : `${rem}`;

      this.timerLabel.classList.remove('warning', 'critical');
      if (secs <= 10)      this.timerLabel.classList.add('critical');
      else if (secs <= 30) this.timerLabel.classList.add('warning');
    }
  }

  // ─────────────────────────── Lives (hider icons row) ─────────────

  /**
   * Rebuild hider life icons.
   * @param {number} alive
   * @param {number} total
   */
  setAliveCount(alive, total) {
    this._aliveHiders = alive;
    this._totalHiders = total;
    if (!this.lives) return;

    this.lives.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const icon = document.createElement('div');
      icon.className = 'life-icon' + (i >= alive ? ' dead' : '');
      this.lives.appendChild(icon);
    }

    // Update bottom-right remaining count
    if (this.remainingCount) {
      this.remainingCount.textContent = alive;
    }
  }

  /**
   * Rebuild seeker icons.
   * @param {number} count
   */
  setSeekerCount(count) {
    this._totalSeekers = count;
    if (!this.seekers) return;

    this.seekers.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const icon = document.createElement('div');
      icon.className = 'seeker-icon';
      icon.textContent = '🔦';
      this.seekers.appendChild(icon);
    }
  }

  // ─────────────────────────── Role ────────────────────────────────

  setRole(role) {
    if (!this.roleLabel) return;
    const isSeeker = role === 'seeker';
    this.roleLabel.textContent = isSeeker ? '🔦 SEEKER' : '🎨 HIDER';
    this.roleLabel.classList.toggle('seeker', isSeeker);
    this.roleLabel.classList.toggle('hider', !isSeeker);
  }

  // ─────────────────────────── Sidebar ─────────────────────────────

  /**
   * Show/hide the right sidebar (hider-only during prep).
   */
  showSidebar() {
    this.sidebar?.classList.remove('hidden');
    this.ammo?.classList.remove('hidden');
  }

  hideSidebar() {
    this.sidebar?.classList.add('hidden');
    this.ammo?.classList.add('hidden');
  }

  /**
   * Show/hide the remaining-count (hunt phase).
   */
  showRemaining() { this.remaining?.classList.remove('hidden'); }
  hideRemaining() { this.remaining?.classList.add('hidden'); }

  // ─────────────────────────── Controls Hint ──────────────────────

  showControls(role, phase) {
    if (!this.controls) return;
    this.controls.innerHTML = '';
    this.controls.classList.remove('hidden');

    let hints = [];

    if (role === 'hider' && phase === 'preparation') {
      hints = [
        { key: 'WASD', action: 'Move'   },
        { key: 'F',    action: 'Paint'  },
        { key: 'Q',    action: 'Pose'   },
        { key: 'V',    action: 'Camera' },
        { key: 'Enter',action: 'Lock'   },
      ];
    } else if (role === 'hider' && phase === 'hunt') {
      this.controls.classList.add('hidden');
      return;
    } else if (role === 'seeker' && phase === 'hunt') {
      hints = [
        { key: 'WASD', action: 'Move'   },
        { key: 'E',    action: 'Tag'    },
        { key: 'V',    action: 'Camera' },
      ];
    } else if (role === 'seeker' && phase === 'preparation') {
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

  hideControls() {
    this.controls?.classList.add('hidden');
  }

  // ─────────────────────────── Tag Prompt ─────────────────────────

  showTagPrompt()  { this.tagPrompt?.classList.remove('hidden'); }
  hideTagPrompt()  { this.tagPrompt?.classList.add('hidden'); }

  // ─────────────────────────── Crosshair ──────────────────────────

  showCrosshair()  { this.crosshair?.classList.remove('hidden'); }
  hideCrosshair()  { this.crosshair?.classList.add('hidden'); }
}
