"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { bulkImportRoster } from "@/app/nhsca/live/actions/roster-actions"
import { Upload, CheckCircle, AlertCircle } from "lucide-react"

export function BulkRosterImport() {
  const [rosterText, setRosterText] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleImport = async () => {
    if (!rosterText.trim()) {
      setResult({ success: false, message: "Please paste roster data" })
      return
    }

    setIsLoading(true)
    setResult(null)

    try {
      const response = await bulkImportRoster(rosterText)
      setResult(response)
      if (response.success) {
        setRosterText("")
      }
    } catch (error) {
      setResult({ success: false, message: "Failed to import roster" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="glass border-border p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-foreground mb-2">Bulk Roster Import</h3>
          <p className="text-sm text-muted-foreground">
            Paste roster data in format: "Name WeightClass" (one per line)
          </p>
        </div>

        <Textarea
          placeholder="Example:&#10;Zack Knott 285&#10;Keyshon Morrison 215&#10;Gavin Lopez 215"
          value={rosterText}
          onChange={(e) => setRosterText(e.target.value)}
          className="min-h-[200px] font-mono text-sm"
        />

        <Button onClick={handleImport} disabled={isLoading} className="w-full">
          <Upload className="w-4 h-4 mr-2" />
          {isLoading ? "Importing..." : "Import Roster"}
        </Button>

        {result && (
          <div
            className={`flex items-center gap-2 p-3 rounded-lg ${
              result.success ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
            }`}
          >
            {result.success ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <p className="text-sm font-medium">{result.message}</p>
          </div>
        )}
      </div>
    </Card>
  )
}
