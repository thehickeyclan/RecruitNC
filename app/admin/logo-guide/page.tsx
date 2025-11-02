import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ExternalLink, CheckCircle2, Info, Settings, ArrowRight } from "lucide-react"

export default function LogoGuidePage() {
  return (
    <main className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Logo Management Guide</h1>
        <p className="text-muted-foreground mt-2">
          Use a single, canonical tool to add or update logos, names, and aliases without breaking anything.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-xl">Canonical Tool</CardTitle>
          <Badge variant="secondary" className="uppercase">
            Recommended
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="font-medium">Enhanced Logo Manager</div>
            <div className="text-sm text-muted-foreground">
              Path: <code className="bg-muted px-1 py-0.5 rounded">/admin/enhanced-logo-manager</code>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <div className="font-medium">Add a new logo mapping</div>
                <div className="text-sm text-muted-foreground">
                  Provide entity name, type (club, highschool, college), logo URL, and optional aliases.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <div className="font-medium">Edit existing mapping</div>
                <div className="text-sm text-muted-foreground">
                  Search, filter by type, update name/logo/aliases, and save. Changes apply site-wide.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <div className="font-medium">Aliases improve matching</div>
                <div className="text-sm text-muted-foreground">
                  Add variations like {'"Darkhorse"'}, {'"Dark Horse"'}, {'"DH Wrestling"'} to boost auto-matching.
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Link href="/admin/enhanced-logo-manager">
              <Button className="gap-2">
                Open Enhanced Logo Manager
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl">What gets updated?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="font-medium">Database table</div>
            <div className="text-sm text-muted-foreground">
              All changes write to <code className="bg-muted px-1 py-0.5 rounded">logo_mappings</code>:
            </div>
            <ul className="text-sm text-muted-foreground list-disc pl-6 mt-2">
              <li>
                <code>entity_name</code> – the canonical name displayed around the site
              </li>
              <li>
                <code>entity_type</code> – one of: <code>club</code>, <code>highschool</code>, <code>college</code>
              </li>
              <li>
                <code>logo_url</code> – the image URL used by cards and components
              </li>
              <li>
                <code>aliases</code> – comma-separated alternative names for matching
              </li>
            </ul>
          </div>

          <div>
            <div className="font-medium">Who consumes it?</div>
            <ul className="text-sm text-muted-foreground list-disc pl-6 mt-2">
              <li>SmartLogo and other logo components resolve logos using this table</li>
              <li>Commitment/Athlete cards pull logos from the mapping for consistent display</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl">Step-by-step</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal pl-6 space-y-2 text-sm text-muted-foreground">
            <li>
              Go to <code className="bg-muted px-1 py-0.5 rounded">/admin/enhanced-logo-manager</code>.
            </li>
            <li>
              In “Create New Logo Mapping”, enter:
              <ul className="list-disc pl-6 mt-2">
                <li>Entity Name (e.g., Darkhorse Wrestling Club)</li>
                <li>Entity Type (club, highschool, college)</li>
                <li>Logo URL (https://...)</li>
                <li>Aliases (optional variations, comma-separated)</li>
              </ul>
            </li>
            <li>Click “Create Mapping”.</li>
            <li>Verify on a card page (or use your debug pages) that the logo displays correctly.</li>
          </ol>

          <Alert>
            <AlertDescription className="text-sm">
              Tip: Use aliases generously for known variations. This improves automatic matching on athlete cards
              without manual fixes.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl">If you landed in an older logo tool</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2">
            <Settings className="h-5 w-5 mt-0.5 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">
              Old links like <code className="bg-muted px-1 py-0.5 rounded">/admin/logo-manager</code> now redirect to
              the Enhanced Logo Manager automatically.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 mt-0.5 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">
              For athlete profile photos (not logos), use your athlete image tools (e.g., Athlete Image Manager). Logos
              for clubs, high schools, and colleges belong in the Enhanced Logo Manager.
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">API (optional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm text-muted-foreground">
            Advanced: Programmatic CRUD is available via{" "}
            <code className="bg-muted px-1 py-0.5 rounded">/api/logo-mappings</code> and{" "}
            <code className="bg-muted px-1 py-0.5 rounded">/api/logo-mappings/[id]</code>.
          </div>
          <div className="flex gap-2 pt-1">
            <Link href="/api/logo-mappings" target="_blank" className="inline-flex">
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                Browse API
                <ExternalLink className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
