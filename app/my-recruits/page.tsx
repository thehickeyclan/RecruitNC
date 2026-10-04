"use client"

import { AuthGuard } from "@/components/auth-guard"
import { MyRecruitsBoard } from "@/components/my-recruits-board"

/** My Recruits: the starred-wrestler table. See components/my-recruits-board.tsx. */
export default function MyRecruitsPage() {
  return (
    <AuthGuard>
      <MyRecruitsBoard />
    </AuthGuard>
  )
}

