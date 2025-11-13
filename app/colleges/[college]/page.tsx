import { notFound, redirect } from "next/navigation"

import { resolveSchoolFromSlug } from "@/lib/resolve-school-from-slug"

interface CollegePageProps {
  params: {
    college: string
  }
}

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function CollegePortalRedirect({ params }: CollegePageProps) {
  await redirectToPortal(params.college)
}

async function redirectToPortal(collegeParam: string) {
  const slug = collegeParam?.toLowerCase()

  if (!slug) {
    notFound()
  }

  const resolved = await resolveSchoolFromSlug(slug)

  if (!resolved) {
    console.error(`[college portal redirect] Unable to resolve slug "${slug}" to a school`)
    notFound()
  }

  redirect(`/schools/${resolved.id}/portal`)
}
