/**
 * State Placement Handler
 * Handles queries like "who won 4a states 132lbs 2023", "who placed at 2a states 126lbs in 2018",
 * "2026 state qualifiers", and regional placement: "who won 4a east regionals 106 2026", "regional placers 6A 113".
 */

import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/server-supabase"
import { HandlerResult, QueryContext } from "../handler-registry"

export async function handleStatePlacement(context: QueryContext): Promise<HandlerResult | null> {
  const { message, lowerQuestion, messageId } = context
  const adminClient = getSupabaseAdmin()
  
  // Regional vs state: "regionals", "regional champion", "regional placers", "east regionals", "west regionals"
  const isRegionalQuery = lowerQuestion.includes("regional") || lowerQuestion.includes("regionals")
  const isEast = /\beast\b/i.test(lowerQuestion)
  const isWest = /\bwest\b/i.test(lowerQuestion)
  
  // Extract parameters (same logic as before)
  let classification: string | null = null
  const statesMatch = lowerQuestion.match(/(\d+)[aA]\s+states/i)
  if (statesMatch) {
    classification = `${statesMatch[1]}A`
  }
  if (!classification) {
    const inAtMatch = lowerQuestion.match(/(?:at|in)\s+(\d+)[aA]\s+\d{4}\s+states/i)
    if (inAtMatch) {
      classification = `${inAtMatch[1]}A`
    }
  }
  if (!classification) {
    const showAllMatch = lowerQuestion.match(/(?:placers|placer)\s+(\d+)[aA]\s+\d+/i)
    if (showAllMatch) {
      classification = `${showAllMatch[1]}A`
    }
  }
  if (!classification) {
    const atMatch = lowerQuestion.match(/(?:at|in)\s+(\d+)[aA]/i)
    if (atMatch) {
      classification = `${atMatch[1]}A`
    }
  }
  if (!classification) {
    const yearDivMatch = lowerQuestion.match(/(\d+)[aA]\s+\d{4}/i)
    if (yearDivMatch) {
      classification = `${yearDivMatch[1]}A`
    }
  }
  if (!classification) {
    const weightDivMatch = lowerQuestion.match(/(\d+)[aA]\s+\d+\s*(?:lbs|lb)\b/i)
    if (weightDivMatch) {
      classification = `${weightDivMatch[1]}A`
    }
  }
  if (!classification) {
    const divisionMatch = lowerQuestion.match(/(\d+)\s*[aA]/i)
    if (divisionMatch) {
      const divNum = divisionMatch[1]
      const matchIndex = lowerQuestion.indexOf(divisionMatch[0])
      const afterMatch = lowerQuestion.substring(matchIndex + divisionMatch[0].length, matchIndex + divisionMatch[0].length + 10)
      if (!afterMatch.toLowerCase().includes("lbs") && !afterMatch.toLowerCase().includes("lb") && !afterMatch.toLowerCase().match(/^\d/)) {
        classification = `${divNum}A`
      }
    }
  }
  
  let weightClass: number | null = null
  const weightMatch = lowerQuestion.match(/(\d+)\s*(?:lbs|lb|pounds)/i)
  if (weightMatch) {
    weightClass = parseInt(weightMatch[1])
  }
  // "state placers 215 8a 2026" or "126 7a 2026" — weight without "lbs"; use standard weight-class numbers
  if (weightClass == null) {
    const standardWeights = [106, 113, 120, 126, 132, 138, 144, 150, 157, 165, 175, 190, 215, 285]
    const bareWeightMatch = lowerQuestion.match(/\b(106|113|120|126|132|138|144|150|157|165|175|190|215|285)\b/)
    if (bareWeightMatch && standardWeights.includes(parseInt(bareWeightMatch[1]))) {
      weightClass = parseInt(bareWeightMatch[1])
    }
  }
  
  let year: number | null = null
  const yearMatch = lowerQuestion.match(/\b(20\d{2})\b/)
  if (yearMatch) {
    year = parseInt(yearMatch[1])
  } else if (lowerQuestion.includes("last year")) {
    year = 2025
  }
  
  let targetPlace: number | null = null
  let isAllPlacers = lowerQuestion.includes("all placers") || lowerQuestion.includes("all state placers") || 
                    lowerQuestion.includes("show all") ||
                    (lowerQuestion.includes("who placed") && !lowerQuestion.match(/(\d+)(?:nd|rd|th|st)/i))
  if (!isAllPlacers) {
    if (lowerQuestion.includes("won") || lowerQuestion.includes("champion")) {
      targetPlace = 1
    } else {
      const placeMatch = lowerQuestion.match(/(\d+)(?:nd|rd|th|st)/i)
      if (placeMatch) {
        targetPlace = parseInt(placeMatch[1])
      }
    }
  }
  
  // Detect gender from query
  const isWomenQuery = lowerQuestion.includes("women") || lowerQuestion.includes("woman") || 
                       lowerQuestion.includes("girls") || lowerQuestion.includes("girl")
  const isMenQuery = lowerQuestion.includes("men") || lowerQuestion.includes("man") || 
                     lowerQuestion.includes("boys") || lowerQuestion.includes("boy")
  
  // -------- Regional placement (qualifying_tournament, qualifying_place 1-4) --------
  if (isRegionalQuery) {
    const filterYear = year ?? 2026
    let regionalQuery = adminClient
      .from("wrestling_nchsaa_results")
      .select("wrestler_name, school, year, classification, weight_class, qualifying_tournament, qualifying_place")
      .gte("qualifying_place", 1)
      .lte("qualifying_place", 4)
    if (classification) {
      const div = (classification || "").toUpperCase()
      if (filterYear >= 2026 && (div === "1A" || div === "2A")) regionalQuery = regionalQuery.eq("classification", "1A/2A")
      else if (filterYear >= 2026 && ["3A","4A","5A","6A","7A","8A"].includes(div)) regionalQuery = regionalQuery.eq("classification", div)
      else regionalQuery = regionalQuery.ilike("classification", classification)
    } else if (isWomenQuery) {
      regionalQuery = regionalQuery.ilike("classification", "Girls")
    } else if (isMenQuery && filterYear >= 2026) {
      regionalQuery = regionalQuery.in("classification", ["1A/2A", "3A", "4A", "5A", "6A", "7A", "8A"])
    }
    if (weightClass) regionalQuery = regionalQuery.or(`weight_class.eq.${weightClass},weight_class.eq.${weightClass}lbs,weight_class.ilike.%${weightClass}%`)
    if (filterYear) regionalQuery = regionalQuery.eq("year", filterYear)
    if (isEast) regionalQuery = regionalQuery.ilike("qualifying_tournament", "%east%")
    if (isWest) regionalQuery = regionalQuery.ilike("qualifying_tournament", "%west%")
    if (targetPlace) regionalQuery = regionalQuery.eq("qualifying_place", targetPlace)
    const { data: regionalResults, error: regionalError } = await regionalQuery
      .order("qualifying_place", { ascending: true })
      .order("wrestler_name", { ascending: true })
    let regionalAnswer = ""
    if (!regionalError && regionalResults && regionalResults.length > 0) {
      const regionLabel = isEast ? "East" : isWest ? "West" : ""
      const regionText = regionLabel ? ` (${regionLabel} regional)` : " regional"
      if (targetPlace === 1 && !isAllPlacers) {
        const champ = regionalResults.find((r: any) => r.qualifying_place === 1) || regionalResults[0]
        const tourn = (champ.qualifying_tournament || "").toString().trim()
        regionalAnswer = `Great question! The ${classification || ""}${regionText} champion at ${weightClass || ""}lbs${filterYear ? ` in ${filterYear}` : ""} was **${champ.wrestler_name}** from **${champ.school}**${tourn ? ` (${tourn})` : ""}.`
      } else if (targetPlace && targetPlace > 1 && !isAllPlacers) {
        const placer = regionalResults.find((r: any) => r.qualifying_place === targetPlace)
        if (placer) {
          const placeText = targetPlace === 2 ? "2nd" : targetPlace === 3 ? "3rd" : "4th"
          regionalAnswer = `Great question! ${placeText} place at ${weightClass || ""}lbs in ${classification || ""}${regionText}${filterYear ? ` in ${filterYear}` : ""} was **${placer.wrestler_name}** from **${placer.school}**.`
        }
      }
      if (!regionalAnswer) {
        const sorted = [...regionalResults].sort((a: any, b: any) => {
          const qpA = a.qualifying_place ?? 9
          const qpB = b.qualifying_place ?? 9
          if (qpA !== qpB) return qpA - qpB
          return (a.qualifying_tournament || "").localeCompare(b.qualifying_tournament || "")
        })
        const placeToEmoji = (p: number) => p === 1 ? "🥇" : p === 2 ? "🥈" : p === 3 ? "🥉" : "4️⃣"
        regionalAnswer = `Great question! Here are the **${classification || ""}${regionText} placers**${weightClass ? ` at ${weightClass}lbs` : ""}${filterYear ? ` in ${filterYear}` : ""} (${sorted.length}):\n\n`
        sorted.forEach((r: any) => {
          const qp = r.qualifying_place ?? 0
          const emoji = placeToEmoji(qp)
          const placeLabel = qp === 1 ? "Champion" : qp === 2 ? "2nd" : qp === 3 ? "3rd" : "4th"
          const tourn = (r.qualifying_tournament || "").toString().trim()
          regionalAnswer += `${emoji} **${placeLabel}** — ${r.wrestler_name} (${r.school})${tourn ? ` — ${tourn}` : ""}\n`
        })
      }
      if (regionalAnswer) {
        return { answer: regionalAnswer, results: regionalResults, queryType: "state_placement", messageId: messageId || undefined }
      }
    }
    if (isRegionalQuery && (!regionalResults || regionalResults.length === 0)) {
      const regionText = isEast ? " East" : isWest ? " West" : ""
      return {
        answer: `Great question! I don't have regional placement data for ${classification || ""}${regionText}${weightClass ? ` ${weightClass}lbs` : ""}${filterYear ? ` in ${filterYear}` : ""}. Regional results are stored when uploaded with Qualifying Tournament and Qualifying Place.`,
        queryType: "state_placement",
        messageId: messageId || undefined
      }
    }
  }
  
  // 2026+ has 4 placers (1-4); 2025 and earlier had up to 8 (1-8). State qualifiers = place 0.
  const isQualifiersQuery = lowerQuestion.includes("state qualifier") || lowerQuestion.includes("state qualifiers") ||
    lowerQuestion.includes("state qualifers") || lowerQuestion.includes("state qualifer") || // typos
    (lowerQuestion.includes("qualifiers") && (lowerQuestion.includes("state") || lowerQuestion.includes("2026"))) ||
    (lowerQuestion.includes("qualifers") && (lowerQuestion.includes("state") || lowerQuestion.includes("2026"))) ||
    (lowerQuestion.includes("qualifer") && (lowerQuestion.includes("state") || lowerQuestion.includes("2026"))) // typo singular
  const reqYear = year ?? 2026
  const maxPlace = isQualifiersQuery ? 0 : reqYear >= 2026 ? 4 : 8
  const filterYear = isQualifiersQuery && year == null ? 2026 : year

  let query = adminClient
    .from("wrestling_nchsaa_results")
    .select("wrestler_name, place, year, classification, weight_class, school")
  if (isQualifiersQuery) {
    query = query.eq("place", 0)
  } else {
    query = query.gte("place", 1).lte("place", maxPlace)
  }

  if (classification) {
    // For 2026 qualifiers 3A–8A we apply a lenient .or() below; skip strict ilike so "7" rows aren't excluded
    const div = (classification || "").toUpperCase()
    const is2026Qualifier3to8 = isQualifiersQuery && reqYear >= 2026 && ["3A","4A","5A","6A","7A","8A"].includes(div)
    if (!is2026Qualifier3to8) query = query.ilike("classification", classification)
  } else if (isWomenQuery) {
    // Explicitly asking for women/girls — Girls classification only
    query = query.ilike("classification", "Girls")
  } else if (reqYear >= 2026) {
    // 2026+: default to men's (7 classifications). Only include women when they say women/girls/female.
    query = query.in("classification", ["1A/2A", "3A", "4A", "5A", "6A", "7A", "8A"])
  } else if (isMenQuery) {
    // Older years: if they said men/boys, exclude Girls
    query = query.not("classification", "ilike", "Girls")
  }
  if (weightClass) {
    // DB may store "126" or "126lbs" — match both
    query = query.or(`weight_class.eq.${weightClass},weight_class.eq.${weightClass}lbs,weight_class.ilike.%${weightClass}%`)
  }
  if (filterYear) {
    query = query.eq("year", filterYear)
  }
  if (targetPlace && !isQualifiersQuery) {
    query = query.eq("place", targetPlace)
  }
  // For 2026 men's qualifiers, restrict to 7 classifications (exclude women's 1-4A unless asked)
  if (isQualifiersQuery && reqYear >= 2026 && !classification && !isWomenQuery) {
    query = query.in("classification", ["1A/2A", "3A", "4A", "5A", "6A", "7A", "8A"])
  }
  if (isQualifiersQuery && classification && reqYear >= 2026) {
    // Map 1A/2A for 2026; for 3A–8A match "7A", "7", "7 A" etc. so no qualifier is dropped (e.g. Gavin Hickey 7A 126)
    const div = (classification || "").toUpperCase()
    if (div === "1A" || div === "2A") query = query.eq("classification", "1A/2A")
    else if (["3A","4A","5A","6A","7A","8A"].includes(div)) {
      // Use ilike so we match "7A", "7", "7 A" regardless of how classification is stored
      query = query.or(`classification.ilike.${div},classification.ilike.${div.replace(/A$/, "")}%`)
    }
  }

  const { data: results, error } = await query
    .order("place", { ascending: true })
    .order("wrestler_name", { ascending: true })
  
  if (error) {
    console.error("[Handler] State placement error:", error)
    return null // Fall through to AI agent
  }
  
  if (!results || results.length === 0) {
    // Try fallback with similar classifications (simplified for now)
    return null // Fall through to AI agent for now
  }
  
  // Format response
  let answer = ""
  if (isQualifiersQuery && results.length > 0) {
    // "was Gavin Hickey a 2026 state qualifier?" / "what gavin hickey a 2026 state qualifer?" — answer yes/no for one person
    const nameInQueryMatch = lowerQuestion.match(/(?:what|was|is|did)\s+([a-z][a-z'\s-]+?)\s+(?:a\s+)?(?:\d{4}\s+)?state\s+qualif/i) ||
      lowerQuestion.match(/(?:state\s+qualif(?:ier|iers|ers|er)s?)\s+(?:in\s+)?(?:\d{4}\s+)?(?:was\s+)?([a-z][a-z'\s-]+?)(?:\s|$|\?)/i)
    const nameFromQuery = nameInQueryMatch ? nameInQueryMatch[1].trim().replace(/\s+/g, " ") : null
    const normalizeName = (n: string) => n.toLowerCase().trim().replace(/,/g, " ").replace(/\s+/g, " ")
    const queryNorm = nameFromQuery ? normalizeName(nameFromQuery) : ""
    if (queryNorm && queryNorm.split(/\s+/).length >= 2) {
      const match = results.find((r: any) => {
        const dbNorm = normalizeName(r.wrestler_name || "")
        const dbParts = dbNorm.split(/\s+/).filter(Boolean)
        const qParts = queryNorm.split(/\s+/).filter(Boolean)
        if (dbParts.length < 2 || qParts.length < 2) return dbNorm === queryNorm
        const dbFirst = dbParts[0], dbLast = dbParts[dbParts.length - 1]
        const qFirst = qParts[0], qLast = qParts[qParts.length - 1]
        return (dbFirst === qFirst && dbLast === qLast) || (dbFirst === qLast && dbLast === qFirst)
      })
      if (match) {
        const w = (match.weight_class ?? "").toString().trim()
        const weightDisplay = /lbs$/i.test(w) ? w : (w ? `${w}lbs` : "")
        const displayName = (match.wrestler_name || "").replace(/^([^,]+),\s*([^,]+)$/, "$2 $1").trim() || match.wrestler_name
        answer = `Yes — **${displayName}** was a ${reqYear} state qualifier (${match.classification} ${weightDisplay}, ${match.school}).`
      } else {
        const displayName = nameFromQuery!.replace(/\b\w/g, (c) => c.toUpperCase())
        answer = `No — **${displayName}** was not listed as a ${reqYear} state qualifier.`
      }
    }
    if (!answer) {
      const sorted = [...results].sort((a: any, b: any) => {
        const c = (a.classification || "").localeCompare(b.classification || "")
        if (c !== 0) return c
        const w = (a.weight_class || "").toString().localeCompare((b.weight_class || "").toString())
        if (w !== 0) return w
        return (a.wrestler_name || "").localeCompare(b.wrestler_name || "")
      })
      const classLabel = classification || (reqYear >= 2026 ? "men's (all 7 classifications)" : "")
      answer = `Great question! Here are the **${reqYear} state qualifiers**${weightClass ? ` at ${weightClass}lbs` : ""}${classLabel ? ` in ${classLabel}` : ""} (${sorted.length}):\n\n`
      sorted.forEach((r: any) => {
        const w = (r.weight_class ?? "").toString().trim()
        const weightDisplay = /lbs$/i.test(w) ? w : (w ? `${w}lbs` : "")
        answer += `- **${r.wrestler_name}** — ${r.school} (${r.classification} ${weightDisplay})\n`
      })
    }
  } else if (targetPlace === 1 && !isAllPlacers) {
    const champions = results.filter((r: any) => r.place === 1)
    if (champions.length > 0) {
      const champ = champions[0]
      answer = `Great question! The ${classification || ""} state champion at ${weightClass || ""}lbs${year ? ` in ${year}` : ""} was **${champ.wrestler_name}** from **${champ.school}**.`
    }
  } else if (targetPlace && targetPlace > 1 && !isAllPlacers) {
    const placers = results.filter((r: any) => r.place === targetPlace)
    if (placers.length > 0) {
      const placer = placers[0]
      const placeText = targetPlace === 2 ? "2nd" : targetPlace === 3 ? "3rd" : targetPlace === 4 ? "4th" : targetPlace === 5 ? "5th" : targetPlace === 6 ? "6th" : targetPlace === 7 ? "7th" : "8th"
      answer = `Great question! ${placeText.charAt(0).toUpperCase() + placeText.slice(1)} place at ${weightClass || ""}lbs in ${classification || ""} states${year ? ` in ${year}` : ""} was **${placer.wrestler_name}** from **${placer.school}**.`
    }
  } else if (!isQualifiersQuery) {
    const sortedResults = results.sort((a: any, b: any) => {
      if (a.place !== b.place) return a.place - b.place
      return (a.wrestler_name || "").localeCompare(b.wrestler_name || "")
    })
    // 2026+ default is men's; only show women when they explicitly say women/girls/female
    const defaultMen = reqYear >= 2026 && !classification && !isWomenQuery
    const genderText = isWomenQuery ? "Women's" : (isMenQuery || defaultMen) ? "Men's" : ""
    const genderNote = isWomenQuery ? " (Women's/Girls)" : (isMenQuery || defaultMen) ? " (Men's)" : ""
    answer = `Great question! Here are all the${genderText ? ` ${genderText.toLowerCase()}` : ""} state placers${genderNote} at ${weightClass || ""}lbs${classification ? ` in ${classification}` : ""} states${year ? ` in ${year}` : ""}:\n\n`
    const placeToEmoji = (place: number) => place === 1 ? "🥇" : place === 2 ? "🥈" : place === 3 ? "🥉" : place === 4 ? "4️⃣" : `${place}th`
    sortedResults.forEach((r: any) => {
      const emoji = placeToEmoji(r.place ?? 0)
      const placeLabel = r.place === 1 ? "Champion" : r.place === 2 ? "2nd" : r.place === 3 ? "3rd" : `${r.place}th`
      answer += `${emoji} **${placeLabel}** — ${r.wrestler_name} (${r.school})\n`
    })
  }
  
  if (answer) {
    return {
      answer,
      results,
      queryType: "state_placement",
      messageId: messageId || undefined
    }
  }
  
  return null
}

