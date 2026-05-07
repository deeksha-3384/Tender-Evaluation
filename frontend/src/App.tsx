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

type CriteriaCategory = 'Financial' | 'Technical' | 'Compliance'
type CriteriaPriority = 'Mandatory' | 'Optional'

type CriteriaItem = {
  id: string
  text: string
  category: CriteriaCategory
  priority: CriteriaPriority
}

type EvaluationVerdict = 'eligible' | 'not_eligible' | 'needs_manual_review'

type EvaluationRow = {
  criterion: string
  verdict: EvaluationVerdict
  reason: string
}

const API_URL = 'http://127.0.0.1:8000'

function classifyCriterion(text: string): Pick<CriteriaItem, 'category' | 'priority'> {
  const t = text.toLowerCase()

  const priority: CriteriaPriority =
    /\b(mandatory|must|shall|required|compulsory|need to)\b/i.test(text) ||
    /\bnot\s+eligible\b/i.test(text)
      ? 'Mandatory'
      : 'Optional'

  const financial =
    /\b(turnover|revenue|financial|solvency|audited|bank|emd|earnest|security deposit|bid security|net worth)\b/i.test(
      t,
    )
  const technical =
    /\b(experience|similar work|technical|engineer|equipment|machinery|staff|manpower|capacity|qualification|certification of personnel)\b/i.test(
      t,
    )
  const compliance =
    /\b(gst|pan|msme|registration|license|licence|iso|statutory|legal|compliance|affidavit|undertaking|blacklist|debar)\b/i.test(
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

function App() {
  const [tenderFile, setTenderFile] = React.useState<File | null>(null)
  const [tenderUploading, setTenderUploading] = React.useState(false)
  const [tenderError, setTenderError] = React.useState<string | null>(null)
  const [criteria, setCriteria] = React.useState<CriteriaItem[]>([])

  const [bidderName, setBidderName] = React.useState('')
  const [bidderFile, setBidderFile] = React.useState<File | null>(null)
  const [bidderEvaluating, setBidderEvaluating] = React.useState(false)
  const [bidderError, setBidderError] = React.useState<string | null>(null)
  const [evaluationRows, setEvaluationRows] = React.useState<EvaluationRow[]>([])

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
    } catch (e) {
      setTenderError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setTenderUploading(false)
    }
  }

  const mandatoryCriteria = React.useMemo(
    () => criteria.filter((c) => c.priority === 'Mandatory').map((c) => c.text),
    [criteria],
  )

  const overallVerdict = React.useMemo(() => {
    if (!evaluationRows.length) return null
    const resultByCriterion = new Map(evaluationRows.map((r) => [r.criterion, r]))

    let hasNeedsReview = false
    for (const c of mandatoryCriteria) {
      const r = resultByCriterion.get(c)
      if (!r) {
        hasNeedsReview = true
        continue
      }
      if (r.verdict === 'not_eligible') return 'not_eligible' as const
      if (r.verdict === 'needs_manual_review') hasNeedsReview = true
    }
    return hasNeedsReview ? ('needs_manual_review' as const) : ('eligible' as const)
  }, [evaluationRows, mandatoryCriteria])

  async function evaluateBidder() {
    if (!bidderFile) return
    if (!criteria.length) return

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
        if (
          !r ||
          typeof r !== 'object' ||
          typeof (r as any).criterion !== 'string' ||
          typeof (r as any).verdict !== 'string' ||
          typeof (r as any).reason !== 'string'
        ) {
          throw new Error('Unexpected response from server.')
        }
        const verdict = (r as any).verdict as EvaluationVerdict
        if (!['eligible', 'not_eligible', 'needs_manual_review'].includes(verdict)) {
          throw new Error('Unexpected verdict from server.')
        }
        return {
          criterion: (r as any).criterion,
          verdict,
          reason: (r as any).reason,
        }
      })

      setEvaluationRows(rows)
    } catch (e) {
      setBidderError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBidderEvaluating(false)
    }
  }

  return (
    <div className="min-h-svh bg-gradient-to-b from-blue-50 via-background to-background">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="container flex h-14 items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <FileText className="h-5 w-5" aria-hidden />
            </div>
            <div className="leading-tight">
              <div className="font-semibold">Tender Evaluation</div>
              <div className="text-xs text-muted-foreground">
                Extract eligibility criteria from tender PDFs
              </div>
            </div>
          </div>

          <Button type="button" variant="outline" asChild>
            <a href={`${API_URL}/docs`} target="_blank" rel="noreferrer">
              API docs
            </a>
          </Button>
        </div>
      </header>

      <main className="container px-4 py-10">
        <div className="mx-auto grid max-w-5xl gap-6">
          <div className="grid gap-2">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Tender evaluation workspace
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Upload a tender PDF to automatically extract eligibility criteria. Each
              extracted criterion is categorized for quick review.
            </p>
          </div>

          <Card className="border-blue-100/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-blue-700" aria-hidden />
                Upload tender PDF
              </CardTitle>
              <CardDescription>
                The PDF is sent to the backend and processed with PyMuPDF + Groq.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <div className="text-sm font-medium">Tender document</div>
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

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {tenderUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-blue-700" aria-hidden />
                        Extracting criteria…
                      </>
                    ) : tenderFile ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-blue-700" aria-hidden />
                        {tenderFile.name}
                      </>
                    ) : (
                      <span>Choose a PDF to begin</span>
                    )}
                  </div>
                </div>

                {tenderError ? (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                    {tenderError}
                  </div>
                ) : null}
              </div>

              <Separator />

              <div className="grid gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium">Eligibility criteria</div>
                    <div className="text-xs text-muted-foreground">
                      {tenderUploading
                        ? 'Waiting for the model response…'
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
                        className="rounded-xl border bg-card p-5 shadow-sm"
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-24 animate-pulse rounded bg-slate-200" />
                          <div className="h-5 w-20 animate-pulse rounded bg-slate-200" />
                        </div>
                        <div className="mt-3 space-y-2">
                          <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
                          <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200" />
                          <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
                        </div>
                      </div>
                    ))
                  ) : criteria.length ? (
                    criteria.map((c) => (
                      <Card key={c.id} className="border-slate-200">
                        <CardHeader className="pb-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              className="bg-blue-600 text-white hover:bg-blue-600/90"
                              variant="default"
                            >
                              {c.category}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className={
                                c.priority === 'Mandatory'
                                  ? 'bg-blue-50 text-blue-800'
                                  : 'bg-slate-100 text-slate-700'
                              }
                            >
                              {c.priority}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-sm leading-relaxed text-slate-900">
                            {c.text}
                          </p>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed bg-background p-8 text-center text-sm text-muted-foreground md:col-span-2">
                      No criteria yet.
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-100/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRoundCheck className="h-5 w-5 text-blue-700" aria-hidden />
                Bidder evaluation
              </CardTitle>
              <CardDescription>
                Upload a bidder PDF and evaluate it against the extracted criteria.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-2 md:col-span-1">
                  <div className="text-sm font-medium">Bidder name</div>
                  <Input
                    type="text"
                    placeholder="e.g. Acme Pvt Ltd"
                    value={bidderName}
                    onChange={(e) => setBidderName(e.target.value)}
                    disabled={bidderEvaluating}
                  />
                  <div className="text-xs text-muted-foreground">
                    Used for display only (not sent to backend).
                  </div>
                </div>

                <div className="grid gap-2 md:col-span-2">
                  <div className="text-sm font-medium">Bidder PDF</div>
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

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {bidderEvaluating ? (
                        <>
                          <Loader2
                            className="h-4 w-4 animate-spin text-blue-700"
                            aria-hidden
                          />
                          Evaluating…
                        </>
                      ) : bidderFile ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-blue-700" aria-hidden />
                          {bidderFile.name}
                        </>
                      ) : (
                        <span>Choose a bidder PDF</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      type="button"
                      onClick={evaluateBidder}
                      disabled={
                        bidderEvaluating || !bidderFile || !criteria.length || !bidderName.trim()
                      }
                      className="bg-blue-600 hover:bg-blue-600/90"
                    >
                      {bidderEvaluating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          Evaluate Bidder
                        </>
                      ) : (
                        'Evaluate Bidder'
                      )}
                    </Button>
                    {!criteria.length ? (
                      <div className="text-xs text-muted-foreground">
                        Upload a tender first to extract criteria.
                      </div>
                    ) : null}
                  </div>

                  {bidderError ? (
                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                      {bidderError}
                    </div>
                  ) : null}
                </div>
              </div>

              <Separator />

              <div className="grid gap-3">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium">Evaluation results</div>
                    <div className="text-xs text-muted-foreground">
                      {evaluationRows.length
                        ? `Bidder: ${bidderName} • ${evaluationRows.length} criteria checked`
                        : 'Run an evaluation to see results.'}
                    </div>
                  </div>
                </div>

                {overallVerdict ? (
                  <div
                    className={[
                      'rounded-lg border px-4 py-3 text-sm font-medium',
                      overallVerdict === 'eligible'
                        ? 'border-green-200 bg-green-50 text-green-900'
                        : overallVerdict === 'not_eligible'
                          ? 'border-red-200 bg-red-50 text-red-900'
                          : 'border-yellow-200 bg-yellow-50 text-yellow-900',
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
                    <span className="text-xs font-normal opacity-80">
                      {' '}
                      (based on mandatory criteria)
                    </span>
                  </div>
                ) : null}

                {evaluationRows.length ? (
                  <div className="overflow-hidden rounded-xl border bg-card">
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                          <tr>
                            <th className="w-[45%] px-4 py-3">Criterion</th>
                            <th className="w-[15%] px-4 py-3">Verdict</th>
                            <th className="w-[40%] px-4 py-3">Reason</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {evaluationRows.map((r, idx) => (
                            <tr key={`${r.criterion}-${idx}`} className="align-top">
                              <td className="px-4 py-3 text-slate-900">{r.criterion}</td>
                              <td className="px-4 py-3">
                                <Badge
                                  className={
                                    r.verdict === 'eligible'
                                      ? 'border-green-200 bg-green-50 text-green-800'
                                      : r.verdict === 'not_eligible'
                                        ? 'border-red-200 bg-red-50 text-red-800'
                                        : 'border-yellow-200 bg-yellow-50 text-yellow-800'
                                  }
                                  variant="outline"
                                >
                                  {r.verdict === 'eligible'
                                    ? 'eligible'
                                    : r.verdict === 'not_eligible'
                                      ? 'not_eligible'
                                      : 'needs_manual_review'}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-slate-700">{r.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed bg-background p-6 text-sm text-muted-foreground">
                    No evaluation yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

export default App
