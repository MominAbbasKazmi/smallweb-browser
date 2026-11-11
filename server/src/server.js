import { createApp } from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';

const app = createApp();

try {
  await connectDatabase();
  app.listen(env.PORT, () => {
    console.log(`SmallWeb API listening on http://localhost:${env.PORT}`);
  });
} catch (error) {
  console.error('Unable to start SmallWeb API:', error.message);
  process.exitCode = 1;
}
