"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Plus, Upload, Copy, Users, TrendingUp, GraduationCap, Trophy, Loader2, X, AlertTriangle } from "lucide-react"
import { AthleteCard } from "./athlete-card"
import { AthleteFilters } from "./athlete-filters"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function AthletesPage() {
  const [athletes, setAthletes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [recruitingStatusFilter, setRecruitingStatusFilter] = useState<string>("all")
  const [yearFilter, setYearFilter] = useState<string>("all")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [athleteToDelete, setAthleteToDelete] = useState<{ id: string; name: string } | null>(null)
  const [duplicateGroups, setDuplicateGroups] = useState<any[]>([])
  const [duplicatesLoading, setDuplicatesLoading] = useState(false)
  const [showDuplicates, setShowDuplicates] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    async function fetchAthletes() {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch("/api/admin/athletes")
        
        if (!response.ok) {
          throw new Error(`Failed to fetch athletes: ${response.status}`)
        }

        const data = await response.json()
        let athletesArray = data

        if (data?.athletes && Array.isArray(data.athletes)) {
          athletesArray = data.athletes
        } else if (data?.data && Array.isArray(data.data)) {
          athletesArray = data.data
        }

        if (!Array.isArray(athletesArray)) {
          setError("Invalid data format received")
          return
        }

        setAthletes(athletesArray)
      } catch (err) {
        console.error("Error fetching athletes:", err)
        setError("Failed to load athletes. Please try again.")
        toast({
          title: "Error",
          description: "Failed to load athletes",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchAthletes()
  }, [toast])

  const loadDuplicates = async () => {
    setDuplicatesLoading(true)
    try {
      const res = await fetch("/api/admin/athletes/duplicates")
      if (!res.ok) throw new Error("Failed")
      const data = await res.json()
      setDuplicateGroups(data.groups ?? [])
      setShowDuplicates(true)
    } catch {
      toast({ title: "Error", description: "Could not load duplicate report", variant: "destructive" })
    } finally {
      setDuplicatesLoading(false)
    }
  }

  const handleDeleteClick = (id: string, name: string) => {
    setAthleteToDelete({ id, name })
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!athleteToDelete) return

    try {
      const response = await fetch(`/api/athletes/${athleteToDelete.id}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Failed to delete")

      setAthletes((prev) => prev.filter((a) => a.id !== athleteToDelete.id))
      toast({ title: "Deleted", description: `${athleteToDelete.name} has been removed` })
    } catch {
      toast({ title: "Error", description: "Failed to delete athlete", variant: "destructive" })
    } finally {
      setDeleteDialogOpen(false)
      setAthleteToDelete(null)
    }
  }

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllFiltered = () => setSelectedIds(new Set(filteredAthletes.map((a) => a.id)))
  const clearSelection = () => setSelectedIds(new Set())

  const handleBulkDelete = async () => {
    const count = selectedIds.size
    if (count === 0) return
    if (!window.confirm(`Delete ${count} athlete${count === 1 ? "" : "s"}? This cannot be undone.`)) return
    
    setBulkDeleting(true)
    let deleted = 0
    
    for (const id of selectedIds) {
      try {
        const res = await fetch(`/api/athletes/${id}`, { method: "DELETE" })
        if (res.ok) deleted++
      } catch {}
    }
    
    setAthletes((prev) => prev.filter((a) => !selectedIds.has(a.id)))
    setSelectedIds(new Set())
    setBulkDeleting(false)
    toast({ title: "Deleted", description: `${deleted} athlete${deleted === 1 ? "" : "s"} removed` })
  }

  const filteredAthletes = athletes.filter((athlete) => {
    const matchesSearch =
      athlete?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      athlete?.college?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      athlete?.highschool?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus =
      recruitingStatusFilter === "all" ||
      athlete?.recruiting_status?.toLowerCase() === recruitingStatusFilter.toLowerCase()

    const matchesYear = yearFilter === "all" || athlete?.graduationyear?.toString() === yearFilter

    return matchesSearch && matchesStatus && matchesYear
  })

  const uniqueStatuses = [...new Set(athletes.map((a) => a?.recruiting_status).filter(Boolean))]
  const uniqueYears = [...new Set(athletes.map((a) => a?.graduationyear).filter(Boolean))].sort((a, b) => b - a)

  // Stats calculations
  const committedCount = athletes.filter((a) => 
    a?.recruiting_status?.toLowerCase() === "committed" || 
    a?.recruiting_status?.toLowerCase() === "college athlete"
  ).length
  const currentYear = new Date().getFullYear()
  const currentClassCount = athletes.filter((a) => a?.graduationyear === currentYear || a?.graduationyear === currentYear + 1).length

  return (
    <div className="admin-dark-page min-h-screen bg-[#061224]">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#061224]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Top row */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white sm:text-3xl">Athletes</h1>
              <p className="mt-1 text-sm text-white/50">Manage your athlete directory</p>
            </div>
            
            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Button asChild className="min-h-[44px] gap-2 bg-[#C8A94A] font-semibold text-[#061224] hover:bg-[#d4b75c]">
                <Link href="/admin/athletes/add">
                  <Plus className="h-4 w-4" />
                  Add Athlete
                </Link>
              </Button>
              <Button 
                asChild 
                variant="outline" 
                className="min-h-[44px] gap-2 border-white/20 bg-transparent text-white hover:bg-white/10"
              >
                <Link href="/admin/athletes/bulk-import">
                  <Upload className="h-4 w-4" />
                  Import
                </Link>
              </Button>
              <Button
                variant="outline"
                onClick={loadDuplicates}
                disabled={duplicatesLoading}
                className="min-h-[44px] gap-2 border-white/20 bg-transparent text-white hover:bg-white/10"
              >
                {duplicatesLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                Duplicates
              </Button>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#C8A94A]/20">
                  <Users className="h-5 w-5 text-[#C8A94A]" />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums text-white">{athletes.length}</p>
                  <p className="text-xs text-white/50">Total Athletes</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                  <Trophy className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums text-white">{committedCount}</p>
                  <p className="text-xs text-white/50">Committed</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
                  <GraduationCap className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums text-white">{currentClassCount}</p>
                  <p className="text-xs text-white/50">{currentYear}/{currentYear + 1} Class</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
                  <TrendingUp className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums text-white">{uniqueStatuses.length}</p>
                  <p className="text-xs text-white/50">Status Types</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Duplicates banner */}
        {showDuplicates && duplicateGroups.length > 0 && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                <div>
                  <h3 className="font-semibold text-amber-400">
                    {duplicateGroups.length} Potential Duplicate{duplicateGroups.length !== 1 ? "s" : ""} Found
                  </h3>
                  <p className="mt-1 text-sm text-white/60">
                    Athletes with the same name and graduation year. Review and merge or remove duplicates.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {duplicateGroups.slice(0, 5).map((g) => (
                      <Badge 
                        key={g.name + g.graduationYear} 
                        variant="outline"
                        className="border-amber-500/30 bg-amber-500/10 text-amber-400"
                      >
                        {g.name} ({g.graduationYear}) × {g.count}
                      </Badge>
                    ))}
                    {duplicateGroups.length > 5 && (
                      <Badge variant="outline" className="border-white/20 text-white/50">
                        +{duplicateGroups.length - 5} more
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDuplicates(false)}
                className="shrink-0 text-white/50 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6">
          <AthleteFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            recruitingStatusFilter={recruitingStatusFilter}
            onRecruitingStatusChange={setRecruitingStatusFilter}
            yearFilter={yearFilter}
            onYearChange={setYearFilter}
            uniqueRecruitingStatuses={uniqueStatuses}
            uniqueYears={uniqueYears}
            totalCount={athletes.length}
            filteredCount={filteredAthletes.length}
          />
        </div>

        {/* Selection bar */}
        {selectedIds.size > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-[#C8A94A]/30 bg-[#C8A94A]/10 p-4">
            <span className="text-sm font-medium text-[#C8A94A]">
              {selectedIds.size} selected
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllFiltered}
                className="h-9 border-white/20 bg-transparent text-white hover:bg-white/10"
              >
                Select all ({filteredAthletes.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelection}
                className="h-9 border-white/20 bg-transparent text-white hover:bg-white/10"
              >
                Clear
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="h-9 bg-red-600 hover:bg-red-700"
              >
                {bulkDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Delete selected
              </Button>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-[#C8A94A]" />
            <p className="mt-4 text-white/50">Loading athletes...</p>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <AlertTriangle className="h-10 w-10 text-red-400" />
            <p className="mt-4 font-medium text-red-400">{error}</p>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="mt-4 border-white/20 text-white hover:bg-white/10"
            >
              Try again
            </Button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filteredAthletes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <Users className="h-12 w-12 text-white/20" />
            <p className="mt-4 text-lg font-medium text-white/50">
              {searchTerm || recruitingStatusFilter !== "all" || yearFilter !== "all"
                ? "No athletes match your filters"
                : "No athletes yet"}
            </p>
            {!searchTerm && recruitingStatusFilter === "all" && yearFilter === "all" && (
              <Button asChild className="mt-4 bg-[#C8A94A] text-[#061224] hover:bg-[#d4b75c]">
                <Link href="/admin/athletes/add">Add your first athlete</Link>
              </Button>
            )}
          </div>
        )}

        {/* Athletes grid */}
        {!loading && !error && filteredAthletes.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredAthletes.map((athlete) => (
              <AthleteCard
                key={athlete.id}
                athlete={athlete}
                isSelected={selectedIds.has(athlete.id)}
                onToggleSelect={toggleSelection}
                onDelete={handleDeleteClick}
              />
            ))}
          </div>
        )}
      </main>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="border-white/10 bg-[#061224] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Athlete</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Are you sure you want to delete {athleteToDelete?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 bg-transparent text-white hover:bg-white/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
