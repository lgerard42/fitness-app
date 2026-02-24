/**
 * Admin panel Express server.
 * Serves the API on port 3001; Vite dev server proxies /api here.
 */
import express from 'express';
import cors from 'cors';
import tablesRouter from './routes/tables.js';
import schemaRouter from './routes/schema.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/tables', tablesRouter);
app.use('/api/schema', schemaRouter);

// Load scoring router from shared package; server still starts if it fails
import('./routes/scoring.js')
  .then((m) => {
    app.use('/api/scoring', m.default);
    console.log('Scoring API available at /api/scoring');
  })
  .catch((err: Error) => {
    console.warn(
      'Scoring module not loaded (shared package). /api/scoring unavailable:',
      err.message
    );
  });

app.listen(PORT, () => {
  console.log(`Admin API server running at http://localhost:${PORT}`);
});
