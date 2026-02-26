import type HyperExpress from 'hyper-express';
import { getDb } from '../db/index.js';

interface HistoryRecord {
    id: number;
    wallet_address: string;
    token_address: string | null;
    token_symbol: string | null;
    recipient_count: number;
    total_amount: string;
    tx_hashes: string;
    status: string;
    created_at: string;
}

interface CreateHistoryBody {
    wallet_address: string;
    token_address?: string | null;
    token_symbol?: string | null;
    recipient_count: number;
    total_amount: string;
    tx_hashes: string[];
    status: string;
}

export function registerHistoryRoutes(app: HyperExpress.Server): void {
    // POST /api/history — save a multisend record
    app.post('/api/history', async (req, res) => {
        try {
            const body = (await req.json()) as CreateHistoryBody;

            // Validate required fields
            if (!body.wallet_address || typeof body.wallet_address !== 'string') {
                res.status(400).json({ error: 'wallet_address is required' });
                return;
            }
            if (typeof body.recipient_count !== 'number' || body.recipient_count < 1) {
                res.status(400).json({ error: 'recipient_count must be a positive number' });
                return;
            }
            if (!body.total_amount || typeof body.total_amount !== 'string') {
                res.status(400).json({ error: 'total_amount is required as a string' });
                return;
            }
            if (!Array.isArray(body.tx_hashes) || body.tx_hashes.length === 0) {
                res.status(400).json({ error: 'tx_hashes must be a non-empty array' });
                return;
            }
            const validStatuses = ['completed', 'partial', 'failed'];
            if (!body.status || !validStatuses.includes(body.status)) {
                res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
                return;
            }

            const db = getDb();
            const result = db
                .prepare(
                    `INSERT INTO history (wallet_address, token_address, token_symbol, recipient_count, total_amount, tx_hashes, status)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                )
                .run(
                    body.wallet_address,
                    body.token_address ?? null,
                    body.token_symbol ?? null,
                    body.recipient_count,
                    body.total_amount,
                    JSON.stringify(body.tx_hashes),
                    body.status,
                );

            const record = db
                .prepare('SELECT * FROM history WHERE id = ?')
                .get(result.lastInsertRowid) as HistoryRecord;

            res.status(201).json({
                id: record.id,
                wallet_address: record.wallet_address,
                token_address: record.token_address,
                token_symbol: record.token_symbol,
                recipient_count: record.recipient_count,
                total_amount: record.total_amount,
                tx_hashes: JSON.parse(record.tx_hashes) as string[],
                status: record.status,
                created_at: record.created_at,
            });
        } catch (err) {
            console.error('POST /api/history error:', err);
            res.status(500).json({ error: 'Failed to save history record' });
        }
    });

    // GET /api/history/:address — list history for a wallet, newest first
    app.get('/api/history/:address', async (req, res) => {
        try {
            const walletAddress = req.path_parameters.address;
            if (!walletAddress) {
                res.status(400).json({ error: 'Wallet address is required' });
                return;
            }

            const db = getDb();
            const records = db
                .prepare(
                    `SELECT * FROM history
                     WHERE wallet_address = ?
                     ORDER BY created_at DESC`,
                )
                .all(walletAddress) as HistoryRecord[];

            const parsed = records.map((r) => ({
                id: r.id,
                wallet_address: r.wallet_address,
                token_address: r.token_address,
                token_symbol: r.token_symbol,
                recipient_count: r.recipient_count,
                total_amount: r.total_amount,
                tx_hashes: JSON.parse(r.tx_hashes) as string[],
                status: r.status,
                created_at: r.created_at,
            }));

            res.json({ history: parsed });
        } catch (err) {
            console.error('GET /api/history/:address error:', err);
            res.status(500).json({ error: 'Failed to fetch history' });
        }
    });
}
