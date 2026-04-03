"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Download, Copy } from "lucide-react"
import Link from "next/link"

type CardType = "big-win" | "ranked-win" | "seeded-win" | "perfect-day" | "all-american" | "custom"

const cardTemplates: { type: CardType; label: string; headline: string; subtext: string }[] = [
  { type: "big-win", label: "Big Win", headline: "BIG WIN ALERT", subtext: "NHSCA Nationals 2025" },
  { type: "ranked-win", label: "Ranked Win", headline: "RANKED WIN", subtext: "vs Nationally Ranked Opponent" },
  { type: "seeded-win", label: "Upset Win", headline: "UPSET ALERT", subtext: "Defeats Higher Seed" },
  { type: "perfect-day", label: "Perfect Day", headline: "PERFECT DAY", subtext: "Undefeated on the Day" },
  { type: "all-american", label: "All-American", headline: "ALL-AMERICAN", subtext: "NHSCA Nationals 2025" },
  { type: "custom", label: "Custom", headline: "NHSCA NATIONALS", subtext: "2025" },
]

export default function SocialCardGenerator() {
  const [cardType, setCardType] = useState<CardType>("big-win")
  const [wrestlerName, setWrestlerName] = useState("")
  const [weightClass, setWeightClass] = useState("")
  const [classification, setClassification] = useState("")
  const [school, setSchool] = useState("")
  const [result, setResult] = useState("")
  const [opponent, setOpponent] = useState("")
  const [customHeadline, setCustomHeadline] = useState("")
  const [customSubtext, setCustomSubtext] = useState("")

  const template = cardTemplates.find(t => t.type === cardType) || cardTemplates[0]
  const headline = cardType === "custom" ? customHeadline : template.headline
  const subtext = cardType === "custom" ? customSubtext : template.subtext

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-[#0D1A4D] text-white p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/nhsca/live" className="flex items-center gap-2 text-white/80 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </Link>
          <h1 className="text-xl font-bold">Social Media Card Generator</h1>
          <div className="w-24" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#0D1A4D] mb-4">Card Details</h2>
            
            {/* Card Type */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Card Type</label>
              <div className="grid grid-cols-3 gap-2">
                {cardTemplates.map(t => (
                  <button
                    key={t.type}
                    onClick={() => setCardType(t.type)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      cardType === t.type
                        ? "bg-[#0D1A4D] text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {cardType === "custom" && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Headline</label>
                  <input
                    type="text"
                    value={customHeadline}
                    onChange={(e) => setCustomHeadline(e.target.value)}
                    placeholder="BIG WIN ALERT"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D1A4D]"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subtext</label>
                  <input
                    type="text"
                    value={customSubtext}
                    onChange={(e) => setCustomSubtext(e.target.value)}
                    placeholder="NHSCA Nationals 2025"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D1A4D]"
                  />
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Wrestler Name</label>
                <input
                  type="text"
                  value={wrestlerName}
                  onChange={(e) => setWrestlerName(e.target.value)}
                  placeholder="John Smith"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D1A4D]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Weight Class</label>
                <input
                  type="text"
                  value={weightClass}
                  onChange={(e) => setWeightClass(e.target.value)}
                  placeholder="138 lbs"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D1A4D]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Classification</label>
                <select
                  value={classification}
                  onChange={(e) => setClassification(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D1A4D]"
                >
                  <option value="">Select...</option>
                  <option value="Freshman">Freshman</option>
                  <option value="Sophomore">Sophomore</option>
                  <option value="Junior">Junior</option>
                  <option value="Senior">Senior</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">School</label>
                <input
                  type="text"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  placeholder="Apex HS"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D1A4D]"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Result (optional)</label>
              <input
                type="text"
                value={result}
                onChange={(e) => setResult(e.target.value)}
                placeholder="W by Fall, 2:34"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D1A4D]"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Opponent (optional)</label>
              <input
                type="text"
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                placeholder="vs #3 Nationally Ranked J. Jones (PA)"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D1A4D]"
              />
            </div>

            <p className="text-sm text-gray-500 mt-4">
              Screenshot the card preview to save and share on Instagram
            </p>
          </div>

          {/* Card Preview - Instagram 1:1 format */}
          <div>
            <h2 className="text-lg font-bold text-[#0D1A4D] mb-4">Preview (1080x1080)</h2>
            <div 
              id="social-card"
              className="relative w-full aspect-square rounded-lg overflow-hidden shadow-2xl"
              style={{
                background: "linear-gradient(180deg, #0a1128 0%, #1a2744 50%, #0a1128 100%)",
              }}
            >
              {/* Wrestling mat texture overlay */}
              <div 
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: "radial-gradient(circle at center, transparent 0%, #000 100%)",
                }}
              />
              
              {/* Stadium crowd blur at top */}
              <div 
                className="absolute top-0 left-0 right-0 h-32 opacity-30"
                style={{
                  background: "linear-gradient(180deg, rgba(100,120,180,0.3) 0%, transparent 100%)",
                }}
              />

              {/* NHSCA Logo - Top Right */}
              <div className="absolute top-6 right-6">
                <div className="text-3xl font-black tracking-tight">
                  <span className="text-[#B31B1B]">NHS</span>
                  <span className="text-[#0D1A4D]">CA</span>
                </div>
              </div>

              {/* NC United Logo - Top Left */}
              <div className="absolute top-6 left-6">
                <div className="w-16 h-16 bg-[#0D1A4D] rounded-lg flex items-center justify-center border-2 border-[#D3B574]">
                  <span className="text-white font-bold text-xs text-center leading-tight">NC<br/>UNITED</span>
                </div>
              </div>

              {/* Main Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
                {/* Red accent line */}
                <div className="w-24 h-1 bg-[#B31B1B] mb-4" />
                
                {/* Headline */}
                <h1 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tight">
                  {headline || "HEADLINE"}
                </h1>
                
                {/* Subtext */}
                <p className="text-lg text-gray-400 mb-6 tracking-wide">
                  {subtext || "Subtext"}
                </p>

                {/* Photo Placeholder + Wrestler Info */}
                <div className="flex items-center gap-6 max-w-md w-full">
                  {/* Photo Placeholder - Add in Canva */}
                  <div className="w-32 h-32 flex-shrink-0 rounded-lg border-2 border-dashed border-[#D3B574] bg-white/5 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-[#D3B574] text-3xl mb-1">+</div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wide">Add Photo<br/>in Canva</div>
                    </div>
                  </div>

                  {/* Wrestler Info */}
                  {wrestlerName && (
                    <div className="text-left flex-1">
                      <div className="text-2xl font-bold text-white mb-1">
                        {wrestlerName}
                      </div>
                      <div className="flex items-center gap-2 text-gray-300 text-sm mb-2">
                        {weightClass && <span>{weightClass}</span>}
                        {classification && <span className="text-[#D3B574]">{classification}</span>}
                      </div>
                      {school && (
                        <div className="text-gray-400 text-sm mb-2">{school}</div>
                      )}
                      {result && (
                        <div className="text-lg font-bold text-green-400 mb-1">{result}</div>
                      )}
                      {opponent && (
                        <div className="text-xs text-gray-400">{opponent}</div>
                      )}
                    </div>
                  )}
                </div>

                {/* If no wrestler name, show just placeholder centered */}
                {!wrestlerName && (
                  <div className="w-36 h-36 rounded-lg border-2 border-dashed border-[#D3B574] bg-white/5 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-[#D3B574] text-4xl mb-1">+</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Add Photo<br/>in Canva</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Branding */}
              <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-2">
                <span className="text-gray-500 text-sm">Presented by</span>
                <span className="text-white font-bold">RecruitNC</span>
              </div>

              {/* Mat circle hint */}
              <div 
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[200%] h-48 opacity-10"
                style={{
                  background: "radial-gradient(ellipse at center top, rgba(255,255,255,0.3) 0%, transparent 70%)",
                }}
              />
            </div>

            <div className="mt-4 flex gap-3">
              <Button
                onClick={() => {
                  const card = document.getElementById('social-card')
                  if (card) {
                    // This would require html2canvas in production
                    alert('Screenshot the card above to save it')
                  }
                }}
                className="flex-1 bg-[#0D1A4D] hover:bg-[#0D1A4D]/90"
              >
                <Download className="w-4 h-4 mr-2" />
                Save Card
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Templates */}
        <div className="mt-8 bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-bold text-[#0D1A4D] mb-4">Quick Fill Examples</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={() => {
                setCardType("ranked-win")
                setWrestlerName("Charlie Fogle")
                setWeightClass("106 lbs")
                setClassification("Senior")
                setSchool("Statesville HS")
                setResult("W by Dec, 7-3")
                setOpponent("vs #5 Nationally Ranked Cole Willis (NY)")
              }}
              className="p-3 bg-gray-100 rounded-lg text-left hover:bg-gray-200 transition-colors"
            >
              <div className="font-bold text-sm text-[#0D1A4D]">Ranked Win</div>
              <div className="text-xs text-gray-500">Sample ranked upset</div>
            </button>
            <button
              onClick={() => {
                setCardType("perfect-day")
                setWrestlerName("AJ White")
                setWeightClass("113 lbs")
                setClassification("Senior")
                setSchool("Julian HS")
                setResult("3-0 on Day 1")
                setOpponent("2 Pins, 1 Tech Fall")
              }}
              className="p-3 bg-gray-100 rounded-lg text-left hover:bg-gray-200 transition-colors"
            >
              <div className="font-bold text-sm text-[#0D1A4D]">Perfect Day</div>
              <div className="text-xs text-gray-500">3-0 performance</div>
            </button>
            <button
              onClick={() => {
                setCardType("seeded-win")
                setWrestlerName("Luke Richards")
                setWeightClass("106 lbs")
                setClassification("Freshman")
                setSchool("Raleigh HS")
                setResult("W by Fall, 1:21")
                setOpponent("#12 seed defeats #5 seed")
              }}
              className="p-3 bg-gray-100 rounded-lg text-left hover:bg-gray-200 transition-colors"
            >
              <div className="font-bold text-sm text-[#0D1A4D]">Upset Alert</div>
              <div className="text-xs text-gray-500">Lower seed wins</div>
            </button>
            <button
              onClick={() => {
                setCardType("all-american")
                setWrestlerName("Chris Foster")
                setWeightClass("113 lbs")
                setClassification("Senior")
                setSchool("")
                setResult("4th Place")
                setOpponent("")
              }}
              className="p-3 bg-gray-100 rounded-lg text-left hover:bg-gray-200 transition-colors"
            >
              <div className="font-bold text-sm text-[#0D1A4D]">All-American</div>
              <div className="text-xs text-gray-500">Placement finish</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
