"use client"

import { usePathname } from "next/navigation"
import { RecoveryRedirect } from "@/components/recovery-redirect"
import { IframeResizer } from "@/components/iframe-resizer"
import { StorageAccessPrompt } from "@/components/storage-access-prompt"
import { IframeSignInBanner } from "@/components/iframe-signin-banner"
import { CoachApprovalNotification } from "@/components/coach-approval-notification"

/** Mounting these was canceling nav to /store. Disabled until we mount them without aborting. */
const MOUNT_OPTIONAL_CLIENTS = false

export function LayoutOptionalClients() {
  if (!MOUNT_OPTIONAL_CLIENTS) return null

  const pathname = usePathname() ?? ""
  const isStoreCartCheckout =
    pathname === "/store" ||
    pathname.startsWith("/store/") ||
    pathname === "/cart" ||
    pathname.startsWith("/checkout/")

  if (isStoreCartCheckout) return null

  return (
    <>
      <RecoveryRedirect />
      <IframeResizer />
      <StorageAccessPrompt />
      <IframeSignInBanner />
      <CoachApprovalNotification />
    </>
  )
}
