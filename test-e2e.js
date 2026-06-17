import { io } from 'socket.io-client';

async function runTest() {
  console.log('--- Starting E2E Multiplayer Game Test ---');

  const host = io('http://localhost:3000');
  let guest;
  let roomCode = '';
  let hostId = '';
  let guestId = '';

  const timeout = setTimeout(() => {
    console.error('Test timed out after 10 seconds.');
    process.exit(1);
  }, 15000);

  host.on('connect', () => {
    console.log('Host connected.');
    hostId = host.id;
    host.emit('create-room', {
      playerName: 'HostPlayer',
      map: 'party-room',
      mode: 'classic',
      prepTime: 1,
      huntTime: 10,
    });
  });

  host.on('room-created', (data) => {
    roomCode = data.roomCode;
    console.log(`Room created: ${roomCode}`);
    
    // Host readies up
    host.emit('player-ready', { ready: true });
    
    // Host starts game
    setTimeout(() => {
      console.log('Host starting game...');
      host.emit('start-game');
    }, 100);
  });

  host.on('game-starting', (data) => {
    console.log(`Game starting. Host role: ${data.roles[hostId]}`);
    if (data.roles[hostId] !== 'hider') {
      console.error('Host should be a hider when starting alone!');
      process.exit(1);
    }

    // Now let guest join mid-game
    console.log('Guest waiting 2.5s to ensure game has fully started...');
    setTimeout(() => {
      guest = io('http://localhost:3000');

      guest.on('connect', () => {
        guestId = guest.id;
        guest.emit('join-room', { roomCode, playerName: 'GuestPlayer' });
      });

    guest.on('room-joined', (joinData) => {
      console.log(`Guest joined. Phase: ${joinData.phase}`);
      if (joinData.phase === 'lobby') {
        console.error('Game should NOT be in lobby phase!');
        process.exit(1);
      }

      // Check guest role
      const guestPlayer = joinData.players.find(p => p.id === guestId);
      console.log(`Guest assigned role: ${guestPlayer.role}`);
      if (guestPlayer.role !== 'seeker') {
        console.error('Guest should be dynamically assigned as seeker!');
        process.exit(1);
      }

      // Listen for hunt phase to tag
      guest.on('phase-changed', (data) => {
        if (data.phase === 'hunt') {
          console.log('Guest tagging host in hunt phase...');
          guest.emit('tag', { targetId: hostId });
        }
      });
    });

    guest.on('error', (err) => {
      console.error('Guest Error:', err);
      process.exit(1);
    });
  }, 2500);
  });

  host.on('phase-changed', (data) => {
    console.log(`Phase changed to: ${data.phase}`);
    if (data.phase === 'results') {
      console.log('✅ GAME SUCCESSFULLY COMPLETED AND TRANSITIONED TO RESULTS!');
      clearTimeout(timeout);
      process.exit(0);
    }
  });

  host.on('error', (err) => {
    console.error('Host Error:', err);
    process.exit(1);
  });
}

runTest();
