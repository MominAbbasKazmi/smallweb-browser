import express from 'express';
import { existsSite, getSite, publishSite } from './sites.controller.js';

export const sitesRouter = express.Router();

sitesRouter.get('/:address/exists', existsSite);
sitesRouter.get('/:address', getSite);
sitesRouter.post('/', publishSite);
