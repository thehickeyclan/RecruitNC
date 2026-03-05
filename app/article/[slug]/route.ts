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
    .back{display:inline-block;margin-bottom:1.5rem;padding:0.5rem 1rem;border:2px solid #C20017;color:#C20017;text-decoration:none;border-radius:0.375rem;font-size:0.875rem;font-weight:500;background:transparent;cursor:pointer;font-family:inherit}
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
    .stats{display:grid;grid-template-columns:1fr 1fr;gap:0.75rem 1rem;margin:1.5rem 0}
    .stat{text-align:center;padding:1rem;border-radius:0.5rem;border-left:4px solid #003366;background:rgba(0,51,102,0.08)}
    .stat-num{font-size:1.5rem;font-weight:700;color:#003366}
    .stat-label{font-size:0.875rem;color:#64748b}
    .link{font-weight:500;color:#003366;margin-top:2rem}
    .footer{font-size:0.875rem;color:#64748b;font-style:italic;margin-top:1.5rem}
  </style>
</head>
<body>
  <div class="c">
    <button type="button" class="back" onclick="window.location.href='/nchsaa/2026'">← Back to 2026 Results</button>
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
        <p>That creates:</p>
        <div class="stats">
          <div class="stat"><div class="stat-num">98</div><div class="stat-label">weight class brackets</div></div>
          <div class="stat"><div class="stat-num">784</div><div class="stat-label">state qualifiers</div></div>
          <div class="stat"><div class="stat-num">392</div><div class="stat-label">placers</div></div>
          <div class="stat"><div class="stat-num">98</div><div class="stat-label">state champions</div></div>
        </div>
        <p>The structure changed. But the explanation hasn't reached the wrestling community in a clear, measurable way.</p>
        <p><strong>Why seven divisions?</strong> What problem does this solve? What long-term goal does it serve? How will success be measured?</p>
        <p><strong>In the absence of clarity, questions are inevitable.</strong></p>
        <hr/>
        <h2>Define Success — Or We're Guessing</h2>
        <p>Structural decisions should align to outcomes.</p>
        <p>If the goal is <strong>participation growth</strong> — track retention and new programs.</p>
        <p>If the goal is <strong>competitive development</strong> — track NHSCA All-Americans and national placements.</p>
        <p>If the goal is <strong>college placement</strong> — track offers, commitments, and in-state retention.</p>
        <p>If the goal is <strong>fairness</strong> — track competitive parity across divisions.</p>
        <p><strong>The essential question: What metrics would prove this model is working?</strong></p>
        <p>Without defined benchmarks, we are making structural decisions in the dark. Developmental states cannot afford guesswork.</p>
        <hr/>
        <h2>Wrestling Is Not Football</h2>
        <p>Enrollment-based logic makes sense in football. It does not translate cleanly to wrestling.</p>
        <p>Wrestling is individual — fourteen weight classes, one athlete per weight.</p>
        <p>You don't need 2,000 students to produce an elite 150-pounder. You need culture, coaching, and club development.</p>
        <p>In North Carolina, development happens largely through clubs — not school enrollment size. Clubs do not segregate by classification. A 1A wrestler trains beside a 7A wrestler.</p>
        <p><strong>The results reflect that reality:</strong></p>
        <div class="box box-amber">
          <p><strong>In the Class of 2026, 68% of ranked prospects</strong> come from 6A and below.</p>
          <p>Three of the four four-time state champions in 2026 came from smaller schools.</p>
        </div>
        <p><strong>Large enrollment does not create wrestling excellence. Wrestling culture does.</strong></p>
        <hr/>
        <h2>The Recruiting Reality</h2>
        <p><strong>College coaches showed up. That matters.</strong></p>
        <p>But clarity matters too.</p>
        <p>They are asked to evaluate:</p>
        <ul>
          <li><strong>784 qualifiers</strong></li>
          <li><strong>392 placers</strong></li>
          <li>Across multiple classifications</li>
          <li>In a two-day window</li>
        </ul>
        <p>Coaches build programs — they are not full-time data analysts.</p>
        <p>When achievement density expands, evaluation becomes less efficient. In a transfer portal era, complexity does not help in-state athletes.</p>
        <p>When clarity decreases, coaches default to national events, college opens, and out-of-state comparisons. That shifts leverage away from the state tournament.</p>
        <p><strong>Not because our athletes lack talent — but because the structure lacks signal density.</strong></p>
        <hr/>
        <h2>The Competitive Density Problem</h2>
        <p>A handful of brackets are highly competitive. However, the large majority are not.</p>
        <p>It is possible for:</p>
        <ul>
          <li>A fourth-place finisher in one bracket to win several others</li>
          <li>A non-placer in one division to outperform champions elsewhere</li>
        </ul>
        <p>That does not diminish the athletes. But it does create structural inconsistency.</p>
        <p><strong>When competitive density varies widely, shared definitions weaken.</strong></p>
        <hr/>
        <h2>The Vocabulary Problem</h2>
        <p>State Champion. State Finalist. State Placer. State Qualifier.</p>
        <p>These terms should immediately communicate level and difficulty.</p>
        <p>When 392 athletes place, "state placer" requires context. When 98 champions are crowned, "state champion" requires specification.</p>
        <p><strong>When achievement language requires explanation, value dilutes.</strong></p>
        <p>In recruiting, clarity matters. In development, standards matter.</p>
        <hr/>
        <h2>The Spectator Experience</h2>
        <p>Championships shape perception.</p>
        <p>When multiple finals occur simultaneously across seven divisions, the experience becomes fragmented.</p>
        <p>Presentation influences prestige. Prestige influences growth.</p>
        <p><strong>If the state finals are the showcase of our sport, the experience must feel elevated and cohesive.</strong></p>
        <hr/>
        <h2>A Path Forward</h2>
        <p>This is about alignment — not criticism.</p>
        <p>If the objectives include stronger national competitiveness, clear recruiting pathways, elevated championship prestige, and sustainable long-term growth — structure must support those goals.</p>
        <p><strong>What would help:</strong></p>
        <ul>
          <li><strong>1. Transparency.</strong> Clear articulation of the problem being solved and the data behind the decision.</li>
          <li><strong>2. Measurable outcomes.</strong> Publish metrics. Track annually. Report publicly.</li>
          <li><strong>3. Competitive density as a principle.</strong> Structure divisions around preserving meaningful bracket depth. For context: California and New Jersey have 1 classification, New York has 2. We'd advocate for 3 classifications based on competitive density thresholds.</li>
          <li><strong>4. Stakeholder alignment.</strong> Engage college programs and club leaders in ongoing dialogue.</li>
        </ul>
        <p>The specific number of divisions matters less than the principles: competitive density, clear communication, measurable accountability, and willingness to evaluate and adjust.</p>
        <hr/>
        <h2>The End Goal</h2>
        <p>This is not about reducing opportunity. It is about increasing meaning.</p>
        <p>When someone wins a state title in North Carolina, the country should understand exactly what that represents.</p>
        <div class="box box-red"><p><strong>Scarcity does not limit achievement. It strengthens it.</strong></p></div>
        <hr/>
        <h2>Moving Forward</h2>
        <p>North Carolina wrestling has momentum. College coaches are attending, participation is strong, and community energy is high.</p>
        <p>But momentum must be paired with structural clarity.</p>
        <p>Strong systems invite evaluation. Strong communities engage in dialogue.</p>
        <div class="box box-navy"><p><strong>North Carolina wrestling deserves both.</strong></p></div>
        <hr/>
        <p class="link"><strong>Continue to Part 2:</strong> <a href="/nchsaa/2026/news/article-2">Understanding Bracket Depth in a 7 Division System</a></p>
        <p class="footer">This article represents the perspectives of NC United Wrestling on classification structure and long-term development. We welcome dialogue and engagement from the broader wrestling community.</p>
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
