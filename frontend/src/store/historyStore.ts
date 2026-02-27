import { create } from 'zustand';
import type { BatchResult } from '../hooks/useMultiSender';
import { API_BASE_URL } from '../config/constants';

export interface HistoryEntry {
  id: string;
  walletAddress: string;
  tokenAddress: string | null;
  tokenSymbol: string;
  recipientCount: number;
  totalAmount: string;
  txHashes: string[];
  status: 'completed' | 'partial' | 'failed';
  createdAt: string;
}

const HISTORY_KEY = 'multisender_history';

function loadFromStorage(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

function saveToStorage(entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

/** Save a history entry to the backend API. Returns true on success. */
async function saveToBackend(entry: HistoryEntry): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet_address: entry.walletAddress,
        token_address: entry.tokenAddress,
        token_symbol: entry.tokenSymbol,
        recipient_count: entry.recipientCount,
        total_amount: entry.totalAmount,
        tx_hashes: entry.txHashes,
        status: entry.status,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Load history entries from the backend API for a wallet address. */
async function loadFromBackend(
  walletAddress: string,
): Promise<HistoryEntry[] | null> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/history/${encodeURIComponent(walletAddress)}`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      history: Array<{
        id: number;
        wallet_address: string;
        token_address: string | null;
        token_symbol: string | null;
        recipient_count: number;
        total_amount: string;
        tx_hashes: string[];
        status: string;
        created_at: string;
      }>;
    };
    return data.history.map((r) => ({
      id: String(r.id),
      walletAddress: r.wallet_address,
      tokenAddress: r.token_address,
      tokenSymbol: r.token_symbol ?? 'Unknown',
      recipientCount: r.recipient_count,
      totalAmount: r.total_amount,
      txHashes: r.tx_hashes,
      status: r.status as 'completed' | 'partial' | 'failed',
      createdAt: r.created_at,
    }));
  } catch {
    return null;
  }
}

interface HistoryState {
  /** Batch results from the current/most recent send */
  currentResults: BatchResult[];
  setCurrentResults: (results: BatchResult[]) => void;
  clearCurrentResults: () => void;

  /** Persisted history entries */
  entries: HistoryEntry[];
  addEntry: (entry: HistoryEntry) => void;
  removeEntry: (id: string) => void;
  clearHistory: () => void;

  /** Load history from backend for a wallet, with localStorage fallback */
  loadHistory: (walletAddress: string) => Promise<void>;
  /** Whether history is currently loading from backend */
  loading: boolean;
}

export const useHistoryStore = create<HistoryState>((set) => ({
  // Current send results
  currentResults: [],
  setCurrentResults: (results) => set({ currentResults: results }),
  clearCurrentResults: () => set({ currentResults: [] }),

  // Persisted history
  entries: loadFromStorage(),
  addEntry: (entry) =>
    set((s) => {
      const updated = [entry, ...s.entries];
      saveToStorage(updated);
      // Fire-and-forget backend save
      void saveToBackend(entry);
      return { entries: updated };
    }),
  removeEntry: (id) =>
    set((s) => {
      const updated = s.entries.filter((e) => e.id !== id);
      saveToStorage(updated);
      return { entries: updated };
    }),
  clearHistory: () => {
    saveToStorage([]);
    set({ entries: [] });
  },

  // Backend loading
  loading: false,
  loadHistory: async (walletAddress: string) => {
    set({ loading: true });
    const backendEntries = await loadFromBackend(walletAddress);
    if (backendEntries !== null) {
      // Merge: backend entries are authoritative, but keep localStorage entries
      // that aren't on the backend yet (identified by different IDs)
      const localEntries = loadFromStorage();
      const backendIds = new Set(backendEntries.map((e) => e.id));
      const localOnly = localEntries.filter((e) => !backendIds.has(e.id));

      // Backfill: sync local-only entries to the backend so stats are accurate
      for (const entry of localOnly) {
        void saveToBackend(entry);
      }

      const merged = [...localOnly, ...backendEntries].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      saveToStorage(merged);
      set({ entries: merged, loading: false });
    } else {
      // Backend unavailable — fall back to localStorage (already loaded)
      set({ entries: loadFromStorage(), loading: false });
    }
  },
}));

/** Generate a unique history entry ID */
export function generateHistoryId(): string {
  return `h_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Derive overall status from batch results */
export function deriveStatus(
  results: BatchResult[],
): 'completed' | 'partial' | 'failed' {
  const confirmed = results.filter((r) => r.status === 'confirmed').length;
  if (confirmed === results.length) return 'completed';
  if (confirmed > 0) return 'partial';
  return 'failed';
}
