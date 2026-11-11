import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { peopleRouter } from './modules/people/people.routes.js';
import { searchRouter } from './modules/search/search.routes.js';
import { sessionsRouter } from './modules/sessions/sessions.routes.js';
import { sitesRouter } from './modules/sites/sites.routes.js';
import { visitsRouter } from './modules/visits/visits.routes.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({
    origin: env.CLIENT_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
  }));
  app.use(express.json({ limit: '100kb' }));
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false
  }));

  app.get('/health', (req, res) => {
    res.status(200).json({
      success: true,
      data: { status: 'ok' }
    });
  });

  app.use('/api/people', peopleRouter);
  app.use('/api/sites', sitesRouter);
  app.use('/api', visitsRouter);
  app.use('/api/search', searchRouter);
  app.use('/api/people', sessionsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
