import type { EmailLogoVariant } from "@/lib/admin-blast-email-html"

export type AdminBlastSenderId = "nc-united" | "recruitnc" | "wrestling-guild"

export type AdminBlastSender = {
  id: AdminBlastSenderId
  label: string
  from: string
  fromEmail: string
  logoVariant: EmailLogoVariant
  footer: string
}

export const ADMIN_BLAST_SENDERS: Record<AdminBlastSenderId, AdminBlastSender> = {
  "nc-united": {
    id: "nc-united",
    label: "NC United",
    from: "NC Wrestling United <info@ncwrestlingunited.com>",
    fromEmail: "info@ncwrestlingunited.com",
    logoVariant: "nc-united",
    footer: "From NC Wrestling United / RecruitNC",
  },
  recruitnc: {
    id: "recruitnc",
    label: "RecruitNC",
    from: "RecruitNC <info@ncwrestlingunited.com>",
    fromEmail: "info@ncwrestlingunited.com",
    logoVariant: "recruitnc",
    footer: "From NC Wrestling United / RecruitNC",
  },
  "wrestling-guild": {
    id: "wrestling-guild",
    label: "Wrestling Guild",
    from: "Wrestling Guild <info@wrestlingguild.com>",
    fromEmail: "info@wrestlingguild.com",
    logoVariant: "wrestling-guild",
    footer: "From Wrestling Guild · wrestlingguild.com",
  },
}

export const ADMIN_BLAST_SENDER_LIST = Object.values(ADMIN_BLAST_SENDERS)

export function parseAdminBlastSenderId(raw: string | undefined | null): AdminBlastSenderId {
  if (raw === "recruitnc" || raw === "wrestling-guild" || raw === "nc-united") return raw
  return "nc-united"
}

/** Accept `emailSender` or legacy `logoVariant` (nc-united / recruitnc only). */
export function resolveAdminBlastSender(input: {
  emailSender?: string | null
  logoVariant?: string | null
}): AdminBlastSender {
  if (input.emailSender) {
    return ADMIN_BLAST_SENDERS[parseAdminBlastSenderId(input.emailSender)]
  }
  if (input.logoVariant === "recruitnc") return ADMIN_BLAST_SENDERS.recruitnc
  if (input.logoVariant === "wrestling-guild") return ADMIN_BLAST_SENDERS["wrestling-guild"]
  return ADMIN_BLAST_SENDERS["nc-united"]
}
