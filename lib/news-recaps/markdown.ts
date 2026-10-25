/** The small markdown subset the recaps use: ## headings, paragraphs, tables, **bold**, *italic*, [links](/path). */
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

function inline(s: string): string {
  return esc(s)
    .replace(/\[([^\]]+)\]\((\/[^)\s]*|https:\/\/[^)\s]+)\)/g, (_m, t, href) => `<a href="${href}" class="font-semibold text-[#003366] underline underline-offset-2">${t}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
}

export function markdownToHtml(md: string): string {
  const out: string[] = []
  for (const block of md.split(/\n\s*\n/)) {
    const b = block.trim()
    if (!b) continue
    if (b.startsWith("## ")) { out.push(`<h2 class="mt-8 text-xl font-bold text-[#0b1730]">${inline(b.slice(3))}</h2>`); continue }
    if (b.startsWith("|")) {
      const rows = b.split("\n").filter((r) => !/^\|\s*-/.test(r)).map((r) => r.replace(/^\||\|$/g, "").split("|").map((c) => c.trim()))
      const [head, ...body] = rows
      out.push(`<div class="my-4 overflow-x-auto"><table class="w-full text-sm"><thead><tr>${head!.map((c, i) => `<th class="border-b border-gray-300 px-2 py-1.5 ${i ? "text-center" : "text-left"} font-semibold">${inline(c)}</th>`).join("")}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c, i) => `<td class="border-b border-gray-100 px-2 py-1.5 ${i ? "text-center font-semibold" : ""}">${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`)
      continue
    }
    out.push(`<p class="mt-4 leading-relaxed text-gray-800">${inline(b.replace(/\n/g, " "))}</p>`)
  }
  return out.join("\n")
}
