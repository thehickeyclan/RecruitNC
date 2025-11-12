import { redirect } from "next/navigation"

interface CollegePageProps {
  params: {
    college: string
  }
}

export default function CollegeMyRecruitsRedirect({ params }: CollegePageProps) {
  const slug = params.college?.toLowerCase()
  const schoolId = slug

  if (!schoolId) {
    redirect("/404")
  }

  redirect(`/schools/${schoolId}/portal`)
}

