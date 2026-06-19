/**
 * MapBuilder.js
 *
 * Builds all game maps from Three.js primitives.
 * Maps:
 *   party-room     — colourful birthday party room
 *   office         — corporate cubicle office
 *   haunted-mansion— dark green damask hallways (from screenshots)
 *   farmhouse      — mint/teal barn interior (from screenshots)
 *   ballroom       — grand chandelier ballroom (from screenshots)
 */
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Shared colour palette
// ---------------------------------------------------------------------------
const C = {
  // Neutrals
  white:      0xFFFFFF,
  black:      0x111111,
  cream:      0xF5F0E8,
  beige:      0xE8D5B7,
  gray:       0x888888,
  darkGray:   0x333333,

  // Woods
  wood:       0x8B5E3C,
  woodDark:   0x5C3D1E,
  woodLight:  0xC4A484,
  mahogany:   0x4A1C0C,

  // Party
  wallNorth:  0xFF6B6B,
  wallSouth:  0x4ECDC4,
  wallEast:   0xFFE66D,
  wallWest:   0xA78BFA,
  ceiling:    0xF8F8F8,
  floorA:     0xF5F0E8,
  floorB:     0xC2785C,

  red:        0xE63946,
  blue:       0x457B9D,
  green:      0x2A9D8F,
  pink:       0xF4A7BB,
  yellow:     0xFFD166,
  orange:     0xF4845F,
  teal:       0x1D8A7E,
  purple:     0x7B2D8E,
  magenta:    0xC850A0,
  ceramic:    0x5B9BD5,
  lampYellow: 0xFFE4A0,

  // Office
  carpet:     0x3D4C53,
  cubicle:    0x8C9AA1,
  deskWood:   0xC4A484,
  pcBlack:    0x1A1A1A,
  screenBlue: 0x4A90E2,

  // Mansion
  mansionWall:   0x1B3320,   // deep forest green
  mansionWallLt: 0x2D5038,   // lighter green
  mansionFloorA: 0x1A1A1A,   // black tile
  mansionFloorB: 0xEEEEEE,   // white tile
  mansionWood:   0x3D1F0A,   // dark walnut
  goldFrame:     0xD4AF37,   // gold
  mansionCeil:   0x0D1F12,   // very dark green
  warmLight:     0xFF9D4A,   // warm amber

  // Farmhouse
  farmWall:    0x3DBDBD,   // teal/mint
  farmFloor:   0x5CB85C,   // grass green
  farmStraw:   0xD4A843,   // hay golden
  farmStrawDk: 0xA87C2A,   // darker hay
  farmWhite:   0xF0F0F0,   // fence white
  farmRed:     0xB22222,   // barn red
  farmCow:     0x1A1A1A,   // cow black
  farmCloud:   0xF0F0F0,   // cloud white
  farmFloorDk: 0x4A9E4A,   // darker grass

  // Ballroom
  ballWall:    0x6B3D1E,   // rich brown wood
  ballWallLt:  0x8B5E3C,
  ballFloorA:  0xE8D5B7,   // cream marble
  ballFloorB:  0x2C2C2C,   // dark marble
  ballCeil:    0x4A2A0A,   // dark wood ceiling
  ballGold:    0xD4AF37,   // gold trim
  ballWhite:   0xF5F5F5,   // column white
  ballColumn:  0xE8E0D0,   // marble column
  chandGold:   0xFFD700,   // chandelier gold
  chandCrystal:0xD0EEFF,   // crystal
  balloonR:    0xFF4444,
  balloonB:    0x4488FF,
  balloonY:    0xFFDD00,
  balloonG:    0x44CC44,
  pianoBlack:  0x0A0A0A,
};

// ---------------------------------------------------------------------------
// Helper constructors
// ---------------------------------------------------------------------------

/** MeshStandardMaterial from hex. */
function mat(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0.1, color, ...extra });
}

/** Canvas texture with procedural pattern. */
function canvasMat(drawFn, size = 256, extra = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, metalness: 0.05, ...extra });
}

/** Create box mesh. */
function box(w, h, d, matOrColor, x, y, z, rotY = 0) {
  const m = typeof matOrColor === 'number'
    ? new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(matOrColor))
    : new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matOrColor);
  m.position.set(x, y, z);
  if (rotY) m.rotation.y = rotY;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Create cylinder mesh. */
function cyl(rTop, rBot, h, matOrColor, x, y, z, segments = 16) {
  const m = typeof matOrColor === 'number'
    ? new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, segments), mat(matOrColor))
    : new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, segments), matOrColor);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Create sphere mesh. */
function sphere(r, matOrColor, x, y, z) {
  const m = typeof matOrColor === 'number'
    ? new THREE.Mesh(new THREE.SphereGeometry(r, 20, 20), mat(matOrColor))
    : new THREE.Mesh(new THREE.SphereGeometry(r, 20, 20), matOrColor);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Invisible AABB collider. */
function collider(w, h, d, x, y, z) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  m.position.set(x, y, z);
  m.userData.isCollider = true;
  return m;
}

// ---------------------------------------------------------------------------
// MapBuilder
// ---------------------------------------------------------------------------
export class MapBuilder {
  constructor(scene) {
    this.scene = scene;
    this.objects = [];
    this.colliders = [];
    this.spawnPoints = { hider: [], seeker: [] };
    // Store lights so we can dispose them
    this._lights = [];
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  buildMap(mapId = 'party-room') {
    switch (mapId) {
      case 'office':          this._buildOffice();         break;
      case 'haunted-mansion': this._buildHauntedMansion(); break;
      case 'farmhouse':       this._buildFarmhouse();      break;
      case 'ballroom':        this._buildBallroom();       break;
      case 'party-room':
      default:                this._buildPartyRoom();      break;
    }
  }

  getColliders() { return this.colliders; }
  getSpawnPoints() { return this.spawnPoints; }

  dispose() {
    const all = [...this.objects, ...this.colliders];
    for (const obj of all) {
      this.scene.remove(obj);
      obj.geometry?.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    }
    for (const light of this._lights) {
      this.scene.remove(light);
    }
    this.objects = [];
    this.colliders = [];
    this._lights = [];
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  _add(mesh) {
    this.scene.add(mesh);
    this.objects.push(mesh);
    return mesh;
  }

  _addCol(c) {
    this.scene.add(c);
    this.colliders.push(c);
    return c;
  }

  _addLight(light) {
    this.scene.add(light);
    this._lights.push(light);
    return light;
  }

  // -----------------------------------------------------------------------
  // PARTY ROOM
  // -----------------------------------------------------------------------
  _buildPartyRoom() {
    const W = 60, D = 50, H = 5;
    const add = m => this._add(m);
    const addC = c => this._addCol(c);

    // Floor — checkered tiles
    for (let ix = 0; ix < W; ix++) {
      for (let iz = 0; iz < D; iz++) {
        const color = (ix + iz) % 2 === 0 ? C.floorA : C.floorB;
        const tile = box(1, 0.05, 1, color, ix - W / 2 + 0.5, 0, iz - D / 2 + 0.5);
        tile.receiveShadow = true; tile.castShadow = false;
        add(tile);
      }
    }

    // Walls
    const wt = 0.2;
    add(box(W, H, wt, C.wallNorth, 0, H / 2, D / 2));
    addC(collider(W, H, wt, 0, H / 2, D / 2));
    add(box(W, H, wt, C.wallSouth, 0, H / 2, -D / 2));
    addC(collider(W, H, wt, 0, H / 2, -D / 2));
    add(box(wt, H, D, C.wallEast, W / 2, H / 2, 0));
    addC(collider(wt, H, D, W / 2, H / 2, 0));
    add(box(wt, H, D, C.wallWest, -W / 2, H / 2, 0));
    addC(collider(wt, H, D, -W / 2, H / 2, 0));
    const ceil = box(W, 0.1, D, C.ceiling, 0, H, 0);
    ceil.castShadow = false;
    add(ceil);

    // Central table
    const tableY = 0.75;
    add(box(3.0, 0.1, 1.2, C.wood, 0, tableY, 0));
    [[-1.3,-0.45],[1.3,-0.45],[-1.3,0.45],[1.3,0.45]].forEach(([lx,lz]) =>
      add(box(0.1, tableY, 0.1, C.woodDark, lx, tableY / 2, lz)));
    addC(collider(3.2, tableY + 0.1, 1.4, 0, (tableY + 0.1) / 2, 0));

    // Chairs
    const chairCols = [C.red, C.blue, C.green, C.red, C.blue, C.green];
    [[-1.0,-1.0],[0,-1.0],[1.0,-1.0],[-1.0,1.0],[0,1.0],[1.0,1.0]].forEach(([cx,cz],i) => {
      const col = chairCols[i];
      add(box(0.4,0.05,0.4, col, cx, 0.45, cz));
      add(box(0.4,0.5,0.05, col, cx, 0.7, cz+(cz>0?0.18:-0.18)));
      const lh = 0.45;
      [[-0.15,-0.15],[0.15,-0.15],[-0.15,0.15],[0.15,0.15]].forEach(([lx,lz2]) =>
        add(cyl(0.03,0.03,lh, C.woodDark, cx+lx, lh/2, cz+lz2, 8)));
      addC(collider(0.5,1.0,0.5, cx, 0.5, cz));
    });

    // Birthday cake
    add(cyl(0.25,0.25,0.2, C.white, 0, tableY+0.15, 0, 24));
    add(cyl(0.26,0.26,0.03, C.pink, 0, tableY+0.265, 0, 24));
    for (let ci = 0; ci < 5; ci++) {
      const a = (ci/5)*Math.PI*2;
      add(cyl(0.015,0.015,0.1, C.yellow, Math.cos(a)*0.12, tableY+0.33, Math.sin(a)*0.12, 6));
      add(sphere(0.02, C.orange, Math.cos(a)*0.12, tableY+0.4, Math.sin(a)*0.12));
    }

    // Gift boxes
    [{color:C.red,x:-7,z:4,s:0.5},{color:C.blue,x:-6,z:5,s:0.4},{color:C.yellow,x:7,z:-5,s:0.45},{color:C.green,x:6,z:-4,s:0.35}]
    .forEach(({color,x,z,s}) => {
      add(box(s,s,s, color, x, s/2, z));
      add(box(s+0.05,0.04,0.08, C.yellow, x, s+0.02, z));
      add(box(0.08,0.04,s+0.05, C.yellow, x, s+0.02, z));
      addC(collider(s+0.1,s+0.1,s+0.1, x, s/2, z));
    });

    // Balloons
    [C.red,C.blue,C.yellow,C.green,C.pink,C.orange,C.purple,C.teal].forEach((col,i) => {
      const bx = [-6,-3,-1,2,4,6,-5,3][i], bz = [3,-4,5,-3,4,-5,-2,2][i];
      const by = H - 0.5 - Math.random()*0.4;
      add(sphere(0.2, col, bx, by, bz));
      add(cyl(0.008,0.008, by-0.2, C.white, bx, (by-0.2)/2, bz, 4));
    });

    // Bookshelf
    const bsX = W/2-0.35;
    add(box(0.6,2.0,1.8, C.wood, bsX, 1.0, 2));
    for (let si=0;si<4;si++) add(box(0.55,0.04,1.7, C.woodDark, bsX, 0.3+si*0.5, 2));
    [C.red,C.blue,C.green,C.yellow,C.purple,C.orange,C.pink,C.teal].forEach((bc,bi) =>
      add(box(0.04,0.4,0.3, bc, bsX-0.1, 0.55+Math.floor(bi/4)*0.5, 1.4+(bi%4)*0.4)));
    addC(collider(0.7,2.2,2.0, bsX, 1.1, 2));

    // Plants
    [[-W/2+1,-D/2+1],[W/2-1,D/2-1]].forEach(([px,pz]) => {
      add(cyl(0.2,0.25,0.4, C.woodDark, px, 0.2, pz, 12));
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.35,0.9,12), mat(C.green));
      cone.position.set(px,0.85,pz); cone.castShadow=true; cone.receiveShadow=true; add(cone);
      addC(collider(0.5,1.3,0.5, px, 0.65, pz));
    });

    // Rug
    add(box(4,0.02,3, C.magenta, 0, 0.03, 0));

    // Streamers + banner
    const strCols=[C.red,C.blue,C.yellow,C.green,C.pink,C.orange,C.purple,C.teal,C.magenta,C.red];
    for(let si=0;si<10;si++){
      const sx=-W/2+2+si*(W-4)/9, sz=Math.sin(si*1.3)*3;
      const sLen=0.8+Math.random()*1.2;
      add(box(0.05,sLen,0.05, strCols[si], sx, H-sLen/2, sz));
    }
    const bnCols=[C.red,C.yellow,C.blue,C.green,C.pink,C.orange,C.purple,C.teal];
    const bStart=-W/2+2, bEnd=W/2-2, bSeg=8, bLen=(bEnd-bStart)/bSeg;
    for(let bi=0;bi<bSeg;bi++) add(box(bLen-0.05,0.3,0.02, bnCols[bi], bStart+bLen*(bi+0.5), H-0.4, 0));

    // Sofa
    const sofaZ = -D/2+1.2;
    add(box(2.5,0.5,0.9, C.teal, 3, 0.35, sofaZ));
    add(box(2.5,0.6,0.15, C.teal, 3, 0.75, sofaZ-0.38));
    add(box(0.15,0.45,0.9, C.teal, 1.8, 0.55, sofaZ));
    add(box(0.15,0.45,0.9, C.teal, 4.2, 0.55, sofaZ));
    addC(collider(2.7,1.1,1.1, 3, 0.55, sofaZ));

    // Lamp
    const lx=-W/2+1.2, lz=D/2-1.2;
    add(cyl(0.04,0.04,2.5, C.woodDark, lx, 1.25, lz, 8));
    add(sphere(0.25, mat(C.lampYellow,{emissive:C.lampYellow,emissiveIntensity:0.6}), lx, 2.65, lz));
    addC(collider(0.5,2.8,0.5, lx, 1.4, lz));

    // Lighting
    this._addLight(new THREE.HemisphereLight(0xffffff, 0x444444, 0.6));
    const dl = new THREE.DirectionalLight(0xffffff, 1.2);
    dl.position.set(10,20,10); dl.castShadow=true;
    dl.shadow.mapSize.set(2048,2048);
    const d=30; dl.shadow.camera.left=-d; dl.shadow.camera.right=d;
    dl.shadow.camera.top=d; dl.shadow.camera.bottom=-d;
    dl.shadow.camera.near=0.1; dl.shadow.camera.far=60; dl.shadow.bias=-0.0005;
    this._addLight(dl);
    const a1=new THREE.PointLight(0xFF6B6B,0.5,15); a1.position.set(-W/2+2,2.5,D/2-2); this._addLight(a1);
    const a2=new THREE.PointLight(0x4ECDC4,0.5,15); a2.position.set(W/2-2,2.5,-D/2+2); this._addLight(a2);

    // Fog
    this.scene.fog = new THREE.Fog(0xFFE8D0, 15, 40);
    this.scene.background = new THREE.Color(0xFFE8D0);

    // Spawn points
    this.spawnPoints.hider = [
      {x:-7,y:0,z:5},{x:7,y:0,z:5},{x:-7,y:0,z:-5},{x:7,y:0,z:-5},
      {x:-3,y:0,z:6},{x:3,y:0,z:-5},
    ];
    this.spawnPoints.seeker = [{x:0,y:0,z:-D/2+2}];
  }

  // -----------------------------------------------------------------------
  // OFFICE
  // -----------------------------------------------------------------------
  _buildOffice() {
    const W=40, D=30, H=5;
    const add = m => this._add(m);
    const addC = c => this._addCol(c);

    // Floor carpet
    const floorMat = mat(C.carpet, {roughness:1.0});
    add(box(W, 0.1, D, floorMat, 0, 0, 0));
    addC(collider(W,0.1,D, 0, -0.05, 0));

    // Ceiling tiles
    const ceilMat = canvasMat((ctx,sz) => {
      ctx.fillStyle = '#dddddd';
      ctx.fillRect(0,0,sz,sz);
      ctx.strokeStyle = '#bbbbbb';
      ctx.lineWidth = 2;
      for (let i=0;i<=4;i++) { ctx.beginPath(); ctx.moveTo(i*sz/4,0); ctx.lineTo(i*sz/4,sz); ctx.stroke(); }
      for (let i=0;i<=4;i++) { ctx.beginPath(); ctx.moveTo(0,i*sz/4); ctx.lineTo(sz,i*sz/4); ctx.stroke(); }
    }, 256);
    const ceil = box(W,0.1,D, ceilMat, 0, H, 0);
    ceil.castShadow=false; add(ceil);

    // Walls
    const wallMat = mat(0xEEEEEE);
    add(box(W,H,0.3, mat(0xE0E0E0), 0, H/2, -D/2)); addC(collider(W,H,0.3, 0,H/2,-D/2));
    add(box(W,H,0.3, mat(0xE0E0E0), 0, H/2,  D/2)); addC(collider(W,H,0.3, 0,H/2, D/2));
    add(box(0.3,H,D, wallMat, -W/2, H/2, 0)); addC(collider(0.3,H,D, -W/2,H/2,0));
    add(box(0.3,H,D, wallMat,  W/2, H/2, 0)); addC(collider(0.3,H,D,  W/2,H/2,0));

    // Fluorescent lights on ceiling
    const lightBarMat = mat(C.white, {emissive:C.white, emissiveIntensity:0.5});
    [[-5,-4],[5,-4],[-5,4],[5,4]].forEach(([lx,lz]) => {
      add(box(3,0.05,0.3, lightBarMat, lx, H-0.06, lz));
      const pl = new THREE.PointLight(0xffffff, 0.6, 10);
      pl.position.set(lx, H-0.5, lz);
      this._addLight(pl);
    });

    // Cubicles (4 in center)
    const deskMat = mat(C.deskWood);
    const partMat = mat(C.cubicle);
    const monitorMat = mat(C.pcBlack);
    const screenMat = mat(C.screenBlue, {emissive:C.screenBlue, emissiveIntensity:0.3});
    const chairMat = mat(C.pcBlack);

    const createCubicle = (x, z, rotY=0) => {
      const g = new THREE.Group();
      g.position.set(x,0,z); g.rotation.y=rotY;

      // Desk
      const desk = box(2.5,0.1,1.5, deskMat, 0,0.8,0);
      g.add(desk);
      g.add(box(0.1,0.8,1.5, deskMat, -1.2,0.4,0));
      g.add(box(0.1,0.8,1.5, deskMat,  1.2,0.4,0));

      // Partitions
      g.add(box(2.7,1.5,0.1, partMat, 0,0.75,-0.8));
      g.add(box(0.1,1.5,1.7, partMat, -1.35,0.75,0));

      // Monitor
      g.add(box(0.8,0.5,0.1, monitorMat, 0,1.1,-0.5));
      g.add(box(0.1,0.2,0.1, monitorMat, 0,0.9,-0.5));
      g.add(box(0.7,0.4,0.02, screenMat, 0,1.1,-0.44));

      // Chair
      g.add(box(0.6,0.1,0.6, chairMat, 0,0.45,0.4));
      g.add(box(0.6,0.6,0.1, chairMat, 0,0.8,0.65));
      g.add(box(0.1,0.45,0.1, chairMat, 0,0.225,0.4));

      this.scene.add(g);
      this.objects.push(...g.children);
      this.objects.push(g);

      // Collider
      const col = collider(2.8, 1.6, 1.9, x, 0.8, z);
      col.rotation.y = rotY;
      this._addCol(col);
    };

    createCubicle(-3,-3,0);
    createCubicle(3,-3,0);
    createCubicle(-3,3,Math.PI);
    createCubicle(3,3,Math.PI);

    // Water cooler
    add(box(0.6,1.0,0.6, mat(0xFFFFFF), -8,0.5,-6));
    add(cyl(0.25,0.25,0.6, mat(0x88CCFF,{transparent:true,opacity:0.6}), -8,1.3,-6));
    addC(collider(0.8,1.3,0.8, -8,0.65,-6));

    // Filing cabinets
    const cabMat = mat(0x999999);
    for(let i=0;i<4;i++) {
      add(box(0.8,1.5,0.6, cabMat, 7+i*0.85, 0.75, -7));
      addC(collider(0.8,1.5,0.6, 7+i*0.85, 0.75, -7));
    }

    // Ambient + directional light
    this._addLight(new THREE.HemisphereLight(0xffffff, 0x555555, 0.7));
    const dl=new THREE.DirectionalLight(0xffffff,1.0);
    dl.position.set(5,20,5); dl.castShadow=true;
    dl.shadow.mapSize.set(2048,2048);
    const dd=12; dl.shadow.camera.left=-dd; dl.shadow.camera.right=dd;
    dl.shadow.camera.top=dd; dl.shadow.camera.bottom=-dd;
    dl.shadow.camera.near=0.1; dl.shadow.camera.far=50; dl.shadow.bias=-0.0005;
    this._addLight(dl);

    this.scene.fog = new THREE.Fog(0xCCCCCC, 15, 40);
    this.scene.background = new THREE.Color(0xCCCCCC);

    this.spawnPoints.hider = [{x:-6,y:0,z:-4},{x:6,y:0,z:-4},{x:-6,y:0,z:4},{x:6,y:0,z:4},{x:-8,y:0,z:0},{x:8,y:0,z:0}];
    this.spawnPoints.seeker = [{x:0,y:0,z:6}];
  }

  // -----------------------------------------------------------------------
  // HAUNTED MANSION — dark green damask walls, checkered B&W floor, gold frames
  // -----------------------------------------------------------------------
  _buildHauntedMansion() {
    const W=48, D=32, H=5;
    const add = m => this._add(m);
    const addC = c => this._addCol(c);

    // ---- FLOOR: Checkered B&W tiles ----
    const tileSz = 1.2;
    const tilesW = Math.ceil(W / tileSz);
    const tilesD = Math.ceil(D / tileSz);
    for (let ix=0; ix<tilesW; ix++) {
      for (let iz=0; iz<tilesD; iz++) {
        const color = (ix+iz) % 2 === 0 ? C.mansionFloorA : C.mansionFloorB;
        const tile = box(tileSz,0.06,tileSz, mat(color,{roughness:0.3,metalness:0.1}),
          ix*tileSz - W/2 + tileSz/2, 0, iz*tileSz - D/2 + tileSz/2);
        tile.castShadow=false; tile.receiveShadow=true;
        add(tile);
      }
    }

    // ---- WALLS: Deep green damask ----
    const wallMat = canvasMat((ctx,sz) => {
      // Base dark green
      ctx.fillStyle = '#1B3320';
      ctx.fillRect(0,0,sz,sz);
      // Damask-style light pattern (simplified floral/diamond)
      ctx.fillStyle = 'rgba(45,80,56,0.8)';
      const cell = sz/4;
      for (let row=0;row<4;row++) {
        for (let col=0;col<4;col++) {
          const cx=col*cell+cell/2, cy=row*cell+cell/2;
          ctx.save();
          ctx.translate(cx,cy);
          // Diamond centre
          ctx.beginPath();
          ctx.moveTo(0,-cell*0.35);
          ctx.lineTo(cell*0.2,0);
          ctx.lineTo(0,cell*0.35);
          ctx.lineTo(-cell*0.2,0);
          ctx.closePath();
          ctx.fill();
          // Leaves
          for (let a=0;a<4;a++) {
            ctx.save(); ctx.rotate(a*Math.PI/2);
            ctx.beginPath();
            ctx.ellipse(0,-cell*0.3, cell*0.08, cell*0.2, 0,0,Math.PI*2);
            ctx.fill();
            ctx.restore();
          }
          ctx.restore();
        }
      }
    }, 512, {roughness:0.9, metalness:0.0});
    wallMat.map.repeat.set(2,1);

    const wt = 0.2;
    // North wall
    const wN = box(W,H,wt, wallMat, 0,H/2, D/2);
    add(wN); addC(collider(W,H,wt, 0,H/2, D/2));
    // South wall (with doorway opening)
    add(box((W-3)/2,H,wt, wallMat, -(3+(W-3)/2)/2,H/2,-D/2));
    add(box((W-3)/2,H,wt, wallMat,  (3+(W-3)/2)/2,H/2,-D/2));
    add(box(3,H*0.35,wt, wallMat, 0,H-H*0.35/2,-D/2)); // above door
    addC(collider(W,H,wt, 0,H/2,-D/2));
    // East wall
    add(box(wt,H,D, wallMat, W/2,H/2,0)); addC(collider(wt,H,D, W/2,H/2,0));
    // West wall
    add(box(wt,H,D, wallMat, -W/2,H/2,0)); addC(collider(wt,H,D, -W/2,H/2,0));

    // ---- WAINSCOTING (dark wood lower panels) ----
    const wainH = 1.2;
    const wainMat = mat(C.mansionWood, {roughness:0.6,metalness:0.05});
    add(box(W,wainH,0.08, wainMat, 0,wainH/2, D/2-0.12));  // N
    add(box(W,wainH,0.08, wainMat, 0,wainH/2,-D/2+0.12));  // S
    add(box(0.08,wainH,D, wainMat, W/2-0.12,wainH/2,0));   // E
    add(box(0.08,wainH,D, wainMat,-W/2+0.12,wainH/2,0));   // W
    // Chair rail
    const railMat = mat(C.goldFrame, {roughness:0.3,metalness:0.6});
    add(box(W,0.06,0.07, railMat, 0,wainH, D/2-0.1));
    add(box(W,0.06,0.07, railMat, 0,wainH,-D/2+0.1));
    add(box(0.07,0.06,D, railMat, W/2-0.1,wainH,0));
    add(box(0.07,0.06,D, railMat,-W/2+0.1,wainH,0));

    // ---- CEILING: dark green with coving ----
    const ceilMat = mat(C.mansionCeil, {roughness:0.9});
    const ceil = box(W,0.15,D, ceilMat, 0,H,0); ceil.castShadow=false; add(ceil);
    // Coving trim
    add(box(W,0.12,0.12, mat(C.woodDark), 0,H-0.06, D/2-0.06));
    add(box(W,0.12,0.12, mat(C.woodDark), 0,H-0.06,-D/2+0.06));
    add(box(0.12,0.12,D, mat(C.woodDark), W/2-0.06,H-0.06,0));
    add(box(0.12,0.12,D, mat(C.woodDark),-W/2+0.06,H-0.06,0));

    // ---- GOLD PICTURE FRAMES ----
    const frameMat = mat(C.goldFrame, {roughness:0.2,metalness:0.8});
    const paintingContents = [0x8B3A3A, 0x3A5C8B, 0x5C3A8B, 0x3A8B5C];
    [
      {x:-5, y:2.8, z:D/2-0.12, rY:0},
      {x:2,  y:2.5, z:D/2-0.12, rY:0},
      {x:-4, y:2.6, z:-D/2+0.12,rY:Math.PI},
      {x:6,  y:2.8, z:-D/2+0.12,rY:Math.PI},
    ].forEach(({x,y,z,rY},i) => {
      const fw=1.2, fh=0.9;
      const frame = box(fw+0.15,fh+0.12,0.06, frameMat, x,y,z, rY); add(frame);
      // Inner painting
      const paintMat = mat(paintingContents[i], {roughness:0.95});
      const painting = box(fw,fh,0.04, paintMat, x,y,z+(rY===0?-0.04:0.04)); painting.rotation.y=rY; add(painting);
    });

    // ---- WALL SCONCES ----
    const sconceMat = mat(C.goldFrame, {roughness:0.2,metalness:0.8});
    const glowMat = mat(C.warmLight, {emissive:C.warmLight,emissiveIntensity:0.8});
    [[-8,D/2-0.25],[0,D/2-0.25],[8,D/2-0.25],[-8,-D/2+0.25],[0,-D/2+0.25],[8,-D/2+0.25]].forEach(([sx,sz]) => {
      add(box(0.25,0.4,0.15, sconceMat, sx,2.8,sz));
      add(cyl(0.06,0.08,0.15, glowMat, sx,2.6,sz+0.1*(sz>0?-1:1), 8));
      const pl=new THREE.PointLight(C.warmLight, 0.8, 6);
      pl.position.set(sx,2.5,sz+(sz>0?-0.5:0.5)); this._addLight(pl);
    });

    // ---- DECORATIVE BUNTING (coloured triangle flags) ----
    const buntingColors=[C.red,C.blue,C.yellow,C.green,C.pink,C.orange,C.purple,C.teal];
    for(let bi=0;bi<8;bi++) {
      const tri=new THREE.Mesh(
        new THREE.ConeGeometry(0.18,0.3,3),
        mat(buntingColors[bi])
      );
      tri.position.set(-7+bi*2, H-0.4, 0);
      tri.rotation.z=Math.PI;
      tri.castShadow=true;
      add(tri);
    }
    // Bunting string
    add(box(16,0.03,0.03, mat(C.woodDark), 0,H-0.3,0));

    // ---- LARGE VASE ON PEDESTAL ----
    const pedMat = mat(C.beige, {roughness:0.5});
    add(box(0.6,1.0,0.6, pedMat, 6,0.5, D/2-1.5)); addC(collider(0.7,1.1,0.7, 6,0.55,D/2-1.5));
    add(cyl(0.2,0.3,0.7, mat(C.beige,{roughness:0.4}), 6,1.35,D/2-1.5, 16));
    add(cyl(0.3,0.15,0.2, mat(C.beige,{roughness:0.4}), 6,1.8,D/2-1.5, 16));

    // ---- TALL DOOR (south wall center) ----
    const doorMat = mat(C.woodDark, {roughness:0.6});
    add(box(0.08,H*0.65,1.4, doorMat, 0,H*0.65/2,-D/2+0.12));
    // Doorknob
    add(sphere(0.05, mat(C.goldFrame,{roughness:0.1,metalness:0.9}), 0.5,H*0.3,-D/2+0.2));

    // ---- LIGHTING ----
    this._addLight(new THREE.HemisphereLight(0x2D4020, 0x0A0A0A, 0.4));
    const dl=new THREE.DirectionalLight(0xFFC070,0.6);
    dl.position.set(0,10,0); dl.castShadow=true;
    dl.shadow.mapSize.set(2048,2048);
    const dm=14; dl.shadow.camera.left=-dm; dl.shadow.camera.right=dm;
    dl.shadow.camera.top=dm; dl.shadow.camera.bottom=-dm;
    dl.shadow.camera.near=0.1; dl.shadow.camera.far=30; dl.shadow.bias=-0.001;
    this._addLight(dl);
    // Moody centre point light
    const cpl=new THREE.PointLight(0xFFAA55,0.5,25);
    cpl.position.set(0,H-0.5,0); this._addLight(cpl);

    this.scene.fog = new THREE.Fog(0x0D1A10, 10, 35);
    this.scene.background = new THREE.Color(0x0D1A10);

    this.spawnPoints.hider = [
      {x:-8,y:0,z:5},{x:8,y:0,z:5},{x:-8,y:0,z:-5},{x:8,y:0,z:-5},
      {x:0,y:0,z:6},{x:0,y:0,z:-5},{x:-4,y:0,z:0},{x:4,y:0,z:0},
    ];
    this.spawnPoints.seeker = [{x:0,y:0,z:-D/2+2}];
  }

  // -----------------------------------------------------------------------
  // FARMHOUSE — mint/teal walls, grass floor, hay bales, cows
  // -----------------------------------------------------------------------
  _buildFarmhouse() {
    const W=44, D=32, H=5;
    const add = m => this._add(m);
    const addC = c => this._addCol(c);

    // ---- FLOOR: Grass ----
    const grassMat = canvasMat((ctx,sz) => {
      // Base green
      ctx.fillStyle = '#5CB85C';
      ctx.fillRect(0,0,sz,sz);
      // Grass blades variation
      for(let i=0;i<80;i++){
        const gx=Math.random()*sz, gy=Math.random()*sz;
        const shade=Math.floor(60+Math.random()*30);
        ctx.fillStyle=`rgb(${shade},${120+Math.floor(Math.random()*40)},${shade})`;
        ctx.fillRect(gx,gy,2,4+Math.random()*4);
      }
    },256,{roughness:1.0,metalness:0.0});
    grassMat.map.repeat.set(5,4);
    add(box(W,0.08,D, grassMat, 0,0,0));

    // ---- CEILING: Teal with fluorescent panels ----
    const ceilMat = mat(C.farmWall, {roughness:0.9});
    const ceil=box(W,0.15,D, ceilMat, 0,H,0); ceil.castShadow=false; add(ceil);
    // White ceiling panels
    const panelMat=mat(C.white,{emissive:C.white,emissiveIntensity:0.3});
    [[-5,0],[0,0],[5,0]].forEach(([lx,lz])=>{
      add(box(3.5,0.05,1.5, panelMat, lx,H-0.08,lz));
      const pl=new THREE.PointLight(0xffffff,0.8,14); pl.position.set(lx,H-0.6,lz); this._addLight(pl);
    });

    // ---- WALLS: Teal ----
    const wallMat = mat(C.farmWall, {roughness:0.8});
    const wt=0.25;
    add(box(W,H,wt, wallMat, 0,H/2, D/2)); addC(collider(W,H,wt, 0,H/2, D/2));
    add(box(W,H,wt, wallMat, 0,H/2,-D/2)); addC(collider(W,H,wt, 0,H/2,-D/2));
    add(box(wt,H,D, wallMat, W/2,H/2,0)); addC(collider(wt,H,D, W/2,H/2,0));
    add(box(wt,H,D, wallMat,-W/2,H/2,0)); addC(collider(wt,H,D,-W/2,H/2,0));

    // ---- HAY BALES ----
    const hayMat = mat(C.farmStraw, {roughness:1.0});
    const hayDkMat = mat(C.farmStrawDk, {roughness:1.0});
    // Stack 1 (left-center)
    [[0,0],[0.9,0],[0,0.9],[0.9,0.9],[0.45,1.5]].forEach(([bx,bz],i)=>{
      const hb=box(0.85,0.7,0.85, i%2===0?hayMat:hayDkMat, -5+bx, 0.35+Math.floor(i/4)*0.7, -2+bz);
      add(hb);
    });
    addC(collider(2.0,1.5,2.0, -5,0.75,-1.5));
    // Stack 2 (right)
    [[0,0],[0.9,0],[0.45,0.75]].forEach(([bx,bz])=>{
      add(box(0.85,0.7,0.85, hayMat, 5+bx, 0.35, 3+bz));
    });
    addC(collider(1.8,0.75,1.8, 5.45,0.375,3.4));
    // Individual hay rolls (cylinders)
    add(cyl(0.4,0.4,0.85, hayMat, 3,0.4,0,16));
    add(cyl(0.4,0.4,0.85, hayDkMat, -2,0.4,-5,16));
    addC(collider(0.9,0.85,0.9, 3,0.4,0));
    addC(collider(0.9,0.85,0.9, -2,0.4,-5));

    // ---- WHITE PICKET FENCE ----
    const fenceMat = mat(C.farmWhite, {roughness:0.8});
    // Horizontal rails
    add(box(6,0.1,0.08, fenceMat, 0,0.6,-1)); add(box(6,0.1,0.08, fenceMat, 0,1.1,-1));
    // Pickets
    for(let pi=0;pi<7;pi++) add(box(0.1,1.2,0.08, fenceMat, -3+pi*1.0,0.6,-1));
    addC(collider(6.2,1.3,0.2, 0,0.65,-1));

    // ---- COW ----
    const cowBlack=mat(C.farmCow);
    const cowWhite=mat(C.farmWhite);
    const cowBrown=mat(0x5C3D1E);
    const cowGrp=new THREE.Group(); cowGrp.position.set(-9,0,0);
    // Body
    const cowBody=box(1.4,0.9,2.2, cowWhite, 0,0.9,0);
    cowGrp.add(cowBody);
    // Black patches
    const p1=box(0.6,0.4,0.5, cowBlack, 0.3,1.0,0.4); cowGrp.add(p1);
    const p2=box(0.5,0.35,0.6, cowBlack, -0.3,0.9,-0.3); cowGrp.add(p2);
    // Head
    const cowHead=box(0.7,0.7,0.8, cowWhite, 0,1.6,1.1); cowGrp.add(cowHead);
    const snout=box(0.5,0.4,0.3, cowBrown, 0,1.4,1.5); cowGrp.add(snout);
    // Ears
    cowGrp.add(box(0.15,0.25,0.08, cowWhite, 0.45,1.85,1.1));
    cowGrp.add(box(0.15,0.25,0.08, cowWhite,-0.45,1.85,1.1));
    // Horns
    cowGrp.add(cyl(0.03,0.06,0.4, cowBrown, 0.38,2.05,1.05, 6));
    cowGrp.add(cyl(0.03,0.06,0.4, cowBrown,-0.38,2.05,1.05, 6));
    // Legs
    [[0.45,-0.8],[-0.45,-0.8],[0.45,0.8],[-0.45,0.8]].forEach(([lx,lz])=>{
      cowGrp.add(box(0.22,0.75,0.22, cowWhite, lx,0.375,lz));
    });
    // Hooves
    [[0.45,-0.8],[-0.45,-0.8],[0.45,0.8],[-0.45,0.8]].forEach(([lx,lz])=>{
      cowGrp.add(box(0.22,0.1,0.22, cowBlack, lx,0.05,lz));
    });
    // Tail
    const tailMat=mat(0xDDDDDD);
    cowGrp.add(box(0.05,0.5,0.05, tailMat, 0,1.1,-1.1));
    cowGrp.add(sphere(0.1, cowBlack, 0,0.8,-1.15));
    // Udder
    cowGrp.add(box(0.4,0.2,0.4, cowBrown, 0,0.5,0.2));

    this.scene.add(cowGrp);
    this.objects.push(...cowGrp.children);
    addC(collider(1.5,2.0,2.4, -9,1.0,0));

    // ---- CLOUDS (floating along ceiling) ----
    const cloudMat=mat(C.farmCloud,{roughness:1.0});
    [[-4,H-0.6,3],[2,H-0.4,-3],[7,H-0.7,4]].forEach(([cx,cy,cz])=>{
      const cg=new THREE.Group(); cg.position.set(cx,cy,cz);
      cg.add(new THREE.Mesh(new THREE.SphereGeometry(0.6,10,10), cloudMat));
      const b1=new THREE.Mesh(new THREE.SphereGeometry(0.45,10,10), cloudMat); b1.position.set(0.6,0,0); cg.add(b1);
      const b2=new THREE.Mesh(new THREE.SphereGeometry(0.45,10,10), cloudMat); b2.position.set(-0.6,0,0); cg.add(b2);
      const b3=new THREE.Mesh(new THREE.SphereGeometry(0.4,10,10), cloudMat); b3.position.set(0,0.3,0); cg.add(b3);
      this.scene.add(cg); this.objects.push(...cg.children);
    });

    // ---- BARN DECORATION (red barn art on north wall) ----
    const barnMat=mat(C.farmRed,{roughness:0.8});
    add(box(4,3,0.1, barnMat, 0,2, D/2-0.2));
    add(box(4,0.1,0.1, mat(C.farmWhite), 0,3.5,D/2-0.18));
    // Roof triangle
    const roofG=new THREE.Mesh(new THREE.ConeGeometry(2.2,1.2,4), mat(C.farmRed));
    roofG.position.set(0,4.1,D/2-0.15); roofG.rotation.y=Math.PI/4;
    add(roofG);

    // ---- LARGE BALL ----
    const ballMat=canvasMat((ctx,sz)=>{
      ctx.fillStyle='#4488FF'; ctx.beginPath(); ctx.arc(sz/2,sz/2,sz/2,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#FFFFFF'; ctx.lineWidth=sz*0.06;
      ctx.beginPath(); ctx.moveTo(0,sz/2); ctx.lineTo(sz,sz/2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sz/2,0); ctx.lineTo(sz/2,sz); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(sz/2,sz/2,sz*0.35,sz/2,0,0,Math.PI*2); ctx.stroke();
    },256,{roughness:0.4});
    add(sphere(0.6, ballMat, 4,0.6,3));

    // ---- GREEN STORAGE BOXES ----
    add(box(0.8,0.8,0.8, mat(0x2D6E2D), 7,0.4,0));
    add(box(0.8,0.8,0.8, mat(0x2D6E2D), 7.9,0.4,0));
    addC(collider(2,0.8,0.9, 7.45,0.4,0));

    // ---- LIGHTING ----
    this._addLight(new THREE.HemisphereLight(0x88FFAA, 0x224422, 0.8));
    const dl=new THREE.DirectionalLight(0xFFFFEE,1.0);
    dl.position.set(5,15,5); dl.castShadow=true;
    dl.shadow.mapSize.set(2048,2048);
    const dm=14; dl.shadow.camera.left=-dm; dl.shadow.camera.right=dm;
    dl.shadow.camera.top=dm; dl.shadow.camera.bottom=-dm;
    dl.shadow.camera.near=0.1; dl.shadow.camera.far=30; dl.shadow.bias=-0.0005;
    this._addLight(dl);

    this.scene.fog = new THREE.Fog(0xB0EEB0, 15, 40);
    this.scene.background = new THREE.Color(0xB0EEB0);

    this.spawnPoints.hider = [
      {x:-7,y:0,z:5},{x:7,y:0,z:5},{x:-7,y:0,z:-5},{x:7,y:0,z:-5},
      {x:0,y:0,z:6},{x:0,y:0,z:-5},{x:-3,y:0,z:2},{x:3,y:0,z:-2},
    ];
    this.spawnPoints.seeker = [{x:0,y:0,z:-D/2+2}];
  }

  // -----------------------------------------------------------------------
  // BALLROOM — grand chandeliers, piano, marble floors, columns
  // -----------------------------------------------------------------------
  _buildBallroom() {
    const W=52, D=40, H=6;
    const add = m => this._add(m);
    const addC = c => this._addCol(c);

    // ---- FLOOR: Marble diamond pattern ----
    const marbleMat = canvasMat((ctx,sz) => {
      ctx.fillStyle = '#E8D5B7';
      ctx.fillRect(0,0,sz,sz);
      // Diamond inlays
      ctx.save(); ctx.translate(sz/2,sz/2); ctx.rotate(Math.PI/4);
      ctx.fillStyle = '#2C2C2C';
      ctx.fillRect(-sz*0.12,-sz*0.12,sz*0.24,sz*0.24);
      ctx.restore();
      // Grout lines
      ctx.strokeStyle='#C8B898'; ctx.lineWidth=2;
      ctx.strokeRect(0,0,sz,sz);
    },256,{roughness:0.2,metalness:0.05});
    marbleMat.map.repeat.set(8,6);
    add(box(W,0.1,D, marbleMat, 0,0,0));

    // ---- CEILING: Coffered wood panels ----
    const cofferMat = canvasMat((ctx,sz)=>{
      ctx.fillStyle='#4A2A0A';
      ctx.fillRect(0,0,sz,sz);
      ctx.strokeStyle='#D4AF37'; ctx.lineWidth=4;
      ctx.strokeRect(sz*0.05,sz*0.05,sz*0.9,sz*0.9);
      ctx.strokeRect(sz*0.15,sz*0.15,sz*0.7,sz*0.7);
    },256,{roughness:0.7});
    cofferMat.map.repeat.set(4,3);
    const ceil=box(W,0.2,D, cofferMat, 0,H,0); ceil.castShadow=false; add(ceil);

    // ---- WALLS: Rich wood paneling ----
    const panelMat = canvasMat((ctx,sz)=>{
      ctx.fillStyle='#5C3820';
      ctx.fillRect(0,0,sz,sz);
      // Panel moulding
      ctx.strokeStyle='#4A2A0A'; ctx.lineWidth=8;
      ctx.strokeRect(sz*0.05,sz*0.05,sz*0.9,sz*0.9);
      ctx.strokeRect(sz*0.12,sz*0.12,sz*0.76,sz*0.76);
      ctx.strokeStyle='#D4AF37'; ctx.lineWidth=3;
      ctx.strokeRect(sz*0.05,sz*0.05,sz*0.9,sz*0.9);
    },256,{roughness:0.7});
    panelMat.map.repeat.set(4,1);

    const wt=0.25;
    add(box(W,H,wt, panelMat, 0,H/2, D/2)); addC(collider(W,H,wt, 0,H/2, D/2));
    add(box(W,H,wt, panelMat, 0,H/2,-D/2)); addC(collider(W,H,wt, 0,H/2,-D/2));
    add(box(wt,H,D, panelMat, W/2,H/2,0)); addC(collider(wt,H,D, W/2,H/2,0));
    add(box(wt,H,D, panelMat,-W/2,H/2,0)); addC(collider(wt,H,D,-W/2,H/2,0));

    // ---- Gold moulding trim ----
    const goldMat=mat(C.ballGold,{roughness:0.15,metalness:0.9});
    add(box(W,0.08,0.1, goldMat, 0,H-0.04, D/2-0.13));
    add(box(W,0.08,0.1, goldMat, 0,H-0.04,-D/2+0.13));
    add(box(0.1,0.08,D, goldMat, W/2-0.13,H-0.04,0));
    add(box(0.1,0.08,D, goldMat,-W/2+0.13,H-0.04,0));
    // Baseboard gold
    add(box(W,0.12,0.1, goldMat, 0,0.06, D/2-0.13));
    add(box(W,0.12,0.1, goldMat, 0,0.06,-D/2+0.13));
    add(box(0.1,0.12,D, goldMat, W/2-0.13,0.06,0));
    add(box(0.1,0.12,D, goldMat,-W/2+0.13,0.06,0));

    // ---- 3 CHANDELIERS ----
    const createChandelier = (x,y,z) => {
      const cg=new THREE.Group(); cg.position.set(x,y,z);
      // Chain
      cg.add(box(0.05,1.0,0.05, mat(C.chandGold,{roughness:0.2,metalness:0.9}), 0,0.5,0));
      // Main ring
      for(let a=0;a<16;a++){
        const ra=(a/16)*Math.PI*2;
        const rb=new THREE.Mesh(new THREE.TorusGeometry(0.06,0.018,6,8), mat(C.chandGold,{roughness:0.15,metalness:0.95}));
        rb.position.set(Math.cos(ra)*0.8, 0, Math.sin(ra)*0.8);
        cg.add(rb);
      }
      const ring=new THREE.Mesh(new THREE.TorusGeometry(0.8,0.04,8,32), mat(C.chandGold,{roughness:0.15,metalness:0.95}));
      ring.rotation.x=Math.PI/2; cg.add(ring);
      // Inner ring
      const ring2=new THREE.Mesh(new THREE.TorusGeometry(0.4,0.03,8,24), mat(C.chandGold,{roughness:0.15,metalness:0.95}));
      ring2.rotation.x=Math.PI/2; ring2.position.y=-0.4; cg.add(ring2);
      // Crystal drops
      const crystalMat=mat(C.chandCrystal,{transparent:true,opacity:0.8,roughness:0.05,metalness:0.1});
      for(let ca=0;ca<12;ca++){
        const cra=(ca/12)*Math.PI*2;
        const cry=new THREE.Mesh(new THREE.OctahedronGeometry(0.08), crystalMat);
        cry.position.set(Math.cos(cra)*0.8,-0.3+Math.random()*0.2, Math.sin(cra)*0.8);
        cry.rotation.set(Math.random(),Math.random(),Math.random());
        cg.add(cry);
      }
      for(let ca=0;ca<8;ca++){
        const cra=(ca/8)*Math.PI*2;
        const cry=new THREE.Mesh(new THREE.OctahedronGeometry(0.06), crystalMat);
        cry.position.set(Math.cos(cra)*0.4,-0.55+Math.random()*0.1, Math.sin(cra)*0.4);
        cg.add(cry);
      }
      // Central light orb
      const orb=new THREE.Mesh(new THREE.SphereGeometry(0.15,12,12), mat(C.chandCrystal,{emissive:0xFFFFCC,emissiveIntensity:1.0,transparent:true,opacity:0.9}));
      orb.position.y=-0.7; cg.add(orb);
      // Point light
      const pl=new THREE.PointLight(0xFFEECC,1.5,18);
      pl.position.set(x,y-0.8,z); pl.castShadow=true;
      pl.shadow.mapSize.set(512,512);
      this._addLight(pl);
      this.scene.add(cg);
      this.objects.push(...cg.children, cg);
    };
    createChandelier(-7,H-0.1,0);
    createChandelier(0, H-0.1,0);
    createChandelier(7, H-0.1,0);

    // ---- WHITE MARBLE COLUMNS ----
    const colMat=mat(C.ballColumn,{roughness:0.3,metalness:0.05});
    const colCapMat=mat(C.ballGold,{roughness:0.2,metalness:0.7});
    [[-10,-7],[-10,0],[-10,7],[10,-7],[10,0],[10,7]].forEach(([cx,cz])=>{
      add(cyl(0.45,0.45,H, colMat, cx,H/2,cz, 16));
      add(cyl(0.55,0.55,0.25, colCapMat, cx,H-0.12,cz, 16)); // capital
      add(cyl(0.55,0.55,0.25, colCapMat, cx,0.12,cz, 16));   // base
      addC(collider(1.0,H+0.3,1.0, cx,H/2,cz));
    });

    // ---- GRAND STAIRCASE (north wall) ----
    const stairMat=mat(C.mahogany,{roughness:0.5});
    const balustMat=mat(C.ballGold,{roughness:0.2,metalness:0.8});
    // Main platform
    add(box(8,0.25,4, stairMat, 0,0.5,D/2-2)); addC(collider(8,0.5,4, 0,0.5,D/2-2));
    // Steps
    for(let s=0;s<4;s++) {
      add(box(7.5-s*0.3,0.25,0.8, stairMat, 0,0.5+(s+1)*0.25, D/2-2-0.8*(s+1)));
    }
    // Banisters
    [[-3.5,D/2-2],[3.5,D/2-2]].forEach(([bx,bz])=>{
      add(cyl(0.05,0.05,2.5, balustMat, bx,1.5,bz,8));
      for(let bi=0;bi<6;bi++) add(cyl(0.02,0.02,1.2, balustMat, bx+bi*0.4-1,0.85,bz,6));
    });
    // Handrail
    add(box(7.2,0.06,0.06, balustMat, 0,2.5,D/2-2));

    // ---- GRAND PIANO ----
    const pianoMat=mat(C.pianoBlack,{roughness:0.1,metalness:0.05});
    const pianoLeg=mat(C.pianoBlack,{roughness:0.1});
    add(box(2.5,0.1,1.5, pianoMat, -9,0.85,-7)); // lid
    add(box(2.2,0.7,1.3, pianoMat, -9,0.45,-7)); // body
    add(box(2.4,0.06,0.12, pianoMat, -9,0.86,-7.5)); // keyboard cover
    // Keys strip
    add(box(2.2,0.06,0.2, mat(C.white), -9,0.87,-7.3));
    for(let ki=0;ki<7;ki++) add(box(0.06,0.1,0.12, pianoMat, -9.8+ki*0.3,0.93,-7.3));
    // Legs
    [[-7.8,-6.3],[-10.2,-6.3],[-9,-7.9]].forEach(([lx,lz])=>{
      add(cyl(0.07,0.07,0.8, pianoLeg, lx,0.4,lz, 8));
    });
    addC(collider(2.6,0.95,1.6, -9,0.5,-7));

    // ---- DINING TABLES ----
    const tblMat=mat(C.mahogany,{roughness:0.6});
    const clthMat=mat(C.farmWhite,{roughness:0.9});
    [[5,-5],[5,5],[-2,-5],[-2,5]].forEach(([tx,tz])=>{
      // Table
      add(cyl(0.8,0.8,0.06, tblMat, tx,0.76,tz, 24));
      add(cyl(0.06,0.06,0.7, tblMat, tx,0.35,tz, 8));
      add(cyl(0.25,0.25,0.06, tblMat, tx,0.03,tz, 12));
      // Tablecloth
      add(cyl(0.82,0.82,0.04, clthMat, tx,0.79,tz, 24));
      addC(collider(1.7,0.8,1.7, tx,0.4,tz));
      // Chairs around table (4)
      for(let ca=0;ca<4;ca++){
        const cra=(ca/4)*Math.PI*2;
        const ccx=tx+Math.cos(cra)*1.25, ccz=tz+Math.sin(cra)*1.25;
        add(box(0.45,0.05,0.45, tblMat, ccx,0.46,ccz));
        add(box(0.45,0.5,0.06, tblMat, ccx,0.73,ccz+Math.sin(cra)*0.22));
        add(cyl(0.03,0.03,0.45, tblMat, ccx-0.18,0.22,ccz-0.18, 6));
        add(cyl(0.03,0.03,0.45, tblMat, ccx+0.18,0.22,ccz-0.18, 6));
        add(cyl(0.03,0.03,0.45, tblMat, ccx-0.18,0.22,ccz+0.18, 6));
        add(cyl(0.03,0.03,0.45, tblMat, ccx+0.18,0.22,ccz+0.18, 6));
      }
    });

    // ---- BALLOON CLUSTERS ----
    const balCols=[C.balloonR,C.balloonB,C.balloonY,C.balloonG,C.purple,C.orange,C.pink];
    [[-10,-7,H-0.8],[-10,7,H-0.8],[10,-7,H-0.8],[10,7,H-0.8]].forEach(([bx,by,bz])=>{
      for(let bi=0;bi<5;bi++){
        const col=balCols[bi%balCols.length];
        const ox=(Math.random()-0.5)*0.8, oz=(Math.random()-0.5)*0.8;
        add(sphere(0.2, mat(col), bx+ox, by-Math.random()*0.6, bz+oz));
        add(cyl(0.006,0.006,1.5, mat(C.woodDark), bx+ox,(by-Math.random()*0.6-0.75),bz+oz,4));
      }
    });

    // ---- GARLAND ACROSS ROOM ----
    const garlandCols=[C.balloonR,C.balloonY,C.balloonG,C.balloonB,C.purple,C.orange];
    for(let gi=0;gi<12;gi++){
      const gx=-W/2+2+gi*(W-4)/11;
      const gy=H-0.6+Math.sin(gi/11*Math.PI)*-0.3; // slight droop
      add(sphere(0.12, mat(garlandCols[gi%6]), gx,gy,D/2-0.5));
    }
    add(box(W-4,0.02,0.02, mat(C.woodDark), 0,H-0.6,D/2-0.5));

    // ---- AMBIENT LIGHTING ----
    this._addLight(new THREE.HemisphereLight(0xFFEECC, 0x2A1A05, 0.5));
    const dl=new THREE.DirectionalLight(0xFFEECC,0.3);
    dl.position.set(0,H*2,0); dl.castShadow=false; this._addLight(dl);
    // Warm fill lights along walls
    const wl1=new THREE.PointLight(0xFFCC88,0.6,20); wl1.position.set(-10,2,0); this._addLight(wl1);
    const wl2=new THREE.PointLight(0xFFCC88,0.6,20); wl2.position.set(10,2,0); this._addLight(wl2);
    const wl3=new THREE.PointLight(0xFFCC88,0.4,20); wl3.position.set(0,2,-D/2+2); this._addLight(wl3);

    this.scene.fog = new THREE.Fog(0x3D1F0A, 20, 50);
    this.scene.background = new THREE.Color(0x3D1F0A);

    this.spawnPoints.hider = [
      {x:-8,y:0,z:7},{x:8,y:0,z:7},{x:-8,y:0,z:-7},{x:8,y:0,z:-7},
      {x:0,y:0,z:8},{x:0,y:0,z:-7},{x:-5,y:0,z:0},{x:5,y:0,z:0},
      {x:-10,y:0,z:3},{x:10,y:0,z:-3},
    ];
    this.spawnPoints.seeker = [{x:0,y:0,z:-D/2+2}];
  }
}
