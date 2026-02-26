import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wallet, Users, Send, Zap, Shield, ArrowRight } from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.5, ease: 'easeOut' },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: i * 0.15, duration: 0.5, ease: 'easeOut' },
  }),
};

export default function Landing() {
  const { t } = useTranslation();

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

  const stats = [
    { value: '1,200+', label: t('pages.landing.statSends') },
    { value: '50M+', label: t('pages.landing.statTokens') },
    { value: '340+', label: t('pages.landing.statUsers') },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-4 py-12 sm:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            custom={0}
            variants={fadeUp}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-card)] text-xs sm:text-sm text-[var(--color-text-secondary)] mb-6"
          >
            <Zap className="w-4 h-4 shrink-0 text-[var(--color-accent)]" />
            {t('pages.landing.poweredBy')}
          </motion.div>

          <motion.h1
            initial="hidden"
            animate="visible"
            custom={1}
            variants={fadeUp}
            className="text-3xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-4"
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
            className="text-base sm:text-xl text-[var(--color-text-secondary)] max-w-2xl mx-auto mb-8"
          >
            {t('pages.landing.description')}
          </motion.p>

          <motion.div
            initial="hidden"
            animate="visible"
            custom={3}
            variants={fadeUp}
          >
            <Link
              to="/app"
              className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg bg-[var(--color-accent)] text-white font-semibold text-base sm:text-lg hover:bg-[var(--color-accent-hover)] transition-colors shadow-[0_0_30px_rgba(247,147,26,0.3)] hover:shadow-[0_0_40px_rgba(247,147,26,0.5)]"
            >
              {t('pages.landing.cta')}
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-4 py-16 sm:py-20">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            custom={0}
            variants={fadeUp}
            className="text-2xl sm:text-3xl font-bold text-center mb-12"
          >
            {t('pages.landing.howItWorks')}
          </motion.h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-50px' }}
                custom={i}
                variants={scaleIn}
                className="relative p-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] hover:border-[var(--color-border-hover)] transition-colors group"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-[var(--color-accent-glow)] mb-4">
                  <step.icon className="w-6 h-6 text-[var(--color-accent)]" />
                </div>
                <div className="absolute top-4 right-4 text-4xl font-bold text-[var(--color-border)] group-hover:text-[var(--color-border-hover)] transition-colors">
                  {i + 1}
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-4 py-16 sm:py-20 border-t border-[var(--color-border)]">
        <div className="max-w-4xl mx-auto">
          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            custom={0}
            variants={fadeUp}
            className="text-center text-sm text-[var(--color-text-muted)] uppercase tracking-wider mb-8"
          >
            {t('pages.landing.stats')}
          </motion.p>

          <div className="grid grid-cols-3 gap-3 sm:gap-6">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-50px' }}
                custom={i}
                variants={scaleIn}
                className="text-center p-3 sm:p-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)]"
              >
                <div className="text-xl sm:text-4xl font-bold text-[var(--color-accent)] mb-1">
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm text-[var(--color-text-secondary)]">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer accent */}
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
          <Shield className="w-4 h-4" />
          {t('pages.landing.poweredBy')}
        </div>
      </div>
    </div>
  );
}
