/**
 * PoseMenuUI — Pose selection grid menu.
 * Dynamically builds pose buttons inside the existing #pose-grid container.
 * Handles selection, character preview, and pose locking.
 */

/** Available poses with icons and labels. */
const POSES = [
  { id: 'standing',   icon: '🧍', label: 'Standing' },
  { id: 'relaxed',    icon: '😌', label: 'Relaxed' },
  { id: 'crouching',  icon: '🦆', label: 'Crouch' },
  { id: 'lying-flat', icon: '😴', label: 'Lying' },
  { id: 'stretched',  icon: '🙆', label: 'Stretch' },
  { id: 'fetal',      icon: '🫧', label: 'Fetal' },
  { id: 'wall-lean',  icon: '🫂', label: 'Lean' },
  { id: 'sitting',    icon: '🪑', label: 'Sitting' },
  { id: 'star',       icon: '⭐', label: 'Star' },
  { id: 'ball',       icon: '🔵', label: 'Ball' },
  { id: 't-pose',     icon: '✝️', label: 'T-Pose' },
  { id: 'prayer',     icon: '🙏', label: 'Prayer' },
];

export class PoseMenuUI {
  /**
   * @param {object} characterModel - The character model to preview poses on.
   */
  constructor(characterModel) {
    this.character = characterModel;
    this.selectedPoseId = null;
    this._isLocked = false;
    this._poseLockedCallbacks = [];
    this._poseButtons = new Map();

    this._bindElements();
    this._buildPoseGrid();
    this._bindEvents();
  }

  // ───────────────────────────── DOM Binding ─────────────────────────────

  _bindElements() {
    this.overlay = document.getElementById('pose-menu');
    this.poseGrid = document.getElementById('pose-grid');
    this.btnLockPose = document.getElementById('btn-lock-pose');
    this.btnClosePose = document.getElementById('btn-close-pose');
  }

  _bindEvents() {
    this.btnLockPose.addEventListener('click', () => this._onLockPose());
    this.btnClosePose.addEventListener('click', () => this.hide());
  }

  // ───────────────────────────── Grid Build ─────────────────────────────

  /** Create pose buttons dynamically inside #pose-grid. */
  _buildPoseGrid() {
    this.poseGrid.innerHTML = '';
    this._poseButtons.clear();

    for (const pose of POSES) {
      const btn = document.createElement('div');
      btn.className = 'pose-btn';
      btn.dataset.poseId = pose.id;

      const iconSpan = document.createElement('span');
      iconSpan.className = 'pose-icon';
      iconSpan.textContent = pose.icon;

      const labelSpan = document.createElement('span');
      labelSpan.className = 'pose-label';
      labelSpan.textContent = pose.label;

      btn.appendChild(iconSpan);
      btn.appendChild(labelSpan);

      btn.addEventListener('click', () => this._onPoseSelect(pose.id));

      this.poseGrid.appendChild(btn);
      this._poseButtons.set(pose.id, btn);
    }
  }

  // ───────────────────────────── Visibility ─────────────────────────────

  /** Show the pose menu overlay. */
  show() {
    if (this._isLocked) return; // Can't reopen once locked
    this.overlay.classList.remove('hidden');
  }

  /** Hide the pose menu overlay. */
  hide() {
    this.overlay.classList.add('hidden');
  }

  /** Toggle pose menu visibility. */
  toggle() {
    if (this.isVisible()) {
      this.hide();
    } else {
      this.show();
    }
  }

  /** @returns {boolean} Whether the menu is currently showing. */
  isVisible() {
    return !this.overlay.classList.contains('hidden');
  }

  // ───────────────────────── Selection & Locking ────────────────────────

  /**
   * Handle pose selection: highlight button, preview on character, enable lock.
   * @param {string} poseId
   */
  _onPoseSelect(poseId) {
    if (this._isLocked) return;

    this.selectedPoseId = poseId;

    // Update selected styling
    this._poseButtons.forEach((btn, id) => {
      btn.classList.toggle('selected', id === poseId);
    });

    // Enable lock button
    this.btnLockPose.disabled = false;

    // Preview pose on the character model
    if (this.character && typeof this.character.previewPose === 'function') {
      this.character.previewPose(poseId);
    }
  }

  /** Lock the currently selected pose, emit callbacks, and close the menu. */
  _onLockPose() {
    if (!this.selectedPoseId || this._isLocked) return;

    this._isLocked = true;
    this.btnLockPose.disabled = true;
    this.btnLockPose.textContent = 'Pose Locked ✓';

    // Apply the pose permanently on the character model
    if (this.character && typeof this.character.setPose === 'function') {
      this.character.setPose(this.selectedPoseId);
    }

    // Notify all registered callbacks
    for (const cb of this._poseLockedCallbacks) {
      cb(this.selectedPoseId);
    }

    // Close the menu after a short delay so the player sees the confirmation
    setTimeout(() => this.hide(), 300);
  }

  // ───────────────────────── Public API ─────────────────────────────────

  /**
   * Register a callback for when a pose is locked.
   * @param {function(string): void} callback - Receives the locked pose ID.
   */
  onPoseLocked(callback) {
    if (typeof callback === 'function') {
      this._poseLockedCallbacks.push(callback);
    }
  }

  /** @returns {string | null} The currently selected pose ID. */
  getSelectedPose() {
    return this.selectedPoseId;
  }

  /** @returns {boolean} Whether a pose has been locked. */
  isPoseLocked() {
    return this._isLocked;
  }

  /**
   * Reset the menu state for a new round.
   * Clears selection, unlocks, and re-enables controls.
   */
  reset() {
    this._isLocked = false;
    this.selectedPoseId = null;
    this.btnLockPose.disabled = true;
    this.btnLockPose.textContent = 'Lock Pose (Enter)';

    this._poseButtons.forEach((btn) => {
      btn.classList.remove('selected');
    });
  }
}
