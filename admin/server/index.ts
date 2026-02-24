/**
 * Admin panel Express server.
 * Serves the API on port 3001; Vite dev server proxies /api here.
 */
import express from 'express';
import cors from 'cors';
import tablesRouter from './routes/tables.js';
import schemaRouter from './routes/schema.js';
import scoringRouter from './routes/scoring.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/tables', tablesRouter);
app.use('/api/schema', schemaRouter);
app.use('/api/scoring', scoringRouter);

app.listen(PORT, () => {
  console.log(`Admin API server running at http://localhost:${PORT}`);
});
