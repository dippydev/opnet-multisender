import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wallet, Users, Send, Zap, Shield } from 'lucide-react';
import { useStats } from '../hooks/useStats';
import bitsendFooterLogo from '../assets/bitsendfooter.svg';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' },
  }),
};

function formatStat(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return n.toLocaleString();
}

export default function Landing() {
  const { t } = useTranslation();
  const { stats, loading: statsLoading } = useStats();

  const steps = [
    {
      icon: Wallet,
      title: t('pages.landing.step1Title'),
      description: t('pages.landing.step1Description'),
    },
    {
      icon: Users,
      title: t('pages.landing.step2Title'),
      description: t('pages.landing.step2Description'),
    },
    {
      icon: Send,
      title: t('pages.landing.step3Title'),
      description: t('pages.landing.step3Description'),
    },
  ];

  const statItems = [
    { value: formatStat(stats.totalSends), label: t('pages.landing.statSends') },
    { value: formatStat(stats.totalRecipients), label: t('pages.landing.statRecipients') },
    { value: formatStat(stats.uniqueSenders), label: t('pages.landing.statUsers') },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-4 sm:px-6 py-24 sm:py-32 md:py-48 text-center">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            animate="visible"
            custom={0}
            variants={fadeUp}
            className="inline-flex items-center gap-2 px-4 py-1.5 border border-[var(--color-border)] text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-secondary)] mb-10"
          >
            <Zap className="w-3.5 h-3.5 shrink-0 text-[var(--color-accent)]" />
            {t('pages.landing.poweredBy')}
          </motion.div>

          <motion.h1
            initial="hidden"
            animate="visible"
            custom={1}
            variants={fadeUp}
            className="text-4xl sm:text-6xl md:text-8xl font-black tracking-[-0.04em] leading-[0.9] mb-8"
          >
            <span className="text-[var(--color-text-primary)]">
              {t('pages.landing.subtitle')}
            </span>
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="visible"
            custom={2}
            variants={fadeUp}
            className="text-base sm:text-lg md:text-xl text-[var(--color-text-secondary)] max-w-2xl mx-auto mb-12 font-light leading-relaxed"
          >
            {t('pages.landing.description')}
          </motion.p>

          <motion.div
            initial="hidden"
            animate="visible"
            custom={3}
            variants={fadeUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to="/app"
              className="bg-[var(--color-accent)] text-black px-10 py-4 font-bold tracking-[0.15em] uppercase text-xs hover:opacity-90 transition-opacity"
            >
              {t('pages.landing.cta')}
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Stats — full-width grid with thin dividers */}
      <section className="border-y border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3">
          {statItems.map((stat, i) => (
            <motion.div
              key={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
              custom={i}
              variants={scaleIn}
              className={`p-8 sm:p-12 ${
                i < statItems.length - 1 ? 'md:border-r border-b md:border-b-0 border-[var(--color-border)]' : ''
              }`}
            >
              <div className="text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-secondary)] mb-4">
                {stat.label}
              </div>
              <div className="text-3xl sm:text-4xl font-bold tracking-[-0.02em] text-[var(--color-text-primary)]">
                {statsLoading ? (
                  <span className="inline-block h-9 w-20 animate-pulse bg-[var(--color-border)]" />
                ) : (
                  stat.value
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="px-4 sm:px-6 py-24 sm:py-32">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            custom={0}
            variants={fadeUp}
            className="mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-black tracking-[-0.04em] uppercase mb-2">
              {t('pages.landing.howItWorks')}
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {t('pages.landing.description')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-[var(--color-border)]">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-50px' }}
                custom={i}
                variants={scaleIn}
                className="relative p-8 sm:p-10 bg-[var(--color-bg)] group"
              >
                <div className="text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)] mb-6">
                  0{i + 1}
                </div>
                <div className="flex items-center justify-center w-10 h-10 bg-[var(--color-accent-glow)] mb-6">
                  <step.icon className="w-5 h-5 text-[var(--color-accent)]" />
                </div>
                <h3 className="text-sm font-bold tracking-[0.1em] uppercase mb-3">{step.title}</h3>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="border-t border-[var(--color-border)] py-12">
        <div className="flex items-center justify-center gap-6 flex-col">
          <img src={bitsendFooterLogo} alt={t('app.title')} className="h-10" />
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
            <Shield className="w-3.5 h-3.5" />
            {t('pages.landing.poweredBy')}
          </div>
        </div>
      </div>
    </div>
  );
}
