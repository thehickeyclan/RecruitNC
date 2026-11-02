import { describe, expect, it } from "vitest"
import {
  filterRowsByAthleteMatchContext,
  getAthleteNameSearchVariants,
  nameReadings,
  nameWords,
  namesLikelySamePerson,
  namesReferToSamePerson,
  pickBestAthleteCandidate,
  scoreAthleteRowMatch,
  schoolsLikelySame,
} from "@/lib/athlete-name-match"

describe("athlete-name-match", () => {
  it("treats Max Davis and Maxwell Davis as likely same person", () => {
    expect(namesLikelySamePerson("Max Davis", "Maxwell Davis")).toBe(true)
    expect(namesLikelySamePerson("Maxwell Davis", "Max Davis")).toBe(true)
  })

  it("expands Max to Maxwell in search variants", () => {
    const variants = getAthleteNameSearchVariants("Max Davis")
    expect(variants.some((v) => v.toLowerCase().includes("maxwell"))).toBe(true)
  })

  it("treats Elijah Horton and Eli Horton as same person and expands search", () => {
    expect(namesLikelySamePerson("Elijah Horton", "Eli Horton")).toBe(true)
    const variants = getAthleteNameSearchVariants("Elijah Horton")
    expect(variants.some((v) => /^eli horton$/i.test(v))).toBe(true)
  })

  it("links Jeshurun Mills to NCHSAA results recorded under Jay Mills", () => {
    expect(namesLikelySamePerson("Jeshurun Mills", "Jay Mills")).toBe(true)
    const variants = getAthleteNameSearchVariants("Jeshurun Mills")
    expect(variants.some((v) => /^jay mills$/i.test(v))).toBe(true)
  })

  it("matches Last, First token order", () => {
    expect(namesReferToSamePerson("Ryan Thompson", "Thompson, Ryan")).toBe(true)
  })

  it("scores Maxwell NCHSAA row higher for Max Davis profile with school + grad", () => {
    const maxwellScore = scoreAthleteRowMatch(
      { displayName: "Max Davis", graduationYear: 2026, highSchool: "Jacksonville" },
      { name: "Maxwell Davis", school: "Jacksonville", year: 2026 },
    )
    const wrongScore = scoreAthleteRowMatch(
      { displayName: "Max Davis", graduationYear: 2026, highSchool: "Jacksonville" },
      { name: "Max Smith", school: "Charlotte", year: 2020 },
    )
    expect(maxwellScore).toBeGreaterThan(wrongScore)
    expect(maxwellScore).toBeGreaterThanOrEqual(35)
  })

  it("filters wrong namesakes when strong match exists", () => {
    const rows = [
      { name: "Maxwell Davis", school: "Jacksonville", year: 2026, place: 1 },
      { name: "Max Davis", school: "Raleigh", year: 2019, place: 3 },
    ]
    const filtered = filterRowsByAthleteMatchContext(
      rows,
      { displayName: "Max Davis", graduationYear: 2026, highSchool: "Jacksonville" },
      (r) => r,
    )
    expect(filtered).toHaveLength(1)
    expect(filtered[0].name).toBe("Maxwell Davis")
  })

  it("keeps a row from a school the athlete transferred away from", () => {
    // Year still fits, so the old school is not evidence against them — dropping this would
    // hide real results for every transfer.
    const rows = [
      { name: "Max Davis", school: "Jacksonville", year: 2026 },
      { name: "Max Davis", school: "Old School", year: 2024 },
    ]
    const filtered = filterRowsByAthleteMatchContext(
      rows,
      { displayName: "Max Davis", graduationYear: 2026, highSchool: "Jacksonville" },
      (r) => r,
    )
    expect(filtered).toHaveLength(2)
  })

  it("keeps a row that says nothing — a blank school and no year cannot contradict", () => {
    const rows = [
      { name: "Max Davis", school: "Jacksonville", year: 2026 },
      { name: "Max Davis", school: null, year: null },
    ]
    const filtered = filterRowsByAthleteMatchContext(
      rows,
      { displayName: "Max Davis", graduationYear: 2026, highSchool: "Jacksonville" },
      (r) => r,
    )
    expect(filtered).toHaveLength(2)
  })

  it("keeps everything when no row corroborates, rather than hiding data", () => {
    const rows = [
      { name: "Max Davis", school: "Raleigh", year: 2019 },
      { name: "Max Davis", school: "Durham", year: 2018 },
    ]
    const filtered = filterRowsByAthleteMatchContext(
      rows,
      { displayName: "Max Davis", graduationYear: 2026, highSchool: "Jacksonville" },
      (r) => r,
    )
    expect(filtered).toHaveLength(2)
  })

  it("pickBestAthleteCandidate chooses grad + school match", () => {
    const candidates = [
      { id: "a", name: "Matthew Hickey", highschool: "Northwest Guilford", graduationyear: 2027 },
      { id: "b", name: "Matt Hickey", highschool: "Other HS", graduationyear: 2024 },
    ]
    const picked = pickBestAthleteCandidate(
      candidates,
      { displayName: "Matt Hickey", graduationYear: 2027, highSchool: "Northwest Guilford" },
      (r) => ({
        name: r.name,
        highSchool: r.highschool,
        graduationYear: r.graduationyear,
      }),
    )
    expect(picked?.id).toBe("a")
  })
})

describe("apostrophes across sources", () => {
  it("reads a backtick as the apostrophe it stands in for", () => {
    // A state file wrote "Kevin O`Brien"; ours holds "Kevin O'Brien". They are one wrestler, and
    // treating them as two would have inserted a second copy of a 3A state champion.
    expect(nameWords("Kevin O`Brien").join(" ")).toBe(nameWords("Kevin O'Brien").join(" "))
    expect(namesLikelySamePerson("Kevin O`Brien", "Kevin O'Brien")).toBe(true)
    expect(namesLikelySamePerson("Jackson D`Ettore", "Jackson D'Ettore")).toBe(true)
  })

  it("folds the curly quote and the acute accent the same way", () => {
    expect(nameWords("Shea O’Malley").join(" ")).toBe(nameWords("Shea O'Malley").join(" "))
    expect(nameWords("Shea O´Malley").join(" ")).toBe(nameWords("Shea O'Malley").join(" "))
  })

  it("still tells two different wrestlers apart", () => {
    expect(namesLikelySamePerson("Kevin O'Brien", "Kevin O'Brian")).toBe(false)
  })
})

describe("schoolsLikelySame", () => {
  it("folds a backtick apostrophe, so one school is not read as a transfer", () => {
    // RankWrestlers writes "Gray`s Creek High School"; the profile holds "Gray's Creek".
    expect(schoolsLikelySame("Gray`s Creek High School", "Gray's Creek")).toBe(true)
    expect(schoolsLikelySame("Northside High School (Jacksonville)", "Northside (Jacksonville)")).toBe(true)
  })

  it("still refuses two different schools", () => {
    expect(schoolsLikelySame("East Forsyth", "Robert B. Glenn")).toBe(false)
    expect(schoolsLikelySame("", "Gray's Creek")).toBe(false)
  })
})

describe("a mangled apostrophe", () => {
  /*
   * NHSCA's 2026 export wrote "Jackson D?Ettore". Four other spellings of his name already
   * matched the profile; this one did not, so a 6A state champion's two national bouts sat
   * unlinked. The question mark is the apostrophe, mangled on export.
   */
  it("joins D?Ettore and D\uFFFDEttore to D'Ettore", () => {
    expect(namesLikelySamePerson("Jackson D?Ettore", "Jackson D'Ettore")).toBe(true)
    expect(namesLikelySamePerson("Jackson D\uFFFDEttore", "Jackson D'Ettore")).toBe(true)
  })

  it("still refuses a trailing question mark, which decides nothing", () => {
    expect(namesLikelySamePerson("Jackson Smith?", "Jackson Jones")).toBe(false)
  })
})

describe("one school, two spellings", () => {
  /*
   * Every pair here is one Maryland school as two of its own brackets spell it. Each one that
   * fails mints a second profile for a wrestler who entered both his state's tournaments —
   * five boys at Loyola Blakefield, before the grouping was fixed to ask this function.
   */
  it.each([
    ["Loyola Blakefield", "Loyola-Blakefield"],
    ["Cambridge-South Dorchester", "Cambridge/South Dorchester"],
    ["DeMatha Catholic", "Dematha Catholic"],
    ["Dr. Henry A. Wise Jr.", "Dr. Henry A. Wise, Jr."],
    ["North East", "Northeast"],
    ["Saint John Paul the Great Catholic High School", "St. John Paul the Great Catholic"],
    ["St. Paul`s School for Boys", "Saint Paul's School for Boys"],
    ["Our Lady of Mt. Carmel", "Our Lady of Mount Carmel"],
    ["Ft. Hill", "Fort Hill"],
  ])("joins %s and %s", (a, b) => {
    expect(schoolsLikelySame(a, b)).toBe(true)
  })

  it("still keeps different schools apart", () => {
    expect(schoolsLikelySame("North East", "North Point")).toBe(false)
    expect(schoolsLikelySame("Loyola Blakefield", "Loyola Academy")).toBe(false)
    expect(schoolsLikelySame("Northeast", "North Hagerstown")).toBe(false)
    expect(schoolsLikelySame("St. John Paul the Great Catholic", "St. Mary's")).toBe(false)
    expect(schoolsLikelySame("Mount Carmel", "Mount Hebron")).toBe(false)
  })
})

describe("a nickname in quotes", () => {
  it("gives the name two readings, formal first", () => {
    expect(nameReadings("Steven `Jett` Johnson")).toEqual(["Steven Johnson", "Jett Johnson"])
    expect(nameReadings('Patrick "Wyatt" Mayfield')).toEqual(["Patrick Mayfield", "Wyatt Mayfield"])
  })

  it("matches the other bracket's spelling of the same wrestler", () => {
    /*
     * Florida printed `Steven \`Jett\` Johnson` in 2025 and `Jett Johnson` in 2026: one Cocoa
     * Beach 106-pounder, class of 2030, who was minted as two profiles before this.
     */
    expect(namesReferToSamePerson("Steven `Jett` Johnson", "Jett Johnson")).toBe(true)
    expect(namesReferToSamePerson("Steven `Jett` Johnson", "Steven Johnson")).toBe(true)
  })

  it("does not make two wrestlers one", () => {
    /* Without the quotes there is no evidence they are the same person, so they are not. */
    expect(namesReferToSamePerson("Jett Johnson", "Steven Johnson")).toBe(false)
    expect(namesReferToSamePerson("Steven `Jett` Johnson", "Jett Smith")).toBe(false)
  })

  it("leaves a mid-name apostrophe alone, however it is mangled", () => {
    expect(nameReadings("Mason O`dell")).toEqual(["Mason O`dell"])
    expect(nameReadings("A`Niyah Leon-Goodrich")).toEqual(["A`Niyah Leon-Goodrich"])
    expect(nameReadings("Jackson D?Ettore")).toEqual(["Jackson D?Ettore"])
  })
})

describe("one wrestler, two ways a bracket typed the name", () => {
  it("reads a punctuated initial and a bare one as one person", () => {
    /*
     * Pennsylvania's 2025 PIAA bracket printed "Cj Caines" and its 2026 bracket "C.J. Caines" -
     * one Hanover Area wrestler, class of 2028, who came out of the mint as two profiles.
     */
    expect(namesReferToSamePerson("Cj Caines", "C.J. Caines")).toBe(true)
    expect(namesReferToSamePerson("A.J. Corp", "A.j. Corp")).toBe(true)
  })

  it("ignores a stray mark a bracket leaves on a name", () => {
    expect(namesReferToSamePerson("Bella Ndinga Mbappe`", "Bella Ndinga Mbappe")).toBe(true)
  })

  it("joins a name particle to the word after it, attached or detached", () => {
    expect(namesReferToSamePerson("Mackey Mc Clelland", "Mackey McClelland")).toBe(true)
    expect(namesReferToSamePerson("Jaydon Le Noble", "Jaydon LeNoble")).toBe(true)
    expect(namesReferToSamePerson("William Du Chemin", "William DuChemin")).toBe(true)
  })

  it("does not draw two wrestlers together on a particle alone", () => {
    expect(namesReferToSamePerson("Mack Clelland", "Mackey McClelland")).toBe(false)
    expect(namesReferToSamePerson("Jaydon Noble", "Jaydon Le Noble")).toBe(false)
    expect(namesReferToSamePerson("Evan Ours", "Evan Hours")).toBe(false)
  })

  it("still keeps two different wrestlers apart", () => {
    expect(namesReferToSamePerson("Jon Smith", "Jonathan Smith")).toBe(false)
    expect(namesReferToSamePerson("Mason Horwat", "Mason Howard")).toBe(false)
  })
})

describe("one school, two ways a state's sources print it", () => {
  it("ignores a trailing gender or sport marker", () => {
    /* Wisconsin's 2026 WIAA print writes all three of these for one Freedom program. */
    expect(schoolsLikelySame("Freedom Girls", "Freedom Wrestling")).toBe(true)
    expect(schoolsLikelySame("Mio-Au Sable Hs Girls", "Mio (Girls)")).toBe(true)
    expect(schoolsLikelySame("Dowagiac Union HS", "Dowagiac (Girls)")).toBe(true)
  })

  it("keeps a school whose name BEGINS with one of those words", () => {
    /* Boys' Latin is a school; stripping the first word would collide it with every Latin school. */
    expect(schoolsLikelySame("Boys Latin", "Chicago Latin")).toBe(false)
    expect(schoolsLikelySame("Girls Preparatory School", "Memphis Preparatory")).toBe(false)
  })

  it("reads school-then-town and town-then-school as one place", () => {
    /*
     * Michigan's MHSAA print brackets the town where its Flo payload leads with it. Six wrestlers
     * lost an earlier placement to the namesake guard over this.
     */
    expect(schoolsLikelySame("Huron HS (New Boston)", "New Boston Huron")).toBe(true)
    expect(schoolsLikelySame("Adams HS (Rochester)", "Rochester Adams")).toBe(true)
    expect(schoolsLikelySame("John Glenn HS (Bay City)", "Bay City John Glenn")).toBe(true)
    expect(schoolsLikelySame("Gabriel Richard (Riverview)", "Riverview Gabriel Richard")).toBe(true)
  })

  it("forgives a word the source abbreviated with a period", () => {
    expect(schoolsLikelySame("Mass. Perry", "Massillon Perry")).toBe(true)
    expect(schoolsLikelySame("Dub. Coffman", "Dublin Coffman")).toBe(true)
    expect(schoolsLikelySame("Med. Highland", "Medina Highland")).toBe(true)
  })

  it("will not take a bare prefix as an abbreviation", () => {
    /* Northampton and North Allegheny are two real and different Pennsylvania schools. */
    expect(schoolsLikelySame("North Allegheny", "Northampton Allegheny")).toBe(false)
    expect(schoolsLikelySame("Beaver Local", "Lisbon Beaver")).toBe(false)
  })

  it("still keeps two different schools apart", () => {
    expect(schoolsLikelySame("Carlyle", "Vandalia")).toBe(false)
    expect(schoolsLikelySame("Dundee", "Springport")).toBe(false)
    expect(schoolsLikelySame("Buffalo Grove", "Arlington Heights (Hersey)")).toBe(false)
  })
})

describe("a trailing state code is not part of the school name", () => {
  it("folds one school entered into two of a state's championships", () => {
    /* Texas runs four championships; its payloads suffix the state in one layer and not the other. */
    expect(schoolsLikelySame("St. John`s School Houston", "St. John`s School (TX)")).toBe(true)
    expect(schoolsLikelySame("Episcopal Hs Tx", "Episcopal High School- Houston (TX)")).toBe(true)
    expect(schoolsLikelySame("St.thomas Catholic", "St. Thomas High School (TX)")).toBe(true)
  })

  it("closes a co-op abbreviation printed two ways", () => {
    expect(schoolsLikelySame("Chetek-Weyer./Prairie Farm", "Chetek-Weyer/PF")).toBe(true)
  })

  it("does not fold two schools that merely share a word", () => {
    expect(schoolsLikelySame("Lewisville Marcus", "All Saints Episcopal School")).toBe(false)
    expect(schoolsLikelySame("El Paso Eastwood", "Allen")).toBe(false)
    expect(schoolsLikelySame("Willis", "Conroe Woodlands College Park")).toBe(false)
  })
})
