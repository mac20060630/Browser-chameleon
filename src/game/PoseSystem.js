/**
 * PoseSystem — Manages predefined poses for the character model
 * Provides a library of poses and handles pose preview/locking
 */

/**
 * Pose definitions — each pose maps body part names to
 * position/rotation offsets relative to the default standing pose
 */
export const POSE_DEFINITIONS = {
  standing: {
    label: 'Standing',
    icon: '🧍',
    transforms: {
      head:      { position: { x: 0, y: 1.65, z: 0 },    rotation: { x: 0, y: 0, z: 0 } },
      torso:     { position: { x: 0, y: 1.0, z: 0 },     rotation: { x: 0, y: 0, z: 0 } },
      leftArm:   { position: { x: -0.5, y: 1.1, z: 0 },  rotation: { x: 0, y: 0, z: 0.2 } },
      rightArm:  { position: { x: 0.5, y: 1.1, z: 0 },   rotation: { x: 0, y: 0, z: -0.2 } },
      leftHand:  { position: { x: -0.55, y: 0.72, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      rightHand: { position: { x: 0.55, y: 0.72, z: 0 },  rotation: { x: 0, y: 0, z: 0 } },
      leftLeg:   { position: { x: -0.18, y: 0.3, z: 0 },  rotation: { x: 0, y: 0, z: 0 } },
      rightLeg:  { position: { x: 0.18, y: 0.3, z: 0 },   rotation: { x: 0, y: 0, z: 0 } },
      leftFoot:  { position: { x: -0.18, y: 0.05, z: 0.05 }, rotation: { x: 0, y: 0, z: 0 } },
      rightFoot: { position: { x: 0.18, y: 0.05, z: 0.05 },  rotation: { x: 0, y: 0, z: 0 } },
    },
  },

  relaxed: {
    label: 'Relaxed',
    icon: '😌',
    transforms: {
      head:      { position: { x: 0, y: 1.63, z: 0 },    rotation: { x: 0.05, y: 0, z: 0 } },
      torso:     { position: { x: 0, y: 1.0, z: 0 },     rotation: { x: 0, y: 0, z: 0 } },
      leftArm:   { position: { x: -0.45, y: 0.95, z: 0.05 },  rotation: { x: 0, y: 0, z: 0.5 } },
      rightArm:  { position: { x: 0.45, y: 0.95, z: 0.05 },   rotation: { x: 0, y: 0, z: -0.5 } },
      leftHand:  { position: { x: -0.42, y: 0.55, z: 0.1 },   rotation: { x: 0, y: 0, z: 0 } },
      rightHand: { position: { x: 0.42, y: 0.55, z: 0.1 },    rotation: { x: 0, y: 0, z: 0 } },
      leftLeg:   { position: { x: -0.18, y: 0.3, z: 0 },  rotation: { x: 0, y: 0, z: 0 } },
      rightLeg:  { position: { x: 0.18, y: 0.3, z: 0 },   rotation: { x: 0, y: 0, z: 0 } },
      leftFoot:  { position: { x: -0.18, y: 0.05, z: 0.05 }, rotation: { x: 0, y: 0, z: 0 } },
      rightFoot: { position: { x: 0.18, y: 0.05, z: 0.05 },  rotation: { x: 0, y: 0, z: 0 } },
    },
  },

  crouching: {
    label: 'Crouch',
    icon: '🦆',
    transforms: {
      head:      { position: { x: 0, y: 1.0, z: 0.15 },    rotation: { x: 0.2, y: 0, z: 0 } },
      torso:     { position: { x: 0, y: 0.65, z: 0.1 },    rotation: { x: 0.4, y: 0, z: 0 } },
      leftArm:   { position: { x: -0.4, y: 0.6, z: 0.2 },  rotation: { x: -0.5, y: 0, z: 0.3 } },
      rightArm:  { position: { x: 0.4, y: 0.6, z: 0.2 },   rotation: { x: -0.5, y: 0, z: -0.3 } },
      leftHand:  { position: { x: -0.35, y: 0.35, z: 0.3 }, rotation: { x: 0, y: 0, z: 0 } },
      rightHand: { position: { x: 0.35, y: 0.35, z: 0.3 },  rotation: { x: 0, y: 0, z: 0 } },
      leftLeg:   { position: { x: -0.2, y: 0.25, z: 0.15 }, rotation: { x: -1.2, y: 0, z: 0 } },
      rightLeg:  { position: { x: 0.2, y: 0.25, z: 0.15 },  rotation: { x: -1.2, y: 0, z: 0 } },
      leftFoot:  { position: { x: -0.2, y: 0.05, z: 0.3 },  rotation: { x: 0, y: 0, z: 0 } },
      rightFoot: { position: { x: 0.2, y: 0.05, z: 0.3 },   rotation: { x: 0, y: 0, z: 0 } },
    },
  },

  'lying-flat': {
    label: 'Lying',
    icon: '😴',
    transforms: {
      head:      { position: { x: 0, y: 0.2, z: -0.85 },   rotation: { x: -Math.PI / 2, y: 0, z: 0 } },
      torso:     { position: { x: 0, y: 0.2, z: 0 },       rotation: { x: -Math.PI / 2, y: 0, z: 0 } },
      leftArm:   { position: { x: -0.5, y: 0.2, z: 0.1 },  rotation: { x: -Math.PI / 2, y: 0, z: 0.2 } },
      rightArm:  { position: { x: 0.5, y: 0.2, z: 0.1 },   rotation: { x: -Math.PI / 2, y: 0, z: -0.2 } },
      leftHand:  { position: { x: -0.55, y: 0.2, z: 0.45 }, rotation: { x: 0, y: 0, z: 0 } },
      rightHand: { position: { x: 0.55, y: 0.2, z: 0.45 },  rotation: { x: 0, y: 0, z: 0 } },
      leftLeg:   { position: { x: -0.18, y: 0.18, z: 0.7 }, rotation: { x: -Math.PI / 2, y: 0, z: 0 } },
      rightLeg:  { position: { x: 0.18, y: 0.18, z: 0.7 },  rotation: { x: -Math.PI / 2, y: 0, z: 0 } },
      leftFoot:  { position: { x: -0.18, y: 0.18, z: 1.05 },rotation: { x: -Math.PI / 2, y: 0, z: 0 } },
      rightFoot: { position: { x: 0.18, y: 0.18, z: 1.05 }, rotation: { x: -Math.PI / 2, y: 0, z: 0 } },
    },
  },

  stretched: {
    label: 'Stretch',
    icon: '🙆',
    transforms: {
      head:      { position: { x: 0, y: 1.7, z: 0 },    rotation: { x: -0.1, y: 0, z: 0 } },
      torso:     { position: { x: 0, y: 1.05, z: 0 },    rotation: { x: 0, y: 0, z: 0 } },
      leftArm:   { position: { x: -0.15, y: 1.55, z: 0 },rotation: { x: 0, y: 0, z: -3.0 } },
      rightArm:  { position: { x: 0.15, y: 1.55, z: 0 }, rotation: { x: 0, y: 0, z: 3.0 } },
      leftHand:  { position: { x: -0.1, y: 2.0, z: 0 },  rotation: { x: 0, y: 0, z: 0 } },
      rightHand: { position: { x: 0.1, y: 2.0, z: 0 },   rotation: { x: 0, y: 0, z: 0 } },
      leftLeg:   { position: { x: -0.12, y: 0.3, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      rightLeg:  { position: { x: 0.12, y: 0.3, z: 0 },  rotation: { x: 0, y: 0, z: 0 } },
      leftFoot:  { position: { x: -0.12, y: 0.05, z: 0.05 },rotation: { x: 0, y: 0, z: 0 } },
      rightFoot: { position: { x: 0.12, y: 0.05, z: 0.05 }, rotation: { x: 0, y: 0, z: 0 } },
    },
  },

  fetal: {
    label: 'Fetal',
    icon: '🫧',
    transforms: {
      head:      { position: { x: 0, y: 0.55, z: 0.25 },   rotation: { x: 0.8, y: 0, z: 0 } },
      torso:     { position: { x: 0, y: 0.35, z: 0 },      rotation: { x: 0.6, y: 0, z: 0 } },
      leftArm:   { position: { x: -0.25, y: 0.35, z: 0.25 },rotation: { x: -1.2, y: 0, z: 0.5 } },
      rightArm:  { position: { x: 0.25, y: 0.35, z: 0.25 }, rotation: { x: -1.2, y: 0, z: -0.5 } },
      leftHand:  { position: { x: -0.15, y: 0.3, z: 0.45 }, rotation: { x: 0, y: 0, z: 0 } },
      rightHand: { position: { x: 0.15, y: 0.3, z: 0.45 },  rotation: { x: 0, y: 0, z: 0 } },
      leftLeg:   { position: { x: -0.15, y: 0.18, z: 0.2 }, rotation: { x: -1.5, y: 0, z: 0 } },
      rightLeg:  { position: { x: 0.15, y: 0.18, z: 0.2 },  rotation: { x: -1.5, y: 0, z: 0 } },
      leftFoot:  { position: { x: -0.15, y: 0.1, z: 0.45 }, rotation: { x: -0.5, y: 0, z: 0 } },
      rightFoot: { position: { x: 0.15, y: 0.1, z: 0.45 },  rotation: { x: -0.5, y: 0, z: 0 } },
    },
  },

  'wall-lean': {
    label: 'Lean',
    icon: '🫂',
    transforms: {
      head:      { position: { x: 0, y: 1.6, z: -0.15 },  rotation: { x: 0, y: 0.2, z: 0.1 } },
      torso:     { position: { x: 0, y: 0.95, z: -0.12 }, rotation: { x: -0.15, y: 0, z: 0.05 } },
      leftArm:   { position: { x: -0.5, y: 0.95, z: -0.05 },rotation: { x: 0, y: 0, z: 0.4 } },
      rightArm:  { position: { x: 0.5, y: 1.0, z: -0.1 },  rotation: { x: 0, y: 0, z: -0.3 } },
      leftHand:  { position: { x: -0.5, y: 0.55, z: 0 },    rotation: { x: 0, y: 0, z: 0 } },
      rightHand: { position: { x: 0.5, y: 0.65, z: -0.1 },  rotation: { x: 0, y: 0, z: 0 } },
      leftLeg:   { position: { x: -0.2, y: 0.3, z: 0.1 },   rotation: { x: 0, y: 0, z: 0 } },
      rightLeg:  { position: { x: 0.22, y: 0.3, z: -0.05 }, rotation: { x: -0.2, y: 0, z: 0 } },
      leftFoot:  { position: { x: -0.2, y: 0.05, z: 0.15 }, rotation: { x: 0, y: 0, z: 0 } },
      rightFoot: { position: { x: 0.22, y: 0.05, z: 0.0 },  rotation: { x: 0, y: 0, z: 0 } },
    },
  },

  sitting: {
    label: 'Sitting',
    icon: '🪑',
    transforms: {
      head:      { position: { x: 0, y: 1.15, z: 0 },     rotation: { x: 0, y: 0, z: 0 } },
      torso:     { position: { x: 0, y: 0.65, z: 0 },     rotation: { x: 0, y: 0, z: 0 } },
      leftArm:   { position: { x: -0.45, y: 0.6, z: 0.1 },rotation: { x: -0.8, y: 0, z: 0.3 } },
      rightArm:  { position: { x: 0.45, y: 0.6, z: 0.1 }, rotation: { x: -0.8, y: 0, z: -0.3 } },
      leftHand:  { position: { x: -0.3, y: 0.45, z: 0.3 },rotation: { x: 0, y: 0, z: 0 } },
      rightHand: { position: { x: 0.3, y: 0.45, z: 0.3 }, rotation: { x: 0, y: 0, z: 0 } },
      leftLeg:   { position: { x: -0.2, y: 0.3, z: 0.2 }, rotation: { x: -1.4, y: 0, z: 0 } },
      rightLeg:  { position: { x: 0.2, y: 0.3, z: 0.2 },  rotation: { x: -1.4, y: 0, z: 0 } },
      leftFoot:  { position: { x: -0.2, y: 0.05, z: 0.5 },rotation: { x: 0, y: 0, z: 0 } },
      rightFoot: { position: { x: 0.2, y: 0.05, z: 0.5 }, rotation: { x: 0, y: 0, z: 0 } },
    },
  },

  star: {
    label: 'Star',
    icon: '⭐',
    transforms: {
      head:      { position: { x: 0, y: 1.7, z: 0 },     rotation: { x: 0, y: 0, z: 0 } },
      torso:     { position: { x: 0, y: 1.0, z: 0 },     rotation: { x: 0, y: 0, z: 0 } },
      leftArm:   { position: { x: -0.65, y: 1.2, z: 0 }, rotation: { x: 0, y: 0, z: 0.9 } },
      rightArm:  { position: { x: 0.65, y: 1.2, z: 0 },  rotation: { x: 0, y: 0, z: -0.9 } },
      leftHand:  { position: { x: -0.9, y: 1.35, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      rightHand: { position: { x: 0.9, y: 1.35, z: 0 },  rotation: { x: 0, y: 0, z: 0 } },
      leftLeg:   { position: { x: -0.35, y: 0.3, z: 0 }, rotation: { x: 0, y: 0, z: 0.3 } },
      rightLeg:  { position: { x: 0.35, y: 0.3, z: 0 },  rotation: { x: 0, y: 0, z: -0.3 } },
      leftFoot:  { position: { x: -0.42, y: 0.05, z: 0.05 },rotation: { x: 0, y: 0, z: 0 } },
      rightFoot: { position: { x: 0.42, y: 0.05, z: 0.05 }, rotation: { x: 0, y: 0, z: 0 } },
    },
  },

  ball: {
    label: 'Ball',
    icon: '🔵',
    transforms: {
      head:      { position: { x: 0, y: 0.55, z: 0.2 },    rotation: { x: 1.0, y: 0, z: 0 } },
      torso:     { position: { x: 0, y: 0.3, z: 0 },       rotation: { x: 0.8, y: 0, z: 0 } },
      leftArm:   { position: { x: -0.2, y: 0.25, z: 0.2 }, rotation: { x: -1.5, y: 0, z: 0.6 } },
      rightArm:  { position: { x: 0.2, y: 0.25, z: 0.2 },  rotation: { x: -1.5, y: 0, z: -0.6 } },
      leftHand:  { position: { x: -0.1, y: 0.2, z: 0.35 }, rotation: { x: 0, y: 0, z: 0 } },
      rightHand: { position: { x: 0.1, y: 0.2, z: 0.35 },  rotation: { x: 0, y: 0, z: 0 } },
      leftLeg:   { position: { x: -0.12, y: 0.15, z: 0.15 },rotation: { x: -1.8, y: 0, z: 0 } },
      rightLeg:  { position: { x: 0.12, y: 0.15, z: 0.15 }, rotation: { x: -1.8, y: 0, z: 0 } },
      leftFoot:  { position: { x: -0.1, y: 0.08, z: 0.4 }, rotation: { x: -0.8, y: 0, z: 0 } },
      rightFoot: { position: { x: 0.1, y: 0.08, z: 0.4 },  rotation: { x: -0.8, y: 0, z: 0 } },
    },
  },

  't-pose': {
    label: 'T-Pose',
    icon: '✝️',
    transforms: {
      head:      { position: { x: 0, y: 1.65, z: 0 },    rotation: { x: 0, y: 0, z: 0 } },
      torso:     { position: { x: 0, y: 1.0, z: 0 },     rotation: { x: 0, y: 0, z: 0 } },
      leftArm:   { position: { x: -0.6, y: 1.05, z: 0 }, rotation: { x: 0, y: 0, z: Math.PI / 2 } },
      rightArm:  { position: { x: 0.6, y: 1.05, z: 0 },  rotation: { x: 0, y: 0, z: -Math.PI / 2 } },
      leftHand:  { position: { x: -0.95, y: 1.05, z: 0 },rotation: { x: 0, y: 0, z: 0 } },
      rightHand: { position: { x: 0.95, y: 1.05, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      leftLeg:   { position: { x: -0.18, y: 0.3, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      rightLeg:  { position: { x: 0.18, y: 0.3, z: 0 },  rotation: { x: 0, y: 0, z: 0 } },
      leftFoot:  { position: { x: -0.18, y: 0.05, z: 0.05 },rotation: { x: 0, y: 0, z: 0 } },
      rightFoot: { position: { x: 0.18, y: 0.05, z: 0.05 }, rotation: { x: 0, y: 0, z: 0 } },
    },
  },

  prayer: {
    label: 'Prayer',
    icon: '🙏',
    transforms: {
      head:      { position: { x: 0, y: 1.63, z: 0 },    rotation: { x: 0.15, y: 0, z: 0 } },
      torso:     { position: { x: 0, y: 1.0, z: 0 },     rotation: { x: 0, y: 0, z: 0 } },
      leftArm:   { position: { x: -0.2, y: 1.0, z: 0.2 },rotation: { x: -1.0, y: 0.3, z: 0.3 } },
      rightArm:  { position: { x: 0.2, y: 1.0, z: 0.2 }, rotation: { x: -1.0, y: -0.3, z: -0.3 } },
      leftHand:  { position: { x: -0.02, y: 1.05, z: 0.35 }, rotation: { x: 0, y: 0, z: 0 } },
      rightHand: { position: { x: 0.02, y: 1.05, z: 0.35 },  rotation: { x: 0, y: 0, z: 0 } },
      leftLeg:   { position: { x: -0.18, y: 0.3, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      rightLeg:  { position: { x: 0.18, y: 0.3, z: 0 },  rotation: { x: 0, y: 0, z: 0 } },
      leftFoot:  { position: { x: -0.18, y: 0.05, z: 0.05 },rotation: { x: 0, y: 0, z: 0 } },
      rightFoot: { position: { x: 0.18, y: 0.05, z: 0.05 }, rotation: { x: 0, y: 0, z: 0 } },
    },
  },
};

/**
 * List of all pose IDs for iteration
 */
export const POSE_LIST = Object.keys(POSE_DEFINITIONS).map((id) => ({
  id,
  label: POSE_DEFINITIONS[id].label,
  icon: POSE_DEFINITIONS[id].icon,
}));

/**
 * PoseSystem — manages applying poses to a CharacterModel
 */
export class PoseSystem {
  /**
   * @param {import('./CharacterModel.js').CharacterModel} characterModel
   */
  constructor(characterModel) {
    this.character = characterModel;
    this.currentPoseId = 'standing';
    this.isLocked = false;
  }

  /**
   * Apply a pose to the character (preview, not locked)
   * @param {string} poseId
   */
  previewPose(poseId) {
    if (this.isLocked) return;
    if (!POSE_DEFINITIONS[poseId]) {
      console.warn(`PoseSystem: Unknown pose "${poseId}"`);
      return;
    }

    this._applyPose(poseId);
    this.currentPoseId = poseId;
  }

  /**
   * Lock the current pose — character cannot change pose after this
   */
  lockPose() {
    if (this.isLocked) return;
    this.isLocked = true;
    // Apply one final time to ensure consistency
    this._applyPose(this.currentPoseId);
  }

  /**
   * Unlock pose (e.g., new round)
   */
  unlock() {
    this.isLocked = false;
  }

  /**
   * Get the current pose ID
   */
  getCurrentPoseId() {
    return this.currentPoseId;
  }

  /**
   * Check if the pose is locked
   */
  getIsLocked() {
    return this.isLocked;
  }

  /**
   * Apply a pose by ID to the character model
   * @private
   */
  _applyPose(poseId) {
    const pose = POSE_DEFINITIONS[poseId];
    if (!pose || !this.character || !this.character.bodyParts) return;

    const transforms = pose.transforms;

    for (const [partName, transform] of Object.entries(transforms)) {
      const part = this.character.bodyParts[partName];
      if (!part) continue;

      // Apply position
      if (transform.position) {
        part.position.set(
          transform.position.x,
          transform.position.y,
          transform.position.z
        );
      }

      // Apply rotation
      if (transform.rotation) {
        part.rotation.set(
          transform.rotation.x,
          transform.rotation.y,
          transform.rotation.z
        );
      }
    }
  }

  /**
   * Reset to default standing pose
   */
  reset() {
    this.isLocked = false;
    this.currentPoseId = 'standing';
    this._applyPose('standing');
  }

  /**
   * Get all available poses
   */
  static getPoseList() {
    return POSE_LIST;
  }
}
