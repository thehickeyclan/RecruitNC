"use client"

import React from "react"
import { formatMessageBody } from "@/lib/format-message-body"

export type CustomEmojiItem = { slug: string; image_url: string }

const URL_REGEX = /(https?:\/\/[^\s]+)/gi
const EMOJI_REGEX = /:([a-z0-9_-]+):/gi

/**
 * Renders message body with **bold**, __underline__, bullets (- *), numbering (1. 2. …),
 * custom :slug: emoji, and linkified URLs.
 */
export function ForumMessageBody({
  body,
  customEmoji = [],
  className,
}: {
  body: string
  customEmoji?: CustomEmojiItem[]
  className?: string
}) {
  const bySlug = React.useMemo(() => {
    const map = new Map<string, string>()
    customEmoji.forEach((e) => map.set(e.slug.toLowerCase(), e.image_url))
    return map
  }, [customEmoji])

  const renderInline = React.useCallback(
    (text: string): React.ReactNode[] => {
      const result: React.ReactNode[] = []
      const byUrl = text.split(URL_REGEX)
      let keyIdx = 0
      byUrl.forEach((part) => {
        const isUrl = part.startsWith("http://") || part.startsWith("https://")
        if (isUrl) {
          result.push(
            <a
              key={`u-${keyIdx++}`}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-inherit hover:opacity-80"
            >
              {part}
            </a>
          )
          return
        }
        let lastIndex = 0
        let match: RegExpExecArray | null
        const emojiRegex = new RegExp(EMOJI_REGEX.source, "gi")
        while ((match = emojiRegex.exec(part)) !== null) {
          if (match.index > lastIndex) {
            result.push(
              <span key={`t-${keyIdx++}`}>{part.slice(lastIndex, match.index)}</span>
            )
          }
          const slug = match[1].toLowerCase()
          const url = bySlug.get(slug)
          if (url) {
            result.push(
              <img
                key={`e-${keyIdx++}-${slug}`}
                src={url}
                alt=""
                role="presentation"
                className="inline-block w-5 h-5 align-middle mx-0.5"
              />
            )
          } else {
            result.push(
              <span key={`e-${keyIdx++}`} className="inline-block w-5 h-5 align-middle mx-0.5" aria-hidden />
            )
          }
          lastIndex = emojiRegex.lastIndex
        }
        if (lastIndex < part.length) {
          result.push(<span key={`t-${keyIdx++}`}>{part.slice(lastIndex)}</span>)
        }
      })
      return result.length ? result : [text]
    },
    [bySlug]
  )

  const content = React.useMemo(
    () =>
      formatMessageBody(body, {
        renderInline,
        listClassName: "list-disc list-inside my-1 space-y-0.5 text-white/90",
        listItemClassName: "text-white/90",
      }),
    [body, renderInline]
  )

  return (
    <div className={className}>
      {content.length > 0 ? content : body}
    </div>
  )
}
