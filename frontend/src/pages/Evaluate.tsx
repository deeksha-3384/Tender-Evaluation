import * as React from 'react'
import {
  CheckCircle2,
  FileText,
  Loader2,
  Upload,
  UserRoundCheck,
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
  const [bidderEvaluating, setBidderEvaluating] = React.useState(false)
  const [bidderError, setBidderError] = React.useState<string | null>(null)
  const [evaluationRows, setEvaluationRows] = React.useState<EvaluationRow[]>([])

  const mandatoryTexts = React.useMemo(
    () => criteria.filter((c) => c.priority === 'Mandatory').map((c) => c.text),
    [criteria],
  )

  const overallVerdict: EvaluationVerdict | null = React.useMemo(() => {
    if (!evaluationRows.length) return null
    return computeOverallVerdict(evaluationRows, mandatoryTexts)
  }, [evaluationRows, mandatoryTexts])

  async function uploadTender(file: File) {
    setTenderUploading(true)
    setTenderError(null)
    setCriteria([])
    setBidderName('')
    setBidderFile(null)
    setBidderError(null)
    setEvaluationRows([])

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
    setEvaluationRows([])

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
      saveEvaluationRecord({
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        tenderKey: computeTenderKey(tenderCriteriaTexts),
        tenderCriteria: tenderCriteriaTexts,
        bidderName: bidderName.trim(),
        overallVerdict: overall,
        evaluationRows: rows,
        counts,
      })

      setEvaluationRows(rows)
    } catch (e) {
      setBidderError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBidderEvaluating(false)
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-medium tracking-wide text-slate-400">Evaluate</div>
          <div className="mt-1 text-2xl font-semibold text-white">Tender → Bidder eligibility</div>
          <div className="mt-2 text-sm text-slate-400">
            Upload tender criteria, then evaluate bidder evidence with explainable verdicts.
          </div>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl border border-[#222222] bg-[#111111] px-4 py-2">
          <FileText className="h-4 w-4 text-[#3b82f6]" aria-hidden />
          <span className="text-sm text-slate-200">Groq-powered evaluation</span>
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
            Bidder evaluation
          </CardTitle>
          <CardDescription className="text-slate-400">
            Upload bidder evidence PDF and evaluate against extracted tender criteria.
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
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null
                    setBidderFile(f)
                    setBidderError(null)
                    setEvaluationRows([])
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
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <div className="text-sm font-medium text-slate-200">Results</div>
                <div className="text-xs text-slate-400">
                  {evaluationRows.length
                    ? `Checked ${evaluationRows.length} criteria for ${bidderName.trim() || 'bidder'}.`
                    : 'Run an evaluation to see results.'}
                </div>
              </div>
            </div>

            {overallVerdict ? (
              <div
                className={[
                  'rounded-xl border px-4 py-3 text-sm font-medium',
                  overallVerdict === 'eligible'
                    ? 'border-green-500/30 bg-green-500/10 text-green-200'
                    : overallVerdict === 'not_eligible'
                      ? 'border-red-500/30 bg-red-500/10 text-red-200'
                      : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-200',
                ].join(' ')}
              >
                Overall verdict:{' '}
                <span className="font-semibold">
                  {overallVerdict === 'eligible'
                    ? 'Eligible'
                    : overallVerdict === 'not_eligible'
                      ? 'Not eligible'
                      : 'Needs manual review'}
                </span>
                <span className="ml-2 text-xs font-normal text-slate-300/80">
                  (based on mandatory criteria)
                </span>
              </div>
            ) : null}

            {evaluationRows.length ? (
              <div className="overflow-hidden rounded-xl border border-[#222222] bg-[#0f0f0f]">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-[#0a0a0a] text-xs uppercase tracking-wide text-slate-400">
                      <tr>
                        <th className="w-[48%] px-4 py-3 font-medium">Criterion</th>
                        <th className="w-[18%] px-4 py-3 font-medium">Verdict</th>
                        <th className="w-[34%] px-4 py-3 font-medium">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#222222]">
                      {evaluationRows.map((r, idx) => (
                        <tr key={`${r.criterion}-${idx}`} className="align-top">
                          <td className="px-4 py-3 text-slate-100">{r.criterion}</td>
                          <td className="px-4 py-3">
                            <Badge
                              variant="outline"
                              className={`${verdictBadgeClass(r.verdict)} border`}
                            >
                              {r.verdict}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-slate-300/90">{r.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#222222] bg-[#0f0f0f] p-6 text-sm text-slate-400">
                No evaluation yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

