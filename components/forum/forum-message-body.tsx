"use client"

import React from "react"

export type CustomEmojiItem = { slug: string; image_url: string }

/**
 * Renders message body with unicode emoji (native) and :slug: replaced by custom emoji images.
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

  const parts = React.useMemo(() => {
    const list: React.ReactNode[] = []
    const regex = /:([a-z0-9_-]+):/gi
    let lastIndex = 0
    let match: RegExpExecArray | null
    let keyIdx = 0
    while ((match = regex.exec(body)) !== null) {
      if (match.index > lastIndex) {
        list.push(<span key={`t-${keyIdx++}`}>{body.slice(lastIndex, match.index)}</span>)
      }
      const slug = match[1].toLowerCase()
      const url = bySlug.get(slug)
      if (url) {
        list.push(
          <img
            key={`e-${keyIdx++}-${slug}`}
            src={url}
            alt={`:${match[1]}:`}
            className="inline-block w-5 h-5 align-middle mx-0.5"
          />
        )
      } else {
        list.push(<span key={`t-${keyIdx++}`}>{match[0]}</span>)
      }
      lastIndex = regex.lastIndex
    }
    if (lastIndex < body.length) list.push(<span key={`t-${keyIdx}`}>{body.slice(lastIndex)}</span>)
    return list
  }, [body, bySlug])

  return (
    <span className={className}>
      {parts.length > 0 ? parts : body}
    </span>
  )
}
