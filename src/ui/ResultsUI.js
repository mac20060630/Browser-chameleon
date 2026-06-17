/**
 * ResultsUI — Results / scoreboard screen shown after each round.
 * Populates existing DOM elements defined in index.html with round results.
 */
export class ResultsUI {
  constructor() {
    this._playAgainCallback = null;
    this._backToLobbyCallback = null;

    this._bindElements();
    this._bindEvents();
  }

  // ───────────────────────────── DOM Binding ─────────────────────────────

  _bindElements() {
    this.screen = document.getElementById('results-screen');
    this.title = document.getElementById('results-title');
    this.subtitle = document.getElementById('results-subtitle');
    this.scoreBody = document.getElementById('score-body');
    this.highlightsList = document.getElementById('highlights-list');
    this.btnPlayAgain = document.getElementById('btn-play-again');
    this.btnBackLobby = document.getElementById('btn-back-lobby');
  }

  _bindEvents() {
    this.btnPlayAgain.addEventListener('click', () => {
      if (typeof this._playAgainCallback === 'function') {
        this._playAgainCallback();
      }
    });

    this.btnBackLobby.addEventListener('click', () => {
      if (typeof this._backToLobbyCallback === 'function') {
        this._backToLobbyCallback();
      }
    });
  }

  // ───────────────────────────── Visibility ─────────────────────────────

  /**
   * Show the results screen populated with round data.
   * @param {object} results
   * @param {'hiders' | 'seekers'} results.winner
   * @param {Array<{name: string, role: string, alive: boolean, score: number, survivalTime: number}>} results.scores
   * @param {Array<{text: string}>} results.highlights
   */
  show(results) {
    const scoresArray = Array.isArray(results.scores)
      ? results.scores
      : Object.values(results.scores || {});

    const hiders = scoresArray.filter((p) => p.role === 'hider');
    const hidersWon = hiders.length > 0 && hiders.some((p) => p.alive);

    // Set title based on winner
    if (hidersWon) {
      this.title.textContent = 'Hiders Win!';
      this.title.className = 'results-title hiders-win';
      this.subtitle.textContent = 'The hiders survived the hunt!';
    } else {
      this.title.textContent = 'Seekers Win!';
      this.title.className = 'results-title seekers-win';
      this.subtitle.textContent = 'All hiders have been found!';
    }

    // Populate scoreboard and highlights
    this._renderScoreboard(scoresArray);
    this._renderHighlights(results.highlights || []);

    this.screen.classList.remove('hidden');
  }

  /** Hide the results screen and clear dynamic content. */
  hide() {
    this.screen.classList.add('hidden');
    this.scoreBody.innerHTML = '';
    this.highlightsList.innerHTML = '';
  }

  // ───────────────────────── Scoreboard ─────────────────────────────────

  /**
   * Populate the score table body with player rows.
   * @param {Array<{name: string, role: string, alive: boolean, score: number, survivalTime: number}>} scores
   */
  _renderScoreboard(scores) {
    this.scoreBody.innerHTML = '';

    // Sort by score descending
    const sorted = [...scores].sort((a, b) => b.score - a.score);

    for (const entry of sorted) {
      const row = document.createElement('tr');

      // Player name cell
      const nameCell = document.createElement('td');
      nameCell.textContent = entry.name;
      row.appendChild(nameCell);

      // Role cell
      const roleCell = document.createElement('td');
      const roleBadge = document.createElement('span');
      roleBadge.className = `role-badge ${entry.role}`;
      roleBadge.textContent = entry.role === 'hider' ? 'Hider' : 'Seeker';
      roleCell.appendChild(roleBadge);
      row.appendChild(roleCell);

      // Status cell (alive/tagged + survival time)
      const statusCell = document.createElement('td');
      if (entry.role === 'hider') {
        if (entry.alive) {
          statusCell.textContent = '✅ Survived';
          statusCell.className = 'status-survived';
        } else {
          const time = this._formatTime(entry.survivalTime);
          statusCell.textContent = `❌ Tagged (${time})`;
          statusCell.className = 'status-tagged';
        }
      } else {
        // Seeker status
        statusCell.textContent = '🔦 Seeker';
        statusCell.className = 'status-seeker';
      }
      row.appendChild(statusCell);

      // Score cell
      const scoreCell = document.createElement('td');
      scoreCell.textContent = entry.score.toLocaleString();
      scoreCell.className = 'score-cell';
      row.appendChild(scoreCell);

      this.scoreBody.appendChild(row);
    }
  }

  // ───────────────────────── Highlights ──────────────────────────────────

  /**
   * Render highlight items (awards, fun stats, etc.).
   * @param {Array<{text: string}>} highlights
   */
  _renderHighlights(highlights) {
    this.highlightsList.innerHTML = '';

    if (highlights.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'highlight-item';
      empty.textContent = 'No highlights this round.';
      this.highlightsList.appendChild(empty);
      return;
    }

    for (const highlight of highlights) {
      const item = document.createElement('div');
      item.className = 'highlight-item';
      item.textContent = typeof highlight === 'string' ? highlight : (highlight.text || '');
      this.highlightsList.appendChild(item);
    }
  }

  // ───────────────────────── Callbacks ───────────────────────────────────

  /**
   * Register a callback for when the player clicks "Play Again".
   * @param {function(): void} callback
   */
  onPlayAgain(callback) {
    this._playAgainCallback = callback;
  }

  /**
   * Register a callback for when the player clicks "Back to Lobby".
   * @param {function(): void} callback
   */
  onBackToLobby(callback) {
    this._backToLobbyCallback = callback;
  }

  // ───────────────────────── Helpers ─────────────────────────────────────

  /**
   * Format seconds into a m:ss string.
   * @param {number} totalSeconds
   * @returns {string}
   */
  _formatTime(totalSeconds) {
    const secs = Math.max(0, Math.floor(totalSeconds));
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}:${String(rem).padStart(2, '0')}`;
  }
}
