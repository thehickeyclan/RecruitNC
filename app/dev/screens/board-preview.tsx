"use client"

import { CollegeBoard, type BoardCollege } from "@/components/portal/college-board"

/** The board with a made-up family, for screenshots (dev only). Moves and notes go nowhere. */
export function BoardPreview({ colleges }: { colleges: BoardCollege[] }) {
  return <CollegeBoard colleges={colleges} interestName="Jordan" onMove={() => {}} onEmail={() => {}} onMemo={() => {}} onInterest={() => {}} onQuestionnaire={() => {}} />
}
