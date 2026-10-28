/**
 * The coach product's screenshots for /for-coaches, with invented wrestlers (scenes.tsx). Dev only;
 * ?shot=board|compare|report|athletes|commitments|messages|alerts renders one screen at the size
 * scripts/coach-screens.cjs captures into public/screens/coach-*.jpg.
 */
import { notFound } from "next/navigation"
import { Scene } from "./scenes"

export const dynamic = "force-dynamic"

export default async function CoachScreens({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  if (process.env.NODE_ENV === "production") notFound()
  const shot = (await searchParams)?.shot ?? "board"
  return (
    <div id="shot" className="min-h-screen bg-[#0B1426] p-8 text-white">
      {/* The product only: no site menu, assistant bubble, dev badge or coach tabs. */}
      <style>{"header,nav[aria-label='Main navigation'],nextjs-portal,footer{display:none!important}"}</style>
      <Scene shot={shot} />
    </div>
  )
}
