/**
 * Schools by classification/region (e.g. 3A East).
 * Uses callChat (Claude or OpenAI); extracts classification/region then looks up and formats.
 */

import { getSupabaseAdmin } from "@/lib/server-supabase"
import { callChat, hasChatKey } from "@/lib/ai-chat"
import { getSchoolsByClassification } from "@/lib/classification-data"

export const LIST_SCHOOLS_TOOL = {
  type: "function" as const,
  function: {
    name: "list_schools_by_classification",
    description: "List North Carolina high schools in a given NCHSAA classification (1A–8A) and optionally by region (East or West). Use this when the user asks which schools/teams are in a classification, e.g. 'what schools are in 3A East?', 'list 4A West teams', 'teams in 7A'.",
    parameters: {
      type: "object",
      properties: {
        classification: {
          type: "string",
          description: "Classification: 1A, 2A, 3A, 4A, 5A, 6A, 7A, or 8A. Extract from the user's message (e.g. '3a' -> '3A').",
        },
        region: {
          type: "string",
          enum: ["East", "West"],
          description: "Optional. Region (East or West). Omit if the user does not specify a region.",
        },
      },
      required: ["classification"],
      additionalProperties: false,
    },
  },
}

export interface ListSchoolsResult {
  schools: Array<{ school_name: string; classification: string; region: string | null; enrollment?: number }>
  count: number
  classification: string
  region: string | null
}

export async function executeListSchoolsByClassification(
  classification: string,
  region?: string | null
): Promise<ListSchoolsResult> {
  const admin = getSupabaseAdmin()
  const div = classification.trim().toUpperCase().replace(/\s/g, "")
  const match = div.match(/^(\d+)A$/)
  const normalized = match ? `${match[1]}A` : div

  let q = admin
    .from("school_classifications")
    .select("school_name, classification, region, enrollment, effective_year")
    .eq("classification", normalized)
    .order("school_name", { ascending: true })

  if (region && (region === "East" || region === "West")) {
    q = q.ilike("region", `%${region}%`)
  }

  const { data: rows, error } = await q

  if (error) {
    throw new Error(`Database error: ${error.message}`)
  }

  let schools = (rows || []).map((r: any) => ({
    school_name: r.school_name,
    classification: r.classification,
    region: r.region ?? null,
    enrollment: r.enrollment,
  }))

  // Fallback: if DB returns 0, use static classificationData (no region filter - returns all in class)
  if (schools.length === 0) {
    const staticSchools = getSchoolsByClassification(normalized)
    schools = staticSchools.map((name) => ({
      school_name: name,
      classification: normalized,
      region: null,
      enrollment: undefined,
    }))
  }

  return {
    schools,
    count: schools.length,
    classification: normalized,
    region: region || null,
  }
}

export interface RunToolsResult {
  answer: string
  results: ListSchoolsResult["schools"]
  count: number
  aggregateResult: { division: string; region: string | null; count: number; schools: string[] }
}

export async function runDivisionRegionWithTools(
  userMessage: string,
  _messageId: string | null
): Promise<RunToolsResult> {
  if (!hasChatKey()) {
    throw new Error("Chat API key not configured (set ANTHROPIC_API_KEY or OPENAI_API_KEY)")
  }

  const extractPrompt = `Extract NCHSAA classification (1A, 2A, 3A, 4A, 5A, 6A, 7A, or 8A) and optional region (East or West) from the user message. Reply with valid JSON only, no other text: {"classification": "3A", "region": "East"} or {"classification": "4A", "region": null} if no region mentioned.`
  const extractRes = await callChat({
    messages: [
      { role: "system", content: "You extract structured data. Reply with JSON only." },
      { role: "user", content: `${extractPrompt}\n\nUser: ${userMessage}` },
    ],
    max_tokens: 100,
    temperature: 0,
    response_format: { type: "json_object" },
  })
  const raw = extractRes.choices[0]?.message?.content?.trim() ?? "{}"
  const parsed = (() => {
    try {
      const j = JSON.parse(raw.replace(/^[^{]*/, "").replace(/[^}]*$/, ""))
      return { classification: j.classification, region: j.region ?? null }
    } catch {
      return { classification: null as string | null, region: null as string | null }
    }
  })()

  const classification = parsed.classification
    ? String(parsed.classification).trim().toUpperCase().replace(/\s/g, "")
    : null
  const region =
    parsed.region && /^(East|West)$/i.test(String(parsed.region))
      ? (String(parsed.region) as "East" | "West")
      : null

  if (!classification || !/^\d+A$/.test(classification)) {
    return {
      answer: "I couldn't determine which classification (1A–8A) you're asking about. Try e.g. \"What schools are in 3A East?\"",
      results: [],
      count: 0,
      aggregateResult: { division: "", region: null, count: 0, schools: [] },
    }
  }

  const result = await executeListSchoolsByClassification(classification, region)
  const listText = result.schools.map((s) => s.school_name).join(", ")

  const formatRes = await callChat({
    messages: [
      {
        role: "system",
        content: "You are Data Dawg. Format the list of schools as a short, friendly response. Do not use asterisks or markdown bold.",
      },
      {
        role: "user",
        content: `Classification: ${result.classification}${result.region ? ` ${result.region}` : ""}. Count: ${result.count}. Schools: ${listText}. Write a brief friendly answer listing the schools.`,
      },
    ],
    max_tokens: 1024,
    temperature: 0.3,
  })
  const answer =
    formatRes.choices[0]?.message?.content?.trim() ||
    `Here are the ${result.count} teams in ${result.classification}${result.region ? ` ${result.region}` : ""}: ${listText}.`

  return {
    answer,
    results: result.schools,
    count: result.count,
    aggregateResult: {
      division: result.classification,
      region: result.region,
      count: result.count,
      schools: result.schools.map((s) => s.school_name),
    },
  }
}
