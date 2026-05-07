import * as React from 'react'
import {
  CheckCircle2,
  Check,
  FileText,
  HelpCircle,
  Loader2,
  Upload,
  UserRoundCheck,
  X,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  type CriteriaCategory,
  type CriteriaItem,
  type CriteriaPriority,
  type EvaluationRow,
  type EvaluationVerdict,
  computeCounts,
  computeOverallVerdict,
  computeTenderKey,
  saveEvaluationRecord,
} from '@/lib/evaluations'

const API_URL = 'http://127.0.0.1:8000'

function classifyCriterion(text: string): Pick<CriteriaItem, 'category' | 'priority'> {
  const t = text.toLowerCase()

  const priority: CriteriaPriority =
    /\b(mandatory|must|shall|required|compulsory|need to)\b/i.test(text) ||
    /\bnot\s+eligible\b/i.test(text)
      ? 'Mandatory'
      : 'Optional'

  const financial = /\b(turnover|revenue|financial|solvency|audited|bank|emd|earnest|security deposit|bid security|net worth)\b/i.test(
    t,
  )
  const technical = /\b(experience|similar work|technical|engineer|equipment|machinery|staff|manpower|capacity|qualification|certification of personnel)\b/i.test(
    t,
  )
  const compliance = /\b(gst|pan|msme|registration|license|licence|iso|statutory|legal|compliance|affidavit|undertaking|blacklist|debar)\b/i.test(
    t,
  )

  const category: CriteriaCategory = financial
    ? 'Financial'
    : technical
      ? 'Technical'
      : compliance
        ? 'Compliance'
        : 'Compliance'

  return { category, priority }
}

function verdictBadgeClass(verdict: EvaluationVerdict) {
  if (verdict === 'eligible') return 'border-green-500/30 bg-green-500/10 text-green-200'
  if (verdict === 'not_eligible')
    return 'border-red-500/30 bg-red-500/10 text-red-200'
  return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-200'
}

export default function Evaluate() {
  const [tenderFile, setTenderFile] = React.useState<File | null>(null)
  const [tenderUploading, setTenderUploading] = React.useState(false)
  const [tenderError, setTenderError] = React.useState<string | null>(null)
  const [criteria, setCriteria] = React.useState<CriteriaItem[]>([])

  const [bidderName, setBidderName] = React.useState('')
  const [bidderFile, setBidderFile] = React.useState<File | null>(null)
  const [bidderFileInputKey, setBidderFileInputKey] = React.useState(0)
  const [bidderEvaluating, setBidderEvaluating] = React.useState(false)
  const [bidderError, setBidderError] = React.useState<string | null>(null)

  type BidderEvaluation = {
    id: string
    bidderName: string
    bidderFileName: string
    evaluationRows: EvaluationRow[]
    overallVerdict: EvaluationVerdict
    counts: ReturnType<typeof computeCounts>
    createdAt: number
  }

  const [bidderEvaluations, setBidderEvaluations] = React.useState<BidderEvaluation[]>([])
  const [expandedBidderId, setExpandedBidderId] = React.useState<string | null>(null)

  const mandatoryTexts = React.useMemo(
    () => criteria.filter((c) => c.priority === 'Mandatory').map((c) => c.text),
    [criteria],
  )

  const bidderSummary = React.useMemo(() => {
    const total = bidderEvaluations.length
    let eligible = 0
    let notEligible = 0
    let needsReview = 0
    for (const b of bidderEvaluations) {
      if (b.overallVerdict === 'eligible') eligible += 1
      else if (b.overallVerdict === 'not_eligible') notEligible += 1
      else needsReview += 1
    }
    return { total, eligible, notEligible, needsReview }
  }, [bidderEvaluations])

  const sortedBidderEvaluations = React.useMemo(() => {
    const rank = (v: EvaluationVerdict) =>
      v === 'eligible' ? 0 : v === 'needs_manual_review' ? 1 : 2
    return [...bidderEvaluations].sort((a, b) => {
      const r = rank(a.overallVerdict) - rank(b.overallVerdict)
      if (r !== 0) return r
      return a.bidderName.localeCompare(b.bidderName)
    })
  }, [bidderEvaluations])

  const reportDate = React.useMemo(
    () =>
      new Date().toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [bidderEvaluations.length, criteria.length, tenderFile?.name],
  )

  function exportPdfReport() {
    if (!criteria.length || !sortedBidderEvaluations.length) return
    window.print()
  }

  function clearAll() {
    setTenderFile(null)
    setTenderUploading(false)
    setTenderError(null)
    setCriteria([])

    setBidderName('')
    setBidderFile(null)
    setBidderFileInputKey((k) => k + 1)
    setBidderEvaluating(false)
    setBidderError(null)

    setBidderEvaluations([])
    setExpandedBidderId(null)
  }

  async function uploadTender(file: File) {
    setTenderUploading(true)
    setTenderError(null)
    setCriteria([])
    setBidderName('')
    setBidderFile(null)
    setBidderFileInputKey((k) => k + 1)
    setBidderError(null)
    setBidderEvaluations([])
    setExpandedBidderId(null)

    try {
      const form = new FormData()
      form.append('file', file)

      const res = await fetch(`${API_URL}/upload-tender`, {
        method: 'POST',
        body: form,
      })

      const data = (await res.json().catch(() => null)) as
        | { criteria?: unknown; detail?: unknown }
        | null

      if (!res.ok) {
        const detail =
          typeof data?.detail === 'string'
            ? data.detail
            : 'Tender upload failed. Please try again.'
        throw new Error(detail)
      }

      const rawCriteria = data?.criteria
      if (!Array.isArray(rawCriteria)) {
        throw new Error('Unexpected response from server.')
      }

      const items: CriteriaItem[] = rawCriteria
        .filter((c) => typeof c === 'string')
        .map((text) => {
          const { category, priority } = classifyCriterion(text)
          return {
            id: crypto.randomUUID(),
            text,
            category,
            priority,
          }
        })

      setCriteria(items)
      setTenderFile(file)
    } catch (e) {
      setTenderError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setTenderUploading(false)
    }
  }

  async function evaluateBidder() {
    if (!bidderFile) return
    if (!criteria.length) return
    if (!bidderName.trim()) return

    setBidderEvaluating(true)
    setBidderError(null)

    try {
      const form = new FormData()
      form.append('file', bidderFile)
      form.append('criteria', JSON.stringify(criteria.map((c) => c.text)))

      const res = await fetch(`${API_URL}/evaluate-bidder`, {
        method: 'POST',
        body: form,
      })

      const data = (await res.json().catch(() => null)) as
        | { evaluation?: unknown; detail?: unknown }
        | null

      if (!res.ok) {
        const detail =
          typeof data?.detail === 'string'
            ? data.detail
            : 'Bidder evaluation failed. Please try again.'
        throw new Error(detail)
      }

      if (!Array.isArray(data?.evaluation)) {
        throw new Error('Unexpected response from server.')
      }

      const rows: EvaluationRow[] = data.evaluation.map((r) => {
        const criterion = (r as any)?.criterion
        const verdict = (r as any)?.verdict
        const reason = (r as any)?.reason

        if (
          typeof criterion !== 'string' ||
          typeof verdict !== 'string' ||
          typeof reason !== 'string'
        ) {
          throw new Error('Unexpected response from server.')
        }

        if (!['eligible', 'not_eligible', 'needs_manual_review'].includes(verdict)) {
          throw new Error('Unexpected verdict from server.')
        }

        return {
          criterion,
          verdict: verdict as EvaluationVerdict,
          reason,
        }
      })

      const mandatoryCriteriaTexts = mandatoryTexts
      const overall = computeOverallVerdict(rows, mandatoryCriteriaTexts)
      const counts = computeCounts(rows)

      const tenderCriteriaTexts = criteria.map((c) => c.text)
      const createdAt = Date.now()
      const evaluationId = crypto.randomUUID()
      saveEvaluationRecord({
        id: evaluationId,
        createdAt,
        tenderKey: computeTenderKey(tenderCriteriaTexts),
        tenderCriteria: tenderCriteriaTexts,
        bidderName: bidderName.trim(),
        overallVerdict: overall,
        evaluationRows: rows,
        counts,
      })

      const newBidderEvaluation: BidderEvaluation = {
        id: evaluationId,
        bidderName: bidderName.trim(),
        bidderFileName: bidderFile.name,
        evaluationRows: rows,
        overallVerdict: overall,
        counts,
        createdAt,
      }

      setBidderEvaluations((prev) => [newBidderEvaluation, ...prev])
      setExpandedBidderId((prev) => prev ?? evaluationId)
      setBidderFile(null)
      setBidderFileInputKey((k) => k + 1)
      setBidderName('')
    } catch (e) {
      setBidderError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBidderEvaluating(false)
    }
  }

  return (
    <>
      <div className="grid gap-6 no-print">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-medium tracking-wide text-slate-400">Evaluate</div>
          <div className="mt-1 text-2xl font-semibold text-white">Tender → Bidder eligibility</div>
          <div className="mt-2 text-sm text-slate-400">
            Upload tender criteria, then evaluate bidder evidence with explainable verdicts.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            className="bg-[#3b82f6] hover:bg-[#3b82f6]/90"
            onClick={exportPdfReport}
            disabled={!criteria.length || !sortedBidderEvaluations.length}
          >
            Export PDF Report
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-[#222222] bg-[#0a0a0a] hover:border-[#3b82f6]/60"
            onClick={clearAll}
          >
            Clear All
          </Button>
          <div className="inline-flex items-center gap-2 rounded-xl border border-[#222222] bg-[#111111] px-4 py-2">
            <FileText className="h-4 w-4 text-[#3b82f6]" aria-hidden />
            <span className="text-sm text-slate-200">Groq-powered evaluation</span>
          </div>
        </div>
      </div>

      <Card className="border-[#222222] bg-[#111111]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Upload className="h-5 w-5 text-[#3b82f6]" aria-hidden />
            Upload tender PDF
          </CardTitle>
          <CardDescription className="text-slate-400">
            We extract eligibility criteria, categorize them, and prepare the evaluation set.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <div className="text-sm font-medium text-slate-200">Tender document</div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null
                  setTenderFile(f)
                  setTenderError(null)
                  if (f) uploadTender(f)
                }}
                disabled={tenderUploading}
                className="sm:max-w-xl"
              />

              <div className="flex items-center gap-2 text-sm text-slate-400">
                {tenderUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-[#3b82f6]" aria-hidden />
                    Extracting criteria…
                  </>
                ) : tenderFile ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-[#3b82f6]" aria-hidden />
                    <span className="text-slate-200">{tenderFile.name}</span>
                  </>
                ) : (
                  <span>Choose a PDF to begin</span>
                )}
              </div>
            </div>

            {tenderError ? (
              <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {tenderError}
              </div>
            ) : null}
          </div>

          <Separator />

          <div className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-medium text-slate-200">Eligibility criteria</div>
                <div className="text-xs text-slate-400">
                  {tenderUploading
                    ? 'Waiting for model response…'
                    : criteria.length
                      ? `Found ${criteria.length} items`
                      : 'Upload a tender to populate this list'}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {tenderUploading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-[#222222] bg-[#0f0f0f] p-5 shadow-sm animate-pulse"
                  >
                    <div className="h-4 w-28 rounded bg-[#222222]" />
                    <div className="mt-3 h-4 w-full rounded bg-[#222222]" />
                    <div className="mt-2 h-4 w-5/6 rounded bg-[#222222]" />
                    <div className="mt-2 h-4 w-2/3 rounded bg-[#222222]" />
                  </div>
                ))
              ) : criteria.length ? (
                criteria.map((c) => (
                  <Card
                    key={c.id}
                    className="border-[#222222] bg-[#0f0f0f] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_26px_rgba(59,130,246,0.18)]"
                  >
                    <CardHeader className="pb-2 pt-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-[#3b82f6] text-white border-transparent">
                          {c.category}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={
                            c.priority === 'Mandatory'
                              ? 'border-[#3b82f6]/40 bg-[#3b82f6]/10 text-[#93c5fd]'
                              : 'border-[#222222] bg-[#111111] text-slate-200'
                          }
                        >
                          {c.priority}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm leading-relaxed text-slate-100">{c.text}</p>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-[#222222] bg-[#0f0f0f] p-8 text-center text-sm text-slate-400 md:col-span-2">
                  No criteria yet.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#222222] bg-[#111111]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <UserRoundCheck className="h-5 w-5 text-[#3b82f6]" aria-hidden />
            Bidder evaluations (multi-bidder)
          </CardTitle>
          <CardDescription className="text-slate-400">
            Upload bidder PDFs one at a time. Each evaluation is added to the comparison table.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2 md:col-span-1">
              <div className="text-sm font-medium text-slate-200">Bidder name</div>
              <Input
                type="text"
                placeholder="e.g. Acme Pvt Ltd"
                value={bidderName}
                onChange={(e) => setBidderName(e.target.value)}
                disabled={bidderEvaluating}
              />
              <div className="text-xs text-slate-400">Used for display and dashboard stats.</div>
            </div>

            <div className="grid gap-2 md:col-span-2">
              <div className="text-sm font-medium text-slate-200">Bidder PDF</div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Input
                  key={bidderFileInputKey}
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null
                    setBidderFile(f)
                    setBidderError(null)
                  }}
                  disabled={bidderEvaluating}
                  className="sm:max-w-xl"
                />

                <div className="flex items-center gap-2 text-sm text-slate-400">
                  {bidderEvaluating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-[#3b82f6]" aria-hidden />
                      Evaluating…
                    </>
                  ) : bidderFile ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-[#3b82f6]" aria-hidden />
                      <span className="text-slate-200">{bidderFile.name}</span>
                    </>
                  ) : (
                    <span>Choose a bidder PDF</span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button
                  type="button"
                  onClick={evaluateBidder}
                  disabled={
                    bidderEvaluating || !bidderFile || !criteria.length || !bidderName.trim()
                  }
                  className="bg-[#3b82f6] hover:bg-[#3b82f6]/90"
                >
                  {bidderEvaluating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                      Evaluate Bidder
                    </>
                  ) : (
                    'Evaluate Bidder'
                  )}
                </Button>
                {!criteria.length ? (
                  <div className="text-xs text-slate-400">Upload a tender first to extract criteria.</div>
                ) : null}
              </div>

              {bidderError ? (
                <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {bidderError}
                </div>
              ) : null}
            </div>
          </div>

          <Separator />

          <div className="grid gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-sm font-medium text-slate-200">Comparison</div>
                <div className="text-xs text-slate-400">
                  {bidderEvaluations.length
                    ? 'Click a bidder row to expand reasons.'
                    : 'Evaluate bidders to populate the comparison table.'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
                <div className="rounded-xl border border-[#222222] bg-[#0f0f0f] px-3 py-2">
                  <div className="text-[11px] text-slate-500">Total bidders</div>
                  <div className="text-lg font-semibold text-white">{bidderSummary.total}</div>
                </div>
                <div className="rounded-xl border border-[#222222] bg-[#0f0f0f] px-3 py-2">
                  <div className="text-[11px] text-slate-500">Eligible</div>
                  <div className="text-lg font-semibold text-white">{bidderSummary.eligible}</div>
                </div>
                <div className="rounded-xl border border-[#222222] bg-[#0f0f0f] px-3 py-2">
                  <div className="text-[11px] text-slate-500">Not eligible</div>
                  <div className="text-lg font-semibold text-white">{bidderSummary.notEligible}</div>
                </div>
                <div className="rounded-xl border border-[#222222] bg-[#0f0f0f] px-3 py-2">
                  <div className="text-[11px] text-slate-500">Needs review</div>
                  <div className="text-lg font-semibold text-white">{bidderSummary.needsReview}</div>
                </div>
              </div>
            </div>

            {sortedBidderEvaluations.length ? (
              <div className="overflow-hidden rounded-xl border border-[#222222] bg-[#0f0f0f]">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-[#0a0a0a] text-xs uppercase tracking-wide text-slate-400">
                      <tr>
                        <th className="sticky left-0 z-10 w-[220px] bg-[#0a0a0a] px-4 py-3 font-medium">
                          Bidder
                        </th>
                        {criteria.map((c, idx) => (
                          <th key={c.id} className="min-w-[180px] px-4 py-3 font-medium">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500">C{idx + 1}</span>
                              <span className="truncate" title={c.text}>
                                {c.text}
                              </span>
                            </div>
                          </th>
                        ))}
                        <th className="sticky right-0 z-10 w-[180px] bg-[#0a0a0a] px-4 py-3 font-medium">
                          Overall
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#222222]">
                      {sortedBidderEvaluations.map((b) => {
                        const rowByCriterion = new Map(
                          b.evaluationRows.map((r) => [r.criterion, r]),
                        )
                        const isExpanded = expandedBidderId === b.id

                        return (
                          <React.Fragment key={b.id}>
                            <tr
                              className="cursor-pointer align-top transition-colors hover:bg-white/5"
                              onClick={() =>
                                setExpandedBidderId((prev) => (prev === b.id ? null : b.id))
                              }
                            >
                              <td className="sticky left-0 z-10 bg-[#0f0f0f] px-4 py-3">
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold text-white">
                                    {b.bidderName}
                                  </div>
                                  <div className="truncate text-xs text-slate-500">
                                    {b.bidderFileName}
                                  </div>
                                </div>
                              </td>

                              {criteria.map((c) => {
                                const r = rowByCriterion.get(c.text)
                                const verdict = r?.verdict ?? 'needs_manual_review'

                                const icon =
                                  verdict === 'eligible' ? (
                                    <Check className="h-3.5 w-3.5" aria-hidden />
                                  ) : verdict === 'not_eligible' ? (
                                    <X className="h-3.5 w-3.5" aria-hidden />
                                  ) : (
                                    <HelpCircle className="h-3.5 w-3.5" aria-hidden />
                                  )

                                return (
                                  <td key={c.id} className="px-4 py-3">
                                    <Badge
                                      variant="outline"
                                      className={`${verdictBadgeClass(verdict)} inline-flex items-center gap-1.5 border`}
                                    >
                                      {icon}
                                      <span className="sr-only">{verdict}</span>
                                    </Badge>
                                  </td>
                                )
                              })}

                              <td className="sticky right-0 z-10 bg-[#0f0f0f] px-4 py-3">
                                <Badge
                                  variant="outline"
                                  className={`${verdictBadgeClass(b.overallVerdict)} border`}
                                >
                                  {b.overallVerdict}
                                </Badge>
                              </td>
                            </tr>

                            {isExpanded ? (
                              <tr className="bg-[#0a0a0a]">
                                <td
                                  colSpan={criteria.length + 2}
                                  className="px-4 py-4"
                                >
                                  <div className="grid gap-3">
                                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                      <div className="text-sm font-medium text-slate-200">
                                        Detailed reasons — {b.bidderName}
                                      </div>
                                      <div className="text-xs text-slate-500">
                                        Click the row again to collapse
                                      </div>
                                    </div>

                                    <div className="overflow-hidden rounded-xl border border-[#222222] bg-[#0f0f0f]">
                                      <div className="overflow-x-auto">
                                        <table className="min-w-full text-left text-sm">
                                          <thead className="bg-[#0a0a0a] text-xs uppercase tracking-wide text-slate-400">
                                            <tr>
                                              <th className="w-[52%] px-4 py-3 font-medium">
                                                Criterion
                                              </th>
                                              <th className="w-[18%] px-4 py-3 font-medium">
                                                Verdict
                                              </th>
                                              <th className="w-[30%] px-4 py-3 font-medium">
                                                Reason
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-[#222222]">
                                            {criteria.map((c, idx) => {
                                              const r =
                                                rowByCriterion.get(c.text) ??
                                                ({
                                                  criterion: c.text,
                                                  verdict: 'needs_manual_review',
                                                  reason:
                                                    'No clear evidence found for this criterion in the bidder document.',
                                                } as EvaluationRow)

                                              return (
                                                <tr key={`${b.id}-${idx}`} className="align-top">
                                                  <td className="px-4 py-3 text-slate-100">
                                                    {r.criterion}
                                                  </td>
                                                  <td className="px-4 py-3">
                                                    <Badge
                                                      variant="outline"
                                                      className={`${verdictBadgeClass(r.verdict)} border`}
                                                    >
                                                      {r.verdict}
                                                    </Badge>
                                                  </td>
                                                  <td className="px-4 py-3 text-slate-300/90">
                                                    {r.reason}
                                                  </td>
                                                </tr>
                                              )
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            ) : null}
                          </React.Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#222222] bg-[#0f0f0f] p-6 text-sm text-slate-400">
                No bidders evaluated yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      </div>

      <section className="print-report-root hidden bg-white text-black print:block">
        <div className="mx-auto max-w-[1100px] p-8">
          <div className="mb-5 border-b border-slate-300 pb-4">
            <h1 className="text-2xl font-bold">TenderAI Evaluation Report</h1>
            <p className="mt-1 text-sm text-slate-700">
              Tender: <span className="font-medium">{tenderFile?.name ?? 'Untitled Tender'}</span>
            </p>
            <p className="text-sm text-slate-700">
              Generated on: <span className="font-medium">{reportDate}</span>
            </p>
            <p className="text-sm text-slate-700">
              Bidders evaluated: <span className="font-medium">{sortedBidderEvaluations.length}</span>
            </p>
          </div>

          <div className="mb-4 grid grid-cols-4 gap-3 text-sm">
            <div className="rounded border border-slate-300 p-3">
              <div className="text-slate-600">Total bidders</div>
              <div className="text-xl font-semibold">{bidderSummary.total}</div>
            </div>
            <div className="rounded border border-slate-300 p-3">
              <div className="text-slate-600">Eligible</div>
              <div className="text-xl font-semibold text-green-700">{bidderSummary.eligible}</div>
            </div>
            <div className="rounded border border-slate-300 p-3">
              <div className="text-slate-600">Not eligible</div>
              <div className="text-xl font-semibold text-red-700">{bidderSummary.notEligible}</div>
            </div>
            <div className="rounded border border-slate-300 p-3">
              <div className="text-slate-600">Needs review</div>
              <div className="text-xl font-semibold text-amber-700">{bidderSummary.needsReview}</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="border border-slate-300 bg-slate-100 px-2 py-2 text-left">Bidder</th>
                  {criteria.map((c, idx) => (
                    <th key={c.id} className="border border-slate-300 bg-slate-100 px-2 py-2 text-left">
                      C{idx + 1}
                    </th>
                  ))}
                  <th className="border border-slate-300 bg-slate-100 px-2 py-2 text-left">Overall</th>
                </tr>
              </thead>
              <tbody>
                {sortedBidderEvaluations.map((b) => {
                  const rowByCriterion = new Map(b.evaluationRows.map((r) => [r.criterion, r]))
                  return (
                    <tr key={b.id}>
                      <td className="border border-slate-300 px-2 py-2 font-medium">{b.bidderName}</td>
                      {criteria.map((c) => {
                        const v = rowByCriterion.get(c.text)?.verdict ?? 'needs_manual_review'
                        return (
                          <td key={`${b.id}-${c.id}`} className="border border-slate-300 px-2 py-2">
                            {v}
                          </td>
                        )
                      })}
                      <td className="border border-slate-300 px-2 py-2 font-medium">{b.overallVerdict}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <h2 className="text-sm font-semibold">Criterion Reference</h2>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-slate-700">
              {criteria.map((c, idx) => (
                <li key={c.id}>
                  C{idx + 1}: {c.text}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </>
  )
}

