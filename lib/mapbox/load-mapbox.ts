"use client"

/**
 * Mapbox GL, loaded once per page from Mapbox's CDN.
 *
 * There is no npm package: the club finder loaded the script and stylesheet by hand, and the
 * college map uses the same loader so two maps on one visit share one download.
 */

export const MAPBOX_SCRIPT_ID = "mapbox-gl-js"
export const MAPBOX_CSS_ID = "mapbox-gl-css"
export const MAPBOX_VERSION = "v3.21.0"

export type MapboxLike = {
  accessToken: string
  Map: new (options: Record<string, unknown>) => MapLike
  NavigationControl: new (options?: Record<string, unknown>) => unknown
}

export type MapLike = {
  addControl: (control: unknown, position?: string) => void
  addSource: (id: string, source: Record<string, unknown>) => void
  addLayer: (layer: Record<string, unknown>, beforeId?: string) => void
  getSource: (id: string) => { setData?: (data: unknown) => void; getClusterExpansionZoom?: (clusterId: number, callback: (error: Error | null, zoom: number) => void) => void } | undefined
  getLayer: (id: string) => unknown
  setFilter: (layerId: string, filter: unknown[]) => void
  fitBounds: (bounds: [[number, number], [number, number]], options?: Record<string, unknown>) => void
  easeTo: (options: Record<string, unknown>) => void
  getZoom: () => number
  resize: () => void
  queryRenderedFeatures: (point: unknown, options?: Record<string, unknown>) => Array<Record<string, any>>
  on: (event: string, layerOrHandler: string | ((event?: any) => void), handler?: (event?: any) => void) => void
  once: (event: string, handler: () => void) => void
  remove: () => void
  getCanvas: () => { style: { cursor: string } }
}

declare global {
  interface Window {
    mapboxgl?: MapboxLike
  }
}

let mapboxPromise: Promise<MapboxLike> | null = null

export function loadMapbox() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Mapbox can only load in the browser."))
  }

  if (window.mapboxgl) {
    return Promise.resolve(window.mapboxgl)
  }

  if (mapboxPromise) return mapboxPromise

  const pending = new Promise<MapboxLike>((resolve, reject) => {
    if (!document.getElementById(MAPBOX_CSS_ID)) {
      const link = document.createElement("link")
      link.id = MAPBOX_CSS_ID
      link.rel = "stylesheet"
      link.href = `https://api.mapbox.com/mapbox-gl-js/${MAPBOX_VERSION}/mapbox-gl.css`
      document.head.appendChild(link)
    }

    const existingScript = document.getElementById(MAPBOX_SCRIPT_ID) as HTMLScriptElement | null
    if (existingScript) {
      existingScript.addEventListener("load", () => {
        if (window.mapboxgl) resolve(window.mapboxgl)
        else reject(new Error("Mapbox loaded, but window.mapboxgl was unavailable."))
      })
      existingScript.addEventListener("error", () => reject(new Error("Unable to load Mapbox.")))
      return
    }

    const script = document.createElement("script")
    script.id = MAPBOX_SCRIPT_ID
    script.src = `https://api.mapbox.com/mapbox-gl-js/${MAPBOX_VERSION}/mapbox-gl.js`
    script.async = true
    script.onload = () => {
      if (window.mapboxgl) resolve(window.mapboxgl)
      else reject(new Error("Mapbox loaded, but window.mapboxgl was unavailable."))
    }
    script.onerror = () => reject(new Error("Unable to load Mapbox."))
    document.body.appendChild(script)
  })

  // Don't cache a rejection — otherwise one failed load (offline, blocked CDN) poisons
  // every retry for the rest of the session.
  mapboxPromise = pending
  pending.catch(() => {
    mapboxPromise = null
  })

  return pending
}
