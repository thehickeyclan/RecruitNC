"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, ExternalLink, Link2, Share2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  NEWS_SHARE_FORMATS,
  NEWS_SHARE_PRIMARY_FORMATS,
  facebookShareUrl,
  newsArticleShareUrl,
  newsShareImageApiPath,
  type NewsShareFormatId,
} from "@/lib/news-share-formats"

type NewsSharePanelProps = {
  slug: string
  title: string
  className?: string
}

export function NewsSharePanel({ slug, title, className = "" }: NewsSharePanelProps) {
  const [copied, setCopied] = useState(false)
  const [showMoreSizes, setShowMoreSizes] = useState(false)
  const { toast } = useToast()

  const shareUrl = useMemo(() => {
    if (typeof window !== "undefined") {
      const url = new URL(`${window.location.origin}/news/${slug}`)
      url.searchParams.set("utm_source", "share")
      url.searchParams.set("utm_medium", "social")
      url.searchParams.set("utm_campaign", "news")
      return url.toString()
    }
    return newsArticleShareUrl(slug)
  }, [slug])

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast({ title: "Link copied", description: "Article link copied to clipboard." })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({
        title: "Copy failed",
        description: "Try selecting the URL from the address bar.",
        variant: "destructive",
      })
    }
  }

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl, text: title })
        toast({ title: "Shared", description: "Thanks for sharing!" })
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          toast({
            title: "Share failed",
            description: "Copy the link or download an image instead.",
            variant: "destructive",
          })
        }
      }
    } else {
      handleCopyLink()
    }
  }

  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share

  const downloadFormats = showMoreSizes ? NEWS_SHARE_FORMATS : NEWS_SHARE_PRIMARY_FORMATS

  return (
    <section
      className={`rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5 ${className}`}
      aria-label="Share this article"
    >
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#13294B]">
            Share this story
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Copy the link or download a sized image for Instagram or Facebook.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-[#13294B]/20 text-[#13294B] hover:bg-white"
            onClick={handleCopyLink}
          >
            <Link2 className="mr-1.5 h-4 w-4" />
            {copied ? "Copied!" : "Copy link"}
          </Button>

          <a
            href={facebookShareUrl(shareUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex"
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-[#13294B]/20 text-[#13294B] hover:bg-white"
            >
              <ExternalLink className="mr-1.5 h-4 w-4" />
              Facebook
            </Button>
          </a>

          {canNativeShare ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-[#13294B]/20 text-[#13294B] hover:bg-white"
              onClick={handleNativeShare}
            >
              <Share2 className="mr-1.5 h-4 w-4" />
              Share
            </Button>
          ) : null}
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Download images
          </p>
          <div className="flex flex-wrap gap-2">
            {downloadFormats.map((format) => (
              <DownloadFormatButton key={format.id} slug={slug} formatId={format.id} label={format.shortLabel} />
            ))}
            {!showMoreSizes ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-slate-600"
                onClick={() => setShowMoreSizes(true)}
              >
                More sizes
              </Button>
            ) : null}
          </div>
        </div>

        <p className="text-xs leading-relaxed text-slate-500">
          Instagram: download an image, create a post or story, then paste the article link in your
          caption or link sticker. Images are generated for each platform size.
        </p>
      </div>
    </section>
  )
}

function DownloadFormatButton({
  slug,
  formatId,
  label,
}: {
  slug: string
  formatId: NewsShareFormatId
  label: string
}) {
  return (
    <a
      href={newsShareImageApiPath(slug, formatId)}
      download
      className="inline-flex"
    >
      <Button
        type="button"
        size="sm"
        className="bg-[#13294B] text-white hover:bg-[#1a3a5c]"
      >
        <Download className="mr-1.5 h-4 w-4" />
        {label}
      </Button>
    </a>
  )
}
