/**
 * NetworkManager — Socket.io client wrapper for Meccha Chameleon
 *
 * Handles all client-server communication: room management, game-phase
 * events, movement sync (throttled 20 Hz), paint sync (debounced 200 ms),
 * pose, and tagging.
 *
 * Usage:
 *   import { networkManager } from './NetworkManager.js';
 *   networkManager.connect();
 *   networkManager.on('room-created', ({ roomCode }) => { ... });
 *   networkManager.createRoom('Player1', { map: 'park' });
 */

import { io } from 'socket.io-client';

// ---------------------------------------------------------------------------
// Throttle / Debounce helpers
// ---------------------------------------------------------------------------

/**
 * Returns a throttled version of `fn` that fires at most once every `ms` ms.
 * Uses a trailing-edge call so the last invocation is never lost.
 */
function throttle(fn, ms) {
  let lastCall = 0;
  let pending = null;

  return function throttled(...args) {
    const now = Date.now();
    const remaining = ms - (now - lastCall);

    if (remaining <= 0) {
      if (pending !== null) {
        clearTimeout(pending);
        pending = null;
      }
      lastCall = now;
      fn.apply(this, args);
    } else if (pending === null) {
      pending = setTimeout(() => {
        lastCall = Date.now();
        pending = null;
        fn.apply(this, args);
      }, remaining);
    }
  };
}

/**
 * Returns a debounced version of `fn` that waits `ms` ms after the last
 * invocation before firing.
 */
function debounce(fn, ms) {
  let timer = null;

  return function debounced(...args) {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn.apply(this, args);
    }, ms);
  };
}

// ---------------------------------------------------------------------------
// NetworkManager
// ---------------------------------------------------------------------------

export class NetworkManager {
  constructor() {
    /** @type {import('socket.io-client').Socket | null} */
    this.socket = null;

    /** Our socket id, assigned after connection / room creation. */
    this.playerId = null;

    /** Current room code (uppercase alphanumeric). */
    this.roomCode = null;

    /** Whether this client is the room host. */
    this._isHost = false;

    /**
     * Registered event callbacks.
     * @type {Record<string, Function[]>}
     */
    this.callbacks = {};

    // Bind throttled / debounced senders — created lazily after connect().
    this._throttledMove = null;
    this._debouncedPaint = null;
  }

  // -----------------------------------------------------------------------
  // Connection
  // -----------------------------------------------------------------------

  /**
   * Open a Socket.io connection to the game server.
   * Automatically determines the URL from the current page origin.
   *
   * @param {string} [url] – Optional explicit server URL.
   */
  connect(url) {
    if (this.socket?.connected) return;

    const serverUrl = url || window.location.origin;
    this.socket = io(serverUrl, {
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    // --- Internal listeners ---

    this.socket.on('connect', () => {
      console.log('[NetworkManager] connected', this.socket.id);
      this._emit('connected', { id: this.socket.id });
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('[NetworkManager] disconnected:', reason);
      this._emit('disconnected', { reason });
    });

    this.socket.on('connect_error', (err) => {
      console.error('[NetworkManager] connection error:', err.message);
      this._emit('connect-error', { message: err.message });
    });

    // --- Game event pass-throughs ---

    const gameEvents = [
      'room-created',
      'room-joined',
      'player-joined',
      'player-left',
      'player-ready-changed',
      'game-starting',
      'phase-changed',
      'timer-tick',
      'player-moved',
      'player-painted',
      'player-posed',
      'player-tagged',
      'game-results',
      'error',
    ];

    for (const event of gameEvents) {
      this.socket.on(event, (data) => {
        // Intercept events to update local bookkeeping
        this._handleServerEvent(event, data);
        this._emit(event, data);
      });
    }

    // --- Build throttled / debounced senders ---
    this._throttledMove = throttle((position, rotation) => {
      if (!this.socket?.connected) return;
      this.socket.emit('player-move', { position, rotation });
    }, 50); // 20 Hz

    this._debouncedPaint = debounce((paintData) => {
      if (!this.socket?.connected) return;
      this.socket.emit('player-paint', { paintData });
    }, 200);
  }

  // -----------------------------------------------------------------------
  // Event Registration
  // -----------------------------------------------------------------------

  /**
   * Register a callback for a network / game event.
   *
   * @param {string}   event    – Event name (e.g. 'room-created').
   * @param {Function} callback – Handler function receiving the event payload.
   * @returns {this}
   */
  on(event, callback) {
    if (!this.callbacks[event]) this.callbacks[event] = [];
    this.callbacks[event].push(callback);
    return this;
  }

  /**
   * Remove a previously registered callback (or all for an event).
   *
   * @param {string}   event
   * @param {Function} [callback] – Omit to remove all listeners for the event.
   * @returns {this}
   */
  off(event, callback) {
    if (!this.callbacks[event]) return this;
    if (!callback) {
      delete this.callbacks[event];
    } else {
      this.callbacks[event] = this.callbacks[event].filter((cb) => cb !== callback);
    }
    return this;
  }

  // -----------------------------------------------------------------------
  // Room Management
  // -----------------------------------------------------------------------

  /**
   * Ask the server to create a new room.
   *
   * @param {string} playerName
   * @param {Object} [settings]
   * @param {string} [settings.map]
   * @param {string} [settings.mode]
   * @param {number} [settings.prepTime]
   * @param {number} [settings.huntTime]
   */
  createRoom(playerName, settings = {}) {
    this._ensureConnected();
    this.socket.emit('create-room', {
      playerName,
      map: settings.map ?? 'default',
      mode: settings.mode ?? 'classic',
      prepTime: settings.prepTime ?? 30,
      huntTime: settings.huntTime ?? 120,
    });
  }

  /**
   * Ask the server to join an existing room.
   *
   * @param {string} roomCode – 6-char alphanumeric code.
   * @param {string} playerName
   */
  joinRoom(roomCode, playerName) {
    this._ensureConnected();
    this.socket.emit('join-room', {
      roomCode: roomCode.toUpperCase(),
      playerName,
    });
  }

  /** Leave the current room. */
  leaveRoom() {
    this._ensureConnected();
    this.socket.emit('leave-room');
    this._resetLocal();
  }

  /** Toggle ready status. */
  setReady() {
    this._ensureConnected();
    this.socket.emit('player-ready');
  }

  /** Host-only: start the game. */
  startGame() {
    this._ensureConnected();
    this.socket.emit('start-game');
  }

  // -----------------------------------------------------------------------
  // Gameplay
  // -----------------------------------------------------------------------

  /**
   * Send local player position. Throttled to 20 Hz (50 ms).
   *
   * @param {{ x: number, y: number, z: number }} position
   * @param {{ y: number }} rotation
   */
  sendMove(position, rotation) {
    if (!this._throttledMove) return;
    this._throttledMove(position, rotation);
  }

  /**
   * Send paint/camouflage data. Debounced to 200 ms.
   *
   * @param {string} paintData – Serialized canvas data per body part.
   */
  sendPaint(paintData) {
    if (!this._debouncedPaint) return;
    this._debouncedPaint(paintData);
  }

  /**
   * Send a pose change.
   *
   * @param {string} poseId
   */
  sendPose(poseId) {
    this._ensureConnected();
    this.socket.emit('player-pose', { poseId });
  }

  /**
   * Attempt to tag another player (seekers only).
   *
   * @param {string} targetId – Socket id of the target hider.
   */
  sendTag(targetId) {
    this._ensureConnected();
    this.socket.emit('player-tag', { targetId });
  }

  // -----------------------------------------------------------------------
  // Utility
  // -----------------------------------------------------------------------

  /** Request to return to lobby / play another round. */
  playAgain() {
    this._ensureConnected();
    this.socket.emit('play-again');
  }

  /** Disconnect from the server entirely. */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this._resetLocal();
  }

  /**
   * Whether the local player is the room host.
   * @returns {boolean}
   */
  isHost() {
    return this._isHost;
  }

  /**
   * Whether the socket is currently connected.
   * @returns {boolean}
   */
  isConnected() {
    return this.socket?.connected ?? false;
  }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  /** Emit to locally registered callbacks. */
  _emit(event, data) {
    const handlers = this.callbacks[event];
    if (!handlers) return;
    for (const handler of handlers) {
      try {
        handler(data);
      } catch (err) {
        console.error(`[NetworkManager] error in handler for "${event}":`, err);
      }
    }
  }

  /** Update local bookkeeping from specific server events. */
  _handleServerEvent(event, data) {
    switch (event) {
      case 'room-created':
        this.playerId = data.playerId;
        this.roomCode = data.roomCode;
        this._isHost = true;
        break;

      case 'room-joined':
        this.playerId = data.playerId;
        this.roomCode = data.roomCode;
        this._isHost = false;
        break;

      case 'player-left':
        // If the player that left was us, reset
        if (data.playerId === this.playerId) {
          this._resetLocal();
        }
        break;

      case 'phase-changed':
        if (data.phase === 'lobby') {
          // Reset host flag — the server may have promoted someone else
          // The client should re-check via its player list.
        }
        break;

      default:
        break;
    }
  }

  /** Reset local room state. */
  _resetLocal() {
    this.roomCode = null;
    this._isHost = false;
  }

  /** Throw if socket is not connected. */
  _ensureConnected() {
    if (!this.socket?.connected) {
      throw new Error('[NetworkManager] Not connected to server. Call connect() first.');
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

/** Pre-instantiated singleton for convenience. */
export const networkManager = new NetworkManager();
