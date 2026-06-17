/**
 * PaintToolUI — Paint tool side panel that drives the PaintSystem.
 * All DOM elements already exist in index.html; this module only queries them.
 */
import { hsvToRgb, rgbToHsv, rgbToHex } from '../utils/ColorUtils.js';

export class PaintToolUI {
  /**
   * @param {object} paintSystem - The PaintSystem instance to drive.
   */
  constructor(paintSystem) {
    this.paintSystem = paintSystem;

    // HSV state (hue in degrees, sat/val as 0-100 for slider convenience)
    this.hue = 0;
    this.saturation = 100;
    this.value = 100;

    this._selectedPattern = 'solid';
    this._eyedropperActive = false;

    this._bindElements();
    this._bindEvents();
    this._updatePreview();
  }

  // ───────────────────────────── DOM Binding ─────────────────────────────

  _bindElements() {
    // Panel root
    this.panel = document.getElementById('paint-tool-panel');
    this.btnClose = document.getElementById('btn-close-paint');

    // Color preview
    this.colorPreview = document.getElementById('color-preview');

    // HSV sliders
    this.hueSlider = document.getElementById('hue-slider');
    this.hueValue = document.getElementById('hue-value');
    this.satSlider = document.getElementById('sat-slider');
    this.satValue = document.getElementById('sat-value');
    this.valSlider = document.getElementById('val-slider');
    this.valValue = document.getElementById('val-value');

    // Brush size
    this.brushSizeSlider = document.getElementById('brush-size-slider');
    this.brushSizeValue = document.getElementById('brush-size-value');

    // Material sliders
    this.metallicSlider = document.getElementById('metallic-slider');
    this.metallicValue = document.getElementById('metallic-value');
    this.roughnessSlider = document.getElementById('roughness-slider');
    this.roughnessValue = document.getElementById('roughness-value');

    // Tool buttons
    this.btnEyedropper = document.getElementById('btn-eyedropper');
    this.btnFill = document.getElementById('btn-fill');
    this.btnUndo = document.getElementById('btn-undo');
    this.btnRedo = document.getElementById('btn-redo');

    // Pattern buttons
    this.patternButtons = document.querySelectorAll('.btn-pattern');
  }

  _bindEvents() {
    // Close button
    this.btnClose.addEventListener('click', () => this.hide());

    // HSV sliders
    this.hueSlider.addEventListener('input', (e) =>
      this._onHueChange(Number(e.target.value)),
    );
    this.satSlider.addEventListener('input', (e) =>
      this._onSatChange(Number(e.target.value)),
    );
    this.valSlider.addEventListener('input', (e) =>
      this._onValChange(Number(e.target.value)),
    );

    // Brush size
    this.brushSizeSlider.addEventListener('input', (e) =>
      this._onBrushSizeChange(Number(e.target.value)),
    );

    // Material sliders
    this.metallicSlider.addEventListener('input', (e) =>
      this._onMetallicChange(Number(e.target.value)),
    );
    this.roughnessSlider.addEventListener('input', (e) =>
      this._onRoughnessChange(Number(e.target.value)),
    );

    // Tool buttons
    this.btnEyedropper.addEventListener('click', () => this._onEyedropper());
    this.btnFill.addEventListener('click', () => this._onFill());
    this.btnUndo.addEventListener('click', () => this._onUndo());
    this.btnRedo.addEventListener('click', () => this._onRedo());

    // Pattern buttons
    this.patternButtons.forEach((btn) => {
      btn.addEventListener('click', () =>
        this._onPattern(btn.dataset.pattern),
      );
    });
  }

  // ───────────────────────────── Visibility ─────────────────────────────

  /** Show the paint tool panel. */
  show() {
    this.panel.classList.remove('hidden');
    this.panel.classList.add('open');
  }

  /** Hide the paint tool panel. */
  hide() {
    this.panel.classList.add('hidden');
    this.panel.classList.remove('open');
    this._deactivateEyedropper();
  }

  /** Toggle panel visibility. */
  toggle() {
    if (this.isVisible()) {
      this.hide();
    } else {
      this.show();
    }
  }

  /** @returns {boolean} Whether the panel is currently visible. */
  isVisible() {
    return !this.panel.classList.contains('hidden');
  }

  // ───────────────────────── Slider Handlers ────────────────────────────

  /** @param {number} value Hue 0-360 */
  _onHueChange(value) {
    this.hue = value;
    this.hueValue.textContent = `${value}°`;
    this._updatePreview();
    this._updatePaintSystem();
  }

  /** @param {number} value Saturation 0-100 */
  _onSatChange(value) {
    this.saturation = value;
    this.satValue.textContent = `${value}%`;
    this._updatePreview();
    this._updatePaintSystem();
  }

  /** @param {number} value Brightness/Value 0-100 */
  _onValChange(value) {
    this.value = value;
    this.valValue.textContent = `${value}%`;
    this._updatePreview();
    this._updatePaintSystem();
  }

  /** @param {number} value Brush size 2-60 */
  _onBrushSizeChange(value) {
    this.brushSizeValue.textContent = `${value}`;
    if (this.paintSystem && typeof this.paintSystem.setBrushSize === 'function') {
      this.paintSystem.setBrushSize(value);
    }
  }

  /** @param {number} value Metallic 0-100 */
  _onMetallicChange(value) {
    this.metallicValue.textContent = `${value}%`;
    if (this.paintSystem && typeof this.paintSystem.setMetallic === 'function') {
      this.paintSystem.setMetallic(value / 100);
    }
  }

  /** @param {number} value Roughness 0-100 */
  _onRoughnessChange(value) {
    this.roughnessValue.textContent = `${value}%`;
    if (this.paintSystem && typeof this.paintSystem.setRoughness === 'function') {
      this.paintSystem.setRoughness(value / 100);
    }
  }

  // ───────────────────────── Preview & Sync ─────────────────────────────

  /** Update the colour preview swatch from current HSV. */
  _updatePreview() {
    const { r, g, b } = hsvToRgb(this.hue, this.saturation / 100, this.value / 100);
    this.colorPreview.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
  }

  /** Push the current colour settings to the paint system. */
  _updatePaintSystem() {
    if (!this.paintSystem) return;

    const { r, g, b } = hsvToRgb(this.hue, this.saturation / 100, this.value / 100);

    if (typeof this.paintSystem.setColor === 'function') {
      this.paintSystem.setColor(r, g, b);
    }
  }

  // ───────────────────────── Eyedropper Sync ────────────────────────────

  /**
   * Called externally when the eyedropper picks a colour.
   * Updates all HSV sliders and the preview to match.
   * @param {number} r 0-255
   * @param {number} g 0-255
   * @param {number} b 0-255
   */
  setColorFromEyedropper(r, g, b) {
    const { h, s, v } = rgbToHsv(r, g, b);

    this.hue = Math.round(h);
    this.saturation = Math.round(s * 100);
    this.value = Math.round(v * 100);

    // Sync slider positions
    this.hueSlider.value = this.hue;
    this.hueValue.textContent = `${this.hue}°`;

    this.satSlider.value = this.saturation;
    this.satValue.textContent = `${this.saturation}%`;

    this.valSlider.value = this.value;
    this.valValue.textContent = `${this.value}%`;

    this._updatePreview();
    this._updatePaintSystem();
    this._deactivateEyedropper();
  }

  // ───────────────────────── Tool Buttons ───────────────────────────────

  /** Toggle eyedropper mode. */
  _onEyedropper() {
    this._eyedropperActive = !this._eyedropperActive;
    this.btnEyedropper.classList.toggle('active', this._eyedropperActive);

    if (this.paintSystem && typeof this.paintSystem.setEyedropperMode === 'function') {
      this.paintSystem.setEyedropperMode(this._eyedropperActive);
    }
  }

  /** Deactivate the eyedropper tool. */
  _deactivateEyedropper() {
    this._eyedropperActive = false;
    this.btnEyedropper.classList.remove('active');

    if (this.paintSystem && typeof this.paintSystem.setEyedropperMode === 'function') {
      this.paintSystem.setEyedropperMode(false);
    }
  }

  /** Fill all body parts with the current colour. */
  _onFill() {
    if (this.paintSystem && typeof this.paintSystem.fillAll === 'function') {
      const { r, g, b } = hsvToRgb(this.hue, this.saturation / 100, this.value / 100);
      this.paintSystem.fillAll(r, g, b);
    }
  }

  /** Undo the last paint action. */
  _onUndo() {
    if (this.paintSystem && typeof this.paintSystem.undo === 'function') {
      this.paintSystem.undo();
    }
  }

  /** Redo the last undone paint action. */
  _onRedo() {
    if (this.paintSystem && typeof this.paintSystem.redo === 'function') {
      this.paintSystem.redo();
    }
  }

  // ───────────────────────── Pattern Buttons ────────────────────────────

  /**
   * Select a pattern and apply it via the paint system.
   * @param {string} patternName
   */
  _onPattern(patternName) {
    this._selectedPattern = patternName;

    // Update active class on pattern buttons
    this.patternButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.pattern === patternName);
    });

    if (this.paintSystem && typeof this.paintSystem.applyPattern === 'function') {
      const { r, g, b } = hsvToRgb(this.hue, this.saturation / 100, this.value / 100);
      this.paintSystem.applyPattern(patternName, r, g, b);
    }
  }
}
