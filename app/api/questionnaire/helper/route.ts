import { NextResponse } from "next/server"

import { mostRecentGraduatedClassYear } from "@/lib/class-years"
import { familyAthleteIds } from "@/lib/coach-messages"
import { ANNOUNCED_PROGRAMS } from "@/lib/college-programs/announced"
import { questionnaireDone } from "@/lib/college-programs/list"
import data from "@/lib/college-programs/programs-2026-27.json"
import { questionnairesForSchool } from "@/lib/college-programs/questionnaires"
import { loadAnswers } from "@/lib/questionnaire/answers"
import { resolveRankingViewer } from "@/lib/ranking-access"
import { hasPortalAccess } from "@/lib/ranking-visibility"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

const NAMES = new Map([...(data.schools as Array<{ id: string; name: string }>), ...ANNOUNCED_PROGRAMS].map((s) => [s.id, s.name.replace(/\s*\([^)]*\)\s*/g, " ").trim()]))

/**
 * What the autofill helper (extension/) needs, for the signed-in family only: each wrestler still
 * in school with his or her answers, and the colleges on the list with their form links, so the
 * helper knows which college a form page is and can stamp it submitted. Read from the family's
 * own browser with their own session; nothing here is ever sent to a college by us.
 */
export async function GET() {
  const admin = createAdminClient()
  const { viewer, userId } = await resolveRankingViewer({ supabase: await createClient(), admin })
  if (!userId) return NextResponse.json({ signedIn: false }, { status: 401 })
  if (!hasPortalAccess(viewer)) return NextResponse.json({ signedIn: true, access: false }, { status: 403 })

  const ids = await familyAthleteIds(admin, userId)
  const graduated = mostRecentGraduatedClassYear()
  const { data: rows } = ids.length
    ? await admin.from("athletes").select('id, name, "firstName", gender, graduationyear').in("id", ids).order("graduationyear", { ascending: true })
    : { data: [] }
  const inSchool = (rows ?? []).filter((a) => !a.graduationyear || Number(a.graduationyear) > graduated)
  const wrestlers = await Promise.all(
    inSchool.map(async (a) => ({
      id: String(a.id),
      firstName: String(a.firstName ?? "").trim() || String(a.name ?? "").trim().split(/\s+/)[0],
      side: /^f/i.test(String(a.gender ?? "")) ? "womens" : "mens",
      answers: (await loadAnswers(admin, String(a.id))).values,
    })),
  )

  const { data: list } = await admin.from("college_list_items").select("school_id, status, questionnaire_done_at").eq("user_id", userId)
  const forms = (list ?? []).flatMap((r) => {
    const links = questionnairesForSchool(String(r.school_id))
    const urls = [...new Set(links.flatMap((q) => [q.mens, q.womens]).filter((u): u is string => Boolean(u)))]
    if (!urls.length) return []
    return [
      {
        schoolId: String(r.school_id),
        name: NAMES.get(String(r.school_id)) ?? String(r.school_id),
        urls,
        done: questionnaireDone({ status: String(r.status), questionnaireDoneAt: (r.questionnaire_done_at as string | null) ?? null }),
      },
    ]
  })

  return NextResponse.json({ signedIn: true, access: true, wrestlers, forms }, { headers: { "Cache-Control": "no-store" } })
}
