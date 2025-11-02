"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Search,
  User,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Edit,
  RefreshCw,
  AlertTriangle,
  ImageIcon,
  Calendar,
  UserX,
  Shield,
  LogIn,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@/contexts/auth-context"

interface LiamRecord {
  id: string
  name: string
  college?: string
  highschool?: string
  graduationyear?: number
  weightclass?: string
  gender?: string
  commitmentdate?: string
  photourl?: string
  image_url?: string
  commitmentPhotoUrl?: string
  claimed_by_user_id?: string
  claimed_at?: string
  profile_verified?: boolean
  user_email?: string
  user_full_name?: string
  user_is_admin?: boolean
  is_claimed_by_current_user?: boolean
  created_at?: string
  updated_at?: string
}

interface DebugData {
  currentUser: {
    id: string
    email: string
  }
  liamRecords: LiamRecord[]
  totalRecords: number
  claimedRecords: number
  userProfiles: any[]
}

function getClaimStatusInfo(record: LiamRecord) {
  if (!record.claimed_by_user_id) {
    return {
      icon: XCircle,
      color: "text-gray-500",
      text: "Unclaimed",
      bgColor: "bg-gray-100",
      variant: "secondary" as const,
    }
  }

  if (record.is_claimed_by_current_user) {
    if (record.profile_verified) {
      return {
        icon: CheckCircle,
        color: "text-green-600",
        text: "Claimed & Verified (You)",
        bgColor: "bg-green-100",
        variant: "default" as const,
      }
    }
    return {
      icon: Clock,
      color: "text-blue-600",
      text: "Claimed (You)",
      bgColor: "bg-blue-100",
      variant: "secondary" as const,
    }
  }

  return {
    icon: User,
    color: "text-orange-600",
    text: "Claimed by Other",
    bgColor: "bg-orange-100",
    variant: "secondary" as const,
  }
}

function formatDate(dateString?: string) {
  if (!dateString) return "Never"
  try {
    return new Date(dateString).toLocaleString()
  } catch {
    return dateString
  }
}

function AthleteImageComponent({ photoUrl, name }: { photoUrl?: string; name: string }) {
  const [imageError, setImageError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const getImageSrc = () => {
    if (imageError || !photoUrl) {
      return "/placeholder.svg?height=40&width=40&text=" + encodeURIComponent(name.charAt(0))
    }
    return photoUrl
  }

  return (
    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-100">
      <Image
        src={getImageSrc() || "/placeholder.svg"}
        alt={`${name} photo`}
        fill
        className="object-cover"
        onError={() => setImageError(true)}
        onLoad={() => setIsLoading(false)}
      />
      {isLoading && <div className="absolute inset-0 bg-gray-200 animate-pulse" />}
    </div>
  )
}

export default function LiamProfileDebugPage() {
  const { user, loading: authLoading } = useAuth()
  const [data, setData] = useState<DebugData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFixing, setIsFixing] = useState(false)
  const [newPhotoUrl, setNewPhotoUrl] = useState("/wrestler-liam-hickey.png")
  const [newCommitmentDate, setNewCommitmentDate] = useState("2024-12-15")
  const { toast } = useToast()

  useEffect(() => {
    if (!authLoading && user) {
      fetchData()
    } else if (!authLoading && !user) {
      setIsLoading(false)
    }
  }, [user, authLoading])

  // Show authentication required if not logged in
  if (authLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Checking authentication...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto py-6">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5" />
              Authentication Required
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">You need to be signed in to access this debug page.</p>
            <Link href="/auth/signin">
              <Button>
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/debug/liam-profile-check")
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: `Failed to load Liam's profile data: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFix = async (action: string, athleteId: string, updates?: any) => {
    setIsFixing(true)
    try {
      const response = await fetch("/api/debug/fix-liam-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          athleteId,
          updates,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const result = await response.json()
      toast({
        title: "Success",
        description: result.message || `Successfully ${action.replace("_", " ")}`,
      })

      // Refresh data
      await fetchData()
    } catch (error) {
      console.error("Error fixing data:", error)
      toast({
        title: "Error",
        description: `Failed to fix data: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      })
    } finally {
      setIsFixing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading Liam's profile data...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p>Failed to load data</p>
          <Button onClick={fetchData} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">🔍 Liam Hickey Profile Debug</h1>
        <p className="text-gray-600">Debug and fix Liam's profile data inconsistencies</p>
      </div>

      {/* Current User Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Current User
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="font-medium">Logged in as: {data.currentUser.email}</p>
            <p className="text-sm text-gray-600">User ID: {data.currentUser.id}</p>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Records</p>
                <p className="text-2xl font-bold">{data.totalRecords}</p>
              </div>
              <Search className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Claimed Records</p>
                <p className="text-2xl font-bold text-blue-600">{data.claimedRecords}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Issues Found</p>
                <p className="text-2xl font-bold text-red-600">
                  {data.liamRecords.filter((r) => !r.photourl || r.commitmentdate?.includes("2025")).length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fix Tools */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Quick Fix Tools
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Fix Photo URL</label>
              <div className="flex gap-2">
                <Input placeholder="Photo URL" value={newPhotoUrl} onChange={(e) => setNewPhotoUrl(e.target.value)} />
                <Button
                  onClick={() =>
                    data.liamRecords[0] && handleFix("fix_photo", data.liamRecords[0].id, { photoUrl: newPhotoUrl })
                  }
                  disabled={isFixing || !data.liamRecords[0]}
                  size="sm"
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Fix Commitment Date</label>
              <div className="flex gap-2">
                <Input type="date" value={newCommitmentDate} onChange={(e) => setNewCommitmentDate(e.target.value)} />
                <Button
                  onClick={() =>
                    data.liamRecords[0] &&
                    handleFix("fix_date", data.liamRecords[0].id, { commitmentDate: newCommitmentDate })
                  }
                  disabled={isFixing || !data.liamRecords[0]}
                  size="sm"
                >
                  <Calendar className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Liam Hickey Records ({data.liamRecords.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {data.liamRecords.length === 0 ? (
            <p className="text-center py-8 text-gray-600">No Liam Hickey records found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Photo</TableHead>
                    <TableHead>Name & Details</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Claimed By</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Issues</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.liamRecords.map((record) => {
                    const status = getClaimStatusInfo(record)
                    const StatusIcon = status.icon
                    const hasPhotoIssue = !record.photourl || record.photourl.includes("placeholder")
                    const hasDateIssue = record.commitmentdate?.includes("2025")

                    return (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div className="relative">
                            <AthleteImageComponent photoUrl={record.photourl} name={record.name} />
                            {hasPhotoIssue && (
                              <AlertTriangle className="absolute -top-1 -right-1 h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{record.name}</p>
                            <p className="text-xs text-gray-500">ID: {record.id}</p>
                            <p className="text-xs text-gray-500">
                              {record.college} • {record.highschool}
                            </p>
                            <p className="text-xs text-gray-500">
                              {record.graduationyear} • {record.weightclass} • {record.gender}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant} className={`${status.bgColor} ${status.color}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.text}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {record.user_email ? (
                            <div>
                              <p className="text-sm font-medium">{record.user_full_name || "Unknown"}</p>
                              <p className="text-xs text-gray-500">{record.user_email}</p>
                              {record.user_is_admin && (
                                <Badge variant="outline" className="text-xs">
                                  Admin
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            <p>
                              <span className="font-medium">Commitment:</span>{" "}
                              <span className={hasDateIssue ? "text-red-600 font-medium" : ""}>
                                {formatDate(record.commitmentdate)}
                              </span>
                            </p>
                            <p>
                              <span className="font-medium">Claimed:</span> {formatDate(record.claimed_at)}
                            </p>
                            <p>
                              <span className="font-medium">Created:</span> {formatDate(record.created_at)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {hasPhotoIssue && (
                              <Badge variant="destructive" className="text-xs">
                                No Photo
                              </Badge>
                            )}
                            {hasDateIssue && (
                              <Badge variant="destructive" className="text-xs">
                                Future Date
                              </Badge>
                            )}
                            {!record.profile_verified && record.claimed_by_user_id && (
                              <Badge variant="outline" className="text-xs">
                                Unverified
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex gap-1">
                              <Link href={`/athletes/${record.id}`}>
                                <Button size="sm" variant="outline">
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </Link>
                              <Link href={`/admin/athletes/edit/${record.id}`}>
                                <Button size="sm" variant="outline">
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </Link>
                            </div>
                            <div className="flex gap-1">
                              {record.claimed_by_user_id && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleFix("unclaim_profile", record.id)}
                                  disabled={isFixing}
                                >
                                  <UserX className="h-3 w-3" />
                                </Button>
                              )}
                              {!record.is_claimed_by_current_user && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleFix("claim_as_admin", record.id)}
                                  disabled={isFixing}
                                >
                                  <Shield className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Refresh Button */}
      <div className="mt-6 text-center">
        <Button onClick={fetchData} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh Data
        </Button>
      </div>
    </div>
  )
}
