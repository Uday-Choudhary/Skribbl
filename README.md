# 🎨 Skribbl Clone

A full-stack, real-time multiplayer drawing and guessing game — inspired by [skribbl.io](https://skribbl.io). Draw, guess, and compete with friends in private rooms using WebSocket-powered gameplay.

> **Live Demo**: [skribbl-clone.onrender.com](https://skribbl-clone-ol2p.onrender.com/) *(free tier — may take ~30s to wake)*

---

## ✨ Features

### Core Gameplay
- **Create & Join Rooms** — Generate a 6-character room code and share it with friends
- **Real-Time Drawing** — HTML5 Canvas with live stroke broadcasting to all players
- **Guessing & Chat** — Type guesses in chat; correct answers are auto-detected server-side
- **Round System** — Configurable rounds with turn rotation for each player
- **Word Selection** — Drawer picks from 3 random words; auto-selects after 15s timeout
- **Scoring** — Time-based scoring: faster guesses earn more points (up to 500 + 100 first-guesser bonus)
- **Leaderboard** — Live scoreboard with round-end summaries and final standings

### Drawing Tools
- 🖊️ **Pen** — Freehand drawing with color picker and adjustable brush size
- 🧹 **Eraser** — Erase specific strokes
- ↩️ **Undo** — Remove the last stroke
- 🗑️ **Clear** — Wipe the entire canvas

### Real-Time Features
- ⚡ **WebSocket Sync** — All drawing, guessing, and game state updates via Socket.IO
- 💡 **Progressive Hints** — Letters are revealed over time to help guessers
- 🔄 **Reconnection Support** — Token-based session recovery on disconnect
- 👥 **Player Presence** — Live join/leave notifications and connected status tracking

### Room Management
- 🔒 **Private Rooms** — Rooms are invite-only via room code
- ⚙️ **Configurable Settings** — Max players (up to 20), rounds, draw time, word count, hints
- 👑 **Host Controls** — Only the host can start the game and configure settings
- 🚪 **No Account Needed** — Session-based players; just enter a name and play

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 · TypeScript · Vite · Tailwind CSS · Zustand |
| **Backend** | Node.js · Express 5 · Socket.IO · TypeScript |
| **Real-Time** | Socket.IO (WebSocket + fallback transport) |
| **State** | Zustand (client) · In-memory OOP classes (server) |
| **Deployment** | Render (Web Service + Blueprint) |

---

## 📁 Project Structure

```
├── frontend/                  # React SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── Canvas.tsx          # HTML5 Canvas drawing with tool controls
│   │   │   ├── ChatBox.tsx         # Chat + guessing input
│   │   │   ├── GameView.tsx        # Main game layout (canvas + chat + scoreboard)
│   │   │   ├── Scoreboard.tsx      # Live player scores
│   │   │   ├── WordSelector.tsx    # Word choice UI for the drawer
│   │   │   └── RoundEndOverlay.tsx # Round/game end summary overlay
│   │   ├── context/
│   │   │   └── SocketContext.tsx    # Socket.IO provider (singleton connection)
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx     # Create/join room flow
│   │   │   └── RoomPage.tsx        # Lobby + game screen
│   │   ├── store/
│   │   │   └── gameStore.ts        # Zustand global state
│   │   ├── App.tsx                 # Router setup
│   │   └── main.tsx                # Entry point
│   └── vite.config.ts
│
├── backend/                   # Node.js server
│   ├── src/
│   │   ├── classes/
│   │   │   ├── Game.ts             # Round/turn logic, scoring, hints, timers
│   │   │   ├── Room.ts             # Room state, settings, player management
│   │   │   ├── Player.ts           # Player identity and connection state
│   │   │   └── WordService.ts      # Random word selection from word bank
│   │   ├── data/
│   │   │   └── words.json          # Categorized word bank
│   │   ├── db/
│   │   │   └── roomStore.ts        # In-memory room storage
│   │   ├── routes/
│   │   │   └── rooms.ts            # REST API: create/join/list rooms
│   │   ├── socket/
│   │   │   └── index.ts            # Socket.IO event handlers
│   │   └── index.ts                # Express + Socket.IO bootstrap
│   └── tsconfig.json
│
├── render.yaml                # Render deployment blueprint
└── package.json               # Root scripts (install, build, start)
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** ≥ 18
- **npm** ≥ 9

### Installation

```bash
# Clone the repository
git clone https://github.com/Uday-Choudhary/Skribbl.git
cd Skribbl

# Install all dependencies (frontend + backend)
npm run install:all
```

### Development

```bash
# Start backend (port 3001)
npm run dev:backend

# In a separate terminal, start frontend (port 5173)
npm run dev:frontend
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build

```bash
# Build both frontend and backend
npm run build

# Start the production server (serves frontend from backend)
npm start
```

---

## 🌐 API Reference

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/rooms` | Create a new room |
| `GET` | `/rooms` | List all public rooms |
| `GET` | `/rooms/:id` | Get room details by ID |
| `GET` | `/rooms/code/:code` | Get room details by join code |
| `GET` | `/health` | Health check |

### WebSocket Events

#### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `create_room` | `{ playerName }` | Create a new room |
| `join_room` | `{ roomId, playerName }` | Join an existing room |
| `reconnect_attempt` | `{ token }` | Reconnect with session token |
| `start_game` | — | Host starts the game |
| `word_chosen` | `{ word }` | Drawer selects a word |
| `draw` | `{ stroke }` | Send a drawing stroke |
| `draw_undo` | — | Undo last stroke |
| `draw_clear` | — | Clear the canvas |
| `guess` | `{ text }` | Submit a guess |
| `chat` | `{ text }` | Send a chat message |
| `update_settings` | `{ settings }` | Update room settings (host only) |

#### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `room_created` | `{ roomId, playerId, token }` | Room successfully created |
| `room_joined` | `{ roomId, playerId, token }` | Joined room successfully |
| `game_state` | `{ room data }` | Full room state sync |
| `player_joined` / `player_left` | `{ players[] }` | Player list updated |
| `round_start` | `{ round, drawerId, drawTime }` | New round begins |
| `word_chosen` | `{ hint }` | Word selected, hint shown |
| `draw` | `{ stroke }` | Incoming stroke to render |
| `timer` | `{ seconds }` | Countdown tick |
| `hint` | `{ hint }` | Updated hint with revealed letter |
| `correct_guess` | `{ playerId, scores }` | Someone guessed correctly |
| `round_end` | `{ word, scores, leaderboard }` | Round summary |
| `game_over` | `{ winner, leaderboard }` | Final results |

---

## 🎮 Game Flow

```
Landing Page → Create/Join Room → Lobby (waiting for players)
    ↓
Host clicks "Start Game"
    ↓
┌─────────────────────────────────────────────┐
│  Round Loop (for each round):               │
│    ↓                                        │
│  Turn Loop (each player draws once):        │
│    1. Drawer gets 3 word options (15s)       │
│    2. Drawing phase begins (configurable)    │
│    3. Other players guess in chat            │
│    4. Hints reveal letters over time         │
│    5. Turn ends when all guess or time runs  │
│    ↓                                        │
│  Round End → Show scores                    │
└─────────────────────────────────────────────┘
    ↓
Game Over → Final leaderboard → Return to lobby
```

---

## ⚙️ Configuration

Default room settings (configurable by host in lobby):

| Setting | Default | Range |
|---------|---------|-------|
| Max Players | 8 | 2–20 |
| Rounds | 3 | 1–10 |
| Draw Time | 80s | 30–180s |
| Word Options | 3 | 2–5 |
| Hints | 2 | 0–5 |

Environment variables (`backend/.env`):

```env
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
MAX_ROOMS=200
MAX_PLAYERS_PER_ROOM=20
```

---

## 🌍 Deployment

This project deploys to **Render** as a single web service (backend serves the frontend build).

1. Push to GitHub
2. Create a new **Web Service** on [Render](https://render.com) from your repo
3. Render auto-detects `render.yaml` and configures the build
4. Set environment variables (`NODE_ENV=production`, `PORT=3001`, `CORS_ORIGIN=*`)
5. Deploy!

See the full [Hosting Plan](./hosting_plan.md) for detailed instructions.

---

## 📊 Scoring System

| Condition | Points |
|-----------|--------|
| Correct guess | Up to **500** (decreases over time) |
| First guesser | +**100** bonus |
| Minimum guess points | **50** |
| Drawer bonus | **10** per correct guesser |

---

## 👨‍💻 Author

**Uday Choudhary**  
GitHub: [@Uday-Choudhary](https://github.com/Uday-Choudhary)

---

## 📄 License

This project is for educational purposes.
