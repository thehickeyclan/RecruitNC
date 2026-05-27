/** AAU Scholastic Duals 2026 — NC United National Team starter lineup. */
export type AauScholasticRosterRow = {
  /** e.g. "106+5", "HWT" */
  weightLabel: string
  wrestler: string
  /** MM/DD/YYYY */
  dob: string
  cell: string
  /** Open starter slot — shown as TBD on the public roster */
  openSlot?: boolean
}

export const AAU_SCHOLASTIC_DUALS_2026_ROSTER: AauScholasticRosterRow[] = [
  { weightLabel: "106+5", wrestler: "Xan Moody", dob: "01/09/2009", cell: "910-617-7799" },
  { weightLabel: "113+5", wrestler: "Aiden Burkholder", dob: "01/21/2009", cell: "336-225-9166" },
  { weightLabel: "120+5", wrestler: "Luke Richards", dob: "03/02/2010", cell: "919-410-3644" },
  { weightLabel: "126+5", wrestler: "Ayden Sumners", dob: "04/04/2009", cell: "336-579-7639" },
  { weightLabel: "132+5", wrestler: "Mac Johnson", dob: "05/04/2008", cell: "910-965-9236" },
  { weightLabel: "138+5", wrestler: "Tye Johnson", dob: "05/04/2008", cell: "910-965-9235" },
  { weightLabel: "144+5", wrestler: "Jake Amiott", dob: "03/06/2010", cell: "910-523-9723" },
  { weightLabel: "150+5", wrestler: "Jacob Perry", dob: "12/08/2009", cell: "856-638-8831" },
  { weightLabel: "157+5", wrestler: "Aidan Gore", dob: "08/29/2008", cell: "919-448-7598" },
  { weightLabel: "165+5", wrestler: "Tobin McNair", dob: "05/07/2008", cell: "201-213-3341" },
  { weightLabel: "175+5", wrestler: "", dob: "", cell: "", openSlot: true },
  { weightLabel: "190+5", wrestler: "Luke Padgett", dob: "02/26/2008", cell: "252-665-3536" },
  { weightLabel: "215+5", wrestler: "Gavin Lopez", dob: "01/21/2009", cell: "908-566-8816" },
  { weightLabel: "HWT", wrestler: "", dob: "", cell: "", openSlot: true },
]

export { phoneDigitsForTel } from "@/lib/nhsca-duals-2026-hub-contact-roster"
