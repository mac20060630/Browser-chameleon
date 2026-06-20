import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

// ---------------------------------------------------------------------------
// Pose library — maps body-part names to local position / rotation overrides
// ---------------------------------------------------------------------------
const POSES = {
  'standing': {
    head:      { position: { x: 0, y: 1.55, z: 0 },      rotation: { x: 0, y: 0, z: 0 } },
    torso:     { position: { x: 0, y: 0.95, z: 0 },       rotation: { x: 0, y: 0, z: 0 } },
    leftArm:   { position: { x: -0.42, y: 1.05, z: 0 },   rotation: { x: 0, y: 0, z: -0.15 } },
    rightArm:  { position: { x: 0.42, y: 1.05, z: 0 },    rotation: { x: 0, y: 0, z: 0.15 } },
    leftLeg:   { position: { x: -0.2, y: 0.35, z: 0 },    rotation: { x: 0, y: 0, z: 0 } },
    rightLeg:  { position: { x: 0.2, y: 0.35, z: 0 },     rotation: { x: 0, y: 0, z: 0 } },
  },

  'relaxed': {
    head:      { position: { x: 0, y: 1.6, z: 0 },       rotation: { x: 0.05, y: 0, z: 0 } },
    torso:     { position: { x: 0, y: 0.95, z: 0 },      rotation: { x: 0.03, y: 0, z: 0 } },
    leftArm:   { position: { x: -0.45, y: 0.95, z: 0.05 },rotation: { x: 0.15, y: 0, z: 0.25 } },
    rightArm:  { position: { x: 0.45, y: 0.95, z: 0.05 }, rotation: { x: 0.15, y: 0, z: -0.25 } },
    leftLeg:   { position: { x: -0.18, y: 0.35, z: 0 },  rotation: { x: 0, y: 0, z: 0 } },
    rightLeg:  { position: { x: 0.18, y: 0.35, z: 0 },   rotation: { x: 0, y: 0, z: 0 } },
  },

  'running1': {
    head:      { position: { x: 0, y: 1.5, z: 0.15 },    rotation: { x: 0.2, y: 0, z: 0 } },
    torso:     { position: { x: 0, y: 0.9, z: 0.1 },      rotation: { x: 0.2, y: 0, z: 0 } },
    leftArm:   { position: { x: -0.42, y: 1.0, z: 0.3 },  rotation: { x: -1.0, y: 0, z: -0.15 } },
    rightArm:  { position: { x: 0.42, y: 1.0, z: -0.3 },  rotation: { x: 1.0, y: 0, z: 0.15 } },
    leftLeg:   { position: { x: -0.2, y: 0.35, z: 0.4 },  rotation: { x: -0.8, y: 0, z: 0 } },
    rightLeg:  { position: { x: 0.2, y: 0.35, z: -0.4 },  rotation: { x: 0.8, y: 0, z: 0 } },
  },

  'crouching': {
    head:      { position: { x: 0, y: 1.1, z: 0.15 },    rotation: { x: 0.2, y: 0, z: 0 } },
    torso:     { position: { x: 0, y: 0.7, z: 0.1 },     rotation: { x: 0.3, y: 0, z: 0 } },
    leftArm:   { position: { x: -0.45, y: 0.65, z: 0.15 },rotation: { x: 0.4, y: 0, z: 0.2 } },
    rightArm:  { position: { x: 0.45, y: 0.65, z: 0.15 }, rotation: { x: 0.4, y: 0, z: -0.2 } },
    leftLeg:   { position: { x: -0.2, y: 0.25, z: 0.15 }, rotation: { x: -0.8, y: 0, z: 0 } },
    rightLeg:  { position: { x: 0.2, y: 0.25, z: 0.15 },  rotation: { x: -0.8, y: 0, z: 0 } },
  },

  'running2': {
    head:      { position: { x: 0, y: 1.5, z: 0.15 },    rotation: { x: 0.2, y: 0, z: 0 } },
    torso:     { position: { x: 0, y: 0.9, z: 0.1 },      rotation: { x: 0.2, y: 0, z: 0 } },
    leftArm:   { position: { x: -0.42, y: 1.0, z: -0.3 }, rotation: { x: 1.0, y: 0, z: -0.15 } },
    rightArm:  { position: { x: 0.42, y: 1.0, z: 0.3 },   rotation: { x: -1.0, y: 0, z: 0.15 } },
    leftLeg:   { position: { x: -0.2, y: 0.35, z: -0.4 }, rotation: { x: 0.8, y: 0, z: 0 } },
    rightLeg:  { position: { x: 0.2, y: 0.35, z: 0.4 },   rotation: { x: -0.8, y: 0, z: 0 } },
  },

  'lying-flat': {
    head:      { position: { x: 0, y: 0.2, z: -0.85 },   rotation: { x: -Math.PI / 2, y: 0, z: 0 } },
    torso:     { position: { x: 0, y: 0.2, z: 0 },       rotation: { x: -Math.PI / 2, y: 0, z: 0 } },
    leftArm:   { position: { x: -0.5, y: 0.15, z: 0 },   rotation: { x: -Math.PI / 2, y: 0, z: 0 } },
    rightArm:  { position: { x: 0.5, y: 0.15, z: 0 },    rotation: { x: -Math.PI / 2, y: 0, z: 0 } },
    leftLeg:   { position: { x: -0.18, y: 0.15, z: 0.65 },rotation: { x: -Math.PI / 2, y: 0, z: 0 } },
    rightLeg:  { position: { x: 0.18, y: 0.15, z: 0.65 }, rotation: { x: -Math.PI / 2, y: 0, z: 0 } },
  },

  'stretched': {
    head:      { position: { x: 0, y: 1.75, z: 0 },      rotation: { x: -0.1, y: 0, z: 0 } },
    torso:     { position: { x: 0, y: 1.05, z: 0 },      rotation: { x: 0, y: 0, z: 0 } },
    leftArm:   { position: { x: -0.35, y: 1.45, z: 0 },  rotation: { x: 0, y: 0, z: -0.4 } },
    rightArm:  { position: { x: 0.35, y: 1.45, z: 0 },   rotation: { x: 0, y: 0, z: 0.4 } },
    leftLeg:   { position: { x: -0.15, y: 0.35, z: 0 },  rotation: { x: 0, y: 0, z: 0 } },
    rightLeg:  { position: { x: 0.15, y: 0.35, z: 0 },   rotation: { x: 0, y: 0, z: 0 } },
  },

  'fetal': {
    head:      { position: { x: 0, y: 0.55, z: -0.15 },  rotation: { x: 0.6, y: 0, z: 0 } },
    torso:     { position: { x: 0, y: 0.35, z: 0 },      rotation: { x: 0.8, y: 0, z: 0 } },
    leftArm:   { position: { x: -0.25, y: 0.45, z: -0.2 },rotation: { x: 1.2, y: 0, z: 0.3 } },
    rightArm:  { position: { x: 0.25, y: 0.45, z: -0.2 }, rotation: { x: 1.2, y: 0, z: -0.3 } },
    leftLeg:   { position: { x: -0.15, y: 0.2, z: -0.2 }, rotation: { x: -1.5, y: 0, z: 0 } },
    rightLeg:  { position: { x: 0.15, y: 0.2, z: -0.2 },  rotation: { x: -1.5, y: 0, z: 0 } },
  },

  'wall-lean': {
    head:      { position: { x: 0, y: 1.55, z: -0.15 },  rotation: { x: 0.1, y: 0, z: 0.05 } },
    torso:     { position: { x: 0, y: 0.9, z: -0.12 },   rotation: { x: -0.15, y: 0, z: 0 } },
    leftArm:   { position: { x: -0.45, y: 0.85, z: -0.1 },rotation: { x: 0.2, y: 0, z: 0.4 } },
    rightArm:  { position: { x: 0.45, y: 0.85, z: -0.1 }, rotation: { x: -0.2, y: 0, z: -0.15 } },
    leftLeg:   { position: { x: -0.2, y: 0.35, z: 0.15 }, rotation: { x: 0.2, y: 0, z: 0 } },
    rightLeg:  { position: { x: 0.2, y: 0.35, z: -0.05 }, rotation: { x: -0.15, y: 0, z: 0 } },
  },

  'sitting': {
    head:      { position: { x: 0, y: 1.25, z: 0 },      rotation: { x: 0, y: 0, z: 0 } },
    torso:     { position: { x: 0, y: 0.7, z: 0 },       rotation: { x: 0, y: 0, z: 0 } },
    leftArm:   { position: { x: -0.45, y: 0.65, z: 0 },  rotation: { x: 0.3, y: 0, z: 0.2 } },
    rightArm:  { position: { x: 0.45, y: 0.65, z: 0 },   rotation: { x: 0.3, y: 0, z: -0.2 } },
    leftLeg:   { position: { x: -0.2, y: 0.25, z: 0.25 },rotation: { x: -Math.PI / 2, y: 0, z: 0 } },
    rightLeg:  { position: { x: 0.2, y: 0.25, z: 0.25 }, rotation: { x: -Math.PI / 2, y: 0, z: 0 } },
  },

  'star': {
    head:      { position: { x: 0, y: 1.7, z: 0 },       rotation: { x: 0, y: 0, z: 0 } },
    torso:     { position: { x: 0, y: 1.0, z: 0 },       rotation: { x: 0, y: 0, z: 0 } },
    leftArm:   { position: { x: -0.65, y: 1.15, z: 0 },  rotation: { x: 0, y: 0, z: -0.8 } },
    rightArm:  { position: { x: 0.65, y: 1.15, z: 0 },   rotation: { x: 0, y: 0, z: 0.8 } },
    leftLeg:   { position: { x: -0.35, y: 0.32, z: 0 },  rotation: { x: 0, y: 0, z: 0.35 } },
    rightLeg:  { position: { x: 0.35, y: 0.32, z: 0 },   rotation: { x: 0, y: 0, z: -0.35 } },
  },

  'ball': {
    head:      { position: { x: 0, y: 0.5, z: -0.1 },    rotation: { x: 0.9, y: 0, z: 0 } },
    torso:     { position: { x: 0, y: 0.3, z: 0 },       rotation: { x: 1.0, y: 0, z: 0 } },
    leftArm:   { position: { x: -0.2, y: 0.35, z: -0.25 },rotation: { x: 1.5, y: 0, z: 0.5 } },
    rightArm:  { position: { x: 0.2, y: 0.35, z: -0.25 }, rotation: { x: 1.5, y: 0, z: -0.5 } },
    leftLeg:   { position: { x: -0.12, y: 0.15, z: -0.2 },rotation: { x: -1.8, y: 0, z: 0 } },
    rightLeg:  { position: { x: 0.12, y: 0.15, z: -0.2 }, rotation: { x: -1.8, y: 0, z: 0 } },
  },

  't-pose': {
    head:      { position: { x: 0, y: 1.65, z: 0 },      rotation: { x: 0, y: 0, z: 0 } },
    torso:     { position: { x: 0, y: 1.0, z: 0 },       rotation: { x: 0, y: 0, z: 0 } },
    leftArm:   { position: { x: -0.65, y: 1.05, z: 0 },  rotation: { x: 0, y: 0, z: -Math.PI / 2 } },
    rightArm:  { position: { x: 0.65, y: 1.05, z: 0 },   rotation: { x: 0, y: 0, z: Math.PI / 2 } },
    leftLeg:   { position: { x: -0.18, y: 0.35, z: 0 },  rotation: { x: 0, y: 0, z: 0 } },
    rightLeg:  { position: { x: 0.18, y: 0.35, z: 0 },   rotation: { x: 0, y: 0, z: 0 } },
  },

  'walking1': {
    head:      { position: { x: 0, y: 1.55, z: 0 },      rotation: { x: 0, y: 0, z: 0 } },
    torso:     { position: { x: 0, y: 0.95, z: 0 },       rotation: { x: 0, y: 0, z: 0 } },
    leftArm:   { position: { x: -0.42, y: 1.05, z: 0.2 }, rotation: { x: -0.5, y: 0, z: -0.15 } },
    rightArm:  { position: { x: 0.42, y: 1.05, z: -0.2 }, rotation: { x: 0.5, y: 0, z: 0.15 } },
    leftLeg:   { position: { x: -0.2, y: 0.35, z: 0.3 },  rotation: { x: -0.4, y: 0, z: 0 } },
    rightLeg:  { position: { x: 0.2, y: 0.35, z: -0.3 },  rotation: { x: 0.4, y: 0, z: 0 } },
  },

  'prayer': {
    head:      { position: { x: 0, y: 1.6, z: 0 },       rotation: { x: 0.15, y: 0, z: 0 } },
    torso:     { position: { x: 0, y: 0.95, z: 0 },      rotation: { x: 0.05, y: 0, z: 0 } },
    leftArm:   { position: { x: -0.2, y: 0.95, z: -0.2 },rotation: { x: 0.9, y: 0, z: 0.4 } },
    rightArm:  { position: { x: 0.2, y: 0.95, z: -0.2 }, rotation: { x: 0.9, y: 0, z: -0.4 } },
    leftLeg:   { position: { x: -0.18, y: 0.35, z: 0 },  rotation: { x: 0, y: 0, z: 0 } },
    rightLeg:  { position: { x: 0.18, y: 0.35, z: 0 },   rotation: { x: 0, y: 0, z: 0 } },
  },
};

// ---------------------------------------------------------------------------
// Body-part blueprint definitions
// ---------------------------------------------------------------------------
const BODY_PART_DEFS = [
  { name: 'head',      type: 'sphere',   args: [0.42, 32, 32],               defaultPos: [0, 1.55, 0] },
  { name: 'torso',     type: 'capsule',  args: [0.38, 0.55, 32, 32],         defaultPos: [0, 0.95, 0] },
  { name: 'leftArm',   type: 'capsule',  args: [0.18, 0.45, 32, 32],         defaultPos: [-0.42, 1.05, 0] },
  { name: 'rightArm',  type: 'capsule',  args: [0.18, 0.45, 32, 32],         defaultPos: [0.42, 1.05, 0] },
  { name: 'leftLeg',   type: 'capsule',  args: [0.18, 0.4, 32, 32],          defaultPos: [-0.2, 0.35, 0] },
  { name: 'rightLeg',  type: 'capsule',  args: [0.18, 0.4, 32, 32],          defaultPos: [0.2, 0.35, 0] },
];

const UV_REGIONS = {
  head:     { u: 0,   v: 0.5, w: 1/3, h: 0.5 },
  torso:    { u: 1/3, v: 0.5, w: 1/3, h: 0.5 },
  leftArm:  { u: 2/3, v: 0.5, w: 1/3, h: 0.5 },
  rightArm: { u: 0,   v: 0,   w: 1/3, h: 0.5 },
  leftLeg:  { u: 1/3, v: 0,   w: 1/3, h: 0.5 },
  rightLeg: { u: 2/3, v: 0,   w: 1/3, h: 0.5 },
};

// ---------------------------------------------------------------------------
// CharacterModel (Unified Seamless Mesh)
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

    /** The single unified SkinnedMesh */
    this.skinnedMesh = null;
    /** The skeleton */
    this.skeleton = null;

    /** Unified canvas texture state */
    this.textureSize = 1024;
    this.canvas = null;
    this.context = null;
    this.texture = null;

    /** Current pose identifier. */
    this.currentPoseId = 'standing';
    this.isLocked = false;
    this.dirty = false;

    this._build();
  }

  // -----------------------------------------------------------------------
  // Construction
  // -----------------------------------------------------------------------

  _build() {
    const geometries = [];
    const bones = [];
    
    // Create root bone
    const rootBone = new THREE.Bone();
    rootBone.name = 'root';
    bones.push(rootBone);

    let boneIndex = 1;

    for (const def of BODY_PART_DEFS) {
      let geom = this._geometryFromDef(def);

      // Create a bone for this body part, child of the root bone.
      // We position the bone at the default position so its local rotation pivot
      // perfectly matches the original individual mesh center.
      const bone = new THREE.Bone();
      bone.name = def.name;
      bone.position.set(...def.defaultPos);
      rootBone.add(bone);
      bones.push(bone);

      // We must translate the geometry vertices to the defaultPos as well,
      // because in the bind pose, the mesh vertices are in world/character space.
      geom.translate(...def.defaultPos);

      // Apply the UV offset and scale to map into the unified atlas
      const region = UV_REGIONS[def.name];
      const uvAttr = geom.attributes.uv;
      for (let i = 0; i < uvAttr.count; i++) {
        const u = uvAttr.getX(i);
        const v = uvAttr.getY(i);
        uvAttr.setXY(i, u * region.w + region.u, v * region.h + region.v);
      }

      // Add skin indices and weights. This geometry is entirely controlled by this one bone.
      const posAttr = geom.attributes.position;
      const skinIndices = [];
      const skinWeights = [];
      for (let i = 0; i < posAttr.count; i++) {
        skinIndices.push(boneIndex, 0, 0, 0); // attached to this part's bone
        skinWeights.push(1, 0, 0, 0);         // 100% influence
      }
      geom.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
      geom.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

      geometries.push(geom);
      boneIndex++;
    }

    // Merge everything into one seamless geometry buffer
    const mergedGeom = BufferGeometryUtils.mergeGeometries(geometries, false);
    
    // We can compute vertex normals to smooth out the joins perfectly
    // mergedGeom.computeVertexNormals();

    this.skeleton = new THREE.Skeleton(bones);

    this._initUnifiedCanvas();

    this.material = new THREE.MeshStandardMaterial({
      map: this.texture,
      roughness: 0.8,
      metalness: 0.0,
      skinning: true // enable skeletal animation
    });

    this.skinnedMesh = new THREE.SkinnedMesh(mergedGeom, this.material);
    this.skinnedMesh.name = 'UnifiedBody';
    this.skinnedMesh.add(rootBone); // Must add skeleton root to the scene graph
    this.skinnedMesh.bind(this.skeleton);
    
    this.skinnedMesh.castShadow = true;
    this.skinnedMesh.receiveShadow = true;

    this.group.add(this.skinnedMesh);

    // Default pose
    this.setPose('standing');
  }

  _geometryFromDef(def) {
    switch (def.type) {
      case 'sphere':   return new THREE.SphereGeometry(...def.args);
      case 'box':      return new THREE.BoxGeometry(...def.args);
      case 'cylinder': return new THREE.CylinderGeometry(...def.args);
      case 'capsule':  return new THREE.CapsuleGeometry(...def.args);
      default:         return new THREE.BoxGeometry(0.2, 0.2, 0.2);
    }
  }

  _initUnifiedCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.textureSize;
    this.canvas.height = this.textureSize;

    this.context = this.canvas.getContext('2d', { willReadFrequently: true });
    this.context.fillStyle = '#ffffff';
    this.context.fillRect(0, 0, this.textureSize, this.textureSize);

    // Draw the smiley face on the head region
    const hReg = UV_REGIONS.head;
    const hx = hReg.u * this.textureSize;
    const hy = (1.0 - hReg.v - hReg.h) * this.textureSize; // canvas Y is inverted vs UV V
    const hw = hReg.w * this.textureSize;
    const hh = hReg.h * this.textureSize;
    
    const cx = hx + hw / 2;
    const cy = hy + hh / 2;

    this.context.fillStyle = '#222222';
    this.context.beginPath();
    this.context.arc(cx - hw * 0.18, cy - hh * 0.12, hw * 0.06, 0, Math.PI * 2);
    this.context.fill();
    this.context.beginPath();
    this.context.arc(cx + hw * 0.18, cy - hh * 0.12, hw * 0.06, 0, Math.PI * 2);
    this.context.fill();

    this.context.strokeStyle = '#222222';
    this.context.lineWidth = hw * 0.045;
    this.context.lineCap = 'round';
    this.context.beginPath();
    this.context.arc(cx, cy - hh * 0.04, hw * 0.2, 0.2, Math.PI - 0.2);
    this.context.stroke();

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.needsUpdate = true;
  }

  // -----------------------------------------------------------------------
  // Paint API
  // -----------------------------------------------------------------------

  /**
   * Paint directly at the specified unified UV coordinates
   */
  paintAtUnified(u, v, color, brushSize) {
    const x = u * this.textureSize;
    const y = (1 - v) * this.textureSize;

    this.context.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
    this.context.beginPath();
    this.context.arc(x, y, brushSize, 0, Math.PI * 2);
    this.context.fill();

    this.texture.needsUpdate = true;
    this.dirty = true;
  }

  /**
   * Used for 'fill tool' over the entire body
   */
  fillAll(color) {
    this.context.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
    this.context.fillRect(0, 0, this.textureSize, this.textureSize);
    this.texture.needsUpdate = true;
    this.dirty = true;
  }

  setMaterialProperty(property, value) {
    if (property in this.material) {
      this.material[property] = value;
      this.material.needsUpdate = true;
    }
  }

  setBottomShadow(active) {
    if (active && !this._shadowTexture) {
      const canvas = document.createElement('canvas');
      canvas.width = 4;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      const grad = ctx.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.6, '#ffffff');
      grad.addColorStop(1, '#444444');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 4, 256);
      this._shadowTexture = new THREE.CanvasTexture(canvas);
      this._shadowTexture.needsUpdate = true;
    }

    if (active) {
      this.material.aoMap = this._shadowTexture;
      this.material.aoMapIntensity = 1.0;
    } else {
      this.material.aoMap = null;
      this.material.aoMapIntensity = 0.0;
    }
    this.material.needsUpdate = true;
  }

  // -----------------------------------------------------------------------
  // Undo / Redo helpers
  // -----------------------------------------------------------------------

  getUndoState() {
    return this.context.getImageData(0, 0, this.textureSize, this.textureSize);
  }

  restoreState(imageData) {
    this.context.putImageData(imageData, 0, 0);
    this.texture.needsUpdate = true;
    this.dirty = true;
  }

  // -----------------------------------------------------------------------
  // Pose system
  // -----------------------------------------------------------------------

  setPose(poseId) {
    if (this.isLocked) return;
    const pose = POSES[poseId];
    if (!pose) {
      console.warn(`CharacterModel: unknown pose "${poseId}"`);
      return;
    }

    for (const [partName, transform] of Object.entries(pose)) {
      const bone = this.skeleton.getBoneByName(partName);
      if (!bone) continue;
      
      // The bone is parented to the root. Its default position is def.defaultPos.
      // The POSES object defines absolute positions/rotations relative to the character.
      // Since our bones are direct children of the root at their defaultPos,
      // we must set their position and rotation to match the target.
      bone.position.set(transform.position.x, transform.position.y, transform.position.z);
      bone.rotation.set(transform.rotation.x, transform.rotation.y, transform.rotation.z);
    }

    this.currentPoseId = poseId;
  }

  previewPose(poseId) {
    this.setPose(poseId);
  }

  lockPose() {
    this.isLocked = true;
  }

  unlockPose() {
    this.isLocked = false;
  }

  // -----------------------------------------------------------------------
  // Serialization (networking)
  // -----------------------------------------------------------------------

  serializePaintData(onlyDirty = false) {
    if (onlyDirty && !this.dirty) return null;
    
    // We only have one canvas now, so we serialize it as 'unified'
    const data = {
      unified: this.canvas.toDataURL('image/png')
    };

    if (onlyDirty) this.dirty = false;
    return data;
  }

  async deserializePaintData(data) {
    if (!data.unified) return;

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.context.clearRect(0, 0, this.textureSize, this.textureSize);
        this.context.drawImage(img, 0, 0, this.textureSize, this.textureSize);
        this.texture.needsUpdate = true;
        resolve();
      };
      img.onerror = resolve;
      img.src = data.unified;
    });
  }

  // -----------------------------------------------------------------------
  // Scene management
  // -----------------------------------------------------------------------

  addToScene() {
    if (!this.group.parent) {
      this.scene.add(this.group);
    }
  }

  removeFromScene() {
    if (this.group.parent) {
      this.scene.remove(this.group);
    }
  }

  setPosition(x, y, z) {
    this.group.position.set(x, y, z);
  }

  setRotation(y) {
    this.group.rotation.y = y;
  }

  dispose() {
    this.removeFromScene();
    this.skinnedMesh.geometry.dispose();
    this.material.map?.dispose();
    this.material.dispose();
  }
}

