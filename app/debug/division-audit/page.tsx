"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

function norm(text: string) {
  return text.toLowerCase().normalize("NFKC")
  // leave punctuation as-is for regex scans
}

const re = {
  // Global, tokenized patterns. Order is important to avoid overlaps.
  independent: /\b(ncaa\s*independent|independent)\b/g,
  naia: /\b(naia)\b/g,
  njcaa: /\b(njcaa|juco|junior\s*college|community\s*college|jc)\b/g,
  d3: /\b(ncaa\s*d\s*iii|ncaa\s*division\s*iii|division\s*iii|division\s*3|div\s*3|d\s*iii|d3|diii)\b/g,
  d2: /\b(ncaa\s*d\s*ii|ncaa\s*division\s*ii|division\s*ii|division\s*2|div\s*2|d\s*ii|d2|dii)\b/g,
  d1: /\b(ncaa\s*d\s*i(?!i)|ncaa\s*division\s*i(?!i)|division\s*i(?!i)|division\s*1|div\s*1|d\s*i(?!i)|d1|di(?!i))\b/g,
}

type Counts = {
  DI: number
  DII: number
  DIII: number
  NAIA: number
  NJCAA: number
  Independent: number
  total: number
}

function computeCounts(input: string): Counts {
  const s = norm(input)

  const counts: Counts = {
    DI: 0,
    DII: 0,
    DIII: 0,
    NAIA: 0,
    NJCAA: 0,
    Independent: 0,
    total: 0,
  }

  const add = (key: keyof Counts, n: number) => {
    counts[key] += n
    counts.total += n
  }

  // Non-NCAA first
  add("Independent", (s.match(re.independent) || []).length)
  add("NAIA", (s.match(re.naia) || []).length)
  add("NJCAA", (s.match(re.njcaa) || []).length)

  // NCAA ordered to avoid DI capturing DII/DIII
  add("DIII", (s.match(re.d3) || []).length)
  add("DII", (s.match(re.d2) || []).length)
  add("DI", (s.match(re.d1) || []).length)

  return counts
}

export default function DivisionAuditPage() {
  const [text, setText] = useState("")

  const counts = useMemo(() => computeCounts(text), [text])

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Division Audit from Pasted Admin Text</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Paste the raw text from your Admin athletes table here. We will parse Division tokens and compute counts
            using the same normalization the Stats API uses (DIII, then DII, then DI; plus NAIA, NJCAA, Independent).
          </p>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the Admin table text..."
            rows={12}
            className="font-mono"
          />
          <div className="flex gap-2">
            <Button type="button" onClick={() => setText("")} variant="secondary">
              Clear
            </Button>
            <Button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(counts)).catch(() => {})
              }}
            >
              Copy Counts JSON
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>DI</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{counts.DI}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>DII</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{counts.DII}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>DIII</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{counts.DIII}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>NAIA</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{counts.NAIA}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>NJCAA</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{counts.NJCAA}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Independent</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{counts.Independent}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Totals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold">Total athletes in pasted text: {counts.total}</div>
          <pre className="mt-4 rounded bg-muted p-3 text-sm">{JSON.stringify(counts, null, 2)}</pre>
          <p className="mt-3 text-sm text-muted-foreground">
            Compare these to your homepage stats and the /api/stats response. They should align if the Admin data and
            API normalization match.
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
