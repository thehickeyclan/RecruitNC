import { NextRequest } from "next/server"

/**
 * Returns plain HTML for the article. No React, no layout, no client bundle.
 * Form submit to /article/slug = one GET, one response. Nothing can cancel it.
 */
const ARTICLE_HTML: Record<string, string> = {
  "seven-divisions-98-brackets-784-qualifiers": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Did North Carolina Wrestling Expand Divisions—But Shrink Our Future? | NC Wrestling</title>
  <style>
    *{box-sizing:border-box} body{margin:0;font-family:system-ui,sans-serif;background:linear-gradient(to bottom right,#f8fafc,#e2e8f0);min-height:100vh;color:#334155;line-height:1.6}
    .c{max-width:42rem;margin:0 auto;padding:1.5rem 1rem 3rem}
    a{color:#003366;text-decoration:underline}
    a:hover{text-decoration:none}
    h1{font-size:1.75rem;color:#003366;margin:1rem 0 0.5rem}
    .date{font-size:0.875rem;color:#64748b;margin-bottom:1.5rem}
    .back{display:inline-block;margin-bottom:1.5rem;padding:0.5rem 1rem;border:2px solid #C20017;color:#C20017;text-decoration:none;border-radius:0.375rem;font-size:0.875rem;font-weight:500}
    .back:hover{background:#C20017;color:#fff}
    .card{background:#fff;border-radius:0.5rem;border:1px solid #e2e8f0;padding:1.5rem 2rem;box-shadow:0 1px 3px rgba(0,0,0,0.05)}
    article p{margin:0.75rem 0}
    article h2{font-size:1.25rem;margin:2rem 0 1rem;font-weight:700;color:#0f172a}
    article hr{margin:2rem 0;border:0;border-top:1px solid #e2e8f0}
    article ul{margin:1rem 0;padding-left:1.5rem;list-style:disc}
    article li{margin:0.25rem 0}
    .box{margin:1.5rem 0;padding:1rem 1.25rem;border-radius:0.5rem;border-left:4px solid}
    .box-navy{background:rgba(0,51,102,0.08);border-color:#003366}
    .box-amber{background:#fffbeb;border-color:#d97706}
    .box-red{background:rgba(194,0,23,0.1);border-color:#C20017}
    .link{font-weight:500;color:#003366;margin-top:2rem}
  </style>
</head>
<body>
  <div class="c">
    <a href="/nchsaa/2026" class="back">← Back to 2026 Results</a>
    <h1>Did North Carolina Wrestling Expand Divisions—But Shrink Our Future?</h1>
    <p class="date">February 25, 2026</p>
    <div class="card">
      <article>
        <p style="color:#475569;font-weight:500"><strong>Before anything else:</strong></p>
        <p>Our athletes deserve respect. State champions worked for it. Placers earned it. Qualifiers sacrificed for it.</p>
        <p><strong>This conversation is about protecting meaning — not diminishing effort.</strong></p>
        <hr/>
        <h2>The Question That Needs Clarity</h2>
        <p>North Carolina wrestling operates under eight classifications during the regular season, which becomes seven at the state tournament when 1A and 2A combine.</p>
        <p>That creates: 98 weight class brackets, 784 state qualifiers, 392 placers, 98 state champions.</p>
        <p>The structure changed. But the explanation hasn't reached the wrestling community in a clear, measurable way.</p>
        <p><strong>Why seven divisions?</strong> What problem does this solve? What long-term goal does it serve? How will success be measured?</p>
        <p><strong>In the absence of clarity, questions are inevitable.</strong></p>
        <hr/>
        <h2>Define Success — Or We're Guessing</h2>
        <p>Structural decisions should align to outcomes. If the goal is participation growth, competitive development, college placement, or fairness — we need measurable outcomes. <strong>The essential question: What metrics would prove this model is working?</strong></p>
        <hr/>
        <h2>Wrestling Is Not Football</h2>
        <p>Enrollment-based logic makes sense in football. It does not translate cleanly to wrestling. Wrestling is individual — fourteen weight classes, one athlete per weight. In North Carolina, development happens largely through clubs. <strong>Large enrollment does not create wrestling excellence. Wrestling culture does.</strong></p>
        <hr/>
        <h2>The Recruiting Reality</h2>
        <p>College coaches are asked to evaluate 784 qualifiers, 392 placers, across multiple classifications, in a two-day window. <strong>Not because our athletes lack talent — but because the structure lacks signal density.</strong></p>
        <hr/>
        <h2>A Path Forward</h2>
        <p>Transparency. Measurable outcomes. Competitive density as a principle. Stakeholder alignment. <strong>Scarcity does not limit achievement. It strengthens it.</strong></p>
        <p><strong>North Carolina wrestling deserves both.</strong></p>
        <hr/>
        <p class="link"><strong>Continue to Part 2:</strong> <a href="/nchsaa/2026/news/article-2">Understanding Bracket Depth in a 7 Division System</a></p>
      </article>
    </div>
  </div>
</body>
</html>`,
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const html = ARTICLE_HTML[slug]
  if (!html) return new Response("Not found", { status: 404 })
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  })
}
