/**
 * Admin blast email HTML template. Shared by send and preview.
 * Single-column, inline styles for email client compatibility.
 *
 * SOURCE OF TRUTH: Always check /admin/messaging/preview before sending.
 * Change this file → refresh preview until it looks right → then send.
 *
 * Header background is navy (#003366) only — no black. Logo assets must be
 * transparent (e.g. white logo on transparent) so they sit on the navy header.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** Logo width in px. Only width is set so aspect ratio is preserved (no stretched/empty box). */
const LOGO_WIDTH = 200

export type EmailLogoVariant = "recruitnc" | "nc-united" | "wrestling-guild"

/** Logo assets: use transparent backgrounds (white on transparent) so they sit on navy header only. */
const LOGO_VARIANTS: Record<EmailLogoVariant, { path: string; alt: string }> = {
  recruitnc: { path: "/images/recruitnc-logo.png", alt: "RecruitNC — North Carolina Wrestling" },
  "nc-united": { path: "/images/nc-united-stacked-logo-white.png", alt: "NC United" },
  "wrestling-guild": { path: "/images/sponsors/the-guild-logo.png", alt: "Wrestling Guild" },
}

/** Default blast header logo is NC United; pass `recruitnc` explicitly for the shield logo. */
export function parseEmailLogoVariant(raw: string | undefined | null): EmailLogoVariant {
  if (raw === "recruitnc") return "recruitnc"
  if (raw === "wrestling-guild") return "wrestling-guild"
  return "nc-united"
}

export function buildAdminBlastEmailHtml(
  subject: string,
  htmlBody: string,
  baseUrl: string,
  logoVariant: EmailLogoVariant = "nc-united",
  footerText = "From NC Wrestling United / RecruitNC",
): string {
  const base = baseUrl ? baseUrl.replace(/\/$/, "") : ""
  const variant = LOGO_VARIANTS[logoVariant] ?? LOGO_VARIANTS["nc-united"]
  const logoUrl = base ? `${base}${variant.path}` : ""
  const headerBg =
    logoVariant === "wrestling-guild" ? "#1a1a1a" : logoVariant === "nc-united" ? "#000000" : "#003366"
  const fallbackHeader =
    logoVariant === "wrestling-guild" ? "Wrestling Guild" : logoVariant === "recruitnc" ? "RecruitNC" : "NC United"
  const safeTitle = escapeHtml((subject || fallbackHeader).slice(0, 100))
  const safeFooter = escapeHtml(footerText)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f1f5f9;color:#1e293b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:${headerBg};padding:16px 24px;text-align:center;line-height:0;">
              ${logoUrl ? `<img src="${logoUrl}" alt="${escapeHtml(variant.alt)}" width="${LOGO_WIDTH}" style="display:block;margin:0 auto;max-width:100%;height:auto;border:0;" />` : `<span style="color:#fff;font-size:20px;font-weight:700;">${escapeHtml(fallbackHeader)}</span>`}
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:28px 24px;border:1px solid #e2e8f0;border-top:none;">
              <div style="font-size:16px;line-height:1.65;color:#334155;">
                ${htmlBody}
              </div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;padding-top:20px;border-top:1px solid #e2e8f0;">
                <tr>
                  <td style="font-size:12px;color:#64748b;">
                    ${safeFooter}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
