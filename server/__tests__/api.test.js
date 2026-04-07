const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const executeRouter = require('../routes/execute');
const authRouter = require('../routes/auth');
const snapshotRouter = require('../routes/snapshot');

let app;
let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  
  app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.use('/api/execute', executeRouter);
  app.use('/api/snapshots', snapshotRouter);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('API Integration Tests', () => {
  it('Should reject execution without authentication', async () => {
    const res = await request(app)
      .post('/api/execute')
      .send({ language: 'javascript', content: 'console.log();' });
    
    expect(res.statusCode).toBe(401);
  });
});
