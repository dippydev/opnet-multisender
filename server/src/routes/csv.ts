import type HyperExpress from 'hyper-express';

const BECH32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

interface ValidationResult {
    valid: boolean;
    error?: string;
}

function validateAddress(address: string): ValidationResult {
    if (!address || address.trim().length === 0) {
        return { valid: false, error: 'Address is required' };
    }

    const trimmed = address.trim().toLowerCase();

    if (!trimmed.startsWith('opt1p') && !trimmed.startsWith('opt1q')) {
        return { valid: false, error: 'Address must start with opt1p or opt1q' };
    }

    const dataPart = trimmed.slice(4);

    if (dataPart.length < 6) {
        return { valid: false, error: 'Address is too short' };
    }

    for (const char of dataPart) {
        if (!BECH32_CHARSET.includes(char)) {
            return { valid: false, error: 'Address contains invalid characters' };
        }
    }

    if (trimmed.length < 40 || trimmed.length > 100) {
        return { valid: false, error: 'Address length is invalid' };
    }

    return { valid: true };
}

function validateAmount(amount: string): ValidationResult {
    if (!amount || amount.trim().length === 0) {
        return { valid: false, error: 'Amount is required' };
    }

    const trimmed = amount.trim();
    const num = Number(trimmed);

    if (isNaN(num)) {
        return { valid: false, error: 'Invalid number' };
    }

    if (num <= 0) {
        return { valid: false, error: 'Amount must be greater than zero' };
    }

    const parts = trimmed.split('.');
    if (parts.length > 1 && parts[1]!.length > 18) {
        return { valid: false, error: 'Too many decimal places (max 18)' };
    }

    return { valid: true };
}

interface ParsedRecipient {
    address: string;
    amount: string;
}

interface ParseError {
    line: number;
    raw: string;
    error: string;
}

interface ParseResult {
    recipients: ParsedRecipient[];
    errors: ParseError[];
}

function parseCSV(text: string): ParseResult {
    const recipients: ParsedRecipient[] = [];
    const errors: ParseError[] = [];

    const lines = text.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
        const raw = lines[i]!.trim();

        if (raw.length === 0 || raw.startsWith('#')) {
            continue;
        }

        let parts: string[];
        if (raw.includes(',')) {
            parts = raw.split(',').map((p) => p.trim());
        } else if (raw.includes('\t')) {
            parts = raw.split('\t').map((p) => p.trim());
        } else {
            parts = raw.split(/\s+/);
        }

        if (parts.length < 2) {
            errors.push({
                line: i + 1,
                raw,
                error: 'Missing address or amount (expected: address,amount)',
            });
            continue;
        }

        const address = parts[0]!;
        const amount = parts[1]!;

        const addrResult = validateAddress(address);
        if (!addrResult.valid) {
            errors.push({
                line: i + 1,
                raw,
                error: addrResult.error ?? 'Invalid address',
            });
            continue;
        }

        const amtResult = validateAmount(amount);
        if (!amtResult.valid) {
            errors.push({
                line: i + 1,
                raw,
                error: amtResult.error ?? 'Invalid amount',
            });
            continue;
        }

        recipients.push({ address, amount });
    }

    return { recipients, errors };
}

export function registerCSVRoutes(app: HyperExpress.Server): void {
    // POST /api/csv/validate — validate CSV text and return parsed recipients or errors
    app.post('/api/csv/validate', async (req, res) => {
        try {
            const body = (await req.json()) as { csv?: string };

            if (!body.csv || typeof body.csv !== 'string') {
                res.status(400).json({ error: 'csv field is required as a string' });
                return;
            }

            const result = parseCSV(body.csv);

            res.json({
                recipients: result.recipients,
                errors: result.errors,
                totalValid: result.recipients.length,
                totalErrors: result.errors.length,
            });
        } catch (err) {
            console.error('POST /api/csv/validate error:', err);
            res.status(500).json({ error: 'Failed to validate CSV' });
        }
    });
}
