import { describe, expect, it } from "vitest"
import { isCoachCredential, matchPurchases, parseGoFanPaste, suggestCoaches } from "./coach-ticket-purchases"

// Pasted exactly as the GoFan report arrives, tabs, "--" cells, wrapped status and all.
const PASTE = `Email
First name
Last name

Purchase Date

Purchase time

Status

Ticket Type

Order ID

Promo code

brent.gates12@gmail.com	--	--	Aug-27-2026	6:47 PM	
Active
TOC Weekend Coach Credential	166823439	--	


tompuckett123@gmail.com	--	--	Aug-27-2026	7:06 PM	
Active
TOC Weekend Coach Credential	166826360	--	


shuff_78@yahoo.com	--	--	Aug-28-2026	5:07 PM	
Active
TOC Weekend Coach Credential	167212435	--	`

describe("parseGoFanPaste", () => {
  it("reads every order out of the report", () => {
    const rows = parseGoFanPaste(PASTE)
    expect(rows.map((r) => r.orderId)).toEqual(["166823439", "166826360", "167212435"])
    expect(rows[0]).toEqual({
      email: "brent.gates12@gmail.com",
      orderId: "166823439",
      firstName: null,
      lastName: null,
      purchasedAt: "2026-08-27",
      ticketType: "TOC Weekend Coach Credential",
      status: "Active",
    })
  })

  it("does not mistake the year for an order number", () => {
    expect(parseGoFanPaste(PASTE).every((r) => r.orderId !== "2026")).toBe(true)
  })

  it("keeps one row per order when two pastes overlap", () => {
    expect(parseGoFanPaste(PASTE + "\n" + PASTE)).toHaveLength(3)
  })

  it("lower cases the address so it matches whatever we hold", () => {
    expect(parseGoFanPaste("Bo.Lansche@Gmail.com\tAug-28-2026\tActive\t167159359")[0].email)
      .toBe("bo.lansche@gmail.com")
  })

  it("ignores a line with no order number rather than inventing one", () => {
    expect(parseGoFanPaste("someone@example.com\t--\t--\tAug-27-2026")).toEqual([])
  })
})

describe("matchPurchases", () => {
  const base = {
    emailsByCoach: new Map([["justin.usmc@yahoo.com", new Set(["justin.usmc@yahoo.com"])]]),
    phonesByCoach: new Map([["user:tom", new Set(["7044539208"])]]),
    directory: [{ userId: "tom", email: "tompuckett123@gmail.com", phone: "7044539208" }],
    linked: new Map<string, string>(),
  }
  const purchase = (email: string, orderId: string) => ({ email, orderId, firstName: null, lastName: null, purchasedAt: null, ticketType: null, status: null })

  it("matches the address a family gave us", () => {
    const m = matchPurchases({ ...base, purchases: [purchase("justin.usmc@yahoo.com", "1")] })
    expect(m.get("1")).toEqual({ via: "email", coachKey: "justin.usmc@yahoo.com" })
  })

  it("matches a coach designated by mobile who bought under their account email", () => {
    const m = matchPurchases({ ...base, purchases: [purchase("tompuckett123@gmail.com", "2")] })
    expect(m.get("2")).toEqual({ via: "phone", coachKey: "user:tom" })
  })

  it("leaves a buyer we do not hold unmatched rather than guessing", () => {
    const m = matchPurchases({ ...base, purchases: [purchase("stranger@example.com", "3")] })
    expect(m.has("3")).toBe(false)
  })

  it("lets a hand-made link win over everything worked out here", () => {
    const m = matchPurchases({
      ...base,
      linked: new Map([["4", "user:someone-else"]]),
      purchases: [purchase("justin.usmc@yahoo.com", "4")],
    })
    expect(m.get("4")).toEqual({ via: "linked", coachKey: "user:someone-else" })
  })
})

describe("suggestCoaches", () => {
  const coaches = [
    { coachKey: "a", coachName: "Aaron Gunning" },
    { coachKey: "b", coachName: "Justin Shuffler" },
    { coachKey: "c", coachName: "Matt Fields" },
    { coachKey: "d", coachName: "Mike Dalton" },
  ]

  it("finds a surname sitting inside the address", () => {
    expect(suggestCoaches("agunning9@gmail.com", coaches).map((c) => c.coachName)).toEqual(["Aaron Gunning"])
    expect(suggestCoaches("mattyfields26@gmail.com", coaches).map((c) => c.coachName)).toEqual(["Matt Fields"])
  })

  it("finds a shortened surname the address starts from", () => {
    expect(suggestCoaches("shuff_78@yahoo.com", coaches).map((c) => c.coachName)).toEqual(["Justin Shuffler"])
  })

  it("offers nobody when the address matches nobody", () => {
    expect(suggestCoaches("lakostoff@yahoo.com", coaches)).toEqual([])
    expect(suggestCoaches("brent.gates12@gmail.com", coaches)).toEqual([])
  })

  it("will not fire on an address too short to mean anything", () => {
    expect(suggestCoaches("bg7@gmail.com", coaches)).toEqual([])
  })
})

describe("the CSV export", () => {
  // A row straight out of the GoFan CSV: type quoted mid-row rather than on its own line.
  const CSV = `Email,First name,Last name,Purchase date,Purchase time,Status,Ticket type,Ticket price,Order ID
tompuckett123@gmail.com,"","",2026-08-27,15:06,--,"TOC Weekend Coach Credential",$40.00,166826360,"",,,,Tournament of Champions
gingernobles34@yahoo.com,"","",2026-08-26,12:18,--,"Weekend Pass",$40.00,166664273,"",,,,Tournament of Champions`

  it("reads the ticket type out of a CSV row, not just a pasted report", () => {
    const rows = parseGoFanPaste(CSV)
    expect(rows).toHaveLength(2)
    expect(rows[0].ticketType).toBe("TOC Weekend Coach Credential")
    expect(rows[1].ticketType).toBe("Weekend Pass")
  })

  it("still reads the purchase date out of a CSV row", () => {
    expect(parseGoFanPaste(CSV)[0].purchasedAt).toBe("2026-08-27")
  })

  it("separates credentials from spectator tickets", () => {
    const rows = parseGoFanPaste(CSV)
    expect(rows.filter(isCoachCredential).map((r) => r.email)).toEqual(["tompuckett123@gmail.com"])
  })

  it("treats a row with no ticket type as not a credential", () => {
    expect(isCoachCredential({ email: "a@b.com", orderId: "1", firstName: null, lastName: null, purchasedAt: null, ticketType: null, status: null }))
      .toBe(false)
  })
})

describe("buyer names on a GoFan order", () => {
  it("leaves both null when the export writes the cells as --", () => {
    const [row] = parseGoFanPaste(
      "manuel.j.ramirez1989@gmail.com\t--\t--\tAug-27-2026\t6:51 PM\nActive\nTOC Weekend Coach Credential\t166824012\t--",
    )
    expect(row.firstName).toBeNull()
    expect(row.lastName).toBeNull()
    expect(row.orderId).toBe("166824012")
  })

  it("reads the buyer's name once GoFan is set to ask for it", () => {
    const [row] = parseGoFanPaste(
      "gatorcheer11@yahoo.com\tCasey\tGashaw\tAug-31-2026\t8:27 PM\nActive\nTOC Weekend Coach Credential\t168088024\t--",
    )
    expect(row.firstName).toBe("Casey")
    expect(row.lastName).toBe("Gashaw")
  })

  it("does not mistake the ticket type or a time for a name", () => {
    const [row] = parseGoFanPaste(
      "someone@example.com\t--\t--\t2026-08-27\t6:51 PM\nActive\nTOC Weekend Coach Credential\t166824099\t--",
    )
    expect(row.firstName).toBeNull()
    expect(row.ticketType).toBe("TOC Weekend Coach Credential")
  })

  it("handles a CSV export with quoted names", () => {
    const [row] = parseGoFanPaste(
      'shane7barbee@gmail.com,"Shane","Barbee",2026-08-29,"TOC Weekend Coach Credential",167774798,Active',
    )
    expect(row.firstName).toBe("Shane")
    expect(row.lastName).toBe("Barbee")
  })
})
