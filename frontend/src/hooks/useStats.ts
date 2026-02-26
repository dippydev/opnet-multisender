import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config/constants';

export interface PlatformStats {
  totalSends: number;
  totalRecipients: number;
  uniqueSenders: number;
}

const EMPTY_STATS: PlatformStats = {
  totalSends: 0,
  totalRecipients: 0,
  uniqueSenders: 0,
};

export function useStats(): { stats: PlatformStats; loading: boolean } {
  const [stats, setStats] = useState<PlatformStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchStats() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/stats`);
        if (!res.ok) throw new Error('Failed to fetch stats');
        const data = (await res.json()) as PlatformStats;
        if (!cancelled) {
          setStats(data);
        }
      } catch {
        // Silently fail — show zeros
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchStats();
    return () => {
      cancelled = true;
    };
  }, []);

  return { stats, loading };
}
