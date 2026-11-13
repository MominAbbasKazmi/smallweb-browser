import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { env } from './env.js';

let memoryServer;

export async function connectDatabase() {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (env.NODE_ENV === 'test') {
    if (!memoryServer) {
      memoryServer = await MongoMemoryServer.create();
    }

    await mongoose.connect(memoryServer.getUri());
    return;
  }

  await mongoose.connect(env.MONGODB_URI);
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}
