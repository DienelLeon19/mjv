import type { Request, Response } from 'express';
import { generateChatResponse } from '../services/chat.service.js';

export async function handleChatMessage(req: Request, res: Response): Promise<void> {
  try {
    const message = req.body?.message;

    if (typeof message !== 'string' || !message.trim() || message.length > 500) {
      res.status(400).json({ error: 'El mensaje debe contener entre 1 y 500 caracteres.' });
      return;
    }

    const response = await generateChatResponse(message);
    res.json(response);
  } catch (error) {
    console.error('Error en /api/chat:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}


