"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarIcon, Clock, AlertCircle, TableIcon, LayoutDashboard, ChevronLeft, ChevronRight, Edit, X, Check, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface RecruitingAction {
  id: string
  action_type: string
  action_date: string
  follow_up_date: string | null
  description: string
  outcome: string | null
  athlete_id: string
  coach_user_id: string
  athlete_name: string
  athlete_photo: string
  coach_name: string
}

interface RecruitingActionsDashboardProps {
  schoolId?: string
  athletes?: { id: string; name: string }[] // Optional: pass athletes from parent (e.g., prospects from portal)
}

export function RecruitingActionsDashboard({ schoolId, athletes: providedAthletes }: RecruitingActionsDashboardProps) {
  const [actions, setActions] = useState<RecruitingAction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<{ date: Date; activities: RecruitingAction[] } | null>(null)
  const [editingAction, setEditingAction] = useState<RecruitingAction | null>(null)
  const [editFormData, setEditFormData] = useState({
    actionType: "",
    actionDate: "",
    followUpDate: "",
    description: "",
    outcome: "",
  })
  const [creatingActivity, setCreatingActivity] = useState(false)
  const [newActivityForm, setNewActivityForm] = useState({
    athleteId: "",
    actionType: "",
    actionDate: "",
    followUpDate: "",
    description: "",
    outcome: "",
  })
  const [availableAthletes, setAvailableAthletes] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    console.log("[v0] RecruitingActionsDashboard mounted with schoolId:", schoolId)
    fetchActions()
    
    // If athletes are provided as prop, use those; otherwise fetch
    if (providedAthletes && providedAthletes.length > 0) {
      console.log("[v0] Using provided athletes:", providedAthletes.length)
      setAvailableAthletes(providedAthletes)
    } else {
      fetchAthletes()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, providedAthletes])

  const fetchAthletes = async () => {
    // Skip if we're using schoolId - athletes for school portals come from prospects API
    // The starred-athletes API requires a school_id on the profile, which admins don't have
    if (schoolId && typeof schoolId === "string" && schoolId.trim().length > 0) {
      console.log("[v0] Skipping starred-athletes fetch - using schoolId, athletes will come from prospects")
      return
    }
    
    try {
      const response = await fetch("/api/coaches/starred-athletes")
      if (response.ok) {
        const data = await response.json()
        const athletes = (data.athletes || []).map((a: any) => ({
          id: a.id,
          name: a.name,
        }))
        setAvailableAthletes(athletes)
      } else {
        // Silently fail - this is OK for admins or when schoolId is used
        console.log("[v0] starred-athletes fetch failed (this is OK for admins or school portals):", response.status)
      }
    } catch (error) {
      // Silently fail - this is OK for admins or when schoolId is used
      console.log("[v0] Error fetching athletes (this is OK for admins or school portals):", error)
    }
  }

  const fetchActions = async () => {
    try {
      let url = ""
      // Only use schoolId if it's a non-empty string
      if (schoolId && typeof schoolId === "string" && schoolId.trim().length > 0) {
        console.log("[v0] Fetching actions for schoolId:", schoolId)
        url = `/api/coach-portal/activities?schoolId=${encodeURIComponent(schoolId)}`
      } else {
        console.log("[v0] Fetching actions for current coach")
        url = `/api/coaches/all-actions`
      }
      
      const response = await fetch(url)
      console.log("[v0] Fetch response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Received data:", data)
        // Handle both response formats: { activities: [] } and { actions: [] }
        const activities = data.activities || data.actions || []
        console.log("[v0] Activities count:", activities.length)
        setActions(activities)
      } else {
        console.error("[v0] Fetch failed with status:", response.status)
        const errorText = await response.text()
        console.error("[v0] Error response:", errorText)
      }
    } catch (error) {
      console.error("[v0] Error fetching actions:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const categorizeActions = () => {
    const now = new Date()
    // Normalize today to midnight to avoid timezone issues
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    today.setHours(0, 0, 0, 0)

    const todayActions: RecruitingAction[] = []
    const upcomingActions: RecruitingAction[] = []
    const overdueActions: RecruitingAction[] = []
    const needsFollowUpDate: RecruitingAction[] = []

    console.log("[v0] Total actions to categorize:", actions.length)
    console.log("[v0] Today date:", today.toISOString())

    actions.forEach((action) => {
      // If action has a follow_up_date, categorize by that date
      if (action.follow_up_date) {
        const followUpDate = new Date(action.follow_up_date)
        // Normalize to midnight for comparison
        const actionDate = new Date(followUpDate.getFullYear(), followUpDate.getMonth(), followUpDate.getDate())
        actionDate.setHours(0, 0, 0, 0)

        const daysDiff = Math.floor((actionDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        if (daysDiff < 0) {
          overdueActions.push(action)
        } else if (daysDiff === 0) {
          todayActions.push(action)
        } else {
          upcomingActions.push(action)
        }
      } else {
        // Actions without follow_up_date - show in upcoming (they need attention/scheduling)
        console.log("[v0] Action has no follow_up_date, adding to upcoming:", action.id, action.action_date)
        needsFollowUpDate.push(action)
        // Show all actions without follow-up dates in upcoming so they get attention
        upcomingActions.push(action)
      }
    })

    console.log("[v0] Categorized actions:", {
      total: actions.length,
      withFollowUp: actions.filter(a => a.follow_up_date).length,
      withoutFollowUp: needsFollowUpDate.length,
      today: todayActions.length,
      upcoming: upcomingActions.length,
      overdue: overdueActions.length,
    })

    return { todayActions, upcomingActions, overdueActions }
  }

  const { todayActions, upcomingActions, overdueActions } = categorizeActions()

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: (number | null)[] = []

    // Add empty cells for days before the first of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }

    return days
  }

  const getActivitiesForDate = (day: number) => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const dateToCheck = new Date(year, month, day)
    dateToCheck.setHours(0, 0, 0, 0)

    return actions.filter((action) => {
      // Check both follow_up_date and action_date for calendar display
      let dateToCompare: Date | null = null
      
      if (action.follow_up_date) {
        const followUpDate = new Date(action.follow_up_date)
        dateToCompare = new Date(followUpDate.getFullYear(), followUpDate.getMonth(), followUpDate.getDate())
      } else if (action.action_date) {
        // If no follow_up_date, use action_date so actions appear on calendar
        const actionDate = new Date(action.action_date)
        dateToCompare = new Date(actionDate.getFullYear(), actionDate.getMonth(), actionDate.getDate())
      }
      
      if (!dateToCompare) return false
      
      dateToCompare.setHours(0, 0, 0, 0)
      
      return dateToCompare.getTime() === dateToCheck.getTime()
    })
  }

  const formatActionType = (type: string) => {
    return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const handleDayClick = (day: number) => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const clickedDate = new Date(year, month, day)
    const dayActivities = getActivitiesForDate(day)

    if (dayActivities.length > 0) {
      setSelectedDay({ date: clickedDate, activities: dayActivities })
    }
  }

  const handleComplete = async (actionId: string) => {
    try {
      const action = actions.find(a => a.id === actionId)
      if (!action) return

      const response = await fetch("/api/coach-portal/activities", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityId: actionId,
          actionType: action.action_type,
          actionDate: action.action_date,
          followUpDate: action.follow_up_date || null,
          description: action.description,
          outcome: "Completed",
        }),
      })

      if (response.ok) {
        fetchActions() // Refresh actions
      }
    } catch (error) {
      console.error("Error completing action:", error)
    }
  }

  const handleDelete = async (actionId: string) => {
    if (!confirm("Are you sure you want to delete this activity?")) return

    try {
      const response = await fetch(`/api/coach-portal/activities?activityId=${actionId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchActions() // Refresh actions
      }
    } catch (error) {
      console.error("Error deleting action:", error)
    }
  }

  const handleEdit = (action: RecruitingAction) => {
    setEditingAction(action)
    setEditFormData({
      actionType: action.action_type,
      actionDate: action.action_date.split("T")[0],
      followUpDate: action.follow_up_date ? action.follow_up_date.split("T")[0] : "",
      description: action.description || "",
      outcome: action.outcome || "",
    })
  }

  const handleSaveEdit = async () => {
    if (!editingAction) return

    try {
      const response = await fetch("/api/coach-portal/activities", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityId: editingAction.id,
          actionType: editFormData.actionType,
          actionDate: editFormData.actionDate,
          followUpDate: editFormData.followUpDate || null,
          description: editFormData.description,
          outcome: editFormData.outcome || null,
        }),
      })

      if (response.ok) {
        setEditingAction(null)
        fetchActions() // Refresh actions
      }
    } catch (error) {
      console.error("Error updating action:", error)
    }
  }

  const isCompleted = (action: RecruitingAction) => {
    return action.outcome?.toLowerCase() === "completed"
  }

  const handleCreateActivity = () => {
    const today = new Date().toISOString().split("T")[0]
    setNewActivityForm({
      athleteId: "",
      actionType: "",
      actionDate: today,
      followUpDate: "",
      description: "",
      outcome: "",
    })
    setCreatingActivity(true)
  }

  const handleSaveNewActivity = async () => {
    if (!newActivityForm.athleteId || !newActivityForm.actionType || !newActivityForm.actionDate) {
      alert("Please fill in athlete, activity type, and action date")
      return
    }

    try {
      const response = await fetch("/api/coach-portal/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId: newActivityForm.athleteId,
          activityType: newActivityForm.actionType,
          activityDate: newActivityForm.actionDate,
          notes: newActivityForm.description,
          outcome: newActivityForm.outcome || null,
          followUpDate: newActivityForm.followUpDate || null,
        }),
      })

      if (response.ok) {
        setCreatingActivity(false)
        fetchActions() // Refresh activities
      }
    } catch (error) {
      console.error("Error creating activity:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <>
      <Tabs defaultValue="dashboard" className="w-full">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center justify-center flex-1">
            <TabsList className="bg-white border border-gray-200">
              <TabsTrigger value="dashboard" className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                Calendar
              </TabsTrigger>
              <TabsTrigger value="table" className="gap-2">
                <TableIcon className="h-4 w-4" />
                Table
              </TabsTrigger>
            </TabsList>
          </div>
          <Button onClick={handleCreateActivity} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Create Activity
          </Button>
        </div>

        {/* Dashboard Tab - Today's Follow-ups, Upcoming, Overdue */}
        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Today's Follow-ups */}
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  Today's Follow-ups
                  <Badge variant="secondary" className="ml-auto bg-blue-600 text-white">
                    {todayActions.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {todayActions.length === 0 ? (
                  <p className="text-sm text-gray-500">No follow-ups scheduled for today</p>
                ) : (
                  <div className="space-y-3">
                    {todayActions.map((action) => (
                      <div key={action.id} className={`bg-white p-3 rounded-lg border ${isCompleted(action) ? 'border-gray-200 opacity-60' : 'border-blue-100'}`}>
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isCompleted(action)}
                            onCheckedChange={() => handleComplete(action.id)}
                            className="mt-1"
                          />
                          <img
                            src={action.athlete_photo || "/placeholder.svg?height=40&width=40"}
                            alt={action.athlete_name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium text-sm ${isCompleted(action) ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{action.athlete_name}</p>
                            <p className="text-xs text-gray-600">{formatActionType(action.action_type)}</p>
                            {action.description && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{action.description}</p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => handleEdit(action)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                              onClick={() => handleDelete(action.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming */}
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-green-600" />
                  Upcoming
                  <Badge variant="secondary" className="ml-auto bg-green-600 text-white">
                    {upcomingActions.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingActions.length === 0 ? (
                  <p className="text-sm text-gray-500">No upcoming follow-ups</p>
                ) : (
                  <div className="space-y-3">
                    {upcomingActions.slice(0, 5).map((action) => (
                      <div key={action.id} className={`bg-white p-3 rounded-lg border ${isCompleted(action) ? 'border-gray-200 opacity-60' : 'border-green-100'}`}>
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isCompleted(action)}
                            onCheckedChange={() => handleComplete(action.id)}
                            className="mt-1"
                          />
                          <img
                            src={action.athlete_photo || "/placeholder.svg?height=40&width=40"}
                            alt={action.athlete_name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium text-sm ${isCompleted(action) ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{action.athlete_name}</p>
                            <p className="text-xs text-gray-600">{formatActionType(action.action_type)}</p>
                            <p className={`text-xs font-medium mt-1 ${action.follow_up_date ? 'text-green-600' : 'text-gray-500'}`}>
                              {action.follow_up_date ? formatDate(action.follow_up_date) : formatDate(action.action_date)}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => handleEdit(action)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                              onClick={() => handleDelete(action.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Overdue */}
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  Overdue
                  <Badge variant="secondary" className="ml-auto bg-red-600 text-white">
                    {overdueActions.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {overdueActions.length === 0 ? (
                  <p className="text-sm text-gray-500">No overdue actions</p>
                ) : (
                  <div className="space-y-3">
                    {overdueActions.map((action) => (
                      <div key={action.id} className={`bg-white p-3 rounded-lg border ${isCompleted(action) ? 'border-gray-200 opacity-60' : 'border-red-100'}`}>
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isCompleted(action)}
                            onCheckedChange={() => handleComplete(action.id)}
                            className="mt-1"
                          />
                          <img
                            src={action.athlete_photo || "/placeholder.svg?height=40&width=40"}
                            alt={action.athlete_name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium text-sm ${isCompleted(action) ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{action.athlete_name}</p>
                            <p className="text-xs text-gray-600">{formatActionType(action.action_type)}</p>
                            <p className="text-xs text-red-600 font-medium mt-1">
                              {formatDate(action.follow_up_date!)}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => handleEdit(action)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                              onClick={() => handleDelete(action.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Calendar Tab - Visual month calendar */}
        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={previousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="text-xl">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </CardTitle>
                <Button variant="outline" size="sm" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {/* Day headers */}
                {dayNames.map((day) => (
                  <div key={day} className="text-center font-semibold text-sm text-gray-600 py-2">
                    {day}
                  </div>
                ))}

                {/* Calendar days */}
                {generateCalendarDays().map((day, index) => {
                  const dayActivities = day ? getActivitiesForDate(day) : []
                  const isToday =
                    day &&
                    new Date().getDate() === day &&
                    new Date().getMonth() === currentDate.getMonth() &&
                    new Date().getFullYear() === currentDate.getFullYear()

                  return (
                    <div
                      key={index}
                      onClick={() => day && handleDayClick(day)}
                      className={`min-h-[80px] p-2 border rounded-lg ${
                        day ? "bg-white hover:bg-gray-50" : "bg-gray-50"
                      } ${isToday ? "border-blue-500 border-2" : "border-gray-200"} ${
                        dayActivities.length > 0 ? "cursor-pointer hover:shadow-md transition-shadow" : ""
                      }`}
                    >
                      {day && (
                        <>
                          <div className={`text-sm font-medium mb-1 ${isToday ? "text-blue-600" : "text-gray-900"}`}>
                            {day}
                          </div>
                          {dayActivities.length > 0 && (
                            <div className="space-y-1">
                              {dayActivities.slice(0, 2).map((activity) => (
                                <div
                                  key={activity.id}
                                  className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded truncate"
                                  title={`${activity.athlete_name} - ${formatActionType(activity.action_type)}`}
                                >
                                  {activity.athlete_name}
                                </div>
                              ))}
                              {dayActivities.length > 2 && (
                                <div className="text-xs text-gray-500 px-2">+{dayActivities.length - 2} more</div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Table Tab - List view */}
        <TabsContent value="table">
          <Card>
            <CardHeader>
              <CardTitle>All Activities</CardTitle>
            </CardHeader>
            <CardContent>
              {actions.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No activities scheduled</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Athlete</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Coach</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Activity Type</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Date</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Follow-up</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Description</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {actions.map((action) => (
                        <tr key={action.id} className={`border-b hover:bg-gray-50 ${isCompleted(action) ? 'opacity-60' : ''}`}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={isCompleted(action)}
                                onCheckedChange={() => handleComplete(action.id)}
                              />
                              <img
                                src={action.athlete_photo || "/placeholder.svg?height=32&width=32"}
                                alt={action.athlete_name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                              <span className={`font-medium text-sm ${isCompleted(action) ? 'text-gray-400 line-through' : ''}`}>{action.athlete_name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">{action.coach_name}</td>
                          <td className="py-3 px-4">
                            <Badge variant="outline">{formatActionType(action.action_type)}</Badge>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">{formatDate(action.action_date)}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {action.follow_up_date ? formatDate(action.follow_up_date) : "-"}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 max-w-xs truncate">
                            {action.description || "-"}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleEdit(action)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                onClick={() => handleDelete(action.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {selectedDay &&
                selectedDay.date.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {selectedDay?.activities.map((activity) => (
              <Card key={activity.id} className={`border-gray-200 ${isCompleted(activity) ? 'opacity-60' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={isCompleted(activity)}
                      onCheckedChange={() => handleComplete(activity.id)}
                      className="mt-1"
                    />
                    <img
                      src={activity.athlete_photo || "/placeholder.svg?height=48&width=48"}
                      alt={activity.athlete_name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className={`font-semibold ${isCompleted(activity) ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{activity.athlete_name}</h4>
                          <p className="text-sm text-gray-600">{activity.coach_name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{formatActionType(activity.action_type)}</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => handleEdit(activity)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(activity.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {activity.description && <p className="text-sm text-gray-700 mb-2">{activity.description}</p>}
                      {activity.outcome && (
                        <div className="text-sm">
                          <span className="font-medium text-gray-700">Outcome: </span>
                          <span className="text-gray-600">{activity.outcome}</span>
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-2">Logged: {formatDate(activity.action_date)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Activity Dialog */}
      <Dialog open={!!editingAction} onOpenChange={(open) => !open && setEditingAction(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Activity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="actionType">Activity Type</Label>
              <Select value={editFormData.actionType} onValueChange={(value) => setEditFormData({ ...editFormData, actionType: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select activity type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone_call">Phone Call</SelectItem>
                  <SelectItem value="text_message">Text Message</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="campus_visit">Campus Visit</SelectItem>
                  <SelectItem value="tournament_visit">Tournament Visit</SelectItem>
                  <SelectItem value="home_visit">Home Visit</SelectItem>
                  <SelectItem value="offer_extended">Offer Extended</SelectItem>
                  <SelectItem value="scholarship_discussion">Scholarship Discussion</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="actionDate">Action Date</Label>
              <Input
                id="actionDate"
                type="date"
                value={editFormData.actionDate}
                onChange={(e) => setEditFormData({ ...editFormData, actionDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="followUpDate">Follow-up Date (Optional)</Label>
              <Input
                id="followUpDate"
                type="date"
                value={editFormData.followUpDate}
                onChange={(e) => setEditFormData({ ...editFormData, followUpDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                rows={3}
                placeholder="Enter description..."
              />
            </div>
            <div>
              <Label htmlFor="outcome">Outcome (Optional)</Label>
              <Input
                id="outcome"
                value={editFormData.outcome}
                onChange={(e) => setEditFormData({ ...editFormData, outcome: e.target.value })}
                placeholder="e.g., Completed, No response, etc."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditingAction(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Activity Dialog */}
      <Dialog open={creatingActivity} onOpenChange={(open) => !open && setCreatingActivity(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Activity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="newAthlete">Athlete *</Label>
              <Select value={newActivityForm.athleteId} onValueChange={(value) => setNewActivityForm({ ...newActivityForm, athleteId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select athlete" />
                </SelectTrigger>
                <SelectContent>
                  {availableAthletes.map((athlete) => (
                    <SelectItem key={athlete.id} value={athlete.id}>
                      {athlete.name}
                    </SelectItem>
                  ))}
                  {availableAthletes.length === 0 && (
                    <SelectItem value="" disabled>No athletes available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="newActionType">Activity Type *</Label>
              <Select value={newActivityForm.actionType} onValueChange={(value) => setNewActivityForm({ ...newActivityForm, actionType: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select activity type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone_call">Phone Call</SelectItem>
                  <SelectItem value="text_message">Text Message</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="campus_visit">Campus Visit</SelectItem>
                  <SelectItem value="tournament_visit">Tournament Visit</SelectItem>
                  <SelectItem value="home_visit">Home Visit</SelectItem>
                  <SelectItem value="offer_extended">Offer Extended</SelectItem>
                  <SelectItem value="scholarship_discussion">Scholarship Discussion</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="newActionDate">Action Date *</Label>
              <Input
                id="newActionDate"
                type="date"
                value={newActivityForm.actionDate}
                onChange={(e) => setNewActivityForm({ ...newActivityForm, actionDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="newFollowUpDate">Follow-up Date (Optional)</Label>
              <Input
                id="newFollowUpDate"
                type="date"
                value={newActivityForm.followUpDate}
                onChange={(e) => setNewActivityForm({ ...newActivityForm, followUpDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="newDescription">Description</Label>
              <Textarea
                id="newDescription"
                value={newActivityForm.description}
                onChange={(e) => setNewActivityForm({ ...newActivityForm, description: e.target.value })}
                rows={3}
                placeholder="Enter description..."
              />
            </div>
            <div>
              <Label htmlFor="newOutcome">Outcome (Optional)</Label>
              <Input
                id="newOutcome"
                value={newActivityForm.outcome}
                onChange={(e) => setNewActivityForm({ ...newActivityForm, outcome: e.target.value })}
                placeholder="e.g., Completed, No response, etc."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCreatingActivity(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveNewActivity}>Create Activity</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
