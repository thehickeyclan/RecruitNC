import { NextRequest, NextResponse } from "next/server"
import { QueryHandler } from "./index"
import { getCalendarSupabase } from "@/lib/calendar-supabase"

// Helper function to parse month name from query
function parseMonthFromQuery(query: string): number | null {
  const monthNames = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december"
  ]
  const monthAbbreviations = [
    "jan", "feb", "mar", "apr", "may", "jun",
    "jul", "aug", "sep", "oct", "nov", "dec"
  ]
  
  const lowerQuery = query.toLowerCase()
  
  // Check for full month names
  for (let i = 0; i < monthNames.length; i++) {
    if (lowerQuery.includes(monthNames[i])) {
      return i // 0-11 for January-December
    }
  }
  
  // Check for abbreviations
  for (let i = 0; i < monthAbbreviations.length; i++) {
    if (lowerQuery.includes(monthAbbreviations[i])) {
      return i
    }
  }
  
  return null
}

export const handleCalendar: QueryHandler = async (params, request, messageId) => {
  console.log("[Calendar Handler] ===== ENTRY =====")
  console.log("[Calendar Handler] Params received:", JSON.stringify(params))
  console.log("[Calendar Handler] MessageId:", messageId)
  console.log("[Calendar Handler] Request method:", request?.method)
  console.log("[Calendar Handler] Request URL:", request?.url)
  
  const userQuery = (params.query || params.search || params.eventName || params.event || "").toLowerCase()
  console.log("[Calendar Handler] Extracted userQuery:", userQuery)
  console.log("[Calendar Handler] Raw params.query:", params.query)
  console.log("[Calendar Handler] Raw params.search:", params.search)
  console.log("[Calendar Handler] Raw params.eventName:", params.eventName)
  console.log("[Calendar Handler] Raw params.event:", params.event)
  
  try {
    console.log("[Calendar Handler] Getting Supabase client...")
    // DIRECT DATABASE ACCESS - prove we're querying the calendar
    const supabase = getCalendarSupabase()
    console.log("[Calendar Handler] Supabase client obtained")
    
    // Query the events table directly
    console.log("[Calendar Handler] Calculating date filter...")
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dateStr = today.toISOString().split("T")[0]
    console.log("[Calendar Handler] Today date string:", dateStr)
    console.log("[Calendar Handler] Today full date:", today.toISOString())
    
    console.log("[Calendar Handler] Executing database query...")
    console.log("[Calendar Handler] Query: from('events').select('*').gte('start_date',", dateStr, ").order('start_date').order('start_time').limit(100)")
    const { data: allEvents, error } = await supabase
      .from("events")
      .select("*")
      .gte("start_date", dateStr)
      .order("start_date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(100)
    
    console.log("[Calendar Handler] ===== DATABASE QUERY COMPLETE =====")
    console.log("[Calendar Handler] Query error:", error ? JSON.stringify(error) : "null")
    console.log("[Calendar Handler] Query returned data type:", typeof allEvents)
    console.log("[Calendar Handler] Query returned is array:", Array.isArray(allEvents))
    console.log("[Calendar Handler] DIRECT DB QUERY - Fetched", allEvents?.length || 0, "events from database")
    
    if (allEvents && allEvents.length > 0) {
      console.log("[Calendar Handler] First 10 event titles:", allEvents.slice(0, 10).map((e: any) => e.title))
      console.log("[Calendar Handler] First 10 event IDs:", allEvents.slice(0, 10).map((e: any) => e.id))
      console.log("[Calendar Handler] First 10 event start_dates:", allEvents.slice(0, 10).map((e: any) => e.start_date))
      console.log("[Calendar Handler] Sample event (first):", JSON.stringify(allEvents[0], null, 2))
    } else {
      console.log("[Calendar Handler] allEvents is null or empty")
      console.log("[Calendar Handler] allEvents value:", allEvents)
    }
    
    if (error) {
      console.error("[Calendar Handler] ===== DATABASE ERROR =====")
      console.error("[Calendar Handler] Error code:", error.code)
      console.error("[Calendar Handler] Error message:", error.message)
      console.error("[Calendar Handler] Error details:", error.details)
      console.error("[Calendar Handler] Error hint:", error.hint)
      console.error("[Calendar Handler] Full error object:", JSON.stringify(error, null, 2))
      const errorResponse = {
        directResponse: NextResponse.json({
          answer: `Database error: ${error.message}`,
          messageId: messageId || `msg-${Date.now()}`,
        }),
      }
      console.log("[Calendar Handler] Returning error response:", JSON.stringify(errorResponse))
      return errorResponse
    }
    
    if (!allEvents || allEvents.length === 0) {
      console.log("[Calendar Handler] ===== NO EVENTS FOUND =====")
      console.log("[Calendar Handler] allEvents is falsy or empty array")
      const noEventsResponse = {
        directResponse: NextResponse.json({
          answer: "I don't see any upcoming events in the calendar.",
          messageId: messageId || `msg-${Date.now()}`,
        }),
      }
      console.log("[Calendar Handler] Returning no events response")
      return noEventsResponse
    }
    
    // Filter for NHSCA Duals
    console.log("[Calendar Handler] ===== FILTERING EVENTS =====")
    console.log("[Calendar Handler] Starting with", allEvents.length, "total events")
    console.log("[Calendar Handler] userQuery includes 'nhsca':", userQuery.includes("nhsca"))
    console.log("[Calendar Handler] userQuery includes 'dual':", userQuery.includes("dual"))
    console.log("[Calendar Handler] userQuery includes 'super32':", userQuery.includes("super32"))
    console.log("[Calendar Handler] userQuery includes 'super 32':", userQuery.includes("super 32"))
    console.log("[Calendar Handler] userQuery includes 'aau':", userQuery.includes("aau"))
    console.log("[Calendar Handler] userQuery includes 'scholastic':", userQuery.includes("scholastic"))
    
    let events = allEvents
    if (userQuery.includes("nhsca") && userQuery.includes("dual")) {
      console.log("[Calendar Handler] Filtering for NHSCA Duals...")
      events = allEvents.filter((e: any) => {
        const titleLower = (e.title || "").toLowerCase()
        const descLower = (e.description || "").toLowerCase()
        const combined = `${titleLower} ${descLower}`
        const matches = combined.includes("nhsca") && combined.includes("dual")
        if (matches) {
          console.log("[Calendar Handler] Match found:", e.title, "| title:", titleLower, "| desc:", descLower.substring(0, 50))
        }
        return matches
      })
      console.log("[Calendar Handler] Filtered for NHSCA Duals:", events.length, "events found out of", allEvents.length)
      if (events.length > 0) {
        console.log("[Calendar Handler] NHSCA Duals event titles:", events.map((e: any) => e.title))
        console.log("[Calendar Handler] NHSCA Duals event IDs:", events.map((e: any) => e.id))
        console.log("[Calendar Handler] NHSCA Duals event dates:", events.map((e: any) => e.start_date))
      } else {
        console.log("[Calendar Handler] NO NHSCA Duals events found after filtering")
        console.log("[Calendar Handler] All event titles for debugging:", allEvents.map((e: any) => e.title))
      }
    } else if (userQuery.includes("super32") || userQuery.includes("super 32")) {
      console.log("[Calendar Handler] Filtering for Super32...")
      events = allEvents.filter((e: any) => {
        const titleLower = (e.title || "").toLowerCase()
        const matches = titleLower.includes("super") && titleLower.includes("32")
        if (matches) console.log("[Calendar Handler] Super32 match:", e.title)
        return matches
      })
      console.log("[Calendar Handler] Filtered for Super32:", events.length, "events found")
    } else if (userQuery.includes("aau") && userQuery.includes("scholastic")) {
      console.log("[Calendar Handler] Filtering for AAU Scholastic...")
      events = allEvents.filter((e: any) => {
        const titleLower = (e.title || "").toLowerCase()
        const matches = titleLower.includes("aau") && titleLower.includes("scholastic")
        if (matches) console.log("[Calendar Handler] AAU Scholastic match:", e.title)
        return matches
      })
      console.log("[Calendar Handler] Filtered for AAU Scholastic:", events.length, "events found")
    } else if (userQuery.includes("aau")) {
      console.log("[Calendar Handler] Filtering for AAU...")
      events = allEvents.filter((e: any) => e.title?.toLowerCase().includes("aau"))
      console.log("[Calendar Handler] Filtered for AAU:", events.length, "events found")
    } else if (userQuery.includes("nhsca")) {
      console.log("[Calendar Handler] Filtering for NHSCA...")
      events = allEvents.filter((e: any) => e.title?.toLowerCase().includes("nhsca"))
      console.log("[Calendar Handler] Filtered for NHSCA:", events.length, "events found")
    } else if (userQuery.includes("state") && userQuery.includes("dual") && !userQuery.includes("national")) {
      console.log("[Calendar Handler] Filtering for State Duals...")
      events = allEvents.filter((e: any) => {
        const titleLower = (e.title || "").toLowerCase()
        const descLower = (e.description || "").toLowerCase()
        const combined = `${titleLower} ${descLower}`
        return combined.includes("state") && combined.includes("dual")
      })
      console.log("[Calendar Handler] Filtered for State Duals:", events.length, "events found")
      if (events.length > 0) {
        console.log("[Calendar Handler] State Duals event titles:", events.map((e: any) => e.title))
      }
    } else if (userQuery.includes("regional") || userQuery.includes("regionals")) {
      console.log("[Calendar Handler] Filtering for Regionals...")
      events = allEvents.filter((e: any) => {
        const titleLower = (e.title || "").toLowerCase()
        const descLower = (e.description || "").toLowerCase()
        const combined = `${titleLower} ${descLower}`
        return combined.includes("regional")
      })
      console.log("[Calendar Handler] Filtered for Regionals:", events.length, "events found")
      if (events.length > 0) {
        console.log("[Calendar Handler] Regionals event titles:", events.map((e: any) => e.title))
      }
    } else if (userQuery.includes("state") && !userQuery.includes("national")) {
      console.log("[Calendar Handler] Filtering for States/State Championships...")
      events = allEvents.filter((e: any) => {
        const titleLower = (e.title || "").toLowerCase()
        const descLower = (e.description || "").toLowerCase()
        const combined = `${titleLower} ${descLower}`
        return combined.includes("state") && (combined.includes("championship") || combined.includes("champ") || combined.includes("states"))
      })
      console.log("[Calendar Handler] Filtered for States:", events.length, "events found")
      if (events.length > 0) {
        console.log("[Calendar Handler] States event titles:", events.map((e: any) => e.title))
      }
    } else if (userQuery.includes("national") && userQuery.includes("tournament")) {
      console.log("[Calendar Handler] Filtering for national tournaments...")
      events = allEvents.filter((e: any) => {
        const titleLower = (e.title || "").toLowerCase()
        const descLower = (e.description || "").toLowerCase()
        const combined = `${titleLower} ${descLower}`
        return combined.includes("national") && (combined.includes("tournament") || combined.includes("championship") || combined.includes("champ"))
      })
      console.log("[Calendar Handler] Filtered for national tournaments:", events.length, "events found")
      if (events.length > 0) {
        console.log("[Calendar Handler] National tournament titles:", events.map((e: any) => e.title))
      }
    } else if (userQuery.includes("practice")) {
      console.log("[Calendar Handler] Filtering for practices...")
      // Check if user specifically mentioned "nc united" or "blue"
      const mentionsNCUnited = userQuery.includes("nc united") || userQuery.includes("ncunited") || 
                                userQuery.includes("united blue") || userQuery.includes("blue practice")
      
      events = allEvents.filter((e: any) => {
        const titleLower = (e.title || "").toLowerCase()
        const descLower = (e.description || "").toLowerCase()
        const combined = `${titleLower} ${descLower}`
        
        // If user mentioned NC United/Blue, only return those practices
        if (mentionsNCUnited) {
          const isNCUnited = combined.includes("nc united") || combined.includes("ncunited") || 
                            combined.includes("united blue") || combined.includes("blue practice")
          return combined.includes("practice") && isNCUnited
        }
        
        // Otherwise, return all practices
        return combined.includes("practice")
      })
      console.log("[Calendar Handler] Filtered for practices:", events.length, "events found")
      if (events.length > 0) {
        console.log("[Calendar Handler] Practice event titles:", events.map((e: any) => e.title))
      }
    } else if (userQuery.includes("rivalry") || 
               (userQuery.includes("unc") && userQuery.includes("nc state") && userQuery.includes("match")) ||
               (userQuery.includes("unc") && userQuery.includes("ncsu") && userQuery.includes("match"))) {
      console.log("[Calendar Handler] Filtering for rivalry match...")
      events = allEvents.filter((e: any) => {
        const titleLower = (e.title || "").toLowerCase()
        const descLower = (e.description || "").toLowerCase()
        const combined = `${titleLower} ${descLower}`
        return combined.includes("rivalry") || 
               (combined.includes("unc") && (combined.includes("nc state") || combined.includes("ncsu")))
      })
      console.log("[Calendar Handler] Filtered for rivalry match:", events.length, "events found")
      if (events.length > 0) {
        console.log("[Calendar Handler] Rivalry match event titles:", events.map((e: any) => e.title))
      }
    } else if (userQuery.includes("schedule for") || userQuery.includes("schedule in")) {
      // Check if a specific month is mentioned
      const monthIndex = parseMonthFromQuery(userQuery)
      if (monthIndex !== null) {
        console.log("[Calendar Handler] Filtering for events in specific month:", monthIndex)
        const now = new Date()
        const currentYear = now.getFullYear()
        // Try current year first, then next year if no events found
        let targetYear = currentYear
        events = allEvents.filter((e: any) => {
          if (!e.start_date) return false
          const eventDate = new Date(e.start_date)
          return eventDate.getMonth() === monthIndex && eventDate.getFullYear() === targetYear
        })
        
        // If no events in current year, try next year
        if (events.length === 0) {
          targetYear = currentYear + 1
          events = allEvents.filter((e: any) => {
            if (!e.start_date) return false
            const eventDate = new Date(e.start_date)
            return eventDate.getMonth() === monthIndex && eventDate.getFullYear() === targetYear
          })
        }
        
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
        console.log(`[Calendar Handler] Filtered for ${monthNames[monthIndex]} ${targetYear}:`, events.length, "events found")
        if (events.length > 0) {
          console.log(`[Calendar Handler] ${monthNames[monthIndex]} event titles:`, events.map((e: any) => e.title))
        }
      } else {
        // No specific month mentioned, use all events
        events = allEvents
        console.log("[Calendar Handler] Schedule query with no specific month, using all events:", events.length)
      }
    } else if (userQuery.includes("this month") || (userQuery.includes("month") && !userQuery.includes("schedule"))) {
      console.log("[Calendar Handler] Filtering for events this month...")
      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()
      events = allEvents.filter((e: any) => {
        if (!e.start_date) return false
        const eventDate = new Date(e.start_date)
        return eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear
      })
      console.log("[Calendar Handler] Filtered for this month:", events.length, "events found")
      if (events.length > 0) {
        console.log("[Calendar Handler] This month event titles:", events.map((e: any) => e.title))
      }
    } else if (userQuery.includes("this week") || userQuery.includes("week")) {
      console.log("[Calendar Handler] Filtering for events this week...")
      const now = new Date()
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - now.getDay()) // Start of week (Sunday)
      weekStart.setHours(0, 0, 0, 0)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 7) // End of week
      events = allEvents.filter((e: any) => {
        if (!e.start_date) return false
        const eventDate = new Date(e.start_date)
        return eventDate >= weekStart && eventDate < weekEnd
      })
      console.log("[Calendar Handler] Filtered for this week:", events.length, "events found")
      if (events.length > 0) {
        console.log("[Calendar Handler] This week event titles:", events.map((e: any) => e.title))
      }
    } else if (userQuery.includes("tournament") || userQuery.includes("big dates") || userQuery.includes("dates") || userQuery.includes("key events")) {
      console.log("[Calendar Handler] Filtering for tournaments/general events...")
      // For general queries like "big dates" or "dates", return all events sorted by date
      events = allEvents
      console.log("[Calendar Handler] Using all events for general query:", events.length, "events")
    } else {
      console.log("[Calendar Handler] No specific filter matched, using all events")
    }
    
    console.log("[Calendar Handler] After filtering:", events.length, "events remain")
    
    if (events.length === 0) {
      console.log("[Calendar Handler] ===== NO MATCHING EVENTS AFTER FILTER =====")
      console.log("[Calendar Handler] Total events available:", allEvents.length)
      const noMatchResponse = {
        directResponse: NextResponse.json({
          answer: `I don't see that event in the calendar. Found ${allEvents.length} total upcoming events.`,
          messageId: messageId || `msg-${Date.now()}`,
        }),
      }
      console.log("[Calendar Handler] Returning no match response")
      return noMatchResponse
    }
    
    // Format dates
    console.log("[Calendar Handler] ===== FORMATTING EVENTS =====")
    console.log("[Calendar Handler] Formatting", events.length, "events")
    const formatted = events.map((e: any, index: number) => {
      console.log(`[Calendar Handler] Formatting event ${index + 1}/${events.length}:`, e.title)
      console.log(`[Calendar Handler] Event ${index + 1} raw data:`, {
        id: e.id,
        title: e.title,
        start_date: e.start_date,
        end_date: e.end_date,
        start_time: e.start_time,
        location: e.location,
        description: e.description?.substring(0, 50)
      })
      
      const start = e.start_date ? new Date(e.start_date) : null
      const end = e.end_date ? new Date(e.end_date) : null
      console.log(`[Calendar Handler] Event ${index + 1} parsed start date:`, start)
      console.log(`[Calendar Handler] Event ${index + 1} parsed end date:`, end)
      
      let dateStr = ""
      if (start && !isNaN(start.getTime())) {
        dateStr = start.toLocaleDateString("en-US", { 
          weekday: "long", year: "numeric", month: "long", day: "numeric" 
        })
        console.log(`[Calendar Handler] Event ${index + 1} formatted date:`, dateStr)
      } else {
        console.log(`[Calendar Handler] Event ${index + 1} invalid start date`)
      }
      
      let timeStr = ""
      if (e.start_time) {
        const [h, m] = e.start_time.split(":")
        if (h && m) {
          const hours = parseInt(h)
          const ampm = hours >= 12 ? "PM" : "AM"
          const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
          timeStr = ` at ${displayHours}:${m} ${ampm}`
          console.log(`[Calendar Handler] Event ${index + 1} formatted time:`, timeStr)
        } else {
          console.log(`[Calendar Handler] Event ${index + 1} invalid time format:`, e.start_time)
        }
      } else {
        console.log(`[Calendar Handler] Event ${index + 1} no start_time`)
      }
      
      let locationStr = e.location ? ` at ${e.location}` : ""
      console.log(`[Calendar Handler] Event ${index + 1} location:`, locationStr || "none")
      
      let endDateStr = ""
      if (end && !isNaN(end.getTime()) && end.getTime() !== start?.getTime()) {
        endDateStr = end.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
        console.log(`[Calendar Handler] Event ${index + 1} formatted end date:`, endDateStr)
      } else {
        console.log(`[Calendar Handler] Event ${index + 1} no end date or same as start`)
      }
      
      const formattedEvent = {
        title: e.title,
        date: dateStr,
        endDate: endDateStr,
        time: timeStr,
        location: locationStr,
        description: e.description || "",
      }
      console.log(`[Calendar Handler] Event ${index + 1} formatted result:`, JSON.stringify(formattedEvent, null, 2))
      return formattedEvent
    })
    
    console.log("[Calendar Handler] Formatted", formatted.length, "events")
    console.log("[Calendar Handler] Formatted events:", JSON.stringify(formatted, null, 2))
    
    // Build answer
    console.log("[Calendar Handler] ===== BUILDING ANSWER =====")
    let answer = ""
    if (formatted.length === 1) {
      console.log("[Calendar Handler] Building single event answer")
      const e = formatted[0]
      const dateRange = e.endDate ? `${e.date} - ${e.endDate}` : e.date
      answer = `**${e.title}** is scheduled for **${dateRange}${e.time}${e.location}**.`
      if (e.description) answer += `\n\n${e.description}`
      console.log("[Calendar Handler] Single event answer built:", answer.substring(0, 200))
    } else {
      console.log("[Calendar Handler] Building multiple events answer")
      answer = `I found ${formatted.length} events:\n\n`
      formatted.forEach((e: any, index: number) => {
        console.log(`[Calendar Handler] Adding event ${index + 1} to answer:`, e.title)
        const dateRange = e.endDate ? `${e.date} - ${e.endDate}` : e.date
        answer += `**${e.title}**\n  - ${dateRange}${e.time}${e.location}\n`
        if (e.description) answer += `  - ${e.description}\n`
        answer += "\n"
      })
      console.log("[Calendar Handler] Multiple events answer built, length:", answer.length)
    }
    
    console.log("[Calendar Handler] ===== FINAL ANSWER =====")
    console.log("[Calendar Handler] Answer length:", answer.length)
    console.log("[Calendar Handler] Answer (first 500 chars):", answer.substring(0, 500))
    console.log("[Calendar Handler] Answer (full):", answer)
    console.log("[Calendar Handler] Formatted results count:", formatted.length)
    console.log("[Calendar Handler] Aggregate result count:", formatted.length)
    
    const returnValue = {
      results: formatted,
      aggregateResult: { count: formatted.length, events: formatted },
      answer: answer,
    }
    console.log("[Calendar Handler] ===== RETURNING RESULT =====")
    console.log("[Calendar Handler] Return value has directResponse:", !!returnValue.directResponse)
    console.log("[Calendar Handler] Return value has answer:", !!returnValue.answer)
    console.log("[Calendar Handler] Return value has results:", !!returnValue.results)
    console.log("[Calendar Handler] Return value results length:", returnValue.results?.length)
    console.log("[Calendar Handler] Return value answer length:", returnValue.answer?.length)
    console.log("[Calendar Handler] Full return value:", JSON.stringify(returnValue, null, 2))
    console.log("[Calendar Handler] ===== EXIT =====")
    
    return returnValue
  } catch (error: any) {
    console.error("[Calendar Handler] ===== EXCEPTION CAUGHT =====")
    console.error("[Calendar Handler] Error type:", typeof error)
    console.error("[Calendar Handler] Error name:", error?.name)
    console.error("[Calendar Handler] Error message:", error?.message)
    console.error("[Calendar Handler] Error stack:", error?.stack)
    console.error("[Calendar Handler] Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    const errorResponse = {
      directResponse: NextResponse.json({
        answer: `Error: ${error.message}`,
        messageId: messageId || `msg-${Date.now()}`,
      }),
    }
    console.log("[Calendar Handler] Returning error response from catch block")
    return errorResponse
  }
}
