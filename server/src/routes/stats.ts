import type HyperExpress from 'hyper-express';
import { getDb } from '../db/index.js';

interface StatsRow {
    total_sends: number;
    total_recipients: number;
    unique_senders: number;
}

export function registerStatsRoutes(app: HyperExpress.Server): void {
    // GET /api/stats — aggregate platform stats from history
    app.get('/api/stats', (_req, res) => {
        try {
            const db = getDb();
            const row = db
                .prepare(
                    `SELECT
                         COUNT(*) AS total_sends,
                         COALESCE(SUM(recipient_count), 0) AS total_recipients,
                         COUNT(DISTINCT wallet_address) AS unique_senders
                     FROM history
                     WHERE status IN ('completed', 'partial')`,
                )
                .get() as StatsRow;

            res.json({
                totalSends: row.total_sends,
                totalRecipients: row.total_recipients,
                uniqueSenders: row.unique_senders,
            });
        } catch (err) {
            console.error('GET /api/stats error:', err);
            res.status(500).json({ error: 'Failed to fetch stats' });
        }
    });
}
