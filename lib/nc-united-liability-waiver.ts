/** Shared NC United liability waiver — Blue membership, practice drop-ins, etc. */

export const NC_UNITED_LIABILITY_WAIVER_TYPE = "nc_united_liability"
export const NC_UNITED_DROP_IN_LIABILITY_WAIVER_TYPE = "nc_united_drop_in_liability"
export const NC_UNITED_LIABILITY_WAIVER_VERSION = "2"

const WAIVER_INTRO = `This Waiver and Release applies to all activities, practices, competitions, events, and related activities organized by NC Wrestling United ("NC United"), including those conducted at facilities owned or operated by The University of North Carolina at Chapel Hill or any other third party.`

const DROP_IN_SCOPE = `This waiver applies specifically to the participant's attendance at the NC United practice/session identified on the associated registration form.`

const WAIVER_BODY = `I, the undersigned parent or legal guardian of the minor participant, acknowledge and agree as follows:

Physical Condition
I certify that the participant is physically fit to participate and has no medical condition that would prevent safe participation.

Assumption of Risk
I understand that wrestling and related training activities are inherently dangerous contact activities. Risks include, but are not limited to: sprains, strains, fractures, dislocations; concussions and head injuries; paralysis or catastrophic injury; permanent disability; death; injuries resulting from contact with other participants; injuries arising from facility conditions or equipment; risks associated with travel to and from events.

I understand participation may expose the participant to communicable illnesses, including but not limited to viral or bacterial infections, and voluntarily assume those risks.

I knowingly and voluntarily assume all risks, both known and unknown, even if arising from the negligence of the Released Parties.

Release of Liability
To the fullest extent permitted by North Carolina law, I release and forever discharge: NC Wrestling United; its officers, directors, employees, volunteers, and agents; The University of North Carolina at Chapel Hill; The University of North Carolina System; The State of North Carolina; their trustees, officers, employees, agents, and representatives (collectively, the "Released Parties") from any and all claims, demands, causes of action, damages, or liabilities arising out of or related to participation in NC United activities, including claims arising from the ordinary negligence of the Released Parties.

Indemnification
I agree to indemnify and hold harmless the Released Parties from any claims, damages, costs, or expenses arising from the participant's involvement in NC United activities.

Medical Authorization
I authorize NC United to obtain emergency medical treatment for the participant if necessary. I understand I am financially responsible for any resulting medical expenses.

Insurance
I understand NC United may carry insurance but that I am responsible for maintaining adequate personal medical insurance for the participant.

Media Release
I grant permission for NC United to use photographs, video, or likeness of the participant for promotional, marketing, social media, or educational purposes without compensation.

Governing Law and Venue
This agreement shall be governed by the laws of the State of North Carolina. Any disputes shall be brought in a court of competent jurisdiction within North Carolina.

Severability
If any portion of this agreement is deemed invalid, the remaining provisions shall remain in full force and effect.

I acknowledge that I have read and understand this Waiver and Release of Liability and sign it voluntarily on behalf of myself and the minor participant.

I understand that by signing this document, I am giving up substantial legal rights, including the right to sue.`

/** Full program waiver (Blue membership and ongoing NC United participation). */
export const NC_UNITED_LIABILITY_WAIVER_TEXT = `WAIVER AND RELEASE OF LIABILITY

${WAIVER_INTRO}

${WAIVER_BODY}`

/** Single-practice drop-in waiver — scoped to the registered session. */
export const NC_UNITED_DROP_IN_LIABILITY_WAIVER_TEXT = `WAIVER AND RELEASE OF LIABILITY

${WAIVER_INTRO}

${DROP_IN_SCOPE}

${WAIVER_BODY}`

export const NC_UNITED_LIABILITY_WAIVER_CHECKBOX_LABEL =
  "I have read and understand this Waiver and Release of Liability and sign it voluntarily on behalf of myself and the minor participant."
