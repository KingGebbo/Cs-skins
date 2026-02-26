import express from 'express';
import cors from 'cors';
import { getDb } from './database/schema';
import skinsRouter from './routes/skins';
import analysisRouter from './routes/analysis';
import { startScheduler } from './cron/scheduler';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/skins', skinsRouter);
app.use('/api/analysis', analysisRouter);

// Initialize database on startup
getDb();

// Start the cron scheduler
startScheduler();

app.listen(PORT, () => {
  console.log(`CS2 Pump Detection backend running on http://localhost:${PORT}`);
});

export default app;
