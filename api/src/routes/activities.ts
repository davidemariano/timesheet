import { Router } from 'express';
import { ActivityModel } from '../models/Activity.js';
import { aggregate, groupSpecSchema } from '../aggregation/aggregate.js';
import { z } from 'zod';

const router = Router();

// GET tutte le attività
router.get('/', async (_req, res) => {
  const list = await ActivityModel.find({}).lean();
  res.json(list);
});

// POST crea attività
const bodySchema = z.object({
  project: z.string().min(1),
  employee: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hours: z.number().nonnegative()
});
router.post('/', async (req, res) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.format());
  const created = await ActivityModel.create(parsed.data);
  res.status(201).json(created);
});

// GET aggregazione: /api/activities/aggregate?keys=project,employee,date&dateBucket=month
router.get('/aggregate', async (req, res) => {
  const keys = String(req.query.keys || '').split(',').filter(Boolean);
  const specParse = groupSpecSchema.safeParse({
    keys,
    dateBucket: req.query.dateBucket
  });
  if (!specParse.success) return res.status(400).json(specParse.error.format());
  const data = await ActivityModel.find({}).lean();
  const rows = aggregate(data as any, specParse.data);
  res.json(rows);
});

export default router;