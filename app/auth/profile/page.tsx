import { headers } from "next/headers"
import ProfileClient from "./profile-client"

export const dynamic = "force-dynamic"

export default function ProfilePage() {
  // Force dynamic rendering by reading headers
  headers()

  return <ProfileClient />
}
