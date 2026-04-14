import { redirect } from "next/navigation"

interface EditProfilePageProps {
  params: Promise<{ id: string }>
}

export default async function EditProfileRedirectPage({
  params,
}: EditProfilePageProps) {
  const { id } = await params
  redirect(`/athletes/${encodeURIComponent(id)}/edit`)
}
