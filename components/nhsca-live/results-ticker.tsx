"use client"

import { useState, useEffect } from "react"
import type { LiveMatch } from "@/lib/nhsca-live/types"
import { getWinTypeDisplay } from "@/lib/nhsca-live/wrestling-terms"

export function ResultsTicker({ initialMatches }: ResultsTickerProps) {
  const [matches, setMatches] = useState(initialMatches)

  useEffect(() => {
    setMatches(initialMatches)
  }, [initialMatches])

  function formatMatch(match: LiveMatch) {
    const result = match.result === "win" ? "W" : "L"
    const resultClass = match.result === "win" ? "text-white bg-green-600" : "text-white bg-red-600"
    const score = `${match.nc_score}-${match.opponent_score}`
    const timeAgo = getTimeAgo(new Date(match.created_at))
    const winTypeDisplay = getWinTypeDisplay(match.win_type)

    return (
      <div key={match.id} className="inline-flex items-center gap-1.5 md:gap-3 px-3 md:px-8 whitespace-nowrap">
        <span className="font-bold text-white text-xs md:text-base">{match.nc_wrestler_name}</span>
        <span className={`font-bold px-1.5 md:px-2 py-0.5 rounded text-xs ${resultClass}`}>{result}</span>
        <span className="text-white/90 text-xs hidden sm:inline">{winTypeDisplay}</span>
        <span className="font-semibold text-white text-xs md:text-base">{score}</span>
        <span className="text-white/70 text-xs md:text-sm">vs {match.opponent_name}</span>
      </div>
    )
  }

  function getTimeAgo(date: Date) {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)

    if (seconds < 60) return "Just now"
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  const displayMatches = [...matches, ...matches, ...matches]

  if (matches.length === 0) {
    return null
  }

  return (
    <div className="relative overflow-hidden bg-[#0D1A4D] border-b-2 border-[#D3B574]">
      <div className="absolute left-0 top-0 bottom-0 bg-[#B31B1B] px-2 md:px-6 flex items-center z-10">
        <span className="font-bold text-white text-[10px] md:text-sm tracking-wider">LIVE RESULTS</span>
      </div>

      <div className="ticker-wrapper ml-20 md:ml-40">
        <div className="ticker-content">
          {displayMatches.map((match, index) => (
            <div key={`${match.id}-${index}`}>{formatMatch(match)}</div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .ticker-wrapper {
          display: flex;
          overflow: hidden;
          padding: 8px 0;
        }
        
        @media (min-width: 768px) {
          .ticker-wrapper {
            padding: 12px 0;
          }
        }
        
        .ticker-content {
          display: flex;
          animation: scroll 240s linear infinite;
        }
        
        .ticker-content:hover {
          animation-play-state: paused;
        }
        
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }
      `}</style>
    </div>
  )
}

interface ResultsTickerProps {
  initialMatches: LiveMatch[]
}
