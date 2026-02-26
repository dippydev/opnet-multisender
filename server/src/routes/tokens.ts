import type HyperExpress from 'hyper-express';
import { getDb } from '../db/index.js';
import { fetchTokenMetadata, type TokenMetadata } from '../lib/opnet.js';

/** Known tokens to seed the registry with */
const KNOWN_TOKENS: TokenMetadata[] = [
    {
        address: 'opt1pens94hp3gqk2grgz275e58dquuuv5qmf6fgkm7q3exynykvlx8s65aj56',
        name: 'MOTO',
        symbol: 'MOTO',
        decimals: 18,
    },
    {
        address: 'opt1pyvcyjmgq6asnr45dcr4wvqwkl9z3h78e2cxuqqde2s05jvgaw0savmj3h',
        name: 'Wasabi',
        symbol: 'WABI',
        decimals: 18,
    },
];

/** Token stale threshold: 24 hours */
const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

/** Seed known tokens into DB if they don't exist */
function seedKnownTokens(): void {
    const db = getDb();
    const insert = db.prepare(
        `INSERT OR IGNORE INTO tokens (address, name, symbol, decimals, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'))`,
    );
    for (const token of KNOWN_TOKENS) {
        insert.run(token.address, token.name, token.symbol, token.decimals);
    }
}

/** Refresh a single token's metadata from chain and update DB */
async function refreshToken(address: string): Promise<TokenMetadata | null> {
    const metadata = await fetchTokenMetadata(address);
    if (metadata) {
        const db = getDb();
        db.prepare(
            `UPDATE tokens SET name = ?, symbol = ?, decimals = ?, updated_at = datetime('now')
             WHERE address = ?`,
        ).run(metadata.name, metadata.symbol, metadata.decimals, metadata.address);
    }
    return metadata;
}

/** Check if any tokens are stale and refresh them in the background */
async function refreshStaleTokens(): Promise<void> {
    const db = getDb();
    const staleTokens = db
        .prepare(
            `SELECT address FROM tokens
             WHERE updated_at < datetime('now', '-1 day')`,
        )
        .all() as Array<{ address: string }>;

    if (staleTokens.length === 0) return;

    console.log(`Refreshing ${staleTokens.length} stale token(s)...`);

    // Refresh in parallel but don't block the response
    const promises = staleTokens.map((t) => refreshToken(t.address).catch(() => null));
    await Promise.allSettled(promises);
}

export function registerTokenRoutes(app: HyperExpress.Server): void {
    // Seed known tokens on registration
    seedKnownTokens();

    // GET /api/tokens — return cached token list, refresh stale in background
    app.get('/api/tokens', async (_req, res) => {
        try {
            const db = getDb();
            const tokens = db
                .prepare('SELECT address, name, symbol, decimals, updated_at FROM tokens ORDER BY symbol ASC')
                .all() as Array<{
                address: string;
                name: string;
                symbol: string;
                decimals: number;
                updated_at: string;
            }>;

            // Check if any tokens are stale — refresh in background (don't await)
            const now = Date.now();
            const hasStale = tokens.some((t) => {
                const updatedAt = new Date(t.updated_at + 'Z').getTime();
                return now - updatedAt > STALE_THRESHOLD_MS;
            });

            if (hasStale) {
                // Fire and forget — don't block the response
                refreshStaleTokens().catch((err) => {
                    console.error('Background token refresh failed:', err);
                });
            }

            res.json({
                tokens: tokens.map((t) => ({
                    address: t.address,
                    name: t.name,
                    symbol: t.symbol,
                    decimals: t.decimals,
                })),
            });
        } catch (err) {
            console.error('GET /api/tokens error:', err);
            res.status(500).json({ error: 'Failed to fetch tokens' });
        }
    });
}
