import 'dotenv/config';
import mongoose from 'mongoose';
import { createApp } from './app';

const MONGO_URI = process.env.MONGO_URI!;
const PORT = Number(process.env.API_PORT || 3000);

async function main() {
  await mongoose.connect(MONGO_URI);
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});