/**
 * Tools whose JSON `markdown` field is the final user answer (no rewrite / no extra LLM round).
 */

// `get_athlete_full_dossier` and `get_school_wrestling_dossier` used to live here. They returned
// rendered reports that became the user's answer word for word, which is why replies read like a
// printout instead of a conversation. Both now return facts and the model writes the reply.
// Nothing is verbatim today; the set stays so a future tool can opt in deliberately.
const VERBATIM_MARKDOWN_TOOLS = new Set<string>([])

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
