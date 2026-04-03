"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { processWomensMatches } from "@/app/nhsca/live/actions/womens-match-actions"
import { Loader2, Upload, CheckCircle2, XCircle } from "lucide-react"
import { Card } from "@/components/ui/card"

export function WomensMatchUploader() {
  const [jsonText, setJsonText] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!jsonText.trim()) return

    setIsProcessing(true)
    setResult(null)

    try {
      const response = await processWomensMatches(jsonText)
      setResult(response)
      if (response.success) {
        setJsonText("")
      }
    } catch (error) {
      setResult({ success: false, message: `Error: ${error}` })
    } finally {
      setIsProcessing(false)
    }
  }

  const exampleJSON = `[
  {
    "wrestler": "Yaleen Khang",
    "weight": 100,
    "city": "Newton",
    "record": "1-1",
    "matches": [
      {
        "round": "Round of 32",
        "result": "LOSS - VFA",
        "opponent": "Peggy susan Dean",
        "opponent_state": "CO",
        "score": "9-0",
        "time": "3:03"
      },
      {
        "round": "Consi of 16 #1",
        "result": "WIN - VFA",
        "opponent": "Ella Giallombardo",
        "opponent_state": "MI",
        "score": "4-0",
        "time": "0:36"
      }
    ]
  }
]`

  return (
    <Card className="glass border-purple-500/50 bg-purple-500/5 p-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
            <Upload className="w-5 h-5 text-purple-500" />
            Women's Match Bulk Uploader
          </h2>
          <p className="text-sm text-muted-foreground">
            Paste JSON array of women's wrestlers with their complete match history. Automatically detects duplicates.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Wrestler Data (JSON Array)</label>
            <Textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder={exampleJSON}
              className="min-h-[400px] font-mono text-xs bg-background/50 border-border"
              disabled={isProcessing}
            />
            <p className="text-xs text-muted-foreground mt-2">
              💡 Tip: Safe to re-upload - duplicates are automatically skipped
            </p>
          </div>

          <Button
            type="submit"
            disabled={isProcessing || !jsonText.trim()}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing Matches...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload All Women's Matches
              </>
            )}
          </Button>
        </form>

        {result && (
          <div
            className={`p-4 rounded-lg border ${
              result.success
                ? "bg-green-500/10 border-green-500/50 text-green-600"
                : "bg-red-500/10 border-red-500/50 text-red-600"
            }`}
          >
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              )}
              <pre className="whitespace-pre-wrap text-sm font-mono flex-1">{result.message}</pre>
            </div>
          </div>
        )}

        <div className="bg-background/50 rounded-lg p-4 border border-border">
          <h3 className="font-semibold text-sm text-foreground mb-2">Features:</h3>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>✅ Bulk upload all wrestlers and matches at once</li>
            <li>✅ Automatically creates new wrestlers if they don't exist</li>
            <li>✅ Detects and skips duplicate matches</li>
            <li>✅ Creates win alerts for all victories</li>
            <li>✅ Auto-calculates records (wins/losses)</li>
            <li>✅ Marks wrestlers with 2+ losses as eliminated</li>
            <li>✅ Safe to re-run - won't create duplicates</li>
          </ul>
        </div>
      </div>
    </Card>
  )
}
