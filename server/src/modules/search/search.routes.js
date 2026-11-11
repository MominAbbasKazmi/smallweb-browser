import express from 'express';
import { searchController } from './search.controller.js';

export const searchRouter = express.Router();

searchRouter.get('/', searchController);
