"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Users, Plus, X, Search, Loader2, Unlink, ExternalLink } from "lucide-react"

type LinkedParent = {
  user_id: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  cell_phone: string | null
  profile_image_url: string | null
}

type Props = {
  athleteId: string
  athleteName: string
}

export function AthleteParentLinks({ athleteId, athleteName }: Props) {
  const [linkedParents, setLinkedParents] = useState<LinkedParent[]>([])
  const [loading, setLoading] = useState(true)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<LinkedParent[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [linkingId, setLinkingId] = useState<string | null>(null)
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null)

  // Fetch linked parents
  useEffect(() => {
    async function fetchLinkedParents() {
      try {
        const res = await fetch(`/api/admin/athletes/${athleteId}/parents`, { credentials: "include" })
        const data = await res.json()
        if (res.ok && data.parents) {
          setLinkedParents(data.parents)
        }
      } catch (e) {
        console.error("Failed to fetch linked parents:", e)
      } finally {
        setLoading(false)
      }
    }
    fetchLinkedParents()
  }, [athleteId])

  // Search for parents
  const searchParents = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }
    setSearchLoading(true)
    try {
      const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(query)}&role=parent&limit=10`, { credentials: "include" })
      const data = await res.json()
      if (res.ok && data.users) {
        // Filter out already linked parents
        const linkedIds = linkedParents.map(p => p.user_id)
        setSearchResults(data.users.filter((u: LinkedParent) => !linkedIds.includes(u.user_id)))
      }
    } catch (e) {
      console.error("Search failed:", e)
    } finally {
      setSearchLoading(false)
    }
  }

  // Link a parent
  const linkParent = async (userId: string) => {
    setLinkingId(userId)
    try {
      const res = await fetch(`/api/admin/athletes/${athleteId}/parents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
        credentials: "include",
      })
      if (res.ok) {
        const linked = searchResults.find(p => p.user_id === userId)
        if (linked) {
          setLinkedParents(prev => [...prev, linked])
          setSearchResults(prev => prev.filter(p => p.user_id !== userId))
        }
        setSearchQuery("")
        setShowLinkModal(false)
      }
    } catch (e) {
      console.error("Link failed:", e)
    } finally {
      setLinkingId(null)
    }
  }

  // Unlink a parent
  const unlinkParent = async (userId: string) => {
    if (!confirm("Are you sure you want to unlink this parent?")) return
    setUnlinkingId(userId)
    try {
      const res = await fetch(`/api/admin/athletes/${athleteId}/parents?userId=${userId}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (res.ok) {
        setLinkedParents(prev => prev.filter(p => p.user_id !== userId))
      }
    } catch (e) {
      console.error("Unlink failed:", e)
    } finally {
      setUnlinkingId(null)
    }
  }

  const getDisplayName = (p: LinkedParent) => {
    return p.full_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "Unknown"
  }

  return (
    <>
      <div className="rounded-xl border border-white/10 bg-[#0B2545]/50 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 min-h-[56px]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#C8A94A]/20">
              <Users className="h-5 w-5 text-[#C8A94A]" />
            </div>
            <div>
              <span className="font-semibold text-white">Linked Parents</span>
              <span className="ml-2 text-sm text-white/50">({linkedParents.length})</span>
            </div>
          </div>
          <button
            onClick={() => setShowLinkModal(true)}
            className="flex h-9 items-center gap-2 rounded-lg bg-[#C8A94A]/20 px-3 text-sm font-medium text-[#C8A94A] hover:bg-[#C8A94A]/30"
          >
            <Plus className="h-4 w-4" />
            Link Parent
          </button>
        </div>

        <div className="border-t border-white/10 px-4 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-white/40" />
            </div>
          ) : linkedParents.length === 0 ? (
            <p className="py-4 text-center text-sm text-white/40">No linked parents</p>
          ) : (
            <div className="space-y-2">
              {linkedParents.map((parent) => (
                <div
                  key={parent.user_id}
                  className="flex items-center gap-3 rounded-lg bg-white/5 p-3"
                >
                  <Link
                    href={`/admin/contacts/parent/${parent.user_id}`}
                    className="flex flex-1 items-center gap-3 hover:opacity-80"
                  >
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white/10">
                      {parent.profile_image_url ? (
                        <img
                          src={parent.profile_image_url}
                          alt={getDisplayName(parent)}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-bold text-white/50">
                          {getDisplayName(parent).charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white">{getDisplayName(parent)}</p>
                      <p className="text-xs text-white/50">
                        {[parent.email, parent.cell_phone].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-white/30" />
                  </Link>
                  <button
                    onClick={() => unlinkParent(parent.user_id)}
                    disabled={unlinkingId === parent.user_id}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                    title="Unlink parent"
                  >
                    {unlinkingId === parent.user_id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Unlink className="h-4 w-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Link Parent Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl bg-[#0B2545] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Link a Parent to {athleteName}</h3>
              <button
                onClick={() => {
                  setShowLinkModal(false)
                  setSearchQuery("")
                  setSearchResults([])
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  searchParents(e.target.value)
                }}
                placeholder="Search parents by name or email..."
                className="w-full rounded-lg border border-white/20 bg-[#061224] py-3 pl-10 pr-4 text-white placeholder:text-white/40 focus:border-[#C8A94A] focus:outline-none"
                autoFocus
              />
              {searchLoading && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-white/40" />
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="mt-4 max-h-[300px] space-y-2 overflow-y-auto">
                {searchResults.map((parent) => (
                  <button
                    key={parent.user_id}
                    onClick={() => linkParent(parent.user_id)}
                    disabled={linkingId === parent.user_id}
                    className="flex w-full items-center gap-3 rounded-lg bg-white/5 p-3 text-left hover:bg-white/10 disabled:opacity-50"
                  >
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white/10">
                      {parent.profile_image_url ? (
                        <img
                          src={parent.profile_image_url}
                          alt={getDisplayName(parent)}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-bold text-white/50">
                          {getDisplayName(parent).charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white">{getDisplayName(parent)}</p>
                      <p className="text-xs text-white/50">
                        {[parent.email, parent.cell_phone].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    {linkingId === parent.user_id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-[#C8A94A]" />
                    ) : (
                      <Plus className="h-4 w-4 text-[#C8A94A]" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {searchQuery.length >= 2 && !searchLoading && searchResults.length === 0 && (
              <p className="mt-4 text-center text-sm text-white/40">No parents found</p>
            )}

            {searchQuery.length < 2 && (
              <p className="mt-4 text-center text-sm text-white/40">Type at least 2 characters to search</p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
