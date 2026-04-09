import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const now = new Date()
    const timestamp = now.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"

    // Create events for next week to ensure they're visible
    const nextWeek = new Date()
    nextWeek.setDate(now.getDate() + 7)
    nextWeek.setHours(18, 0, 0, 0) // 6:00 PM local time
    const nextWeekStart = nextWeek.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"

    const nextWeekEnd = new Date(nextWeek)
    nextWeekEnd.setHours(20, 0, 0, 0) // 8:00 PM local time
    const nextWeekEndStr = nextWeekEnd.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"

    const followingWeek = new Date()
    followingWeek.setDate(now.getDate() + 14)
    followingWeek.setHours(9, 0, 0, 0) // 9:00 AM local time
    const followingWeekStart = followingWeek.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"

    const followingWeekEnd = new Date(followingWeek)
    followingWeekEnd.setHours(17, 0, 0, 0) // 5:00 PM local time
    const followingWeekEndStr = followingWeekEnd.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//NC United Wrestling//Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:NC United Wrestling
X-WR-CALDESC:NC United Wrestling Events Calendar
X-WR-TIMEZONE:America/New_York

BEGIN:VEVENT
UID:wrestling-practice-${nextWeek.getTime()}@ncwrestlingunited.com
DTSTART:${nextWeekStart}
DTEND:${nextWeekEndStr}
DTSTAMP:${timestamp}
SUMMARY:NC United Wrestling Practice
DESCRIPTION:Regular wrestling practice session for all teams
LOCATION:NC United Wrestling Club
CATEGORIES:PRACTICE
STATUS:CONFIRMED
TRANSP:OPAQUE
END:VEVENT

BEGIN:VEVENT
UID:wrestling-tournament-${followingWeek.getTime()}@ncwrestlingunited.com
DTSTART:${followingWeekStart}
DTEND:${followingWeekEndStr}
DTSTAMP:${timestamp}
SUMMARY:NC United Wrestling Tournament
DESCRIPTION:Weekend wrestling tournament - all skill levels welcome
LOCATION:Regional Sports Complex
CATEGORIES:TOURNAMENT
STATUS:CONFIRMED
TRANSP:OPAQUE
END:VEVENT

END:VCALENDAR`

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="nc-united-wrestling.ics"',
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    })
  } catch (error) {
    // Return a minimal working calendar even on error
    const errorICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//NC United Wrestling//Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:NC United Wrestling (Error)

BEGIN:VEVENT
UID:error-event@ncwrestlingunited.com
DTSTART:20250725T120000Z
DTEND:20250725T130000Z
DTSTAMP:20250717T170000Z
SUMMARY:Calendar Error - Please Contact Support
DESCRIPTION:There was an error loading the wrestling calendar
LOCATION:NC United Wrestling Club
STATUS:CONFIRMED
END:VEVENT

END:VCALENDAR`

    return new NextResponse(errorICS, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="nc-united-wrestling-error.ics"',
      },
    })
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}
