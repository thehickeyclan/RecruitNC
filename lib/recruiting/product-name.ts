/**
 * The recruiting product's name for text this deployment writes: AI answers, generated reports and
 * emails. RecruitWrestlers on its own Vercel project, which serves recruitwrestlers.com only;
 * RecruitNC on NC United's (Matt's NC United sweep, 27 Oct 2026). Page components that know the
 * address use BrandName / useOnRecruitWrestlers instead.
 */
export function onRecruitWrestlersProject(): boolean {
  return /recruitwrestlers/i.test(process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "")
}

export function productName(): "RecruitWrestlers" | "RecruitNC" {
  return onRecruitWrestlersProject() ? "RecruitWrestlers" : "RecruitNC"
}
