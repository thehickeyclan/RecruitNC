import { redirect } from "next/navigation"

const COLLEGE_TO_SCHOOL_ID: Record<string, string> = {
  "belmont-abbey": "belmont-abbey",
  "greensboro-college": "greensboro-college",
  "washington-and-lee": "washington-and-lee",
}

interface CollegePageProps {
  params: {
    college: string
  }
}

export default function CollegeMyRecruitsRedirect({ params }: CollegePageProps) {
  const slug = params.college?.toLowerCase()
  const schoolId = COLLEGE_TO_SCHOOL_ID[slug]

  if (!schoolId) {
    redirect("/404")
  }

  redirect(`/schools/${schoolId}/portal`)
}

