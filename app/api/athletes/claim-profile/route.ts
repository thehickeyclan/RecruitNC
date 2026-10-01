import { NextResponse } from "next/server"

/**
 * Retired.
 *
 * This claimed a profile from an athlete id alone: no relationship stated, nothing recorded
 * beyond a user id and a timestamp, nobody told. It was reachable by anything that knew the
 * path, and the only caller left was a debug page.
 *
 * Claims now go through /api/profile/claim-existing on the website and
 * /api/mobile/v1/athlete/[id]/claim in the app. Both ask whether you are the wrestler or his
 * parent, and both leave a row in profile_claim_consents saying who claimed what, on what basis,
 * agreeing to which words, and from where.
 */
export async function POST() {
  return NextResponse.json(
    { error: "This endpoint has been retired. Claim a profile from the athlete's page." },
    { status: 410 },
  )
}
