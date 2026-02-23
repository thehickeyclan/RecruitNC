"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AuthGuard } from "@/components/auth-guard"
import { School } from "lucide-react"
import Link from "next/link"

export default function SchoolsPage() {
  return (
    <AuthGuard>
      <div className="container mx-auto py-10 px-4">
        <h1 className="mb-6 text-3xl font-bold text-[#13294B]">Schools</h1>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <School className="h-5 w-5" />
              NC high school wrestling
            </CardTitle>
            <CardDescription>
              Browse schools and NCHSAA results. This page is being migrated from Legacy NC.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Full schools list and search (with <code className="text-sm bg-muted px-1 rounded">lib/school-normalization</code> and NCHSAA/NHSCA data) will be copied from Legacy NC. For now, you can use{" "}
              <Link href="/high-schools" className="text-[#13294B] hover:underline font-medium">High Schools</Link> or{" "}
              <Link href="/public-rankings" className="text-[#13294B] hover:underline font-medium">Rankings</Link>.
            </p>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  )
}
