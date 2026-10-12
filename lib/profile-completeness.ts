/**
 * Profile completeness: the four things a college coach looks for, in five equal parts - the photo
 * and the school each count, so a profile with both and a phone number reads 60% (Matt's mock,
 * 10 October 2026). One rule for the wrestler's own page (components/athlete-detail.tsx) and the
 * family's recruiting page (app/my-recruiting).
 */
export type CompletenessParts = { photo: boolean; school: boolean; academics: boolean; highlight: boolean; contact: boolean }

export type Completeness = {
  percent: number
  /** `edit` is the profile editor each open item opens (?edit= on the profile). */
  items: Array<{ label: string; todo: string; done: boolean; edit: string }>
}

export function profileCompleteness(p: CompletenessParts): Completeness {
  const parts = [p.photo, p.school, p.academics, p.highlight, p.contact]
  return {
    percent: Math.round((parts.filter(Boolean).length / parts.length) * 100),
    items: [
      { label: "Photo and wrestling information", todo: "Add a photo and your school", done: p.photo && p.school, edit: p.photo ? "school-club" : "photo" },
      { label: "Academic information", todo: "Add academic information", done: p.academics, edit: "academics" },
      { label: "Highlight reel", todo: "Add highlight reel", done: p.highlight, edit: "highlight-video" },
      { label: "Contact information", todo: "Verify contact information", done: p.contact, edit: "contact" },
    ],
  }
}

/** The editors a link may open; anything else in ?edit= is ignored. */
export const COMPLETENESS_EDITORS = ["photo", "school-club", "academics", "highlight-video", "contact"] as const

const filled = (v: unknown) => v != null && String(v).trim() !== "" && String(v).trim() !== "Not specified"

/** From an athletes row, for pages that do not have the profile's own derived values. */
export function completenessFromRow(row: Record<string, unknown>): Completeness {
  return profileCompleteness({
    photo: filled(row.photourl),
    school: filled(row.highschool),
    academics: filled(row.academic_gpa) || filled(row.academic_sat) || filled(row.academic_act),
    highlight: filled(row.highlight_video_url),
    contact: filled(row.phone) || filled(row.contactEmail),
  })
}
