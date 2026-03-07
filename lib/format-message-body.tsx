"use client"

import React from "react"

export type Block =
  | { type: "paragraph"; lines: string[] }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }

const BULLET_LINE = /^\s*[-*]\s+/
const NUMBERED_LINE = /^\s*\d+\.\s+/

/**
 * Splits message body into blocks: paragraphs, unordered lists (- or *), ordered lists (1. 2. …).
 */
export function parseBlocks(body: string): Block[] {
  const lines = body.split(/\n/)
  const blocks: Block[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (BULLET_LINE.test(line)) {
      const items: string[] = []
      while (i < lines.length && BULLET_LINE.test(lines[i])) {
        items.push(lines[i].replace(BULLET_LINE, ""))
        i++
      }
      blocks.push({ type: "ul", items })
      continue
    }
    if (NUMBERED_LINE.test(line)) {
      const items: string[] = []
      while (i < lines.length && NUMBERED_LINE.test(lines[i])) {
        items.push(lines[i].replace(NUMBERED_LINE, ""))
        i++
      }
      blocks.push({ type: "ol", items })
      continue
    }
    const paraLines: string[] = []
    while (i < lines.length && !BULLET_LINE.test(lines[i]) && !NUMBERED_LINE.test(lines[i])) {
      paraLines.push(lines[i])
      i++
    }
    if (paraLines.length) blocks.push({ type: "paragraph", lines: paraLines })
  }
  return blocks
}

type InlineSegment = { type: "text"; value: string } | { type: "bold"; value: string } | { type: "underline"; value: string }

/**
 * Splits a string by **bold** and __underline__ (non-greedy). Processes in order so ** comes before __ when both present.
 */
function splitBoldUnderline(text: string): InlineSegment[] {
  const segments: InlineSegment[] = []
  const re = /\*\*(.+?)\*\*|__(.+?)__/g
  let lastEnd = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastEnd) {
      segments.push({ type: "text", value: text.slice(lastEnd, m.index) })
    }
    if (m[1] !== undefined) {
      segments.push({ type: "bold", value: m[1] })
    } else if (m[2] !== undefined) {
      segments.push({ type: "underline", value: m[2] })
    }
    lastEnd = re.lastIndex
  }
  if (lastEnd < text.length) {
    segments.push({ type: "text", value: text.slice(lastEnd) })
  }
  return segments.length ? segments : [{ type: "text", value: text }]
}

export type RenderInline = (text: string) => React.ReactNode[]

/**
 * Renders a single line (with bold/underline) using the provided renderInline for plain text (links, mentions, emoji).
 */
export function renderFormattedLine(
  line: string,
  renderInline: RenderInline,
  keyPrefix: string
): React.ReactNode[] {
  const segments = splitBoldUnderline(line)
  const out: React.ReactNode[] = []
  segments.forEach((seg, i) => {
    const k = `${keyPrefix}-${i}`
    if (seg.type === "text") {
      const nodes = renderInline(seg.value)
      out.push(
        <React.Fragment key={k}>
          {nodes}
        </React.Fragment>
      )
    } else if (seg.type === "bold") {
      const inner = renderInline(seg.value)
      out.push(
        <strong key={k} className="font-semibold">
          {inner.length ? inner : seg.value}
        </strong>
      )
    } else {
      const inner = renderInline(seg.value)
      out.push(
        <u key={k}>
          {inner.length ? inner : seg.value}
        </u>
      )
    }
  })
  return out
}

export type FormatMessageBodyOptions = {
  renderInline: RenderInline
  /** Optional class for list containers */
  listClassName?: string
  /** Optional class for list items */
  listItemClassName?: string
}

/**
 * Renders full message body with paragraphs, bullets, numbering, bold, and underline.
 * Uses renderInline for each plain text segment (so the caller can add links, mentions, emoji).
 */
export function formatMessageBody(
  body: string,
  options: FormatMessageBodyOptions
): React.ReactNode[] {
  const { renderInline, listClassName, listItemClassName } = options
  const blocks = parseBlocks(body)
  const result: React.ReactNode[] = []
  blocks.forEach((block, bi) => {
    const keyPrefix = `b-${bi}`
    if (block.type === "paragraph") {
      block.lines.forEach((line, li) => {
        if (li > 0) result.push(<br key={`${keyPrefix}-br-${li}`} />)
        result.push(...renderFormattedLine(line, renderInline, `${keyPrefix}-${li}`))
      })
    } else if (block.type === "ul") {
      result.push(
        <ul key={keyPrefix} className={listClassName ?? "list-disc list-inside my-1 space-y-0.5"} style={{ listStyleType: "disc" }}>
          {block.items.map((item, ii) => (
            <li key={`${keyPrefix}-${ii}`} className={listItemClassName}>
              {renderFormattedLine(item, renderInline, `${keyPrefix}-${ii}`)}
            </li>
          ))}
        </ul>
      )
    } else {
      result.push(
        <ol key={keyPrefix} className={listClassName ?? "list-decimal list-inside my-1 space-y-0.5"} style={{ listStyleType: "decimal" }}>
          {block.items.map((item, ii) => (
            <li key={`${keyPrefix}-${ii}`} className={listItemClassName}>
              {renderFormattedLine(item, renderInline, `${keyPrefix}-${ii}`)}
            </li>
          ))}
        </ol>
      )
    }
  })
  return result
}
