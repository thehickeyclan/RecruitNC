/**
 * Tools whose JSON `markdown` field is the final user answer (no rewrite / no extra LLM round).
 */

const VERBATIM_MARKDOWN_TOOLS = new Set([
  "get_athlete_full_dossier",
  "get_school_wrestling_dossier",
])

export function extractVerbatimToolMarkdown(
  toolName: string,
  toolResultJson: string,
): string | null {
  if (!VERBATIM_MARKDOWN_TOOLS.has(toolName)) return null
  try {
    const parsed = JSON.parse(toolResultJson) as { markdown?: string; error?: string }
    const md = typeof parsed.markdown === "string" ? parsed.markdown.trim() : ""
    // Soft "not found" messages still beat another 10s LLM round.
    if (md.length > 40) return md
    return null
  } catch {
    return null
  }
}
