"use client"

import { useState } from "react"
import { Info } from "lucide-react"

interface InfoTooltipProps {
  text: string
  position?: "top" | "bottom" | "left" | "right"
}

export function InfoTooltip({ text, position = "top" }: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)

  const positionClasses = {
    top: "bottom-full mb-2",
    bottom: "top-full mt-2",
    left: "right-full mr-2",
    right: "left-full ml-2",
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        className="text-blue-500 hover:text-blue-700 focus:outline-none"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        aria-label="More information"
      >
        <Info size={16} />
      </button>

      {isVisible && (
        <div
          className={`absolute ${positionClasses[position]} z-10 w-64 p-2 bg-black bg-opacity-80 text-white text-sm rounded shadow-lg`}
        >
          {text}
        </div>
      )}
    </div>
  )
}
