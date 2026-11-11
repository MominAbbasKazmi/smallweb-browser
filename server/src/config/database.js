import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { env } from './env.js';

let memoryServer;

export async function connectDatabase() {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  try {
    await mongoose.connect(env.MONGODB_URI);
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      throw error;
    }

    if (!memoryServer) {
      memoryServer = await MongoMemoryServer.create();
      env.MONGODB_URI = memoryServer.getUri();
    }

    await mongoose.connect(env.MONGODB_URI);
  }
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
