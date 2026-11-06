import { NextResponse, type NextRequest } from "next/server"

import { mostRecentGraduatedClassYear, seniorClassYear } from "@/lib/class-years"
import { familyAthleteIds } from "@/lib/coach-messages"
import { resolveRankingViewer } from "@/lib/ranking-access"
import { loadLastCompeted } from "@/lib/prospect-last-competed"
import { hasPortalAccess } from "@/lib/ranking-visibility"
import { cleanProfile, EMPTY_PROFILE } from "@/lib/recruiting/family-fit"
import { gradeForClass } from "@/lib/recruiting/learn/timeline"
import { cleanAnswer, prefillFor, withSiblingPrefill } from "@/lib/recruiting/priorities/answers"
import { questionsFor, sharingLine, storableKeys, type SharingClass } from "@/lib/recruiting/priorities/questions"
import { viewFor } from "@/lib/recruiting/priorities/sharing"
import { completeSet, loadFamilySets, respondentFor, saveAnswer, setSharing, TABLE_MISSING } from "@/lib/recruiting/priorities/store"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * "What Matters to Your Family": the signed-in respondent's own answers, the other respondent's
 * Shared answers, and prefill. Always the login itself, never a "view as" (a business or admin
 * preview has no respondent here), and never a coach: respondentFor() admits only the wrestler's
 * linked parents and the wrestler's own login.
 */
async function caller(athleteIdRaw: unknown) {
  const admin = createAdminClient()
  const { viewer, userId } = await resolveRankingViewer({ supabase: await createClient(), admin })
  if (!userId || !hasPortalAccess(viewer)) return null
  // The same wrestlers, in the same order, as the Command Center home: still in school, oldest first.
  const ids = await familyAthleteIds(admin, userId)
  const { data: rows } = ids.length ? await admin.from("athletes").select('id, "firstName", name, graduationyear').in("id", ids).order("graduationyear", { ascending: true }) : { data: [] }
  const graduated = mostRecentGraduatedClassYear()
  const wrestlers = (rows ?? [])
    .filter((a) => !a.graduationyear || Number(a.graduationyear) > graduated)
    .map((a) => ({ id: String(a.id), firstName: String(a.firstName ?? "").trim() || String(a.name ?? "").split(" ")[0] || "Your wrestler" }))
  const athleteId = typeof athleteIdRaw === "string" && athleteIdRaw ? athleteIdRaw : wrestlers[0]?.id
  if (!athleteId || !wrestlers.some((w) => w.id === athleteId)) return null
  const respondent = await respondentFor(admin, userId, athleteId)
  return respondent ? { admin, userId, athleteId, respondent, wrestlers } : null
}

const missing = (e: unknown) => (e as { code?: string } | null)?.code === TABLE_MISSING

export async function GET(req: NextRequest) {
  const c = await caller(req.nextUrl.searchParams.get("athleteId"))
  if (!c) return NextResponse.json({ error: "Not available" }, { status: 403 })
  try {
    const [sets, { data: athlete }, { data: account }] = await Promise.all([
      loadFamilySets(c.admin, c.athleteId),
      c.admin.from("athletes").select('"firstName", name, gender, graduationyear, academic_interest').eq("id", c.athleteId).maybeSingle(),
      c.admin.auth.admin.getUserById(c.userId),
    ])
    const own = c.respondent === "parent" ? sets.parent : sets.athlete
    const view = viewFor(c.respondent, sets)
    const answers = Object.fromEntries(view.own.map((a) => [a.key, a.value]))
    // A6 shows the weight last competed, never the profile's listed one.
    const last = await loadLastCompeted(c.admin, [c.athleteId], new Map([[c.athleteId, Number(athlete?.graduationyear) || null]])).then((m) => m.get(c.athleteId) ?? null).catch(() => null)
    const weight = Number(String(last?.weight ?? "").replace(/[^0-9]/g, "")) || null
    const firstName = String(athlete?.firstName ?? "").trim() || String(athlete?.name ?? "").split(" ")[0] || null
    const grade = gradeForClass(Number(athlete?.graduationyear) || null, seniorClassYear())
    // A parent of two answers money, ZIP and benefits once: the other child's set prefills them.
    let sibling: { firstName: string; answers: Array<{ key: string; value: unknown; notSure?: boolean }> } | null = null
    if (c.respondent === "parent") {
      for (const w of c.wrestlers.filter((x) => x.id !== c.athleteId)) {
        if ((await respondentFor(c.admin, c.userId, w.id)) !== "parent") continue
        const theirs = (await loadFamilySets(c.admin, w.id)).parent
        if (theirs?.answers.length) {
          sibling = { firstName: w.firstName, answers: theirs.answers }
          break
        }
      }
    }
    const fit = account?.user?.user_metadata?.family_fit ? cleanProfile(account.user.user_metadata.family_fit) : EMPTY_PROFILE
    return NextResponse.json({
      available: true,
      respondent: c.respondent,
      athleteId: c.athleteId,
      wrestlers: c.wrestlers,
      // "his" or "her" from the profile; nothing when it isn't set (copy then uses the name).
      possessive: /^f/i.test(String(athlete?.gender ?? "")) ? "her" : /^m/i.test(String(athlete?.gender ?? "")) ? "his" : null,
      firstName,
      weight,
      questions: questionsFor(c.respondent, { grade, answers }).map((q) => ({ ...q, sharingLine: sharingLine(q.sharing, c.respondent, firstName) })),
      own: { version: own?.version ?? 0, completedAt: own?.completedAt ?? null, answers: view.own },
      // Whether the other side has finished is not an answer; what they answered privately never shows.
      other: { completed: Boolean((c.respondent === "parent" ? sets.athlete : sets.parent)?.completedAt), answers: view.other },
      prefill: withSiblingPrefill(prefillFor(c.respondent, fit, { academicInterest: (athlete?.academic_interest as string | null) ?? null }), sibling),
    })
  } catch (e) {
    if (missing(e)) return NextResponse.json({ available: false })
    console.error("[recruiting-priorities] read failed", e)
    return NextResponse.json({ error: "Could not load" }, { status: 500 })
  }
}

/** Save one answer: { athleteId?, key, value, marker?, notSure? }. */
export async function PUT(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const c = await caller(body.athleteId)
  if (!c) return NextResponse.json({ error: "Not available" }, { status: 403 })
  const answer = cleanAnswer(c.respondent, body)
  if (!answer) return NextResponse.json({ error: "Not an answer to this question" }, { status: 400 })
  try {
    await saveAnswer(c.admin, { athleteId: c.athleteId, respondent: c.respondent, userId: c.userId, answer })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (missing(e)) return NextResponse.json({ available: false }, { status: 503 })
    console.error("[recruiting-priorities] save failed", e)
    return NextResponse.json({ error: "Could not save" }, { status: 500 })
  }
}

const CLASSES: SharingClass[] = ["shared", "constraint", "private"]

/** Change who sees one of your answers: { athleteId?, key, sharing }. */
export async function PATCH(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const c = await caller(body.athleteId)
  if (!c) return NextResponse.json({ error: "Not available" }, { status: 403 })
  const key = String(body.key ?? "")
  const sharing = body.sharing as SharingClass
  if (!storableKeys(c.respondent).includes(key) || !CLASSES.includes(sharing)) return NextResponse.json({ error: "Bad request" }, { status: 400 })
  try {
    const ok = await setSharing(c.admin, { athleteId: c.athleteId, respondent: c.respondent, key, sharing })
    return NextResponse.json({ ok })
  } catch (e) {
    console.error("[recruiting-priorities] sharing failed", e)
    return NextResponse.json({ error: "Could not save" }, { status: 500 })
  }
}

/** Mark your set finished: { athleteId? }. Later changes start a new version. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const c = await caller(body.athleteId)
  if (!c) return NextResponse.json({ error: "Not available" }, { status: 403 })
  try {
    return NextResponse.json({ ok: await completeSet(c.admin, { athleteId: c.athleteId, respondent: c.respondent, userId: c.userId }) })
  } catch (e) {
    console.error("[recruiting-priorities] complete failed", e)
    return NextResponse.json({ error: "Could not save" }, { status: 500 })
  }
}
