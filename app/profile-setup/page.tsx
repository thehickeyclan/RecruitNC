import { redirect } from "next/navigation"

import { ProfileSetupForm, EMPTY_PROFILE_SETUP, type ProfileSetupValues } from "@/components/profile-setup-form"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

/**
 * Where every door leads once the wrestler is known and the account exists.
 *
 * Claiming used to end on the profile page with no indication of what to do next, so a family
 * arrived at a page built from results and left it exactly as they found it. This asks for the
 * five things that make a profile and then, once, for everything a coach wants after that.
 */

export const dynamic = "force-dynamic"

export default async function ProfileSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const { id } = await searchParams
  if (!id) redirect("/create-profile")

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/signup?returnTo=${encodeURIComponent(`/profile-setup?id=${id}`)}`)

  const admin = createAdminClient()
  const { data: athlete } = await admin.from("athletes").select("*").eq("id", id).maybeSingle()
  if (!athlete) redirect("/create-profile")

  const row = athlete as Record<string, unknown>
  const str = (...keys: string[]) => {
    for (const k of keys) {
      const v = row[k]
      if (typeof v === "string" && v.trim()) return v.trim()
      if (typeof v === "number") return String(v)
    }
    return ""
  }
  const name = str("name")
  const social = row.socialMedia
  const socialInstagram =
    social && typeof social === "object" && !Array.isArray(social)
      ? String((social as Record<string, unknown>).instagram ?? "").trim()
      : ""
  const initial: ProfileSetupValues = {
    ...EMPTY_PROFILE_SETUP,
    firstName: str("firstName", "firstname") || name.split(" ")[0] || "",
    lastName: str("lastName", "lastname") || name.split(" ").slice(1).join(" "),
    highSchool: str("highschool", "high_school"),
    club: str("wrestlingClub", "wrestlingclub"),
    graduationYear: str("graduationyear", "graduation_year"),
    weightClass: str("weightclass", "weight_class"),
    gpa: str("academic_gpa", "gpa"),
    sat: str("academic_sat"),
    act: str("academic_act"),
    academicInterest: str("academic_interest"),
    /* Handles we already hold live in the `socialMedia` json, not the newer column. */
    instagram: str("instagram_handle") || socialInstagram,
    cell: str("phone", "cell_number"),
    email: str("contactEmail", "contact_email"),
    apClasses: row.takes_ap_classes === true,
    honorsClasses: row.takes_honors_classes === true,
  }

  /* Anything already on file means this is a check rather than a blank page. */
  const mode = initial.highSchool || initial.graduationYear ? "verify" : "create"

  return (
    <div className="min-h-screen bg-[#0A1628] px-4 py-12">
      <ProfileSetupForm athleteId={String(id)} athleteName={name || "Your wrestler"} initial={initial} mode={mode} />
    </div>
  )
}
