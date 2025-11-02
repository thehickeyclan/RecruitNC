import { redirect } from "next/navigation"

export default function AdminLogoManagerRedirect() {
  // Single source of truth: Enhanced Logo Manager
  redirect("/admin/enhanced-logo-manager")
}
