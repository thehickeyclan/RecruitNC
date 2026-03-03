import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, User, AlertCircle } from "lucide-react"

type SignupRow = {
  id: string
  invite_id: string | null
  parent_email: string | null
  parent_first_name: string | null
  parent_last_name: string | null
  parent_phone: string | null
  parent_relationship: string | null
  athlete_first_name: string | null
  athlete_last_name: string | null
  athlete_graduation_year: number | null
  athlete_high_school: string | null
  athlete_wrestling_club: string | null
  athlete_weight_class: string | null
  athlete_cell_phone: string | null
  athlete_email: string | null
  athlete_gpa: string | null
  interest_wrestling_college: boolean | null
  highest_achievement: string | null
  tshirt_size: string | null
  waiver_signed_at: string | null
  promo_code_used: string | null
  status: string | null
  stripe_session_id: string | null
  stripe_customer_id: string | null
  created_at: string | null
  updated_at: string | null
}

async function getSignup(signupId: string): Promise<
  | { ok: true; data: SignupRow }
  | { ok: false; reason: string; detail?: string }
> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError) {
    return { ok: false, reason: "Auth error", detail: authError.message }
  }
  if (!user) {
    return { ok: false, reason: "Not signed in", detail: "No user session. Sign in and try again." }
  }
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("user_id", user.id)
    .single()
  if (profileError) {
    return { ok: false, reason: "Profile lookup failed", detail: profileError.message }
  }
  if (!profile?.is_admin) {
    return { ok: false, reason: "Not admin", detail: "Only admins can view Blue signup details." }
  }

  const admin = createAdminClient()
  const { data: row, error } = await admin
    .from("blue_signups")
    .select("id, invite_id, parent_email, parent_first_name, parent_last_name, parent_phone, parent_relationship, athlete_first_name, athlete_last_name, athlete_graduation_year, athlete_high_school, athlete_wrestling_club, athlete_weight_class, athlete_cell_phone, athlete_email, athlete_gpa, interest_wrestling_college, highest_achievement, tshirt_size, waiver_signed_at, promo_code_used, status, stripe_session_id, stripe_customer_id, created_at, updated_at")
    .eq("id", signupId)
    .single()

  if (error) {
    return { ok: false, reason: "DB error", detail: `${error.code ?? "unknown"}: ${error.message}` }
  }
  if (!row) {
    return { ok: false, reason: "Not found", detail: `No blue_signups row for id: ${signupId}` }
  }
  return { ok: true, data: row as SignupRow }
}

export default async function AdminBlueSignupDetailPage({
  params,
}: {
  params: Promise<{ signupId: string }>
}) {
  const { signupId } = await params
  if (!signupId) notFound()

  const result = await getSignup(signupId)

  if (!result.ok) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6 flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
              <Link href="/admin/blue/subscriptions">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <Card className="border-amber-500 border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-800">
                <AlertCircle className="h-5 w-5" />
                Could not load signup
              </CardTitle>
              <CardDescription>Use this to diagnose why the page failed instead of showing blank.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-medium text-gray-900">{result.reason}</p>
              {result.detail && <p className="text-sm text-gray-600 font-mono bg-gray-100 p-3 rounded">{result.detail}</p>}
              <p className="text-xs text-gray-500 mt-4">Signup ID from URL: {signupId}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const data = result.data

  const parentFirstName = (data.parent_first_name ?? "").toString().trim() || "—"
  const parentLastName = (data.parent_last_name ?? "").toString().trim() || "—"
  const parentEmail = (data.parent_email ?? "").toString().trim() || "—"
  const parentPhone = (data.parent_phone ?? "").toString().trim() || "—"
  const athleteFirst = (data.athlete_first_name ?? "").toString().trim() || "—"
  const athleteLast = (data.athlete_last_name ?? "").toString().trim() || "—"
  const highSchool = (data.athlete_high_school ?? "").toString().trim() || "—"
  const club = (data.athlete_wrestling_club ?? "").toString().trim() || "—"
  const weight = (data.athlete_weight_class ?? "").toString().trim() || "—"
  const tshirt = (data.tshirt_size ?? "").toString().trim() || "—"
  const status = (data.status ?? "").toString()
  const createdAt = (data.created_at ?? "").toString()
  const gradYear = data.athlete_graduation_year ?? "—"

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/admin/blue/subscriptions">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#003366]">Blue registration</h1>
            <p className="text-sm text-gray-600">What they filled out when they signed up on this platform</p>
          </div>
        </div>

        <Card className="border-t-4 border-t-[#003366] mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Parent / guardian
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">First name</p>
                <p className="font-medium">{parentFirstName}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Last name</p>
                <p className="font-medium">{parentLastName}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</p>
              <p className="font-medium">{parentEmail}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone (cell)</p>
              <p className="font-medium">{parentPhone}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Relationship to athlete</p>
              <p className="font-medium">{parentRelationship}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-[#D3B574] mb-6">
          <CardHeader>
            <CardTitle>Athlete</CardTitle>
            <CardDescription>High school, club, weight — from the form.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">First name</p>
                <p className="font-medium">{athleteFirst}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Last name</p>
                <p className="font-medium">{athleteLast}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">High school</p>
              <p className="font-medium">{highSchool}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Wrestling club</p>
              <p className="font-medium">{club}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Graduation year</p>
                <p className="font-medium">{String(gradYear)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Weight class</p>
                <p className="font-medium">{weight}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Athlete cell phone</p>
              <p className="font-medium">{athleteCell}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Athlete email</p>
              <p className="font-medium">{athleteEmail}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Athlete GPA</p>
              <p className="font-medium">{athleteGpa}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Interest in wrestling in college</p>
              <p className="font-medium">{interestCollege}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Highest achievement</p>
              <p className="font-medium">{highestAchievement}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">T-shirt size</p>
              <p className="font-medium">{tshirt}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Promo code used</p>
              <p className="font-medium">{promoCode}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Waiver signed at</p>
              <p className="font-medium">{waiverSignedAt}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</p>
              <p className="font-medium">{status === "paid" ? "Paid" : status}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Created</p>
              <p className="font-medium">{createdAt}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Updated</p>
              <p className="font-medium">{updatedAt}</p>
            </div>
            {data.stripe_session_id && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Stripe session ID</p>
                <p className="font-medium font-mono text-xs break-all">{data.stripe_session_id}</p>
              </div>
            )}
            {data.stripe_customer_id && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Stripe customer ID</p>
                <p className="font-medium font-mono text-xs break-all">{data.stripe_customer_id}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Button variant="outline" asChild>
          <Link href="/admin/blue/subscriptions">Back to cockpit</Link>
        </Button>
      </div>
    </div>
  )
}
