"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarIcon, Clock, AlertCircle, TableIcon, LayoutDashboard, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

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
  schoolId: string
}

export function RecruitingActionsDashboard({ schoolId }: RecruitingActionsDashboardProps) {
  const [actions, setActions] = useState<RecruitingAction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<{ date: Date; activities: RecruitingAction[] } | null>(null)

  useEffect(() => {
    console.log("[v0] RecruitingActionsDashboard mounted with schoolId:", schoolId)
    fetchActions()
  }, [schoolId])

  const fetchActions = async () => {
    try {
      console.log("[v0] Fetching actions for schoolId:", schoolId)
      const response = await fetch(`/api/coach-portal/activities?schoolId=${schoolId}`)
      console.log("[v0] Fetch response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Received data:", data)
        console.log("[v0] Activities count:", data.activities?.length || 0)
        setActions(data.activities || [])
      } else {
        console.error("[v0] Fetch failed with status:", response.status)
      }
    } catch (error) {
      console.error("[v0] Error fetching actions:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const categorizeActions = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayActions: RecruitingAction[] = []
    const upcomingActions: RecruitingAction[] = []
    const overdueActions: RecruitingAction[] = []

    actions.forEach((action) => {
      const followUpDate = action.follow_up_date ? new Date(action.follow_up_date) : null

      if (!followUpDate) return

      const actionDate = new Date(followUpDate.getFullYear(), followUpDate.getMonth(), followUpDate.getDate())

      if (actionDate < today) {
        overdueActions.push(action)
      } else if (actionDate.getTime() === today.getTime()) {
        todayActions.push(action)
      } else {
        upcomingActions.push(action)
      }
    })

    console.log("[v0] Categorized actions:", {
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

    return actions.filter((action) => {
      const followUpDate = action.follow_up_date ? new Date(action.follow_up_date) : null
      if (!followUpDate) return false

      const actionDate = new Date(followUpDate.getFullYear(), followUpDate.getMonth(), followUpDate.getDate())
      return actionDate.getTime() === dateToCheck.getTime()
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
        <div className="flex items-center justify-center mb-6">
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
                      <div key={action.id} className="bg-white p-3 rounded-lg border border-blue-100">
                        <div className="flex items-start gap-3">
                          <img
                            src={action.athlete_photo || "/placeholder.svg?height=40&width=40"}
                            alt={action.athlete_name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900">{action.athlete_name}</p>
                            <p className="text-xs text-gray-600">{formatActionType(action.action_type)}</p>
                            {action.description && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{action.description}</p>
                            )}
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
                      <div key={action.id} className="bg-white p-3 rounded-lg border border-green-100">
                        <div className="flex items-start gap-3">
                          <img
                            src={action.athlete_photo || "/placeholder.svg?height=40&width=40"}
                            alt={action.athlete_name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900">{action.athlete_name}</p>
                            <p className="text-xs text-gray-600">{formatActionType(action.action_type)}</p>
                            <p className="text-xs text-green-600 font-medium mt-1">
                              {formatDate(action.follow_up_date!)}
                            </p>
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
                      <div key={action.id} className="bg-white p-3 rounded-lg border border-red-100">
                        <div className="flex items-start gap-3">
                          <img
                            src={action.athlete_photo || "/placeholder.svg?height=40&width=40"}
                            alt={action.athlete_name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900">{action.athlete_name}</p>
                            <p className="text-xs text-gray-600">{formatActionType(action.action_type)}</p>
                            <p className="text-xs text-red-600 font-medium mt-1">
                              {formatDate(action.follow_up_date!)}
                            </p>
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
                      </tr>
                    </thead>
                    <tbody>
                      {actions.map((action) => (
                        <tr key={action.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <img
                                src={action.athlete_photo || "/placeholder.svg?height=32&width=32"}
                                alt={action.athlete_name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                              <span className="font-medium text-sm">{action.athlete_name}</span>
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
              <Card key={activity.id} className="border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <img
                      src={activity.athlete_photo || "/placeholder.svg?height=48&width=48"}
                      alt={activity.athlete_name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-900">{activity.athlete_name}</h4>
                          <p className="text-sm text-gray-600">{activity.coach_name}</p>
                        </div>
                        <Badge variant="outline">{formatActionType(activity.action_type)}</Badge>
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
    </>
  )
}
