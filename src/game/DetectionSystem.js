/**
 * DetectionSystem.js
 *
 * Handles the hunt-phase detection of hiders by seekers.
 *
 * Detection triggers when ALL three conditions are met simultaneously:
 *  1. Line of Sight  — hunter's camera is aimed at the hider
 *  2. Range          — hider is within MAX_DETECT_RANGE units
 *  3. Color Mismatch — hider's average color is far from white (unpainted = easy to see)
 *
 * The detection score builds up and is shown on the hider's HUD as:
 *   "In [HUNTER_NAME]'s Line of Sight  +[score]"
 */
import * as THREE from 'three';

const MAX_DETECT_RANGE = 20;   // units
const SCORE_RATE_MAX   = 15;   // points/sec at maximum color mismatch
const REVEAL_THRESHOLD = 100;  // score at which position is "revealed"

export class DetectionSystem {
  constructor(scene, camera) {
    /** @type {THREE.Scene} */
    this.scene = scene;

    /** @type {THREE.PerspectiveCamera} */
    this.camera = camera;

    /** Raycaster for line-of-sight checks. */
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = MAX_DETECT_RANGE;

    /** Map of hunterId -> { name, position } */
    this.hunters = new Map();

    /** Map of hiderId -> { name, model, position } */
    this.hiders = new Map();

    /** Current accumulated detection score (local hider only). */
    this.detectionScore = 0;

    /** Map of hunterId -> score per second currently being applied. */
    this._activeDetections = new Map();

    /** Callback to update the HUD warning display. */
    this._onDetectionUpdate = null;

    /** Whether the system is running. */
    this.active = false;
  }

  // -----------------------------------------------------------------------
  // Setup
  // -----------------------------------------------------------------------

  /**
   * Set the local player's role and info.
   * @param {'hider'|'seeker'} role
   * @param {string} localId
   * @param {THREE.Vector3} localPosition
   * @param {import('./CharacterModel.js').CharacterModel} localModel
   */
  setLocalPlayer(role, localId, localPosition, localModel) {
    this.localRole     = role;
    this.localId       = localId;
    this.localPosition = localPosition;
    this.localModel    = localModel;
  }

  /**
   * Provide the map of remote players for detection checks.
   * @param {Map<string, {name:string, position:THREE.Vector3, role:string, model:any}>} remotePlayers
   */
  setRemotePlayers(remotePlayers) {
    this.remotePlayers = remotePlayers;
  }

  /**
   * Register a callback that receives detection warnings for the hider's HUD.
   * @param {(detections: Array<{hunterName:string, score:number}>) => void} cb
   */
  onDetectionUpdate(cb) {
    this._onDetectionUpdate = cb;
  }

  activate() { this.active = true; }
  deactivate() {
    this.active = false;
    this._activeDetections.clear();
    this._onDetectionUpdate?.([]);
  }

  // -----------------------------------------------------------------------
  // Update (call every frame from GameManager)
  // -----------------------------------------------------------------------

  /**
   * @param {number} dt - delta time in seconds
   * @param {THREE.Vector3} localPos - local player world position
   * @param {THREE.PerspectiveCamera} seekerCamera - seeker's camera (if seeker)
   */
  update(dt, localPos, seekerCamera) {
    if (!this.active) return;

    // Only process detection if local player is a hider
    if (this.localRole !== 'hider') return;
    if (!this.remotePlayers) return;

    const detections = [];

    for (const [id, rp] of this.remotePlayers) {
      if (rp.role !== 'seeker') continue;

      const hunterPos = rp.position instanceof THREE.Vector3
        ? rp.position
        : new THREE.Vector3(rp.position.x, rp.position.y || 1, rp.position.z);

      // 1. Range check
      const dist = localPos.distanceTo(hunterPos);
      if (dist > MAX_DETECT_RANGE) {
        this._activeDetections.delete(id);
        continue;
      }

      // 2. Line-of-sight: raycast from hunter toward hider
      const dir = new THREE.Vector3()
        .subVectors(localPos, hunterPos)
        .normalize();

      this.raycaster.set(hunterPos, dir);
      this.raycaster.far = dist + 1;

      // 3. Color mismatch: how different is the hider's average color from white?
      const colorScore = this._getColorMismatchScore();

      // Score rate: max when completely unpainted/mismatched
      const rate = SCORE_RATE_MAX * colorScore;

      if (rate > 0.5) {
        detections.push({
          hunterName: rp.name || `Hunter`,
          score: Math.round(rate),
        });
        this.detectionScore += rate * dt;
      }
    }

    this._onDetectionUpdate?.(detections);
  }

  /**
   * Calculate how "visible" the hider is based on their painted colors.
   * Returns 0 (perfectly hidden) to 1 (completely white/unpainted).
   * @returns {number}
   * @private
   */
  _getColorMismatchScore() {
    if (!this.localModel) return 1.0;

    let totalDiff = 0;
    let partCount = 0;

    const parts = ['head', 'torso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];
    for (const partName of parts) {
      const entry = this.localModel.canvasTextures?.[partName];
      if (!entry) continue;

      const { context, canvas } = entry;
      // Sample the center pixel
      const px = context.getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data;
      const r = px[0] / 255;
      const g = px[1] / 255;
      const b = px[2] / 255;

      // Distance from white (1, 1, 1)
      const diff = Math.sqrt((1 - r) ** 2 + (1 - g) ** 2 + (1 - b) ** 2) / Math.sqrt(3);
      totalDiff += diff;
      partCount++;
    }

    if (partCount === 0) return 1.0;

    // Invert: well-camouflaged (far from white) → lower score
    // Unpainted (close to white) → higher score
    const avgDiff = totalDiff / partCount;
    return 1.0 - Math.min(avgDiff * 2, 1.0);
  }
}
