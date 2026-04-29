/**
 * Server-only: call Guild trusted grant endpoint (when implemented).
 *
 * Guild `public.credits.source` is constrained (`credits_source_check`). Allowed values include
 * `recruitnc_transfer` (canonical RecruitNC → Guild wallet row), `recruitnc` (short alias), plus
 * cancellation / admin_grant / promotion / reward / etc. — see Guild migrations (e.g.
 * 20260431110100 and the recruitnc alias migration).
 *
 * RecruitNC sends `source: recruitnc` by default (`GUILD_CREDIT_GRANT_SOURCE` optional override).
 * Guild’s trusted handler maps grants through `grantCredit(..., sourceType: 'recruitnc')` → DB row
 * `recruitnc_transfer`; HTTP body `source` is contract/Zod only — not necessarily inserted verbatim.
 *
 * If Guild returns `credits_source_check`, production often has **pending migrations** (constraint
 * missing `recruitnc_transfer` / `recruitnc`) or another integration is inserting invalid literals.
 *
 * @see GUILD_API_BASE_URL, GUILD_API_SECRET, GUILD_CREDIT_GRANT_PATH, GUILD_CREDIT_GRANT_STUB,
 *     GUILD_CREDIT_GRANT_SOURCE, GUILD_CREDIT_GRANT_DESCRIPTION
 */

export type GuildGrantRequest = {
  guildParentId: string
  amountCents: number
  idempotencyKey: string
  metadata: {
    recruitnc_allocation_id: string
    recruitnc_user_id: string
    athlete_id: string
    campaign: string
    requested_at: string
  }
}

export type GuildGrantResult =
  | { ok: true; creditIds: string[]; balanceCentsAfter: number | null; raw: unknown }
  | { ok: false; status: number; message: string; raw?: unknown }

/** Guild may use 404 for "wrong account type" with a JSON body; surface that instead of a generic HTTP line. */
function guildGrantErrorMessage(json: Record<string, unknown>, status: number, bodyText: string): string {
  const err = json.error
  if (typeof err === "string" && err.trim()) return err.trim()
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message?: unknown }).message
    if (typeof m === "string" && m.trim()) return m.trim()
  }
  if (typeof json.message === "string" && json.message.trim()) return json.message.trim()
  if (typeof json.detail === "string" && json.detail.trim()) return json.detail.trim()
  if (Array.isArray(json.detail) && json.detail.length > 0 && typeof json.detail[0] === "string") {
    return String(json.detail[0]).trim()
  }
  if (typeof json.description === "string" && json.description.trim()) return json.description.trim()
  const t = bodyText.trim()
  if (t && t.length > 0 && t.length < 500 && !t.startsWith("<")) return t
  return `Guild grant HTTP ${status}`
}

function grantPath(): string {
  return process.env.GUILD_CREDIT_GRANT_PATH || "/api/internal/recruitnc/credit-grant"
}

export function isGuildGrantConfigured(): boolean {
  if (process.env.GUILD_CREDIT_GRANT_STUB === "1" || process.env.GUILD_CREDIT_GRANT_STUB === "true") {
    return true
  }
  const base = process.env.GUILD_API_BASE_URL?.trim()
  const secret = process.env.GUILD_API_SECRET?.trim()
  return Boolean(base && secret)
}

export async function postGuildCreditGrant(body: GuildGrantRequest): Promise<GuildGrantResult> {
  if (process.env.GUILD_CREDIT_GRANT_STUB === "1" || process.env.GUILD_CREDIT_GRANT_STUB === "true") {
    return {
      ok: true,
      creditIds: [`stub_${body.idempotencyKey.slice(0, 8)}`],
      balanceCentsAfter: null,
      raw: { stub: true },
    }
  }

  const base = process.env.GUILD_API_BASE_URL?.trim()
  const secret = process.env.GUILD_API_SECRET?.trim()
  if (!base || !secret) {
    return { ok: false, status: 503, message: "Guild grant is not configured (GUILD_API_BASE_URL / GUILD_API_SECRET)." }
  }

  const url = `${base.replace(/\/$/, "")}${grantPath().startsWith("/") ? "" : "/"}${grantPath()}`
  const grantSource =
    (process.env.GUILD_CREDIT_GRANT_SOURCE ?? "").trim() || "recruitnc"

  const payload = {
    guild_parent_id: body.guildParentId,
    amount_cents: body.amountCents,
    /** Guild HTTP contract; DB row uses recruitnc_transfer via Guild handler — default recruitnc */
    source: grantSource,
    description:
      process.env.GUILD_CREDIT_GRANT_DESCRIPTION || "RECRUITNC: Fundraising balance allocated to Guild credits",
    metadata: body.metadata,
  }

  let res: Response
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-guild-api-secret": secret,
        "Idempotency-Key": body.idempotencyKey,
      },
      body: JSON.stringify(payload),
    })
  } catch (e) {
    console.error("[RecruitNC] guild grant fetch", e)
    return {
      ok: false,
      status: 503,
      message: e instanceof Error ? e.message : "Guild grant request failed",
    }
  }

  const text = await res.text()
  let json: Record<string, unknown> = {}
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {}
  } catch {
    json = { raw: text }
  }

  if (!res.ok) {
    const msg = guildGrantErrorMessage(json, res.status, text)
    return { ok: false, status: res.status, message: msg, raw: json }
  }

  const creditIdsRaw = json.credit_ids ?? json.creditIds
  const creditIds = Array.isArray(creditIdsRaw)
    ? creditIdsRaw.map((x) => String(x))
    : typeof json.credit_id === "string"
      ? [json.credit_id]
      : []

  const balanceRaw = json.balance_cents ?? json.balanceCentsAfter ?? json.balance_cents_after
  const balanceCentsAfter = typeof balanceRaw === "number" && Number.isFinite(balanceRaw) ? balanceRaw : null

  return { ok: true, creditIds, balanceCentsAfter, raw: json }
}
