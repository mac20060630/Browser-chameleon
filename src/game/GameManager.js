/**
 * GameManager — Central game state machine
 * Coordinates all subsystems: phases, rendering, networking, UI
 *
 * Phase flow: LOBBY → PREP → HUNT → RESULTS → LOBBY
 */
import * as THREE from 'three';
import { CharacterModel } from './CharacterModel.js';
import { MapBuilder } from './MapBuilder.js';
import { PlayerController } from './PlayerController.js';
import { PaintSystem } from './PaintSystem.js';
import { ParticleSystem } from './ParticleSystem.js';
import { PoseSystem } from './PoseSystem.js';
import { TagSystem } from './TagSystem.js';
import { audio } from '../utils/AudioManager.js';

export const PHASES = {
  LOBBY: 'lobby',
  PREP: 'prep',
  HUNT: 'hunt',
  RESULTS: 'results',
};

export class GameManager {
  /**
   * @param {THREE.WebGLRenderer} renderer
   * @param {THREE.Scene} scene
   * @param {THREE.PerspectiveCamera} camera
   * @param {import('../network/NetworkManager.js').NetworkManager} network
   * @param {object} ui - { lobby, hud, paintTool, poseMenu, results }
   */
  constructor(renderer, scene, camera, network, ui) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.network = network;
    this.ui = ui;

    this.phase = PHASES.LOBBY;
    this.role = null; // 'hider' | 'seeker'
    this.playerId = null;

    // Subsystems (initialized on game start)
    this.mapBuilder = null;
    this.localCharacter = null;
    this.playerController = null;
    this.paintSystem = null;
    this.poseSystem = null;
    this.tagSystem = null;

    // Other players
    this.remotePlayers = new Map(); // playerId -> { model: CharacterModel, position, rotation, role, alive }

    // Timer
    this.timeRemaining = 0;

    // Clock for delta time
    this.clock = new THREE.Clock();

    // Bind network events
    this._bindNetworkEvents();
    this._bindKeyboardShortcuts();

    // Start with lobby visible
    this.ui.lobby.show();
  }

  /* ================================================================
     NETWORK EVENT BINDINGS
     ================================================================ */
  _bindNetworkEvents() {
    const net = this.network;

    net.on('room-created', (data) => {
      this.playerId = data.playerId;
      this.ui.lobby.showWaitingRoom(data.roomCode, []);
      this.ui.lobby.setHost(true);
    });

    net.on('room-joined', (data) => {
      this.playerId = data.playerId;
      
      // If joining a game that is already in progress
      if (data.phase && data.phase !== 'lobby') {
        this._handleMidGameJoin(data);
      } else {
        this.ui.lobby.showWaitingRoom(data.roomCode, data.players);
        this.ui.lobby.setHost(net.isHost());
      }
    });

    net.on('player-joined', (data) => {
      this._showToast(`${data.player.name} joined!`, 'info');
    });

    net.on('player-joined-midgame', (data) => {
      this._createRemotePlayer(data.player.id, data.player.name, data.player.role);
    });

    net.on('player-left', (data) => {
      this._removeRemotePlayer(data.playerId);
    });

    net.on('player-list-update', (data) => {
      this.ui.lobby.updatePlayerList(data.players);
    });

    net.on('player-ready-changed', (data) => {
      // Player list will be re-sent by server
    });

    net.on('game-starting', (data) => {
      this._onGameStarting(data);
    });

    net.on('phase-changed', (data) => {
      this._onPhaseChanged(data.phase, data.timeRemaining);
    });

    net.on('timer-tick', (data) => {
      this.timeRemaining = data.timeRemaining;
      this.ui.hud.setTimer(data.timeRemaining);
    });

    net.on('player-moved', (data) => {
      this._updateRemotePlayer(data.playerId, {
        position: data.position,
        rotation: data.rotation,
      });
    });

    net.on('player-painted', (data) => {
      this._applyRemotePaint(data.playerId, data.paintData);
    });

    net.on('player-posed', (data) => {
      this._applyRemotePose(data.playerId, data.poseId);
    });

    net.on('player-tagged', (data) => {
      this._onPlayerTagged(data.seekerId, data.hiderId);
    });

    net.on('game-results', (data) => {
      this._onGameResults(data);
    });

    net.on('error', (data) => {
      this._showToast(data.message, 'error');
    });
  }

  /* ================================================================
     KEYBOARD SHORTCUTS
     ================================================================ */
  _bindKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (this.phase === PHASES.LOBBY || this.phase === PHASES.RESULTS) return;

      switch (e.code) {
        case 'KeyF':
          if (this.phase === PHASES.PREP && this.role === 'hider') {
            e.preventDefault();
            this.ui.paintTool.toggle();
            if (this.ui.paintTool.isVisible()) {
              this.paintSystem?.activate();
              document.exitPointerLock();
            } else {
              this.paintSystem?.deactivate();
              this.playerController?.requestPointerLock();
            }
          }
          break;

        case 'KeyQ':
          if (this.phase === PHASES.PREP && this.role === 'hider') {
            e.preventDefault();
            this.ui.poseMenu.toggle();
            if (this.ui.poseMenu.isVisible()) {
              document.exitPointerLock();
            } else {
              this.playerController?.requestPointerLock();
            }
          }
          break;

        case 'KeyV':
          if (this.playerController) {
            e.preventDefault();
            this.playerController.toggleCamera();
          }
          break;

        case 'KeyE':
        case 'Enter':
          if (this.phase === PHASES.HUNT && this.role === 'seeker') {
            e.preventDefault();
            this.tagSystem?.tryTag();
          }
          break;

        case 'Escape':
          if (this.ui.paintTool.isVisible()) {
            this.ui.paintTool.hide();
            this.paintSystem?.deactivate();
            this.playerController?.requestPointerLock();
          }
          if (this.ui.poseMenu.isVisible()) {
            this.ui.poseMenu.hide();
            this.playerController?.requestPointerLock();
          }
          break;
      }
    });

    // Mouse click for tagging
    document.addEventListener('mousedown', (e) => {
      if (e.button === 0 && this.phase === PHASES.HUNT && this.role === 'seeker') {
        this.tagSystem?.tryTag();
      }
    });
  }

  /* ================================================================
     GAME STATE TRANSITIONS
     ================================================================ */
  _onGameStarting(data) {
    const { roles, players } = data;
    this.role = roles[this.playerId];

    // Hide lobby
    this.ui.lobby.hide();
    this.ui.lobby.hideWaitingRoom();

    // Show role reveal
    this._showRoleReveal(this.role);

    // Initialize 3D world
    this._initializeGameWorld(data);

    // Start background music
    audio.playBGM();

    // Initialize remote players
    for (const player of players) {
      if (player.id !== this.playerId) {
        this._createRemotePlayer(player.id, player.name, roles[player.id]);
      }
    }

    // After 3 seconds, transition based on role
    setTimeout(() => {
      this._hideRoleReveal();

      if (this.role === 'seeker') {
        this._showSeekerWaiting();
      } else {
        // Hider goes straight to prep
        this._startPrepPhase();
      }
    }, 3000);
  }

  _handleMidGameJoin(data) {
    const { players, phase, timeRemaining, settings } = data;
    
    // Construct roles map
    const roles = {};
    players.forEach(p => roles[p.id] = p.role);
    
    this.role = roles[this.playerId];
    this.phase = phase;
    this.timeRemaining = timeRemaining;

    // Hide lobby instantly
    this.ui.lobby.hide();
    this.ui.lobby.hideWaitingRoom();

    // Initialize 3D world with the provided settings
    this._initializeGameWorld({ roles, players, map: settings.map, mode: settings.mode });

    // Start background music
    audio.playBGM();

    // Initialize remote players
    for (const player of players) {
      if (player.id !== this.playerId) {
        this._createRemotePlayer(player.id, player.name, roles[player.id]);
        
        // Sync painted meshes if any
        if (player.paintData) {
          this._applyRemotePaint(player.id, player.paintData);
        }
      }
    }

    // Skip the 3 second role reveal and jump straight into current phase logic
    if (this.role === 'seeker') {
      if (this.phase === 'prep') {
        this._showSeekerWaiting();
      } else {
        this._startHuntPhase(); // Seeker released
      }
    } else {
      if (this.phase === 'prep') {
        this._startPrepPhase();
      } else {
        this._startHuntPhase();
      }
    }
  }

  _onPhaseChanged(phase, timeRemaining) {
    this.phase = phase;
    this.timeRemaining = timeRemaining;

    switch (phase) {
      case PHASES.PREP:
        if (this.role === 'seeker') {
          this._showSeekerWaiting();
        } else {
          this._startPrepPhase();
        }
        break;

      case PHASES.HUNT:
        this._hideSeekerWaiting();
        this._startHuntPhase();
        break;

      case PHASES.RESULTS:
        // Results handled by game-results event
        break;

      case PHASES.LOBBY:
        this._returnToLobby();
        break;
    }
  }

  _startPrepPhase() {
    this.phase = PHASES.PREP;

    // Show game HUD
    this.ui.hud.show();
    this.ui.hud.setPhase('PREPARATION');
    this.ui.hud.setRole(this.role);
    this.ui.hud.setTimer(this.timeRemaining);
    this.ui.hud.showControls(this.role, 'prep');
    this.ui.hud.showCrosshair();

    // Enable movement for hiders
    if (this.playerController) {
      this.playerController.setCanMove(true);
      this.playerController.requestPointerLock();
    }
  }

  _startHuntPhase() {
    this.phase = PHASES.HUNT;

    this.ui.hud.setPhase('HUNT');
    this.ui.hud.setTimer(this.timeRemaining);

    if (this.role === 'hider') {
      // Freeze hider
      if (this.playerController) {
        this.playerController.setCanMove(false);
      }
      // Close paint/pose menus
      this.ui.paintTool.hide();
      this.ui.poseMenu.hide();
      this.paintSystem?.deactivate();
      this.ui.hud.hideControls();
      this.ui.hud.hideCrosshair();
    } else {
      // Seeker: enable movement and tag system
      this.ui.hud.show();
      this.ui.hud.showControls(this.role, 'hunt');
      this.ui.hud.showCrosshair();

      if (this.playerController) {
        this.playerController.setCanMove(true);
        this.playerController.requestPointerLock();
      }

      // Activate tag system
      if (this.tagSystem) {
        this.tagSystem.activate(this.playerId, 'seeker');

        // Build player map for tag system
        const playerMap = new Map();
        for (const [id, rp] of this.remotePlayers) {
          playerMap.set(id, {
            position: rp.position,
            role: rp.role,
            alive: rp.alive,
          });
        }
        this.tagSystem.setOtherPlayers(playerMap);

        this.tagSystem.onTagPromptShow(() => this.ui.hud.showTagPrompt());
        this.tagSystem.onTagPromptHide(() => this.ui.hud.hideTagPrompt());
      }
    }
  }

  _onPlayerTagged(seekerId, hiderId) {
    // Update remote player state
    if (this.remotePlayers.has(hiderId)) {
      const rp = this.remotePlayers.get(hiderId);
      rp.alive = false;

      // Visual effect — flash the tagged player red briefly
      if (rp.model) {
        this._flashPlayerRed(rp.model);
        this.particleSystem?.spawnExplosion(rp.position, 0xff0000, 30);
      }
    } else if (hiderId === this.playerId) {
      this.particleSystem?.spawnExplosion(this.playerController.getPosition(), 0xff0000, 30);
    }

    // Update tag system
    this.tagSystem?.handleTagConfirmed(seekerId, hiderId);

    // Show toast
    const seekerName = seekerId === this.playerId ? 'You' : this._getPlayerName(seekerId);
    const hiderName = hiderId === this.playerId ? 'You' : this._getPlayerName(hiderId);

    if (hiderId === this.playerId) {
      this._showToast('You were found! 😱', 'error');
    } else {
      this._showToast(`${seekerName} found ${hiderName}!`, 'warning');
    }
    
    // Play sound effect
    audio.playTag();

    // Update alive count
    this._updateAliveCount();
  }

  _onGameResults(data) {
    this.phase = PHASES.RESULTS;

    // Stop background music
    audio.stopBGM();

    // Hide game HUD
    this.ui.hud.hide();
    this.ui.hud.hideTagPrompt();
    this.ui.hud.hideCrosshair();
    this.paintSystem?.deactivate();
    this.ui.paintTool.hide();
    this.ui.poseMenu.hide();

    document.exitPointerLock();

    // Show results screen
    this.ui.results.show(data);

    // Register callbacks
    this.ui.results.onPlayAgain(() => {
      this.ui.results.hide();
      this.network.playAgain();
      this._cleanupGameWorld();
    });

    this.ui.results.onBackToLobby(() => {
      this.ui.results.hide();
      this.network.leaveRoom();
      this._cleanupGameWorld();
      this._returnToLobby();
    });
  }

  _returnToLobby() {
    this.phase = PHASES.LOBBY;
    this.role = null;
    this._cleanupGameWorld();
    this.ui.hud.hide();
    this.ui.results.hide();
    this.ui.lobby.show();
    document.exitPointerLock();
  }

  /* ================================================================
     WORLD INITIALIZATION
     ================================================================ */
  _initializeGameWorld(data) {
    // Build map
    this.mapBuilder = new MapBuilder(this.scene);
    this.mapBuilder.buildMap(data.map || 'party-room');

    // Create local character
    this.localCharacter = new CharacterModel(this.scene);
    this.localCharacter.addToScene();

    // Position at spawn point
    const spawnPoints = this.mapBuilder.getSpawnPoints();
    const spawnList = this.role === 'hider' ? spawnPoints.hider : spawnPoints.seeker;
    const spawnIdx = Math.floor(Math.random() * spawnList.length);
    const spawn = spawnList[spawnIdx] || { x: 0, y: 0, z: 0 };
    this.localCharacter.setPosition(spawn.x, spawn.y, spawn.z);

    // Player controller
    this.playerController = new PlayerController(
      this.camera,
      this.localCharacter,
      this.mapBuilder.getColliders()
    );
    this.playerController.setPosition(spawn.x, 0, spawn.z);

    // Paint system (hiders only, but init for all to allow viewing)
    this.paintSystem = new PaintSystem(
      this.renderer,
      this.scene,
      this.camera,
      this.localCharacter
    );

    // Debounce paint sync
    this._paintSyncTimeout = null;
    this.paintSystem.onPaintChange = (partName) => {
      if (this._paintSyncTimeout) clearTimeout(this._paintSyncTimeout);
      this._paintSyncTimeout = setTimeout(() => {
        const dirtyData = this.localCharacter.serializePaintData(true);
        if (Object.keys(dirtyData).length > 0) {
          this.network.sendPaint(dirtyData);
        }
      }, 200);
    };

    // Pose system
    this.poseSystem = new PoseSystem(this.localCharacter);

    // Connect pose menu to pose system
    this.ui.poseMenu.character = this.localCharacter;
    this.ui.poseMenu.onPoseLocked?.((poseId) => {
      this.network.sendPose(poseId);
      this.ui.poseMenu.hide();
      this.playerController?.requestPointerLock();
    });

    // Connect paint tool UI to paint system
    this.ui.paintTool.paintSystem = this.paintSystem;
    this.paintSystem.onColorPicked = (r, g, b) => {
      this.ui.paintTool.setColorFromEyedropper(r, g, b);
    };

    // Tag system
    this.tagSystem = new TagSystem(this.scene, this.network);

    // Particle system
    this.particleSystem = new ParticleSystem(this.scene);

    // Send position updates
    this._startPositionSync();
  }

  _cleanupGameWorld() {
    // Stop position sync
    if (this._positionSyncInterval) {
      clearInterval(this._positionSyncInterval);
      this._positionSyncInterval = null;
    }

    if (this._paintSyncTimeout) {
      clearTimeout(this._paintSyncTimeout);
      this._paintSyncTimeout = null;
    }

    // Dispose subsystems
    this.paintSystem?.dispose();
    this.tagSystem?.dispose();
    this.poseSystem = null;
    this.particleSystem?.dispose();
    this.particleSystem = null;
    this.playerController?.dispose();
    this.localCharacter?.removeFromScene();
    this.localCharacter?.dispose();

    // Stop audio if it was running
    audio.stopBGM();

    // Clear remote players
    for (const [id, rp] of this.remotePlayers) {
      rp.model?.removeFromScene();
      rp.model?.dispose();
    }
    this.remotePlayers.clear();

    // Dispose map
    this.mapBuilder?.dispose();

    // Reset
    this.mapBuilder = null;
    this.localCharacter = null;
    this.playerController = null;
    this.paintSystem = null;
    this.poseSystem = null;
    this.tagSystem = null;
  }

  /* ================================================================
     REMOTE PLAYERS
     ================================================================ */
  _createRemotePlayer(playerId, name, role) {
    const model = new CharacterModel(this.scene);
    model.addToScene();

    // Position at spawn
    const spawnPoints = this.mapBuilder.getSpawnPoints();
    const spawnList = role === 'hider' ? spawnPoints.hider : spawnPoints.seeker;
    const spawnIdx = Math.floor(Math.random() * spawnList.length);
    const spawn = spawnList[spawnIdx] || { x: 0, y: 0, z: 0 };
    model.setPosition(spawn.x, spawn.y, spawn.z);

    this.remotePlayers.set(playerId, {
      model,
      name,
      role,
      alive: true,
      position: { x: spawn.x, y: spawn.y, z: spawn.z },
      rotation: 0,
    });
  }

  _removeRemotePlayer(playerId) {
    if (this.remotePlayers.has(playerId)) {
      const rp = this.remotePlayers.get(playerId);
      rp.model?.removeFromScene();
      rp.model?.dispose();
      this.remotePlayers.delete(playerId);
    }
  }

  _updateRemotePlayer(playerId, data) {
    if (!this.remotePlayers.has(playerId)) return;
    const rp = this.remotePlayers.get(playerId);

    if (data.position) {
      rp.position = data.position;
    }
    if (data.rotation !== undefined) {
      rp.rotation = data.rotation;
      const rotY = typeof data.rotation === 'number' ? data.rotation : (data.rotation.y !== undefined ? data.rotation.y : 0);
      rp.model?.setRotation(rotY);
    }

    // Update tag system
    this.tagSystem?.updatePlayer(playerId, {
      position: rp.position,
      role: rp.role,
      alive: rp.alive,
    });
  }

  _applyRemotePaint(playerId, paintData) {
    if (!this.remotePlayers.has(playerId)) return;
    const rp = this.remotePlayers.get(playerId);
    rp.model?.deserializePaintData(paintData);
  }

  _applyRemotePose(playerId, poseId) {
    if (!this.remotePlayers.has(playerId)) return;
    const rp = this.remotePlayers.get(playerId);
    rp.model?.setPose(poseId);
  }

  /* ================================================================
     POSITION SYNC
     ================================================================ */
  _startPositionSync() {
    this._positionSyncInterval = setInterval(() => {
      if (!this.playerController) return;
      if (this.phase !== PHASES.PREP && this.phase !== PHASES.HUNT) return;

      // Only send if moving (hiders can move in prep, seekers in hunt)
      const canSend = (this.role === 'hider' && this.phase === PHASES.PREP) ||
                      (this.role === 'seeker' && this.phase === PHASES.HUNT);

      if (canSend) {
        const pos = this.playerController.getPosition();
        const rot = this.playerController.getRotation();
        this.network.sendMove(pos, { y: rot });
      }
    }, 50); // 20Hz
  }

  /* ================================================================
     UI HELPERS
     ================================================================ */
  _showRoleReveal(role) {
    const screen = document.getElementById('role-reveal-screen');
    const text = document.getElementById('role-reveal-text');
    const desc = document.getElementById('role-reveal-desc');

    if (role === 'hider') {
      text.textContent = '🎨 HIDER';
      desc.textContent = 'Paint yourself and find a hiding spot!';
    } else {
      text.textContent = '🔦 SEEKER';
      desc.textContent = 'Wait for hiders to prepare, then hunt them down!';
    }

    screen.classList.remove('hidden');
  }

  _hideRoleReveal() {
    const screen = document.getElementById('role-reveal-screen');
    screen.classList.add('fade-out-anim');
    setTimeout(() => {
      screen.classList.add('hidden');
      screen.classList.remove('fade-out-anim');
    }, 500);
  }

  _showSeekerWaiting() {
    document.getElementById('seeker-waiting-screen').classList.remove('hidden');
  }

  _hideSeekerWaiting() {
    document.getElementById('seeker-waiting-screen').classList.add('hidden');
  }

  _updateAliveCount() {
    let alive = 0;
    let total = 0;
    for (const [, rp] of this.remotePlayers) {
      if (rp.role === 'hider') {
        total++;
        if (rp.alive) alive++;
      }
    }
    // Count local player if hider
    if (this.role === 'hider') {
      total++;
      alive++; // local player always alive from their perspective (server handles death)
    }
    this.ui.hud.setAliveCount(alive, total);
  }

  _flashPlayerRed(model) {
    // Briefly flash the model red
    if (!model || !model.bodyParts) return;
    const originalColors = {};

    for (const [name, mesh] of Object.entries(model.bodyParts)) {
      if (mesh && mesh.material) {
        originalColors[name] = mesh.material.color.getHex();
        mesh.material.emissive = new THREE.Color(0xff0000);
        mesh.material.emissiveIntensity = 0.5;
      }
    }

    setTimeout(() => {
      for (const [name, mesh] of Object.entries(model.bodyParts)) {
        if (mesh && mesh.material) {
          mesh.material.emissive = new THREE.Color(0x000000);
          mesh.material.emissiveIntensity = 0;
        }
      }
    }, 800);
  }

  _getPlayerName(playerId) {
    if (this.remotePlayers.has(playerId)) {
      return this.remotePlayers.get(playerId).name;
    }
    return 'Unknown';
  }

  _showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /* ================================================================
     MAIN UPDATE LOOP — called from main.js requestAnimationFrame
     ================================================================ */
  update() {
    const deltaTime = this.clock.getDelta();

    // Update player controller (movement)
    if (this.playerController && this.phase !== PHASES.LOBBY && this.phase !== PHASES.RESULTS) {
      this.playerController.update(deltaTime);
      this.particleSystem?.update(deltaTime);
    }

    // Update local character position to match controller
    if (this.localCharacter && this.playerController) {
      const pos = this.playerController.getPosition();
      this.localCharacter.setPosition(pos.x, pos.y, pos.z);
      this.localCharacter.setRotation(this.playerController.getRotation());
      
      // Update tag system proximity checks
      if (this.tagSystem) {
        this.tagSystem.update(new THREE.Vector3(pos.x, pos.y, pos.z));
      }
    }

    // Update seeker waiting screen timer
    if (this.phase === PHASES.PREP && this.role === 'seeker') {
      const timerEl = document.getElementById('seeker-wait-timer');
      if (timerEl) timerEl.textContent = this.timeRemaining;
    }

    // Smooth remote player interpolation
    for (const [, rp] of this.remotePlayers) {
      if (rp.model && rp.position) {
        const current = rp.model.group.position;
        current.x += (rp.position.x - current.x) * 0.2;
        current.y += (rp.position.y - current.y) * 0.2;
        current.z += (rp.position.z - current.z) * 0.2;
      }
    }
  }
}
