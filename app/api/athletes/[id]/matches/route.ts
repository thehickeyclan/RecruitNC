import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { isVarsitySeason } from "@/lib/high-school-window"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: athleteId } = await params

    console.log(`=== MATCHES API DEBUG START for athlete ID: ${athleteId} ===`)

    // First, get the athlete's information
    const { data: athlete, error: athleteError } = await supabase
      .from("athletes")
      .select("id, name, graduationyear")
      .eq("id", athleteId)
      .single()

    if (athleteError) {
      console.error("Athlete query error:", athleteError)
      return NextResponse.json({
        success: false,
        error: "Athlete not found",
        athleteId,
        details: athleteError.message,
      })
    }

    if (!athlete) {
      console.error("No athlete found for ID:", athleteId)
      return NextResponse.json({
        success: false,
        error: "Athlete not found",
        athleteId,
      })
    }

    const athleteName = athlete.name?.trim() || ""
    console.log(`Found athlete: "${athleteName}"`)

    if (!athleteName) {
      return NextResponse.json({
        success: false,
        error: "Athlete has no name",
        athleteId,
      })
    }

    // Parse name more carefully
    const nameParts = athleteName.split(/\s+/).filter((part) => part.length > 0)
    const firstName = nameParts[0]?.toLowerCase() || ""
    const lastName = nameParts.slice(1).join(" ").toLowerCase() || ""
    const fullNameLower = athleteName.toLowerCase().trim()

    console.log(`Name parsing: firstName="${firstName}", lastName="${lastName}", fullName="${fullNameLower}"`)

    // Special handling for Jackson Rowling name variations
    const jacksonVariations = ["jackson rowling", "j rowling", "j. rowling", "rowling jackson", "rowling, jackson"]

    const athleteMatches: any[] = []
    const matchAttempts: any[] = []
    let allMatches: any[] = []

    /*
     * This wrestler's rows, and nothing else (6 November 2026).
     *
     * Both branches below used to read the WHOLE matches table - a count(*), then one page per
     * thousand rows - and filter it in memory by name. The table links to profiles directly:
     * 5,576 of its 5,588 rows carry an athlete_id. And 5,588 rows against 24,776 profiles means
     * most profiles have no row here at all, so nearly every profile view paid seven queries and
     * about three and a half seconds to find nothing.
     *
     * It is paid on nearly every view, too, not rarely: match-data-section-improved.tsx falls
     * back to this route whenever matches-direct returns no seasons, with cache: "no-store". One
     * profile view, seven queries over a whole table, uncached - that amplification is the shape
     * that starves a connection pool, and it got worse with every profile released.
     */
    const fetchAthleteMatches = async (): Promise<any[]> => {
      const { data: own, error: ownError } = await supabase.from("matches").select("*").eq("athlete_id", athleteId)
      if (ownError) console.error("Error fetching this athlete's matches:", ownError.message)
      if (own?.length) return own
      // The dozen rows carrying no athlete_id are reachable only by name - still one scoped query,
      // and the name matching below runs over the result exactly as it did over the whole table.
      if (!lastName) return []
      const { data: byName, error: nameError } = await supabase
        .from("matches")
        .select("*")
        .is("athlete_id", null)
        .ilike("last_name", lastName)
      if (nameError) console.error("Error fetching unlinked matches by surname:", nameError.message)
      return byName ?? []
    }
    let processedRecords = 0
    let parseErrors = 0

    if (fullNameLower.includes("jackson rowling")) {
      console.log("🔍 Special matching for Jackson Rowling")

      allMatches = await fetchAthleteMatches()

      console.log(`Total matches fetched: ${allMatches.length}`)

      // Process each match record
      allMatches.forEach((matchRecord, index) => {
        try {
          processedRecords++

          // Add first 5 records to debug samples
          if (index < 5) {
            matchAttempts.push({
              id: matchRecord.id,
              wrestlerId: matchRecord.wrestler_id,
              firstName: matchRecord.first_name,
              lastName: matchRecord.last_name,
              highSchool: matchRecord.high_school,
              season: matchRecord.season,
              grade: matchRecord.grade,
            })
          }

          // Get match record name data
          const recordFirstName = (matchRecord.first_name || "").toLowerCase().trim()
          const recordLastName = (matchRecord.last_name || "").toLowerCase().trim()
          const recordFullName = `${recordFirstName} ${recordLastName}`.trim()
          const recordWrestlerId = (matchRecord.wrestler_id || "").toLowerCase()

          const isJacksonMatch = jacksonVariations.some(
            (variation) =>
              recordFullName.includes(variation) ||
              recordWrestlerId.includes(variation.replace(" ", "_")) ||
              (recordFirstName.includes("jackson") && recordLastName.includes("rowling")) ||
              (recordFirstName.includes("j") && recordLastName.includes("rowling")),
          )

          if (isJacksonMatch) {
            console.log(
              `✓ JACKSON MATCH FOUND: ${matchRecord.wrestler_id} - ${matchRecord.season} ${matchRecord.grade}`,
            )

            // Parse individual matches if they exist
            let individualMatches = []
            if (matchRecord.matches) {
              try {
                if (typeof matchRecord.matches === "string") {
                  individualMatches = JSON.parse(matchRecord.matches)
                } else if (Array.isArray(matchRecord.matches)) {
                  individualMatches = matchRecord.matches
                }
              } catch (e) {
                console.error("Error parsing individual matches:", e)
              }
            }

            // Create the match object
            const processedMatch = {
              recordId: matchRecord.id,
              wrestlerId: matchRecord.wrestler_id,
              wrestler: {
                first_name: matchRecord.first_name,
                last_name: matchRecord.last_name,
                high_school: matchRecord.high_school,
                seasons: {
                  [`${matchRecord.season}_${matchRecord.grade}`]: {
                    season: matchRecord.season,
                    grade: matchRecord.grade,
                    high_school: matchRecord.high_school,
                    wins: matchRecord.wins || 0,
                    losses: matchRecord.losses || 0,
                    total_matches: matchRecord.total_matches || 0,
                    pins: matchRecord.pins || 0,
                    tech_falls: matchRecord.tech_falls || 0,
                    major_decisions: matchRecord.major_decisions || 0,
                    decisions: matchRecord.decisions || 0,
                    forfeits_won: matchRecord.forfeits_won || 0,
                    win_percentage:
                      matchRecord.total_matches > 0 ? ((matchRecord.wins || 0) / matchRecord.total_matches) * 100 : 0,
                    pin_percentage:
                      matchRecord.total_matches > 0 ? ((matchRecord.pins || 0) / matchRecord.total_matches) * 100 : 0,
                    tf_percentage:
                      matchRecord.total_matches > 0
                        ? ((matchRecord.tech_falls || 0) / matchRecord.total_matches) * 100
                        : 0,
                    matches: individualMatches,
                  },
                },
              },
              createdAt: matchRecord.created_at,
              matchStrategy: "jackson_rowling",
            }

            athleteMatches.push(processedMatch)
          } else {
            // Multiple matching strategies with detailed logging
            const isExactNameMatch = recordFirstName === firstName && recordLastName === lastName
            const isFullNameMatch = recordFullName === fullNameLower
            const isWrestlerIdMatch =
              recordWrestlerId.includes(`${firstName}_${lastName}`) ||
              (recordWrestlerId.includes(firstName) && recordWrestlerId.includes(lastName))

            // Log potential matches for debugging
            if (
              recordFirstName.includes(firstName.substring(0, 3)) ||
              recordLastName.includes(lastName.substring(0, 3)) ||
              recordFullName.includes(firstName) ||
              recordWrestlerId.includes(firstName)
            ) {
              matchAttempts.push({
                recordId: matchRecord.id,
                recordName: `${matchRecord.first_name} ${matchRecord.last_name}`,
                recordWrestlerId: matchRecord.wrestler_id,
                targetName: athleteName,
                exactMatch: isExactNameMatch,
                fullMatch: isFullNameMatch,
                wrestlerIdMatch: isWrestlerIdMatch,
                anyMatch: isExactNameMatch || isFullNameMatch || isWrestlerIdMatch,
              })
            }

            // Check for direct athlete_id link first (highest priority)
            const isDirectLink = matchRecord.athlete_id === athleteId

            if (isDirectLink || isExactNameMatch || isFullNameMatch || isWrestlerIdMatch) {
              console.log(`✓ MATCH FOUND: ${matchRecord.wrestler_id} - ${matchRecord.season} ${matchRecord.grade}`)
              console.log(
                `  Strategy: ${isDirectLink ? "direct_link" : isExactNameMatch ? "exact_name" : isFullNameMatch ? "full_name" : "wrestler_id"}`,
              )

              // Parse individual matches if they exist
              let individualMatches = []
              if (matchRecord.matches) {
                try {
                  if (typeof matchRecord.matches === "string") {
                    individualMatches = JSON.parse(matchRecord.matches)
                  } else if (Array.isArray(matchRecord.matches)) {
                    individualMatches = matchRecord.matches
                  }
                } catch (e) {
                  console.error("Error parsing individual matches:", e)
                }
              }

              // Create the match object
              const processedMatch = {
                recordId: matchRecord.id,
                wrestlerId: matchRecord.wrestler_id,
                wrestler: {
                  first_name: matchRecord.first_name,
                  last_name: matchRecord.last_name,
                  high_school: matchRecord.high_school,
                  seasons: {
                    [`${matchRecord.season}_${matchRecord.grade}`]: {
                      season: matchRecord.season,
                      grade: matchRecord.grade,
                      high_school: matchRecord.high_school,
                      wins: matchRecord.wins || 0,
                      losses: matchRecord.losses || 0,
                      total_matches: matchRecord.total_matches || 0,
                      pins: matchRecord.pins || 0,
                      tech_falls: matchRecord.tech_falls || 0,
                      major_decisions: matchRecord.major_decisions || 0,
                      decisions: matchRecord.decisions || 0,
                      forfeits_won: matchRecord.forfeits_won || 0,
                      win_percentage:
                        matchRecord.total_matches > 0 ? ((matchRecord.wins || 0) / matchRecord.total_matches) * 100 : 0,
                      pin_percentage:
                        matchRecord.total_matches > 0 ? ((matchRecord.pins || 0) / matchRecord.total_matches) * 100 : 0,
                      tf_percentage:
                        matchRecord.total_matches > 0
                          ? ((matchRecord.tech_falls || 0) / matchRecord.total_matches) * 100
                          : 0,
                      matches: individualMatches,
                    },
                  },
                },
                createdAt: matchRecord.created_at,
                matchStrategy: isDirectLink
                  ? "direct_link"
                  : isExactNameMatch
                    ? "exact_name"
                    : isFullNameMatch
                      ? "full_name"
                      : "wrestler_id",
              }

              athleteMatches.push(processedMatch)
            }
          }
        } catch (error) {
          parseErrors++
          console.error("Error processing match record:", error)
        }
      })
    } else {
      allMatches = await fetchAthleteMatches()

      console.log(`Total matches fetched: ${allMatches.length}`)

      // Process each match record
      allMatches.forEach((matchRecord, index) => {
        try {
          processedRecords++

          // Add first 5 records to debug samples
          if (index < 5) {
            matchAttempts.push({
              id: matchRecord.id,
              wrestlerId: matchRecord.wrestler_id,
              firstName: matchRecord.first_name,
              lastName: matchRecord.last_name,
              highSchool: matchRecord.high_school,
              season: matchRecord.season,
              grade: matchRecord.grade,
            })
          }

          // Get match record name data
          const recordFirstName = (matchRecord.first_name || "").toLowerCase().trim()
          const recordLastName = (matchRecord.last_name || "").toLowerCase().trim()
          const recordFullName = `${recordFirstName} ${recordLastName}`.trim()
          const recordWrestlerId = (matchRecord.wrestler_id || "").toLowerCase()

          // Multiple matching strategies with detailed logging
          const isExactNameMatch = recordFirstName === firstName && recordLastName === lastName
          const isFullNameMatch = recordFullName === fullNameLower
          const isWrestlerIdMatch =
            recordWrestlerId.includes(`${firstName}_${lastName}`) ||
            (recordWrestlerId.includes(firstName) && recordWrestlerId.includes(lastName))

          // Log potential matches for debugging
          if (
            recordFirstName.includes(firstName.substring(0, 3)) ||
            recordLastName.includes(lastName.substring(0, 3)) ||
            recordFullName.includes(firstName) ||
            recordWrestlerId.includes(firstName)
          ) {
            matchAttempts.push({
              recordId: matchRecord.id,
              recordName: `${matchRecord.first_name} ${matchRecord.last_name}`,
              recordWrestlerId: matchRecord.wrestler_id,
              targetName: athleteName,
              exactMatch: isExactNameMatch,
              fullMatch: isFullNameMatch,
              wrestlerIdMatch: isWrestlerIdMatch,
              anyMatch: isExactNameMatch || isFullNameMatch || isWrestlerIdMatch,
            })
          }

          // Check for direct athlete_id link first (highest priority)
          const isDirectLink = matchRecord.athlete_id === athleteId

          if (isDirectLink || isExactNameMatch || isFullNameMatch || isWrestlerIdMatch) {
            console.log(`✓ MATCH FOUND: ${matchRecord.wrestler_id} - ${matchRecord.season} ${matchRecord.grade}`)
            console.log(
              `  Strategy: ${isDirectLink ? "direct_link" : isExactNameMatch ? "exact_name" : isFullNameMatch ? "full_name" : "wrestler_id"}`,
            )

            // Parse individual matches if they exist
            let individualMatches = []
            if (matchRecord.matches) {
              try {
                if (typeof matchRecord.matches === "string") {
                  individualMatches = JSON.parse(matchRecord.matches)
                } else if (Array.isArray(matchRecord.matches)) {
                  individualMatches = matchRecord.matches
                }
              } catch (e) {
                console.error("Error parsing individual matches:", e)
              }
            }

            // Create the match object
            const processedMatch = {
              recordId: matchRecord.id,
              wrestlerId: matchRecord.wrestler_id,
              wrestler: {
                first_name: matchRecord.first_name,
                last_name: matchRecord.last_name,
                high_school: matchRecord.high_school,
                seasons: {
                  [`${matchRecord.season}_${matchRecord.grade}`]: {
                    season: matchRecord.season,
                    grade: matchRecord.grade,
                    high_school: matchRecord.high_school,
                    wins: matchRecord.wins || 0,
                    losses: matchRecord.losses || 0,
                    total_matches: matchRecord.total_matches || 0,
                    pins: matchRecord.pins || 0,
                    tech_falls: matchRecord.tech_falls || 0,
                    major_decisions: matchRecord.major_decisions || 0,
                    decisions: matchRecord.decisions || 0,
                    forfeits_won: matchRecord.forfeits_won || 0,
                    win_percentage:
                      matchRecord.total_matches > 0 ? ((matchRecord.wins || 0) / matchRecord.total_matches) * 100 : 0,
                    pin_percentage:
                      matchRecord.total_matches > 0 ? ((matchRecord.pins || 0) / matchRecord.total_matches) * 100 : 0,
                    tf_percentage:
                      matchRecord.total_matches > 0
                        ? ((matchRecord.tech_falls || 0) / matchRecord.total_matches) * 100
                        : 0,
                    matches: individualMatches,
                  },
                },
              },
              createdAt: matchRecord.created_at,
              matchStrategy: isDirectLink
                ? "direct_link"
                : isExactNameMatch
                  ? "exact_name"
                  : isFullNameMatch
                    ? "full_name"
                    : "wrestler_id",
            }

            athleteMatches.push(processedMatch)
          }
        } catch (error) {
          parseErrors++
          console.error("Error processing match record:", error)
        }
      })
    }

    // Remove duplicates based on season and grade combination; varsity seasons from seventh grade.
    const grad = (athlete as { graduationyear?: number | null }).graduationyear ?? null
    const uniqueMatches = athleteMatches.filter((match) =>
      Object.keys(match.wrestler?.seasons ?? {}).every((season) => isVarsitySeason(season, grad)),
    ).filter(
      (match, index, self) =>
        index ===
        self.findIndex((m) => {
          const currentSeason = Object.keys(match.wrestler.seasons)[0]
          const compareSeason = Object.keys(m.wrestler.seasons)[0]
          return currentSeason === compareSeason
        }),
    )

    console.log(`=== FINAL RESULTS ===`)
    console.log(`Matches found: ${uniqueMatches.length}`)
    console.log(`Match attempts logged: ${matchAttempts.length}`)
    console.log(`=== MATCHES API DEBUG END ===`)

    return NextResponse.json({
      success: true,
      athleteMatches: uniqueMatches,
      totalRecords: allMatches.length,
      processedRecords,
      parseErrors,
      debug: {
        athleteId,
        athleteName,
        firstName,
        lastName,
        fullNameLower,
        searchStrategies: [
          // Direct athlete_id link (highest priority)
          {
            name: "direct_link",
            query: supabase.from("matches").select("*").eq("athlete_id", athleteId),
          },
          `exact_name: "${firstName}" + "${lastName}"`,
          `full_name: "${fullNameLower}"`,
          `wrestler_id: contains "${firstName}_${lastName}"`,
        ],
        matchAttempts: matchAttempts.slice(0, 10), // First 10 potential matches
        matchesFound: uniqueMatches.length,
        seasonsExtracted: uniqueMatches.reduce((total, match) => total + Object.keys(match.wrestler.seasons).length, 0),
        rowsConsidered: allMatches.length,
      },
    })
  } catch (error) {
    console.error("=== MATCHES API ERROR ===", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
