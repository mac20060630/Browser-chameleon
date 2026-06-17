/**
 * ColorUtils — HSV/RGB conversions, color sampling, distance calculations
 */

/**
 * Convert HSV to RGB
 * @param {number} h - Hue [0, 360)
 * @param {number} s - Saturation [0, 1]
 * @param {number} v - Value [0, 1]
 * @returns {{ r: number, g: number, b: number }} RGB values [0, 255]
 */
export function hsvToRgb(h, s, v) {
  h = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let r1, g1, b1;
  if (h < 60) { r1 = c; g1 = x; b1 = 0; }
  else if (h < 120) { r1 = x; g1 = c; b1 = 0; }
  else if (h < 180) { r1 = 0; g1 = c; b1 = x; }
  else if (h < 240) { r1 = 0; g1 = x; b1 = c; }
  else if (h < 300) { r1 = x; g1 = 0; b1 = c; }
  else { r1 = c; g1 = 0; b1 = x; }

  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

/**
 * Convert RGB to HSV
 * @param {number} r - Red [0, 255]
 * @param {number} g - Green [0, 255]
 * @param {number} b - Blue [0, 255]
 * @returns {{ h: number, s: number, v: number }}
 */
export function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;

  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

/**
 * Convert a hex string (#RRGGBB) to RGB
 */
export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 255, g: 255, b: 255 };
}

/**
 * Convert RGB to hex string
 */
export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Convert HSV to hex
 */
export function hsvToHex(h, s, v) {
  const { r, g, b } = hsvToRgb(h, s, v);
  return rgbToHex(r, g, b);
}

/**
 * Convert hex to HSV
 */
export function hexToHsv(hex) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsv(r, g, b);
}

/**
 * Calculate perceptual color distance (CIE76 approximation)
 */
export function colorDistance(rgb1, rgb2) {
  const dr = rgb1.r - rgb2.r;
  const dg = rgb1.g - rgb2.g;
  const db = rgb1.b - rgb2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Sample a pixel color from a canvas at given coordinates
 * @param {HTMLCanvasElement} canvas
 * @param {number} x
 * @param {number} y
 * @returns {{ r: number, g: number, b: number, a: number }}
 */
export function sampleCanvasColor(canvas, x, y) {
  const ctx = canvas.getContext('2d');
  const pixel = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
  return { r: pixel[0], g: pixel[1], b: pixel[2], a: pixel[3] };
}

/**
 * Interpolate between two colors
 */
export function lerpColor(rgb1, rgb2, t) {
  return {
    r: Math.round(rgb1.r + (rgb2.r - rgb1.r) * t),
    g: Math.round(rgb1.g + (rgb2.g - rgb1.g) * t),
    b: Math.round(rgb1.b + (rgb2.b - rgb1.b) * t),
  };
}

/**
 * Create a CSS rgba string
 */
export function rgbToCss(r, g, b, a = 1) {
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * Convert Three.js Color to RGB object
 */
export function threeColorToRgb(color) {
  return {
    r: Math.round(color.r * 255),
    g: Math.round(color.g * 255),
    b: Math.round(color.b * 255),
  };
}
