"use client"

import { useState, useEffect } from "react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Users, Shield, ShieldCheck, AlertCircle, Database, Settings, Loader2, RefreshCw, Download, Mail, LayoutDashboard } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { HardLink } from "@/components/hard-link"
import { cn } from "@/lib/utils"

interface User {
  id: number
  user_id: string
  email: string
  name: string
  role: string
  cell_phone: string
  is_admin: boolean
  created_at: string
  updated_at: string
  last_login_at: string | null
}

export default function UsersPage() {
  const { user: currentUser, isAuthenticated, isLoading: authLoading } = useAuth()
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [editingUserId, setEditingUserId] = useState<number | null>(null)
  const [updating, setUpdating] = useState(false)
  const [signedUpToday, setSignedUpToday] = useState(false)
  const [loggedInToday, setLoggedInToday] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("Fetching users, current user:", currentUser?.email)

      const params = new URLSearchParams()
      if (signedUpToday) params.append("signedUpToday", "true")
      if (loggedInToday) params.append("loggedInToday", "true")

      const response = await fetch(`/api/admin/users?${params.toString()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      console.log("Response status:", response.status)
      const data = await response.json()
      console.log("Response data:", data)

      if (!response.ok) {
        if (response.status === 401) {
          setError("You must be logged in to view this page")
          return
        }
        if (response.status === 403) {
          setError("You must be an admin to view this page")
          return
        }
        if (data.needsSetup) {
          setNeedsSetup(true)
          return
        }
        throw new Error(data.error || "Failed to fetch users")
      }

      setUsers(data.users || [])
      setNeedsSetup(false)
    } catch (err: any) {
      console.error("Error fetching users:", err)
      setError(err.message || "Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchUsers()
    } else if (!authLoading && !isAuthenticated) {
      setError("You must be logged in to view this page")
      setLoading(false)
    }
  }, [isAuthenticated, authLoading, signedUpToday, loggedInToday])

  const updateUserRole = async (userId: number, newRole: string) => {
    try {
      setUpdating(true)
      const user = users.find((u) => u.id === userId)
      if (!user) return

      const response = await fetch("/api/admin/users/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: userId,
          name: user.name,
          role: newRole,
          cell_phone: user.cell_phone,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update user")
      }

      await fetchUsers()
      setEditingUserId(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUpdating(false)
    }
  }

  const toggleAdmin = async (user: User) => {
    try {
      setUpdating(true)
      const response = await fetch("/api/admin/users/toggle-admin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          is_admin: !user.is_admin,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to toggle admin status")
      }

      await fetchUsers()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUpdating(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never"
    try {
      return new Date(dateString).toLocaleDateString()
    } catch {
      return "Invalid date"
    }
  }

  const handleExportCSV = async () => {
    try {
      const res = await fetch("/api/admin/users/export-csv", {
        method: "GET",
        credentials: "include"
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Failed to export" }))
        throw new Error(errorData.error || "Failed to export users")
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Success",
        description: "Users exported successfully"
      })
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Failed to export users",
        variant: "destructive"
      })
    }
  }

  const handleExportEmailsTxt = async () => {
    try {
      const res = await fetch("/api/admin/users/export-csv?format=emails-txt", {
        method: "GET",
        credentials: "include"
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Failed to export" }))
        throw new Error(errorData.error || "Failed to export emails")
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `recruitnc-account-emails-${new Date().toISOString().split("T")[0]}.txt`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Downloaded",
        description: "Emails saved as .txt (one per line)."
      })
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Failed to download emails",
        variant: "destructive"
      })
    }
  }

  const filteredUsers = users.filter(
    (user) =>
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const usersByRole = filteredUsers.reduce(
    (acc, user) => {
      const role = user.role || "other"
      if (!acc[role]) acc[role] = []
      acc[role].push(user)
      return acc
    },
    {} as Record<string, User[]>,
  )

  const roleOrder = ["admin", "college coach", "coach", "wrestler", "parent", "referee", "fan", "other"]
  const sortedRoles = Object.keys(usersByRole).sort((a, b) => {
    const aIndex = roleOrder.indexOf(a.toLowerCase())
    const bIndex = roleOrder.indexOf(b.toLowerCase())
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b)
    if (aIndex === -1) return 1
    if (bIndex === -1) return -1
    return aIndex - bIndex
  })

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show login required if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-6 w-6" />
              Authentication Required
            </CardTitle>
            <CardDescription>You must be logged in to access the user management system.</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Please sign in to continue.</AlertDescription>
            </Alert>
            <Link href="/auth/signin">
              <Button className="w-full">Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (needsSetup) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-6 w-6" />
              Setup Required
            </CardTitle>
            <CardDescription>The user_profiles table needs to be created before you can manage users.</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                The user management system requires the user_profiles table to be set up first.
              </AlertDescription>
            </Alert>
            <Link href="/admin/create-user-profiles-table-complete">
              <Button className="w-full">
                <Settings className="h-4 w-4 mr-2" />
                Set Up User Profiles Table
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading users...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-6 w-6" />
                User Management ({filteredUsers.length} users)
              </CardTitle>
              <CardDescription>
                Manage user accounts, roles, and permissions. Currently logged in as: {currentUser?.email}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={handleExportEmailsTxt} variant="outline" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Emails (.txt)
              </Button>
              <Button onClick={handleExportCSV} variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 bg-transparent"
                onClick={() => {
                  setError(null)
                  fetchUsers()
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </Alert>
          )}

          <div className="mb-6 space-y-4">
            <Input
              placeholder="Search by name, email, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />

            <div className="flex flex-wrap gap-6">
              <div className="flex items-center space-x-2">
                <Switch id="signed-up-today" checked={signedUpToday} onCheckedChange={setSignedUpToday} />
                <Label htmlFor="signed-up-today">Signed up today</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="logged-in-today" checked={loggedInToday} onCheckedChange={setLoggedInToday} />
                <Label htmlFor="logged-in-today">Logged in today</Label>
              </div>

              <Button variant="outline" size="sm" onClick={fetchUsers}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            {sortedRoles.map((role) => (
              <div key={role} className="space-y-2">
                <h3 className="text-lg font-semibold capitalize flex items-center gap-2">
                  {role} <Badge variant="secondary">{usersByRole[role].length}</Badge>
                </h3>
                <div className="space-y-2">
                  {usersByRole[role].map((user) => (
                    <div key={user.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-semibold">{user.name || "N/A"}</div>
                          <div className="text-sm text-gray-600">{user.email}</div>
                          <div className="text-sm text-gray-500">Phone: {user.cell_phone || "N/A"}</div>
                          <div className="text-xs text-gray-400">
                            Joined: {formatDate(user.created_at)} | Last Login: {formatDate(user.last_login_at)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <HardLink
                            href={`/admin/users/${user.user_id}/crm`}
                            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "no-underline shrink-0")}
                            title="CRM hub (read-only snapshot)"
                          >
                            <LayoutDashboard className="h-4 w-4" />
                            Hub
                          </HardLink>
                          <Select
                            value={user.role}
                            onValueChange={(value) => updateUserRole(user.id, value)}
                            disabled={updating}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="parent">Parent</SelectItem>
                              <SelectItem value="fan">Fan</SelectItem>
                              <SelectItem value="referee">Referee</SelectItem>
                              <SelectItem value="college coach">College Coach</SelectItem>
                              <SelectItem value="coach">Coach</SelectItem>
                              <SelectItem value="wrestler">Wrestler</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>

                          <Badge variant={user.is_admin ? "default" : "secondary"}>
                            {user.is_admin ? (
                              <>
                                <ShieldCheck className="h-3 w-3 mr-1" />
                                Admin
                              </>
                            ) : (
                              <>
                                <Shield className="h-3 w-3 mr-1" />
                                User
                              </>
                            )}
                          </Badge>

                          <Button
                            variant={user.is_admin ? "destructive" : "default"}
                            size="sm"
                            onClick={() => toggleAdmin(user)}
                            disabled={updating}
                          >
                            {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {user.is_admin ? "Remove Admin" : "Make Admin"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {filteredUsers.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500">
                No users found.{" "}
                {searchTerm || signedUpToday || loggedInToday
                  ? "Try adjusting your filters."
                  : "Users will appear here after they sign up."}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
