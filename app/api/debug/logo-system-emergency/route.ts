import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // Test database connection
    const { data: connectionTest, error: connectionError } = await supabase
      .from('athletes')
      .select('count')
      .limit(1)

    const databaseConnection = !connectionError

    // Count logo mappings
    const { data: logoMappings, error: logoError } = await supabase
      .from('logo_mappings')
      .select('*')

    const logoMappingsCount = logoMappings?.length || 0

    // Count media items
    const { data: mediaItems, error: mediaError } = await supabase
      .from('media_items')
      .select('*')

    const mediaItemsCount = mediaItems?.length || 0

    // Test critical logos
    const criticalEntities = [
      'OBX Wrestling Factory',
      'NC State University',
      'University of North Carolina at Chapel Hill',
      'Appalachian State University',
      'Campbell University',
      'Cary High School',
      'Cardinal Gibbons High School'
    ]

    const criticalLogosStatus: any = {}

    for (const entity of criticalEntities) {
      try {
        const { data: mapping } = await supabase
          .from('logo_mappings')
          .select('*')
          .eq('entity_name', entity)
          .single()

        if (mapping) {
          criticalLogosStatus[entity] = {
            exists: true,
            url: mapping.logo_url
          }
        } else {
          criticalLogosStatus[entity] = {
            exists: false,
            error: 'No mapping found'
          }
        }
      } catch (error) {
        criticalLogosStatus[entity] = {
          exists: false,
          error: 'Query failed'
        }
      }
    }

    // Test sample athletes
    const { data: sampleAthletes } = await supabase
      .from('athletes')
      .select('*')
      .in('id', [
        'f47ac10b-58cc-4372-a567-0e02b2c3d479', // Liam Hickey
        'f47ac10b-58cc-4372-a567-0e02b2c3d480', // Colt Campbell
        'f47ac10b-58cc-4372-a567-0e02b2c3d481'  // Lorenzo Alston
      ])

    const sampleAthleteTests: any = {}

    if (sampleAthletes) {
      for (const athlete of sampleAthletes) {
        const logoResults: any = {}

        // Test college logo
        if (athlete.college) {
          const { data: collegeMapping } = await supabase
            .from('logo_mappings')
            .select('*')
            .eq('entity_name', athlete.college)
            .single()

          logoResults.college = {
            found: !!collegeMapping,
            url: collegeMapping?.logo_url
          }
        }

        // Test high school logo
        if (athlete.highschool) {
          const { data: hsMapping } = await supabase
            .from('logo_mappings')
            .select('*')
            .eq('entity_name', athlete.highschool)
            .single()

          logoResults.highschool = {
            found: !!hsMapping,
            url: hsMapping?.logo_url
          }
        }

        // Test wrestling club logo
        if (athlete.wrestlingClub) {
          const { data: clubMapping } = await supabase
            .from('logo_mappings')
            .select('*')
            .eq('entity_name', athlete.wrestlingClub)
            .single()

          logoResults.wrestlingClub = {
            found: !!clubMapping,
            url: clubMapping?.logo_url
          }
        }

        sampleAthleteTests[athlete.id] = {
          name: athlete.name,
          college: athlete.college,
          highschool: athlete.highschool,
          wrestlingClub: athlete.wrestlingClub,
          logoResults
        }
      }
    }

    return NextResponse.json({
      databaseConnection,
      logoMappingsCount,
      mediaItemsCount,
      criticalLogosStatus,
      sampleAthleteTests
    })

  } catch (error) {
    console.error('Emergency diagnostic error:', error)
    return NextResponse.json({ 
      error: 'Diagnostic failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
