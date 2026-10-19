import type { Metadata } from "next"

/**
 * Title, description and a preview card for a page, so a link sent by text or posted shows that
 * page and not the site logo. The card is drawn by /api/share-card from the same words, so every
 * page gets its own picture without anyone designing one.
 */
export type ShareCard = {
  title: string
  description: string
  /** The page's path, e.g. "/rankings". */
  path: string
  /** Small gold line above the title on the card. */
  kicker?: string
  /** A photo or logo for the card (our blob storage or this site). */
  image?: string | null
  /** The page's <title> when it should differ from the card title. */
  pageTitle?: string
}

export function shareCardUrl(card: Pick<ShareCard, "title" | "description" | "kicker" | "image">): string {
  const q = new URLSearchParams({ t: card.title, s: card.description })
  if (card.kicker) q.set("k", card.kicker)
  if (card.image) q.set("img", card.image)
  return `/api/share-card?${q.toString()}`
}

export function shareMetadata(card: ShareCard): Metadata {
  const image = { url: shareCardUrl(card), width: 1200, height: 630, alt: card.title }
  return {
    title: { absolute: card.pageTitle ?? `${card.title} | NC United Wrestling` },
    description: card.description,
    openGraph: {
      title: card.title,
      description: card.description,
      url: card.path,
      siteName: "NC United Wrestling",
      type: "website",
      images: [image],
    },
    twitter: { card: "summary_large_image", title: card.title, description: card.description, images: [image.url] },
  }
}
