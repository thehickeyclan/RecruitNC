import type {
  AauScholasticDualResult,
  AauScholasticIndividualResult,
} from "@/lib/aau-scholastic-duals-2026-results"

/** Individual bout results within a dual meet — keyed by `matchNumber` on the dual row. */
export type AauScholasticDualBout = {
  weightLbs: number
  resultLine: string
  opponentWrestler: string
  ourWrestler: string
  opponentTeamPts: number
  ourTeamPts: number
}

/** One NC wrestler bout within a dual — used for expandable individual results. */
export type AauIndividualBoutLog = {
  matchNumber: number
  opponentTeam: string
  dualNotes?: string
  weightLbs: number
  resultLine: string
  opponentWrestler: string
  ourTeamPts: number
  opponentTeamPts: number
  won: boolean
}

/** Add bout logs as they are exported from the tournament tracker. */
export const AAU_SCHOLASTIC_DUALS_2026_DUAL_BOUTS: Record<number, AauScholasticDualBout[]> = {
  1: [
    { weightLbs: 106, resultLine: "F 7-0 3:33", opponentWrestler: "Z. Homan", ourWrestler: "A. Moody", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 113, resultLine: "F 3-0 1:52", opponentWrestler: "J. Knipfer", ourWrestler: "A. Burkholder", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 120, resultLine: "DEC 8-2", opponentWrestler: "M. Rowe", ourWrestler: "L. Richards", opponentTeamPts: 0, ourTeamPts: 3 },
    { weightLbs: 126, resultLine: "DEC 4-1", opponentWrestler: "D. Duemmel", ourWrestler: "P. Kearns", opponentTeamPts: 3, ourTeamPts: 0 },
    { weightLbs: 132, resultLine: "TF 17-2 2:21", opponentWrestler: "C. Stephans", ourWrestler: "M. Johnson", opponentTeamPts: 0, ourTeamPts: 5 },
    { weightLbs: 138, resultLine: "F 0-0 0:29", opponentWrestler: "C. Frankenberger", ourWrestler: "T. Johnson", opponentTeamPts: 6, ourTeamPts: 0 },
    { weightLbs: 144, resultLine: "MD 12-4", opponentWrestler: "C. Greiner", ourWrestler: "J. Amiott", opponentTeamPts: 0, ourTeamPts: 4 },
    { weightLbs: 150, resultLine: "TF 15-0 2:00", opponentWrestler: "C. McBride", ourWrestler: "J. Perry", opponentTeamPts: 0, ourTeamPts: 5 },
    { weightLbs: 157, resultLine: "MD 14-4", opponentWrestler: "G. Leininger", ourWrestler: "A. Ellison", opponentTeamPts: 0, ourTeamPts: 4 },
    { weightLbs: 165, resultLine: "MD 19-8", opponentWrestler: "E. Homan", ourWrestler: "T. McNair", opponentTeamPts: 0, ourTeamPts: 4 },
    { weightLbs: 175, resultLine: "TF 19-3 3:54", opponentWrestler: "C. Theobald", ourWrestler: "F. Alkurdasi", opponentTeamPts: 0, ourTeamPts: 5 },
    { weightLbs: 190, resultLine: "F 3-0 1:09", opponentWrestler: "A. Timberman", ourWrestler: "L. Padgett", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 215, resultLine: "F 5-0 2:39", opponentWrestler: "K. Updike", ourWrestler: "G. Lopez", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 285, resultLine: "F 6-2 3:36", opponentWrestler: "Z. Knollmeyer", ourWrestler: "M. Hocker", opponentTeamPts: 6, ourTeamPts: 0 },
  ],
  2: [
    { weightLbs: 106, resultLine: "F 7-0 1:45", opponentWrestler: "K. Green", ourWrestler: "A. Moody", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 113, resultLine: "DEC 8-5", opponentWrestler: "W. Hughes", ourWrestler: "A. Burkholder", opponentTeamPts: 0, ourTeamPts: 3 },
    { weightLbs: 120, resultLine: "F 10-0 3:01", opponentWrestler: "A. Aguayo", ourWrestler: "L. Richards", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 126, resultLine: "F 7-0 1:13", opponentWrestler: "A. OLenick", ourWrestler: "P. Kearns", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 132, resultLine: "F 3-0 1:30", opponentWrestler: "T. Thompson", ourWrestler: "M. Johnson", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 138, resultLine: "TF 19-4 2:00", opponentWrestler: "G. Austin", ourWrestler: "T. Johnson", opponentTeamPts: 0, ourTeamPts: 5 },
    { weightLbs: 144, resultLine: "DEC 10-8", opponentWrestler: "T. Hunt", ourWrestler: "J. Amiott", opponentTeamPts: 3, ourTeamPts: 0 },
    { weightLbs: 150, resultLine: "TF 15-0 1:23", opponentWrestler: "C. Hezel", ourWrestler: "J. Perry", opponentTeamPts: 0, ourTeamPts: 5 },
    { weightLbs: 157, resultLine: "TF 19-3 6:00", opponentWrestler: "J. White", ourWrestler: "A. Ellison", opponentTeamPts: 0, ourTeamPts: 5 },
    { weightLbs: 165, resultLine: "F 3-0 0:53", opponentWrestler: "C. Hezel", ourWrestler: "T. McNair", opponentTeamPts: 6, ourTeamPts: 0 },
    { weightLbs: 175, resultLine: "DEC 3-2", opponentWrestler: "R. Gober", ourWrestler: "F. Alkurdasi", opponentTeamPts: 0, ourTeamPts: 3 },
    { weightLbs: 190, resultLine: "FOR 0-0", opponentWrestler: "Forfeit", ourWrestler: "L. Padgett", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 215, resultLine: "F 16-3 3:53", opponentWrestler: "Z. White", ourWrestler: "G. Lopez", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 285, resultLine: "DEC 11-10", opponentWrestler: "J. Green", ourWrestler: "M. Hocker", opponentTeamPts: 0, ourTeamPts: 3 },
  ],
  3: [
    { weightLbs: 106, resultLine: "TF 21-5 6:00", opponentWrestler: "W. Anderson", ourWrestler: "A. Moody", opponentTeamPts: 0, ourTeamPts: 5 },
    { weightLbs: 113, resultLine: "F 3-0 1:08", opponentWrestler: "K. Robinson", ourWrestler: "A. Burkholder", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 120, resultLine: "MD 14-2", opponentWrestler: "K. Thomas-Callo", ourWrestler: "L. Richards", opponentTeamPts: 4, ourTeamPts: 0 },
    { weightLbs: 126, resultLine: "F 9-0 3:34", opponentWrestler: "N. Boyer", ourWrestler: "P. Kearns", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 132, resultLine: "TF 17-1 3:10", opponentWrestler: "Z. Held", ourWrestler: "M. Johnson", opponentTeamPts: 0, ourTeamPts: 5 },
    { weightLbs: 138, resultLine: "FOR 0-0", opponentWrestler: "Forfeit", ourWrestler: "T. Johnson", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 144, resultLine: "TF 17-0 4:28", opponentWrestler: "A. Kuchar", ourWrestler: "J. Amiott", opponentTeamPts: 0, ourTeamPts: 5 },
    { weightLbs: 150, resultLine: "MD 19-6", opponentWrestler: "G. Cheek", ourWrestler: "J. Perry", opponentTeamPts: 0, ourTeamPts: 4 },
    { weightLbs: 157, resultLine: "F 3-0 0:46", opponentWrestler: "L. Burt", ourWrestler: "A. Ellison", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 165, resultLine: "F 4-7 2:51", opponentWrestler: "B. Ging", ourWrestler: "T. McNair", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 175, resultLine: "MD 14-5", opponentWrestler: "Z. Ferguson", ourWrestler: "F. Alkurdasi", opponentTeamPts: 0, ourTeamPts: 4 },
    { weightLbs: 190, resultLine: "F 10-3 2:59", opponentWrestler: "G. Bergen", ourWrestler: "L. Padgett", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 215, resultLine: "MD 15-3", opponentWrestler: "B. Brandt", ourWrestler: "G. Lopez", opponentTeamPts: 0, ourTeamPts: 4 },
    { weightLbs: 285, resultLine: "FOR 0-0", opponentWrestler: "I. Cross", ourWrestler: "Forfeit", opponentTeamPts: 6, ourTeamPts: 0 },
  ],
  4: [
    { weightLbs: 106, resultLine: "F 12-3 1:22", opponentWrestler: "T. Owens", ourWrestler: "A. Moody", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 113, resultLine: "F 10-1 1:10", opponentWrestler: "S. Styger", ourWrestler: "A. Burkholder", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 120, resultLine: "DEC 8-3", opponentWrestler: "K. Rodriguez", ourWrestler: "L. Richards", opponentTeamPts: 0, ourTeamPts: 3 },
    { weightLbs: 126, resultLine: "TF 18-3 4:08", opponentWrestler: "J. Buehler", ourWrestler: "P. Kearns", opponentTeamPts: 0, ourTeamPts: 5 },
    { weightLbs: 132, resultLine: "F 3-0 0:45", opponentWrestler: "E. King", ourWrestler: "M. Johnson", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 138, resultLine: "TF 17-2 3:33", opponentWrestler: "C. Pierce", ourWrestler: "T. Johnson", opponentTeamPts: 0, ourTeamPts: 5 },
    { weightLbs: 144, resultLine: "DEC 2-1", opponentWrestler: "C. Smolarksy", ourWrestler: "J. Amiott", opponentTeamPts: 0, ourTeamPts: 3 },
    { weightLbs: 150, resultLine: "F 3-0 1:25", opponentWrestler: "O. Daniels", ourWrestler: "J. Perry", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 157, resultLine: "F 7-0 1:00", opponentWrestler: "K. Rohr", ourWrestler: "A. Ellison", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 165, resultLine: "TF 16-1 4:30", opponentWrestler: "S. Wyman", ourWrestler: "T. McNair", opponentTeamPts: 0, ourTeamPts: 5 },
    { weightLbs: 175, resultLine: "TF 23-6 2:53", opponentWrestler: "C. Ward", ourWrestler: "F. Alkurdasi", opponentTeamPts: 0, ourTeamPts: 5 },
    { weightLbs: 190, resultLine: "TF 21-3 1:48", opponentWrestler: "A. Wright", ourWrestler: "L. Padgett", opponentTeamPts: 0, ourTeamPts: 5 },
    { weightLbs: 215, resultLine: "TF 20-4 1:50", opponentWrestler: "E. Sanford", ourWrestler: "G. Lopez", opponentTeamPts: 0, ourTeamPts: 5 },
    { weightLbs: 285, resultLine: "FOR 0-0", opponentWrestler: "C. Hersey", ourWrestler: "Forfeit", opponentTeamPts: 6, ourTeamPts: 0 },
  ],
  5: [
    { weightLbs: 106, resultLine: "DEC 11-7", opponentWrestler: "V. White", ourWrestler: "A. Moody", opponentTeamPts: 3, ourTeamPts: 0 },
    { weightLbs: 113, resultLine: "F 14-2 3:42", opponentWrestler: "A. Douglas", ourWrestler: "A. Burkholder", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 120, resultLine: "TF 15-0 4:09", opponentWrestler: "A. Flanders", ourWrestler: "L. Richards", opponentTeamPts: 0, ourTeamPts: 5 },
    { weightLbs: 126, resultLine: "DEC 8-3", opponentWrestler: "C. Rivera", ourWrestler: "P. Kearns", opponentTeamPts: 0, ourTeamPts: 3 },
    { weightLbs: 132, resultLine: "F 3-0 0:30", opponentWrestler: "B. Auten", ourWrestler: "M. Johnson", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 138, resultLine: "MD 11-2", opponentWrestler: "N. Irving", ourWrestler: "T. Johnson", opponentTeamPts: 0, ourTeamPts: 4 },
    { weightLbs: 144, resultLine: "F 15-3 4:27", opponentWrestler: "J. Brody", ourWrestler: "J. Amiott", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 150, resultLine: "TF 17-1 3:45", opponentWrestler: "D. Fernandez", ourWrestler: "J. Perry", opponentTeamPts: 0, ourTeamPts: 5 },
    { weightLbs: 157, resultLine: "TF 17-1 4:29", opponentWrestler: "D. Shannon", ourWrestler: "A. Ellison", opponentTeamPts: 0, ourTeamPts: 5 },
    { weightLbs: 165, resultLine: "F 3-0 0:26", opponentWrestler: "M. Green", ourWrestler: "T. McNair", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 175, resultLine: "TF 20-5 4:33", opponentWrestler: "C. Braton", ourWrestler: "F. Alkurdasi", opponentTeamPts: 0, ourTeamPts: 5 },
    { weightLbs: 190, resultLine: "DEC 5-4", opponentWrestler: "L. Dickerson", ourWrestler: "L. Padgett", opponentTeamPts: 0, ourTeamPts: 3 },
    { weightLbs: 215, resultLine: "F 6-1 1:03", opponentWrestler: "I. Freeman", ourWrestler: "G. Lopez", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 285, resultLine: "FOR 0-0", opponentWrestler: "M. Alvarez", ourWrestler: "Forfeit", opponentTeamPts: 6, ourTeamPts: 0 },
  ],
  6: [
    { weightLbs: 106, resultLine: "DEC 8-2", opponentWrestler: "L. O'Connors", ourWrestler: "A. Moody", opponentTeamPts: 3, ourTeamPts: 0 },
    { weightLbs: 113, resultLine: "DEC 10-5", opponentWrestler: "R. Fitch", ourWrestler: "A. Burkholder", opponentTeamPts: 3, ourTeamPts: 0 },
    { weightLbs: 120, resultLine: "F 11-0 3:00", opponentWrestler: "B. Jackson", ourWrestler: "L. Richards", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 126, resultLine: "MD 14-6", opponentWrestler: "L. Christopher", ourWrestler: "P. Kearns", opponentTeamPts: 4, ourTeamPts: 0 },
    { weightLbs: 132, resultLine: "DEC 4-1", opponentWrestler: "L. Christopher", ourWrestler: "M. Johnson", opponentTeamPts: 0, ourTeamPts: 3 },
    { weightLbs: 138, resultLine: "TF 18-3 2:42", opponentWrestler: "G. Majcher", ourWrestler: "T. Johnson", opponentTeamPts: 0, ourTeamPts: 5 },
    { weightLbs: 144, resultLine: "MD 18-6", opponentWrestler: "X. Courneya", ourWrestler: "J. Amiott", opponentTeamPts: 0, ourTeamPts: 4 },
    { weightLbs: 150, resultLine: "TF 15-0 3:40", opponentWrestler: "G. Turnblom", ourWrestler: "J. Perry", opponentTeamPts: 0, ourTeamPts: 5 },
    { weightLbs: 157, resultLine: "DEC 4-1 SV", opponentWrestler: "P. Sampson", ourWrestler: "A. Ellison", opponentTeamPts: 0, ourTeamPts: 3 },
    { weightLbs: 165, resultLine: "F 4-0 3:33", opponentWrestler: "Z. Willobee", ourWrestler: "T. McNair", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 175, resultLine: "DEC 6-4", opponentWrestler: "D. Erlenbeck", ourWrestler: "F. Alkurdasi", opponentTeamPts: 0, ourTeamPts: 3 },
    { weightLbs: 190, resultLine: "DEC 4-2", opponentWrestler: "Z. Miracle", ourWrestler: "L. Padgett", opponentTeamPts: 0, ourTeamPts: 3 },
    { weightLbs: 215, resultLine: "DEC 7-1", opponentWrestler: "M. Mayer", ourWrestler: "G. Lopez", opponentTeamPts: 0, ourTeamPts: 3 },
    { weightLbs: 285, resultLine: "DEC 9-3", opponentWrestler: "S. Blasczyk", ourWrestler: "M. Hocker", opponentTeamPts: 3, ourTeamPts: 0 },
  ],
  7: [
    { weightLbs: 106, resultLine: "DEC 4-2", opponentWrestler: "A. Bishop", ourWrestler: "A. Moody", opponentTeamPts: 3, ourTeamPts: 0 },
    { weightLbs: 113, resultLine: "MD 17-6", opponentWrestler: "D. Presman", ourWrestler: "A. Burkholder", opponentTeamPts: 0, ourTeamPts: 4 },
    { weightLbs: 120, resultLine: "MD 16-5", opponentWrestler: "J. Michael", ourWrestler: "L. Richards", opponentTeamPts: 0, ourTeamPts: 4 },
    { weightLbs: 126, resultLine: "DEC 4-1", opponentWrestler: "S. Peterson", ourWrestler: "P. Kearns", opponentTeamPts: 0, ourTeamPts: 3 },
    { weightLbs: 132, resultLine: "F 14-3 1:54", opponentWrestler: "D. Brown", ourWrestler: "M. Johnson", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 138, resultLine: "TF 17-2 2:44", opponentWrestler: "M. Rojas", ourWrestler: "T. Johnson", opponentTeamPts: 0, ourTeamPts: 5 },
    { weightLbs: 144, resultLine: "F 7-0 4:49", opponentWrestler: "M. Gonzalez", ourWrestler: "J. Amiott", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 150, resultLine: "DEC 7-0", opponentWrestler: "J. Rivas", ourWrestler: "J. Perry", opponentTeamPts: 0, ourTeamPts: 3 },
    { weightLbs: 157, resultLine: "TF 17-0 5:06", opponentWrestler: "C. Riche", ourWrestler: "A. Ellison", opponentTeamPts: 0, ourTeamPts: 5 },
    { weightLbs: 165, resultLine: "F 12-3 5:05", opponentWrestler: "T. Grey", ourWrestler: "T. McNair", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 175, resultLine: "TF 20-5 1:36", opponentWrestler: "A. Cole", ourWrestler: "F. Alkurdasi", opponentTeamPts: 0, ourTeamPts: 5 },
    { weightLbs: 190, resultLine: "MD 19-6", opponentWrestler: "A. Buck", ourWrestler: "L. Padgett", opponentTeamPts: 4, ourTeamPts: 0 },
    { weightLbs: 215, resultLine: "FOR 0-0", opponentWrestler: "Forfeit", ourWrestler: "G. Lopez", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 285, resultLine: "F 2-10 3:04", opponentWrestler: "J. Johnson", ourWrestler: "M. Hocker", opponentTeamPts: 0, ourTeamPts: 6 },
  ],
  8: [
    { weightLbs: 106, resultLine: "F 8-5 4:44", opponentWrestler: "H. Cox", ourWrestler: "A. Moody", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 113, resultLine: "DEC 7-2", opponentWrestler: "I. Maize", ourWrestler: "A. Burkholder", opponentTeamPts: 3, ourTeamPts: 0 },
    { weightLbs: 120, resultLine: "FOR 0-0", opponentWrestler: "Forfeit", ourWrestler: "L. Richards", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 126, resultLine: "MD 14-0", opponentWrestler: "W. Logue", ourWrestler: "P. Kearns", opponentTeamPts: 0, ourTeamPts: 4 },
    { weightLbs: 132, resultLine: "F 9-2 1:26", opponentWrestler: "W. Smith IV", ourWrestler: "M. Johnson", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 138, resultLine: "FOR 0-0", opponentWrestler: "Forfeit", ourWrestler: "T. Johnson", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 144, resultLine: "F 5-4 1:44", opponentWrestler: "A. Roman", ourWrestler: "J. Amiott", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 150, resultLine: "FOR 0-0", opponentWrestler: "Forfeit", ourWrestler: "J. Perry", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 157, resultLine: "FOR 0-0", opponentWrestler: "Forfeit", ourWrestler: "A. Ellison", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 165, resultLine: "TF 17-0 1:33", opponentWrestler: "C. Brown", ourWrestler: "T. McNair", opponentTeamPts: 0, ourTeamPts: 5 },
    { weightLbs: 175, resultLine: "MD 19-9", opponentWrestler: "B. Collins", ourWrestler: "F. Alkurdasi", opponentTeamPts: 0, ourTeamPts: 4 },
    { weightLbs: 190, resultLine: "TF 15-0 2:00", opponentWrestler: "P. Jacobs", ourWrestler: "L. Padgett", opponentTeamPts: 0, ourTeamPts: 5 },
    { weightLbs: 215, resultLine: "DEC 6-4", opponentWrestler: "E. Miller", ourWrestler: "G. Lopez", opponentTeamPts: 0, ourTeamPts: 3 },
    { weightLbs: 285, resultLine: "FOR 0-0", opponentWrestler: "C. Cox", ourWrestler: "Forfeit", opponentTeamPts: 6, ourTeamPts: 0 },
  ],
  9: [
    { weightLbs: 106, resultLine: "MD 12-0", opponentWrestler: "M. Gardner", ourWrestler: "A. Moody", opponentTeamPts: 0, ourTeamPts: 4 },
    { weightLbs: 113, resultLine: "MD 11-2", opponentWrestler: "R. Truman", ourWrestler: "A. Burkholder", opponentTeamPts: 0, ourTeamPts: 4 },
    { weightLbs: 120, resultLine: "TF 17-0 5:29", opponentWrestler: "R. Robbins", ourWrestler: "L. Richards", opponentTeamPts: 0, ourTeamPts: 5 },
    { weightLbs: 126, resultLine: "FOR 0-0", opponentWrestler: "Forfeit", ourWrestler: "P. Kearns", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 132, resultLine: "DEF 15-5 5:22", opponentWrestler: "K. Vessells", ourWrestler: "M. Johnson", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 138, resultLine: "F 13-2 0:53", opponentWrestler: "D. Sesler", ourWrestler: "T. Johnson", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 144, resultLine: "F 8-1 2:18", opponentWrestler: "L. Klinkhammer", ourWrestler: "J. Amiott", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 150, resultLine: "MD 12-3", opponentWrestler: "R. Orel", ourWrestler: "J. Perry", opponentTeamPts: 4, ourTeamPts: 0 },
    { weightLbs: 157, resultLine: "DEC 11-6", opponentWrestler: "V. Lenz", ourWrestler: "A. Ellison", opponentTeamPts: 0, ourTeamPts: 3 },
    { weightLbs: 165, resultLine: "FOR 0-0", opponentWrestler: "Forfeit", ourWrestler: "T. McNair", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 175, resultLine: "TF 21-6 3:42", opponentWrestler: "J. Klein", ourWrestler: "F. Alkurdasi", opponentTeamPts: 0, ourTeamPts: 5 },
    { weightLbs: 190, resultLine: "F 8-0 3:27", opponentWrestler: "D. Sandven", ourWrestler: "L. Padgett", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 215, resultLine: "F 12-3 4:29", opponentWrestler: "R. Behnke", ourWrestler: "G. Lopez", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 285, resultLine: "FOR 0-0", opponentWrestler: "L. Novy", ourWrestler: "Forfeit", opponentTeamPts: 6, ourTeamPts: 0 },
  ],
  10: [
    { weightLbs: 106, resultLine: "TF 15-0 2:51", opponentWrestler: "D. Stefko", ourWrestler: "A. Moody", opponentTeamPts: 0, ourTeamPts: 5 },
    { weightLbs: 113, resultLine: "DEC 12-7", opponentWrestler: "A. Hayes", ourWrestler: "A. Burkholder", opponentTeamPts: 3, ourTeamPts: 0 },
    { weightLbs: 120, resultLine: "F 11-1 2:47", opponentWrestler: "B. Wunder", ourWrestler: "L. Richards", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 126, resultLine: "F 3-0 1:10", opponentWrestler: "E. Gabrielson", ourWrestler: "P. Kearns", opponentTeamPts: 6, ourTeamPts: 0 },
    { weightLbs: 132, resultLine: "F 3-0 0:48", opponentWrestler: "T. Watson", ourWrestler: "M. Johnson", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 138, resultLine: "TF 17-2 2:23", opponentWrestler: "D. Woomer", ourWrestler: "T. Johnson", opponentTeamPts: 0, ourTeamPts: 5 },
    { weightLbs: 144, resultLine: "DEC 12-6", opponentWrestler: "W. McDonough", ourWrestler: "J. Amiott", opponentTeamPts: 0, ourTeamPts: 3 },
    { weightLbs: 150, resultLine: "TF 15-0 1:10", opponentWrestler: "C. Knott", ourWrestler: "J. Perry", opponentTeamPts: 0, ourTeamPts: 5 },
    { weightLbs: 157, resultLine: "MD 20-6", opponentWrestler: "J. Ford", ourWrestler: "A. Ellison", opponentTeamPts: 0, ourTeamPts: 4 },
    { weightLbs: 165, resultLine: "F 5-3 5:44", opponentWrestler: "L. Foreman", ourWrestler: "T. McNair", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 175, resultLine: "DEC 23-22", opponentWrestler: "G. Di Monte", ourWrestler: "F. Alkurdasi", opponentTeamPts: 3, ourTeamPts: 0 },
    { weightLbs: 190, resultLine: "DEC 4-0", opponentWrestler: "J. Smith", ourWrestler: "L. Padgett", opponentTeamPts: 0, ourTeamPts: 3 },
    { weightLbs: 215, resultLine: "F 5-3 4:11", opponentWrestler: "E. Gavin", ourWrestler: "G. Lopez", opponentTeamPts: 6, ourTeamPts: 0 },
    { weightLbs: 285, resultLine: "F 5-3 3:45", opponentWrestler: "G. Derilus", ourWrestler: "M. Hocker", opponentTeamPts: 6, ourTeamPts: 0 },
  ],
  11: [
    { weightLbs: 106, resultLine: "TF 16-0 3:42", opponentWrestler: "S. Johnson", ourWrestler: "A. Moody", opponentTeamPts: 5, ourTeamPts: 0 },
    { weightLbs: 113, resultLine: "DEC 6-3 SV", opponentWrestler: "J. Sanders", ourWrestler: "A. Burkholder", opponentTeamPts: 0, ourTeamPts: 3 },
    { weightLbs: 120, resultLine: "MD 14-2", opponentWrestler: "J. Morales", ourWrestler: "L. Richards", opponentTeamPts: 0, ourTeamPts: 4 },
    { weightLbs: 126, resultLine: "DEC 10-4", opponentWrestler: "E. Perez", ourWrestler: "P. Kearns", opponentTeamPts: 0, ourTeamPts: 3 },
    { weightLbs: 132, resultLine: "FOR 0-0", opponentWrestler: "Forfeit", ourWrestler: "M. Johnson", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 138, resultLine: "TF 16-1 3:54", opponentWrestler: "D. Hicks", ourWrestler: "T. Johnson", opponentTeamPts: 0, ourTeamPts: 5 },
    { weightLbs: 144, resultLine: "MD 14-2", opponentWrestler: "T. Boda", ourWrestler: "J. Amiott", opponentTeamPts: 4, ourTeamPts: 0 },
    { weightLbs: 150, resultLine: "DEC 6-1", opponentWrestler: "B. Higgins", ourWrestler: "J. Perry", opponentTeamPts: 3, ourTeamPts: 0 },
    { weightLbs: 157, resultLine: "DEC 8-7", opponentWrestler: "G. Ferreira", ourWrestler: "A. Ellison", opponentTeamPts: 0, ourTeamPts: 3 },
    { weightLbs: 165, resultLine: "DEC 1-0", opponentWrestler: "K. Khaspekian", ourWrestler: "T. McNair", opponentTeamPts: 0, ourTeamPts: 3 },
    { weightLbs: 175, resultLine: "DEC 5-3", opponentWrestler: "J. Rodriguez", ourWrestler: "F. Alkurdasi", opponentTeamPts: 3, ourTeamPts: 0 },
    { weightLbs: 190, resultLine: "MD 12-4", opponentWrestler: "B. Wright", ourWrestler: "L. Padgett", opponentTeamPts: 4, ourTeamPts: 0 },
    { weightLbs: 215, resultLine: "TF 16-1 4:57", opponentWrestler: "R. Wilder", ourWrestler: "G. Lopez", opponentTeamPts: 5, ourTeamPts: 0 },
    { weightLbs: 285, resultLine: "MD 14-6", opponentWrestler: "F. McDaniel", ourWrestler: "M. Hocker", opponentTeamPts: 4, ourTeamPts: 0 },
  ],
  12: [
    { weightLbs: 106, resultLine: "DEC 8-2", opponentWrestler: "Q. Bagnell", ourWrestler: "A. Moody", opponentTeamPts: 3, ourTeamPts: 0 },
    { weightLbs: 113, resultLine: "TF 20-5 3:48", opponentWrestler: "L. Worth", ourWrestler: "A. Burkholder", opponentTeamPts: 5, ourTeamPts: 0 },
    { weightLbs: 120, resultLine: "MD 10-1", opponentWrestler: "J. Segata", ourWrestler: "L. Richards", opponentTeamPts: 4, ourTeamPts: 0 },
    { weightLbs: 126, resultLine: "TF 17-2 1:47", opponentWrestler: "D. Morrison", ourWrestler: "P. Kearns", opponentTeamPts: 5, ourTeamPts: 0 },
    { weightLbs: 132, resultLine: "MD 9-0", opponentWrestler: "A. Gomez", ourWrestler: "M. Johnson", opponentTeamPts: 0, ourTeamPts: 4 },
    { weightLbs: 138, resultLine: "DEC 4-1", opponentWrestler: "R. Dillard", ourWrestler: "T. Johnson", opponentTeamPts: 0, ourTeamPts: 3 },
    { weightLbs: 144, resultLine: "DEC 11-10", opponentWrestler: "A. Cerrato", ourWrestler: "J. Amiott", opponentTeamPts: 0, ourTeamPts: 3 },
    { weightLbs: 150, resultLine: "TF 19-3 4:43", opponentWrestler: "G. Kelton", ourWrestler: "J. Perry", opponentTeamPts: 5, ourTeamPts: 0 },
    { weightLbs: 157, resultLine: "MD 11-3", opponentWrestler: "A. Messner", ourWrestler: "A. Ellison", opponentTeamPts: 0, ourTeamPts: 4 },
    { weightLbs: 165, resultLine: "DEC 4-3", opponentWrestler: "J. Smith", ourWrestler: "T. McNair", opponentTeamPts: 3, ourTeamPts: 0 },
    { weightLbs: 175, resultLine: "TF 17-0 2:52", opponentWrestler: "C. Dennis", ourWrestler: "F. Alkurdasi", opponentTeamPts: 5, ourTeamPts: 0 },
    { weightLbs: 190, resultLine: "TF 18-0 6:00", opponentWrestler: "D. Sumpolec", ourWrestler: "L. Padgett", opponentTeamPts: 5, ourTeamPts: 0 },
    { weightLbs: 215, resultLine: "FOR 0-0", opponentWrestler: "Forfeit", ourWrestler: "G. Lopez", opponentTeamPts: 0, ourTeamPts: 6 },
    { weightLbs: 285, resultLine: "DEC 8-3", opponentWrestler: "M. Scott", ourWrestler: "M. Hocker", opponentTeamPts: 3, ourTeamPts: 0 },
  ],
}

export function getAauScholasticDualBouts(matchNumber?: number): AauScholasticDualBout[] {
  if (matchNumber == null) return []
  return AAU_SCHOLASTIC_DUALS_2026_DUAL_BOUTS[matchNumber] ?? []
}

export function sumAauDualBoutTeamPoints(bouts: AauScholasticDualBout[]) {
  return bouts.reduce(
    (acc, b) => ({
      ourScore: acc.ourScore + b.ourTeamPts,
      opponentScore: acc.opponentScore + b.opponentTeamPts,
    }),
    { ourScore: 0, opponentScore: 0 }
  )
}

/** Map tracker abbreviations (e.g. "A. Moody") to roster full names. */
export function resolveAauBoutWrestlerName(
  boutAbbrev: string,
  individuals: readonly AauScholasticIndividualResult[],
): string | null {
  const trimmed = boutAbbrev.trim()
  if (!trimmed || /^forfeit$/i.test(trimmed)) return null

  const parsed = trimmed.match(/^([A-Za-z])\.?\s+(.+)$/)
  if (!parsed) return null

  const [, initial, lastName] = parsed
  const lastLower = lastName.toLowerCase()
  const candidates = individuals.filter((row) => {
    const parts = row.wrestler.trim().split(/\s+/)
    return parts[parts.length - 1]?.toLowerCase() === lastLower
  })

  if (candidates.length === 1) return candidates[0]!.wrestler

  const byInitial = candidates.filter((row) => row.wrestler.trim()[0]?.toUpperCase() === initial.toUpperCase())
  if (byInitial.length === 1) return byInitial[0]!.wrestler

  return null
}

/** All bout logs keyed by roster wrestler name (from dual bout exports). */
export function buildAauIndividualBoutLogsByWrestler(
  duals: readonly AauScholasticDualResult[],
  individuals: readonly AauScholasticIndividualResult[],
): Record<string, AauIndividualBoutLog[]> {
  const dualByMatch = new Map(duals.map((d) => [d.matchNumber, d] as const))
  const logs: Record<string, AauIndividualBoutLog[]> = {}

  for (const [matchKey, bouts] of Object.entries(AAU_SCHOLASTIC_DUALS_2026_DUAL_BOUTS)) {
    const matchNumber = Number(matchKey)
    const dual = dualByMatch.get(matchNumber)
    if (!dual) continue

    for (const bout of bouts) {
      const wrestler = resolveAauBoutWrestlerName(bout.ourWrestler, individuals)
      if (!wrestler) continue

      const entry: AauIndividualBoutLog = {
        matchNumber,
        opponentTeam: dual.opponent,
        dualNotes: dual.notes,
        weightLbs: bout.weightLbs,
        resultLine: bout.resultLine,
        opponentWrestler: bout.opponentWrestler,
        ourTeamPts: bout.ourTeamPts,
        opponentTeamPts: bout.opponentTeamPts,
        won: bout.ourTeamPts > bout.opponentTeamPts,
      }

      if (!logs[wrestler]) logs[wrestler] = []
      logs[wrestler]!.push(entry)
    }
  }

  for (const wrestler of Object.keys(logs)) {
    logs[wrestler]!.sort((a, b) => a.matchNumber - b.matchNumber || a.weightLbs - b.weightLbs)
  }

  return logs
}

export function getAauIndividualBoutLogsForWrestler(
  wrestler: string,
  duals: readonly AauScholasticDualResult[],
  individuals: readonly AauScholasticIndividualResult[],
): AauIndividualBoutLog[] {
  return buildAauIndividualBoutLogsByWrestler(duals, individuals)[wrestler] ?? []
}
