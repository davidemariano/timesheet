import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import activitiesRouter from './routes/activities';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(morgan('dev'));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'api' }));

  app.use('/api/activities', activitiesRouter);

  return app;
}