/**
 * PlayerController.js
 *
 * First-person / third-person camera and WASD movement controller for the
 * Browser Chameleon game.
 *
 * Features:
 *  • Pointer Lock API for mouse capture
 *  • WASD movement relative to camera yaw
 *  • Simple AABB collision against an array of collider meshes
 *  • Toggle between first-person and third-person views (V key)
 *  • Movement can be disabled (e.g. when hider is locked in)
 */
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const PITCH_LIMIT = THREE.MathUtils.degToRad(85); // ±85°
const PLAYER_HALF_WIDTH  = 0.3;
const PLAYER_HEIGHT      = 1.8;

// ---------------------------------------------------------------------------
// PlayerController
// ---------------------------------------------------------------------------
export class PlayerController {
  /**
   * @param {THREE.PerspectiveCamera} camera
   * @param {import('./CharacterModel.js').CharacterModel} characterModel
   * @param {THREE.Mesh[]} colliders – array of invisible box colliders
   */
  constructor(camera, characterModel, colliders) {
    /** @type {THREE.PerspectiveCamera} */
    this.camera = camera;

    /** @type {import('./CharacterModel.js').CharacterModel} */
    this.character = characterModel;

    /** @type {THREE.Mesh[]} */
    this.colliders = colliders;

    // -- Tuning ---------------------------------------------------------------
    /** Movement speed in world-units per second. */
    this.moveSpeed = 5;

    /** Mouse look sensitivity (radians per pixel). */
    this.lookSpeed = 0.002;

    // -- State ----------------------------------------------------------------
    /** World position of the player (feet). */
    this.position = new THREE.Vector3(0, 0, 0);

    /** Yaw (Y-axis rotation) and pitch (X-axis rotation) in radians. */
    this.rotation = { yaw: 0, pitch: 0 };

    /** Whether the camera is behind the character. */
    this.isThirdPerson = false;

    /** Distance behind the character in third-person mode. */
    this.thirdPersonDistance = 4;

    /** Height offset above the character in third-person mode. */
    this.thirdPersonHeight = 2;

    /** Currently pressed movement keys. */
    this.keys = { w: false, a: false, s: false, d: false };

    /** When false the player cannot move (hider locked in). */
    this.canMove = true;

    /** Whether the Pointer Lock API is currently active. */
    this.isPointerLocked = false;

    // -- Room bounds (set after map is built) --------------------------------
    /** @type {{ minX: number, maxX: number, minZ: number, maxZ: number }} */
    this.bounds = { minX: -9.5, maxX: 9.5, minZ: -7.0, maxZ: 7.0 };

    // -- Internal scratch vectors (avoid per-frame allocation) ----------------
    this._moveDir = new THREE.Vector3();
    this._forward = new THREE.Vector3();
    this._right   = new THREE.Vector3();
    this._desiredPos = new THREE.Vector3();
    this._playerBox  = new THREE.Box3();
    this._colliderBox = new THREE.Box3();

    // Set up input listeners
    this._setupListeners();
  }

  // -----------------------------------------------------------------------
  // Input
  // -----------------------------------------------------------------------

  /** @private Attach keyboard and pointer-lock listeners. */
  _setupListeners() {
    // -- Keyboard -------------------------------------------------------------
    this._onKeyDown = (/** @type {KeyboardEvent} */ e) => {
      const key = e.key.toLowerCase();
      if (key in this.keys) this.keys[key] = true;
    };

    this._onKeyUp = (/** @type {KeyboardEvent} */ e) => {
      const key = e.key.toLowerCase();
      if (key in this.keys) this.keys[key] = false;
    };

    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);

    // -- Mouse look -----------------------------------------------------------
    this._onMouseMove = (/** @type {MouseEvent} */ e) => {
      if (!this.isPointerLocked) return;
      this.rotation.yaw   -= e.movementX * this.lookSpeed;
      this.rotation.pitch -= e.movementY * this.lookSpeed;
      this.rotation.pitch  = THREE.MathUtils.clamp(this.rotation.pitch, -PITCH_LIMIT, PITCH_LIMIT);
    };

    document.addEventListener('mousemove', this._onMouseMove);

    // -- Pointer lock state ---------------------------------------------------
    this._onPointerLockChange = () => {
      this.isPointerLocked = (document.pointerLockElement === this.camera.domElement ||
                              document.pointerLockElement === document.body);
    };

    document.addEventListener('pointerlockchange', this._onPointerLockChange);
  }

  /**
   * Request pointer lock on the renderer canvas.
   * Must be called from a user-gesture handler (e.g. click).
   * @param {HTMLElement} [element] – defaults to document.body
   */
  requestPointerLock(element) {
    const el = element || this.camera.domElement || document.body;
    el.requestPointerLock?.();
  }

  // -----------------------------------------------------------------------
  // Update loop
  // -----------------------------------------------------------------------

  /**
   * Call once per animation frame.
   * @param {number} deltaTime – seconds since last frame
   */
  update(deltaTime) {
    if (this.canMove) {
      this._applyMovement(deltaTime);
    }

    // Sync character mesh to player position / yaw
    this.character.setPosition(this.position.x, this.position.y, this.position.z);
    this.character.setRotation(this.rotation.yaw);

    // Update camera
    if (this.isThirdPerson) {
      this._updateThirdPerson();
    } else {
      this._updateFirstPerson();
    }
  }

  // -----------------------------------------------------------------------
  // Movement
  // -----------------------------------------------------------------------

  /**
   * Calculate WASD direction relative to yaw, apply speed, test collisions.
   * @param {number} dt – delta time in seconds
   * @private
   */
  _applyMovement(dt) {
    this._moveDir.set(0, 0, 0);

    // Forward / back (camera-relative)
    if (this.keys.w) this._moveDir.z -= 1;
    if (this.keys.s) this._moveDir.z += 1;

    // Strafe
    if (this.keys.a) this._moveDir.x -= 1;
    if (this.keys.d) this._moveDir.x += 1;

    if (this._moveDir.lengthSq() === 0) return;
    this._moveDir.normalize();

    // Rotate direction by yaw
    const sinY = Math.sin(this.rotation.yaw);
    const cosY = Math.cos(this.rotation.yaw);
    const mx = this._moveDir.x * cosY - this._moveDir.z * sinY;
    const mz = this._moveDir.x * sinY + this._moveDir.z * cosY;

    const speed = this.moveSpeed * dt;
    this._desiredPos.copy(this.position);
    this._desiredPos.x += mx * speed;
    this._desiredPos.z += mz * speed;

    // Keep on ground
    this._desiredPos.y = 0;

    // ---- Collision detection (AABB slide) ----
    // Try full move first
    if (!this._collidesAt(this._desiredPos.x, this._desiredPos.z)) {
      this.position.copy(this._desiredPos);
    } else {
      // Try X-only slide
      if (!this._collidesAt(this._desiredPos.x, this.position.z)) {
        this.position.x = this._desiredPos.x;
      }
      // Try Z-only slide
      if (!this._collidesAt(this.position.x, this._desiredPos.z)) {
        this.position.z = this._desiredPos.z;
      }
    }

    // Clamp to room bounds
    this.position.x = THREE.MathUtils.clamp(this.position.x, this.bounds.minX, this.bounds.maxX);
    this.position.z = THREE.MathUtils.clamp(this.position.z, this.bounds.minZ, this.bounds.maxZ);
  }

  /**
   * Test whether the player AABB at (x, z) overlaps any collider.
   * @param {number} x
   * @param {number} z
   * @returns {boolean}
   * @private
   */
  _collidesAt(x, z) {
    // Build player AABB
    this._playerBox.min.set(
      x - PLAYER_HALF_WIDTH,
      0,
      z - PLAYER_HALF_WIDTH,
    );
    this._playerBox.max.set(
      x + PLAYER_HALF_WIDTH,
      PLAYER_HEIGHT,
      z + PLAYER_HALF_WIDTH,
    );

    for (const col of this.colliders) {
      this._colliderBox.setFromObject(col);
      if (this._playerBox.intersectsBox(this._colliderBox)) {
        return true;
      }
    }
    return false;
  }

  // -----------------------------------------------------------------------
  // Camera modes
  // -----------------------------------------------------------------------

  /** @private Position camera at the character's head looking where pitch/yaw point. */
  _updateFirstPerson() {
    const headY = this.position.y + 1.65;

    this.camera.position.set(this.position.x, headY, this.position.z);

    // Build a look-at target from yaw + pitch
    const lookX = this.position.x + Math.sin(this.rotation.yaw) * Math.cos(this.rotation.pitch) * -1;
    const lookY = headY + Math.sin(this.rotation.pitch);
    const lookZ = this.position.z + Math.cos(this.rotation.yaw) * Math.cos(this.rotation.pitch) * -1;

    this.camera.lookAt(lookX, lookY, lookZ);

    // Hide own character in first person so it doesn't block the view
    this.character.group.visible = false;
  }

  /** @private Position camera behind and above the character. */
  _updateThirdPerson() {
    this.character.group.visible = true;

    const headY = this.position.y + 1.0;

    // Offset behind the character based on yaw
    const camX = this.position.x + Math.sin(this.rotation.yaw) * this.thirdPersonDistance;
    const camY = headY + this.thirdPersonHeight;
    const camZ = this.position.z + Math.cos(this.rotation.yaw) * this.thirdPersonDistance;

    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(this.position.x, headY, this.position.z);
  }

  // -----------------------------------------------------------------------
  // Public helpers
  // -----------------------------------------------------------------------

  /** Toggle between first-person and third-person camera. */
  toggleCamera() {
    this.isThirdPerson = !this.isThirdPerson;
  }

  /**
   * Enable or disable player movement (e.g. when the hider locks in).
   * @param {boolean} canMove
   */
  setCanMove(canMove) {
    this.canMove = canMove;
    if (!canMove) {
      // Reset pressed keys to avoid stuck movement
      this.keys.w = false;
      this.keys.a = false;
      this.keys.s = false;
      this.keys.d = false;
    }
  }

  /**
   * Get the current world position.
   * @returns {{ x: number, y: number, z: number }}
   */
  getPosition() {
    return { x: this.position.x, y: this.position.y, z: this.position.z };
  }

  /**
   * Get the current yaw angle in radians.
   * @returns {number}
   */
  getRotation() {
    return this.rotation.yaw;
  }

  /**
   * Teleport the player to a specific location.
   * @param {number} x
   * @param {number} y
   * @param {number} z
   */
  setPosition(x, y, z) {
    this.position.set(x, y, z);
  }

  /**
   * Set room bounds for position clamping.
   * @param {number} minX
   * @param {number} maxX
   * @param {number} minZ
   * @param {number} maxZ
   */
  setBounds(minX, maxX, minZ, maxZ) {
    this.bounds = { minX, maxX, minZ, maxZ };
  }

  // -----------------------------------------------------------------------
  // Cleanup
  // -----------------------------------------------------------------------

  /** Remove all event listeners. */
  dispose() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('pointerlockchange', this._onPointerLockChange);
  }
}
