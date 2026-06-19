/**
 * WeaponModel.js
 *
 * First-person paint gun model attached to the camera.
 * Built from Three.js primitives — no external assets needed.
 * Visible in first-person view; hidden in third-person.
 *
 * Features:
 *  • Idle bob animation
 *  • Walk sway based on WASD input
 *  • Paint color tip that changes to match selected color
 *  • Recoil animation on fire
 */
import * as THREE from 'three';

export class WeaponModel {
  /**
   * @param {THREE.PerspectiveCamera} camera
   * @param {THREE.Scene} scene
   */
  constructor(camera, scene) {
    this.camera = camera;
    this.scene = scene;

    /** Group attached to the camera for FPS view */
    this.group = new THREE.Group();

    /** Whether the weapon is currently visible */
    this.visible = false;

    /** Current paint color shown on tip */
    this.paintColor = new THREE.Color(0xff0000);

    // Animation state
    this._bobTime = 0;
    this._recoilT = 0;
    this._isWalking = false;
    this._recoilActive = false;

    // Base offset from camera (right, down, forward)
    this._baseOffset = new THREE.Vector3(0.28, -0.22, -0.5);

    this._build();

    // Add group to camera (not scene) so it moves with camera
    this.camera.add(this.group);
    this.group.visible = false;
  }

  // -------------------------------------------------------------------------
  // Build the paint gun from primitives
  // -------------------------------------------------------------------------

  _build() {
    const mat = (color, extra = {}) =>
      new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.4, ...extra });

    // ---- Body / Receiver ----
    const bodyMat = mat(0x2A2A2A);       // gunmetal dark
    const accentMat = mat(0x1A7A7A);     // teal accent
    const chromeMat = mat(0xAAAAAA, { roughness: 0.1, metalness: 0.95 });
    const rubberMat = mat(0x111111, { roughness: 0.95, metalness: 0.0 });

    // Main body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.35), bodyMat);
    body.position.set(0, 0, 0);
    this.group.add(body);

    // Top rail
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.025, 0.32), chromeMat);
    rail.position.set(0, 0.065, -0.01);
    this.group.add(rail);

    // Grip
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, 0.08), rubberMat);
    grip.position.set(0, -0.11, 0.08);
    grip.rotation.x = 0.18;
    this.group.add(grip);

    // Trigger guard
    const guardMat = mat(0x222222, { roughness: 0.8 });
    const guard = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.008, 6, 12, Math.PI), guardMat);
    guard.position.set(0, -0.04, 0.05);
    guard.rotation.set(Math.PI / 2, 0, 0);
    this.group.add(guard);

    // ---- Barrel ----
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.32, 12),
      chromeMat
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, -0.28);
    this.group.add(barrel);

    // Barrel shroud (outer)
    const shroud = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.038, 0.28, 12),
      accentMat
    );
    shroud.rotation.x = Math.PI / 2;
    shroud.position.set(0, 0.02, -0.25);
    this.group.add(shroud);

    // Barrel cooling slots (decorative boxes cut look)
    for (let i = 0; i < 5; i++) {
      const slot = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.012, 0.018),
        mat(0x0A0A0A)
      );
      slot.position.set(0, 0.058, -0.14 - i * 0.045);
      this.group.add(slot);
    }

    // ---- Paint tank / Canister ----
    const tankMat = mat(0xCC4400, { roughness: 0.6, metalness: 0.3 }); // orange
    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.2, 12),
      tankMat
    );
    tank.rotation.x = Math.PI / 2;
    tank.position.set(0, -0.01, 0.14);
    this.group.add(tank);

    // Tank cap
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.048, 0.048, 0.018, 12),
      chromeMat
    );
    cap.rotation.x = Math.PI / 2;
    cap.position.set(0, -0.01, 0.24);
    this.group.add(cap);

    // Second paint tank (green)
    const tank2Mat = mat(0x22AA44, { roughness: 0.6, metalness: 0.3 });
    const tank2 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.038, 0.16, 12),
      tank2Mat
    );
    tank2.rotation.x = Math.PI / 2;
    tank2.position.set(0.06, -0.02, 0.12);
    tank2.rotation.z = 0.2;
    this.group.add(tank2);

    // ---- Muzzle / Paint tip ----
    this._muzzleMat = mat(0xff0000, {
      roughness: 0.4,
      metalness: 0.1,
      emissive: 0xff0000,
      emissiveIntensity: 0.3,
    });
    const muzzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.025, 0.06, 12),
      this._muzzleMat
    );
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.set(0, 0.02, -0.43);
    this.group.add(muzzle);
    this._muzzle = muzzle;

    // ---- Paint drip decoration on barrel ----
    const dripColors = [0xff2222, 0x22aaff, 0xffcc22, 0x22ff88];
    dripColors.forEach((col, i) => {
      const drip = new THREE.Mesh(
        new THREE.SphereGeometry(0.008, 6, 6),
        mat(col, { roughness: 0.5, metalness: 0.0 })
      );
      drip.position.set(
        (i % 2 === 0 ? 1 : -1) * 0.025,
        -0.02,
        -0.15 - i * 0.05
      );
      this.group.add(drip);
    });

    // ---- Sight ----
    const sightMat = mat(0xDD4444, { roughness: 0.3, metalness: 0.8 });
    const sightBack = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.025, 0.012), sightMat);
    sightBack.position.set(0, 0.09, -0.01);
    this.group.add(sightBack);
    const sightFront = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.02, 0.01), sightMat);
    sightFront.position.set(0, 0.088, -0.32);
    this.group.add(sightFront);

    // ---- Position group at rest ----
    this.group.position.copy(this._baseOffset);
    this.group.rotation.set(0.05, -0.06, 0.0);

    // Make all children cast shadow and not receive (avoid self-shadow)
    this.group.traverse(child => {
      if (child.isMesh) {
        child.castShadow = false;
        child.receiveShadow = false;
        // Prevent weapon from depth-testing against world (always visible)
        child.renderOrder = 1;
        child.material.depthTest = false;
      }
    });
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /** Show weapon in first-person mode */
  show() {
    this.visible = true;
    this.group.visible = true;
  }

  /** Hide weapon */
  hide() {
    this.visible = false;
    this.group.visible = false;
  }

  /** Set the paint color shown on the muzzle tip */
  setPaintColor(r, g, b) {
    const hex = (r << 16) | (g << 8) | b;
    this.paintColor.setHex(hex);
    this._muzzleMat.color.setHex(hex);
    this._muzzleMat.emissive.setHex(hex);
    this._muzzleMat.needsUpdate = true;
  }

  /** Trigger recoil animation (call when firing) */
  triggerRecoil() {
    this._recoilT = 1.0;
    this._recoilActive = true;
  }

  /** Set walking state for sway animation */
  setWalking(isWalking) {
    this._isWalking = isWalking;
  }

  /**
   * Update animations — call every frame.
   * @param {number} deltaTime — seconds
   */
  update(deltaTime) {
    if (!this.visible) return;

    this._bobTime += deltaTime;

    // ---- Idle bob ----
    const bobFreq = this._isWalking ? 5.5 : 1.2;
    const bobAmpY = this._isWalking ? 0.012 : 0.004;
    const bobAmpX = this._isWalking ? 0.008 : 0.002;

    const bobY = Math.sin(this._bobTime * bobFreq) * bobAmpY;
    const bobX = Math.sin(this._bobTime * bobFreq * 0.5) * bobAmpX;

    // ---- Recoil ----
    let recoilZ = 0;
    let recoilRX = 0;
    if (this._recoilActive) {
      this._recoilT -= deltaTime * 8;
      if (this._recoilT <= 0) {
        this._recoilT = 0;
        this._recoilActive = false;
      }
      const rt = Math.sin(this._recoilT * Math.PI);
      recoilZ = rt * 0.06;
      recoilRX = rt * 0.08;
    }

    // ---- Apply ----
    this.group.position.set(
      this._baseOffset.x + bobX,
      this._baseOffset.y + bobY,
      this._baseOffset.z + recoilZ,
    );
    this.group.rotation.x = 0.05 + recoilRX;
  }

  /** Clean up resources */
  dispose() {
    this.camera.remove(this.group);
    this.group.traverse(child => {
      if (child.isMesh) {
        child.geometry.dispose();
        child.material.dispose();
      }
    });
  }
}
