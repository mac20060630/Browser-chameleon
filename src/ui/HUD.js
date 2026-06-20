/**
 * HUD — In-game heads-up display.
 * Based on the Meccha Chameleon full game design prompt.
 *
 * Layout:
 *  - Top center: hider count | ⏳ timer | hunter count
 *  - Top left: role badge
 *  - Top center area: detection warning ("In [NAME]'s Line of Sight +[N]")
 *  - Bottom left: Missed-Spot Ranking leaderboard (prep phase, hiders)
 *  - Bottom center: context-sensitive action bar
 *  - Bottom right: remaining count + mode description box
 *  - Right sidebar: 6 icons (Sound, Paint, Rotation Lock, Nameplate, X-Ray, Camera)
 *  - Center screen: buried-too-deep warning (yellow)
 */
export class HUD {
  constructor() {
    this._bindElements();
    this._totalHiders = 0;
    this._aliveHiders = 0;
    this._totalSeekers = 0;
    this._leaderboardData = [];
    this._detectionTimeout = null;
  }

  // ─────────────────────────── DOM Binding ──────────────────────────

  _bindElements() {
    this.hud             = document.getElementById('game-hud');
    this.timerLabel      = document.getElementById('hud-timer');
    this.timerLabel2     = document.getElementById('hud-timer-label');
    this.phaseBadge      = document.getElementById('hud-phase-badge');
    this.lives           = document.getElementById('hud-lives');
    this.seekers         = document.getElementById('hud-seekers');
    this.roleLabel       = document.getElementById('hud-role');
    this.controls        = document.getElementById('hud-controls');
    this.tagPrompt       = document.getElementById('tag-prompt');
    this.crosshair       = document.getElementById('crosshair');
    this.sidebar         = document.getElementById('hud-sidebar');
    this.ammo            = document.getElementById('hud-ammo');
    this.remaining       = document.getElementById('hud-remaining');
    this.remainingCount  = document.getElementById('hud-remaining-count');
    this.modeBox         = document.getElementById('hud-mode-box');
    this.modeName        = document.getElementById('hud-mode-name');
    this.modeRule        = document.getElementById('hud-mode-rule');
    this.detectionWarn   = document.getElementById('hud-detection-warning');
    this.buriedWarn      = document.getElementById('hud-buried-warning');
    this.leaderboard     = document.getElementById('hud-leaderboard');
    this.leaderboardList = document.getElementById('leaderboard-list');
  }

  // ─────────────────────────── Visibility ──────────────────────────

  show() { this.hud?.classList.remove('hidden'); }
  hide() {
    this.hud?.classList.add('hidden');
    this.hideTagPrompt();
    this.hideCrosshair();
    this.hideDetectionWarning();
    this.hideBuriedWarning();
    this.hideLeaderboard();
    this.hideModeBox();
  }

  // ─────────────────────────── Phase ───────────────────────────────

  setPhase(phase) {
    const isHunt = phase === 'hunt';
    if (this.phaseBadge) {
      this.phaseBadge.textContent = isHunt ? 'HUNT' : 'PREP';
      this.phaseBadge.classList.toggle('hunt', isHunt);
    }
    if (this.timerLabel2) {
      // Match the exact labels from the prompt
      this.timerLabel2.textContent = isHunt ? 'Search Time' : 'Until Search Starts';
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

  setAliveCount(alive, total) {
    this._aliveHiders = alive;
    this._totalHiders = total;
    if (!this.lives) return;

    this.lives.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const icon = document.createElement('div');
      icon.className = 'life-icon' + (i >= alive ? ' dead' : '');
      // White humanoid icon
      icon.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><circle cx="12" cy="5" r="3"/><path d="M12 9c-3 0-6 1.5-6 4v2h12v-2c0-2.5-3-4-6-4z"/><rect x="9" y="15" width="2.5" height="5" rx="1"/><rect x="12.5" y="15" width="2.5" height="5" rx="1"/></svg>';
      this.lives.appendChild(icon);
    }

    if (this.remainingCount) {
      this.remainingCount.textContent = alive;
    }
  }

  setSeekerCount(count) {
    this._totalSeekers = count;
    if (!this.seekers) return;

    this.seekers.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const icon = document.createElement('div');
      icon.className = 'seeker-icon';
      // Red humanoid icon
      icon.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="#ff4444"><circle cx="12" cy="5" r="3"/><path d="M12 9c-3 0-6 1.5-6 4v2h12v-2c0-2.5-3-4-6-4z"/><rect x="9" y="15" width="2.5" height="5" rx="1"/><rect x="12.5" y="15" width="2.5" height="5" rx="1"/></svg>';
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

  // ─────────────────────────── Mode Box ────────────────────────────

  setMode(modeName, modeRule) {
    if (this.modeName) this.modeName.textContent = modeName;
    if (this.modeRule) this.modeRule.textContent = modeRule;
  }

  showModeBox() { this.modeBox?.classList.remove('hidden'); }
  hideModeBox() { this.modeBox?.classList.add('hidden'); }

  // ─────────────────────────── Detection Warning ───────────────────

  /**
   * Show detection warning lines on hider's HUD.
   * @param {Array<{hunterName:string, score:number}>} detections
   */
  showDetectionWarning(detections) {
    if (!this.detectionWarn) return;

    if (!detections || detections.length === 0) {
      this.hideDetectionWarning();
      return;
    }

    this.detectionWarn.classList.remove('hidden');
    this.detectionWarn.innerHTML = detections
      .map(d => `<div class="detection-line">In <strong>${d.hunterName}</strong>'s Line of Sight &nbsp;<span class="detection-score">+${d.score}</span></div>`)
      .join('');

    // Auto-hide after 2s with no new updates
    clearTimeout(this._detectionTimeout);
    this._detectionTimeout = setTimeout(() => this.hideDetectionWarning(), 2000);
  }

  hideDetectionWarning() {
    this.detectionWarn?.classList.add('hidden');
    if (this.detectionWarn) this.detectionWarn.innerHTML = '';
  }

  // ─────────────────────────── Buried Warning ──────────────────────

  showBuriedWarning() { this.buriedWarn?.classList.remove('hidden'); }
  hideBuriedWarning() { this.buriedWarn?.classList.add('hidden'); }

  // ─────────────────────────── Leaderboard ─────────────────────────

  /**
   * Update the Missed-Spot Ranking leaderboard.
   * @param {Array<{name:string, score:number}>} entries
   */
  updateLeaderboard(entries) {
    if (!this.leaderboardList) return;
    this._leaderboardData = entries;

    this.leaderboardList.innerHTML = entries
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((e, i) => `<div class="lb-row"><span class="lb-rank">${i + 1}</span><span class="lb-name">${e.name}</span><span class="lb-score">${e.score}</span></div>`)
      .join('');
  }

  showLeaderboard() { this.leaderboard?.classList.remove('hidden'); }
  hideLeaderboard() { this.leaderboard?.classList.add('hidden'); }

  // ─────────────────────────── Sidebar ─────────────────────────────

  showSidebar() {
    this.sidebar?.classList.remove('hidden');
    this.ammo?.classList.remove('hidden');
  }

  hideSidebar() {
    this.sidebar?.classList.add('hidden');
    this.ammo?.classList.add('hidden');
  }

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
        { key: 'WASD', action: 'Move'      },
        { key: 'F',    action: 'Paint'     },
        { key: 'C',    action: 'Crouch'    },
        { key: 'U/J',  action: 'Embed ↑↓'  },
        { key: 'V',    action: 'Camera'    },
        { key: 'Click',action: 'Lock'      },
      ];
    } else if (role === 'hider' && phase === 'hunt') {
      hints = [
        { key: 'WASD', action: 'Move'      },
        { key: 'C',    action: 'Crouch'    },
        { key: 'X',    action: 'Stand Up'  },
        { key: 'Space',action: 'Climb'     },
      ];
    } else if (role === 'seeker' && phase === 'hunt') {
      hints = [
        { key: 'WASD', action: 'Move'   },
        { key: 'E',    action: 'Tag'    },
        { key: 'C',    action: 'Crouch' },
        { key: 'V',    action: 'Camera' },
      ];
    } else {
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
