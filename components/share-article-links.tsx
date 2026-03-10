"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Link2, Share2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type ShareArticleLinksProps = {
  /** Article title for native share and toast */
  title: string
  /** Path (e.g. /recruiting/tournaments) to build full URL in copy/share */
  path: string
  className?: string
}

export function ShareArticleLinks({ title, path, className = "" }: ShareArticleLinksProps) {
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const getUrl = () => {
    if (typeof window !== "undefined") return `${window.location.origin}${path}`
    return `https://app.ncwrestlingunited.com${path}`
  }

  const handleCopyLink = async () => {
    const url = getUrl()
    try {
      await navigator.clipboard.writeText(url)
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

  const handleShare = async () => {
    const url = getUrl()
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title,
          url,
          text: title,
        })
        toast({ title: "Shared", description: "Thanks for sharing!" })
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          toast({
            title: "Share failed",
            description: "Copy the link instead.",
            variant: "destructive",
          })
        }
      }
    } else {
      handleCopyLink()
    }
  }

  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-sm text-white/70 mr-1">Share:</span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-white/30 text-white hover:bg-white/10"
        onClick={handleCopyLink}
      >
        <Link2 className="h-4 w-4 mr-1.5" />
        {copied ? "Copied!" : "Copy link"}
      </Button>
      {canNativeShare && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-white/30 text-white hover:bg-white/10"
          onClick={handleShare}
        >
          <Share2 className="h-4 w-4 mr-1.5" />
          Share
        </Button>
      )}
    </div>
  )
}
