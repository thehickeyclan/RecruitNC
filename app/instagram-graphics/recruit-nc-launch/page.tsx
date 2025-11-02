"use client"

import { Card } from "@/components/ui/card"
import Image from "next/image"

export default function RecruitNCLaunchGraphics() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">RecruitNC Launch Graphics</h1>
          <p className="mt-2 text-gray-600">Right-click each graphic and "Save Image As" for Instagram</p>
          <p className="text-sm text-gray-500">1080 × 1350 px (4:5 portrait ratio) • 300 DPI</p>
        </div>

        {/* Graphic 1: Master Launch Announcement */}
        <Card className="overflow-hidden">
          <div
            className="w-full max-w-[1080px] mx-auto bg-[#1a1f4d] relative flex flex-col items-center justify-center p-16 text-white"
            style={{ aspectRatio: "4/5", height: "1350px", width: "1080px" }}
          >
            <div className="absolute top-12 left-12">
              <Image src="/images/nc-united-logo-white.png" alt="NC United" width={140} height={140} className="w-36" />
            </div>

            {/* Main Content */}
            <div className="text-center space-y-10">
              <div className="space-y-6">
                <div className="text-[#D4AF37] font-bold text-2xl tracking-wider">
                  NORTH CAROLINA COLLEGE PROSPECT RANKINGS
                </div>
                <h1 className="text-7xl font-black leading-tight">
                  Recruit<span className="text-[#D4AF37]">NC</span>
                  <br />
                  RANKINGS &<br />
                  COLLEGE COACHES
                  <br />
                  PORTAL LAUNCH
                </h1>
                <div className="text-5xl font-bold text-[#D4AF37]">TOMORROW</div>
              </div>

              <div className="space-y-4 text-2xl">
                <div className="font-semibold text-3xl">Class of 2027 Rankings</div>
                <div className="text-xl text-gray-300">First-of-Its-Kind College Recruiting Platform</div>
              </div>

              <div className="grid grid-cols-3 gap-10 pt-10 border-t border-white/20">
                <div>
                  <div className="text-6xl font-black text-[#D4AF37]">25</div>
                  <div className="text-base mt-2">Top Prospects</div>
                </div>
                <div>
                  <div className="text-6xl font-black text-[#D4AF37]">10</div>
                  <div className="text-base mt-2">State Champions</div>
                </div>
                <div>
                  <div className="text-6xl font-black text-[#D4AF37]">7</div>
                  <div className="text-base mt-2">NHSCA All-Americans</div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-12 text-center">
              <div className="text-2xl font-semibold">ncwrestlingunited.com/recruit-nc</div>
              <div className="text-base text-gray-400 mt-3">FREE Registration • All Welcome</div>
            </div>
          </div>
        </Card>

        {/* Graphic 2: College Coaches Value */}
        <Card className="overflow-hidden">
          <div
            className="w-full max-w-[1080px] mx-auto bg-[#1a1f4d] relative flex flex-col p-14 text-white"
            style={{ aspectRatio: "4/5", height: "1350px", width: "1080px" }}
          >
            <div className="flex items-center justify-between mb-10">
              <Image src="/images/nc-united-logo-white.png" alt="NC United" width={110} height={110} className="w-28" />
              <div className="text-3xl font-bold">
                Recruit<span className="text-[#D4AF37]">NC</span>
              </div>
            </div>

            {/* Header */}
            <div className="mb-8">
              <h2 className="text-5xl font-black leading-tight mb-2">Everything College Coaches Need</h2>
            </div>

            <div className="flex-1 space-y-5">
              <div className="flex items-start gap-5">
                <div className="flex-shrink-0 w-14 h-14 rounded-full bg-[#D4AF37] flex items-center justify-center text-[#1a1f4d] text-2xl font-bold">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-1">Complete Academic Profiles</h3>
                  <p className="text-gray-300 text-lg">
                    GPA, SAT, ACT, transcripts — know who can compete in your classroom
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-5">
                <div className="flex-shrink-0 w-14 h-14 rounded-full bg-[#D4AF37] flex items-center justify-center text-[#1a1f4d] text-2xl font-bold">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-1">Direct Contact Access</h3>
                  <p className="text-gray-300 text-lg">Email, phone, social profiles — reach recruits instantly</p>
                </div>
              </div>

              <div className="flex items-start gap-5">
                <div className="flex-shrink-0 w-14 h-14 rounded-full bg-[#D4AF37] flex items-center justify-center text-[#1a1f4d] text-2xl font-bold">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-1">Manage Recruiting Pipeline</h3>
                  <p className="text-gray-300 text-lg">
                    Track prospects through every stage from initial contact to commitment
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-5">
                <div className="flex-shrink-0 w-14 h-14 rounded-full bg-[#D4AF37] flex items-center justify-center text-[#1a1f4d] text-2xl font-bold">
                  4
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-1">Notes & Activity Tracking</h3>
                  <p className="text-gray-300 text-lg">Log calls, visits, and interactions with timestamped history</p>
                </div>
              </div>

              <div className="flex items-start gap-5">
                <div className="flex-shrink-0 w-14 h-14 rounded-full bg-[#D4AF37] flex items-center justify-center text-[#1a1f4d] text-2xl font-bold">
                  5
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-1">Compare Athletes Side-by-Side</h3>
                  <p className="text-gray-300 text-lg">
                    Evaluate multiple prospects with academic and athletic data in one view
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-5">
                <div className="flex-shrink-0 w-14 h-14 rounded-full bg-[#D4AF37] flex items-center justify-center text-[#1a1f4d] text-2xl font-bold">
                  6
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-1">Real-Time Tournament Updates</h3>
                  <p className="text-gray-300 text-lg">Automatic alerts after major wins and rankings changes</p>
                </div>
              </div>

              <div className="flex items-start gap-5">
                <div className="flex-shrink-0 w-14 h-14 rounded-full bg-[#D4AF37] flex items-center justify-center text-[#1a1f4d] text-2xl font-bold">
                  7
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-1">Comprehensive Data in One Place</h3>
                  <p className="text-gray-300 text-lg">
                    Athletic results, highlight videos, academic info — everything you need
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Graphic 3: Athletes Value */}
        <Card className="overflow-hidden">
          <div
            className="w-full max-w-[1080px] mx-auto bg-gradient-to-br from-[#D4AF37] to-[#B8941F] relative flex flex-col p-16 text-white"
            style={{ aspectRatio: "4/5", height: "1350px", width: "1080px" }}
          >
            <div className="flex items-center justify-between mb-12">
              <Image src="/images/nc-united-logo-white.png" alt="NC United" width={120} height={120} className="w-32" />
              <div className="text-4xl font-bold">
                Recruit<span className="text-[#1a1f4d]">NC</span>
              </div>
            </div>

            {/* Header */}
            <div className="mb-10">
              <div className="text-[#1a1f4d] font-bold text-2xl tracking-wider mb-4">FOR ATHLETES & FAMILIES</div>
              <h2 className="text-6xl font-black leading-tight text-[#1a1f4d]">
                Get Recruited.
                <br />
                Get Noticed.
              </h2>
            </div>

            {/* Features */}
            <div className="flex-1 space-y-6">
              <div className="bg-white/30 backdrop-blur rounded-2xl p-8 border border-white/40">
                <h3 className="text-3xl font-bold mb-3 text-[#1a1f4d]">Maximum Exposure</h3>
                <p className="text-xl text-[#1a1f4d]">
                  Your profile reaches every college program recruiting in North Carolina
                </p>
              </div>

              <div className="bg-white/30 backdrop-blur rounded-2xl p-8 border border-white/40">
                <h3 className="text-3xl font-bold mb-3 text-[#1a1f4d]">Verified Rankings</h3>
                <p className="text-xl text-[#1a1f4d]">
                  Objective rankings based on tournament results and achievements
                </p>
              </div>

              <div className="bg-white/30 backdrop-blur rounded-2xl p-8 border border-white/40">
                <h3 className="text-3xl font-bold mb-3 text-[#1a1f4d]">Direct Connection</h3>
                <p className="text-xl text-[#1a1f4d]">
                  College coaches can find you, track your progress, and reach out directly
                </p>
              </div>

              <div className="bg-white/30 backdrop-blur rounded-2xl p-8 border border-white/40">
                <h3 className="text-3xl font-bold mb-3 text-[#1a1f4d]">100% Free</h3>
                <p className="text-xl text-[#1a1f4d]">No fees, no paywalls. Just opportunities.</p>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-10 pt-8 border-t border-white/40">
              <div className="text-2xl text-[#1a1f4d] font-semibold">
                Register Free at ncwrestlingunited.com/recruit-nc
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
