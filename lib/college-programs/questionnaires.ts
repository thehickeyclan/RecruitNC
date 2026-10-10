/**
 * Recruiting questionnaire links, 2026-27: the form on a program's own site that puts a wrestler
 * in its recruiting database. 130 men's and 59 women's links (10 Oct 2026). A school with none
 * here may still have one; we only list what was found.
 *
 * Kept out of programs-2026-27.json on purpose: that file goes to every visitor, and these links
 * are part of the Recruiting Portal for Blue members.
 */

import data from "@/lib/college-programs/questionnaires-2026-27.json"
import type { CollegeDivision } from "@/lib/college-programs/types"

export type CollegeQuestionnaire = { division: CollegeDivision; mens: string | null; womens: string | null }

const QUESTIONNAIRES = data.questionnaires as Record<string, CollegeQuestionnaire[]>

export function questionnairesForSchool(schoolId: string): CollegeQuestionnaire[] {
  return QUESTIONNAIRES[schoolId] ?? []
}
