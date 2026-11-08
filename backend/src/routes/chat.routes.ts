import { Router, type Router as RouterType } from 'express';
import { handleChatMessage } from '../controllers/chat.controller.js';

export const chatRouter: RouterType = Router();

chatRouter.post('/', handleChatMessage);
