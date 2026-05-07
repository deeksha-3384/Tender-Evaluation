import { ArrowRight, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const features = [
  {
    title: 'Extract eligibility criteria',
    description: 'Upload tender PDFs and instantly extract requirements as structured items.',
  },
  {
    title: 'Bidder document evaluation',
    description: 'Check each criterion against bidder evidence and return an explainable verdict.',
  },
  {
    title: 'Premium, review-friendly UI',
    description: 'Crisp badges, overall verdict banners, and professional analytics at a glance.',
  },
]

export default function Landing() {
  return (
    <div className="relative">
      <div className="relative overflow-hidden rounded-2xl border border-[#222222] bg-[#0a0a0a]">
        <div className="absolute inset-0">
          <motion.div
            className="absolute inset-[-40%] bg-gradient-to-r from-[#3b82f6]/35 via-transparent to-[#3b82f6]/35 blur-3xl"
            initial={{ x: '-10%', opacity: 0.65 }}
            animate={{ x: ['-14%', '10%', '-14%'], opacity: [0.55, 0.85, 0.55] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <div className="relative px-5 py-10 sm:px-10 sm:py-14">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="inline-flex items-center gap-2 rounded-full border border-[#222222] bg-[#111111] px-4 py-2 text-sm text-slate-200 shadow-sm"
            >
              <Sparkles className="h-4 w-4 text-[#3b82f6]" aria-hidden />
              AI-powered tender & bidder eligibility checks
            </motion.div>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              TenderAI
            </h1>
            <p className="mt-4 max-w-2xl text-base text-slate-300 sm:text-lg">
              Extract eligibility criteria from tender PDFs and evaluate bidder documents
              with clear, explainable verdicts. Built for fast procurement review.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <motion.div
                whileHover={{
                  scale: 1.03,
                  boxShadow: '0 0 30px rgba(59,130,246,0.35)',
                }}
                whileTap={{ scale: 0.99 }}
                transition={{ duration: 0.15 }}
              >
                <Button
                  asChild
                  className="h-11 bg-[#3b82f6] hover:bg-[#3b82f6]/90"
                >
                  <Link to="/evaluate" className="inline-flex items-center gap-2">
                    Get started
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
              </motion.div>

              <div className="text-sm text-slate-400">
                No setup required on the client. Start evaluating in seconds.
              </div>
            </div>

            <div className="mt-9 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[#222222] bg-[#111111] p-4 shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_24px_rgba(59,130,246,0.20)]">
                <div className="text-xs text-slate-400">Speed</div>
                <div className="mt-1 text-lg font-semibold text-white">Fast extraction</div>
              </div>
              <div className="rounded-xl border border-[#222222] bg-[#111111] p-4 shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_24px_rgba(59,130,246,0.20)]">
                <div className="text-xs text-slate-400">Explainability</div>
                <div className="mt-1 text-lg font-semibold text-white">Evidence-based</div>
              </div>
              <div className="rounded-xl border border-[#222222] bg-[#111111] p-4 shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_24px_rgba(59,130,246,0.20)]">
                <div className="text-xs text-slate-400">Workflow</div>
                <div className="mt-1 text-lg font-semibold text-white">Review-ready</div>
              </div>
            </div>
          </div>
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
        </div>
      </div>
    </div>
  )
}

