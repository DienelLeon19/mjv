import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { chatRouter } from './routes/chat.routes.js';

const app = express();
const PORT = Number(process.env.PORT || 3001);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) throw new Error('PORT inválido');
if (process.env.NODE_ENV === 'production' && PORT !== 3001) throw new Error('Producción requiere PORT=3001');
app.disable('x-powered-by');

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.CORS_ORIGIN || 'https://nexrastudio.online')
    : ['http://localhost:5173', 'http://localhost:4173'],
  methods: ['GET', 'POST'],
}));

app.use(express.json({ limit: '8kb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'SOFÍA 2.0 API' });
});

// Chat routes
app.use('/api/chat', chatRouter);

app.use((_req, res) => { res.status(404).json({ error: 'Ruta no encontrada.' }); });
app.use((error: { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = error.status === 413 ? 413 : error.status === 400 ? 400 : 500;
  res.status(status).json({ error: status === 413 ? 'Solicitud demasiado grande.' : status === 400 ? 'JSON inválido.' : 'Error interno del servidor.' });
});
const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`SOFÍA 2.0 API: 127.0.0.1:${PORT}`);
});
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 15000).unref();
  });
}

