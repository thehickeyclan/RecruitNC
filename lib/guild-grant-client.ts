/**
 * Server-only: call Guild trusted grant endpoint (when implemented).
 * @see GUILD_API_BASE_URL, GUILD_API_SECRET, GUILD_CREDIT_GRANT_PATH, GUILD_CREDIT_GRANT_STUB
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
  const payload = {
    guild_parent_id: body.guildParentId,
    amount_cents: body.amountCents,
    source: process.env.GUILD_CREDIT_GRANT_SOURCE || "promotion",
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
    const msg =
      (typeof json.error === "string" && json.error) ||
      (typeof json.message === "string" && json.message) ||
      `Guild grant HTTP ${res.status}`
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
