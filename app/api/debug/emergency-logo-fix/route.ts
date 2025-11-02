import { NextResponse } from "next/server"
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST() {
  try {
    let logosRestored = 0
    let mappingsCreated = 0
    const details: any[] = []

    // Critical logo mappings to restore
    const criticalMappings = [
      {
        entity_name: 'OBX Wrestling Factory',
        entity_type: 'wrestling_club',
        logo_url: '/wrestling-club-logo.png',
        division: null
      },
      {
        entity_name: 'NC State University',
        entity_type: 'college',
        logo_url: '/wolfpack-logo.png',
        division: 'NCAA D1'
      },
      {
        entity_name: 'University of North Carolina at Chapel Hill',
        entity_type: 'college',
        logo_url: '/UNC_Chapel_Hill_Logo.png',
        division: 'NCAA D1'
      },
      {
        entity_name: 'Appalachian State University',
        entity_type: 'college',
        logo_url: '/appalachian-state-mountains.png',
        division: 'NCAA D1'
      },
      {
        entity_name: 'Campbell University',
        entity_type: 'college',
        logo_url: '/campbell-university-seal.png',
        division: 'NCAA D1'
      },
      {
        entity_name: 'Cary High School',
        entity_type: 'high_school',
        logo_url: '/cary-high-school-spirit.png',
        division: null
      },
      {
        entity_name: 'Cardinal Gibbons High School',
        entity_type: 'high_school',
        logo_url: '/cardinal-gibbons-crest.png',
        division: null
      },
      {
        entity_name: 'Hough High School',
        entity_type: 'high_school',
        logo_url: '/hough-high-school-logo.png',
        division: null
      },
      {
        entity_name: 'Laney High School',
        entity_type: 'high_school',
        logo_url: '/Laney-High-Wildcats.png',
        division: null
      }
    ]

    // Restore each critical mapping
    for (const mapping of criticalMappings) {
      try {
        // Check if mapping already exists
        const { data: existing } = await supabase
          .from('logo_mappings')
          .select('*')
          .eq('entity_name', mapping.entity_name)
          .single()

        if (existing) {
          // Update existing mapping
          const { error: updateError } = await supabase
            .from('logo_mappings')
            .update({
              logo_url: mapping.logo_url,
              entity_type: mapping.entity_type,
              division: mapping.division,
              updated_at: new Date().toISOString()
            })
            .eq('entity_name', mapping.entity_name)

          if (!updateError) {
            logosRestored++
            details.push({ action: 'updated', entity: mapping.entity_name })
          }
        } else {
          // Create new mapping
          const { error: insertError } = await supabase
            .from('logo_mappings')
            .insert({
              ...mapping,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })

          if (!insertError) {
            mappingsCreated++
            logosRestored++
            details.push({ action: 'created', entity: mapping.entity_name })
          }
        }
      } catch (error) {
        details.push({ 
          action: 'failed', 
          entity: mapping.entity_name, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }

    // Also ensure media_items table has the logo files
    const logoFiles = [
      {
        name: 'OBX Wrestling Factory Logo',
        file_path: '/wrestling-club-logo.png',
        file_type: 'image/png',
        entity_type: 'wrestling_club',
        entity_name: 'OBX Wrestling Factory'
      },
      {
        name: 'NC State Logo',
        file_path: '/wolfpack-logo.png',
        file_type: 'image/png',
        entity_type: 'college',
        entity_name: 'NC State University'
      },
      {
        name: 'UNC Chapel Hill Logo',
        file_path: '/UNC_Chapel_Hill_Logo.png',
        file_type: 'image/png',
        entity_type: 'college',
        entity_name: 'University of North Carolina at Chapel Hill'
      }
    ]

    // Add media items if they don't exist
    for (const file of logoFiles) {
      try {
        const { data: existingMedia } = await supabase
          .from('media_items')
          .select('*')
          .eq('file_path', file.file_path)
          .single()

        if (!existingMedia) {
          await supabase
            .from('media_items')
            .insert({
              ...file,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
        }
      } catch (error) {
        // Media item creation is optional
      }
    }

    return NextResponse.json({
      success: true,
      logosRestored,
      mappingsCreated,
      message: `Emergency fix completed. Restored ${logosRestored} logos and created ${mappingsCreated} new mappings.`,
      details
    })

  } catch (error) {
    console.error('Emergency fix error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Emergency fix failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
