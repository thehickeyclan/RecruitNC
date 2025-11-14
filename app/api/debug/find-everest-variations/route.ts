import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()

    // Search for various name combinations and patterns
    const searchPatterns = [
      // Exact variations
      'Everest Ouellette',
      'Everrest Ouellette', 
      'Everest OUellete',
      'Everrest OUellete',
      'Everest Ouellete',
      'Everrest Ouellete',
      
      // Partial patterns
      '%Ever%Ouel%',
      '%Ever%OUel%',
      '%Everest%',
      '%Everrest%',
      '%Ouellette%',
      '%OUellete%',
      '%Ouellete%'
    ]

    const results: any[] = []
    const foundIds = new Set<string>()

    // Search each pattern
    for (const pattern of searchPatterns) {
      let query
      
      if (pattern.includes('%')) {
        // Use LIKE for wildcard patterns
        query = supabase
          .from('athletes')
          .select('*')
          .or(`name.ilike.${pattern},firstName.ilike.${pattern},lastName.ilike.${pattern}`)
      } else {
        // Use exact match for specific names
        query = supabase
          .from('athletes')
          .select('*')
          .or(`name.ilike.${pattern},firstName.ilike.${pattern.split(' ')[0]},lastName.ilike.${pattern.split(' ')[1] || pattern}`)
      }

      const { data, error } = await query

      if (!error && data) {
        data.forEach(athlete => {
          if (!foundIds.has(athlete.id)) {
            foundIds.add(athlete.id)
            results.push(athlete)
          }
        })
      }
    }

    // Also search for any athlete with wrestling club containing "OBX"
    const { data: obxData, error: obxError } = await supabase
      .from('athletes')
      .select('*')
      .or('wrestlingClub.ilike.%OBX%,wrestlingClub.ilike.%Wrestling Factory%')

    if (!obxError && obxData) {
      obxData.forEach(athlete => {
        if (!foundIds.has(athlete.id)) {
          foundIds.add(athlete.id)
          results.push(athlete)
        }
      })
    }

    // Sort results by relevance (exact matches first)
    results.sort((a, b) => {
      const aName = a.name?.toLowerCase() || ''
      const bName = b.name?.toLowerCase() || ''
      
      // Prioritize names that start with "Ever"
      const aStartsWithEver = aName.startsWith('ever')
      const bStartsWithEver = bName.startsWith('ever')
      
      if (aStartsWithEver && !bStartsWithEver) return -1
      if (!aStartsWithEver && bStartsWithEver) return 1
      
      // Then prioritize names containing "ouel"
      const aContainsOuel = aName.includes('ouel')
      const bContainsOuel = bName.includes('ouel')
      
      if (aContainsOuel && !bContainsOuel) return -1
      if (!aContainsOuel && bContainsOuel) return 1
      
      return aName.localeCompare(bName)
    })

    return NextResponse.json({
      success: true,
      results,
      searchPatterns,
      totalFound: results.length,
      searchInfo: {
        exactPatterns: searchPatterns.filter(p => !p.includes('%')),
        wildcardPatterns: searchPatterns.filter(p => p.includes('%')),
        obxSearch: true
      }
    })

  } catch (error) {
    console.error('Error searching for Everest variations:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to search for name variations',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
