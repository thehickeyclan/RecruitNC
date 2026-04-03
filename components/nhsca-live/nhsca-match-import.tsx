"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { processNHSCAMatches } from "@/app/nhsca/live/actions/nhsca-match-actions"
import { Loader2, Trophy } from "lucide-react"

type Classification = "Freshman" | "Sophomore" | "Junior" | "Senior"

export function NHSCAMatchImport() {
  const [text, setText] = useState("")
  const [classification, setClassification] = useState<Classification>("Senior")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const result = await processNHSCAMatches(text, classification)

      if (result.success) {
        setMessage({ type: "success", text: result.message })
        setText("")
      } else {
        setMessage({ type: "error", text: result.message })
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to process matches" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#0D1A4D] rounded-lg p-6 border-2 border-[#D3B574]">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-[#D3B574] rounded-lg">
          <Trophy className="w-6 h-6 text-[#0D1A4D]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">NHSCA Match Import</h2>
          <p className="text-sm text-gray-300">Paste FloArena results to update NC wrestler records</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Classification selector */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">Classification</label>
          <div className="flex gap-2 flex-wrap">
            {(["Freshman", "Sophomore", "Junior", "Senior"] as Classification[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setClassification(c)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                  classification === c
                    ? "bg-[#B31B1B] text-white"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="nhsca-matches" className="block text-sm font-medium text-white mb-2">
            Paste Match Results
          </label>
          <Textarea
            id="nhsca-matches"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`106Charlie Fogle statesville, NC (NC) TF Bentley Alcantara Moncks Corner, SC (SC), 17-0 3:19
106Bodhi Nickerson Blossburg, PA (PA) F Gavin Spell Parkton, NC (NC), 2:57
113Aj White Julian, NC (NC) TF Benjamin Seifert Garden City, NY (NY), 16-0 2:38`}
            rows={12}
            className="font-mono text-sm bg-white/10 border-white/20 text-white placeholder:text-white/40"
          />
          <p className="text-xs text-gray-400 mt-2">
            Format: WeightWinner City, ST (ST) WIN_TYPE Loser City, ST (ST), Score Time
          </p>
          <p className="text-xs text-[#D3B574] mt-1">
            WIN_TYPE: F (Fall), TF (Tech Fall), MD (Major), DEC (Decision), SV (Sudden Victory)
          </p>
        </div>

        {message && (
          <div
            className={`p-3 rounded-lg ${
              message.type === "success"
                ? "bg-green-500/20 text-green-300 border border-green-500/30"
                : "bg-red-500/20 text-red-300 border border-red-500/30"
            }`}
          >
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        <Button
          type="submit"
          disabled={loading || !text.trim()}
          className="w-full bg-[#B31B1B] hover:bg-[#8B1515] text-white font-bold"
        >
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Process {classification} Matches
        </Button>
      </form>
    </div>
  )
}
