import { useCallback, useEffect, useState } from 'react';
import { API_BASE_URL, KNOWN_TOKENS, type KnownToken } from '../config/constants';

/**
 * Fetches the global token registry from the server.
 * Falls back to hardcoded KNOWN_TOKENS if the server is unreachable.
 * Also exposes a `registerToken` function to persist a new custom token.
 */
export function useGlobalTokens() {
  const [tokens, setTokens] = useState<KnownToken[]>(KNOWN_TOKENS);
  const [loading, setLoading] = useState(true);

  // Fetch global list on mount
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/tokens`);
        if (!res.ok) throw new Error('Failed to fetch tokens');
        const data = (await res.json()) as { tokens: KnownToken[] };
        if (!cancelled && data.tokens.length > 0) {
          setTokens(data.tokens);
        }
      } catch {
        // Keep hardcoded fallback
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, []);

  // Register a custom token address with the server
  const registerToken = useCallback(async (address: string): Promise<KnownToken | null> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });

      if (!res.ok) return null;

      const data = (await res.json()) as { token: KnownToken; created: boolean };
      const token = data.token;

      // Add to local list if not already present
      setTokens((prev) => {
        const exists = prev.some(
          (t) => t.address.toLowerCase() === token.address.toLowerCase(),
        );
        return exists ? prev : [...prev, token];
      });

      return token;
    } catch {
      return null;
    }
  }, []);

  return { tokens, loading, registerToken };
}
