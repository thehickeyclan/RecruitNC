"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { 
  AlertTriangle, CheckCircle, Users, DollarSign, Link2, FileText,
  Loader2, Search, ArrowUpRight, UserPlus, RefreshCw, Zap, 
  AlertCircle, XCircle, Check, ChevronDown, Receipt, Wallet,
  Trophy, Gift, Download
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

type IssueSeverity = "critical" | "warning" | "info"
type IssueType = 
  | "no_family" 
  | "no_parent_linked" 
  | "no_code" 
  | "page_inactive" 
  | "has_donations_no_family"

interface AthleteIssue {
  athlete_id: string
  athlete_name: string
  school: string | null
  grad_year: number | null
  issues: {
    type: IssueType
    severity: IssueSeverity
    message: string
  }[]
  total_raised_cents: number
  has_page: boolean
  page_active: boolean
  has_family: boolean
  has_parent: boolean
  spartan_code: string | null
  page_slug: string | null
}

interface HealthStats {
  total_athletes_with_fundraising: number
  fully_connected: number
  needs_attention: number
  critical_issues: number
  total_raised_cents: number
}

const severityConfig = {
  critical: { color: "bg-red-500", textColor: "text-red-400", icon: XCircle, label: "Critical" },
  warning: { color: "bg-amber-500", textColor: "text-amber-400", icon: AlertTriangle, label: "Warning" },
  info: { color: "bg-blue-500", textColor: "text-blue-400", icon: AlertCircle, label: "Info" }
}

const issueLabels: Record<IssueType, string> = {
  no_family: "No family assigned",
  no_parent_linked: "No parent linked",
  no_code: "No donation code",
  page_inactive: "Page is inactive",
  has_donations_no_family: "Has donations but no family"
}

export default function FundraisingHealthDashboard() {
  const { user, isAdmin, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<HealthStats | null>(null)
  const [issues, setIssues] = useState<AthleteIssue[]>([])
  const [search, setSearch] = useState("")
  const [severityFilter, setSeverityFilter] = useState<IssueSeverity | "all">("all")
  const [expandedAthletes, setExpandedAthletes] = useState<Set<string>>(new Set())
  const [fixing, setFixing] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push("/")
    }
  }, [user, isAdmin, authLoading, router])

  useEffect(() => {
    console.log("[v0] Auth state:", { user: !!user, isAdmin, authLoading })
    if (user && isAdmin) {
      fetchHealthData()
    }
  }, [user, isAdmin, authLoading])

  const fetchHealthData = async () => {
    console.log("[v0] Fetching health data...")
    setLoading(true)
    try {
      const res = await fetch("/api/admin/fundraising/health-check")
      console.log("[v0] Health check response status:", res.status)
      if (res.ok) {
        const data = await res.json()
        console.log("[v0] Health data received:", data)
        setStats(data.stats)
        setIssues(data.issues || [])
      } else {
        const errorData = await res.text()
        console.error("[v0] Health check error response:", errorData)
      }
    } catch (error) {
      console.error("[v0] Failed to fetch health data:", error)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpanded = (athleteId: string) => {
    setExpandedAthletes(prev => {
      const next = new Set(prev)
      if (next.has(athleteId)) {
        next.delete(athleteId)
      } else {
        next.add(athleteId)
      }
      return next
    })
  }

  const handleQuickFix = async (athleteId: string, action: string) => {
    setFixing(`${athleteId}-${action}`)
    try {
      const res = await fetch("/api/admin/fundraising/quick-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athlete_id: athleteId, action })
      })
      if (res.ok) {
        await fetchHealthData()
      }
    } catch (error) {
      console.error("Quick fix failed:", error)
    } finally {
      setFixing(null)
    }
  }

  const filteredIssues = issues.filter(athlete => {
    const matchesSearch = search === "" || 
      athlete.athlete_name.toLowerCase().includes(search.toLowerCase()) ||
      athlete.school?.toLowerCase().includes(search.toLowerCase())
    
    const matchesSeverity = severityFilter === "all" || 
      athlete.issues.some(i => i.severity === severityFilter)
    
    return matchesSearch && matchesSeverity
  })

  const healthScore = stats ? Math.round((stats.fully_connected / Math.max(stats.total_athletes_with_fundraising, 1)) * 100) : 0

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-white">
          <Loader2 className="h-8 w-8 animate-spin text-[#D3B574]" />
          <span className="text-gray-300">Analyzing fundraising health...</span>
          <span className="text-xs text-gray-500">Checking athletes, families, codes, pages...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A1628]">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#13294B] to-[#0A1628] border-b border-[#1e3a5f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-[#D3B574]" />
                <p className="text-xs font-semibold uppercase tracking-wider text-[#D3B574]">Fundraising Command Center</p>
              </div>
              <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-white">Health Dashboard</h1>
              <p className="text-gray-400 text-sm mt-1">I scan every athlete and surface what needs your attention</p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={fetchHealthData}
                variant="outline"
                className="border-[#1e3a5f] text-gray-300 hover:bg-[#1e3a5f]"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button 
                onClick={() => router.push("/admin/fundraising/ledger?export=true")}
                className="bg-[#D3B574] hover:bg-[#c4a665] text-[#0A1628]"
              >
                <Download className="h-4 w-4 mr-2" />
                Audit Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Health Score + Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Health Score - Large */}
          <div className="col-span-2 lg:col-span-1 bg-[#0F1E32] rounded-xl border border-[#1e3a5f] p-6">
            <p className="text-gray-400 text-sm mb-2">Health Score</p>
            <div className="flex items-end gap-2">
              <span className={`text-4xl font-bold ${healthScore >= 80 ? 'text-green-400' : healthScore >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                {healthScore}%
              </span>
            </div>
            <div className="mt-3 h-2 bg-[#1e3a5f] rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${healthScore >= 80 ? 'bg-green-500' : healthScore >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${healthScore}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {stats?.fully_connected} of {stats?.total_athletes_with_fundraising} fully connected
            </p>
          </div>

          {/* Stat Cards */}
          <div className="bg-[#0F1E32] rounded-xl border border-[#1e3a5f] p-4">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
              <Users className="h-4 w-4" />
              <span>Total Athletes</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats?.total_athletes_with_fundraising || 0}</p>
          </div>

          <div className="bg-[#0F1E32] rounded-xl border border-[#1e3a5f] p-4">
            <div className="flex items-center gap-2 text-green-400 text-sm mb-1">
              <CheckCircle className="h-4 w-4" />
              <span>Fully Connected</span>
            </div>
            <p className="text-2xl font-bold text-green-400">{stats?.fully_connected || 0}</p>
          </div>

          <div className="bg-[#0F1E32] rounded-xl border border-[#1e3a5f] p-4">
            <div className="flex items-center gap-2 text-amber-400 text-sm mb-1">
              <AlertTriangle className="h-4 w-4" />
              <span>Needs Attention</span>
            </div>
            <p className="text-2xl font-bold text-amber-400">{stats?.needs_attention || 0}</p>
          </div>

          <div className="bg-[#0F1E32] rounded-xl border border-[#1e3a5f] p-4">
            <div className="flex items-center gap-2 text-red-400 text-sm mb-1">
              <XCircle className="h-4 w-4" />
              <span>Critical</span>
            </div>
            <p className="text-2xl font-bold text-red-400">{stats?.critical_issues || 0}</p>
          </div>
        </div>

        {/* What This Dashboard Does */}
        <div className="bg-[#0F1E32] rounded-xl border border-[#1e3a5f] p-4">
          <h3 className="text-white font-semibold mb-3">What I check for each athlete:</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
              <span className="text-gray-300"><strong className="text-red-400">Critical:</strong> Has donations but no family (money stuck)</span>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
              <span className="text-gray-300"><strong className="text-amber-400">Warning:</strong> No parent linked (can&apos;t manage wallet)</span>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
              <span className="text-gray-300"><strong className="text-amber-400">Warning:</strong> No donation code assigned</span>
            </div>
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
              <span className="text-gray-300"><strong className="text-blue-400">Info:</strong> Page exists but is inactive</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
              <span className="text-gray-300"><strong className="text-green-400">Fully Connected:</strong> Family + Parent + Code + Active Page</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search athlete or school..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-[#0F1E32] border-[#1e3a5f] text-white placeholder:text-gray-500"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["all", "critical", "warning", "info"] as const).map((sev) => (
              <Button
                key={sev}
                variant={severityFilter === sev ? "default" : "outline"}
                size="sm"
                onClick={() => setSeverityFilter(sev)}
                className={severityFilter === sev 
                  ? "bg-[#D3B574] text-[#0A1628] hover:bg-[#c4a665]" 
                  : "border-[#1e3a5f] text-gray-400 hover:bg-[#1e3a5f] hover:text-white"
                }
              >
                {sev === "all" ? "All" : severityConfig[sev].label}
                {sev !== "all" && (
                  <span className="ml-1 text-xs">
                    ({issues.filter(i => i.issues.some(iss => iss.severity === sev)).length})
                  </span>
                )}
              </Button>
            ))}
          </div>
        </div>

        {/* Issues List */}
        {filteredIssues.length === 0 ? (
          <div className="bg-[#0F1E32] rounded-xl border border-[#1e3a5f] p-12 text-center">
            <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">All Clear!</h3>
            <p className="text-gray-400">
              {issues.length === 0 
                ? "No athletes with fundraising activity found, or all are fully connected."
                : "No issues match your current filters."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredIssues.map((athlete) => {
              const isExpanded = expandedAthletes.has(athlete.athlete_id)
              const highestSeverity = athlete.issues.reduce((highest, issue) => {
                const order = { critical: 0, warning: 1, info: 2 }
                return order[issue.severity] < order[highest] ? issue.severity : highest
              }, "info" as IssueSeverity)
              const SeverityIcon = severityConfig[highestSeverity].icon

              return (
                <div 
                  key={athlete.athlete_id}
                  className="bg-[#0F1E32] rounded-xl border border-[#1e3a5f] overflow-hidden"
                >
                  {/* Main Row */}
                  <button
                    onClick={() => toggleExpanded(athlete.athlete_id)}
                    className="w-full px-4 py-4 flex items-center gap-4 hover:bg-[#1e3a5f]/30 transition-colors text-left"
                  >
                    <div className={`p-2 rounded-lg ${severityConfig[highestSeverity].color}/20`}>
                      <SeverityIcon className={`h-5 w-5 ${severityConfig[highestSeverity].textColor}`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white">{athlete.athlete_name}</span>
                        {athlete.school && (
                          <span className="text-gray-500 text-sm">
                            {athlete.school} {athlete.grad_year ? `'${String(athlete.grad_year).slice(-2)}` : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {athlete.issues.slice(0, 2).map((issue, i) => (
                          <Badge 
                            key={i} 
                            variant="outline" 
                            className={`text-xs border-0 ${severityConfig[issue.severity].textColor} ${severityConfig[issue.severity].color}/20`}
                          >
                            {issueLabels[issue.type]}
                          </Badge>
                        ))}
                        {athlete.issues.length > 2 && (
                          <span className="text-xs text-gray-500">+{athlete.issues.length - 2} more</span>
                        )}
                      </div>
                    </div>

                    {athlete.total_raised_cents > 0 && (
                      <div className="text-right hidden sm:block">
                        <p className="text-sm text-gray-400">Raised</p>
                        <p className="font-semibold text-[#D3B574]">
                          ${(athlete.total_raised_cents / 100).toLocaleString()}
                        </p>
                      </div>
                    )}

                    <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 border-t border-[#1e3a5f]">
                      <div className="pt-4 space-y-4">
                        {/* Current Status */}
                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          <div className="flex items-center gap-2">
                            {athlete.has_family ? (
                              <CheckCircle className="h-4 w-4 text-green-400" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-400" />
                            )}
                            <span className="text-sm text-gray-300">Family assigned</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {athlete.has_parent ? (
                              <CheckCircle className="h-4 w-4 text-green-400" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-400" />
                            )}
                            <span className="text-sm text-gray-300">Parent linked</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {athlete.spartan_code || athlete.page_slug ? (
                              <CheckCircle className="h-4 w-4 text-green-400" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-400" />
                            )}
                            <span className="text-sm text-gray-300">
                              Code: {athlete.spartan_code || athlete.page_slug || "None"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {athlete.page_active ? (
                              <CheckCircle className="h-4 w-4 text-green-400" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-400" />
                            )}
                            <span className="text-sm text-gray-300">Page active</span>
                          </div>
                        </div>

                        {/* Issues & Actions */}
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-400">Issues & Quick Actions:</p>
                          {athlete.issues.map((issue, i) => (
                            <div 
                              key={i}
                              className="flex items-center justify-between gap-4 bg-[#0A1628] rounded-lg px-3 py-2"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${severityConfig[issue.severity].color}`} />
                                <span className="text-sm text-gray-300 truncate">{issue.message}</span>
                              </div>
                              <div className="shrink-0">
                                {issue.type === "no_family" && (
                                  <Button
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); handleQuickFix(athlete.athlete_id, "create_family") }}
                                    disabled={fixing === `${athlete.athlete_id}-create_family`}
                                    className="bg-[#D3B574] hover:bg-[#c4a665] text-[#0A1628] text-xs"
                                  >
                                    {fixing === `${athlete.athlete_id}-create_family` ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <>
                                        <UserPlus className="h-3 w-3 mr-1" />
                                        Create Family
                                      </>
                                    )}
                                  </Button>
                                )}
                                {issue.type === "has_donations_no_family" && (
                                  <Button
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); handleQuickFix(athlete.athlete_id, "create_family") }}
                                    disabled={fixing === `${athlete.athlete_id}-create_family`}
                                    className="bg-red-600 hover:bg-red-700 text-white text-xs"
                                  >
                                    {fixing === `${athlete.athlete_id}-create_family` ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <>
                                        <UserPlus className="h-3 w-3 mr-1" />
                                        Fix Now
                                      </>
                                    )}
                                  </Button>
                                )}
                                {issue.type === "page_inactive" && (
                                  <Button
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); handleQuickFix(athlete.athlete_id, "activate_page") }}
                                    disabled={fixing === `${athlete.athlete_id}-activate_page`}
                                    className="bg-[#D3B574] hover:bg-[#c4a665] text-[#0A1628] text-xs"
                                  >
                                    {fixing === `${athlete.athlete_id}-activate_page` ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <>
                                        <Check className="h-3 w-3 mr-1" />
                                        Activate
                                      </>
                                    )}
                                  </Button>
                                )}
                                {issue.type === "no_code" && (
                                  <Button
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); handleQuickFix(athlete.athlete_id, "generate_code") }}
                                    disabled={fixing === `${athlete.athlete_id}-generate_code`}
                                    className="bg-[#D3B574] hover:bg-[#c4a665] text-[#0A1628] text-xs"
                                  >
                                    {fixing === `${athlete.athlete_id}-generate_code` ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <>
                                        <Link2 className="h-3 w-3 mr-1" />
                                        Generate
                                      </>
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* View Full Profile */}
                        <div className="flex justify-end pt-2">
                          <a
                            href={`/prospects/${athlete.athlete_id}`}
                            className="text-sm text-[#D3B574] hover:underline flex items-center gap-1"
                          >
                            View athlete profile
                            <ArrowUpRight className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Quick Links to Other Tools */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-6 border-t border-[#1e3a5f]">
          <a 
            href="/admin/fundraising/donations"
            className="bg-[#0F1E32] rounded-xl border border-[#1e3a5f] p-4 hover:border-[#D3B574]/50 transition-colors group"
          >
            <Gift className="h-5 w-5 text-green-400 mb-2" />
            <p className="font-medium text-white text-sm group-hover:text-[#D3B574]">Donations</p>
            <p className="text-xs text-gray-500">Recent 100</p>
          </a>
          <a 
            href="/admin/fundraising/leaderboard"
            className="bg-[#0F1E32] rounded-xl border border-[#1e3a5f] p-4 hover:border-[#D3B574]/50 transition-colors group"
          >
            <Trophy className="h-5 w-5 text-[#D3B574] mb-2" />
            <p className="font-medium text-white text-sm group-hover:text-[#D3B574]">Leaderboard</p>
            <p className="text-xs text-gray-500">Top fundraisers</p>
          </a>
          <a 
            href="/admin/fundraising/activations"
            className="bg-[#0F1E32] rounded-xl border border-[#1e3a5f] p-4 hover:border-[#D3B574]/50 transition-colors group"
          >
            <FileText className="h-5 w-5 text-blue-400 mb-2" />
            <p className="font-medium text-white text-sm group-hover:text-[#D3B574]">Activations</p>
            <p className="text-xs text-gray-500">Page approvals</p>
          </a>
          <a 
            href="/admin/fundraising/wallets"
            className="bg-[#0F1E32] rounded-xl border border-[#1e3a5f] p-4 hover:border-[#D3B574]/50 transition-colors group"
          >
            <Wallet className="h-5 w-5 text-purple-400 mb-2" />
            <p className="font-medium text-white text-sm group-hover:text-[#D3B574]">Wallets</p>
            <p className="text-xs text-gray-500">Family balances</p>
          </a>
          <a 
            href="/admin/reimbursements"
            className="bg-[#0F1E32] rounded-xl border border-[#1e3a5f] p-4 hover:border-[#D3B574]/50 transition-colors group"
          >
            <Receipt className="h-5 w-5 text-orange-400 mb-2" />
            <p className="font-medium text-white text-sm group-hover:text-[#D3B574]">Reimburse</p>
            <p className="text-xs text-gray-500">Expense review</p>
          </a>
          <a 
            href="/admin/fundraising/ledger"
            className="bg-[#0F1E32] rounded-xl border border-[#1e3a5f] p-4 hover:border-[#D3B574]/50 transition-colors group"
          >
            <DollarSign className="h-5 w-5 text-gray-400 mb-2" />
            <p className="font-medium text-white text-sm group-hover:text-[#D3B574]">Ledger</p>
            <p className="text-xs text-gray-500">Audit trail</p>
          </a>
        </div>
      </div>
    </div>
  )
}
