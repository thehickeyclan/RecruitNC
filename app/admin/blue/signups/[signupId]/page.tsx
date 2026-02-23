import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, User } from "lucide-react"

async function getSignup(signupId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return null

  const admin = createAdminClient()
  const { data: row, error } = await admin
    .from("blue_signups")
    .select("id, parent_first_name, parent_last_name, parent_email, parent_phone, athlete_first_name, athlete_last_name, athlete_graduation_year, athlete_high_school, athlete_wrestling_club, athlete_weight_class, tshirt_size, status, created_at")
    .eq("id", signupId)
    .single()

  if (error || !row) return null
  return row
}

export default async function AdminBlueSignupDetailPage({
  params,
}: {
  params: Promise<{ signupId: string }>
}) {
  const { signupId } = await params
  if (!signupId) notFound()

  const data = await getSignup(signupId)
  if (!data) notFound()

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
            <h1 className="text-2xl font-bold text-[#13294B]">Blue registration</h1>
            <p className="text-sm text-gray-600">What they filled out when they signed up on this platform</p>
          </div>
        </div>

        <Card className="border-t-4 border-t-[#03154C] mb-6">
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
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">T-shirt size</p>
              <p className="font-medium">{tshirt}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Signed up</p>
              <p className="font-medium">{createdAt ? new Date(createdAt).toLocaleString() : "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</p>
              <p className="font-medium">{status === "paid" ? "Paid" : status}</p>
            </div>
          </CardContent>
        </Card>

        <Button variant="outline" asChild>
          <Link href="/admin/blue/subscriptions">Back to cockpit</Link>
        </Button>
      </div>
    </div>
  )
}
