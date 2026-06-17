/**
 * CharacterModel.js
 * 
 * Procedural 3D humanoid character built entirely from Three.js primitives.
 * Each body part has its own CanvasTexture for per-part painting.
 * Supports 12 predefined poses, undo/redo paint snapshots, and network serialization.
 * 
 * Cute, chunky proportions — total height ~2 units.
 */
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Pose library — maps body-part names to local position / rotation overrides
// ---------------------------------------------------------------------------
const POSES = {
  'standing': {
    head:      { position: { x: 0, y: 1.65, z: 0 },      rotation: { x: 0, y: 0, z: 0 } },
    torso:     { position: { x: 0, y: 1.0, z: 0 },        rotation: { x: 0, y: 0, z: 0 } },
    leftArm:   { position: { x: -0.5, y: 1.1, z: 0 },     rotation: { x: 0, y: 0, z: -0.15 } },
    rightArm:  { position: { x: 0.5, y: 1.1, z: 0 },      rotation: { x: 0, y: 0, z: 0.15 } },
    leftLeg:   { position: { x: -0.18, y: 0.35, z: 0 },   rotation: { x: 0, y: 0, z: 0 } },
    rightLeg:  { position: { x: 0.18, y: 0.35, z: 0 },    rotation: { x: 0, y: 0, z: 0 } },
    leftHand:  { position: { x: -0.5, y: 0.72, z: 0 },    rotation: { x: 0, y: 0, z: 0 } },
    rightHand: { position: { x: 0.5, y: 0.72, z: 0 },     rotation: { x: 0, y: 0, z: 0 } },
    leftFoot:  { position: { x: -0.18, y: 0.05, z: 0.03 },rotation: { x: 0, y: 0, z: 0 } },
    rightFoot: { position: { x: 0.18, y: 0.05, z: 0.03 }, rotation: { x: 0, y: 0, z: 0 } },
  },

  'relaxed': {
    head:      { position: { x: 0, y: 1.6, z: 0 },       rotation: { x: 0.05, y: 0, z: 0 } },
    torso:     { position: { x: 0, y: 0.95, z: 0 },      rotation: { x: 0.03, y: 0, z: 0 } },
    leftArm:   { position: { x: -0.45, y: 0.95, z: 0.05 },rotation: { x: 0.15, y: 0, z: 0.25 } },
    rightArm:  { position: { x: 0.45, y: 0.95, z: 0.05 }, rotation: { x: 0.15, y: 0, z: -0.25 } },
    leftLeg:   { position: { x: -0.18, y: 0.35, z: 0 },  rotation: { x: 0, y: 0, z: 0 } },
    rightLeg:  { position: { x: 0.18, y: 0.35, z: 0 },   rotation: { x: 0, y: 0, z: 0 } },
    leftHand:  { position: { x: -0.45, y: 0.55, z: 0.1 }, rotation: { x: 0, y: 0, z: 0 } },
    rightHand: { position: { x: 0.45, y: 0.55, z: 0.1 },  rotation: { x: 0, y: 0, z: 0 } },
    leftFoot:  { position: { x: -0.18, y: 0.05, z: 0.03 },rotation: { x: 0, y: 0, z: 0 } },
    rightFoot: { position: { x: 0.18, y: 0.05, z: 0.03 }, rotation: { x: 0, y: 0, z: 0 } },
  },

  'crouching': {
    head:      { position: { x: 0, y: 1.1, z: 0.15 },    rotation: { x: 0.2, y: 0, z: 0 } },
    torso:     { position: { x: 0, y: 0.7, z: 0.1 },     rotation: { x: 0.3, y: 0, z: 0 } },
    leftArm:   { position: { x: -0.45, y: 0.65, z: 0.15 },rotation: { x: 0.4, y: 0, z: 0.2 } },
    rightArm:  { position: { x: 0.45, y: 0.65, z: 0.15 }, rotation: { x: 0.4, y: 0, z: -0.2 } },
    leftLeg:   { position: { x: -0.2, y: 0.25, z: 0.15 }, rotation: { x: -0.8, y: 0, z: 0 } },
    rightLeg:  { position: { x: 0.2, y: 0.25, z: 0.15 },  rotation: { x: -0.8, y: 0, z: 0 } },
    leftHand:  { position: { x: -0.4, y: 0.35, z: 0.3 },  rotation: { x: 0, y: 0, z: 0 } },
    rightHand: { position: { x: 0.4, y: 0.35, z: 0.3 },   rotation: { x: 0, y: 0, z: 0 } },
    leftFoot:  { position: { x: -0.2, y: 0.05, z: 0.25 }, rotation: { x: 0, y: 0, z: 0 } },
    rightFoot: { position: { x: 0.2, y: 0.05, z: 0.25 },  rotation: { x: 0, y: 0, z: 0 } },
  },

  'lying-flat': {
    head:      { position: { x: 0, y: 0.2, z: -0.85 },   rotation: { x: -Math.PI / 2, y: 0, z: 0 } },
    torso:     { position: { x: 0, y: 0.2, z: 0 },       rotation: { x: -Math.PI / 2, y: 0, z: 0 } },
    leftArm:   { position: { x: -0.5, y: 0.15, z: 0 },   rotation: { x: -Math.PI / 2, y: 0, z: 0 } },
    rightArm:  { position: { x: 0.5, y: 0.15, z: 0 },    rotation: { x: -Math.PI / 2, y: 0, z: 0 } },
    leftLeg:   { position: { x: -0.18, y: 0.15, z: 0.65 },rotation: { x: -Math.PI / 2, y: 0, z: 0 } },
    rightLeg:  { position: { x: 0.18, y: 0.15, z: 0.65 }, rotation: { x: -Math.PI / 2, y: 0, z: 0 } },
    leftHand:  { position: { x: -0.5, y: 0.1, z: 0.4 },  rotation: { x: 0, y: 0, z: 0 } },
    rightHand: { position: { x: 0.5, y: 0.1, z: 0.4 },   rotation: { x: 0, y: 0, z: 0 } },
    leftFoot:  { position: { x: -0.18, y: 0.1, z: 1.0 },  rotation: { x: -Math.PI / 2, y: 0, z: 0 } },
    rightFoot: { position: { x: 0.18, y: 0.1, z: 1.0 },   rotation: { x: -Math.PI / 2, y: 0, z: 0 } },
  },

  'stretched': {
    head:      { position: { x: 0, y: 1.75, z: 0 },      rotation: { x: -0.1, y: 0, z: 0 } },
    torso:     { position: { x: 0, y: 1.05, z: 0 },      rotation: { x: 0, y: 0, z: 0 } },
    leftArm:   { position: { x: -0.35, y: 1.45, z: 0 },  rotation: { x: 0, y: 0, z: -0.4 } },
    rightArm:  { position: { x: 0.35, y: 1.45, z: 0 },   rotation: { x: 0, y: 0, z: 0.4 } },
    leftLeg:   { position: { x: -0.15, y: 0.35, z: 0 },  rotation: { x: 0, y: 0, z: 0 } },
    rightLeg:  { position: { x: 0.15, y: 0.35, z: 0 },   rotation: { x: 0, y: 0, z: 0 } },
    leftHand:  { position: { x: -0.35, y: 2.0, z: 0 },   rotation: { x: 0, y: 0, z: 0 } },
    rightHand: { position: { x: 0.35, y: 2.0, z: 0 },    rotation: { x: 0, y: 0, z: 0 } },
    leftFoot:  { position: { x: -0.15, y: 0.05, z: 0.03 },rotation: { x: 0, y: 0, z: 0 } },
    rightFoot: { position: { x: 0.15, y: 0.05, z: 0.03 }, rotation: { x: 0, y: 0, z: 0 } },
  },

  'fetal': {
    head:      { position: { x: 0, y: 0.55, z: -0.15 },  rotation: { x: 0.6, y: 0, z: 0 } },
    torso:     { position: { x: 0, y: 0.35, z: 0 },      rotation: { x: 0.8, y: 0, z: 0 } },
    leftArm:   { position: { x: -0.25, y: 0.45, z: -0.2 },rotation: { x: 1.2, y: 0, z: 0.3 } },
    rightArm:  { position: { x: 0.25, y: 0.45, z: -0.2 }, rotation: { x: 1.2, y: 0, z: -0.3 } },
    leftLeg:   { position: { x: -0.15, y: 0.2, z: -0.2 }, rotation: { x: -1.5, y: 0, z: 0 } },
    rightLeg:  { position: { x: 0.15, y: 0.2, z: -0.2 },  rotation: { x: -1.5, y: 0, z: 0 } },
    leftHand:  { position: { x: -0.15, y: 0.3, z: -0.35 },rotation: { x: 0, y: 0, z: 0 } },
    rightHand: { position: { x: 0.15, y: 0.3, z: -0.35 }, rotation: { x: 0, y: 0, z: 0 } },
    leftFoot:  { position: { x: -0.15, y: 0.1, z: -0.35 },rotation: { x: 0, y: 0, z: 0 } },
    rightFoot: { position: { x: 0.15, y: 0.1, z: -0.35 }, rotation: { x: 0, y: 0, z: 0 } },
  },

  'wall-lean': {
    head:      { position: { x: 0, y: 1.55, z: -0.15 },  rotation: { x: 0.1, y: 0, z: 0.05 } },
    torso:     { position: { x: 0, y: 0.9, z: -0.12 },   rotation: { x: -0.15, y: 0, z: 0 } },
    leftArm:   { position: { x: -0.45, y: 0.85, z: -0.1 },rotation: { x: 0.2, y: 0, z: 0.4 } },
    rightArm:  { position: { x: 0.45, y: 0.85, z: -0.1 }, rotation: { x: -0.2, y: 0, z: -0.15 } },
    leftLeg:   { position: { x: -0.2, y: 0.35, z: 0.15 }, rotation: { x: 0.2, y: 0, z: 0 } },
    rightLeg:  { position: { x: 0.2, y: 0.35, z: -0.05 }, rotation: { x: -0.15, y: 0, z: 0 } },
    leftHand:  { position: { x: -0.5, y: 0.5, z: 0 },    rotation: { x: 0, y: 0, z: 0 } },
    rightHand: { position: { x: 0.5, y: 0.55, z: -0.15 }, rotation: { x: 0, y: 0, z: 0 } },
    leftFoot:  { position: { x: -0.2, y: 0.05, z: 0.3 },  rotation: { x: 0, y: 0, z: 0 } },
    rightFoot: { position: { x: 0.2, y: 0.05, z: -0.05 }, rotation: { x: 0, y: 0, z: 0 } },
  },

  'sitting': {
    head:      { position: { x: 0, y: 1.25, z: 0 },      rotation: { x: 0, y: 0, z: 0 } },
    torso:     { position: { x: 0, y: 0.7, z: 0 },       rotation: { x: 0, y: 0, z: 0 } },
    leftArm:   { position: { x: -0.45, y: 0.65, z: 0 },  rotation: { x: 0.3, y: 0, z: 0.2 } },
    rightArm:  { position: { x: 0.45, y: 0.65, z: 0 },   rotation: { x: 0.3, y: 0, z: -0.2 } },
    leftLeg:   { position: { x: -0.2, y: 0.25, z: 0.25 },rotation: { x: -Math.PI / 2, y: 0, z: 0 } },
    rightLeg:  { position: { x: 0.2, y: 0.25, z: 0.25 }, rotation: { x: -Math.PI / 2, y: 0, z: 0 } },
    leftHand:  { position: { x: -0.45, y: 0.35, z: 0.15 },rotation: { x: 0, y: 0, z: 0 } },
    rightHand: { position: { x: 0.45, y: 0.35, z: 0.15 }, rotation: { x: 0, y: 0, z: 0 } },
    leftFoot:  { position: { x: -0.2, y: 0.05, z: 0.55 }, rotation: { x: 0, y: 0, z: 0 } },
    rightFoot: { position: { x: 0.2, y: 0.05, z: 0.55 },  rotation: { x: 0, y: 0, z: 0 } },
  },

  'star': {
    head:      { position: { x: 0, y: 1.7, z: 0 },       rotation: { x: 0, y: 0, z: 0 } },
    torso:     { position: { x: 0, y: 1.0, z: 0 },       rotation: { x: 0, y: 0, z: 0 } },
    leftArm:   { position: { x: -0.65, y: 1.15, z: 0 },  rotation: { x: 0, y: 0, z: -0.8 } },
    rightArm:  { position: { x: 0.65, y: 1.15, z: 0 },   rotation: { x: 0, y: 0, z: 0.8 } },
    leftLeg:   { position: { x: -0.35, y: 0.32, z: 0 },  rotation: { x: 0, y: 0, z: 0.35 } },
    rightLeg:  { position: { x: 0.35, y: 0.32, z: 0 },   rotation: { x: 0, y: 0, z: -0.35 } },
    leftHand:  { position: { x: -0.95, y: 1.3, z: 0 },   rotation: { x: 0, y: 0, z: 0 } },
    rightHand: { position: { x: 0.95, y: 1.3, z: 0 },    rotation: { x: 0, y: 0, z: 0 } },
    leftFoot:  { position: { x: -0.5, y: 0.05, z: 0.03 }, rotation: { x: 0, y: 0, z: 0 } },
    rightFoot: { position: { x: 0.5, y: 0.05, z: 0.03 },  rotation: { x: 0, y: 0, z: 0 } },
  },

  'ball': {
    head:      { position: { x: 0, y: 0.5, z: -0.1 },    rotation: { x: 0.9, y: 0, z: 0 } },
    torso:     { position: { x: 0, y: 0.3, z: 0 },       rotation: { x: 1.0, y: 0, z: 0 } },
    leftArm:   { position: { x: -0.2, y: 0.35, z: -0.25 },rotation: { x: 1.5, y: 0, z: 0.5 } },
    rightArm:  { position: { x: 0.2, y: 0.35, z: -0.25 }, rotation: { x: 1.5, y: 0, z: -0.5 } },
    leftLeg:   { position: { x: -0.12, y: 0.15, z: -0.2 },rotation: { x: -1.8, y: 0, z: 0 } },
    rightLeg:  { position: { x: 0.12, y: 0.15, z: -0.2 }, rotation: { x: -1.8, y: 0, z: 0 } },
    leftHand:  { position: { x: -0.1, y: 0.25, z: -0.4 }, rotation: { x: 0, y: 0, z: 0 } },
    rightHand: { position: { x: 0.1, y: 0.25, z: -0.4 },  rotation: { x: 0, y: 0, z: 0 } },
    leftFoot:  { position: { x: -0.1, y: 0.08, z: -0.35 },rotation: { x: 0.5, y: 0, z: 0 } },
    rightFoot: { position: { x: 0.1, y: 0.08, z: -0.35 }, rotation: { x: 0.5, y: 0, z: 0 } },
  },

  't-pose': {
    head:      { position: { x: 0, y: 1.65, z: 0 },      rotation: { x: 0, y: 0, z: 0 } },
    torso:     { position: { x: 0, y: 1.0, z: 0 },       rotation: { x: 0, y: 0, z: 0 } },
    leftArm:   { position: { x: -0.65, y: 1.05, z: 0 },  rotation: { x: 0, y: 0, z: -Math.PI / 2 } },
    rightArm:  { position: { x: 0.65, y: 1.05, z: 0 },   rotation: { x: 0, y: 0, z: Math.PI / 2 } },
    leftLeg:   { position: { x: -0.18, y: 0.35, z: 0 },  rotation: { x: 0, y: 0, z: 0 } },
    rightLeg:  { position: { x: 0.18, y: 0.35, z: 0 },   rotation: { x: 0, y: 0, z: 0 } },
    leftHand:  { position: { x: -1.0, y: 1.05, z: 0 },   rotation: { x: 0, y: 0, z: 0 } },
    rightHand: { position: { x: 1.0, y: 1.05, z: 0 },    rotation: { x: 0, y: 0, z: 0 } },
    leftFoot:  { position: { x: -0.18, y: 0.05, z: 0.03 },rotation: { x: 0, y: 0, z: 0 } },
    rightFoot: { position: { x: 0.18, y: 0.05, z: 0.03 }, rotation: { x: 0, y: 0, z: 0 } },
  },

  'prayer': {
    head:      { position: { x: 0, y: 1.6, z: 0 },       rotation: { x: 0.15, y: 0, z: 0 } },
    torso:     { position: { x: 0, y: 0.95, z: 0 },      rotation: { x: 0.05, y: 0, z: 0 } },
    leftArm:   { position: { x: -0.2, y: 0.95, z: -0.2 },rotation: { x: 0.9, y: 0, z: 0.4 } },
    rightArm:  { position: { x: 0.2, y: 0.95, z: -0.2 }, rotation: { x: 0.9, y: 0, z: -0.4 } },
    leftLeg:   { position: { x: -0.18, y: 0.35, z: 0 },  rotation: { x: 0, y: 0, z: 0 } },
    rightLeg:  { position: { x: 0.18, y: 0.35, z: 0 },   rotation: { x: 0, y: 0, z: 0 } },
    leftHand:  { position: { x: -0.02, y: 0.85, z: -0.4 },rotation: { x: 0, y: 0, z: 0 } },
    rightHand: { position: { x: 0.02, y: 0.85, z: -0.4 }, rotation: { x: 0, y: 0, z: 0 } },
    leftFoot:  { position: { x: -0.18, y: 0.05, z: 0.03 },rotation: { x: 0, y: 0, z: 0 } },
    rightFoot: { position: { x: 0.18, y: 0.05, z: 0.03 }, rotation: { x: 0, y: 0, z: 0 } },
  },
};

// ---------------------------------------------------------------------------
// Body-part blueprint definitions
// ---------------------------------------------------------------------------
const BODY_PART_DEFS = [
  { name: 'head',      type: 'sphere',   args: [0.35, 24, 24],               defaultPos: [0, 1.65, 0] },
  { name: 'torso',     type: 'box',      args: [0.7, 0.8, 0.4],             defaultPos: [0, 1.0, 0] },
  { name: 'leftArm',   type: 'cylinder', args: [0.12, 0.12, 0.6, 12],      defaultPos: [-0.5, 1.1, 0] },
  { name: 'rightArm',  type: 'cylinder', args: [0.12, 0.12, 0.6, 12],      defaultPos: [0.5, 1.1, 0] },
  { name: 'leftLeg',   type: 'cylinder', args: [0.14, 0.14, 0.6, 12],      defaultPos: [-0.18, 0.35, 0] },
  { name: 'rightLeg',  type: 'cylinder', args: [0.14, 0.14, 0.6, 12],      defaultPos: [0.18, 0.35, 0] },
  { name: 'leftHand',  type: 'sphere',   args: [0.1, 16, 16],               defaultPos: [-0.5, 0.72, 0] },
  { name: 'rightHand', type: 'sphere',   args: [0.1, 16, 16],               defaultPos: [0.5, 0.72, 0] },
  { name: 'leftFoot',  type: 'box',      args: [0.15, 0.1, 0.25],           defaultPos: [-0.18, 0.05, 0.03] },
  { name: 'rightFoot', type: 'box',      args: [0.15, 0.1, 0.25],           defaultPos: [0.18, 0.05, 0.03] },
];

// ---------------------------------------------------------------------------
// CharacterModel
// ---------------------------------------------------------------------------
export class CharacterModel {
  /**
   * @param {THREE.Scene} scene – The Three.js scene the character lives in.
   */
  constructor(scene) {
    /** @type {THREE.Scene} */
    this.scene = scene;

    /** Root group — move / rotate this to move the whole character. */
    this.group = new THREE.Group();
    this.group.name = 'CharacterModel';

    /** Individual body-part meshes keyed by name. */
    this.bodyParts = {};

    /** Per-part canvas textures: { canvas, context, texture }. */
    this.canvasTextures = {};

    /** Per-part MeshStandardMaterial instances. */
    this.materials = {};

    /** Resolution of each body-part canvas (square). */
    this.textureSize = 256;

    /** Current pose identifier. */
    this.currentPoseId = 'standing';

    /** When locked the character cannot change pose (hider locked in). */
    this.isLocked = false;

    /** Tracks which parts have been modified since last sync. */
    this.dirtyParts = new Set();

    this._build();
  }

  // -----------------------------------------------------------------------
  // Construction
  // -----------------------------------------------------------------------

  /** Assemble the full character from primitives. */
  _build() {
    for (const def of BODY_PART_DEFS) {
      this._createBodyPart(
        def.name,
        this._geometryFromDef(def),
        new THREE.Vector3(...def.defaultPos),
        new THREE.Euler(0, 0, 0),
      );
    }
    // Apply the default standing pose
    this.setPose('standing');
  }

  /**
   * Instantiate a geometry from a blueprint definition.
   * @param {{ type: string, args: number[] }} def
   * @returns {THREE.BufferGeometry}
   */
  _geometryFromDef(def) {
    switch (def.type) {
      case 'sphere':   return new THREE.SphereGeometry(...def.args);
      case 'box':      return new THREE.BoxGeometry(...def.args);
      case 'cylinder': return new THREE.CylinderGeometry(...def.args);
      default:         return new THREE.BoxGeometry(0.2, 0.2, 0.2);
    }
  }

  /**
   * Create a single body-part mesh with its own CanvasTexture.
   * @param {string} name       – e.g. 'head', 'leftArm'
   * @param {THREE.BufferGeometry} geometry
   * @param {THREE.Vector3} position
   * @param {THREE.Euler}   rotation
   */
  _createBodyPart(name, geometry, position, rotation) {
    const { canvas, context, texture } = this._initCanvasTexture(name);

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.8,
      metalness: 0.0,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.copy(position);
    mesh.rotation.copy(rotation);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    this.bodyParts[name] = mesh;
    this.canvasTextures[name] = { canvas, context, texture };
    this.materials[name] = material;
    this.group.add(mesh);
  }

  /**
   * Create a 2D canvas filled white, wrap it in a CanvasTexture.
   * @param {string} _name – unused, reserved for future per-part defaults
   * @returns {{ canvas: HTMLCanvasElement, context: CanvasRenderingContext2D, texture: THREE.CanvasTexture }}
   */
  _initCanvasTexture(_name) {
    const canvas = document.createElement('canvas');
    canvas.width = this.textureSize;
    canvas.height = this.textureSize;

    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, this.textureSize, this.textureSize);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;

    return { canvas, context, texture };
  }

  // -----------------------------------------------------------------------
  // Paint API
  // -----------------------------------------------------------------------

  /**
   * Retrieve the drawing surface for a body part.
   * @param {string} partName
   * @returns {{ canvas: HTMLCanvasElement, context: CanvasRenderingContext2D, texture: THREE.CanvasTexture } | null}
   */
  getCanvasForPart(partName) {
    return this.canvasTextures[partName] || null;
  }

  /**
   * Draw a filled circle on a body part's canvas at the given UV coordinates.
   * @param {string} partName
   * @param {number} u – 0‥1 horizontal
   * @param {number} v – 0‥1 vertical
   * @param {{ r: number, g: number, b: number }} color – 0‥255 per channel
   * @param {number} brushSize – radius in canvas pixels
   */
  paintAt(partName, u, v, color, brushSize) {
    const entry = this.canvasTextures[partName];
    if (!entry) return;

    const { context, texture } = entry;
    const x = u * this.textureSize;
    const y = (1 - v) * this.textureSize; // flip V — canvas Y is top-down

    context.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
    context.beginPath();
    context.arc(x, y, brushSize, 0, Math.PI * 2);
    context.fill();

    texture.needsUpdate = true;
    this.dirtyParts.add(partName);
  }

  /**
   * Fill an entire body part with a solid colour.
   * @param {string} partName
   * @param {{ r: number, g: number, b: number }} color
   */
  fillPart(partName, color) {
    const entry = this.canvasTextures[partName];
    if (!entry) return;

    const { context, texture } = entry;
    context.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
    context.fillRect(0, 0, this.textureSize, this.textureSize);

    texture.needsUpdate = true;
    this.dirtyParts.add(partName);
  }

  /**
   * Set a material property (metalness / roughness) on ALL body parts.
   * @param {'metalness' | 'roughness'} property
   * @param {number} value – 0‥1
   */
  setMaterialProperty(property, value) {
    for (const mat of Object.values(this.materials)) {
      if (property in mat) {
        mat[property] = value;
        mat.needsUpdate = true;
      }
    }
  }

  // -----------------------------------------------------------------------
  // Undo / Redo helpers (ImageData snapshots)
  // -----------------------------------------------------------------------

  /**
   * Snapshot the current state of every body-part canvas.
   * @returns {Record<string, ImageData>}
   */
  getUndoState() {
    const state = {};
    for (const [name, { context }] of Object.entries(this.canvasTextures)) {
      state[name] = context.getImageData(0, 0, this.textureSize, this.textureSize);
    }
    return state;
  }

  /**
   * Restore all canvases from a previously saved state.
   * @param {Record<string, ImageData>} state
   */
  restoreState(state) {
    for (const [name, imageData] of Object.entries(state)) {
      const entry = this.canvasTextures[name];
      if (!entry) continue;
      entry.context.putImageData(imageData, 0, 0);
      entry.texture.needsUpdate = true;
      this.dirtyParts.add(name);
    }
  }

  // -----------------------------------------------------------------------
  // Pose system
  // -----------------------------------------------------------------------

  /**
   * Apply a predefined pose.
   * @param {string} poseId – one of the POSES keys
   */
  setPose(poseId) {
    if (this.isLocked) return;
    const pose = POSES[poseId];
    if (!pose) {
      console.warn(`CharacterModel: unknown pose "${poseId}"`);
      return;
    }

    for (const [partName, transform] of Object.entries(pose)) {
      const mesh = this.bodyParts[partName];
      if (!mesh) continue;
      mesh.position.set(transform.position.x, transform.position.y, transform.position.z);
      mesh.rotation.set(transform.rotation.x, transform.rotation.y, transform.rotation.z);
    }

    this.currentPoseId = poseId;
  }

  /**
   * Preview a pose before locking it in.
   * @param {string} poseId
   */
  previewPose(poseId) {
    this.setPose(poseId);
  }

  /** Freeze the character so no further pose changes are allowed. */
  lockPose() {
    this.isLocked = true;
  }

  /** Unfreeze the character. */
  unlockPose() {
    this.isLocked = false;
  }

  // -----------------------------------------------------------------------
  // Serialization (networking)
  // -----------------------------------------------------------------------

  /**
   * Produce a compact representation of all paint data suitable for sending
   * over the network. Each body-part canvas is serialized as a base-64 PNG
   * data URL (small enough for WebRTC / WebSocket messages).
   * @param {boolean} onlyDirty - If true, only serializes modified parts and clears dirty flag.
   * @returns {Record<string, string>}
   */
  serializePaintData(onlyDirty = false) {
    const data = {};
    for (const [name, { canvas }] of Object.entries(this.canvasTextures)) {
      if (!onlyDirty || this.dirtyParts.has(name)) {
        data[name] = canvas.toDataURL('image/png');
      }
    }
    if (onlyDirty) {
      this.dirtyParts.clear();
    }
    return data;
  }

  /**
   * Apply paint from a network-received payload.
   * @param {Record<string, string>} data – partName ➜ data-URL
   * @returns {Promise<void>}
   */
  async deserializePaintData(data) {
    const promises = Object.entries(data).map(([name, dataUrl]) => {
      return new Promise((resolve) => {
        const entry = this.canvasTextures[name];
        if (!entry) { resolve(); return; }

        const img = new Image();
        img.onload = () => {
          entry.context.clearRect(0, 0, this.textureSize, this.textureSize);
          entry.context.drawImage(img, 0, 0, this.textureSize, this.textureSize);
          entry.texture.needsUpdate = true;
          resolve();
        };
        img.onerror = resolve; // fail silently
        img.src = dataUrl;
      });
    });

    await Promise.all(promises);
  }

  // -----------------------------------------------------------------------
  // Scene management
  // -----------------------------------------------------------------------

  /** Add the character group to the scene. */
  addToScene() {
    if (!this.group.parent) {
      this.scene.add(this.group);
    }
  }

  /** Remove the character group from the scene. */
  removeFromScene() {
    if (this.group.parent) {
      this.scene.remove(this.group);
    }
  }

  /**
   * Teleport the character to a world position.
   * @param {number} x
   * @param {number} y
   * @param {number} z
   */
  setPosition(x, y, z) {
    this.group.position.set(x, y, z);
  }

  /**
   * Rotate the character around the Y axis.
   * @param {number} y – radians
   */
  setRotation(y) {
    this.group.rotation.y = y;
  }

  /** Clean up all GPU resources. */
  dispose() {
    this.removeFromScene();

    for (const mesh of Object.values(this.bodyParts)) {
      mesh.geometry.dispose();
    }
    for (const mat of Object.values(this.materials)) {
      mat.map?.dispose();
      mat.dispose();
    }

    this.bodyParts = {};
    this.canvasTextures = {};
    this.materials = {};
  }
}
