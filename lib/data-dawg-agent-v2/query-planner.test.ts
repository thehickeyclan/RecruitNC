import { describe, expect, it } from "vitest"
import { appendSourceFooter, planDataDawgQuery } from "./query-planner"

describe("planDataDawgQuery", () => {
  it("routes multi-time champions", () => {
    const p = planDataDawgQuery("who are the 4x state champs?")
    expect(p?.intent).toBe("nchsaa_multi_time_state_champions")
    if (p?.intent === "nchsaa_multi_time_state_champions") {
      expect(p.times).toBe(4)
      expect(p.source.confidence).toBe("high")
    }
  })

  it("routes multi-time placers separately from champions", () => {
    const p = planDataDawgQuery("who are the four-time state placers?")
    expect(p?.intent).toBe("nchsaa_multi_time_state_placers")
    if (p?.intent === "nchsaa_multi_time_state_placers") {
      expect(p.times).toBe(4)
    }
  })

  it("routes dual team leaderboard and year queries", () => {
    const lb = planDataDawgQuery("what team has won the most state dual titles?")
    expect(lb?.intent).toBe("nchsaa_dual_team_champions")
    if (lb?.intent === "nchsaa_dual_team_champions") {
      expect(lb.leaderboard).toBe(true)
    }

    const yr = planDataDawgQuery("who won dual team states in 2026?")
    expect(yr?.intent).toBe("nchsaa_dual_team_champions")
    if (yr?.intent === "nchsaa_dual_team_champions") {
      expect(yr.year).toBe(2026)
      expect(yr.leaderboard).toBe(false)
    }
  })

  it("routes prospect rankings", () => {
    const p = planDataDawgQuery("show me Class of 2027 rankings")
    expect(p?.intent).toBe("public_rankings_search")
    if (p?.intent === "public_rankings_search") {
      expect(p.graduation_year).toBe(2027)
      expect(p.gender).toBe("Male")
    }
  })

  it("routes record books and awards", () => {
    expect(planDataDawgQuery("who is the winningest wrestler of all time?")?.intent).toBe(
      "record_books_search",
    )
    expect(planDataDawgQuery("Dave Schultz winners")?.intent).toBe("dave_schultz_award_search")
    expect(planDataDawgQuery("Tricia Saunders award 2024")?.intent).toBe(
      "tricia_saunders_award_search",
    )
  })

  it("routes college commits lists", () => {
    const p = planDataDawgQuery("college commits class of 2026")
    expect(p?.intent).toBe("college_commits_search")
    if (p?.intent === "college_commits_search") {
      expect(p.grad_year).toBe(2026)
    }
  })

  it("does not steal athlete or school name lookups", () => {
    expect(planDataDawgQuery("Mac Johnson")).toBeNull()
    expect(planDataDawgQuery("tell me about Cardinal Gibbons")).toBeNull()
    expect(planDataDawgQuery("who is better Mac Johnson vs Cael Dunn")).toBeNull()
  })
})

describe("appendSourceFooter", () => {
  it("appends dataset, verification, and confidence", () => {
    const out = appendSourceFooter("Hello", {
      datasets: ["dual_team_champions"],
      verification: "structured_db",
      confidence: "high",
    })
    expect(out).toContain("Source dataset: dual_team_champions")
    expect(out).toContain("Verification: structured db")
    expect(out).toContain("Confidence: high")
  })
})
