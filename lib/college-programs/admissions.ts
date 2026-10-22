import "server-only"

import data from "@/lib/college-programs/admissions-2026-27.json"
import type { AdmissionsSummary, PlanDeadline } from "@/lib/college-programs/admissions-format"
import type { AppPlan } from "@/lib/college-programs/list"

/**
 * Each college's admissions facts for the 2026-27 cycle (Fall 2027 entry), from Muse's pull of the
 * colleges' own admissions pages (scripts/import-college-admissions.py). Every value carries its
 * source. Server only: the file is 400 KB with its sources; pages hand the browser a summary.
 */

type PlanEntry = { offered: boolean; raw?: string; dates?: Array<{ date: string; label?: string }>; source?: string | null }
export type CollegeAdmissions = {
  plans: Partial<Record<"ed1" | "ed2" | "ea" | "rea" | "rd", PlanEntry>>
  rolling: boolean | string | null
  applyUrl: string | null
  platform: string | null
  fee: number | null
  feeWaiver: boolean | null
  testPolicy: string | null
  aidForm: string | null
  aidDeadline: string | null
  sources: Record<string, string>
}

const COLLEGES = data.colleges as unknown as Record<string, CollegeAdmissions>

export function collegeAdmissions(schoolId: string): CollegeAdmissions | null {
  return COLLEGES[schoolId] ?? null
}

/** What a list row or a plan menu needs: each offered plan with its date(s), and the basics. */
export function admissionsSummary(schoolId: string): AdmissionsSummary | null {
  const a = COLLEGES[schoolId]
  if (!a) return null
  const deadlines: PlanDeadline[] = []
  for (const plan of ["ed1", "ed2", "ea", "rea", "rd"] as const) {
    const p = a.plans[plan]
    if (!p?.offered) continue
    if (p.dates?.length) for (const d of p.dates) deadlines.push({ plan, date: d.date, label: d.label ?? null, raw: null })
    else deadlines.push({ plan, date: null, label: null, raw: p.raw ?? null })
  }
  const notOffered = (["ed1", "ed2", "ea", "rea", "rd"] as const).filter((p) => a.plans[p] && !a.plans[p]!.offered) as AppPlan[]
  return {
    deadlines,
    notOffered,
    rolling: a.rolling === true || typeof a.rolling === "string",
    applyUrl: a.applyUrl,
    testPolicy: a.testPolicy,
    fee: a.fee,
    feeWaiver: a.feeWaiver,
    aidForm: a.aidForm,
  }
}
