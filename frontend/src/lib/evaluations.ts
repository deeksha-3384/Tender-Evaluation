export type CriteriaCategory = 'Financial' | 'Technical' | 'Compliance'
export type CriteriaPriority = 'Mandatory' | 'Optional'

export type CriteriaItem = {
  id: string
  text: string
  category: CriteriaCategory
  priority: CriteriaPriority
}

export type EvaluationVerdict = 'eligible' | 'not_eligible' | 'needs_manual_review'

export type EvaluationRow = {
  criterion: string
  verdict: EvaluationVerdict
  reason: string
}

export type EvaluationRecord = {
  id: string
  createdAt: number
  tenderKey: string
  tenderCriteria: string[]
  bidderName: string
  overallVerdict: EvaluationVerdict
  evaluationRows: EvaluationRow[]
  counts: {
    eligible: number
    not_eligible: number
    needs_manual_review: number
  }
}

const STORAGE_KEY = 'tenderai_evaluations_v1'

export function loadEvaluationRecords(): EvaluationRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed as EvaluationRecord[]
  } catch {
    return []
  }
}

export function saveEvaluationRecord(record: EvaluationRecord) {
  const existing = loadEvaluationRecords()
  existing.unshift(record)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(0, 50)))
}

export function computeCounts(rows: EvaluationRow[]) {
  let eligible = 0
  let not_eligible = 0
  let needs_manual_review = 0

  for (const r of rows) {
    if (r.verdict === 'eligible') eligible += 1
    else if (r.verdict === 'not_eligible') not_eligible += 1
    else needs_manual_review += 1
  }

  return { eligible, not_eligible, needs_manual_review }
}

export function computeOverallVerdict(
  rows: EvaluationRow[],
  mandatoryCriterionTexts: string[],
): EvaluationVerdict {
  const resultByCriterion = new Map(rows.map((r) => [r.criterion, r]))

  let hasNeedsReview = false
  for (const mandatoryText of mandatoryCriterionTexts) {
    const r = resultByCriterion.get(mandatoryText)
    if (!r) {
      hasNeedsReview = true
      continue
    }
    if (r.verdict === 'not_eligible') return 'not_eligible'
    if (r.verdict === 'needs_manual_review') hasNeedsReview = true
  }

  return hasNeedsReview ? 'needs_manual_review' : 'eligible'
}

// Cheap stable hash for creating a "tender key" from extracted criteria.
export function computeTenderKey(criteria: string[]) {
  const s = criteria.join('\n')
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0
  }
  return hash.toString(16)
}

