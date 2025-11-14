"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function AIInsights() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI-Powered Insights</CardTitle>
        <CardDescription>Data-driven observations about NC wrestling commitments</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-muted p-4">
          <h3 className="mb-2 font-semibold">Trend Analysis</h3>
          <p className="text-sm">
            Division I commitments have increased by 15% compared to last year, with Appalachian State leading
            recruitment efforts in the state.
          </p>
        </div>

        <div className="rounded-lg bg-muted p-4">
          <h3 className="mb-2 font-semibold">Regional Insight</h3>
          <p className="text-sm">
            The Charlotte metro area produces the highest number of D1 wrestlers, while the Triangle region leads in
            overall college commitments.
          </p>
        </div>

        <div className="rounded-lg bg-muted p-4">
          <h3 className="mb-2 font-semibold">Prediction</h3>
          <p className="text-sm">
            Based on current trends, we expect to see a 20% increase in women's wrestling commitments over the next
            recruitment cycle.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
