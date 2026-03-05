import { headers } from "next/headers"

export default function AuthUrlsPage() {
  const h = headers()
  const proto = h.get("x-forwarded-proto") || "https"
  const host = h.get("host") || "localhost:3000"
  const origin = `${proto}://${host}`

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin
  const callbackUrl = `${siteUrl.replace(/\/$/, "")}/auth/callback`

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Auth URL Helper</h1>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">This deployment</h2>
        <div className="rounded-md border bg-white p-4 text-sm">
          <div className="mb-2">
            <span className="font-medium">Detected origin: </span>
            <code className="px-1 py-0.5 rounded bg-gray-100">{origin}</code>
          </div>
          <div>
            <span className="font-medium">NEXT_PUBLIC_SITE_URL: </span>
            <code className="px-1 py-0.5 rounded bg-gray-100">
              {process.env.NEXT_PUBLIC_SITE_URL || "(not set)"}
            </code>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Callback URL to configure</h2>
        <div className="rounded-md border bg-white p-4">
          <code className="break-all">{callbackUrl}</code>
        </div>
        <ul className="list-disc pl-5 text-sm text-gray-700">
          <li>Supabase → Settings → Auth → URL Configuration → Redirect URLs: add this exact URL.</li>
          <li>For OAuth (Google/GitHub/etc.), add this exact URL in the provider console as an authorized redirect/callback URL.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Recommended settings</h2>
        <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-1">
          <li>Set “Site URL” in Supabase to <code className="px-1 py-0.5 rounded bg-gray-100">{siteUrl}</code>.</li>
          <li>Add <code className="px-1 py-0.5 rounded bg-gray-100">{callbackUrl}</code> to Supabase “Redirect URLs”.</li>
          <li>Add the same callback URL to each OAuth provider’s authorized redirect URLs.</li>
          <li>For email links, pass <code>emailRedirectTo="{callbackUrl}"</code> in <code>signInWithOtp</code>.</li>
        </ol>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Custom domain (e.g. app.ncwrestlingunited.com)</h2>
        <p className="text-sm text-gray-700">
          If sign-in loops or admin data is empty on the custom domain but works on the Vercel URL, see{" "}
          <code className="px-1 py-0.5 rounded bg-gray-100">docs/CUSTOM-DOMAIN-AUTH-AND-DATA.md</code>. In short: set Supabase Site URL and Redirect URLs to the custom domain, set <code className="px-1 py-0.5 rounded bg-gray-100">NEXT_PUBLIC_SITE_URL</code> to that domain in Vercel Production, and use the same Supabase env vars for the deployment that serves the custom domain.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Test after configuring</h2>
        <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-1">
          <li>Log out, then log in again.</li>
          <li>Open <code>/api/debug/auth-status</code> — it should show your user and userId.</li>
        </ol>
      </section>
    </main>
  )
}
