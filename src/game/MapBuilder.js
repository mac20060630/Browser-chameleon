/**
 * MapBuilder.js
 *
 * Builds the "Party Room" map — a colourful room full of furniture and
 * decorations for hiders to blend into in the Meccha Chameleon game.
 *
 * Dimensions: ~20 × 15 × 4 units (length × width × height).
 * Every object is built from basic Three.js primitives (boxes, spheres,
 * cylinders) so no external models are required.
 */
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Colour palette
// ---------------------------------------------------------------------------
const C = {
  // Walls
  wallNorth:  0xFF6B6B, // coral pink
  wallSouth:  0x4ECDC4, // mint green
  wallEast:   0xFFE66D, // warm yellow
  wallWest:   0xA78BFA, // lavender
  ceiling:    0xF8F8F8, // soft white
  floorA:     0xF5F0E8, // cream
  floorB:     0xC2785C, // terracotta

  // Furniture
  wood:       0x8B5E3C,
  woodDark:   0x6B4226,
  red:        0xE63946,
  blue:       0x457B9D,
  green:      0x2A9D8F,
  white:      0xFFFFFF,
  pink:       0xF4A7BB,
  yellow:     0xFFD166,
  orange:     0xF4845F,
  teal:       0x1D8A7E,
  purple:     0x7B2D8E,
  magenta:    0xC850A0,
  beige:      0xE8D5B7,
  ceramic:    0x5B9BD5,
  lampYellow: 0xFFE4A0,
  
  // Office specific
  carpet:     0x3D4C53, // dark gray blue
  cubicle:    0x8C9AA1, // light gray blue
  deskWood:   0xC4A484, // light brown
  pcBlack:    0x1A1A1A, // dark
  screenBlue: 0x4A90E2, // glowing blue
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Shorthand: create a MeshStandardMaterial with a hex colour.
 * @param {number} color
 * @param {object} [extra]
 * @returns {THREE.MeshStandardMaterial}
 */
function mat(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, ...extra });
}

/**
 * Shorthand: box mesh.
 */
function box(w, h, d, color, x, y, z, extra) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, extra));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/**
 * Shorthand: cylinder mesh.
 */
function cyl(rTop, rBot, h, color, x, y, z, segments = 16, extra) {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(rTop, rBot, h, segments),
    mat(color, extra),
  );
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/**
 * Shorthand: sphere mesh.
 */
function sphere(r, color, x, y, z, extra) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(r, 20, 20),
    mat(color, extra),
  );
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/**
 * Create an invisible AABB collider.
 */
function collider(w, h, d, x, y, z) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const material = new THREE.MeshBasicMaterial({ visible: false });
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.userData.isCollider = true;
  return m;
}

// ---------------------------------------------------------------------------
// MapBuilder
// ---------------------------------------------------------------------------
export class MapBuilder {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    /** @type {THREE.Scene} */
    this.scene = scene;

    /** All visible meshes (used for raycasting / eye-dropper). */
    this.objects = [];

    /** Invisible collision volumes. */
    this.colliders = [];

    /** Spawn locations by role. */
    this.spawnPoints = { hider: [], seeker: [] };
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Build the requested map and add everything to the scene.
   * @param {string} mapId – currently only 'party-room'
   */
  buildMap(mapId = 'party-room') {
    switch (mapId) {
      case 'office':
        this._buildOffice();
        break;
      case 'party-room':
      default:
        this._buildPartyRoom();
    }
  }

  /** @returns {THREE.Mesh[]} */
  getColliders() {
    return this.colliders;
  }

  /** @returns {{ hider: THREE.Vector3[], seeker: THREE.Vector3[] }} */
  getSpawnPoints() {
    return this.spawnPoints;
  }

  /** Remove all objects and free GPU resources. */
  dispose() {
    const all = [...this.objects, ...this.colliders];
    for (const obj of all) {
      this.scene.remove(obj);
      obj.geometry?.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    }
    this.objects = [];
    this.colliders = [];
  }

  // -----------------------------------------------------------------------
  // Party Room
  // -----------------------------------------------------------------------

  /** @private */
  _buildPartyRoom() {
    const W = 20; // room width  (X)
    const D = 15; // room depth  (Z)
    const H = 4;  // room height (Y)

    // ---- helpers to register objects ----
    const add = (mesh) => { this.scene.add(mesh); this.objects.push(mesh); return mesh; };
    const addCollider = (c) => { this.scene.add(c); this.colliders.push(c); return c; };

    // ===========================================================
    // Floor — checkered tiles 1×1
    // ===========================================================
    for (let ix = 0; ix < W; ix++) {
      for (let iz = 0; iz < D; iz++) {
        const color = (ix + iz) % 2 === 0 ? C.floorA : C.floorB;
        const tile = box(1, 0.05, 1, color, ix - W / 2 + 0.5, 0, iz - D / 2 + 0.5);
        tile.receiveShadow = true;
        tile.castShadow = false;
        add(tile);
      }
    }

    // ===========================================================
    // Walls
    // ===========================================================
    const wallThickness = 0.2;

    // North wall (positive Z face, at z = +D/2)
    add(box(W, H, wallThickness, C.wallNorth, 0, H / 2, D / 2));
    addCollider(collider(W, H, wallThickness, 0, H / 2, D / 2));

    // South wall (negative Z face, at z = -D/2)
    add(box(W, H, wallThickness, C.wallSouth, 0, H / 2, -D / 2));
    addCollider(collider(W, H, wallThickness, 0, H / 2, -D / 2));

    // East wall (positive X, at x = +W/2)
    add(box(wallThickness, H, D, C.wallEast, W / 2, H / 2, 0));
    addCollider(collider(wallThickness, H, D, W / 2, H / 2, 0));

    // West wall (negative X, at x = -W/2)
    add(box(wallThickness, H, D, C.wallWest, -W / 2, H / 2, 0));
    addCollider(collider(wallThickness, H, D, -W / 2, H / 2, 0));

    // Ceiling
    const ceil = box(W, 0.1, D, C.ceiling, 0, H, 0);
    ceil.castShadow = false;
    add(ceil);

    // ===========================================================
    // 1. Long table (center)
    // ===========================================================
    const tableY = 0.75;
    add(box(3.0, 0.1, 1.2, C.wood, 0, tableY, 0));          // tabletop
    add(box(0.1, tableY, 0.1, C.woodDark, -1.3, tableY / 2, -0.45)); // legs
    add(box(0.1, tableY, 0.1, C.woodDark,  1.3, tableY / 2, -0.45));
    add(box(0.1, tableY, 0.1, C.woodDark, -1.3, tableY / 2,  0.45));
    add(box(0.1, tableY, 0.1, C.woodDark,  1.3, tableY / 2,  0.45));
    addCollider(collider(3.2, tableY + 0.1, 1.4, 0, (tableY + 0.1) / 2, 0));

    // ===========================================================
    // 2. Six chairs around table
    // ===========================================================
    const chairColors = [C.red, C.blue, C.green, C.red, C.blue, C.green];
    const chairPositions = [
      [-1.0, -1.0], [0, -1.0], [1.0, -1.0],
      [-1.0,  1.0], [0,  1.0], [1.0,  1.0],
    ];
    chairPositions.forEach(([cx, cz], i) => {
      const col = chairColors[i];
      add(box(0.4, 0.05, 0.4, col, cx, 0.45, cz));              // seat
      add(box(0.4, 0.5,  0.05, col, cx, 0.7,  cz + (cz > 0 ? 0.18 : -0.18))); // back
      // legs
      const legH = 0.45;
      add(cyl(0.03, 0.03, legH, C.woodDark, cx - 0.15, legH / 2, cz - 0.15));
      add(cyl(0.03, 0.03, legH, C.woodDark, cx + 0.15, legH / 2, cz - 0.15));
      add(cyl(0.03, 0.03, legH, C.woodDark, cx - 0.15, legH / 2, cz + 0.15));
      add(cyl(0.03, 0.03, legH, C.woodDark, cx + 0.15, legH / 2, cz + 0.15));
      addCollider(collider(0.5, 1.0, 0.5, cx, 0.5, cz));
    });

    // ===========================================================
    // 3. Birthday cake on table
    // ===========================================================
    add(cyl(0.25, 0.25, 0.2, C.white, 0, tableY + 0.15, 0, 24));          // cake body
    add(cyl(0.26, 0.26, 0.03, C.pink, 0, tableY + 0.265, 0, 24));        // frosting top
    // candles
    for (let ci = 0; ci < 5; ci++) {
      const angle = (ci / 5) * Math.PI * 2;
      const cr = 0.12;
      add(cyl(0.015, 0.015, 0.1, C.yellow, Math.cos(angle) * cr, tableY + 0.33, Math.sin(angle) * cr, 6));
      add(sphere(0.02, C.orange, Math.cos(angle) * cr, tableY + 0.4, Math.sin(angle) * cr));
    }

    // ===========================================================
    // 4. Plates & cups on table
    // ===========================================================
    const platePositions = [[-0.8, -0.3], [0.8, -0.3], [-0.8, 0.3], [0.8, 0.3]];
    platePositions.forEach(([px, pz]) => {
      add(cyl(0.15, 0.15, 0.02, C.white, px, tableY + 0.06, pz, 20));      // plate
      add(cyl(0.05, 0.04, 0.12, C.ceramic, px + 0.2, tableY + 0.12, pz, 12)); // cup
    });

    // ===========================================================
    // 5. Gift boxes (4)
    // ===========================================================
    const giftDefs = [
      { color: C.red,    x: -7, z: 4,  s: 0.5 },
      { color: C.blue,   x: -6, z: 5,  s: 0.4 },
      { color: C.yellow, x:  7, z: -5, s: 0.45 },
      { color: C.green,  x:  6, z: -4, s: 0.35 },
    ];
    giftDefs.forEach(({ color, x, z, s }) => {
      add(box(s, s, s, color, x, s / 2, z));                          // body
      add(box(s + 0.05, 0.04, 0.08, C.yellow, x, s + 0.02, z));      // ribbon horizontal
      add(box(0.08, 0.04, s + 0.05, C.yellow, x, s + 0.02, z));      // ribbon vertical
      addCollider(collider(s + 0.1, s + 0.1, s + 0.1, x, s / 2, z));
    });

    // ===========================================================
    // 6. Balloons (8)
    // ===========================================================
    const balloonColors = [C.red, C.blue, C.yellow, C.green, C.pink, C.orange, C.purple, C.teal];
    const balloonX = [-6, -3, -1, 2, 4, 6, -5, 3];
    const balloonZ = [3, -4, 5, -3, 4, -5, -2, 2];
    balloonColors.forEach((col, i) => {
      const bx = balloonX[i];
      const bz = balloonZ[i];
      const by = H - 0.5 - Math.random() * 0.4;
      add(sphere(0.2, col, bx, by, bz));                              // balloon
      add(cyl(0.008, 0.008, by - 0.2, C.white, bx, (by - 0.2) / 2, bz, 4)); // string
    });

    // ===========================================================
    // 7. Bookshelf (east wall)
    // ===========================================================
    const bsX = W / 2 - 0.35;
    add(box(0.6, 2.0, 1.8, C.wood, bsX, 1.0, 2));                     // frame
    // shelves
    for (let si = 0; si < 4; si++) {
      add(box(0.55, 0.04, 1.7, C.woodDark, bsX, 0.3 + si * 0.5, 2));
    }
    // books (thin coloured boxes)
    const bookColors = [C.red, C.blue, C.green, C.yellow, C.purple, C.orange, C.pink, C.teal];
    bookColors.forEach((bc, bi) => {
      const row = Math.floor(bi / 4);
      const col = bi % 4;
      add(box(0.04, 0.4, 0.3, bc, bsX - 0.1, 0.55 + row * 0.5, 1.4 + col * 0.4));
    });
    addCollider(collider(0.7, 2.2, 2.0, bsX, 1.1, 2));

    // ===========================================================
    // 8. Potted plants (2)
    // ===========================================================
    const plantPositions = [[-W / 2 + 1, -D / 2 + 1], [W / 2 - 1, D / 2 - 1]];
    plantPositions.forEach(([px, pz]) => {
      add(cyl(0.2, 0.25, 0.4, C.woodDark, px, 0.2, pz, 12));          // pot
      add(new THREE.Mesh(
        new THREE.ConeGeometry(0.35, 0.9, 12),
        mat(C.green),
      ).position.set(px, 0.85, pz) || (() => {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 12), mat(C.green));
        cone.position.set(px, 0.85, pz);
        cone.castShadow = true;
        return cone;
      })());
      // Fix: add the cone properly
    });
    // Re-do plants cleanly:
    this.objects.pop(); this.objects.pop(); this.objects.pop(); this.objects.pop();
    plantPositions.forEach(([px, pz]) => {
      add(cyl(0.2, 0.25, 0.4, C.woodDark, px, 0.2, pz, 12));
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 12), mat(C.green));
      cone.position.set(px, 0.85, pz);
      cone.castShadow = true;
      cone.receiveShadow = true;
      add(cone);
      addCollider(collider(0.5, 1.3, 0.5, px, 0.65, pz));
    });

    // ===========================================================
    // 9. Rug on floor
    // ===========================================================
    const rug = box(4, 0.02, 3, C.magenta, 0, 0.03, 0, { roughness: 1.0 });
    rug.castShadow = false;
    add(rug);

    // ===========================================================
    // 10. Picture frames on walls (4)
    // ===========================================================
    const frameDefs = [
      { color: C.red,    x: -3, y: 2.5, z: D / 2 - 0.05, rY: 0 },         // north
      { color: C.blue,   x:  3, y: 2.2, z: D / 2 - 0.05, rY: 0 },         // north
      { color: C.green,  x: -4, y: 2.3, z: -D / 2 + 0.05, rY: 0 },        // south
      { color: C.yellow, x: -W / 2 + 0.05, y: 2.4, z: -2, rY: Math.PI / 2 }, // west
    ];
    frameDefs.forEach(({ color, x, y, z, rY }) => {
      const frame = box(1.0, 0.7, 0.04, C.woodDark, x, y, z);
      frame.rotation.y = rY;
      add(frame);
      const canvas = box(0.85, 0.55, 0.02, color, x, y, z + (rY === 0 ? -0.02 : 0));
      canvas.rotation.y = rY;
      if (rY !== 0) {
        canvas.position.x = x + 0.02;
        canvas.position.z = z;
      }
      add(canvas);
    });

    // ===========================================================
    // 11. Standing lamp (corner)
    // ===========================================================
    const lampX = -W / 2 + 1.2;
    const lampZ = D / 2 - 1.2;
    add(cyl(0.04, 0.04, 2.5, C.woodDark, lampX, 1.25, lampZ, 8));      // pole
    add(sphere(0.25, C.lampYellow, lampX, 2.65, lampZ, { emissive: C.lampYellow, emissiveIntensity: 0.6 })); // lamp head
    addCollider(collider(0.5, 2.8, 0.5, lampX, 1.4, lampZ));

    // ===========================================================
    // 12. Sofa (south wall)
    // ===========================================================
    const sofaZ = -D / 2 + 1.2;
    add(box(2.5, 0.5, 0.9, C.teal, 3, 0.35, sofaZ));                   // seat
    add(box(2.5, 0.6, 0.15, C.teal, 3, 0.75, sofaZ - 0.38));           // back
    add(box(0.15, 0.45, 0.9, C.teal, 1.8, 0.55, sofaZ));               // arm left
    add(box(0.15, 0.45, 0.9, C.teal, 4.2, 0.55, sofaZ));               // arm right
    addCollider(collider(2.7, 1.1, 1.1, 3, 0.55, sofaZ));

    // ===========================================================
    // 13. Side tables (2)
    // ===========================================================
    const sideDefs = [
      { x: -7, z: 0 },
      { x: 7,  z: 0 },
    ];
    sideDefs.forEach(({ x, z }) => {
      add(box(0.6, 0.5, 0.6, C.wood, x, 0.25, z));                     // top
      add(cyl(0.05, 0.05, 0.5, C.woodDark, x, 0.25, z, 8));           // centre leg
      addCollider(collider(0.7, 0.55, 0.7, x, 0.275, z));
    });

    // ===========================================================
    // 14. Vase on side table
    // ===========================================================
    add(cyl(0.08, 0.12, 0.35, C.ceramic, -7, 0.68, 0, 12));

    // ===========================================================
    // 15. Streamers from ceiling (10 thin boxes)
    // ===========================================================
    const streamerColors = [C.red, C.blue, C.yellow, C.green, C.pink, C.orange, C.purple, C.teal, C.magenta, C.red];
    for (let si = 0; si < 10; si++) {
      const sx = -W / 2 + 2 + si * (W - 4) / 9;
      const sz = Math.sin(si * 1.3) * 3;
      const sLen = 0.8 + Math.random() * 1.2;
      add(box(0.05, sLen, 0.05, streamerColors[si], sx, H - sLen / 2, sz));
    }

    // ===========================================================
    // 16. Party banner across room
    // ===========================================================
    const bannerSegments = 8;
    const bannerY = H - 0.4;
    const bannerStartX = -W / 2 + 2;
    const bannerEndX = W / 2 - 2;
    const segLen = (bannerEndX - bannerStartX) / bannerSegments;
    const bannerCols = [C.red, C.yellow, C.blue, C.green, C.pink, C.orange, C.purple, C.teal];
    for (let bi = 0; bi < bannerSegments; bi++) {
      const bx = bannerStartX + segLen * (bi + 0.5);
      add(box(segLen - 0.05, 0.3, 0.02, bannerCols[bi], bx, bannerY, 0));
    }

    // ===========================================================
    // Lighting
    // ===========================================================

    // Ambient
    const ambient = new THREE.AmbientLight(0xFFF5E6, 0.4);
    this.scene.add(ambient);

    // Main point light (centre, with shadows)
    const mainLight = new THREE.PointLight(0xFFFAF0, 1.0, 30);
    mainLight.position.set(0, H - 0.5, 0);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.set(1024, 1024);
    mainLight.shadow.camera.near = 0.1;
    mainLight.shadow.camera.far = 25;
    this.scene.add(mainLight);

    // Accent coloured lights
    const accent1 = new THREE.PointLight(0xFF6B6B, 0.5, 15);
    accent1.position.set(-W / 2 + 2, 2.5, D / 2 - 2);
    this.scene.add(accent1);

    const accent2 = new THREE.PointLight(0x4ECDC4, 0.5, 15);
    accent2.position.set(W / 2 - 2, 2.5, -D / 2 + 2);
    this.scene.add(accent2);

    const accent3 = new THREE.PointLight(0xA78BFA, 0.35, 12);
    accent3.position.set(-W / 2 + 2, 1.5, -D / 2 + 2);
    this.scene.add(accent3);

    // ===========================================================
    // Spawn Points
    // ===========================================================
    this.spawnPoints.hider = [
      new THREE.Vector3(-7, 0, 5),
      new THREE.Vector3(7, 0, 5),
      new THREE.Vector3(-7, 0, -5),
      new THREE.Vector3(7, 0, -5),
      new THREE.Vector3(-3, 0, 6),
      new THREE.Vector3(3, 0, -6),
    ];
    this.spawnPoints.seeker = [
      new THREE.Vector3(0, 0, -D / 2 + 1.5), // near "door" (south wall)
    ];
  }

  // -----------------------------------------------------------------------
  // Office Map
  // -----------------------------------------------------------------------
  _buildOffice() {
    // 1. FLOOR & CEILING (20x15)
    // Carpet floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 15),
      mat(COLORS.carpet, { roughness: 0.9 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Ceiling
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 15),
      mat(COLORS.ceiling, { roughness: 1.0 })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 4;
    this.scene.add(ceiling);

    // 2. WALLS (Gray/White theme)
    // North/South (20 wide)
    this._createBox(20, 4, 0.5, mat(0xEEEEEE), { x: 0, y: 2, z: -7.75 }, true); // North
    this._createBox(20, 4, 0.5, mat(0xDDDDDD), { x: 0, y: 2, z: 7.75 }, true);  // South
    // East/West (15 deep)
    this._createBox(0.5, 4, 15, mat(0xD0D0D0), { x: 9.75, y: 2, z: 0 }, true);  // East
    this._createBox(0.5, 4, 15, mat(0xE0E0E0), { x: -9.75, y: 2, z: 0 }, true); // West

    // 3. LIGHTING (Fluorescent style)
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    // Grid of overhead lights
    const positions = [
      { x: -5, z: -4 }, { x: 5, z: -4 },
      { x: -5, z: 4 }, { x: 5, z: 4 }
    ];
    positions.forEach(pos => {
      const light = new THREE.PointLight(0xffffff, 0.5, 10);
      light.position.set(pos.x, 3.8, pos.z);
      light.castShadow = true;
      this.scene.add(light);
    });

    // 4. CUBICLES & DESKS
    const createCubicle = (x, z, rotY = 0) => {
      const group = new THREE.Group();
      group.position.set(x, 0, z);
      group.rotation.y = rotY;

      // Desk
      const deskMat = mat(COLORS.deskWood);
      this._createBox(2.5, 0.1, 1.5, deskMat, { x: 0, y: 0.8, z: 0 }, true, group);
      this._createBox(0.1, 0.8, 1.5, deskMat, { x: -1.2, y: 0.4, z: 0 }, true, group);
      this._createBox(0.1, 0.8, 1.5, deskMat, { x: 1.2, y: 0.4, z: 0 }, true, group);

      // Partitions
      const partMat = mat(COLORS.cubicle);
      this._createBox(2.7, 1.5, 0.1, partMat, { x: 0, y: 0.75, z: -0.8 }, true, group); // Front
      this._createBox(0.1, 1.5, 1.7, partMat, { x: -1.35, y: 0.75, z: 0 }, true, group); // Side

      // PC Monitor
      const monitorBase = mat(COLORS.pcBlack);
      this._createBox(0.8, 0.5, 0.1, monitorBase, { x: 0, y: 1.1, z: -0.5 }, true, group);
      this._createBox(0.1, 0.2, 0.1, monitorBase, { x: 0, y: 0.9, z: -0.5 }, true, group);
      // Screen glow
      const screenMat = new THREE.MeshStandardMaterial({ color: COLORS.screenBlue, emissive: COLORS.screenBlue, emissiveIntensity: 0.2 });
      this._createBox(0.7, 0.4, 0.02, screenMat, { x: 0, y: 1.1, z: -0.44 }, false, group);

      // Chair
      const chairMat = mat(COLORS.pcBlack);
      this._createBox(0.6, 0.1, 0.6, chairMat, { x: 0, y: 0.45, z: 0.4 }, true, group); // Seat
      this._createBox(0.6, 0.6, 0.1, chairMat, { x: 0, y: 0.8, z: 0.65 }, true, group); // Back
      this._createBox(0.1, 0.45, 0.1, chairMat, { x: 0, y: 0.225, z: 0.4 }, true, group); // Base

      this.scene.add(group);
      
      // Add a single large collider for the cubicle
      this.colliders.push(
        new THREE.Box3().setFromObject(group)
      );
    };

    // 4 Cubicles in center
    createCubicle(-2, -2, 0);
    createCubicle(2, -2, 0);
    createCubicle(-2, 2, Math.PI);
    createCubicle(2, 2, Math.PI);

    // 5. WATER COOLER (Corner)
    const waterCooler = new THREE.Group();
    waterCooler.position.set(-8, 0, -6);
    this._createBox(0.6, 1.0, 0.6, mat(0xFFFFFF), { x: 0, y: 0.5, z: 0 }, true, waterCooler); // Base
    this._createCylinder(0.25, 0.6, mat(0x88CCFF, { transparent: true, opacity: 0.6 }), { x: 0, y: 1.3, z: 0 }, true, waterCooler); // Jug
    this.scene.add(waterCooler);
    this.colliders.push(new THREE.Box3().setFromObject(waterCooler));

    // 6. FILING CABINETS (Against walls)
    const cabMat = mat(0x999999);
    for (let i = 0; i < 4; i++) {
      this._createBox(0.8, 1.5, 0.6, cabMat, { x: 7 + (i * 0.85), y: 0.75, z: -7.2 }, true);
    }

    // 7. SPAWN POINTS
    this.spawnPoints = {
      seeker: [new THREE.Vector3(0, 0, 6)], // Near south wall
      hider: [
        new THREE.Vector3(-6, 0, -4),
        new THREE.Vector3(6, 0, -4),
        new THREE.Vector3(-6, 0, 4),
        new THREE.Vector3(6, 0, 4),
        new THREE.Vector3(-8, 0, 0),
        new THREE.Vector3(8, 0, 0),
      ],
    };
  }
}
