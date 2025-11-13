import { redirect } from "next/navigation"

interface CollegePageProps {
  params: {
    college: string
  }
}

export default function CollegePortalRedirect({ params }: CollegePageProps) {
  const slug = params.college?.toLowerCase()

  if (!slug) {
    redirect("/404")
  }

  redirect(`/schools/${slug}/portal`)
}

