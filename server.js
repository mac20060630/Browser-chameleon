/**
 * Browser Chameleon — Multiplayer Hide-and-Seek Server
 *
 * Express + Socket.io server that manages rooms, game phases,
 * player state, tagging, and scoring.
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PORT = process.env.PORT || 3000;
const MAX_PLAYERS_PER_ROOM = 10;
const ROOM_CODE_LENGTH = 6;
const TICK_RATE_MS = 50;          // 20 Hz
const RESULTS_DISPLAY_MS = 10000; // 10 seconds on results screen
const ROOM_CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Generate a random uppercase alphanumeric room code. */
function generateRoomCode() {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_CHARS.charAt(Math.floor(Math.random() * ROOM_CODE_CHARS.length));
  }
  return code;
}

/** Euclidean distance between two {x, y, z} positions. */
function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** Create a fresh player state object. */
function createPlayer(id, name, isHost = false) {
  return {
    id,
    name,
    role: null,            // 'hider' | 'seeker' | null
    position: { x: 0, y: 0, z: 0 },
    rotation: { y: 0 },
    alive: true,
    paintData: null,       // serialized canvas data per body part
    poseId: null,
    score: 0,
    ready: false,
    isHost,
  };
}

// ---------------------------------------------------------------------------
// Room & Game State
// ---------------------------------------------------------------------------

/** @type {Map<string, Room>} roomCode -> Room */
const rooms = new Map();

/** @type {Map<string, string>} socketId -> roomCode */
const socketRoomMap = new Map();

/**
 * @typedef {Object} Room
 * @property {string}   code
 * @property {string}   hostId
 * @property {string}   phase        lobby | prep | hunt | results
 * @property {Object}   settings     { map, mode, prepTime, huntTime }
 * @property {Map}      players      socketId -> PlayerState
 * @property {number|null} timerRemaining
 * @property {NodeJS.Timeout|null} tickInterval
 * @property {NodeJS.Timeout|null} resultsTimeout
 */

function createRoom(hostId, hostName, settings) {
  let code;
  do {
    code = generateRoomCode();
  } while (rooms.has(code));

  const room = {
    code,
    hostId,
    phase: 'lobby',
    settings: {
      map: settings.map || 'default',
      mode: settings.mode || 'classic',         // classic | increasing-oni
      prepTime: settings.prepTime || 30,         // seconds
      huntTime: settings.huntTime || 120,        // seconds
    },
    players: new Map(),
    timerRemaining: null,
    tickInterval: null,
    resultsTimeout: null,
  };

  const host = createPlayer(hostId, hostName, true);
  room.players.set(hostId, host);

  rooms.set(code, room);
  socketRoomMap.set(hostId, code);

  return room;
}

/** Serialise player map to a plain array for transport. */
function serializePlayers(playerMap) {
  return Array.from(playerMap.values()).map((p) => ({ ...p }));
}

// ---------------------------------------------------------------------------
// Game Logic
// ---------------------------------------------------------------------------

/**
 * Assign roles to all players.
 * 25 % seekers (min 1), rest are hiders.
 */
function assignRoles(room) {
  const ids = Array.from(room.players.keys());
  let seekerCount;
  if (ids.length === 1) {
    seekerCount = 0; // If playing solo, start as a hider
  } else {
    seekerCount = Math.max(1, Math.round(ids.length * 0.25));
  }

  // Shuffle ids
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }

  const roles = {};
  ids.forEach((id, idx) => {
    const role = idx < seekerCount ? 'seeker' : 'hider';
    roles[id] = role;
    const player = room.players.get(id);
    player.role = role;
    player.alive = true;
    player.score = 0;
  });

  return roles;
}

/** Start the game-phase tick loop. */
function startPhaseTick(room, io) {
  // Clear any previous interval
  if (room.tickInterval) clearInterval(room.tickInterval);

  let lastTick = Date.now();

  room.tickInterval = setInterval(() => {
    const now = Date.now();
    const delta = (now - lastTick) / 1000;
    lastTick = now;

    if (room.timerRemaining !== null) {
      room.timerRemaining = Math.max(0, room.timerRemaining - delta);

      io.to(room.code).emit('timer-tick', {
        timeRemaining: Math.ceil(room.timerRemaining),
      });

      if (room.timerRemaining <= 0) {
        onPhaseTimerEnd(room, io);
      }
    }
  }, TICK_RATE_MS);
}

/** Called when the current phase timer reaches 0. */
function onPhaseTimerEnd(room, io) {
  if (room.phase === 'prep') {
    transitionToHunt(room, io);
  } else if (room.phase === 'hunt') {
    transitionToResults(room, io);
  }
}

/** Move from lobby -> prep. */
function transitionToPrep(room, io) {
  room.phase = 'prep';
  room.timerRemaining = room.settings.prepTime;

  io.to(room.code).emit('phase-changed', {
    phase: 'prep',
    timeRemaining: room.settings.prepTime,
  });

  startPhaseTick(room, io);
}

/** Move from prep -> hunt. */
function transitionToHunt(room, io) {
  room.phase = 'hunt';
  room.timerRemaining = room.settings.huntTime;

  io.to(room.code).emit('phase-changed', {
    phase: 'hunt',
    timeRemaining: room.settings.huntTime,
  });
}

/** Move from hunt -> results. */
function transitionToResults(room, io) {
  room.phase = 'results';
  room.timerRemaining = null;

  if (room.tickInterval) {
    clearInterval(room.tickInterval);
    room.tickInterval = null;
  }

  // --- Scoring ---
  const huntTime = room.settings.huntTime;
  const halfTime = huntTime / 2;
  const timeElapsed = huntTime - (room.timerRemaining ?? 0);

  const seekerIds = [];
  const hiderIds = [];

  for (const [id, p] of room.players) {
    if (p.role === 'seeker' || (room.settings.mode === 'increasing-oni' && p.role === 'seeker')) {
      seekerIds.push(id);
    }
    if (p.role === 'hider') {
      hiderIds.push(id);
    }
  }

  // Hider scoring
  let aliveHiderCount = 0;
  for (const id of hiderIds) {
    const p = room.players.get(id);
    if (!p) continue;
    if (p.alive) {
      aliveHiderCount++;
      // Survived full timer
      p.score += 100;
    }
  }

  // Check seekers who found all hiders
  const allHidersTagged = hiderIds.every((id) => {
    const p = room.players.get(id);
    return p && !p.alive;
  });

  if (allHidersTagged) {
    for (const id of seekerIds) {
      const p = room.players.get(id);
      if (p) p.score += 150;
    }
  }

  // Last surviving hider bonus
  if (aliveHiderCount === 1) {
    for (const id of hiderIds) {
      const p = room.players.get(id);
      if (p && p.alive) {
        p.score += 200;
      }
    }
  }

  // Build results payload
  const scores = {};
  let highScore = -1;
  let winner = null;
  const highlights = [];

  for (const [id, p] of room.players) {
    scores[id] = { name: p.name, score: p.score, role: p.role, alive: p.alive };
    if (p.score > highScore) {
      highScore = p.score;
      winner = { id, name: p.name, score: p.score };
    }
  }

  if (allHidersTagged) highlights.push('All hiders found!');
  if (aliveHiderCount > 0) highlights.push(`${aliveHiderCount} hider(s) survived!`);

  io.to(room.code).emit('game-results', { scores, highlights, winner });

  io.to(room.code).emit('phase-changed', {
    phase: 'results',
    timeRemaining: RESULTS_DISPLAY_MS / 1000,
  });

  // Auto-return to lobby after 10 s
  room.resultsTimeout = setTimeout(() => {
    transitionToLobby(room, io);
  }, RESULTS_DISPLAY_MS);
}

/** Move from results -> lobby. */
function transitionToLobby(room, io) {
  room.phase = 'lobby';
  room.timerRemaining = null;

  if (room.tickInterval) {
    clearInterval(room.tickInterval);
    room.tickInterval = null;
  }
  if (room.resultsTimeout) {
    clearTimeout(room.resultsTimeout);
    room.resultsTimeout = null;
  }

  // Reset player state for next round
  for (const [, p] of room.players) {
    p.role = null;
    p.alive = true;
    p.paintData = null;
    p.poseId = null;
    p.score = 0;
    p.ready = false;
  }

  io.to(room.code).emit('phase-changed', { phase: 'lobby', timeRemaining: null });
}

/** Check if the hunt should end early (win conditions). */
function checkWinCondition(room, io) {
  if (room.phase !== 'hunt') return;

  // Don't end game if playing solo
  if (room.players.size < 2) return;

  const hiders = Array.from(room.players.values()).filter((p) => p.role === 'hider');
  const aliveHiders = hiders.filter((p) => p.alive);

  // All hiders tagged → seekers win
  if (aliveHiders.length === 0) {
    transitionToResults(room, io);
  }
}

/** Clean up a room entirely. */
function destroyRoom(room) {
  if (room.tickInterval) clearInterval(room.tickInterval);
  if (room.resultsTimeout) clearTimeout(room.resultsTimeout);
  rooms.delete(room.code);
}

// ---------------------------------------------------------------------------
// Express + Socket.io Setup
// ---------------------------------------------------------------------------

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Serve static build
app.use(express.static(join(__dirname, 'dist')));

// Fallback — serve index.html for SPA routes
app.get('*', (_req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// ---------------------------------------------------------------------------
// Socket.io Connection Handler
// ---------------------------------------------------------------------------

io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id}`);

  // -----------------------------------------------------------------------
  // CREATE ROOM
  // -----------------------------------------------------------------------
  socket.on('create-room', ({ playerName, map, mode, prepTime, huntTime }) => {
    if (!playerName || playerName.trim().length === 0) {
      socket.emit('error', { message: 'Player name is required.' });
      return;
    }

    // Leave any existing room first
    leaveCurrentRoom(socket, io);

    const room = createRoom(socket.id, playerName.trim(), {
      map, mode, prepTime, huntTime,
    });

    socket.join(room.code);

    socket.emit('room-created', {
      roomCode: room.code,
      playerId: socket.id,
    });
    
    // Broadcast the initial player list to the room so the host sees themselves
    broadcastPlayerList(room, io);

    console.log(`[room-created] ${room.code} by ${playerName}`);
  });

  // -----------------------------------------------------------------------
  // JOIN ROOM
  // -----------------------------------------------------------------------
  socket.on('join-room', ({ roomCode, playerName }) => {
    if (!playerName || playerName.trim().length === 0) {
      socket.emit('error', { message: 'Player name is required.' });
      return;
    }
    if (!roomCode) {
      socket.emit('error', { message: 'Room code is required.' });
      return;
    }

    const code = roomCode.toUpperCase();
    const room = rooms.get(code);

    if (!room) {
      socket.emit('error', { message: 'Room not found.' });
      return;
    }
    if (room.players.size >= MAX_PLAYERS_PER_ROOM) {
      socket.emit('error', { message: 'Room is full.' });
      return;
    }
    if (room.players.has(socket.id)) {
      socket.emit('error', { message: 'Already in this room.' });
      return;
    }

    // Leave any existing room first
    leaveCurrentRoom(socket, io);

    const player = createPlayer(socket.id, playerName.trim());
    room.players.set(socket.id, player);
    socketRoomMap.set(socket.id, code);

    // If joining mid-game, assign a role dynamically
    if (room.phase !== 'lobby') {
      const seekers = Array.from(room.players.values()).filter(p => p.role === 'seeker');
      player.role = seekers.length === 0 ? 'seeker' : 'hider';
      player.alive = true;
      player.score = 0;
    }

    socket.join(room.code);

    socket.emit('room-joined', {
      roomCode: code,
      playerId: socket.id,
      players: Array.from(room.players.values()),
      phase: room.phase,
      timeRemaining: room.timerRemaining,
      settings: room.settings
    });

    io.to(code).emit('player-joined', { player });
    
    // If mid-game, emit midgame specific event
    if (room.phase !== 'lobby') {
      socket.to(code).emit('player-joined-midgame', { player });
    }

    broadcastPlayerList(room, io);

    console.log(`[join-room] ${playerName} -> ${code}`);
  });

  // -----------------------------------------------------------------------
  // PLAYER READY
  // -----------------------------------------------------------------------
  socket.on('player-ready', () => {
    const room = getRoomForSocket(socket);
    if (!room) return;
    if (room.phase !== 'lobby') return;

    const player = room.players.get(socket.id);
    if (!player) return;

    player.ready = !player.ready;

    io.to(room.code).emit('player-ready-changed', {
      playerId: socket.id,
      ready: player.ready,
    });
  });

  // -----------------------------------------------------------------------
  // START GAME (host only)
  // -----------------------------------------------------------------------
  socket.on('start-game', () => {
    const room = getRoomForSocket(socket);
    if (!room) return;

    if (socket.id !== room.hostId) {
      socket.emit('error', { message: 'Only the host can start the game.' });
      return;
    }
    if (room.phase !== 'lobby') {
      socket.emit('error', { message: 'Game is not in the lobby phase.' });
      return;
    }

    const roles = assignRoles(room);

    io.to(room.code).emit('game-starting', {
      roles,
      players: serializePlayers(room.players),
    });

    // Small delay so clients can show role assignments before phase begins
    setTimeout(() => {
      transitionToPrep(room, io);
    }, 2000);
  });

  // -----------------------------------------------------------------------
  // PLAYER MOVE
  // -----------------------------------------------------------------------
  socket.on('player-move', ({ position, rotation }) => {
    const room = getRoomForSocket(socket);
    if (!room) return;

    const player = room.players.get(socket.id);
    if (!player) return;

    // Hiders cannot move during hunt phase (they are frozen)
    if (room.phase === 'hunt' && player.role === 'hider') return;
    // Seekers cannot move during prep phase
    if (room.phase === 'prep' && player.role === 'seeker') return;

    if (position) {
      player.position = { x: position.x, y: position.y, z: position.z };
    }
    if (rotation) {
      player.rotation = { y: rotation.y };
    }

    socket.to(room.code).emit('player-moved', {
      playerId: socket.id,
      position: player.position,
      rotation: player.rotation,
    });
  });

  // -----------------------------------------------------------------------
  // PLAYER PAINT
  // -----------------------------------------------------------------------
  socket.on('player-paint', ({ paintData }) => {
    const room = getRoomForSocket(socket);
    if (!room) return;
    if (room.phase !== 'prep') return;

    const player = room.players.get(socket.id);
    if (!player || player.role !== 'hider') return;

    player.paintData = player.paintData || {};
    Object.assign(player.paintData, paintData);

    socket.to(room.code).emit('player-painted', {
      playerId: socket.id,
      paintData,
    });
  });

  // -----------------------------------------------------------------------
  // PLAYER POSE
  // -----------------------------------------------------------------------
  socket.on('player-pose', ({ poseId }) => {
    const room = getRoomForSocket(socket);
    if (!room) return;
    if (room.phase !== 'prep') return;

    const player = room.players.get(socket.id);
    if (!player || player.role !== 'hider') return;

    player.poseId = poseId;

    socket.to(room.code).emit('player-posed', {
      playerId: socket.id,
      poseId,
    });
  });

  // -----------------------------------------------------------------------
  // PLAYER TAG
  // -----------------------------------------------------------------------
  socket.on('player-tag', ({ targetId }) => {
    const room = getRoomForSocket(socket);
    if (!room) return;
    if (room.phase !== 'hunt') return;

    const seeker = room.players.get(socket.id);
    if (!seeker || seeker.role !== 'seeker') return;

    const hider = room.players.get(targetId);
    if (!hider || hider.role !== 'hider' || !hider.alive) return;

    // Distance check (< 3 units)
    const dist = distance(seeker.position, hider.position);
    if (dist >= 3) {
      socket.emit('error', { message: 'Target is too far away.' });
      return;
    }

    // Tag successful
    hider.alive = false;
    seeker.score += 75; // seeker finds a hider

    // Half-timer survival bonus for the hider
    const elapsed = room.settings.huntTime - (room.timerRemaining ?? 0);
    if (elapsed >= room.settings.huntTime / 2) {
      hider.score += 50;
    }

    io.to(room.code).emit('player-tagged', {
      seekerId: socket.id,
      hiderId: targetId,
    });

    // Increasing-oni mode: tagged hider becomes a seeker
    if (room.settings.mode === 'increasing-oni') {
      hider.role = 'seeker';
      hider.alive = true;
    }

    console.log(`[tag] ${seeker.name} tagged ${hider.name} (dist=${dist.toFixed(2)})`);

    checkWinCondition(room, io);
  });

  // -----------------------------------------------------------------------
  // LEAVE ROOM
  // -----------------------------------------------------------------------
  socket.on('leave-room', () => {
    leaveCurrentRoom(socket, io);
  });

  // -----------------------------------------------------------------------
  // PLAY AGAIN
  // -----------------------------------------------------------------------
  socket.on('play-again', () => {
    const room = getRoomForSocket(socket);
    if (!room) return;

    // Only meaningful during results phase
    if (room.phase === 'results') {
      // Immediately transition back to lobby
      transitionToLobby(room, io);
    }
  });

  // -----------------------------------------------------------------------
  // DISCONNECT
  // -----------------------------------------------------------------------
  socket.on('disconnect', (reason) => {
    console.log(`[disconnect] ${socket.id} (${reason})`);
    leaveCurrentRoom(socket, io);
  });
});

// ---------------------------------------------------------------------------
// Shared Utilities
// ---------------------------------------------------------------------------

/** Get the room a socket currently belongs to. */
function getRoomForSocket(socket) {
  const code = socketRoomMap.get(socket.id);
  if (!code) return null;
  return rooms.get(code) || null;
}

/** Remove a socket from its current room, handle cleanup. */
function leaveCurrentRoom(socket, ioServer) {
  const code = socketRoomMap.get(socket.id);
  if (!code) return;

  const room = rooms.get(code);
  socketRoomMap.delete(socket.id);

  if (!room) return;

  room.players.delete(socket.id);
  socket.leave(code);

  ioServer.to(code).emit('player-left', { playerId: socket.id });

  console.log(`[leave] ${socket.id} left ${code}`);

  // If room is empty, destroy it
  if (room.players.size === 0) {
    destroyRoom(room);
    console.log(`[room-destroyed] ${code}`);
    return;
  }

  // If the host left, promote the next player
  if (socket.id === room.hostId) {
    const newHostId = room.players.keys().next().value;
    room.hostId = newHostId;
    const newHost = room.players.get(newHostId);
    if (newHost) newHost.isHost = true;
    console.log(`[host-promoted] ${newHostId} in ${code}`);
  }

  // If a player leaves mid-game, check win condition
  if (room.phase === 'hunt') {
    checkWinCondition(room, ioServer);
  }
}

// ---------------------------------------------------------------------------
// Start Server
// ---------------------------------------------------------------------------

httpServer.listen(PORT, () => {
  console.log(`\n  🦎  Browser Chameleon server listening on http://localhost:${PORT}\n`);
});
