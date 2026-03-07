"use client"

import { cn } from "@/lib/utils"

const STANDARD_EMOJI = [
  "👍", "❤️", "😂", "😊", "🎉", "🔥", "👏", "🙌", "💪", "⭐", "🤔", "😅",
  "👋", "🙏", "💯", "😎", "🥳", "😢", "😤", "🤷", "✅", "❌", "⚠️", "📌",
]

export type CustomEmojiWithCategory = { slug: string; image_url: string; category?: string; display_name?: string | null }

const CATEGORY_LABELS: Record<string, string> = {
  college: "Colleges",
  hs: "High Schools",
  club: "Clubs",
  ncu: "NCU / Org",
  other: "Other",
}

const CATEGORY_ORDER = ["ncu", "college", "hs", "club", "other"]

type Props = {
  customEmoji: CustomEmojiWithCategory[]
  onSelect: (emoji: string) => void
  /** Max height for scroll area (e.g. "max-h-48" or "max-h-64") */
  className?: string
}

/**
 * Sectioned emoji picker: Standard (unicode) + custom by category (Colleges, High Schools, Clubs, etc.).
 * onSelect(unicode) for standard, onSelect(`:slug:`) for custom.
 */
export function ForumEmojiPicker({ customEmoji, onSelect, className }: Props) {
  const byCategory = new Map<string, CustomEmojiWithCategory[]>()
  for (const e of customEmoji) {
    const cat = (e.category || "other").toLowerCase()
    if (!byCategory.has(cat)) byCategory.set(cat, [])
    byCategory.get(cat)!.push(e)
  }
  for (const cat of CATEGORY_ORDER) {
    if (!byCategory.has(cat)) byCategory.set(cat, [])
  }

  return (
    <div className={cn("overflow-y-auto p-2", className)}>
      {/* Standard */}
      <p className="text-xs font-medium text-white/60 mb-1.5 px-1">Standard</p>
      <div className="grid grid-cols-6 gap-1 mb-4">
        {STANDARD_EMOJI.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className="w-8 h-8 rounded hover:bg-white/10 flex items-center justify-center text-lg"
            onClick={() => onSelect(emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Custom by category */}
      {CATEGORY_ORDER.map((cat) => {
        const list = byCategory.get(cat) ?? []
        if (list.length === 0) return null
        const label = CATEGORY_LABELS[cat] ?? cat
        return (
          <div key={cat} className="mb-4">
            <p className="text-xs font-medium text-white/60 mb-1.5 px-1">{label}</p>
            <div className="grid grid-cols-6 gap-1">
              {list.map((e) => (
                <button
                  key={e.slug}
                  type="button"
                  className="w-8 h-8 rounded hover:bg-white/10 flex items-center justify-center p-0.5"
                  onClick={() => onSelect(`:${e.slug}:`)}
                  title={e.display_name?.trim() || "Emoji"}
                >
                  <img src={e.image_url} alt={e.display_name?.trim() || "Emoji"} className="w-6 h-6 object-contain" />
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
