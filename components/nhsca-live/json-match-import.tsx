"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { processJSONMatches } from "@/app/nhsca/live/actions/json-match-actions"
import { Loader2 } from "lucide-react"

export function JSONMatchImport() {
  const [jsonText, setJsonText] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!jsonText.trim()) return

    setIsProcessing(true)
    setResult(null)

    try {
      const response = await processJSONMatches(jsonText)
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Textarea
        value={jsonText}
        onChange={(e) => setJsonText(e.target.value)}
        placeholder='Paste Claude JSON here:
{
  "nc_wrestlers": [
    {
      "name": "Liam Myles",
      "weight_class": "106",
      "result": "win",
      "method": "F",
      "opponent": "Stephano Calderon",
      "score": "4:10"
    }
  ]
}'
        className="min-h-[200px] font-mono text-sm"
        disabled={isProcessing}
      />

      <Button type="submit" disabled={isProcessing || !jsonText.trim()} className="w-full">
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          "Import JSON Matches"
        )}
      </Button>

      {result && (
        <div
          className={`p-4 rounded-lg ${result.success ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}
        >
          <pre className="whitespace-pre-wrap text-sm">{result.message}</pre>
        </div>
      )}
    </form>
  )
}
