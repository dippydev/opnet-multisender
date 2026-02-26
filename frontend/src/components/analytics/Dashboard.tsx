import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import type { HistoryEntry } from '../../store/historyStore';

interface DashboardProps {
  entries: HistoryEntry[];
}

export default function Dashboard({ entries }: DashboardProps) {
  const { t } = useTranslation();

  // 1. Sends over time (line chart) — group by date, count sends
  const sendsOverTime = useMemo(() => {
    const dateMap = new Map<string, number>();
    for (const entry of entries) {
      const date = new Date(entry.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
      dateMap.set(date, (dateMap.get(date) ?? 0) + 1);
    }
    // Return in chronological order (entries are newest-first, so reverse)
    return Array.from(dateMap.entries())
      .reverse()
      .map(([date, count]) => ({ date, count }));
  }, [entries]);

  // 2. Most-used tokens (bar chart) — group by tokenSymbol, count
  const tokenUsage = useMemo(() => {
    const tokenMap = new Map<string, number>();
    for (const entry of entries) {
      const sym = entry.tokenSymbol || 'Unknown';
      tokenMap.set(sym, (tokenMap.get(sym) ?? 0) + 1);
    }
    return Array.from(tokenMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([token, count]) => ({ token, count }));
  }, [entries]);

  // 3. Recipient frequency (bar chart) — group by tokenSymbol, sum recipientCount
  const recipientFrequency = useMemo(() => {
    const tokenMap = new Map<string, number>();
    for (const entry of entries) {
      const sym = entry.tokenSymbol || 'Unknown';
      tokenMap.set(sym, (tokenMap.get(sym) ?? 0) + entry.recipientCount);
    }
    return Array.from(tokenMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([token, recipients]) => ({ token, recipients }));
  }, [entries]);

  // Empty state
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-8 text-center">
        <BarChart3 className="mx-auto h-10 w-10 text-[var(--color-text-muted)] mb-3" />
        <p className="text-sm text-[var(--color-text-muted)]">
          {t('analytics.empty')}
        </p>
      </div>
    );
  }

  const accentColor = '#F7931A';
  const mutedAccent = '#F7931A80';

  return (
    <div className="space-y-6">
      {/* Sends over time — Line chart */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
        <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">
          {t('analytics.sendsOverTime')}
        </h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sendsOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="date"
                tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                stroke="var(--color-border)"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                stroke="var(--color-border)"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text-primary)',
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                name={t('analytics.sends')}
                stroke={accentColor}
                strokeWidth={2}
                dot={{ fill: accentColor, r: 4 }}
                activeDot={{ r: 6, fill: accentColor }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two bar charts side by side on larger screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Most-used tokens — Bar chart */}
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
          <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">
            {t('analytics.mostUsedTokens')}
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tokenUsage}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="token"
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                  stroke="var(--color-border)"
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                  stroke="var(--color-border)"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    color: 'var(--color-text-primary)',
                  }}
                />
                <Bar
                  dataKey="count"
                  name={t('analytics.sends')}
                  fill={accentColor}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recipient frequency — Bar chart */}
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
          <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">
            {t('analytics.recipientFrequency')}
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={recipientFrequency}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="token"
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                  stroke="var(--color-border)"
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                  stroke="var(--color-border)"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    color: 'var(--color-text-primary)',
                  }}
                />
                <Bar
                  dataKey="recipients"
                  name={t('analytics.recipients')}
                  fill={mutedAccent}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
