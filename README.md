# CodeColab

Minimal, dark, collaborative coding.

CodeColab is a real-time coding workspace built around three things:

- shared editing with Yjs
- inline AI help inside the editor
- safe execution with checkpoints and restore flow

The app is split into a Vite + React frontend and an Express + Socket.IO backend.

## Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- Monaco Editor
- Yjs
- Socket.IO
- Express
- MongoDB / `mongodb-memory-server`

## What It Includes

- real-time collaborative editing
- presence and active-user indicators
- AI chat inside the editor sidebar
- code execution from the workspace
- checkpoint history and restore actions
- auth with access + refresh token flow

## Local Setup

### 1. Install dependencies

```bash
npm install
cd server && npm install
```

### 2. Configure environment

Frontend `.env` in the project root:

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

- frontend runs on `http://localhost:8080`
- backend runs on `http://localhost:5005`
- if `MONGODB_URI` is empty, the backend falls back to an in-memory MongoDB instance
- `REFRESH_SECRET` is recommended even though the server has a development fallback

### 3. Start the app

Run the backend:

```bash
npm run server
```

In a second terminal, run the frontend:

```bash
npm run dev
```

Then open:

```text
http://localhost:8080
```

## Scripts

Frontend:

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

Backend:

```bash
npm run server
```

`npm run start:all` exists, but the most reliable local setup is still running frontend and backend in separate terminals.

## Project Shape

```text
.
├── src/                # frontend app
├── public/             # static assets
├── server/             # express api, auth, execution, yjs persistence
└── vite.config.ts      # frontend dev server + proxy
```

## Architecture

The frontend handles the product surface: auth, dashboard, editor, AI panel, terminal, and history.

The backend handles auth, room APIs, checkpoint storage, execution requests, Socket.IO, and Yjs persistence.

For persistence, the server uses MongoDB when available and falls back to `mongodb-memory-server` for local development.

## Build Status

Production build:

```bash
npm run build
```

The app currently builds successfully with Vite.

## License

MIT
