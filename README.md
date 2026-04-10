# CodeColab

CodeColab is a dark, real-time collaborative coding workspace built with a React frontend and an Express backend. It combines shared editing, room-based collaboration, inline AI help, local code execution, and checkpoint-based recovery inside one product shell.

## What Is In This Project

### Frontend product surfaces

- Landing page at `/`
- Login page at `/login`
- Signup page at `/signup`
- Project dashboard at `/dashboard`
- Collaborative editor at `/editor/:projectId`

### Editor capabilities

- Monaco-based code editor
- Real-time collaboration with Yjs
- Presence awareness with active user avatars and current-file hints
- Persistent local cache with `y-indexeddb`
- Shared room state over WebSocket
- File explorer backed by a shared Yjs map
- Inline AI chat using the Groq Chat Completions API
- Integrated resizable terminal for running the active file
- Live Sync Log panel with real-time operation tracking (OPS SENT, OPS RECV, CONFLICTS, AVG RES)
- Automatic, manual, and pre-execution checkpoints
- Diff viewer for comparing a checkpoint to the live editor state
- Checkpoint restore broadcast to everyone in the room
- Share modal with copyable room link
- Role switcher UI for `owner`, `editor`, and `viewer`

### Backend capabilities

- JWT login with refresh-token flow
- MongoDB persistence with Mongoose
- Fallback to `mongodb-memory-server` when `MONGODB_URI` is empty
- Socket.IO room events with sync operation tracking
- Yjs document persistence in MongoDB via `y-mongodb-provider`
- Real-time sync log engine with conflict detection and resolution tracking
- Plain-text room backup in `Room.lastContent`
- Local code execution endpoint with stdin support
- Checkpoint and snapshot APIs

## Stack

### Frontend

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- Zustand
- TanStack Query
- Monaco Editor
- Yjs
- `y-websocket`
- `y-monaco`
- `y-indexeddb`
- Socket.IO client

### Backend

- Node.js
- Express
- Socket.IO
- WebSocket
- MongoDB
- Mongoose
- JWT
- bcrypt
- `mongodb-memory-server`
- `y-mongodb-provider`

## Current User Flow

1. A user signs up or logs in.
2. The app stores an access token in local storage and uses a refresh token cookie for renewal.
3. The user lands on the dashboard, where they can create a room, open a project, or join an existing room by code.
4. Inside the editor, the user gets a shared Monaco document, presence indicators, AI chat, file explorer, terminal, and checkpoint history.
5. When code changes, the document syncs through Yjs and is also backed up into MongoDB.
6. Before execution, the app saves a checkpoint automatically so the room can be restored if needed.

## Project Structure

```text
.
├── src/
│   ├── components/
│   │   ├── editor/        # top bar, sidebars, AI chat, terminal, diff, share modal, sync log
│   │   ├── layout/        # backdrop, brand, auth shell, page transition
│   │   └── ui/            # shadcn-style UI primitives
│   ├── lib/               # auth helpers, socket client, utilities
│   ├── pages/             # home, auth, dashboard, editor, not found
│   └── store/             # persisted editor state with Zustand (incl. syncLogStore)
├── server/
│   ├── models/            # User, Room, Checkpoint, Snapshot
│   ├── routes/            # auth, rooms, execute, checkpoints, snapshots
│   ├── syncLog.js         # sync log engine: operation extraction, conflict detection
│   └── index.js           # Express app, Socket.IO, Yjs persistence bootstrap
├── .github/workflows/     # CI pipeline
├── public/
├── vite.config.ts
└── README.md
```

## Frontend Pages

### Home

- Marketing landing page for the product
- Links into signup, login, and dashboard

### Login / Signup

- Styled auth flow
- Login calls `/api/auth/login`
- Signup calls `/api/auth/register`

### Dashboard

- Displays starter project cards
- Supports new room flow
- Supports join-by-code flow
- Includes logout action

### Editor

- Main collaborative workspace
- Top bar with presence, room sharing, sidebar toggles, terminal toggle, and role switcher
- Left sidebar with:
  - file explorer
  - checkpoint history
  - sync log with live stats and event feed
  - placeholder tabs for chat and settings
- Center editor with Yjs-backed Monaco model binding per file
- Right sidebar with AI chat
- Bottom resizable terminal panel

## Collaboration and Persistence

### Yjs document flow

- Each editor room uses a Yjs document named `codecolab-room-${projectId}`.
- Documents sync over WebSocket to the backend on port `5005`.
- Local offline/cache persistence uses IndexedDB.
- Backend persistence stores Yjs updates in MongoDB.

### Presence

- The editor publishes user identity and current file through Yjs awareness.
- The top bar shows active users and which file each person is editing.

### Room backup

- The backend also saves a combined plain-text backup into `Room.lastContent`.
- If a room opens and the live Yjs doc is empty, the editor tries to seed the document from `lastContent`.

## AI Chat

- The right sidebar contains a shared AI conversation surface.
- AI requests are sent directly from the frontend to Groq using `VITE_GROQ_API_KEY`.
- The assistant includes:
  - recent conversation context
  - the active file name
  - the current file contents
- Chat history is shared through Yjs so collaborators see the same conversation.

## Sync Log

The Sync Log provides real-time visibility into the collaboration protocol:

- **OPS SENT** — total edit operations sent by the local user
- **OPS RECV** — total operations received by other collaborators
- **CONFLICTS** — detected overlapping edits from multiple users
- **AVG RES** — average conflict resolution time

Edit operations are tracked on the frontend via `doc.on('update')` and emitted to the server through socket.io. The server maintains per-room stats and broadcasts `sync-log-entry` events to all connected clients. The event feed shows inserts, deletes, user joins/leaves, sync confirmations, and conflict resolutions in real time.

## Terminal and Execution

### Terminal UI

- Supports commands like `run`, `node`, `python`, and `go`
- Can execute the active file or a named file
- Includes a stdin buffer for interactive programs

### Execution backend

The `/api/execute` endpoint currently supports:

- JavaScript via `node`
- TypeScript via `npx tsx`
- Python via `python3`
- C++ via `g++`
- Go via `go run`

Execution notes:

- Files are written into `.temp_code/`
- Each execution has a 10 second timeout
- Pre-execution checkpoints are created before running code

## Checkpoints and Snapshots

### Checkpoints

- Stored in MongoDB
- Types:
  - `auto`
  - `manual`
  - `pre-execution`
- Visible in the history panel
- Can be diffed against the live editor state
- Can be restored and broadcast to all room participants
- Automatically trimmed to the latest 50 per room

### Snapshots

- Separate snapshot API exists on the backend
- Also capped at 50 per room

## API Summary

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

### Rooms

- `POST /api/rooms`
- `GET /api/rooms/:roomId`
- `GET /api/rooms/user/me`
- `POST /api/rooms/:roomId/role`

### Execution

- `POST /api/execute`

### Checkpoints

- `POST /api/checkpoints`
- `GET /api/checkpoints/:roomId`
- `POST /api/checkpoints/restore/:id`

### Snapshots

- `POST /api/snapshots/:roomId`
- `GET /api/snapshots/:roomId`

### Health

- `GET /api/health`

## Data Models

### User

- `email`
- `username`
- `password` hashed with bcrypt
- `isVerified`
- `verificationToken`
- `refreshToken`

### Room

- `roomId`
- `name`
- `language`
- `isPublic`
- `createdBy`
- `participants[]` with per-user role
- `isActive`
- `lastContent`

### Checkpoint

- `roomId`
- `content`
- `type`
- `author`
- `language`
- `label`

### Snapshot

- `roomId`
- `content`
- `authorName`
- `label`

## Local Development

### 1. Install dependencies

All core dependencies (including server-side ones like `yjs`, `y-websocket`, `mongoose`, etc.) are consolidated in the root `package.json` to avoid duplicate singleton issues:

```bash
npm install
cd server && npm install
```

### 2. Configure environment

Root `.env`:

```env
VITE_GROQ_API_KEY=your_groq_api_key
```

Backend `server/.env`:

```env
PORT=5005
JWT_SECRET=your_jwt_secret_here
REFRESH_SECRET=your_refresh_secret_here
MONGODB_URI=
```

Notes:

- Frontend runs on `http://localhost:8080`
- Backend runs on `http://localhost:5005`
- Vite proxies `/api` and `/socket.io` to the backend
- If `MONGODB_URI` is empty, the backend tries to start `mongodb-memory-server`
- If `MONGODB_URI` points to Atlas or another MongoDB instance, Yjs updates and app data persist there

### 3. Start the app

Recommended in two terminals:

```bash
npm run server
npm run dev
```

Then open:

```text
http://localhost:8080
```

You can also try:

```bash
npm run start:all
```

## Scripts

### Root

```bash
npm run dev
npm run server
npm run start:all
npm run build
npm run build:dev
npm run lint
npm run preview
```

### Server

```bash
cd server
npm test
```

## CI

The project uses GitHub Actions (`.github/workflows/ci.yml`) to run on every push and PR to `main`:

1. Install root dependencies (includes all shared libs)
2. Install server-specific dependencies
3. Run backend tests (`cd server && npm test`)
4. Build frontend (`npm run build`)

## Current Notes and Limitations

- The dashboard project list is currently seeded in the frontend and is not yet loaded from the room API.
- The role selector in the editor is a frontend control right now; full backend-backed permission enforcement is not wired through the full UI.
- The share modal exposes link copy and permission selection UI, but invite and permission persistence are not fully implemented.
- Sidebar tabs for team chat and settings currently use placeholder surfaces.
- OAuth buttons on login and signup are demo placeholders.
- The execution service runs code locally and should be treated as a development feature, not a hardened sandbox.
- Production build succeeds, but Vite currently warns about large bundle chunks.
- Sync log conflict detection requires multiple concurrent users editing overlapping regions.

## Why This Project Exists

This repo is an attempt to bring several workflows into one product surface:

- collaborative editing
- inline AI assistance
- room-based presence
- local code execution
- version recovery

The goal is to make the editor feel like the product, instead of treating collaboration, AI, and execution as separate tools bolted on afterward.

## License

Arnev Gaur
