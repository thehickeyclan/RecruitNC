"use client"

import { usePathname } from "next/navigation"
import { RecoveryRedirect } from "@/components/recovery-redirect"
import { IframeResizer } from "@/components/iframe-resizer"
import { StorageAccessPrompt } from "@/components/storage-access-prompt"
import { IframeSignInBanner } from "@/components/iframe-signin-banner"
import { CoachApprovalNotification } from "@/components/coach-approval-notification"

/**
 * These components run effects (redirects, resize, etc.) that can cancel in-flight
 * document requests when navigating to /store, /cart, /checkout. Don't mount them
 * on those routes so the store/cart/checkout document load is never aborted.
 */
export function LayoutOptionalClients() {
  const pathname = usePathname() ?? ""
  const isStoreCartCheckout =
    pathname === "/store" ||
    pathname.startsWith("/store/") ||
    pathname === "/cart" ||
    pathname.startsWith("/checkout/")

  if (isStoreCartCheckout) {
    return null
  }

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
