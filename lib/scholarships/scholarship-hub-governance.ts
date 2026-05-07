/**
 * Shared scholarship governance copy for the NC United Scholarships hub.
 * Voting committee is the same across named funds; individual scholarships may add one non-voting family/legacy advisor (see each fund's page).
 */

export type SharedScholarshipCommitteeMemberRow = {
  name: string
  seatTitle: string
  connection: string
  voteType: "Voting" | "Advisory"
}

/** Voting members who serve across NC United named scholarship funds (one NC United vote + community votes). */
export const SHARED_SCHOLARSHIP_VOTING_COMMITTEE: SharedScholarshipCommitteeMemberRow[] = [
  {
    name: "Matt Hickey",
    seatTitle: "NC United · sole organizing vote",
    connection: "Co-founder — the only NC United voting seat on the committee",
    voteType: "Voting",
  },
  {
    name: "Jonathan Sutton",
    seatTitle: "NC wrestling official",
    connection: "Lead referee · diversity & inclusion",
    voteType: "Voting",
  },
  {
    name: "LaTasha Robinson Stinson",
    seatTitle: "Educator · wrestling family",
    connection: "Educator; deeply engaged in the NC wrestling community (confirmed)",
    voteType: "Voting",
  },
  {
    name: "To be announced",
    seatTitle: "Community seat",
    connection: "Final voting seat — intentionally open until NC United announces it",
    voteType: "Voting",
  },
]

export const SCHOLARSHIP_HUB_COMMITTEE_INTRO =
  "NC United uses one voting committee for its named scholarship funds. The same blind-review process and weighted criteria apply across funds so outcomes stay consistent and fair. NC United holds exactly one ballot on the committee; independent community members hold the rest."

export const SCHOLARSHIP_HUB_ADVISORY_EXPLAINER =
  "Some scholarships add a non-voting family or legacy representative tied only to that fund — for commentary on finalists and to safeguard the spirit of the award. Advisors do not submit numeric scores in the blind-review phase."

export const SCHOLARSHIP_HUB_TRANSPARENCY_NOTE =
  "Voting members score applications blind: athlete names and schools stay hidden in the review portal until finalists are named. LaTasha Robinson Stinson has confirmed she will serve. One community voting seat remains open until NC United fills it; individuals are listed publicly once they have accepted."

export const SCHOLARSHIP_BLIND_REVIEW_SUMMARY =
  "Blind review reduces unconscious bias toward well-known athletes or programs. Until finalists are named, voting reviewers see the essay, optional context, and scoring criteria — not athlete name, school, club, or graduation year."

export const SCHOLARSHIP_INTEGRITY_NOTE =
  "Panel members must recuse from any application where they have a personal or direct coaching conflict; undisclosed conflicts can disqualify scores. Applications and deliberation stay confidential inside the review portal unless public announcement is agreed with the recipient."
