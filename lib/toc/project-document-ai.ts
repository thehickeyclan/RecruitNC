export type TocDocumentAiMetadata = {
  documentType: "receipt" | "invoice" | "contract" | "quote" | "artwork" | "photo" | "other"
  vendor: string | null
  totalAmount: number | null
  documentDate: string | null
  dueDate: string | null
  paymentStatus: "paid" | "due" | "deposit" | "unknown"
  paymentMethod: string | null
  orderNumber: string | null
  contractTerm: string | null
  keyDates: string[]
  lineItems: Array<{ description: string; amount: number | null }>
  suggestedCategory: string | null
  summary: string
  confidence: "low" | "medium" | "high"
  warnings: string[]
}

const DEFAULT_METADATA: TocDocumentAiMetadata = {
  documentType: "other",
  vendor: null,
  totalAmount: null,
  documentDate: null,
  dueDate: null,
  paymentStatus: "unknown",
  paymentMethod: null,
  orderNumber: null,
  contractTerm: null,
  keyDates: [],
  lineItems: [],
  suggestedCategory: null,
  summary: "",
  confidence: "low",
  warnings: [],
}

function coerceNumber(value: unknown): number | null {
  if (value == null || value === "") return null
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  const numeric = Number(String(value).replace(/[^0-9.-]/g, ""))
  return Number.isFinite(numeric) ? numeric : null
}

function coerceDate(value: unknown): string | null {
  if (!value) return null
  const text = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text
  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

function extractText(response: Record<string, unknown>): string {
  if (typeof response.output_text === "string") return response.output_text
  const output = Array.isArray(response.output) ? response.output : []
  for (const item of output) {
    if (!item || typeof item !== "object") continue
    const content = Array.isArray((item as { content?: unknown }).content) ? (item as { content?: unknown[] }).content : []
    for (const part of content) {
      if (!part || typeof part !== "object") continue
      const text = (part as { text?: unknown }).text
      if (typeof text === "string") return text
    }
  }
  return ""
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text)
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return null
    try {
      const parsed = JSON.parse(match[0])
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null
    } catch {
      return null
    }
  }
}

function normalizeMetadata(raw: Record<string, unknown> | null): TocDocumentAiMetadata {
  if (!raw) return DEFAULT_METADATA
  const documentType = ["receipt", "invoice", "contract", "quote", "artwork", "photo", "other"].includes(String(raw.documentType))
    ? (String(raw.documentType) as TocDocumentAiMetadata["documentType"])
    : "other"
  const paymentStatus = ["paid", "due", "deposit", "unknown"].includes(String(raw.paymentStatus))
    ? (String(raw.paymentStatus) as TocDocumentAiMetadata["paymentStatus"])
    : "unknown"
  const confidence = ["low", "medium", "high"].includes(String(raw.confidence))
    ? (String(raw.confidence) as TocDocumentAiMetadata["confidence"])
    : "low"

  return {
    documentType,
    vendor: raw.vendor ? String(raw.vendor).trim() : null,
    totalAmount: coerceNumber(raw.totalAmount),
    documentDate: coerceDate(raw.documentDate),
    dueDate: coerceDate(raw.dueDate),
    paymentStatus,
    paymentMethod: raw.paymentMethod ? String(raw.paymentMethod).trim() : null,
    orderNumber: raw.orderNumber ? String(raw.orderNumber).trim() : null,
    contractTerm: raw.contractTerm ? String(raw.contractTerm).trim() : null,
    keyDates: Array.isArray(raw.keyDates) ? raw.keyDates.map(String).filter(Boolean).slice(0, 8) : [],
    lineItems: Array.isArray(raw.lineItems)
      ? raw.lineItems.slice(0, 12).map((item) => {
          const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {}
          return { description: String(row.description ?? "").trim(), amount: coerceNumber(row.amount) }
        }).filter((item) => item.description)
      : [],
    suggestedCategory: raw.suggestedCategory ? String(raw.suggestedCategory).trim() : null,
    summary: raw.summary ? String(raw.summary).trim() : "",
    confidence,
    warnings: Array.isArray(raw.warnings) ? raw.warnings.map(String).filter(Boolean).slice(0, 6) : [],
  }
}

export async function reviewTocProjectDocumentWithAi(input: {
  fileName: string
  mimeType: string
  buffer: Buffer
  title: string
  category: string | null
  vendor: string | null
  amount: number | null
}): Promise<{ ok: true; metadata: TocDocumentAiMetadata } | { ok: false; error: string }> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return { ok: false, error: "OPENAI_API_KEY not configured" }
  if (input.buffer.byteLength > 18 * 1024 * 1024) return { ok: false, error: "File too large for AI review" }

  const mimeType = input.mimeType || "application/octet-stream"
  const prompt = [
    "Review this Tournament of Champions operations document.",
    "It may be a receipt, invoice, quote, contract, artwork proof, or event document.",
    "Extract useful ops metadata. Return JSON only.",
    "Use null when unknown. Use ISO date format YYYY-MM-DD for dates.",
    "For receipts/invoices, documentDate means purchase/order/invoice date.",
    "For contracts, documentDate means contract/signature/effective date if present.",
    "",
    `User-entered title: ${input.title}`,
    `User-entered category: ${input.category ?? "unknown"}`,
    `User-entered vendor: ${input.vendor ?? "unknown"}`,
    `User-entered amount: ${input.amount ?? "unknown"}`,
    "",
    "JSON keys: documentType, vendor, totalAmount, documentDate, dueDate, paymentStatus, paymentMethod, orderNumber, contractTerm, keyDates, lineItems, suggestedCategory, summary, confidence, warnings.",
  ].join("\n")

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.TOC_DOCUMENT_AI_MODEL || "gpt-4o-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_file",
              filename: input.fileName,
              file_data: `data:${mimeType};base64,${input.buffer.toString("base64")}`,
            },
            { type: "input_text", text: prompt },
          ],
        },
      ],
      text: {
        format: {
          type: "json_object",
        },
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => "")
    return { ok: false, error: `OpenAI ${response.status}: ${errorText.slice(0, 240)}` }
  }

  const data = (await response.json()) as Record<string, unknown>
  const raw = parseJsonObject(extractText(data))
  return { ok: true, metadata: normalizeMetadata(raw) }
}
