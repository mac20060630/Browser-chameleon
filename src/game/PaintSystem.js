/**
 * PaintSystem.js
 *
 * Core paint system for the Browser Chameleon game.
 * Handles painting the character model via mouse interaction:
 *  • Brush tool   – freehand painting on body-part UV canvases
 *  • Fill tool    – flood-fill an entire body part with a colour
 *  • Eyedropper   – sample any colour from the 3D scene
 *  • Patterns     – stamp a repeating pattern onto a body part
 *  • Undo / Redo  – up to 20 ImageData snapshots
 */
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// PaintSystem
// ---------------------------------------------------------------------------
export class PaintSystem {
  /**
   * @param {THREE.WebGLRenderer} renderer
   * @param {THREE.Scene} scene
   * @param {THREE.Camera} camera
   * @param {import('./CharacterModel.js').CharacterModel} characterModel
   */
  constructor(renderer, scene, camera, characterModel) {
    /** @type {THREE.WebGLRenderer} */
    this.renderer = renderer;
    /** @type {THREE.Scene} */
    this.scene = scene;
    /** @type {THREE.Camera} */
    this.camera = camera;
    /** @type {import('./CharacterModel.js').CharacterModel} */
    this.character = characterModel;

    /** Shared raycaster for brush & fill tools. */
    this.raycaster = new THREE.Raycaster();

    // -- State ---------------------------------------------------------------
    /** Whether the paint system is currently accepting input. */
    this.isActive = false;

    /** Current brush colour (0‥255 per channel). */
    this.currentColor = { r: 255, g: 0, b: 0 };

    /** Brush radius in canvas-texture pixels. */
    this.brushSize = 15;

    /** Material metalness applied to all body parts (0‥1). */
    this.metallic = 0;

    /** Material roughness applied to all body parts (0‥1). */
    this.roughness = 0.8;

    /** Active tool. */
    this.currentTool = 'brush'; // 'brush' | 'eyedropper' | 'fill'

    /** Active pattern (used with fill tool). */
    this.currentPattern = 'solid';

    // -- Undo / Redo ---------------------------------------------------------
    /** @type {Array<Record<string, ImageData>>} */
    this.undoStack = [];
    /** @type {Array<Record<string, ImageData>>} */
    this.redoStack = [];
    /** Maximum number of undo snapshots retained. */
    this.maxUndoSteps = 20;

    // -- Internal ------------------------------------------------------------
    /** Whether the primary mouse button is currently held down. */
    this._isPainting = false;

    /** Offscreen render target used by the eyedropper. */
    this._eyedropperTarget = null;

    /** Pixel read-back buffer (4 bytes RGBA). */
    this._readBuffer = new Uint8Array(4);

    // Bound event handlers (so they can be removed later)
    this._onMouseDown = this._handleMouseDown.bind(this);
    this._onMouseMove = this._handleMouseMove.bind(this);
    this._onMouseUp   = this._handleMouseUp.bind(this);

    /** Callback when eyedropper selects a color */
    this.onColorPicked = null;
    this.onPaintChange = null; // Called as onPaintChange(partName) when painting occurs
  }

  // -----------------------------------------------------------------------
  // Activation
  // -----------------------------------------------------------------------

  /** Enable paint mode — attaches pointer event listeners. */
  activate() {
    if (this.isActive) return;
    this.isActive = true;

    const canvas = this.renderer.domElement;
    canvas.addEventListener('mousedown', this._onMouseDown);
    canvas.addEventListener('mousemove', this._onMouseMove);
    canvas.addEventListener('mouseup',   this._onMouseUp);
    canvas.addEventListener('mouseleave', this._onMouseUp);
    canvas.style.cursor = 'crosshair';
  }

  /** Disable paint mode — removes pointer event listeners. */
  deactivate() {
    if (!this.isActive) return;
    this.isActive = false;
    this._isPainting = false;

    const canvas = this.renderer.domElement;
    canvas.removeEventListener('mousedown', this._onMouseDown);
    canvas.removeEventListener('mousemove', this._onMouseMove);
    canvas.removeEventListener('mouseup',   this._onMouseUp);
    canvas.removeEventListener('mouseleave', this._onMouseUp);
    canvas.style.cursor = '';
  }

  // -----------------------------------------------------------------------
  // Event handlers
  // -----------------------------------------------------------------------

  /** @param {MouseEvent} event */
  _handleMouseDown(event) {
    if (!this.isActive || event.button !== 0) return;

    const { x, y } = this._normalizePointer(event);

    switch (this.currentTool) {
      case 'eyedropper':
        this._eyedropScene(event.clientX, event.clientY);
        break;

      case 'fill': {
        // Raycast to find which body part was clicked
        const hit = this._raycastCharacter(x, y);
        if (hit) {
          this.saveUndoState();
          if (this.currentPattern === 'solid') {
            this.character.fillPart(hit.partName, this.currentColor);
          } else {
            this._applyPattern(hit.partName, this.currentPattern);
          }
          this.onPaintChange?.(hit.partName);
        }
        break;
      }

      case 'brush':
      default:
        this.saveUndoState();
        this._isPainting = true;
        this._paintOnCharacter(x, y);
        break;
    }
  }

  /** @param {MouseEvent} event */
  _handleMouseMove(event) {
    if (!this.isActive || !this._isPainting) return;
    const { x, y } = this._normalizePointer(event);
    this._paintOnCharacter(x, y);
  }

  /** @param {MouseEvent} _event */
  _handleMouseUp(_event) {
    this._isPainting = false;
  }

  // -----------------------------------------------------------------------
  // Painting (brush tool)
  // -----------------------------------------------------------------------

  /**
   * Raycast from NDC coords and paint at the hit UV.
   * @param {number} ndcX – normalised device coord -1‥1
   * @param {number} ndcY – normalised device coord -1‥1
   */
  _paintOnCharacter(ndcX, ndcY) {
    const hit = this._raycastCharacter(ndcX, ndcY);
    if (!hit) return;

    this.character.paintAt(
      hit.partName,
      hit.uv.x,
      hit.uv.y,
      this.currentColor,
      this.brushSize,
    );

    this.onPaintChange?.(hit.partName);
  }

  /**
   * Raycast against the character's body parts and return hit info.
   * @param {number} ndcX
   * @param {number} ndcY
   * @returns {{ partName: string, uv: THREE.Vector2, point: THREE.Vector3 } | null}
   */
  _raycastCharacter(ndcX, ndcY) {
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);

    const meshes = Object.values(this.character.bodyParts);
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length === 0) return null;

    const hit = intersects[0];
    const partName = hit.object.name;

    // UV coordinates — some geometries may not have UVs; fall back to
    // projected coords in that case.
    let uv = hit.uv;
    if (!uv) {
      // Approximate UV from the local hit point
      const local = hit.object.worldToLocal(hit.point.clone());
      const bbox = new THREE.Box3().setFromObject(hit.object);
      const size = new THREE.Vector3();
      bbox.getSize(size);
      uv = new THREE.Vector2(
        (local.x - bbox.min.x) / (size.x || 1),
        (local.y - bbox.min.y) / (size.y || 1),
      );
      uv.x = THREE.MathUtils.clamp(uv.x, 0, 1);
      uv.y = THREE.MathUtils.clamp(uv.y, 0, 1);
    }

    return { partName, uv, point: hit.point };
  }

  // -----------------------------------------------------------------------
  // Eyedropper
  // -----------------------------------------------------------------------

  /**
   * Sample the colour at a screen pixel by rendering the scene to an
   * offscreen render target and reading back the pixel value.
   *
   * @param {number} screenX – client X (pixels)
   * @param {number} screenY – client Y (pixels)
   * @returns {{ r: number, g: number, b: number } | null}
   */
  _eyedropScene(screenX, screenY) {
    const renderer = this.renderer;
    const size = renderer.getSize(new THREE.Vector2());
    const w = size.x;
    const h = size.y;

    // Lazy-init the render target at the current viewport size
    if (
      !this._eyedropperTarget ||
      this._eyedropperTarget.width !== w ||
      this._eyedropperTarget.height !== h
    ) {
      this._eyedropperTarget?.dispose();
      this._eyedropperTarget = new THREE.WebGLRenderTarget(w, h, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
      });
    }

    // Render the scene into the offscreen target
    const currentTarget = renderer.getRenderTarget();
    renderer.setRenderTarget(this._eyedropperTarget);
    renderer.render(this.scene, this.camera);
    renderer.setRenderTarget(currentTarget);

    // Convert screen coords → render-target pixel coords
    const rect = renderer.domElement.getBoundingClientRect();
    const px = Math.floor(((screenX - rect.left) / rect.width) * w);
    // WebGL origin is bottom-left, screen origin is top-left
    const py = Math.floor((1 - (screenY - rect.top) / rect.height) * h);

    renderer.readRenderTargetPixels(this._eyedropperTarget, px, py, 1, 1, this._readBuffer);

    const r = this._readBuffer[0];
    const g = this._readBuffer[1];
    const b = this._readBuffer[2];

    this.currentColor = { r, g, b };
    if (typeof this.onColorPicked === 'function') {
      this.onColorPicked(r, g, b);
    }
    return { r, g, b };
  }

  // -----------------------------------------------------------------------
  // Patterns
  // -----------------------------------------------------------------------

  /**
   * Paint the entire body-part canvas with a procedural pattern using the
   * current colour.
   *
   * @param {string} partName
   * @param {string} pattern – 'solid' | 'checkers' | 'stripes-h' | 'stripes-v' | 'gradient' | 'dots'
   */
  _applyPattern(partName, pattern) {
    const entry = this.character.getCanvasForPart(partName);
    if (!entry) return;

    const { context, texture, canvas } = entry;
    const size = canvas.width; // assumed square
    const { r, g, b } = this.currentColor;

    // Darker variant for two-tone patterns
    const dr = Math.max(0, r - 60);
    const dg = Math.max(0, g - 60);
    const db = Math.max(0, b - 60);

    // Lighter variant
    const lr = Math.min(255, r + 60);
    const lg = Math.min(255, g + 60);
    const lb = Math.min(255, b + 60);

    const imageData = context.createImageData(size, size);
    const data = imageData.data;

    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const idx = (py * size + px) * 4;
        let cr = r, cg = g, cb = b;

        switch (pattern) {
          case 'checkers': {
            const cellSize = 32;
            const isEven = (Math.floor(px / cellSize) + Math.floor(py / cellSize)) % 2 === 0;
            if (!isEven) { cr = dr; cg = dg; cb = db; }
            break;
          }

          case 'stripes-h': {
            const stripeH = 16;
            if (Math.floor(py / stripeH) % 2 === 1) { cr = dr; cg = dg; cb = db; }
            break;
          }

          case 'stripes-v': {
            const stripeW = 16;
            if (Math.floor(px / stripeW) % 2 === 1) { cr = dr; cg = dg; cb = db; }
            break;
          }

          case 'gradient': {
            const t = py / size;
            cr = Math.round(r + (lr - r) * t);
            cg = Math.round(g + (lg - g) * t);
            cb = Math.round(b + (lb - b) * t);
            break;
          }

          case 'dots': {
            const dotSpacing = 32;
            const dotRadius = 10;
            const cx = (px % dotSpacing) - dotSpacing / 2;
            const cy = (py % dotSpacing) - dotSpacing / 2;
            if (cx * cx + cy * cy > dotRadius * dotRadius) {
              cr = dr; cg = dg; cb = db;
            }
            break;
          }

          case 'solid':
          default:
            break;
        }

        data[idx]     = cr;
        data[idx + 1] = cg;
        data[idx + 2] = cb;
        data[idx + 3] = 255;
      }
    }

    context.putImageData(imageData, 0, 0);
    texture.needsUpdate = true;
  }

  // -----------------------------------------------------------------------
  // Undo / Redo
  // -----------------------------------------------------------------------

  /** Take a snapshot of all body-part canvases and push onto the undo stack. */
  saveUndoState() {
    const state = this.character.getUndoState();
    this.undoStack.push(state);
    if (this.undoStack.length > this.maxUndoSteps) {
      this.undoStack.shift(); // discard oldest
    }
    // Any new action invalidates the redo history
    this.redoStack.length = 0;
  }

  /** Restore the previous paint state. */
  undo() {
    if (this.undoStack.length === 0) return;

    // Save current state for redo before restoring
    const currentState = this.character.getUndoState();
    this.redoStack.push(currentState);

    const prevState = this.undoStack.pop();
    this.character.restoreState(prevState);
  }

  /** Re-apply the last undone paint state. */
  redo() {
    if (this.redoStack.length === 0) return;

    // Save current state for undo before restoring
    const currentState = this.character.getUndoState();
    this.undoStack.push(currentState);

    const nextState = this.redoStack.pop();
    this.character.restoreState(nextState);
  }

  // -----------------------------------------------------------------------
  // Setters
  // -----------------------------------------------------------------------

  /**
   * Set the brush colour.
   * @param {number} r 0‥255
   * @param {number} g 0‥255
   * @param {number} b 0‥255
   */
  setColor(r, g, b) {
    this.currentColor = { r, g, b };
  }

  /** @param {number} size – brush radius in canvas pixels */
  setBrushSize(size) {
    this.brushSize = Math.max(1, Math.min(128, size));
  }

  /** @param {number} value – 0‥1 */
  setMetallic(value) {
    this.metallic = THREE.MathUtils.clamp(value, 0, 1);
    this.character.setMaterialProperty('metalness', this.metallic);
  }

  /** @param {number} value – 0‥1 */
  setRoughness(value) {
    this.roughness = THREE.MathUtils.clamp(value, 0, 1);
    this.character.setMaterialProperty('roughness', this.roughness);
  }

  /** @param {'brush' | 'eyedropper' | 'fill'} toolName */
  setTool(toolName) {
    if (['brush', 'eyedropper', 'fill'].includes(toolName)) {
      this.currentTool = toolName;
    }
  }

  /** @param {'solid' | 'checkers' | 'stripes-h' | 'stripes-v' | 'gradient' | 'dots'} patternName */
  setPattern(patternName) {
    const valid = ['solid', 'checkers', 'stripes-h', 'stripes-v', 'gradient', 'dots'];
    if (valid.includes(patternName)) {
      this.currentPattern = patternName;
    }
  }

  /**
   * Set eyedropper mode on or off.
   * @param {boolean} active
   */
  setEyedropperMode(active) {
    this.setTool(active ? 'eyedropper' : 'brush');
  }

  /**
   * Fill all body parts with a color.
   * @param {number} r
   * @param {number} g
   * @param {number} b
   */
  fillAll(r, g, b) {
    this.saveUndoState();
    const color = { r, g, b };
    for (const partName of Object.keys(this.character.bodyParts)) {
      this.character.fillPart(partName, color);
    }
  }

  /**
   * Set pattern and switch to fill tool.
   * @param {string} patternName
   * @param {number} r
   * @param {number} g
   * @param {number} b
   */
  applyPattern(patternName, r, g, b) {
    this.setPattern(patternName);
    this.setColor(r, g, b);
    if (patternName === 'solid') {
      this.setTool('brush');
    } else {
      this.setTool('fill');
    }
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  /**
   * Convert a MouseEvent to NDC (-1‥1).
   * @param {MouseEvent} event
   * @returns {{ x: number, y: number }}
   */
  _normalizePointer(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    return {
      x:  ((event.clientX - rect.left) / rect.width)  *  2 - 1,
      y: -((event.clientY - rect.top)  / rect.height) *  2 + 1,
    };
  }

  // -----------------------------------------------------------------------
  // Cleanup
  // -----------------------------------------------------------------------

  /** Remove listeners and dispose GPU resources. */
  dispose() {
    this.deactivate();
    this._eyedropperTarget?.dispose();
    this._eyedropperTarget = null;
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }
}
