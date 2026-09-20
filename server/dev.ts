/** Local development server. Vercel uses api/index.ts instead. */
import { createApp } from './app.js';
import { env } from './env.js';
import { getStorage } from './storage/index.js';

const app = createApp();

const storage = await getStorage();
console.warn(
  storage.persistent
    ? '[dev] Using Postgres (DATABASE_URL is set).'
    : '[dev] Using in-memory storage. Data resets on restart.',
);

app.listen(env.port, () => {
  console.warn(`[dev] API listening on http://localhost:${env.port}/api`);
});
