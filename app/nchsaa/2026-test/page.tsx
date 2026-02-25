/**
 * Minimal canary route: no auth, no Supabase, no client JS.
 * If this page loads but /nchsaa/2026 does not, the problem is in [year]/page.tsx or its data.
 * If this page also does not load, the problem is routing, middleware, or layout.
 */
export default function Nchsaa2026TestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <p className="text-lg font-medium text-[#03154c]">
        [RecruitNC] Test: if you see this, /nchsaa/2026-test loaded. Routing is OK.
      </p>
    </div>
  )
}
