import express from 'express';
import { listPeople } from './people.controller.js';

export const peopleRouter = express.Router();

peopleRouter.get('/', listPeople);
