"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Search,
  Filter,
  Users,
  GraduationCap,
  UserCircle,
  Building2,
  ChevronRight,
  Mail,
  Phone,
  Calendar,
  Clock,
  X,
} from "lucide-react"
import { AthleteImage } from "@/components/athlete-image"

type ContactType = "all" | "athlete" | "parent" | "coach"

type Contact = {
  id: string
  type: "athlete" | "parent" | "coach"
  name: string
  email: string | null
  phone: string | null
  photoUrl: string | null
  // Athlete-specific
  graduationYear?: number
  weightClass?: string
  highSchool?: string
  recruitingStatus?: string
  // Parent-specific
  linkedAthletes?: { id: string; name: string }[]
  // Coach-specific
  institution?: string
  coachingPosition?: string
  verified?: boolean
  // Common
  lastLogin?: string | null
  createdAt?: string | null
}

function formatDate(date: string | null | undefined): string {
  if (!date) return "Never"
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatTimeAgo(date: string | null | undefined): string {
  if (!date) return "Never"
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(date)
}

function ContactTypeBadge({ type }: { type: Contact["type"] }) {
  const config = {
    athlete: { label: "Athlete", bg: "bg-blue-500/20", text: "text-blue-400", icon: GraduationCap },
    parent: { label: "Parent", bg: "bg-purple-500/20", text: "text-purple-400", icon: UserCircle },
    coach: { label: "Coach", bg: "bg-emerald-500/20", text: "text-emerald-400", icon: Building2 },
  }
  const { label, bg, text, icon: Icon } = config[type]

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${bg} ${text}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

function ContactCard({ contact, onClick }: { contact: Contact; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-xl border border-white/10 bg-[#0B2545]/50 p-4 text-left transition-all hover:border-[#C8A94A]/30 hover:bg-[#0B2545]/80 active:scale-[0.99]"
    >
      {/* Avatar */}
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-white/10">
        {contact.photoUrl ? (
          <AthleteImage
            photoUrl={contact.photoUrl}
            name={contact.name}
            fill
            alt={contact.name}
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xl font-bold text-white/50">
            {contact.name?.charAt(0) || "?"}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-base font-semibold text-white">{contact.name || "Unknown"}</h3>
          <ContactTypeBadge type={contact.type} />
        </div>

        {/* Type-specific details */}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/50">
          {contact.type === "athlete" && (
            <>
              {contact.graduationYear && <span>{contact.graduationYear}</span>}
              {contact.weightClass && <span>{contact.weightClass} lbs</span>}
              {contact.highSchool && <span className="truncate max-w-[120px]">{contact.highSchool}</span>}
            </>
          )}
          {contact.type === "parent" && contact.linkedAthletes && contact.linkedAthletes.length > 0 && (
            <span className="truncate">
              {contact.linkedAthletes.length} athlete{contact.linkedAthletes.length > 1 ? "s" : ""} linked
            </span>
          )}
          {contact.type === "coach" && (
            <>
              {contact.institution && <span className="truncate max-w-[150px]">{contact.institution}</span>}
              {contact.verified && <span className="text-emerald-400">Verified</span>}
            </>
          )}
        </div>

        {/* Contact info */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/40">
          {contact.email && (
            <span className="flex items-center gap-1 truncate max-w-[180px]">
              <Mail className="h-3 w-3" />
              {contact.email}
            </span>
          )}
          {contact.lastLogin && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTimeAgo(contact.lastLogin)}
            </span>
          )}
        </div>
      </div>

      {/* Arrow */}
      <ChevronRight className="h-5 w-5 shrink-0 text-white/30 transition-transform group-hover:translate-x-0.5 group-hover:text-[#C8A94A]" />
    </button>
  )
}

export default function ContactsDirectoryPage() {
  const router = useRouter()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<ContactType>("all")
  const [stats, setStats] = useState({ athletes: 0, parents: 0, coaches: 0, total: 0 })

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (typeFilter !== "all") params.set("type", typeFilter)

      const res = await fetch(`/api/admin/contacts?${params.toString()}`, { credentials: "include" })
      const data = await res.json()

      if (res.ok) {
        setContacts(data.contacts || [])
        setStats(data.stats || { athletes: 0, parents: 0, coaches: 0, total: 0 })
      }
    } catch (e) {
      console.error("[v0] Failed to fetch contacts:", e)
    } finally {
      setLoading(false)
    }
  }, [search, typeFilter])

  useEffect(() => {
    const debounce = setTimeout(fetchContacts, 300)
    return () => clearTimeout(debounce)
  }, [fetchContacts])

  const handleContactClick = (contact: Contact) => {
    if (contact.type === "athlete") {
      router.push(`/admin/athletes/edit?id=${contact.id}`)
    } else if (contact.type === "parent") {
      router.push(`/admin/contacts/parent/${contact.id}`)
    } else if (contact.type === "coach") {
      router.push(`/admin/contacts/coach/${contact.id}`)
    }
  }

  const typeButtons = [
    { type: "all" as const, label: "All", count: stats.total, icon: Users },
    { type: "athlete" as const, label: "Athletes", count: stats.athletes, icon: GraduationCap },
    { type: "parent" as const, label: "Parents", count: stats.parents, icon: UserCircle },
    { type: "coach" as const, label: "Coaches", count: stats.coaches, icon: Building2 },
  ]

  return (
    <div className="min-h-screen bg-[#061224]">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#061224]/95 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">Contacts</h1>
              <p className="text-sm text-white/50">Unified CRM directory</p>
            </div>
            <Link
              href="/admin"
              className="rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/5"
            >
              Back
            </Link>
          </div>

          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search by name, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-white/5 py-3 pl-11 pr-4 text-base text-white placeholder:text-white/40 focus:border-[#C8A94A]/50 focus:outline-none focus:ring-1 focus:ring-[#C8A94A]/30"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/40 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Type filter tabs */}
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {typeButtons.map(({ type, label, count, icon: Icon }) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`flex min-w-[80px] shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  typeFilter === type
                    ? "bg-[#C8A94A] text-[#061224]"
                    : "bg-white/5 text-white/70 hover:bg-white/10"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
                <span className={`ml-1 text-xs ${typeFilter === type ? "text-[#061224]/70" : "text-white/40"}`}>
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#C8A94A] border-t-transparent" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-[#0B2545]/50 px-6 py-16 text-center">
            <Users className="mx-auto h-12 w-12 text-white/20" />
            <p className="mt-4 text-lg font-medium text-white/70">No contacts found</p>
            <p className="mt-1 text-sm text-white/40">
              {search ? "Try a different search term" : "No contacts match the current filter"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact) => (
              <ContactCard key={`${contact.type}-${contact.id}`} contact={contact} onClick={() => handleContactClick(contact)} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
