import { ArrowRight, ShieldCheck, Sparkles, Timer, Workflow } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const features = [
  {
    icon: Timer,
    title: 'Extract eligibility criteria',
    description: 'Upload tender PDFs and instantly extract requirements as structured items.',
  },
  {
    icon: ShieldCheck,
    title: 'Bidder document evaluation',
    description: 'Check each criterion against bidder evidence and return an explainable verdict.',
  },
  {
    icon: Workflow,
    title: 'Premium, review-friendly UI',
    description: 'Crisp badges, overall verdict banners, and professional analytics at a glance.',
  },
]

const stats = [
  { label: 'Speed', value: '10x faster' },
  { label: 'Auditability', value: '100% explainable' },
  { label: 'Governance', value: 'Zero oversight' },
]

export default function Landing() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#222222] bg-[#0a0a0a] p-6 sm:p-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div className="absolute inset-0">
        <motion.div
          className="absolute inset-[-35%] bg-gradient-to-r from-[#3b82f6]/35 via-indigo-500/20 to-cyan-400/30 blur-3xl"
          initial={{ x: '-10%', opacity: 0.7 }}
          animate={{ x: ['-16%', '8%', '-16%'], opacity: [0.45, 0.9, 0.45] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="relative">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="inline-flex items-center gap-2 rounded-full border border-[#222222] bg-[#111111] px-4 py-2 text-sm text-slate-200 shadow-sm"
        >
          <Sparkles className="h-4 w-4 text-[#3b82f6]" aria-hidden />
          Built for government procurement workflows
        </motion.div>

        <motion.h1
          className="mt-6 text-6xl font-bold tracking-tight text-transparent sm:text-7xl md:text-8xl"
          style={{
            backgroundImage:
              'linear-gradient(90deg, #e2e8f0 0%, #60a5fa 30%, #3b82f6 50%, #60a5fa 70%, #e2e8f0 100%)',
            backgroundSize: '200% 100%',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
          }}
          animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        >
          TenderAI
        </motion.h1>
        <p className="mt-4 max-w-2xl text-base text-slate-300 sm:text-lg">
          AI-powered tender evaluation for government procurement
        </p>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
          <motion.div
            whileHover={{
              scale: 1.04,
              boxShadow: '0 0 36px rgba(59,130,246,0.55)',
            }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.18 }}
          >
            <Button asChild className="h-12 bg-[#3b82f6] px-6 text-base hover:bg-[#3b82f6]/90">
              <Link to="/evaluate" className="inline-flex items-center gap-2">
                Get Started
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </motion.div>
          <Button
            asChild
            variant="outline"
            className="h-12 border-[#222222] bg-[#0f0f0f] px-6 text-base text-slate-100 hover:border-[#3b82f6]/60 hover:bg-[#111111]"
          >
            <Link to="/dashboard" className="inline-flex items-center gap-2">
              View Dashboard
            </Link>
          </Button>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {stats.map((s, idx) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08, duration: 0.35 }}
              whileHover={{ scale: 1.03 }}
              className="rounded-xl border border-[#222222] bg-[#111111]/90 p-4 shadow-sm transition-all hover:shadow-[0_0_24px_rgba(59,130,246,0.20)]"
            >
              <div className="text-xs text-slate-400">{s.label}</div>
              <div className="mt-1 text-xl font-semibold text-white">{s.value}</div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {features.map((f) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            whileHover={{ scale: 1.02 }}
          >
            <Card className="h-full border-[#222222] bg-[#111111]">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg border border-[#222222] bg-[#0f0f0f] text-[#3b82f6]">
                  <f.icon className="h-5 w-5" aria-hidden />
                </div>
                <CardTitle className="text-white">{f.title}</CardTitle>
                <CardDescription className="text-slate-400">{f.description}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-[#222222] bg-[#111111] p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm text-slate-400">Ready to evaluate?</div>
            <div className="mt-1 text-xl font-semibold text-white">Start by uploading your tender PDF.</div>
          </div>
          <Button asChild className="h-11 bg-[#3b82f6] hover:bg-[#3b82f6]/90">
            <Link to="/evaluate" className="inline-flex items-center gap-2">
              Evaluate now
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-11 border-[#222222] bg-[#0f0f0f] text-slate-100 hover:border-[#3b82f6]/60 hover:bg-[#111111]"
          >
            <Link to="/dashboard" className="inline-flex items-center gap-2">
              Open dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

