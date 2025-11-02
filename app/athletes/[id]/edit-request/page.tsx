import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import EditRequestForm from "@/components/edit-request-form"

interface EditRequestPageProps {
  params: {
    id: string
  }
}

export default async function EditRequestPage({ params }: EditRequestPageProps) {
  const supabase = createClient()

  // Public access: no auth required to request an edit.
  // Fetch the athlete; if not found, go back to athletes list.
  const { data: athlete, error } = await supabase
    .from("athletes")
    .select("*")
    .eq("id", params.id)
    .single()

  if (error || !athlete) {
    redirect("/athletes")
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <EditRequestForm athlete={athlete} />
    </div>
  )
}

export async function generateMetadata({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: athlete } = await supabase
    .from("athletes")
    .select("name, first_name, last_name")
    .eq("id", params.id)
    .single()

  const athleteName =
    athlete?.name || `${athlete?.first_name || ""} ${athlete?.last_name || ""}`.trim()

  return {
    title: `Request Edit - ${athleteName} | NC United Wrestling`,
    description: `Request changes to ${athleteName}'s wrestling profile`,
  }
}
