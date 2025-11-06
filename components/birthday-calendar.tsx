"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Cake, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Prospect {
  id: string
  name: string
  birthdate?: string
  photourl?: string
  graduationyear?: number
  weightclass?: string
}

interface BirthdayCalendarProps {
  prospects: Prospect[]
  onAthleteClick?: (athleteId: string) => void
}

export function BirthdayCalendar({ prospects, onAthleteClick }: BirthdayCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  // Group birthdays by month-day
  const getBirthdaysByMonthDay = () => {
    const birthdays: Record<string, Prospect[]> = {}
    
    prospects.forEach(prospect => {
      if (prospect.birthdate) {
        try {
          const date = new Date(prospect.birthdate)
          const monthDay = `${date.getMonth()}-${date.getDate()}` // 0-based month
          if (!birthdays[monthDay]) {
            birthdays[monthDay] = []
          }
          birthdays[monthDay].push(prospect)
        } catch (e) {
          // Invalid date, skip
        }
      }
    })
    
    return birthdays
  }

  const birthdaysByMonthDay = getBirthdaysByMonthDay()

  // Get birthdays for current month
  const getBirthdaysForMonth = () => {
    const month = currentMonth.getMonth()
    const year = currentMonth.getFullYear()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    
    const monthBirthdays: { day: number; prospects: Prospect[] }[] = []
    
    for (let day = 1; day <= daysInMonth; day++) {
      const monthDay = `${month}-${day}`
      if (birthdaysByMonthDay[monthDay]) {
        monthBirthdays.push({
          day,
          prospects: birthdaysByMonthDay[monthDay]
        })
      }
    }
    
    return monthBirthdays.sort((a, b) => a.day - b.day)
  }

  const monthBirthdays = getBirthdaysForMonth()

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const goToToday = () => {
    setCurrentMonth(new Date())
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Cake className="h-5 w-5" />
            Recruit Birthdays
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={previousMonth}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="text-xs px-2"
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={nextMonth}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="text-lg font-semibold text-gray-700">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </div>
      </CardHeader>
      <CardContent>
        {monthBirthdays.length > 0 ? (
          <div className="space-y-3">
            {monthBirthdays.map(({ day, prospects }) => (
              <div key={day} className="border-l-4 border-l-blue-500 pl-4 py-2 bg-blue-50/50 rounded-r">
                <div className="text-sm font-semibold text-gray-900 mb-2">
                  {monthNames[currentMonth.getMonth()]} {day}
                </div>
                <div className="space-y-2">
                  {prospects.map(prospect => (
                    <div
                      key={prospect.id}
                      className="flex items-center gap-3 bg-white rounded-lg p-2 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => onAthleteClick?.(prospect.id)}
                    >
                      {prospect.photourl ? (
                        <img
                          src={prospect.photourl}
                          alt={prospect.name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <Cake className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 text-sm truncate">
                          {prospect.name}
                        </div>
                        <div className="text-xs text-gray-600">
                          {prospect.graduationyear && `Class of ${prospect.graduationyear}`}
                          {prospect.graduationyear && prospect.weightclass && " • "}
                          {prospect.weightclass && `${prospect.weightclass}lbs`}
                        </div>
                      </div>
                      <Cake className="h-5 w-5 text-blue-500" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Cake className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm italic">No birthdays in {monthNames[currentMonth.getMonth()]}</p>
            <p className="text-xs text-gray-400 mt-1">Add birthdates to see them here</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

