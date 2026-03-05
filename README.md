# Skribbl Clone — Multiplayer Drawing & Guessing Game

A full-stack, real-time multiplayer drawing and guessing game (Skribbl.io clone).

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Zustand, Socket.IO Client |
| **Backend** | Node.js, Express 5, Socket.IO, TypeScript |
| **Canvas** | HTML5 Canvas API with custom drawing logic |
| **Real-time** | Socket.IO (WebSockets) |
| **State** | In-memory room/game store |
| **Words** | JSON word list — 200+ words across 5 categories |

---

## Getting Started

### Prerequisites
- **Node.js** 18+ and **npm** 9+

### Installation

```bash
# Install all dependencies
cd backend && npm install
cd ../frontend && npm install
```

### Running Locally

```bash
# Terminal 1 — Backend (port 3001)
cd backend && npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Testing Multiplayer
1. Open two browser tabs at `http://localhost:5173`
2. **Tab 1**: Enter name → **Create Room**
3. **Tab 2**: Enter name → **Join Room** → paste the 6-char code
4. Click **Start Game** → draw and guess!

---

## Deployment (Render)

### One-click deploy

1. Push code to a GitHub/GitLab repo
2. Go to [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**
3. Connect your repo — Render auto-detects `render.yaml`
4. Click **Apply** — it builds and deploys

### Manual deploy on Render

1. Create a **Web Service** on Render
2. Set:
   - **Build Command**: `cd frontend && npm install && npm run build && cd ../backend && npm install && npm run build`
   - **Start Command**: `cd backend && npm start`
   - **Environment**: `NODE_ENV=production`
3. Deploy

### Other platforms

```bash
# Build for production
cd frontend && npm run build
cd ../backend && npm run build

# Start production server (serves frontend + API + WebSockets)
cd backend && npm start
```

The production server serves the React SPA + API + WebSockets on a single port.

**Live URL**: *(add your deployed URL here after deploying)*

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                        Browser (React)                       │
│ ┌────────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│ │ LandingPage│ │  Canvas  │ │ ChatBox  │ │  Scoreboard   │  │
│ │  (create/  │ │ (HTML5   │ │ (guess/  │ │  (ranked      │  │
│ │   join)    │ │  Canvas) │ │  chat)   │ │   players)    │  │
│ └─────┬──────┘ └────┬─────┘ └────┬─────┘ └───────┬───────┘  │
│       │              │            │               │          │
│       └──────────────┴────────────┴───────────────┘          │
│                          │ Socket.IO                         │
└──────────────────────────┼───────────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────────┐
│                    Node.js Server                            │
│                          │                                   │
│  ┌───────────────────────▼────────────────────────────────┐  │
│  │              Socket Handler (socket/index.ts)          │  │
│  │  create_room │ join_room │ start_game │ word_chosen    │  │
│  │  draw_start  │ draw_move │ draw_end   │ guess          │  │
│  │  draw_undo   │ canvas_clear │ chat    │ play_again     │  │
│  │  reconnect_player                                     │  │
│  └───────────────────────┬────────────────────────────────┘  │
│                          │                                   │
│  ┌────────┐  ┌───────────▼──┐  ┌───────────┐  ┌──────────┐  │
│  │ Player │  │     Room     │  │   Game    │  │  Word    │  │
│  │ Class  │  │    Class     │  │  Class    │  │ Service  │  │
│  │        │  │ (settings,   │  │ (rounds,  │  │ (200+    │  │
│  │ (id,   │  │  players,    │  │  scoring, │  │  words,  │  │
│  │  name, │  │  broadcast)  │  │  hints,   │  │  5 cats, │  │
│  │  score)│  │              │  │  strokes) │  │  unique) │  │
│  └────────┘  └──────────────┘  └───────────┘  └──────────┘  │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────────────────────┐  │
│  │ REST Routes      │  │ In-Memory Room Store             │  │
│  │ POST /rooms      │  │ (CRUD operations)                │  │
│  │ GET /rooms/:id   │  │                                  │  │
│  │ GET /rooms/code/ │  │                                  │  │
│  └──────────────────┘  └──────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### How it works

1. **Drawing strokes**: Canvas captures `mousedown/move/up` → emits `draw_start/move/end` via Socket.IO → server relays to all room clients → receivers render on their canvas
2. **Game state**: Server-authoritative — `Game` class manages rounds, turn order, scoring, timers, hints. All state changes broadcast via socket events
3. **Word matching**: Server-side, case-insensitive, whitespace-normalized comparison. Word never sent to guessers
4. **Scoring**: Time-based (max 500, floor 50), first-guesser +100 bonus, drawer earns 10 pts per correct guesser

---

## WebSocket Events

| Event | Direction | Purpose |
|---|---|---|
| `create_room` | Client → Server | Host creates room |
| `join_room` | Client → Server | Player joins room |
| `player_joined` | Server → Clients | Broadcast new player |
| `player_left` | Server → Clients | Broadcast player left |
| `start_game` | Client → Server | Host starts game |
| `game_state` | Server → Clients | Full state snapshot |
| `round_start` | Server → Clients | New round; drawer gets words |
| `word_chosen` | Client → Server | Drawer chose word |
| `round_end` | Server → Clients | Round over |
| `game_over` | Server → Clients | Game finished |
| `draw_start/move/end` | Client → Server | Stroke events |
| `draw_data` | Server → Clients | Broadcast strokes |
| `canvas_clear` | Client → Server | Clear canvas |
| `draw_undo` | Client → Server | Undo last stroke |
| `guess` | Client → Server | Player guess |
| `guess_result` | Server → Client | Correct/incorrect |
| `chat` / `chat_message` | Bidirectional | Chat messages |
| `timer_update` | Server → Clients | Countdown |
| `word_hint` | Server → Clients | Hint reveal |
| `play_again` | Client → Server | Host restarts |
| `reconnect_player` | Client → Server | Token reconnection |

---

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── index.ts            # Express + Socket.IO entry
│   │   ├── classes/
│   │   │   ├── Game.ts         # Rounds, scoring, hints, strokes
│   │   │   ├── Player.ts       # Player state
│   │   │   ├── Room.ts         # Room settings, players
│   │   │   └── WordService.ts  # Random word selection
│   │   ├── data/words.json     # 200+ categorized words
│   │   ├── db/roomStore.ts     # In-memory CRUD
│   │   ├── routes/rooms.ts     # REST API
│   │   └── socket/index.ts     # All WebSocket handlers
│   ├── tsconfig.json
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/         # Canvas, ChatBox, Scoreboard, etc.
│   │   ├── context/            # SocketContext
│   │   ├── pages/              # LandingPage, RoomPage
│   │   └── store/              # Zustand game store
│   ├── tailwind.config.js
│   └── package.json
├── render.yaml                 # Render deployment config
├── package.json                # Root build scripts
└── README.md
```

---

## Features Checklist

### Must Have ✅
- [x] Create room with configurable settings
- [x] Join room via link or code
- [x] Lobby with player list; host starts game
- [x] Turn-based rounds: one drawer, others guess
- [x] Real-time drawing sync (strokes visible to all)
- [x] Word selection for drawer (1–5 choices)
- [x] Guessing: type word, get points for correct guess
- [x] Scoring and leaderboard
- [x] Game end with winner
- [x] Basic drawing tools: brush, colors, undo, clear

### Should Have ✅
- [x] Hints (reveal letters over time)
- [x] Chat (guesses + general chat)
- [x] Draw time countdown
- [x] Private rooms (invite link)

### Nice to Have ✅
- [x] Word categories (animals, objects, actions, food, places)
- [x] Eraser tool
- [x] OOP structure (Room, Game, Player, WordService classes)
- [x] Room settings configurable (draw time, rounds, word count, hints)
- [x] Play Again (host restarts, retains players)
- [x] Reconnection (restore session via token)

---

## License

MIT
