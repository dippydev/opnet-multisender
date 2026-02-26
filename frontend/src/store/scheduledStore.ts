import { create } from 'zustand';

export interface ScheduledSend {
  id: string;
  tokenSymbol: string;
  recipientCount: number;
  totalAmount: string;
  scheduledDate: string;
  note?: string;
  done: boolean;
  createdAt: string;
}

const SCHEDULED_KEY = 'multisender_scheduled_sends';

function loadScheduled(): ScheduledSend[] {
  try {
    const raw = localStorage.getItem(SCHEDULED_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ScheduledSend[];
  } catch {
    return [];
  }
}

function persistScheduled(sends: ScheduledSend[]): void {
  try {
    localStorage.setItem(SCHEDULED_KEY, JSON.stringify(sends));
  } catch {
    // Silently fail on quota errors
  }
}

interface ScheduledState {
  scheduledSends: ScheduledSend[];
  addScheduled: (send: Omit<ScheduledSend, 'id' | 'createdAt'>) => void;
  markDone: (id: string) => void;
  removeScheduled: (id: string) => void;
}

export const useScheduledStore = create<ScheduledState>((set) => ({
  scheduledSends: loadScheduled(),

  addScheduled: (send) =>
    set((s) => {
      const entry: ScheduledSend = {
        ...send,
        id: `ss_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
      };
      const updated = [entry, ...s.scheduledSends];
      persistScheduled(updated);
      return { scheduledSends: updated };
    }),

  markDone: (id) =>
    set((s) => {
      const updated = s.scheduledSends.map((e) =>
        e.id === id ? { ...e, done: !e.done } : e,
      );
      persistScheduled(updated);
      return { scheduledSends: updated };
    }),

  removeScheduled: (id) =>
    set((s) => {
      const updated = s.scheduledSends.filter((e) => e.id !== id);
      persistScheduled(updated);
      return { scheduledSends: updated };
    }),
}));
