import * as React from 'react'
import { ArrowUpRight, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  type EvaluationRecord,
  loadEvaluationRecords,
} from '@/lib/evaluations'

function verdictBadgeClasses(verdict: EvaluationRecord['overallVerdict']) {
  if (verdict === 'eligible')
    return 'border-green-500/30 bg-green-500/10 text-green-200'
  if (verdict === 'not_eligible')
    return 'border-red-500/30 bg-red-500/10 text-red-200'
  return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-200'
}

function formatDate(ts: number) {
  const d = new Date(ts)
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={[
        'h-[120px] rounded-xl border border-[#222222] bg-[#111111] p-5',
        'animate-pulse',
        className ?? '',
      ].join(' ')}
    >
      <div className="h-3 w-24 rounded bg-[#222222]" />
      <div className="mt-3 h-7 w-32 rounded bg-[#222222]" />
      <div className="mt-4 h-3 w-20 rounded bg-[#222222]" />
    </div>
  )
}

export default function Dashboard() {
  const [loading, setLoading] = React.useState(true)
  const [records, setRecords] = React.useState<EvaluationRecord[]>([])

  const refresh = React.useCallback(() => {
    setLoading(true)
    window.setTimeout(() => {
      setRecords(loadEvaluationRecords())
      setLoading(false)
    }, 650)
  }, [])

  React.useEffect(() => {
    refresh()
  }, [refresh])

  const stats = React.useMemo(() => {
    const totalTenders = new Set(records.map((r) => r.tenderKey)).size
    const totalBidders = new Set(records.map((r) => r.bidderName)).size
    const eligibleCount = records.reduce((acc, r) => acc + r.counts.eligible, 0)
    const notEligibleCount = records.reduce(
      (acc, r) => acc + r.counts.not_eligible,
      0,
    )
    return { totalTenders, totalBidders, eligibleCount, notEligibleCount }
  }, [records])

  const recent = records.slice(0, 6)

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-medium tracking-wide text-slate-400">Dashboard</div>
          <div className="mt-1 text-2xl font-semibold text-white">TenderAI analytics</div>
          <div className="mt-2 text-sm text-slate-400">
            Premium overview of criteria verdicts from your recent evaluations.
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="border-[#222222] bg-[#0a0a0a] hover:border-[#3b82f6]/60"
            onClick={refresh}
          >
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
            Refresh
          </Button>
          <Button type="button" className="h-10 bg-[#3b82f6] hover:bg-[#3b82f6]/90" asChild>
            <Link to="/evaluate" className="inline-flex items-center">
              Evaluate
              <ArrowUpRight className="ml-2 h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.15 }}>
              <Card className="h-[120px] border-[#222222] bg-[#111111] transition-all duration-200 hover:shadow-[0_0_24px_rgba(59,130,246,0.18)]">
                <CardContent className="p-5">
                  <div className="text-xs text-slate-400">Total Tenders</div>
                  <div className="mt-2 text-3xl font-semibold text-white">
                    {stats.totalTenders}
                  </div>
                  <div className="mt-3 text-sm text-slate-400">Unique tender criteria sets</div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.15 }}>
              <Card className="h-[120px] border-[#222222] bg-[#111111] transition-all duration-200 hover:shadow-[0_0_24px_rgba(59,130,246,0.18)]">
                <CardContent className="p-5">
                  <div className="text-xs text-slate-400">Total Bidders</div>
                  <div className="mt-2 text-3xl font-semibold text-white">
                    {stats.totalBidders}
                  </div>
                  <div className="mt-3 text-sm text-slate-400">Unique bidder names</div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.15 }}>
              <Card className="h-[120px] border-[#222222] bg-[#111111] transition-all duration-200 hover:shadow-[0_0_24px_rgba(59,130,246,0.18)]">
                <CardContent className="p-5">
                  <div className="text-xs text-slate-400">Eligible Count</div>
                  <div className="mt-2 text-3xl font-semibold text-white">
                    {stats.eligibleCount}
                  </div>
                  <div className="mt-3 text-sm text-slate-400">Criteria marked eligible</div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.15 }}>
              <Card className="h-[120px] border-[#222222] bg-[#111111] transition-all duration-200 hover:shadow-[0_0_24px_rgba(59,130,246,0.18)]">
                <CardContent className="p-5">
                  <div className="text-xs text-slate-400">Not Eligible Count</div>
                  <div className="mt-2 text-3xl font-semibold text-white">
                    {stats.notEligibleCount}
                  </div>
                  <div className="mt-3 text-sm text-slate-400">Criteria marked not eligible</div>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </div>

      <div className="rounded-2xl border border-[#222222] bg-[#111111] p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm font-medium text-white">Recent evaluations</div>
            <div className="mt-1 text-sm text-slate-400">Latest bidder checks stored in your browser.</div>
          </div>
          <div className="text-xs text-slate-500">
            Stored locally for this demo: no backend history endpoint required.
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-[#222222] bg-[#0f0f0f] p-4 animate-pulse">
                <div className="h-3 w-48 rounded bg-[#222222]" />
                <div className="mt-3 h-3 w-28 rounded bg-[#222222]" />
                <div className="mt-4 h-3 w-64 rounded bg-[#222222]" />
              </div>
            ))
          ) : recent.length ? (
            recent.map((r) => (
              <motion.div
                key={r.id}
                whileHover={{ scale: 1.01 }}
                transition={{ duration: 0.15 }}
                className="group rounded-xl border border-[#222222] bg-[#0f0f0f] p-4 transition-all duration-200 hover:shadow-[0_0_26px_rgba(59,130,246,0.16)]"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {r.bidderName || 'Bidder'}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{formatDate(r.createdAt)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={verdictBadgeClasses(r.overallVerdict)} variant="outline">
                      {r.overallVerdict}
                    </Badge>
                    <div className="text-xs text-slate-500">
                      {r.evaluationRows.length} criteria checked
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-[#222222] bg-[#0f0f0f] p-6 text-sm text-slate-400">
              No evaluations yet. Go to <span className="text-[#3b82f6]">Evaluate</span> to run your first bid.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

