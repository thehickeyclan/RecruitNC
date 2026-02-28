import Link from "next/link"
import {
  getArticle2ProfileIdMapDebug,
  ARTICLE_2_PROFILE_KEYS,
} from "@/app/nchsaa/[year]/news/content/article-2-profile-ids"

function key(name: string, school: string, year: string) {
  return `${name}|${school}|${year}`
}

/**
 * Troubleshooting page for NCHSAA Article 2 (Bracket Depth) profile links.
 * Use this to verify names like Gavin Yow resolve and to test by-name fallback.
 * See docs/NCHSAA-ARTICLE-LINKS-MUST-USE-BUTTON.md and docs/ARTICLE-BULLETPROOF-ROUTE.md.
 */
export default async function Article2ProfileLinksDebugPage() {
  const { map: profileIdMap, firstQueryCount, firstQueryError, fallbackCount, fallbackError, sampleKeys } =
    await getArticle2ProfileIdMapDebug()
  const keys = ARTICLE_2_PROFILE_KEYS
  const resolvedCount = Object.keys(profileIdMap).length

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Article 2 profile links (troubleshooting)</h1>
        <p className="text-gray-600 mb-4">
          Names from the Bracket Depth article. Use &quot;By-name&quot; to test the fallback when ID is missing (e.g. Gavin Yow).
        </p>
        {resolvedCount === 0 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-900 space-y-2">
            <p>No names resolved to IDs yet (map empty). Matching uses name + school + graduation year; &quot;By-name&quot; links still work in the article and here.</p>
            <p className="font-medium mt-2">Diagnostic:</p>
            <ul className="list-disc list-inside text-xs">
              <li>Query <code className="bg-amber-100 px-1">graduationyear</code> in (2026,2027,2028): <strong>{firstQueryCount}</strong> rows{firstQueryError != null && ` — error: ${firstQueryError}`}</li>
              <li>Query <code className="bg-amber-100 px-1">graduation_year</code> in (2026,2027,2028): <strong>{fallbackCount}</strong> rows{fallbackError != null && ` — error: ${fallbackError}`}</li>
              {sampleKeys != null && sampleKeys.length > 0 && (
                <li>Sample DB columns: {sampleKeys.join(", ")}</li>
              )}
            </ul>
          </div>
        )}
        <div className="mb-6 flex flex-wrap gap-3">
          <Link
            href="/nchsaa/2026/news/article-2"
            className="text-[#003366] underline font-medium"
          >
            Open Article 2 (Bracket Depth)
          </Link>
          <span className="text-gray-400">|</span>
          <Link
            href="/article/seven-divisions-98-brackets-784-qualifiers"
            className="text-[#003366] underline font-medium"
          >
            Bulletproof Part 1 (plain HTML)
          </Link>
          <span className="text-gray-400">|</span>
          <Link
            href="/debug/bulletproof-test"
            className="text-[#003366] underline font-medium"
          >
            Bulletproof flip card test
          </Link>
        </div>
        <ul className="space-y-3">
          {keys.map(([name, school, year]) => {
            const k = key(name, school, year)
            const id = profileIdMap[k]
            const byNameHref = `/unified-profile/by-name?${new URLSearchParams({
              name,
              school,
              year,
            }).toString()}`
            const viewProfileHref = id ? `/view-profile?id=${encodeURIComponent(id)}` : null
            return (
              <li key={k} className="bg-white border border-gray-200 rounded p-3">
                <span className="font-medium">{name}</span>
                <span className="text-gray-500 text-sm ml-2">
                  {school}, {year}
                </span>
                {name === "Gavin Yow" && (
                  <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                    (common test name)
                  </span>
                )}
                <div className="mt-2 flex flex-wrap gap-3 text-sm">
                  <a
                    href={byNameHref}
                    className="text-[#003366] underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    By-name
                  </a>
                  {viewProfileHref && (
                    <a
                      href={viewProfileHref}
                      className="text-[#003366] underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View profile (ID)
                    </a>
                  )}
                  {!viewProfileHref && (
                    <span className="text-gray-400">No ID in map (by-name only)</span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
