"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Clock, User, TrendingUp, TrendingDown } from "lucide-react"
import { AdminHeader } from "@/components/admin-header"

interface AuditLog {
  id: string
  athlete_id: string
  athlete_name: string
  firstName: string
  lastName: string
  old_ranking: number | null
  new_ranking: number | null
  graduation_year: number
  gender: string
  changed_by_name: string
  changed_by_email: string
  change_reason: string | null
  created_at: string
}

export default function AuditLogsPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([])

  useEffect(() => {
    fetchAuditLogs()
  }, [])

  useEffect(() => {
    if (searchTerm) {
      const filtered = auditLogs.filter(
        (log) =>
          log.athlete_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.changed_by_name?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setFilteredLogs(filtered)
    } else {
      setFilteredLogs(auditLogs)
    }
  }, [searchTerm, auditLogs])

  const fetchAuditLogs = async () => {
    try {
      const response = await fetch("/api/admin/audit-logs")
      if (response.ok) {
        const data = await response.json()
        setAuditLogs(data.auditLogs || [])
      }
    } catch (error) {
      console.error("Error fetching audit logs:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getRankingChange = (oldRanking: number | null, newRanking: number | null) => {
    if (oldRanking === null && newRanking !== null) {
      return { type: "new", text: `Ranked #${newRanking}`, icon: TrendingUp, color: "bg-green-100 text-green-800" }
    }
    if (oldRanking !== null && newRanking === null) {
      return { type: "removed", text: "Ranking removed", icon: TrendingDown, color: "bg-red-100 text-red-800" }
    }
    if (oldRanking !== null && newRanking !== null) {
      if (newRanking < oldRanking) {
        return {
          type: "up",
          text: `#${oldRanking} → #${newRanking}`,
          icon: TrendingUp,
          color: "bg-green-100 text-green-800",
        }
      } else {
        return {
          type: "down",
          text: `#${oldRanking} → #${newRanking}`,
          icon: TrendingDown,
          color: "bg-red-100 text-red-800",
        }
      }
    }
    return { type: "unknown", text: "Unknown change", icon: Clock, color: "bg-gray-100 text-gray-800" }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading audit logs...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Prospect Ranking Audit Logs</h1>
          <p className="text-gray-600">Track all changes to prospect rankings</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Audit Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                placeholder="Search by athlete name or admin..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <Button onClick={fetchAuditLogs} variant="outline">
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {filteredLogs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-gray-500">No audit logs found</p>
              </CardContent>
            </Card>
          ) : (
            filteredLogs.map((log) => {
              const change = getRankingChange(log.old_ranking, log.new_ranking)
              const ChangeIcon = change.icon

              return (
                <Card key={log.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{log.athlete_name || `${log.firstName} ${log.lastName}`}</h3>
                            <Badge variant="outline">
                              {log.graduation_year} • {log.gender}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <User className="h-4 w-4" />
                            <span>Changed by {log.changed_by_name}</span>
                            <Clock className="h-4 w-4 ml-2" />
                            <span>{formatDate(log.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={change.color}>
                          <ChangeIcon className="h-3 w-3 mr-1" />
                          {change.text}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
