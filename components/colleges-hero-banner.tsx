"use client"

import Image from "next/image"
import { Badge } from "@/components/ui/badge"

export function CollegesHeroBanner() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-blue-900 to-blue-700 text-white rounded-xl mb-8">
      <div className="absolute inset-0 opacity-10">
        <Image src="/diverse-wrestlers.png" alt="College wrestlers" fill className="object-cover" priority />
      </div>

      <div className="relative z-10 px-6 py-12 md:py-16 max-w-5xl mx-auto">
        <div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">Colleges Recruiting NC</h1>

          <p className="text-lg md:text-xl text-blue-100 mb-6 max-w-3xl">
            Discover the colleges actively recruiting North Carolina's top wrestling talent and building their programs
            with NC athletes.
          </p>

          <div className="flex flex-wrap gap-2 mt-4">
            <Badge className="bg-blue-600 hover:bg-blue-700 text-white border-none px-3 py-1">NCAA DI</Badge>
            <Badge className="bg-red-600 hover:bg-red-700 text-white border-none px-3 py-1">NCAA DII</Badge>
            <Badge className="bg-green-600 hover:bg-green-700 text-white border-none px-3 py-1">NCAA DIII</Badge>
            <Badge className="bg-yellow-600 hover:bg-yellow-700 text-white border-none px-3 py-1">NAIA</Badge>
            <Badge className="bg-purple-600 hover:bg-purple-700 text-white border-none px-3 py-1">NJCAA</Badge>
          </div>
        </div>
      </div>
    </div>
  )
}
