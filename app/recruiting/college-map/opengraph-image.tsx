import { ImageResponse } from "next/og"

import { recruitNCMapStats } from "@/lib/college-programs/load"
import { DIVISION_COLOR, primaryDivision } from "@/lib/college-programs/types"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * The preview a text or post shows for the college map link: the map itself, with every program
 * on RecruitNC lit up, and the live counts. Rebuilt hourly so the numbers keep up with sign-ups.
 */
export const alt = "College programs on RecruitNC"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const revalidate = 3600

const NAVY = "#060F1F"
const GOLD = "#E8BA5A"

// The map is a Mapbox static image at a fixed centre and zoom, so each school's pixel is plain Web
// Mercator maths and the dots land exactly on it. The centre sits west of the US so the country
// fills the right of the card and the words have the left.
const CENTER = { lon: -120.5, lat: 37.6 }
const ZOOM = 3.0
const WORLD = 512 * 2 ** ZOOM

function project(lon: number, lat: number): { x: number; y: number } {
  const px = (l: number) => ((l + 180) / 360) * WORLD
  const py = (a: number) => {
    const r = (a * Math.PI) / 180
    return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * WORLD
  }
  return { x: px(lon) - px(CENTER.lon) + size.width / 2, y: py(lat) - py(CENTER.lat) + size.height / 2 }
}

async function mapBackground(): Promise<string | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
  if (!token) return null
  const url = `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${CENTER.lon},${CENTER.lat},${ZOOM}/${size.width}x${size.height}@2x?access_token=${token}`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return `data:image/png;base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`
  } catch {
    return null
  }
}

async function font(weight: 400 | 800): Promise<ArrayBuffer> {
  const res = await fetch(`https://cdn.jsdelivr.net/fontsource/fonts/inter@5.0.8/latin-${weight}-normal.woff`)
  return res.arrayBuffer()
}

export default async function Image() {
  const [stats, map, regular, heavy] = await Promise.all([
    recruitNCMapStats(createAdminClient()),
    mapBackground(),
    font(400),
    font(800),
  ])
  const on = new Set(stats.onRecruitNC.map((s) => s.id))
  const dot = (lon: number, lat: number) => project(lon, lat)
  const numbers: Array<[number, string]> = [
    [stats.coaches, "College coaches"],
    [stats.onRecruitNC.length, "Programs"],
    [stats.states, "States"],
  ]

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: NAVY, fontFamily: "Inter" }}>
        {map ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={map} width={size.width} height={size.height} style={{ position: "absolute", top: 0, left: 0 }} alt="" />
        ) : null}
        {stats.schools
          .filter((s) => !on.has(s.id))
          .map((s) => {
            const p = dot(s.longitude, s.latitude)
            return (
              <div
                key={s.id}
                style={{ position: "absolute", left: p.x - 2.5, top: p.y - 2.5, width: 5, height: 5, borderRadius: 5, background: "rgba(255,255,255,0.28)" }}
              />
            )
          })}
        {stats.onRecruitNC.map((s) => {
          const p = dot(s.longitude, s.latitude)
          return (
            <div
              key={s.id}
              style={{
                position: "absolute",
                left: p.x - 7,
                top: p.y - 7,
                width: 14,
                height: 14,
                borderRadius: 14,
                background: DIVISION_COLOR[primaryDivision(s)],
                border: "2.5px solid #FFFFFF",
              }}
            />
          )
        })}
        {/* Fades the map out under the words. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 580,
            height: size.height,
            background: `linear-gradient(90deg, ${NAVY} 0%, ${NAVY} 78%, rgba(6,15,31,0) 100%)`,
          }}
        />
        <div style={{ position: "absolute", top: 0, left: 0, width: 560, height: "100%", display: "flex", flexDirection: "column", padding: "52px 0 44px 60px" }}>
          <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: 5, color: GOLD }}>RECRUITNC · RECRUITING PORTAL</div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 22, fontSize: 60, fontWeight: 800, lineHeight: 1, letterSpacing: -1.5 }}>
            <span style={{ color: "#FFFFFF" }}>COLLEGE PROGRAMS</span>
            <span style={{ color: GOLD }}>ON RECRUITNC</span>
          </div>
          <div style={{ marginTop: 18, width: 110, height: 6, background: GOLD }} />
          <div style={{ display: "flex", marginTop: 40, gap: 36 }}>
            {numbers.map(([n, label]) => (
              <div key={label} style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 64, fontWeight: 800, color: GOLD, lineHeight: 1 }}>{n}</span>
                <span style={{ marginTop: 8, fontSize: 16, fontWeight: 800, letterSpacing: 2, color: "#FFFFFF" }}>{label.toUpperCase()}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 34, fontSize: 24, fontWeight: 800, color: "rgba(255,255,255,0.72)", letterSpacing: 1 }}>
            DI · DII · DIII · NAIA · NJCAA
          </div>
          <div style={{ marginTop: "auto", fontSize: 20, fontWeight: 400, letterSpacing: 3, color: "rgba(255,255,255,0.8)" }}>
            APP.NCWRESTLINGUNITED.COM
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Inter", data: regular, weight: 400, style: "normal" },
        { name: "Inter", data: heavy, weight: 800, style: "normal" },
      ],
    },
  )
}
