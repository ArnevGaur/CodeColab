require('dotenv').config();
/**
 * MONGODB ATLAS SETUP INSTRUCTIONS:
 * 1. Create a free account at https://www.mongodb.com/cloud/atlas
 * 2. Create a new Project and a new Cluster (M0 Free Tier).
 * 3. In "Network Access", add IP Address "0.0.0.0/0" (Allow access from anywhere).
 * 4. In "Database Access", create a Database User with "Read and Write to any database" permissions.
 * 5. Click "Connect" on your Cluster -> "Connect your application".
 * 6. Copy the Connection String (SRV).
 * 7. Paste it into 'server/.env' as MONGODB_URI=your_connection_string
 * 8. Replace <password> with your actual database user password.
 */

const http = require('http');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const WebSocket = require('ws');
const { setupWSConnection, setPersistence, getYDoc } = require('y-websocket/bin/utils');
const Y = require('yjs');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const { MongodbPersistence } = require('y-mongodb-provider');
const debounce = require('lodash/debounce');
const Room = require('./models/Room');
const { emitRoomLifecycleEntry, instrumentDoc, getRoomState } = require('./syncLog');

const app = express();
const server = http.createServer(app);
const { Server } = require('socket.io');

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Cache for active documents to ensure reuse
const activeDocs = new Map();

io.on('connection', (socket) => {
  socket.on('join-room', (payload) => {
    const roomData = typeof payload === 'string' ? { roomId: payload } : payload || {};
    const roomId = roomData.roomId;
    if (!roomId) return;

    const previousRoomId = socket.data.currentRoomId;
    if (previousRoomId && previousRoomId !== roomId) {
      emitRoomLifecycleEntry(io, previousRoomId, {
        type: 'user-left',
        username: socket.data.username || 'Unknown user',
        userColor: socket.data.userColor || '#9ca3af',
        detail: `${socket.data.username || 'Unknown user'} left the session`,
      });
      socket.leave(previousRoomId);
    }

    socket.data.currentRoomId = roomId;
    socket.data.username = roomData.username || socket.data.username || 'Unknown user';
    socket.data.userColor = roomData.userColor || socket.data.userColor || '#d4d4d8';
    socket.data.yClientId = roomData.yClientId ?? socket.data.yClientId ?? null;

    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);

    if (previousRoomId !== roomId) {
      emitRoomLifecycleEntry(io, roomId, {
        type: 'user-joined',
        username: socket.data.username,
        userColor: socket.data.userColor,
        detail: `${socket.data.username} joined the session`,
      });
    }
  });

  socket.on('leave-room', (payload) => {
    const roomData = typeof payload === 'string' ? { roomId: payload } : payload || {};
    const roomId = roomData.roomId || socket.data.currentRoomId;
    if (!roomId) return;

    emitRoomLifecycleEntry(io, roomId, {
      type: 'user-left',
      username: socket.data.username || roomData.username || 'Unknown user',
      userColor: socket.data.userColor || roomData.userColor || '#9ca3af',
      detail: `${socket.data.username || roomData.username || 'Unknown user'} left the session`,
    });

    socket.leave(roomId);
    if (socket.data.currentRoomId === roomId) {
      socket.data.currentRoomId = null;
    }
  });

  socket.on('room-synced', (payload) => {
    const roomData = payload || {};
    const roomId = roomData.roomId || socket.data.currentRoomId;
    if (!roomId) return;

    socket.data.username = roomData.username || socket.data.username || 'Unknown user';
    socket.data.userColor = roomData.userColor || socket.data.userColor || '#d4d4d8';
    socket.data.yClientId = roomData.yClientId ?? socket.data.yClientId ?? null;

    emitRoomLifecycleEntry(io, roomId, {
      type: 'synced',
      username: socket.data.username,
      userColor: socket.data.userColor,
      detail: `${socket.data.username} is fully in sync`,
    });
  });

  socket.on('sync-operation', (payload) => {
    const roomId = payload?.roomId || socket.data.currentRoomId;
    if (!roomId) return;

    const username = socket.data.username || 'Unknown user';
    const userColor = socket.data.userColor || '#d4d4d8';

    const roomState = getRoomState(roomId);
    roomState.stats.totalOperationsSent += 1;

    // Count other clients in the room as recipients
    const roomSockets = io.sockets.adapter.rooms.get(roomId);
    const recipientCount = roomSockets ? Math.max(roomSockets.size - 1, 0) : 0;
    roomState.stats.totalOperationsReceived += recipientCount;

    emitRoomLifecycleEntry(io, roomId, {
      type: payload?.type === 'delete' ? 'delete' : 'insert',
      username,
      userColor,
      detail: `${username} edited code (op #${payload?.editNumber || '?'})`,
      positionHint: null,
    });
  });

  socket.on('disconnecting', () => {
    const roomId = socket.data.currentRoomId;
    if (!roomId) return;

    emitRoomLifecycleEntry(io, roomId, {
      type: 'user-left',
      username: socket.data.username || 'Unknown user',
      userColor: socket.data.userColor || '#9ca3af',
      detail: `${socket.data.username || 'Unknown user'} left the session`,
    });
  });
});

// Make io accessible to routes
app.set('io', io);

// Setup WebSockets for Yjs
const wss = new WebSocket.Server({ noServer: true });

let persistence = null;

wss.on('connection', (ws, req) => {
  const docName = req.url.slice(1).split('?')[0];
  
  const doc = getYDoc(docName);
  
  if (!activeDocs.has(docName)) {
    activeDocs.set(docName, doc);
  }

  instrumentDoc(docName, doc, io);
  setupWSConnection(ws, req);
});

server.on('upgrade', (request, socket, head) => {
  const { pathname } = new URL(request.url, `http://${request.headers.host}`);
  console.log(`[Diagnostic] UPGRADE: Received upgrade request for ${pathname}`);

  if (pathname.startsWith('/socket.io/')) {
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/rooms', require('./routes/room'));
app.use('/api/execute', require('./routes/execute'));
app.use('/api/snapshots', require('./routes/snapshot'));
app.use('/api/checkpoints', require('./routes/checkpoint'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

async function startServer() {
  try {
    let mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      console.log('No MONGODB_URI found, starting memory MongoDB...');
      const mongoServer = await MongoMemoryServer.create();
      mongoUri = mongoServer.getUri();
    }
    
    await mongoose.connect(mongoUri);
    console.log(`Connected to MongoDB: ${mongoUri.startsWith('mongodb+srv') ? 'Remote Cluster' : mongoUri}`);

    // Initialize Yjs persistence
    persistence = new MongodbPersistence(mongoUri, { collectionName: 'yjs-updates' });
    
    setPersistence({
      bindState: async (docName, ydoc) => {
        console.log(`[Persistence] LOAD: Binding state for ${docName}`);
        try {
          // 1. Load binary state from MongoDB
          const timestamp = Date.now();
          const persistedYdoc = await persistence.getYDoc(docName);
          console.log(`[Persistence] LOAD: Found data for ${docName} in ${Date.now() - timestamp}ms. Shared Types: ${Array.from(persistedYdoc.share.keys()).join(', ')}`);
          
          const persistedState = Y.encodeStateAsUpdate(persistedYdoc);
          Y.applyUpdate(ydoc, persistedState);
          console.log(`[Persistence] LOAD: Successfully applied state to ${docName}. Current text size: ${ydoc.getText('file:').toString().length}`);
          
          if (!activeDocs.has(docName)) {
            activeDocs.set(docName, ydoc);
          }

          // 2. Debounced plain-text backup (lastContent)
          const backupToRoom = debounce(async () => {
            try {
              let combinedContent = '';
              for (const [key, value] of ydoc.share) {
                if (value instanceof Y.Text) {
                  combinedContent += `--- ${key} ---\n${value.toString()}\n\n`;
                }
              }
              
              const roomId = docName.replace('codecolab-room-', '');
              const result = await Room.findOneAndUpdate({ roomId }, { lastContent: combinedContent.trim() }, { new: true });
              
              if (result) {
                console.log(`[Backup] SUCCESS: Updated lastContent for room ${roomId}. (Length: ${combinedContent.length})`);
              } else {
                console.warn(`[Backup] WARNING: Could not find room ${roomId} in database to save lastContent!`);
              }
            } catch (err) {
              console.error(`[Backup] ERROR: Failed to update lastContent for ${docName}:`, err);
            }
          }, 3000);

          ydoc.on('update', async (update) => {
            try {
              // Store binary update
              await persistence.storeUpdate(docName, update);
              console.log(`[Persistence] SAVE: Stored binary update for ${docName} (${update.length} bytes)`);
              // Trigger plain-text backup
              backupToRoom();
            } catch (err) {
              console.error(`[Persistence] SAVE ERROR for ${docName}:`, err);
            }
          });

        } catch (err) {
          console.error(`[Persistence] LOAD ERROR for ${docName}:`, err);
        }
      },
      writeState: async (docName, ydoc) => {
        console.log(`[Persistence] FINAL: Finalizing state for ${docName}`);
        return Promise.resolve();
      }
    });

    console.log('Yjs persistence and Atlas-ready drivers initialized');

    const PORT = process.env.PORT || 5005;
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server', error);
  }
}

startServer();
