/**
 * TagSystem — Handles seeker tagging hiders during the Hunt phase
 * Client-side proximity detection + UI prompt + server validation
 */
import * as THREE from 'three';

export class TagSystem {
  constructor(scene, networkManager) {
    this.scene = scene;
    this.network = networkManager;
    this.raycaster = new THREE.Raycaster();

    this.localPlayerId = null;
    this.localRole = null;
    this.localPosition = new THREE.Vector3();

    this.otherPlayers = new Map(); // id -> { model, position, role, alive }
    this.tagRange = 3.0; // units
    this.tagCooldown = 500; // ms
    this.lastTagTime = 0;

    this.nearestHider = null; // { id, distance }
    this.isActive = false;

    // Callbacks
    this._onTagPromptShow = null;
    this._onTagPromptHide = null;
    this._onPlayerTagged = null;
  }

  /**
   * Activate the tag system (called when Hunt phase starts and player is seeker)
   */
  activate(localPlayerId, localRole) {
    this.localPlayerId = localPlayerId;
    this.localRole = localRole;
    this.isActive = true;
    this.nearestHider = null;
  }

  /**
   * Deactivate tag system
   */
  deactivate() {
    this.isActive = false;
    this.nearestHider = null;
    if (this._onTagPromptHide) this._onTagPromptHide();
  }

  /**
   * Register other players for proximity checking
   */
  setOtherPlayers(playersMap) {
    this.otherPlayers = playersMap;
  }

  /**
   * Update a specific player's data
   */
  updatePlayer(playerId, data) {
    if (this.otherPlayers.has(playerId)) {
      const player = this.otherPlayers.get(playerId);
      Object.assign(player, data);
    }
  }

  /**
   * Remove a player (disconnected or tagged)
   */
  removePlayer(playerId) {
    this.otherPlayers.delete(playerId);
  }

  /**
   * Set callback for tag prompt visibility
   */
  onTagPromptShow(callback) {
    this._onTagPromptShow = callback;
  }

  onTagPromptHide(callback) {
    this._onTagPromptHide = callback;
  }

  onPlayerTagged(callback) {
    this._onPlayerTagged = callback;
  }

  /**
   * Update loop — check proximity to hiders (called every frame)
   */
  update(localPosition) {
    if (!this.isActive || this.localRole !== 'seeker') return;

    this.localPosition.copy(localPosition);

    let nearest = null;
    let nearestDist = Infinity;

    for (const [id, player] of this.otherPlayers) {
      // Only check alive hiders
      if (player.role !== 'hider' || !player.alive) continue;

      const dx = this.localPosition.x - player.position.x;
      const dz = this.localPosition.z - player.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < this.tagRange && dist < nearestDist) {
        nearest = { id, distance: dist };
        nearestDist = dist;
      }
    }

    // Update tag prompt visibility
    if (nearest && !this.nearestHider) {
      if (this._onTagPromptShow) this._onTagPromptShow();
    } else if (!nearest && this.nearestHider) {
      if (this._onTagPromptHide) this._onTagPromptHide();
    }

    this.nearestHider = nearest;
  }

  /**
   * Attempt to tag the nearest hider (called when seeker presses E or Left Click)
   */
  tryTag() {
    if (!this.isActive || this.localRole !== 'seeker') return false;
    if (!this.nearestHider) return false;

    const now = Date.now();
    if (now - this.lastTagTime < this.tagCooldown) return false;

    this.lastTagTime = now;

    // Send tag request to server (server validates distance)
    this.network.sendTag(this.nearestHider.id);

    return true;
  }

  /**
   * Handle confirmed tag from server
   */
  handleTagConfirmed(seekerId, hiderId) {
    // Mark hider as not alive
    if (this.otherPlayers.has(hiderId)) {
      this.otherPlayers.get(hiderId).alive = false;
    }

    // Hide tag prompt if the tagged player was our nearest
    if (this.nearestHider && this.nearestHider.id === hiderId) {
      this.nearestHider = null;
      if (this._onTagPromptHide) this._onTagPromptHide();
    }

    // Notify callback
    if (this._onPlayerTagged) {
      this._onPlayerTagged(seekerId, hiderId);
    }
  }

  /**
   * Check if local player can currently tag someone
   */
  canTag() {
    return this.isActive &&
           this.localRole === 'seeker' &&
           this.nearestHider !== null &&
           (Date.now() - this.lastTagTime >= this.tagCooldown);
  }

  dispose() {
    this.isActive = false;
    this.otherPlayers.clear();
    this.nearestHider = null;
  }
}
