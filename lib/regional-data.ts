/**
 * NCHSAA regional data: East/West regions and school lists per classification.
 * Used by app/nchsaa/page.tsx for the "New 8A Classification System" collapsible sections.
 *
 * Copy the full data from Legacy NC lib/regional-data.ts if you have it;
 * this stub allows the overview page to render (regional breakdown will be empty until then).
 */
export interface RegionData {
  region: string
  schools: string[]
}

export const regionsData: RegionData[] = []
