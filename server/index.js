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

const app = express();
const server = http.createServer(app);

// Setup WebSockets for Yjs
const wss = new WebSocket.Server({ noServer: true });
wss.on('connection', setupWSConnection);

server.on('upgrade', (request, socket, head) => {
  // Handle websocket upgrade, optionally verify JWT role here
  // For now, accept all upgrades to /yjs-websocket
  if (request.url.startsWith('/yjs-websocket')) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
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

// Basic health route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start Database & Server
async function startServer() {
  try {
    // Start Memory Server inside function since it's async
    const mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    await mongoose.connect(mongoUri);
    console.log(`Connected to memory MongoDB: ${mongoUri}`);

    const PORT = process.env.PORT || 5005;
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server', error);
  }
}

startServer();
