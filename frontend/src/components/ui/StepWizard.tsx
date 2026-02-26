import { useTranslation } from 'react-i18next';
import { Wallet, Coins, Users, ClipboardCheck, Radio } from 'lucide-react';
import { useRecipientStore } from '../../store/recipientStore';

const STEP_ICONS = [Wallet, Coins, Users, ClipboardCheck, Radio];

const STEP_KEYS = [
  'wizard.step1',
  'wizard.step2',
  'wizard.step3',
  'wizard.step4',
  'wizard.step5',
] as const;

interface StepWizardProps {
  children: React.ReactNode;
}

export default function StepWizard({ children }: StepWizardProps) {
  const { t } = useTranslation();
  const { currentStep, setStep } = useRecipientStore();

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Progress bar + step indicators */}
      <div className="relative">
        {/* Connecting line (visible on all sizes) */}
        <div className="absolute left-0 right-0 top-4 sm:top-5 h-0.5 bg-[var(--color-border)]" />
        <div
          className="absolute left-0 top-4 sm:top-5 h-0.5 bg-[var(--color-accent)] transition-all duration-500"
          style={{ width: `${(currentStep / 4) * 100}%` }}
        />

        {/* Steps — always horizontal */}
        <div className="relative flex justify-between">
          {STEP_KEYS.map((key, index) => {
            const Icon = STEP_ICONS[index]!;
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            const isClickable = index <= currentStep;

            return (
              <button
                key={key}
                type="button"
                onClick={() => isClickable && setStep(index)}
                disabled={!isClickable}
                className={`group flex flex-col items-center gap-1 sm:gap-2 ${
                  isClickable ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                {/* Circle — smaller on mobile */}
                <div
                  className={`relative z-10 flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                    isCompleted
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                      : isCurrent
                        ? 'border-[var(--color-accent)] bg-[var(--color-bg-card)] text-[var(--color-accent)] shadow-[0_0_12px_rgba(247,147,26,0.3)]'
                        : 'border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text-muted)]'
                  }`}
                >
                  {isCompleted ? (
                    <svg
                      className="h-4 w-4 sm:h-5 sm:w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                </div>

                {/* Label — hidden on mobile, visible on sm+ */}
                <span
                  className={`hidden sm:block text-xs font-medium text-center transition-colors ${
                    isCurrent
                      ? 'text-[var(--color-accent)]'
                      : isCompleted
                        ? 'text-[var(--color-text-primary)]'
                        : 'text-[var(--color-text-muted)]'
                  }`}
                >
                  {t(key)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Mobile: show current step label below the dots */}
        <p className="mt-3 text-center text-xs font-medium text-[var(--color-accent)] sm:hidden">
          {t(STEP_KEYS[currentStep]!)}
        </p>
      </div>

      {/* Step content */}
      <div className="min-h-[300px]">{children}</div>
    </div>
  );
}
