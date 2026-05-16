"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  RefreshCw,
  Wallet,
  Search,
  Users,
  TrendingUp,
  Receipt,
  AlertCircle,
  ExternalLink,
  CheckCircle,
  XCircle,
} from "lucide-react"

interface FamilyWallet {
  athleteId: string
  athleteName: string
  athleteCode: string | null
  parentEmail: string | null
  parentName: string | null
  raisedCents: number
  reimbursedCents: number
  guildAllocationsCents: number
  availableCents: number
  donationCount: number
  hasParentLink: boolean
  profileActive: boolean
}

export default function AdminWalletsPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuth()
  const router = useRouter()

  const [wallets, setWallets] = useState<FamilyWallet[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedWallet, setSelectedWallet] = useState<FamilyWallet | null>(null)

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push("/")
    }
  }, [user, isAdmin, authLoading, router])

  const loadWallets = useCallback(async () => {
    setIsLoading(true)
    setError("")
    try {
      const res = await fetch("/api/admin/fundraising/wallets", {
        credentials: "include",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load")
      setWallets(data.wallets || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user && isAdmin) {
      loadWallets()
    }
  }, [user, isAdmin, loadWallets])

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100)
  }

  const filteredWallets = wallets.filter((w) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      w.athleteName.toLowerCase().includes(q) ||
      w.athleteCode?.toLowerCase().includes(q) ||
      w.parentEmail?.toLowerCase().includes(q) ||
      w.parentName?.toLowerCase().includes(q)
    )
  })

  const totalRaised = wallets.reduce((sum, w) => sum + w.raisedCents, 0)
  const totalSpent = wallets.reduce((sum, w) => sum + w.reimbursedCents + w.guildAllocationsCents, 0)
  const totalAvailable = wallets.reduce((sum, w) => sum + w.availableCents, 0)

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-[#D3B574]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A1628]">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#13294B] to-[#0A1628] border-b border-[#1e3a5f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/admin/fundraising")}
                className="text-gray-400 hover:text-white hover:bg-[#1e3a5f]"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#D3B574]">Admin</p>
                <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-white">Family Wallets</h1>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadWallets}
              disabled={isLoading}
              className="border-[#1e3a5f] text-gray-300 hover:bg-[#1e3a5f]"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-800 rounded-lg flex items-center gap-3 text-red-200">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Card className="bg-[#0F1E32] border-[#1e3a5f]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Families</p>
                  {isLoading ? (
                    <Skeleton className="h-6 w-12 mt-1 bg-[#1e3a5f]" />
                  ) : (
                    <p className="text-xl font-bold text-white">{wallets.length}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#0F1E32] border-[#1e3a5f]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Total Raised</p>
                  {isLoading ? (
                    <Skeleton className="h-6 w-20 mt-1 bg-[#1e3a5f]" />
                  ) : (
                    <p className="text-xl font-bold text-green-400">{formatCurrency(totalRaised)}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#0F1E32] border-[#1e3a5f]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <Receipt className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Total Spent</p>
                  {isLoading ? (
                    <Skeleton className="h-6 w-20 mt-1 bg-[#1e3a5f]" />
                  ) : (
                    <p className="text-xl font-bold text-orange-400">{formatCurrency(totalSpent)}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#0F1E32] border-[#1e3a5f]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[#D3B574]/20 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-[#D3B574]" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Available</p>
                  {isLoading ? (
                    <Skeleton className="h-6 w-20 mt-1 bg-[#1e3a5f]" />
                  ) : (
                    <p className="text-xl font-bold text-[#D3B574]">{formatCurrency(totalAvailable)}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search by athlete, parent, or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[#0F1E32] border-[#1e3a5f] text-white placeholder:text-gray-500"
          />
        </div>

        {/* Wallets List */}
        <div className="space-y-2">
          {isLoading ? (
            [...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full bg-[#1e3a5f]" />
            ))
          ) : filteredWallets.length === 0 ? (
            <Card className="bg-[#0F1E32] border-[#1e3a5f]">
              <CardContent className="p-8 text-center">
                <Wallet className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No family wallets found</p>
              </CardContent>
            </Card>
          ) : (
            filteredWallets.map((wallet) => (
              <button
                key={wallet.athleteId}
                onClick={() => setSelectedWallet(wallet)}
                className="w-full text-left"
              >
                <Card className="bg-[#0F1E32] border-[#1e3a5f] hover:border-[#D3B574]/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                        wallet.availableCents > 0 ? "bg-[#D3B574]/20" : "bg-gray-500/20"
                      }`}>
                        <Wallet className={`h-5 w-5 ${
                          wallet.availableCents > 0 ? "text-[#D3B574]" : "text-gray-400"
                        }`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-medium text-white truncate">{wallet.athleteName}</p>
                          {!wallet.hasParentLink && (
                            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
                              No parent link
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 truncate">
                          {wallet.parentEmail || "No parent connected"}
                        </p>
                        {wallet.athleteCode && (
                          <p className="text-xs text-gray-500 font-mono mt-0.5">{wallet.athleteCode}</p>
                        )}
                      </div>

                      <div className="hidden sm:grid sm:grid-cols-3 gap-4 text-right">
                        <div>
                          <p className="text-xs text-gray-500">Raised</p>
                          <p className="font-semibold text-green-400">{formatCurrency(wallet.raisedCents)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Spent</p>
                          <p className="font-semibold text-orange-400">
                            {formatCurrency(wallet.reimbursedCents + wallet.guildAllocationsCents)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Available</p>
                          <p className="font-semibold text-[#D3B574]">{formatCurrency(wallet.availableCents)}</p>
                        </div>
                      </div>

                      <div className="sm:hidden text-right">
                        <p className="font-bold text-[#D3B574]">{formatCurrency(wallet.availableCents)}</p>
                        <p className="text-xs text-gray-500">{wallet.donationCount} donations</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedWallet} onOpenChange={() => setSelectedWallet(null)}>
        <DialogContent className="bg-[#0F1E32] border-[#1e3a5f] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Wallet Details</DialogTitle>
          </DialogHeader>

          {selectedWallet && (
            <div className="space-y-4">
              <div className="p-4 bg-[#0A1628] rounded-lg space-y-3">
                <div>
                  <p className="text-xs text-gray-500">Athlete</p>
                  <p className="font-medium text-white">{selectedWallet.athleteName}</p>
                  {selectedWallet.athleteCode && (
                    <p className="text-xs text-gray-500 font-mono">{selectedWallet.athleteCode}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-500">Parent Link:</p>
                  {selectedWallet.hasParentLink ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                </div>

                {selectedWallet.parentEmail && (
                  <div>
                    <p className="text-xs text-gray-500">Parent Email</p>
                    <p className="text-white">{selectedWallet.parentEmail}</p>
                  </div>
                )}

                {selectedWallet.parentName && (
                  <div>
                    <p className="text-xs text-gray-500">Parent Name</p>
                    <p className="text-white">{selectedWallet.parentName}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Card className="bg-[#0A1628] border-[#1e3a5f]">
                  <CardContent className="p-3">
                    <p className="text-xs text-gray-500">Total Raised</p>
                    <p className="text-lg font-bold text-green-400">
                      {formatCurrency(selectedWallet.raisedCents)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-[#0A1628] border-[#1e3a5f]">
                  <CardContent className="p-3">
                    <p className="text-xs text-gray-500">Donations</p>
                    <p className="text-lg font-bold text-white">{selectedWallet.donationCount}</p>
                  </CardContent>
                </Card>
                <Card className="bg-[#0A1628] border-[#1e3a5f]">
                  <CardContent className="p-3">
                    <p className="text-xs text-gray-500">Reimbursed</p>
                    <p className="text-lg font-bold text-orange-400">
                      {formatCurrency(selectedWallet.reimbursedCents)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-[#0A1628] border-[#1e3a5f]">
                  <CardContent className="p-3">
                    <p className="text-xs text-gray-500">Guild Used</p>
                    <p className="text-lg font-bold text-purple-400">
                      {formatCurrency(selectedWallet.guildAllocationsCents)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-[#D3B574]/10 border-[#D3B574]/30">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-[#D3B574]">Available Balance</p>
                  <p className="text-2xl font-bold text-[#D3B574]">
                    {formatCurrency(selectedWallet.availableCents)}
                  </p>
                </CardContent>
              </Card>

              <Button
                variant="outline"
                onClick={() => setSelectedWallet(null)}
                className="w-full border-[#1e3a5f] text-gray-300 hover:bg-[#1e3a5f]"
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
