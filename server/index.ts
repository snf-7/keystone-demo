import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { api } from './routes.js';

const app = express();
app.use(express.json());
app.use('/api', api);

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
app.use(express.static(dist));
app.use((req, res, next) => (req.method === 'GET' && !req.path.startsWith('/api') ? res.sendFile(path.join(dist, 'index.html')) : next()));

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'internal error' });
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, '0.0.0.0', () => console.log(`Keystone API on :${port} (in-memory demo data)`));
