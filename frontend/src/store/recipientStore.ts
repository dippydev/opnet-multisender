import { create } from 'zustand';
import type { TokenInfo } from '../hooks/useToken';

export interface Recipient {
  id: string;
  address: string;
  amount: string;
  percentage?: string;
}

export type SendMode = 'op20' | 'btc';
export type DistributionMode = 'custom' | 'airdrop' | 'percentage';

export interface SavedList {
  id: string;
  name: string;
  recipients: { address: string; amount: string; percentage?: string }[];
  createdAt: string;
}

export interface AddressBookEntry {
  id: string;
  address: string;
  label: string;
  createdAt: string;
}

export interface QueueEntry {
  id: string;
  tokenSymbol: string;
  tokenAddress: string | null;
  sendMode: SendMode;
  recipientCount: number;
  totalAmount: string;
  status: 'completed' | 'partial' | 'failed';
  txHashes: string[];
  addedAt: string;
}

const SAVED_LISTS_KEY = 'multisender_saved_lists';
const ADDRESS_BOOK_KEY = 'multisender_address_book';

function loadSavedLists(): SavedList[] {
  try {
    const raw = localStorage.getItem(SAVED_LISTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedList[];
  } catch {
    return [];
  }
}

function persistSavedLists(lists: SavedList[]): void {
  try {
    localStorage.setItem(SAVED_LISTS_KEY, JSON.stringify(lists));
  } catch {
    // Silently fail on quota errors
  }
}

function loadAddressBook(): AddressBookEntry[] {
  try {
    const raw = localStorage.getItem(ADDRESS_BOOK_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AddressBookEntry[];
  } catch {
    return [];
  }
}

function persistAddressBook(entries: AddressBookEntry[]): void {
  try {
    localStorage.setItem(ADDRESS_BOOK_KEY, JSON.stringify(entries));
  } catch {
    // Silently fail on quota errors
  }
}

interface RecipientState {
  // Wizard step (0-indexed: 0=connect, 1=token, 2=recipients, 3=review, 4=status)
  currentStep: number;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  resetWizard: () => void;

  // Token selection
  selectedToken: TokenInfo | null;
  sendMode: SendMode;
  setSelectedToken: (token: TokenInfo | null) => void;

  // Recipients
  recipients: Recipient[];
  distributionMode: DistributionMode;
  airdropTotalAmount: string;
  percentageTotalAmount: string;
  addRecipient: (recipient: Recipient) => void;
  addRecipients: (recipients: Recipient[]) => void;
  updateRecipient: (id: string, updates: Partial<Omit<Recipient, 'id'>>) => void;
  removeRecipient: (id: string) => void;
  clearRecipients: () => void;
  setDistributionMode: (mode: DistributionMode) => void;
  setAirdropTotalAmount: (amount: string) => void;
  recalculateAirdropAmounts: () => void;
  setPercentageTotalAmount: (amount: string) => void;
  updateRecipientPercentage: (id: string, percentage: string) => void;
  recalculatePercentageAmounts: () => void;

  // Saved lists
  savedLists: SavedList[];
  saveList: (name: string) => void;
  loadList: (id: string) => void;
  deleteList: (id: string) => void;

  // Address book
  addressBook: AddressBookEntry[];
  addToAddressBook: (address: string, label: string) => void;
  updateAddressBookEntry: (id: string, updates: Partial<Omit<AddressBookEntry, 'id' | 'createdAt'>>) => void;
  removeFromAddressBook: (id: string) => void;

  // Send queue
  sendQueue: QueueEntry[];
  addToQueue: (entry: QueueEntry) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
}

let nextId = 1;
export function generateRecipientId(): string {
  return `r_${nextId++}_${Date.now()}`;
}

export const useRecipientStore = create<RecipientState>((set) => ({
  // Wizard
  currentStep: 0,
  setStep: (step) => set({ currentStep: step }),
  nextStep: () => set((s) => ({ currentStep: Math.min(s.currentStep + 1, 4) })),
  prevStep: () => set((s) => ({ currentStep: Math.max(s.currentStep - 1, 0) })),
  resetWizard: () =>
    set({
      currentStep: 0,
      selectedToken: null,
      sendMode: 'op20',
      recipients: [],
      distributionMode: 'custom',
      airdropTotalAmount: '',
      percentageTotalAmount: '',
    }),

  // Token
  selectedToken: null,
  sendMode: 'op20',
  setSelectedToken: (token) =>
    set({
      selectedToken: token,
      sendMode: token?.isBTC ? 'btc' : 'op20',
    }),

  // Recipients
  recipients: [],
  distributionMode: 'custom',
  airdropTotalAmount: '',
  percentageTotalAmount: '',
  addRecipient: (recipient) =>
    set((s) => ({ recipients: [...s.recipients, recipient] })),
  addRecipients: (newRecipients) =>
    set((s) => ({ recipients: [...s.recipients, ...newRecipients] })),
  updateRecipient: (id, updates) =>
    set((s) => ({
      recipients: s.recipients.map((r) =>
        r.id === id ? { ...r, ...updates } : r,
      ),
    })),
  removeRecipient: (id) =>
    set((s) => ({
      recipients: s.recipients.filter((r) => r.id !== id),
    })),
  clearRecipients: () => set({ recipients: [] }),
  setDistributionMode: (mode) => set({ distributionMode: mode }),
  setAirdropTotalAmount: (amount) => set({ airdropTotalAmount: amount }),
  recalculateAirdropAmounts: () =>
    set((s) => {
      if (s.distributionMode !== 'airdrop' || s.recipients.length === 0) {
        return s;
      }
      const total = Number(s.airdropTotalAmount);
      if (isNaN(total) || total <= 0) {
        return s;
      }
      const perRecipient = total / s.recipients.length;
      // Use fixed precision to avoid floating point artifacts, trim trailing zeros
      const amountStr = perRecipient.toFixed(18).replace(/\.?0+$/, '');
      return {
        recipients: s.recipients.map((r) => ({ ...r, amount: amountStr })),
      };
    }),
  setPercentageTotalAmount: (amount) => set({ percentageTotalAmount: amount }),
  updateRecipientPercentage: (id, percentage) =>
    set((s) => ({
      recipients: s.recipients.map((r) =>
        r.id === id ? { ...r, percentage } : r,
      ),
    })),
  recalculatePercentageAmounts: () =>
    set((s) => {
      if (s.distributionMode !== 'percentage' || s.recipients.length === 0) {
        return s;
      }
      const total = Number(s.percentageTotalAmount);
      if (isNaN(total) || total <= 0) {
        return s;
      }
      return {
        recipients: s.recipients.map((r) => {
          const pct = Number(r.percentage);
          if (isNaN(pct) || pct <= 0) {
            return { ...r, amount: '' };
          }
          const amount = (pct / 100) * total;
          const amountStr = amount.toFixed(18).replace(/\.?0+$/, '');
          return { ...r, amount: amountStr };
        }),
      };
    }),

  // Saved lists
  savedLists: loadSavedLists(),
  saveList: (name) =>
    set((s) => {
      if (s.recipients.length === 0) return s;
      const newList: SavedList = {
        id: `sl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name,
        recipients: s.recipients.map((r) => ({
          address: r.address,
          amount: r.amount,
          percentage: r.percentage,
        })),
        createdAt: new Date().toISOString(),
      };
      const updated = [newList, ...s.savedLists];
      persistSavedLists(updated);
      return { savedLists: updated };
    }),
  loadList: (id) =>
    set((s) => {
      const list = s.savedLists.find((l) => l.id === id);
      if (!list) return s;
      const recipients: Recipient[] = list.recipients.map((r) => ({
        id: generateRecipientId(),
        address: r.address,
        amount: r.amount,
        percentage: r.percentage,
      }));
      return { recipients };
    }),
  deleteList: (id) =>
    set((s) => {
      const updated = s.savedLists.filter((l) => l.id !== id);
      persistSavedLists(updated);
      return { savedLists: updated };
    }),

  // Address book
  addressBook: loadAddressBook(),
  addToAddressBook: (address, label) =>
    set((s) => {
      const entry: AddressBookEntry = {
        id: `ab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        address,
        label,
        createdAt: new Date().toISOString(),
      };
      const updated = [entry, ...s.addressBook];
      persistAddressBook(updated);
      return { addressBook: updated };
    }),
  updateAddressBookEntry: (id, updates) =>
    set((s) => {
      const updated = s.addressBook.map((e) =>
        e.id === id ? { ...e, ...updates } : e,
      );
      persistAddressBook(updated);
      return { addressBook: updated };
    }),
  removeFromAddressBook: (id) =>
    set((s) => {
      const updated = s.addressBook.filter((e) => e.id !== id);
      persistAddressBook(updated);
      return { addressBook: updated };
    }),

  // Send queue
  sendQueue: [],
  addToQueue: (entry) =>
    set((s) => ({ sendQueue: [...s.sendQueue, entry] })),
  removeFromQueue: (id) =>
    set((s) => ({ sendQueue: s.sendQueue.filter((e) => e.id !== id) })),
  clearQueue: () => set({ sendQueue: [] }),
}));
