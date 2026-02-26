import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

let db: Database.Database;

export function getDb(): Database.Database {
    if (!db) {
        const dbPath = process.env.DB_PATH || join(__dirname, '..', '..', 'multisender.db');
        db = new Database(dbPath);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');

        const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
        db.exec(schema);

        console.log(`SQLite database initialized at ${dbPath}`);
    }
    return db;
}

export function closeDb(): void {
    if (db) {
        db.close();
    }
}
