import type { SupabaseClient } from "@supabase/supabase-js"

const TABLE = "fundraising_supporter_thank_you_ack"

export async function fetchThankYouAckLedgerKeys(admin: SupabaseClient, athleteId: string): Promise<Set<string>> {
  const map = await fetchThankYouAckLedgerKeysForAthletes(admin, [athleteId])
  return map.get(athleteId) ?? new Set()
}

export async function fetchThankYouAckLedgerKeysForAthletes(
  admin: SupabaseClient,
  athleteIds: string[],
): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>()
  for (const id of athleteIds) map.set(id, new Set())
  if (athleteIds.length === 0) return map

  const { data, error } = await admin.from(TABLE).select("athlete_id, ledger_key").in("athlete_id", athleteIds)

  if (error) {
    if (error.code === "42P01" || /does not exist|schema cache/i.test(error.message)) {
      console.warn("[supporter-thank-you-ack] table unavailable:", error.message)
      return map
    }
    throw new Error(error.message)
  }

  for (const row of data ?? []) {
    const aid = typeof (row as { athlete_id?: string }).athlete_id === "string" ? (row as { athlete_id: string }).athlete_id : ""
    const lk = typeof (row as { ledger_key?: string }).ledger_key === "string" ? (row as { ledger_key: string }).ledger_key : ""
    if (!aid || !lk) continue
    map.get(aid)?.add(lk)
  }
  return map
}

export async function setSupporterThankYouAck(params: {
  admin: SupabaseClient
  athleteId: string
  ledgerKey: string
  thanked: boolean
  userId: string | null
}): Promise<void> {
  const { admin, athleteId, ledgerKey, thanked, userId } = params

  if (!ledgerKey.trim()) throw new Error("ledgerKey required")
  if (ledgerKey.length > 512) throw new Error("ledgerKey too long")

  if (!thanked) {
    const { error } = await admin.from(TABLE).delete().eq("athlete_id", athleteId).eq("ledger_key", ledgerKey)
    if (error && error.code !== "42P01" && !/does not exist|schema cache/i.test(error.message)) {
      throw new Error(error.message)
    }
    return
  }

  const { error } = await admin.from(TABLE).upsert(
    {
      athlete_id: athleteId,
      ledger_key: ledgerKey,
      created_by_user_id: userId,
    },
    { onConflict: "athlete_id,ledger_key" },
  )

  if (error) {
    if (error.code === "42P01" || /does not exist|schema cache/i.test(error.message)) {
      throw new Error("Thank-you tracking table is not set up yet — run the SQL in docs/sql/fundraising-supporter-thank-you-ack.sql.txt")
    }
    throw new Error(error.message)
  }
}
