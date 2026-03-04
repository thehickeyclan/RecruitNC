"use client"

import { useCallback, useMemo, useState } from "react"
import { Search } from "lucide-react"
import { EMOJI_CATEGORIES, EMOJI_SEARCH_LIST } from "./emoji-data"

export type CustomEmojiItem = { slug: string; image_url: string; category: string; display_name?: string | null }

const CUSTOM_CATEGORY_ORDER = ["ncu", "hs", "college", "club", "other"]
const CUSTOM_CATEGORY_LABELS: Record<string, string> = {
  ncu: "NCU",
  hs: "High school",
  college: "College",
  club: "Club",
  other: "Other",
}

export function EmojiStrip({
  onPick,
  customEmoji = [],
  defaultTab,
}: {
  onPick: (emoji: string) => void
  customEmoji?: CustomEmojiItem[]
  /** Open directly to this tab: "standard" or first logos tab when "logos" */
  defaultTab?: "standard" | "logos"
}) {
  const customByCategory = useMemo(
    () =>
      customEmoji.reduce(
        (acc, item) => {
          const c = item.category || "other"
          if (!acc[c]) acc[c] = []
          acc[c].push(item)
          return acc
        },
        {} as Record<string, CustomEmojiItem[]>
      ),
    [customEmoji]
  )
  const customCategoriesWithItems = useMemo(
    () => CUSTOM_CATEGORY_ORDER.filter((c) => (customByCategory[c]?.length ?? 0) > 0),
    [customByCategory]
  )
  const firstLogoCategory = customCategoriesWithItems[0]
  const initialTab =
    defaultTab === "logos" && firstLogoCategory ? firstLogoCategory : "standard"

  const [mainTab, setMainTab] = useState<"standard" | string>(initialTab)
  const [standardSubTab, setStandardSubTab] = useState(EMOJI_CATEGORIES[0]?.id ?? "smileys")
  const [search, setSearch] = useState("")

  // When popover opens to "logos", show logo grid
  useEffect(() => {
    if (defaultTab === "logos" && firstLogoCategory && mainTab === "standard") setMainTab(firstLogoCategory)
  }, [defaultTab, firstLogoCategory, mainTab])

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const emoji = (e.currentTarget as HTMLButtonElement).dataset.emoji
      if (emoji) onPick(emoji)
    },
    [onPick]
  )

  // customByCategory and customCategoriesWithItems defined above

  const searchTrimmed = search.trim().toLowerCase()
  const searchResults = useMemo(() => {
    if (!searchTrimmed) return null
    return EMOJI_SEARCH_LIST.filter(({ terms }) =>
      terms.some((t) => t.includes(searchTrimmed))
    ).slice(0, 120)
  }, [searchTrimmed])

  const currentStandardCategory = EMOJI_CATEGORIES.find((c) => c.id === standardSubTab)
  const emojisToShow =
    mainTab === "standard"
      ? searchResults
        ? searchResults.map((r) => r.emoji)
        : currentStandardCategory?.emojis ?? []
      : []

  return (
    <div className="min-w-[320px] max-w-[360px] flex flex-col max-h-[380px]">
      {/* Main tabs: Standard + custom categories */}
      <div className="flex flex-wrap gap-0.5 border-b px-2 pt-2 pb-1 shrink-0">
        <button
          type="button"
          onClick={() => setMainTab("standard")}
          className={`px-2 py-1.5 text-xs font-medium rounded ${mainTab === "standard" ? "bg-[#003366] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
        >
          Standard
        </button>
        {customCategoriesWithItems.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setMainTab(c)}
            className={`px-2 py-1.5 text-xs font-medium rounded ${mainTab === c ? "bg-[#003366] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
          >
            {CUSTOM_CATEGORY_LABELS[c] ?? c}
          </button>
        ))}
      </div>

      {mainTab === "standard" && (
        <>
          {/* Search */}
          <div className="px-2 pt-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search emoji…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#003366]/30 focus:border-[#003366]"
              />
            </div>
          </div>

          {/* Sub-tabs for standard categories (when not searching) */}
          {!searchTrimmed && (
            <div className="flex flex-wrap gap-0.5 px-2 pt-1.5 shrink-0 overflow-x-auto">
              {EMOJI_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setStandardSubTab(cat.id)}
                  className={`px-2 py-1 text-xs rounded whitespace-nowrap ${standardSubTab === cat.id ? "bg-[#003366]/15 text-[#003366]" : "text-gray-600 hover:bg-gray-100"}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}

          {/* Emoji grid */}
          <div className="p-2 overflow-y-auto flex-1 min-h-0">
            <div className="grid grid-cols-8 gap-0.5">
              {emojisToShow.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  data-emoji={emoji}
                  onClick={handleClick}
                  className="text-xl p-1.5 rounded hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                  aria-label={`Insert ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            {emojisToShow.length === 0 && searchTrimmed && (
              <p className="text-sm text-gray-500 py-4 text-center">No emoji found</p>
            )}
          </div>
        </>
      )}

      {mainTab !== "standard" && customByCategory[mainTab] && (
        <div className="p-2 overflow-y-auto flex-1 min-h-0">
          <div className="grid grid-cols-5 gap-1.5">
            {customByCategory[mainTab].map((item) => (
              <button
                key={item.slug}
                type="button"
                data-emoji={`:${item.slug}:`}
                onClick={handleClick}
                className="p-2 rounded hover:bg-gray-100 focus:bg-gray-100 focus:outline-none flex items-center justify-center"
                title={`:${item.slug}:`}
                aria-label={item.display_name || item.slug}
              >
                <img
                  src={item.image_url}
                  alt={item.slug}
                  className="w-8 h-8 object-contain"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
