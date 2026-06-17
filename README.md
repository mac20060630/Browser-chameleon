# Browser Chameleon 🦎

A multiplayer hide-and-seek game built with Three.js, Node.js, and Socket.io where hiders must manually paint themselves to blend into their environment before the seekers are released to hunt them down. 

Artistic skill, positioning, and posing are the keys to survival!

## Features

- **Multiplayer Lobbies:** Create a room and invite up to 9 friends (10 players max per room).
- **Customizable Painting:** Use brushes, patterns, and eyedropper tools to paint your 3D character model to perfectly match the environment.
- **Dynamic 3D Maps:** Hide in the colorful Party Room or the office environment.
- **Pose System:** Freeze yourself into different poses (sitting, fetal, star, T-pose, etc.) to blend in as a prop.
- **Procedural Audio & VFX:** Real-time generated background music and satisfying particle explosions when players are tagged.
- **Optimized Networking:** Delta-syncs only painted body parts over WebSockets to ensure smooth performance even when 10 people are painting simultaneously.

## How to Play

1. **Host a Game:** Create a room and select your map.
2. **Share the Code:** Give the 6-letter room code to your friends.
3. **Preparation Phase:** 75% of players are assigned as Hiders and 25% as Seekers. 
   - **Hiders** have 60 seconds to find a spot, choose a pose, and paint themselves to blend in perfectly.
   - **Seekers** are held in a waiting room.
4. **Hunt Phase:** Seekers are released and must try to find and tag the hidden players by clicking on them. 
5. **Results:** Points are awarded based on survival time and successful tags.

## Running Locally

To run this project on your own machine, you'll need [Node.js](https://nodejs.org/) installed.

1. Clone the repository:
   ```bash
   git clone https://github.com/mac20060630/Browser-chameleon.git
   cd Browser-chameleon
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

3. Start both the Vite frontend and Node backend simultaneously:
   ```bash
   npm run dev
   ```

4. Open `http://localhost:5173` in your browser.

## Deployment

This game is designed to be easily hosted on a single Node.js instance (like a free [Render.com](https://render.com) Web Service).

**To deploy to Render:**
1. Connect this GitHub repository to a new Render "Web Service".
2. Set the **Build Command** to: `npm install && npm run build`
3. Set the **Start Command** to: `npm start`
4. Deploy! The Node backend will automatically serve the built frontend assets while handling WebSocket traffic on the same port.
