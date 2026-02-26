import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Keyboard, Upload, ClipboardPaste, BookUser, X } from 'lucide-react';
import StepWizard from '../components/ui/StepWizard';
import { useRecipientStore } from '../store/recipientStore';
import { useWallet } from '../hooks/useWallet';
import TokenSelector from '../components/token/TokenSelector';
import ManualEntry from '../components/recipients/ManualEntry';
import CSVUploader from '../components/recipients/CSVUploader';
import PasteInput from '../components/recipients/PasteInput';
import RecipientTable from '../components/recipients/RecipientTable';
import SavedLists from '../components/recipients/SavedLists';
import AddressBook from '../components/recipients/AddressBook';
import ReviewCard from '../components/transaction/ReviewCard';
import ApproveButton from '../components/transaction/ApproveButton';
import AllowanceManager from '../components/token/AllowanceManager';
import SendButton from '../components/transaction/SendButton';
import TransactionStatus from '../components/transaction/TransactionStatus';
import SendQueue from '../components/transaction/SendQueue';
import TokenGate from '../components/gate/TokenGate';
import { validateAddress, validateAmount } from '../lib/validation';
import {
  useHistoryStore,
  generateHistoryId,
  deriveStatus,
} from '../store/historyStore';
import type { TokenInfo } from '../hooks/useToken';
import type { BatchResult } from '../hooks/useMultiSender';

function StepConnect() {
  const { t } = useTranslation();
  const { isConnected, connect } = useWallet();
  const { nextStep } = useRecipientStore();

  if (isConnected) {
    return (
      <div className="flex flex-col items-center gap-6 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center bg-[var(--color-success)]/20">
          <svg
            className="h-6 w-6 text-[var(--color-success)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-bold tracking-[0.1em] uppercase text-[var(--color-text-primary)]">
            {t('wizard.walletConnected')}
          </h3>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {t('wizard.walletConnectedDescription')}
          </p>
        </div>
        <button
          type="button"
          onClick={nextStep}
          className="bg-[var(--color-accent)] text-black px-8 py-3 text-[11px] font-bold tracking-[0.15em] uppercase hover:opacity-90 transition-opacity"
        >
          {t('wizard.continue')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center border border-[var(--color-border)]">
        <svg
          className="h-6 w-6 text-[var(--color-text-muted)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 6v3"
          />
        </svg>
      </div>
      <div>
        <h3 className="text-sm font-bold tracking-[0.1em] uppercase text-[var(--color-text-primary)]">
          {t('wizard.connectWallet')}
        </h3>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          {t('wizard.connectWalletDescription')}
        </p>
      </div>
      <button
        type="button"
        onClick={connect}
        className="bg-[var(--color-accent)] text-black px-8 py-3 text-[11px] font-bold tracking-[0.15em] uppercase hover:opacity-90 transition-opacity"
      >
        {t('wallet.connect')}
      </button>
    </div>
  );
}

function StepSelectToken() {
  const { t } = useTranslation();
  const { address } = useWallet();
  const { setSelectedToken, selectedToken, nextStep, prevStep } =
    useRecipientStore();

  const handleTokenChange = useCallback(
    (token: TokenInfo | null) => {
      setSelectedToken(token);
    },
    [setSelectedToken],
  );

  return (
    <div className="space-y-6">
      <TokenSelector walletAddress={address} onTokenChange={handleTokenChange} />

      <div className="flex justify-between">
        <button
          type="button"
          onClick={prevStep}
          className="border border-[var(--color-border)] px-6 py-3 text-[11px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-secondary)] hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          {t('wizard.back')}
        </button>
        <button
          type="button"
          onClick={nextStep}
          disabled={!selectedToken}
          className="bg-[var(--color-accent)] text-black px-8 py-3 text-[11px] font-bold tracking-[0.15em] uppercase hover:opacity-90 transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t('wizard.continue')}
        </button>
      </div>
    </div>
  );
}

type InputTab = 'manual' | 'csv' | 'paste';

const INPUT_TABS: { key: InputTab; labelKey: string; Icon: typeof Keyboard }[] = [
  { key: 'manual', labelKey: 'recipients.tabManual', Icon: Keyboard },
  { key: 'csv', labelKey: 'recipients.tabCSV', Icon: Upload },
  { key: 'paste', labelKey: 'recipients.tabPaste', Icon: ClipboardPaste },
];

function StepRecipients() {
  const { t } = useTranslation();
  const { prevStep, nextStep, recipients } = useRecipientStore();
  const [activeTab, setActiveTab] = useState<InputTab>('manual');
  const [showAddressBook, setShowAddressBook] = useState(false);

  // All recipients must have valid addresses and amounts to continue
  const allValid =
    recipients.length > 0 &&
    recipients.every(
      (r) => validateAddress(r.address).valid && validateAmount(r.amount).valid,
    );

  return (
    <div className="space-y-6">
      {/* Input method tabs — Swiss style: inline text links */}
      <div className="flex items-center justify-between mb-3">
        <label className="text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-secondary)]">
          {t('recipients.addressLabel')}
        </label>
        <div className="flex gap-6">
          {INPUT_TABS.map(({ key, labelKey }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`text-[10px] font-bold tracking-[0.15em] uppercase transition-colors ${
                activeTab === key
                  ? 'text-[var(--color-accent)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
              }`}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Active input method */}
      <div className="border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6">
        {activeTab === 'manual' && <ManualEntry />}
        {activeTab === 'csv' && <CSVUploader />}
        {activeTab === 'paste' && <PasteInput />}
      </div>

      {/* Save / Load recipient lists + Address Book button */}
      <div className="flex items-center justify-between">
        <SavedLists />
        <button
          type="button"
          onClick={() => setShowAddressBook(true)}
          className="flex items-center gap-1.5 border border-[var(--color-border)] px-3 py-2 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        >
          <BookUser className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('addressBook.openBook')}</span>
        </button>
      </div>

      {/* Address Book modal */}
      {showAddressBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-4 w-full max-w-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowAddressBook(false)}
                className="flex h-8 w-8 items-center justify-center text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <AddressBook onClose={() => setShowAddressBook(false)} />
          </div>
        </div>
      )}

      {/* Recipient table with validation, duplicates, totals */}
      <RecipientTable />

      <div className="flex justify-between">
        <button
          type="button"
          onClick={prevStep}
          className="border border-[var(--color-border)] px-6 py-3 text-[11px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-secondary)] hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          {t('wizard.back')}
        </button>
        <button
          type="button"
          onClick={nextStep}
          disabled={!allValid}
          className="bg-[var(--color-accent)] text-black px-8 py-3 text-[11px] font-bold tracking-[0.15em] uppercase hover:opacity-90 transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t('wizard.continue')}
        </button>
      </div>
    </div>
  );
}

function StepReview() {
  const { t } = useTranslation();
  const { prevStep, nextStep, sendMode, selectedToken, recipients } =
    useRecipientStore();
  const { address } = useWallet();
  const { setCurrentResults, addEntry } = useHistoryStore();
  const [approvalReady, setApprovalReady] = useState(sendMode === 'btc');

  const handleResults = useCallback(
    (results: BatchResult[]) => {
      // Store results for the TransactionStatus component
      setCurrentResults(results);

      // Save to history (localStorage)
      const totalAmount = recipients.reduce(
        (sum, r) => sum + Number(r.amount),
        0,
      );
      const txHashes = results
        .filter((r) => r.txHash)
        .map((r) => r.txHash as string);

      addEntry({
        id: generateHistoryId(),
        walletAddress: address ?? '',
        tokenAddress: selectedToken?.address ?? null,
        tokenSymbol: selectedToken?.symbol ?? (sendMode === 'btc' ? 'BTC' : ''),
        recipientCount: recipients.length,
        totalAmount: String(totalAmount),
        txHashes,
        status: deriveStatus(results),
        createdAt: new Date().toISOString(),
      });

      // Advance to status step
      nextStep();
    },
    [
      nextStep,
      setCurrentResults,
      addEntry,
      address,
      selectedToken,
      recipients,
      sendMode,
    ],
  );

  return (
    <div className="space-y-6">
      <ReviewCard />

      <ApproveButton onStatusChange={setApprovalReady} />

      {/* Allowance manager — view and revoke token allowance */}
      <AllowanceManager />

      {/* Send button */}
      <SendButton disabled={!approvalReady} onResults={handleResults} />

      <div className="flex justify-start">
        <button
          type="button"
          onClick={prevStep}
          className="border border-[var(--color-border)] px-6 py-3 text-[11px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-secondary)] hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          {t('wizard.back')}
        </button>
      </div>
    </div>
  );
}

function StepStatus() {
  return <TransactionStatus />;
}

const STEP_COMPONENTS = [
  StepConnect,
  StepSelectToken,
  StepRecipients,
  StepReview,
  StepStatus,
];

export default function MultiSender() {
  const { t } = useTranslation();
  const { currentStep, sendQueue, resetWizard } = useRecipientStore();
  const { isConnected } = useWallet();

  // Track previous connection state to detect disconnect mid-flow
  const wasConnected = useRef(isConnected);
  useEffect(() => {
    if (wasConnected.current && !isConnected && currentStep > 0) {
      // Wallet disconnected while user was past step 1
      resetWizard();
      toast.warning(t('toast.walletDisconnected'));
    }
    wasConnected.current = isConnected;
  }, [isConnected, currentStep, resetWizard, t]);

  const StepComponent = STEP_COMPONENTS[currentStep]!;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12 sm:py-24">
      <div className="mb-8 sm:mb-12">
        <h1 className="text-2xl sm:text-3xl font-black tracking-[-0.04em] uppercase text-[var(--color-text-primary)]">
          {t('pages.multisender.title')}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          {t('pages.multisender.description')}
        </p>
      </div>

      <TokenGate>
        {/* Send queue — shows completed/queued sends from this session */}
        {sendQueue.length > 0 && (
          <div className="mb-6">
            <SendQueue />
          </div>
        )}

        <StepWizard>
          <StepComponent />
        </StepWizard>
      </TokenGate>
    </div>
  );
}
