import express from 'express';
import { loadSession, saveSession, updateScroll } from './sessions.controller.js';

export const sessionsRouter = express.Router();

sessionsRouter.get('/:personId/session', loadSession);
sessionsRouter.put('/:personId/session', saveSession);
sessionsRouter.patch('/:personId/session/scroll', updateScroll);
