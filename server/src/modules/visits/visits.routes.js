import express from 'express';
import { createVisit, historyForPerson } from './visits.controller.js';

export const visitsRouter = express.Router();

visitsRouter.post('/', createVisit);
visitsRouter.get('/people/:personId/history', historyForPerson);
