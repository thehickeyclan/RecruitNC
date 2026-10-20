"use client"

import { useBrandHost } from "@/components/recruiting/brand-host"

/**
 * The contact address for the address the visitor is on: info@recruitwrestlers.com on
 * recruitwrestlers.com (Matt set it up on 20 Oct 2026, Google Workspace under Guild Ventures),
 * NC United's everywhere else. Decided in the browser, so NC United's HTML is unchanged.
 */
export const NCU_CONTACT_EMAIL = "info@ncwrestlingunited.com"
export const RECRUITWRESTLERS_CONTACT_EMAIL = "info@recruitwrestlers.com"

export function useContactEmail(): string {
  return useBrandHost() === "national" ? RECRUITWRESTLERS_CONTACT_EMAIL : NCU_CONTACT_EMAIL
}

export function ContactEmail({ link = false, className }: { link?: boolean; className?: string }) {
  const email = useContactEmail()
  return link ? (
    <a className={className} href={`mailto:${email}`}>
      {email}
    </a>
  ) : (
    <>{email}</>
  )
}

/** "Get Help →" as a mail link to the right address. */
export function ContactHelpLink({ className }: { className?: string }) {
  return (
    <a className={className} href={`mailto:${useContactEmail()}`}>
      Get Help →
    </a>
  )
}
