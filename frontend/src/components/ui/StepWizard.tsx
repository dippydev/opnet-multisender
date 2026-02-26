import { useTranslation } from 'react-i18next';
import { useRecipientStore } from '../../store/recipientStore';

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
    <div className="space-y-8">
      {/* Swiss-style progress: bars + labels */}
      <div className="flex items-baseline justify-between mb-4">
        <div className="text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
          {t(STEP_KEYS[currentStep]!)}
        </div>
        <div className="flex gap-1.5">
          {STEP_KEYS.map((key, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            const isClickable = index <= currentStep;

            return (
              <button
                key={key}
                type="button"
                onClick={() => isClickable && setStep(index)}
                disabled={!isClickable}
                className={`h-1 transition-all duration-300 ${
                  isClickable ? 'cursor-pointer' : 'cursor-default'
                } ${
                  isCompleted
                    ? 'w-12 bg-[var(--color-accent)]'
                    : isCurrent
                      ? 'w-12 bg-[var(--color-accent)]'
                      : 'w-12 bg-[var(--color-border)]'
                }`}
                title={t(key)}
              />
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="min-h-[300px]">{children}</div>
    </div>
  );
}
