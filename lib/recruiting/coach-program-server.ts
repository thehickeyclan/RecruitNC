import "server-only"

import { cookies } from "next/headers"
import type { SupabaseClient } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/server"
import {
  COACH_PROGRAM_KEY,
  VIEW_GENDER_COOKIE,
  coachProgramOf,
  viewGenderFor,
  type CoachProgram,
  type ViewGender,
} from "@/lib/recruiting/coach-program"

/**
 * The signed-in coach's program and the list they are looking at, for a server page.
 * The program is read from the verified user, not the cookie-held session, so a change made a
 * minute ago is seen. Signed out, or not a coach: men's, as before.
 */
export async function resolveViewGender(): Promise<{ program: CoachProgram | null; gender: ViewGender; userId: string | null }> {
  const jar = await cookies()
  const chosen = jar.get(VIEW_GENDER_COOKIE)?.value
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    const program = coachProgramOf(data.user)
    return { program, gender: viewGenderFor(program, chosen), userId: data.user?.id ?? null }
  } catch {
    return { program: null, gender: viewGenderFor(null, chosen), userId: null }
  }
}

/** Write a coach's program. Merges, so the other app_metadata flags are kept. */
export async function setCoachProgram(admin: SupabaseClient, userId: string, program: CoachProgram): Promise<string | null> {
  const { data, error: readError } = await admin.auth.admin.getUserById(userId)
  if (readError || !data?.user) return readError?.message ?? "No such user"
  const { error } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { ...(data.user.app_metadata ?? {}), [COACH_PROGRAM_KEY]: program },
  })
  return error?.message ?? null
}
