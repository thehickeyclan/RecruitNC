import "server-only"
import { US_ZIP_POINTS } from "./us-zip-points"

/**
 * Where a US ZIP code is: the Census internal point of its ZIP code area, as [lat, lon], or null for
 * a ZIP the Census doesn't map (PO-box-only ZIPs, typos). Every state, not just NC, so an
 * out-of-state family's distance answers measure from home, not from the middle of their state.
 * Server-only: the table is about 600 KB and must never ship to a browser.
 */
let points: Map<string, [number, number]> | null = null

export function zipPoint(zip: string | null | undefined): [number, number] | null {
  const z = String(zip ?? "").trim().slice(0, 5)
  if (!/^\d{5}$/.test(z)) return null
  if (!points) {
    points = new Map()
    for (const rec of US_ZIP_POINTS.split(";")) {
      const [lat, lon] = rec.slice(5).split(",")
      points.set(rec.slice(0, 5), [Number(lat), Number(lon)])
    }
  }
  return points.get(z) ?? null
}
