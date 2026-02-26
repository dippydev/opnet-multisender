import 'dotenv/config';
import HyperExpress from 'hyper-express';
import { getDb, closeDb } from './db/index.js';
import { registerTokenRoutes } from './routes/tokens.js';
import { registerHistoryRoutes } from './routes/history.js';
import { registerCSVRoutes } from './routes/csv.js';

const app = new HyperExpress.Server();
const PORT = parseInt(process.env.PORT || '3001', 10);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// CORS middleware
app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', FRONTEND_URL);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// Handle preflight OPTIONS requests
app.options('/*', (_req, res) => {
    res.header('Access-Control-Allow-Origin', FRONTEND_URL);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(204).send('');
});

// Initialize database on startup
const db = getDb();

// Health check
app.get('/health', (_req, res) => {
    const tableCount = db
        .prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table'")
        .get() as { count: number };

    res.json({
        status: 'ok',
        service: 'multisender-api',
        tables: tableCount.count,
    });
});

// Register API routes
registerTokenRoutes(app);
registerHistoryRoutes(app);
registerCSVRoutes(app);

// Start server
app.listen(PORT)
    .then(() => {
        console.log(`MultiSender API running on port ${PORT}`);
        console.log(`CORS allowed origin: ${FRONTEND_URL}`);
        console.log(`Health check: http://localhost:${PORT}/health`);
    })
    .catch((err: Error) => {
        console.error('Failed to start server:', err.message);
        process.exit(1);
    });

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down...');
    closeDb();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Shutting down...');
    closeDb();
    process.exit(0);
});
