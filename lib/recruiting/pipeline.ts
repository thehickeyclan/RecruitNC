/**
 * The recruiting funnel a coach moves a wrestler through, in order. Stored per coach on
 * college_coach_stars.pipeline_stage; the same list the program portal draws its funnel from
 * (app/schools/[schoolId]/portal/page.tsx).
 */
export const PIPELINE_STAGES = ["Prospect", "Contacted", "Recruiting", "Visited", "Offered", "Committed", "Signed", "Lost"] as const

export type PipelineStage = (typeof PIPELINE_STAGES)[number]

/** Stored values have drifted over the years ("prospect", "Reached Out", "College Athlete"); read them as today's stages. */
export function normalizeStage(raw: string | null | undefined): PipelineStage {
  const s = String(raw ?? "").trim().toLowerCase()
  if (s === "college athlete" || s === "current college athlete") return "Signed"
  if (s === "evaluating" || s === "reached out") return "Contacted"
  return PIPELINE_STAGES.find((stage) => stage.toLowerCase() === s) ?? "Prospect"
}
