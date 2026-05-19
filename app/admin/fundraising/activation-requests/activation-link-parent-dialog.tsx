"use client"

import { useState } from "react"
import { Loader2, Search, Link2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { fixParentLinkAction } from "@/app/actions/fundraising/fundraising-activation-actions"
import { toast } from "@/hooks/use-toast"

type SearchUser = {
  user_id: string
  email?: string | null
  full_name: string | null
  first_name?: string | null
  last_name?: string | null
  cell_phone?: string | null
  profile_image_url?: string | null
}

function looksLikeUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.trim())
}

function displayName(u: Pick<SearchUser, "full_name" | "first_name" | "last_name" | "email">): string {
  return (
    u.full_name?.trim() ||
    [u.first_name, u.last_name].filter(Boolean).join(" ").trim() ||
    u.email ||
    "Unknown"
  )
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  requestId: string
  fundraisingSlug: string
  onSuccess: () => void
}

export function ActivationLinkParentDialog({
  open,
  onOpenChange,
  requestId,
  fundraisingSlug,
  onSuccess,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchLoading, setSearchLoading] = useState(false)
  const [results, setResults] = useState<SearchUser[]>([])
  const [pasteId, setPasteId] = useState("")
  const [linkingId, setLinkingId] = useState<string | null>(null)

  const reset = () => {
    setSearchQuery("")
    setResults([])
    setPasteId("")
    setLinkingId(null)
    setSearchLoading(false)
  }

  const handleOpenChange = (v: boolean) => {
    if (!v) reset()
    onOpenChange(v)
  }

  const searchParents = async (q: string) => {
    setSearchQuery(q)
    if (q.trim().length < 2) {
      setResults([])
      return
    }
    setSearchLoading(true)
    try {
      const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(q.trim())}&role=parent`, {
        credentials: "include",
      })
      const data = await res.json()
      if (res.ok && Array.isArray(data.users)) setResults(data.users as SearchUser[])
      else setResults([])
    } catch {
      setResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  const link = async (parentUserId: string) => {
    const trimmed = parentUserId.trim()
    if (!looksLikeUuid(trimmed)) {
      toast({
        title: "Invalid id",
        description: "Use a Supabase Auth user UUID (from CRM or paste below).",
        variant: "destructive",
      })
      return
    }
    setLinkingId(trimmed)
    try {
      const res = await fixParentLinkAction(requestId, { parentUserId: trimmed })
      if (!res.ok) {
        toast({ title: "Could not link", description: res.error ?? "Unknown error.", variant: "destructive" })
        return
      }
      toast({
        title: "Linked",
        description:
          res.warning ??
          `Parent account linked for gift page “${fundraisingSlug}”. Activation row updated to that RecruitNC user.`,
      })
      handleOpenChange(false)
      onSuccess()
    } finally {
      setLinkingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Link parent → athlete wallet
          </DialogTitle>
          <DialogDescription>
            Pick the <strong className="text-foreground">parent&apos;s RecruitNC login</strong> (Auth{" "}
            <code className="rounded bg-muted px-1 py-px text-[11px]">user.id</code>). That account gets Profile → Family /
            digital wallet access for this athlete. Gift page slug:{" "}
            <span className="font-mono text-foreground">{fundraisingSlug}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => searchParents(e.target.value)}
            placeholder="Search parents by name or email…"
            className="pl-9"
            autoFocus
          />
          {searchLoading ? (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : null}
        </div>

        {results.length > 0 ? (
          <div className="max-h-[220px] space-y-2 overflow-y-auto rounded-md border bg-muted/30 p-2">
            {results.map((u) => (
              <button
                key={u.user_id}
                type="button"
                disabled={linkingId !== null}
                onClick={() => link(u.user_id)}
                className="flex w-full items-center gap-3 rounded-lg border bg-background p-3 text-left text-sm hover:bg-muted/80 disabled:opacity-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{displayName(u)}</p>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">{u.email ?? u.user_id}</p>
                </div>
                {linkingId === u.user_id ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </button>
            ))}
          </div>
        ) : null}

        {searchQuery.trim().length >= 2 && !searchLoading && results.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground">No profiles with role “parent” matched.</p>
        ) : null}

        {searchQuery.trim().length < 2 ? (
          <p className="text-center text-xs text-muted-foreground">Type at least 2 characters to search.</p>
        ) : null}

        <div className="space-y-2 border-t pt-4">
          <Label htmlFor="activation-paste-uuid">Or paste Auth user UUID</Label>
          <p className="text-[11px] text-muted-foreground">
            Use when the parent isn&apos;t labeled <code className="rounded bg-muted px-1 text-[10px]">parent</code> in{" "}
            <code className="rounded bg-muted px-1 text-[10px]">user_profiles.role</code>.
          </p>
          <div className="flex gap-2">
            <Input
              id="activation-paste-uuid"
              value={pasteId}
              onChange={(e) => setPasteId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="font-mono text-xs"
              disabled={linkingId !== null}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={!looksLikeUuid(pasteId) || linkingId !== null}
              onClick={() => link(pasteId)}
            >
              {linkingId === pasteId.trim() ? <Loader2 className="h-4 w-4 animate-spin" /> : "Link"}
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-start">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
