/**
 * LobbyUI — Manages the lobby and waiting room screens.
 * Binds to existing DOM elements defined in index.html.
 */
export class LobbyUI {
  /**
   * @param {object} networkManager - The network manager for room operations.
   */
  constructor(networkManager) {
    this.network = networkManager;
    this.isHost = false;
    this._isReady = false;
    this._players = [];
    this._onCreateCallbacks = [];
    this._onJoinCallbacks = [];

    this._bindElements();
    this._bindEvents();
  }

  // ───────────────────────────── DOM Binding ─────────────────────────────

  _bindElements() {
    // Screens
    this.lobbyScreen = document.getElementById('lobby-screen');
    this.waitingScreen = document.getElementById('waiting-room-screen');

    // Create room form
    this.playerNameCreate = document.getElementById('player-name-create');
    this.mapSelect = document.getElementById('map-select');
    this.modeSelect = document.getElementById('mode-select');
    this.prepTimeSelect = document.getElementById('prep-time');
    this.huntTimeSelect = document.getElementById('hunt-time');
    this.btnCreateRoom = document.getElementById('btn-create-room');

    // Join room form
    this.playerNameJoin = document.getElementById('player-name-join');
    this.roomCodeInput = document.getElementById('room-code-input');
    this.btnJoinRoom = document.getElementById('btn-join-room');

    // Waiting room
    this.roomCodeDisplay = document.getElementById('room-code-display');
    this.playerList = document.getElementById('player-list');
    this.btnReady = document.getElementById('btn-ready');
    this.btnStartGame = document.getElementById('btn-start-game');
    this.btnLeaveRoom = document.getElementById('btn-leave-room');
  }

  _bindEvents() {
    this.btnCreateRoom.addEventListener('click', () => this.onCreateRoom());
    this.btnJoinRoom.addEventListener('click', () => this.onJoinRoom());
    this.btnReady.addEventListener('click', () => this.onReady());
    this.btnStartGame.addEventListener('click', () => this.onStartGame());
    this.btnLeaveRoom.addEventListener('click', () => this.onLeave());

    // Allow Enter key in room code field to trigger join
    this.roomCodeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.onJoinRoom();
    });
  }

  // ───────────────────────────── Visibility ─────────────────────────────

  /** Show the lobby screen (create/join panels). */
  show() {
    this.lobbyScreen.classList.remove('hidden');
    this._resetForms();
  }

  /** Hide the lobby screen. */
  hide() {
    this.lobbyScreen.classList.add('hidden');
  }

  /** Transition into the waiting room view. */
  showWaitingRoom(roomCode, players = []) {
    this.hide();
    this.roomCodeDisplay.textContent = roomCode;
    this.updatePlayerList(players);
    this.waitingScreen.classList.remove('hidden');
    this._isReady = false;
    this._updateReadyButton();
  }

  /** Hide the waiting room screen. */
  hideWaitingRoom() {
    this.waitingScreen.classList.add('hidden');
  }

  // ─────────────────────────── Player List ───────────────────────────

  /**
   * Render the player list with ready status badges.
   * @param {Array<{id: string, name: string, ready: boolean, isHost: boolean}>} players
   */
  updatePlayerList(players) {
    this._players = players;
    this.playerList.innerHTML = '';

    for (const player of players) {
      const item = document.createElement('div');
      item.className = 'player-item';
      if (player.ready) item.classList.add('ready');

      // Player name
      const nameSpan = document.createElement('span');
      nameSpan.className = 'player-name';
      nameSpan.textContent = player.name;
      item.appendChild(nameSpan);

      // Host badge
      if (player.isHost) {
        const hostBadge = document.createElement('span');
        hostBadge.className = 'host-badge';
        hostBadge.textContent = 'HOST';
        item.appendChild(hostBadge);
      }

      // Ready badge
      if (player.ready) {
        const readyBadge = document.createElement('span');
        readyBadge.className = 'ready-badge';
        readyBadge.textContent = 'READY';
        item.appendChild(readyBadge);
      }

      this.playerList.appendChild(item);
    }

    this._updateStartButton();
  }

  /**
   * Configure host-specific UI.
   * @param {boolean} isHost
   */
  setHost(isHost) {
    this.isHost = isHost;
    if (isHost) {
      this.btnStartGame.classList.remove('hidden');
    } else {
      this.btnStartGame.classList.add('hidden');
    }
    this._updateStartButton();
  }

  // ─────────────────────────── Actions ───────────────────────────────

  onCreateRoom() {
    const playerName = this.playerNameCreate.value.trim();
    if (!playerName) {
      this._flashInput(this.playerNameCreate);
      return;
    }

    const settings = {
      map: this.mapSelect.value,
      mode: this.modeSelect.value,
      prepTime: parseInt(this.prepTimeSelect.value, 10),
      huntTime: parseInt(this.huntTimeSelect.value, 10),
    };

    if (this.network && typeof this.network.createRoom === 'function') {
      this.network.createRoom(playerName, settings);
    }
  }

  /** Gather join-room form data and request to join. */
  onJoinRoom() {
    const playerName = this.playerNameJoin.value.trim();
    const roomCode = this.roomCodeInput.value.trim().toUpperCase();

    if (!playerName) {
      this._flashInput(this.playerNameJoin);
      return;
    }
    if (!roomCode) {
      this._flashInput(this.roomCodeInput);
      return;
    }

    if (this.network && typeof this.network.joinRoom === 'function') {
      this.network.joinRoom(roomCode, playerName);
    }
  }

  /** Toggle the local player's ready state. */
  onReady() {
    this._isReady = !this._isReady;
    this._updateReadyButton();

    if (this.network && typeof this.network.setReady === 'function') {
      this.network.setReady(this._isReady);
    }
  }

  /** Request the game to start (host only). */
  onStartGame() {
    if (!this.isHost) return;

    if (this.network && typeof this.network.startGame === 'function') {
      this.network.startGame();
    }
  }

  /** Leave the current room and return to the lobby. */
  onLeave() {
    if (this.network && typeof this.network.leaveRoom === 'function') {
      this.network.leaveRoom();
    }

    this.hideWaitingRoom();
    this.show();
    this._isReady = false;
    this._players = [];
  }

  // ─────────────────────────── Helpers ───────────────────────────────

  /** Enable/disable the start button based on player ready count. */
  _updateStartButton() {
    if (!this.isHost) return;
    const readyCount = this._players.filter((p) => p.ready).length;
    this.btnStartGame.disabled = readyCount < 2;
  }

  /** Update the ready button label and style. */
  _updateReadyButton() {
    if (this._isReady) {
      this.btnReady.textContent = 'Not Ready';
      this.btnReady.classList.add('active');
    } else {
      this.btnReady.textContent = 'Ready Up';
      this.btnReady.classList.remove('active');
    }
  }

  /** Reset form fields to their defaults. */
  _resetForms() {
    this.playerNameCreate.value = '';
    this.playerNameJoin.value = '';
    this.roomCodeInput.value = '';
    this._isReady = false;
    this._updateReadyButton();
  }

  /** Briefly flash an input field to indicate a validation error. */
  _flashInput(inputEl) {
    inputEl.classList.add('input-error');
    inputEl.focus();
    setTimeout(() => inputEl.classList.remove('input-error'), 800);
  }
}
