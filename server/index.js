require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const WebSocket = require('ws');
const { setupWSConnection } = require('y-websocket/bin/utils');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const { MongodbPersistence } = require('y-mongodb-provider');

const app = express();
const server = http.createServer(app);
const { Server } = require('socket.io');

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);
  });
});

// Make io accessible to routes
app.set('io', io);

// Setup WebSockets for Yjs
const wss = new WebSocket.Server({ noServer: true });

let persistence = null;

wss.on('connection', (ws, req) => {
  setupWSConnection(ws, req, { persistence });
});

server.on('upgrade', (request, socket, head) => {
  // Only handle Yjs WebSocket requests, let Socket.io handle its own
  const { pathname } = new URL(request.url, `http://${request.headers.host}`);
  if (pathname === '/socket.io/') return;

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

// Basic health route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start Database & Server
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

    // Initialize Yjs persistence after DB connection
    persistence = new MongodbPersistence(mongoUri, { collectionName: 'yjs-updates' });
    console.log('Yjs persistence initialized with MongoDB');

    const PORT = process.env.PORT || 5005;
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server', error);
  }
}

startServer();
