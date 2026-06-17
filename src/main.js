/**
 * main.js — Entry point for Meccha Chameleon
 * Initializes Three.js scene, connects to server, and boots the game
 */
import * as THREE from 'three';
import { NetworkManager } from './network/NetworkManager.js';
import { GameManager } from './game/GameManager.js';
import { LobbyUI } from './ui/LobbyUI.js';
import { HUD } from './ui/HUD.js';
import { PaintToolUI } from './ui/PaintToolUI.js';
import { PoseMenuUI } from './ui/PoseMenuUI.js';
import { ResultsUI } from './ui/ResultsUI.js';
import { audio } from './utils/AudioManager.js';

/* ============================================================
   THREE.JS SETUP
   ============================================================ */
const canvas = document.getElementById('game-canvas');

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance',
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);
scene.fog = new THREE.Fog(0x0a0a1a, 20, 50);

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 2, 5);

/* ============================================================
   HANDLE RESIZE
   ============================================================ */
function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener('resize', onResize);

/* ============================================================
   NETWORKING
   ============================================================ */
const network = new NetworkManager();
network.connect();

/* ============================================================
   UI INITIALIZATION
   ============================================================ */
const lobbyUI = new LobbyUI(network);
const hud = new HUD();
const paintToolUI = new PaintToolUI(null); // paintSystem set later by GameManager
const poseMenuUI = new PoseMenuUI(null); // character set later by GameManager
const resultsUI = new ResultsUI();

const ui = {
  lobby: lobbyUI,
  hud,
  paintTool: paintToolUI,
  poseMenu: poseMenuUI,
  results: resultsUI,
};

/* ============================================================
   GAME MANAGER
   ============================================================ */
const gameManager = new GameManager(renderer, scene, camera, network, ui);

/* ============================================================
   RENDER LOOP
   ============================================================ */
function animate() {
  requestAnimationFrame(animate);

  // Update game logic
  gameManager.update();

  // Render scene
  renderer.render(scene, camera);
}

animate();

/* ============================================================
   GLOBAL AUDIO INIT (on first user interaction)
   ============================================================ */
const initAudio = () => {
  audio._ensureContext();
  document.removeEventListener('click', initAudio);
  document.removeEventListener('keydown', initAudio);
};
document.addEventListener('click', initAudio);
document.addEventListener('keydown', initAudio);

/* ============================================================
   PREVENT CONTEXT MENU IN GAME
   ============================================================ */
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

/* ============================================================
   DEV INFO
   ============================================================ */
console.log('%c🦎 Meccha Chameleon', 'font-size: 24px; font-weight: bold; color: #7c3aed;');
console.log('%cPaint. Hide. Survive.', 'font-size: 14px; color: #06b6d4;');
