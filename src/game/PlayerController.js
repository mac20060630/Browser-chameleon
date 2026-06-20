/**
 * PlayerController.js
 *
 * Third-person (hider) / First-person (hunter) camera and WASD movement controller.
 *
 * Features:
 *  • Pointer Lock API for mouse capture
 *  • WASD movement relative to camera yaw
 *  • C = Crouch, X = Stand Up, Space = Climb (move up)
 *  • Move Up / Move Down (surface embedding — vertical Y offset)
 *  • Simple AABB collision against an array of collider meshes
 *  • setFirstPerson(bool) to switch camera mode by role
 */
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const PITCH_LIMIT        = THREE.MathUtils.degToRad(85);
const PLAYER_HALF_WIDTH  = 0.3;
const PLAYER_HEIGHT      = 1.8;
const CROUCH_HEIGHT      = 0.9;
const NORMAL_SPEED       = 5.0;
const CROUCH_SPEED       = 2.5;
const SURFACE_EMBED_STEP = 0.15; // units per button press

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
    this.moveSpeed   = NORMAL_SPEED;
    this.lookSpeed   = 0.002;
    this.thirdPersonDistance = 4;
    this.thirdPersonHeight   = 2;

    // -- State ----------------------------------------------------------------
    this.position  = new THREE.Vector3(0, 0, 0);
    this.rotation  = { yaw: 0, pitch: 0 };

    /** true = third-person (hider), false = first-person (hunter) */
    this.isThirdPerson = true;

    /** Whether movement is allowed. */
    this.canMove = true;

    /** Whether pointer lock is active. */
    this.isPointerLocked = false;

    /** Crouch state. */
    this.isCrouching = false;

    /** Vertical offset from surface embedding (Move Up/Down). */
    this.surfaceOffset = 0;

    /** Currently pressed keys. */
    this.keys = { w: false, a: false, s: false, d: false };

    // -- Room bounds (updated from map) ----------------------------------------
    this.bounds = { minX: -29.0, maxX: 29.0, minZ: -24.0, maxZ: 24.0 };

    // -- Internal scratch vectors ---------------------------------------------
    this._moveDir    = new THREE.Vector3();
    this._desiredPos = new THREE.Vector3();
    this._playerBox  = new THREE.Box3();
    this._colliderBox = new THREE.Box3();

    this._setupListeners();
  }

  // -----------------------------------------------------------------------
  // Input
  // -----------------------------------------------------------------------

  _setupListeners() {
    // -- Keyboard -------------------------------------------------------------
    this._onKeyDown = (/** @type {KeyboardEvent} */ e) => {
      const key = e.key.toLowerCase();
      if (key in this.keys) this.keys[key] = true;

      // Crouch / Stand / Embed
      if (e.code === 'KeyC') this._setCrouch(true);
      if (e.code === 'KeyX') this._setCrouch(false);
      if (e.code === 'Space') { e.preventDefault(); this.moveUp(); }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') { e.preventDefault(); this.moveDown(); }
      if (e.code === 'KeyZ') this.detach();
    };

    this._onKeyUp = (/** @type {KeyboardEvent} */ e) => {
      const key = e.key.toLowerCase();
      if (key in this.keys) this.keys[key] = false;
    };

    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup',   this._onKeyUp);

    // -- Mouse look -----------------------------------------------------------
    this._onMouseMove = (/** @type {MouseEvent} */ e) => {
      if (!this.isPointerLocked) return;
      this.rotation.yaw   -= e.movementX * this.lookSpeed;
      this.rotation.pitch -= e.movementY * this.lookSpeed;
      this.rotation.pitch  = THREE.MathUtils.clamp(this.rotation.pitch, -PITCH_LIMIT, PITCH_LIMIT);
    };

    document.addEventListener('mousemove', this._onMouseMove);

    // -- Pointer lock ---------------------------------------------------------
    this._onPointerLockChange = () => {
      this.isPointerLocked = (document.pointerLockElement === document.body);
    };

    document.addEventListener('pointerlockchange', this._onPointerLockChange);
  }

  requestPointerLock(element) {
    const el = element || document.body;
    el.requestPointerLock?.();
  }

  // -----------------------------------------------------------------------
  // Update loop
  // -----------------------------------------------------------------------

  update(deltaTime) {
    if (this.canMove) {
      this._applyMovement(deltaTime);
    }

    // Effective Y = surfaceOffset (can be negative to embed into surfaces)
    const effectiveY = this.surfaceOffset;

    // Sync character mesh to player position / yaw
    this.character.setPosition(this.position.x, effectiveY, this.position.z);
    this.character.setRotation(this.rotation.yaw + Math.PI);

    // Update camera
    if (this.isThirdPerson) {
      this._updateThirdPerson(effectiveY);
    } else {
      this._updateFirstPerson(effectiveY);
    }
  }

  // -----------------------------------------------------------------------
  // Crouch / Climb / Surface Embedding
  // -----------------------------------------------------------------------

  _setCrouch(crouch) {
    this.isCrouching = crouch;
    this.moveSpeed   = crouch ? CROUCH_SPEED : NORMAL_SPEED;

    if (this.character) {
      this.character.setPose(crouch ? 'crouching' : 'standing');
    }
  }

  _climb() {
    // Climb: move surfaceOffset upward (press Space repeatedly to go higher)
    this.surfaceOffset = Math.min(this.surfaceOffset + SURFACE_EMBED_STEP * 2, 3.0);
  }

  /** Move body upward into surfaces (embedding). */
  moveUp() {
    this.surfaceOffset = Math.min(this.surfaceOffset + SURFACE_EMBED_STEP, 2.0);
  }

  /** Move body downward into surfaces (embedding). */
  moveDown() {
    this.surfaceOffset = Math.max(this.surfaceOffset - SURFACE_EMBED_STEP, -1.5);
  }

  /** Detach from surface (reset Y offset to 0). */
  detach() {
    this.surfaceOffset = 0;
  }

  // -----------------------------------------------------------------------
  // Movement
  // -----------------------------------------------------------------------

  _applyMovement(dt) {
    this._moveDir.set(0, 0, 0);

    if (this.keys.w) this._moveDir.z -= 1;
    if (this.keys.s) this._moveDir.z += 1;
    if (this.keys.a) this._moveDir.x -= 1;
    if (this.keys.d) this._moveDir.x += 1;

    if (this._moveDir.lengthSq() === 0) return;
    this._moveDir.normalize();

    const sinY = Math.sin(this.rotation.yaw);
    const cosY = Math.cos(this.rotation.yaw);
    const mx = this._moveDir.x * cosY - this._moveDir.z * sinY;
    const mz = this._moveDir.x * sinY + this._moveDir.z * cosY;

    const speed = this.moveSpeed * dt;
    this._desiredPos.copy(this.position);
    this._desiredPos.x += mx * speed;
    this._desiredPos.z += mz * speed;
    this._desiredPos.y = 0;

    // AABB collision
    if (!this._collidesAt(this._desiredPos.x, this._desiredPos.z)) {
      this.position.copy(this._desiredPos);
    } else {
      if (!this._collidesAt(this._desiredPos.x, this.position.z)) {
        this.position.x = this._desiredPos.x;
      }
      if (!this._collidesAt(this.position.x, this._desiredPos.z)) {
        this.position.z = this._desiredPos.z;
      }
    }

    // Clamp to room bounds
    this.position.x = THREE.MathUtils.clamp(this.position.x, this.bounds.minX, this.bounds.maxX);
    this.position.z = THREE.MathUtils.clamp(this.position.z, this.bounds.minZ, this.bounds.maxZ);
  }

  _collidesAt(x, z) {
    const h = this.isCrouching ? CROUCH_HEIGHT : PLAYER_HEIGHT;
    this._playerBox.min.set(x - PLAYER_HALF_WIDTH, 0, z - PLAYER_HALF_WIDTH);
    this._playerBox.max.set(x + PLAYER_HALF_WIDTH, h, z + PLAYER_HALF_WIDTH);

    for (const col of this.colliders) {
      this._colliderBox.setFromObject(col);
      if (this._playerBox.intersectsBox(this._colliderBox)) return true;
    }
    return false;
  }

  // -----------------------------------------------------------------------
  // Camera modes
  // -----------------------------------------------------------------------

  _updateFirstPerson(baseY = 0) {
    const headY = baseY + 1.55;
    this.camera.position.set(this.position.x, headY, this.position.z);

    const lookX = this.position.x + Math.sin(this.rotation.yaw)   * Math.cos(this.rotation.pitch) * -1;
    const lookY = headY           + Math.sin(this.rotation.pitch);
    const lookZ = this.position.z + Math.cos(this.rotation.yaw)   * Math.cos(this.rotation.pitch) * -1;

    this.camera.lookAt(lookX, lookY, lookZ);
    this.character.group.visible = false;
  }

  _updateThirdPerson(baseY = 0) {
    this.character.group.visible = true;

    const focusY    = baseY + 1.0;
    const pitchOff  = Math.sin(this.rotation.pitch) * this.thirdPersonDistance;
    const horizDist = Math.cos(this.rotation.pitch) * this.thirdPersonDistance;

    const camX = this.position.x + Math.sin(this.rotation.yaw) * horizDist;
    const camY = focusY + this.thirdPersonHeight + pitchOff;
    const camZ = this.position.z + Math.cos(this.rotation.yaw) * horizDist;

    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(this.position.x, focusY, this.position.z);
  }

  // -----------------------------------------------------------------------
  // Public helpers
  // -----------------------------------------------------------------------

  /** Set camera perspective by role: hiders = third-person, hunters = first-person. */
  setFirstPerson(fps) {
    this.isThirdPerson = !fps;
  }

  toggleCamera() {
    this.isThirdPerson = !this.isThirdPerson;
  }

  setCanMove(canMove) {
    this.canMove = canMove;
    if (!canMove) {
      this.keys.w = false;
      this.keys.a = false;
      this.keys.s = false;
      this.keys.d = false;
    }
  }

  getPosition() {
    return { x: this.position.x, y: this.position.y, z: this.position.z };
  }

  getRotation() {
    return this.rotation.yaw;
  }

  setPosition(x, y, z) {
    this.position.set(x, y, z);
  }

  setBounds(minX, maxX, minZ, maxZ) {
    this.bounds = { minX, maxX, minZ, maxZ };
  }

  // -----------------------------------------------------------------------
  // Cleanup
  // -----------------------------------------------------------------------

  dispose() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup',   this._onKeyUp);
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('pointerlockchange', this._onPointerLockChange);
  }
}
