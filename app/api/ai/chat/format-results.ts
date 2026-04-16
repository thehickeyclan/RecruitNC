// Result formatting utilities for AI chat responses

function formatNameWithProfileLink(name: string, profileLinks?: Map<string, string>): string {
  if (!name?.trim() || !profileLinks) return name
  const url = profileLinks.get(name) ?? profileLinks.get(name.toLowerCase())
  return url ? `[${name}](${url})` : name
}

export function formatResults(
  results: any[],
  aggregateResult: any,
  extractedParams: any,
  getOrdinalSuffix: (num: number) => string,
  profileLinks?: Map<string, string>
): string {
  let resultsText = ""

  // Format aggregate results first
  if (aggregateResult) {
    if (aggregateResult.type === "nhsca_all_american_count") {
      if (aggregateResult.year) {
        // Single year count
        resultsText = `📊 **${aggregateResult.year} NHSCA All-Americans**\n\n`
        resultsText += `In **${aggregateResult.year}**, North Carolina had **${aggregateResult.count} NHSCA All-American${aggregateResult.count !== 1 ? "s" : ""}**.`
      } else if (aggregateResult.bestYear && aggregateResult.count) {
        // User asked about the "most" or "best" year
        const yearCounts = aggregateResult.yearCounts as Array<{ year: number; count: number; menCount?: number; womenCount?: number }> | undefined
        const gender = aggregateResult.gender || "all"
        
        // If we have breakdown (menCount/womenCount), show both
        if (aggregateResult.bestMenYear && aggregateResult.bestWomenYear) {
          const genderText = gender === "M" ? "Men's" : gender === "F" ? "Women's" : ""
          
          resultsText = `🏆 **Best Year for NHSCA All-Americans**\n\n`
          resultsText += `**Combined (Men + Women):**\n`
          resultsText += `The year with the most **NHSCA All-Americans** was **${aggregateResult.bestYear}**, with **${aggregateResult.count} All-Americans** (${aggregateResult.menCount || 0} men, ${aggregateResult.womenCount || 0} women).\n\n`
          
          resultsText += `**Men's Divisions:**\n`
          resultsText += `🥇 Best year: **${aggregateResult.bestMenYear}** with **${aggregateResult.menCount} All-Americans**\n\n`
          
          resultsText += `**Women's Divisions:**\n`
          resultsText += `🥇 Best year: **${aggregateResult.bestWomenYear}** with **${aggregateResult.womenCount} All-Americans**\n\n`
          
          if (yearCounts && yearCounts.length > 1) {
            resultsText += "**Top 5 Years (Combined):**\n"
            const sortedByCount = [...yearCounts].sort((a, b) => b.count - a.count)
            const topYears = sortedByCount.slice(0, 5).map((yc, idx) => {
              const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "•"
              return `${medal} **${yc.year}:** ${yc.count} All-Americans (${yc.menCount || 0} men, ${yc.womenCount || 0} women)`
            }).join("\n")
            resultsText += topYears
          }
        } else {
          // Gender-specific query
          const genderText = gender === "M" ? "Men's" : gender === "F" ? "Women's" : ""
          const genderNote = gender === "M" ? " (men's divisions only)" : gender === "F" ? " (women's divisions only)" : ""
          
          resultsText = `🏆 **Best Year for NHSCA All-Americans (${genderText})**\n\n`
          if (yearCounts && yearCounts.length > 1) {
            // Sort by count descending to show top years
            const sortedByCount = [...yearCounts].sort((a, b) => b.count - a.count)
            resultsText += `The year with the most NHSCA All-Americans${genderNote} was **${aggregateResult.bestYear}** with **${aggregateResult.count} All-Americans**.\n\n`
            resultsText += "**Top 5 Years:**\n"
            const topYears = sortedByCount.slice(0, 5).map((yc, idx) => {
              const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "•"
              return `${medal} **${yc.year}:** ${yc.count} All-American${yc.count !== 1 ? "s" : ""}`
            }).join("\n")
            resultsText += topYears
          } else {
            resultsText += `The year with the most NHSCA All-Americans${genderNote} was **${aggregateResult.bestYear}** with **${aggregateResult.count} All-Americans**.`
          }
        }
      } else if (aggregateResult.yearCounts) {
        // Count by year
        const yearCounts = aggregateResult.yearCounts as Array<{ year: number; count: number }>
        const total = yearCounts.reduce((sum, yc) => sum + yc.count, 0)
        resultsText = `📊 **NHSCA All-Americans by Year**\n\n`
        resultsText += `**Total:** ${total} All-Americans across ${yearCounts.length} year${yearCounts.length !== 1 ? "s" : ""}\n\n`
        resultsText += "**Year-by-Year Breakdown:**\n"
        const recentYears = yearCounts.slice(0, 10).map(yc => `• **${yc.year}:** ${yc.count} All-American${yc.count !== 1 ? "s" : ""}`).join("\n")
        resultsText += recentYears
        if (yearCounts.length > 10) {
          resultsText += `\n\n... and ${yearCounts.length - 10} more year${yearCounts.length - 10 !== 1 ? "s" : ""}`
        }
      }
    } else if (aggregateResult.type === "nhsca_school_leaderboard") {
      if (aggregateResult.school) {
        // Single school count
        resultsText = `🏫 **${aggregateResult.school} - NHSCA All-Americans**\n\n`
        resultsText += `**${aggregateResult.school}** has had **${aggregateResult.count} NHSCA All-American${aggregateResult.count !== 1 ? "s" : ""}**.`
      } else if (aggregateResult.schoolCounts) {
        // Leaderboard - format similar to Super32
        const schoolCounts = aggregateResult.schoolCounts as Array<{ school: string; count: number }>
        const totalSchools = schoolCounts.length
        const totalAllAmericans = schoolCounts.reduce((sum, sc) => sum + sc.count, 0)
        const bestSchool = schoolCounts[0]

        resultsText = `🏫 **NHSCA All-American School Leaderboard**\n\n`
        resultsText += `**Summary:** ${totalSchools} school${totalSchools !== 1 ? "s" : ""} with **${totalAllAmericans} total All-Americans**\n\n`
        resultsText += `---\n\n`
        resultsText += `🥇 **${bestSchool.school}** has had the most NHSCA All-Americans with **${bestSchool.count} All-Americans**.\n\n`
        resultsText += "**Top Schools:**\n\n"

        const topSchools = schoolCounts.slice(0, 20).map((sc, idx) => {
          const rank = idx + 1
          const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}.`
          return `${medal} **${sc.school}:** ${sc.count} All-American${sc.count !== 1 ? "s" : ""}`
        }).join("\n")
        resultsText += topSchools
        if (schoolCounts.length > 20) {
          resultsText += `\n\n... and ${schoolCounts.length - 20} more school${schoolCounts.length - 20 !== 1 ? "s" : ""}`
        }
      }
    } else if (aggregateResult.type === "nhsca_champion_count") {
      if (aggregateResult.championshipCount) {
        // Count for specific number of championships
        resultsText = `There ${aggregateResult.count === 1 ? "has been" : "have been"} ${aggregateResult.count} ${aggregateResult.championshipCount}x NHSCA National Champion${aggregateResult.count !== 1 ? "s" : ""}.`
      } else {
        // Total count
        resultsText = `There ${aggregateResult.count === 1 ? "has been" : "have been"} ${aggregateResult.count} total NHSCA National Champion${aggregateResult.count !== 1 ? "s" : ""}.`
      }
    } else if (aggregateResult.type === "nhsca_placer_count") {
      if (aggregateResult.championshipCount) {
        // Count for specific number of All-American placements
        resultsText = `There ${aggregateResult.count === 1 ? "has been" : "have been"} ${aggregateResult.count} ${aggregateResult.championshipCount}x NHSCA All-American${aggregateResult.count !== 1 ? "s" : ""}.`
      } else {
        // Total count
        resultsText = `There ${aggregateResult.count === 1 ? "has been" : "have been"} ${aggregateResult.count} total NHSCA All-American${aggregateResult.count !== 1 ? "s" : ""}.`
      }
    } else if (aggregateResult.type === "super32_all_american_count") {
      const gender = aggregateResult.gender || extractedParams?.gender || null
      const genderText = gender === 'F' ? "Women's " : gender === 'M' ? "Men's " : ""
      if (aggregateResult.year || (aggregateResult.results && Array.isArray(aggregateResult.results) && aggregateResult.results.length === 1)) {
        // Single year count - check if we have a single result in the array
        const yearData = aggregateResult.year 
          ? { year: aggregateResult.year, total_all_americans: aggregateResult.total_all_americans || aggregateResult.count, champions: aggregateResult.champions }
          : (aggregateResult.results && Array.isArray(aggregateResult.results) && aggregateResult.results.length === 1) 
            ? aggregateResult.results[0] 
            : null
        
        if (yearData) {
          const count = yearData.total_all_americans || yearData.count || 0
          resultsText = `📊 **${yearData.year} Super32 All-Americans**\n\n`
          resultsText += `In **${yearData.year}**, North Carolina had **${count} ${genderText}Super32 All-American${count !== 1 ? "s" : ""}**${yearData.champions ? `, including **${yearData.champions} champion${yearData.champions !== 1 ? "s" : ""}** 🥇` : ""}.`
        }
      } else if (aggregateResult.results && Array.isArray(aggregateResult.results)) {
        // Count by year
        const yearCounts = aggregateResult.results as Array<{ year: number; total_all_americans: number; champions: number }>
        const total = yearCounts.reduce((sum, yc) => sum + (yc.total_all_americans || 0), 0)
        const totalChampions = yearCounts.reduce((sum, yc) => sum + (yc.champions || 0), 0)
        resultsText = `📊 **${genderText}Super32 All-Americans by Year**\n\n`
        resultsText += `**Total:** ${total} ${genderText}All-Americans across ${yearCounts.length} year${yearCounts.length !== 1 ? "s" : ""}${totalChampions > 0 ? ` (${totalChampions} total champion${totalChampions !== 1 ? "s" : ""})` : ""}\n\n`
        resultsText += "**Year-by-Year Breakdown:**\n"
        const recentYears = yearCounts.slice(0, 10).map(yc => {
          const champText = yc.champions ? ` 🥇 ${yc.champions}` : ""
          return `• **${yc.year}:** ${yc.total_all_americans} All-American${yc.total_all_americans !== 1 ? "s" : ""}${champText}`
        }).join("\n")
        resultsText += recentYears
        if (yearCounts.length > 10) {
          resultsText += `\n\n... and ${yearCounts.length - 10} more year${yearCounts.length - 10 !== 1 ? "s" : ""}`
        }
      }
    } else if (aggregateResult.type === "super32_school_leaderboard") {
      if (aggregateResult.school) {
        // Single school count
        const count = aggregateResult.total_all_americans || aggregateResult.count
        resultsText = `🏫 **${aggregateResult.school} - Super32 All-Americans**\n\n`
        resultsText += `**${aggregateResult.school}** has had **${count} Super32 All-American${count !== 1 ? "s" : ""}**${aggregateResult.champions ? `, including **${aggregateResult.champions} champion${aggregateResult.champions !== 1 ? "s" : ""}** 🥇` : ""}.`
      } else if (aggregateResult.results && Array.isArray(aggregateResult.results)) {
        // Leaderboard
        const schoolCounts = aggregateResult.results as Array<{ school: string; total_all_americans: number; champions: number; unique_athletes: number }>
        const totalSchools = schoolCounts.length
        const totalAllAmericans = schoolCounts.reduce((sum, sc) => sum + sc.total_all_americans, 0)
        const totalChampions = schoolCounts.reduce((sum, sc) => sum + (sc.champions || 0), 0)
        
        resultsText = `🏫 **Super32 All-American School Leaderboard**\n\n`
        resultsText += `**Summary:** ${totalSchools} school${totalSchools !== 1 ? "s" : ""} with **${totalAllAmericans} total All-Americans**${totalChampions > 0 ? ` (${totalChampions} champion${totalChampions !== 1 ? "s" : ""})` : ""}\n\n`
        resultsText += "**Top Schools:**\n\n"
        
        const topSchools = schoolCounts.slice(0, 20).map((sc, idx) => {
          const rank = idx + 1
          const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}.`
          const champText = sc.champions ? ` (${sc.champions} 🥇)` : ""
          const athleteText = sc.unique_athletes ? ` - ${sc.unique_athletes} unique athlete${sc.unique_athletes !== 1 ? "s" : ""}` : ""
          return `${medal} **${sc.school}:** ${sc.total_all_americans} All-American${sc.total_all_americans !== 1 ? "s" : ""}${champText}${athleteText}`
        }).join("\n")
        resultsText += topSchools
        if (schoolCounts.length > 20) {
          resultsText += `\n\n... and ${schoolCounts.length - 20} more school${schoolCounts.length - 20 !== 1 ? "s" : ""}`
        }
      }
    } else if (aggregateResult.type === "state_champions_by_school") {
      const yearsText = aggregateResult.years && aggregateResult.years.length > 0
        ? ` in ${aggregateResult.years.join(", ")}`
        : ""
      resultsText = `${aggregateResult.school} has had ${aggregateResult.count} unique state champion${aggregateResult.count !== 1 ? "s" : ""} (${aggregateResult.totalChampionships} total championship${aggregateResult.totalChampionships !== 1 ? "s" : ""})${yearsText}.`
    } else if (aggregateResult.type === "state_placers_by_school") {
      const yearsText = aggregateResult.years && aggregateResult.years.length > 0
        ? ` in ${aggregateResult.years.join(", ")}`
        : ""
      resultsText = `${aggregateResult.school} has had ${aggregateResult.count} unique state placer${aggregateResult.count !== 1 ? "s" : ""} (${aggregateResult.totalPlacements} total placement${aggregateResult.totalPlacements !== 1 ? "s" : ""})${yearsText}.`
    } else if (aggregateResult.type === "most_state_champions_by_school") {
      const schoolCounts = aggregateResult.schoolCounts as Array<{ school: string; count: number; totalChampionships: number }>
      const topSchools = schoolCounts.slice(0, 20).map(sc => `${sc.school}: ${sc.count} unique champion${sc.count !== 1 ? "s" : ""} (${sc.totalChampionships} total)`).join("\n")
      resultsText = `Schools with the Most State Champions:\n${topSchools}${schoolCounts.length > 20 ? `\n... and ${schoolCounts.length - 20} more schools` : ""}`
    } else if (aggregateResult.type === "most_state_placers_by_school") {
      const schoolCounts = aggregateResult.schoolCounts as Array<{ school: string; count: number; totalPlacements: number }>
      const topSchools = schoolCounts.slice(0, 20).map(sc => `${sc.school}: ${sc.count} unique placer${sc.count !== 1 ? "s" : ""} (${sc.totalPlacements} total)`).join("\n")
      resultsText = `Schools with the Most State Placers:\n${topSchools}${schoolCounts.length > 20 ? `\n... and ${schoolCounts.length - 20} more schools` : ""}`
    } else if (aggregateResult.type === "nhsca_years_by_school") {
      const yearsText = aggregateResult.years && aggregateResult.years.length > 0
        ? aggregateResult.years.join(", ")
        : "none"
      resultsText = `${aggregateResult.school} has had NHSCA All-Americans in the following years: ${yearsText}. Total: ${aggregateResult.count} unique All-American${aggregateResult.count !== 1 ? "s" : ""} (${aggregateResult.totalPlacements} total placement${aggregateResult.totalPlacements !== 1 ? "s" : ""}).`
    } else if (aggregateResult.type === "state_champions_years_by_school") {
      const yearsText = aggregateResult.years && aggregateResult.years.length > 0
        ? aggregateResult.years.join(", ")
        : "none"
      resultsText = `${aggregateResult.school} has had state champions in the following years: ${yearsText}. Total: ${aggregateResult.count} unique champion${aggregateResult.count !== 1 ? "s" : ""} (${aggregateResult.totalChampionships} total championship${aggregateResult.totalChampionships !== 1 ? "s" : ""}).`
    } else if (aggregateResult.type === "state_champion_count") {
      if (aggregateResult.championshipCount) {
        // Count for specific number of championships
        resultsText = `There ${aggregateResult.count === 1 ? "has been" : "have been"} ${aggregateResult.count} ${aggregateResult.championshipCount}x State Champion${aggregateResult.count !== 1 ? "s" : ""}.`
      } else {
        // Total count
        resultsText = `There ${aggregateResult.count === 1 ? "has been" : "have been"} ${aggregateResult.count} total State Champion${aggregateResult.count !== 1 ? "s" : ""}.`
      }
    } else if (aggregateResult.bestYear) {
      resultsText = `Best NHSCA year: ${aggregateResult.bestYear} with ${aggregateResult.count} All-Americans.`
    } else if (aggregateResult.teamCount !== undefined && aggregateResult.region) {
      resultsText = `The ${aggregateResult.region} region has ${aggregateResult.teamCount} team${aggregateResult.teamCount !== 1 ? "s" : ""}.`
    } else if (aggregateResult.teamCount !== undefined && aggregateResult.classification) {
      resultsText = `The ${aggregateResult.classification} classification has ${aggregateResult.teamCount} team${aggregateResult.teamCount !== 1 ? "s" : ""}.`
    } else if (aggregateResult.gender_breakdown) {
      const { men, women, total } = aggregateResult.gender_breakdown
      const yearText = aggregateResult.year ? ` in ${aggregateResult.year}` : ""
      const menPercent = total > 0 ? ((men / total) * 100).toFixed(1) : "0.0"
      const womenPercent = total > 0 ? ((women / total) * 100).toFixed(1) : "0.0"
      resultsText = `Gender breakdown of college commitments${yearText}:\n- Men: ${men} (${menPercent}%)\n- Women: ${women} (${womenPercent}%)\n- Total: ${total}`
    } else if (aggregateResult.division_breakdown) {
      const yearText = aggregateResult.year ? ` for ${aggregateResult.year}` : ""
      const breakdown = aggregateResult.division_breakdown
      const total = aggregateResult.total || 0
      const breakdownText = Object.entries(breakdown)
        .map(([div, count]: [string, any]) => {
          const percent = total > 0 ? ((count / total) * 100).toFixed(1) : "0.0"
          return `- ${div}: ${count} (${percent}%)`
        })
        .join("\n")
      resultsText = `College commitment breakdown by division${yearText}:\n${breakdownText}\n\nTotal: ${total}`
    } else if (aggregateResult.comparison) {
      const { year1, year2, difference, percentage_change } = aggregateResult.comparison
      const levelText = aggregateResult.level && aggregateResult.level !== "all" ? ` ${aggregateResult.level}` : ""
      const direction = difference > 0 ? "more" : difference < 0 ? "fewer" : "the same number of"
      const absDiff = Math.abs(difference)
      resultsText = `${year1.year}: ${year1.count}${levelText} commit${year1.count !== 1 ? "s" : ""}\n${year2.year}: ${year2.count}${levelText} commit${year2.count !== 1 ? "s" : ""}\n\n${year2.year} had ${absDiff} ${direction} commit${absDiff !== 1 ? "s" : ""} than ${year1.year}${percentage_change !== "N/A" ? ` (${difference > 0 ? "+" : ""}${percentage_change}% change)` : ""}.`
    } else if (aggregateResult.peak_year) {
      const { peak_year, level } = aggregateResult
      const levelText = level && level !== "all" ? ` for ${level}` : ""
      resultsText = `The year with the most${levelText} college commits was ${peak_year.year} with ${peak_year.count} commit${peak_year.count !== 1 ? "s" : ""}.`
      if (aggregateResult.all_years && aggregateResult.all_years.length > 1) {
        resultsText += `\n\nTop years:\n${aggregateResult.all_years.slice(0, 5).map((y: any) => `- ${y.year}: ${y.count} commit${y.count !== 1 ? "s" : ""}`).join("\n")}`
      }
    } else if (aggregateResult.level && aggregateResult.count !== undefined) {
      const yearText = aggregateResult.year ? ` in ${aggregateResult.year}` : ""
      resultsText = `There ${aggregateResult.count === 1 ? "was" : "were"} ${aggregateResult.count} ${aggregateResult.level} commit${aggregateResult.count !== 1 ? "s" : ""}${yearText}.`
    } else if (aggregateResult.year && aggregateResult.count !== undefined && aggregateResult.type === "total_commits") {
      resultsText = `There ${aggregateResult.count === 1 ? "was" : "were"} ${aggregateResult.count} college commitment${aggregateResult.count !== 1 ? "s" : ""} in ${aggregateResult.year}.`
    } else if (aggregateResult.count !== undefined && aggregateResult.type === "total_commits") {
      resultsText = `There ${aggregateResult.count === 1 ? "is" : "are"} ${aggregateResult.count} total college commitment${aggregateResult.count !== 1 ? "s" : ""}.`
    } else if (aggregateResult.count !== undefined && aggregateResult.school && aggregateResult.type === "high_school_college_count") {
      resultsText = `${aggregateResult.school} has sent ${aggregateResult.count} athlete${aggregateResult.count !== 1 ? "s" : ""} to college programs.`
    } else if (aggregateResult.top && aggregateResult.schools && extractedParams?.queryType === "dual_team") {
      // Dual team leaderboard
      const schools = aggregateResult.schools as Array<{ school: string; count: number; years: number[]; divisions: string[] }>
      const topSchools = schools.slice(0, 20).map((s, idx) => {
        const yearsText = s.years.slice(0, 10).join(", ") + (s.years.length > 10 ? ` (+${s.years.length - 10} more)` : "")
        const divisionsText = s.divisions.length > 0 ? ` (${s.divisions.join(", ")})` : ""
        return `${idx + 1}. ${s.school}: ${s.count} title${s.count !== 1 ? "s" : ""}${divisionsText} - Years: ${yearsText}`
      }).join("\n")
      resultsText = `Top State Dual Team Champions:\n${topSchools}${schools.length > 20 ? `\n... and ${schools.length - 20} more schools` : ""}`
    } else if (aggregateResult.count !== undefined && aggregateResult.school) {
      resultsText = `${aggregateResult.school || "The school"} has won ${aggregateResult.count} dual team state championship${aggregateResult.count !== 1 ? "s" : ""}.`
    } else if (aggregateResult.region && aggregateResult.school) {
      resultsText = `${aggregateResult.school || "The school"} is in the ${aggregateResult.region} region.`
    } else if (aggregateResult.classification && aggregateResult.school) {
      resultsText = `${aggregateResult.school || "The school"} is in the ${aggregateResult.classification} classification.`
    } else if (aggregateResult.award && aggregateResult.description) {
      resultsText = `${aggregateResult.award}: ${aggregateResult.description}`
    } else if (aggregateResult.wrestler_name && aggregateResult.count !== undefined && aggregateResult.championships) {
      const champList = aggregateResult.championships
        .map((c: any) => `${c.year} (${c.classification} ${c.weight_class}lbs)`)
        .join(", ")
      resultsText = `${aggregateResult.wrestler_name} won ${aggregateResult.count} state championship${aggregateResult.count !== 1 ? "s" : ""}: ${champList}`
    } else if (aggregateResult.wrestler_name && aggregateResult.wins !== undefined && aggregateResult.losses !== undefined) {
      // Wrestler record (season or career)
      if (aggregateResult.is_career) {
        const schoolText = aggregateResult.high_school ? ` (${aggregateResult.high_school})` : ""
        const yearsText = aggregateResult.years ? ` across ${aggregateResult.years}` : ""
        const pinsText = aggregateResult.pins ? ` with ${aggregateResult.pins} pins` : ""
        resultsText = `${aggregateResult.wrestler_name}${schoolText} had a career record of ${aggregateResult.record}${yearsText}${pinsText}.`
      } else {
        const yearText = aggregateResult.year ? ` in ${aggregateResult.year}` : ""
        const schoolText = aggregateResult.high_school ? ` (${aggregateResult.high_school})` : ""
        const pinsText = aggregateResult.pins ? ` with ${aggregateResult.pins} pins` : ""
        resultsText = `${aggregateResult.wrestler_name}${schoolText} had a record of ${aggregateResult.record}${yearText}${pinsText}.`
      }
    } else if (aggregateResult.wrestler_name && aggregateResult.total_losses !== undefined) {
      // Wrestler total losses
      const recordsText = aggregateResult.records && aggregateResult.records.length > 0
        ? ` (${aggregateResult.records.map((r: any) => `${r.losses} in ${r.year}`).join(", ")})`
        : ""
      resultsText = `${aggregateResult.wrestler_name} (${aggregateResult.high_school}) had ${aggregateResult.total_losses} total high school losses${recordsText}.`
    } else if (results.length > 0 && results[0].rank !== undefined && results[0].name) {
      // Career winningest wrestlers
      const topWrestler = results[0]
      resultsText = `The winningest wrestler of all time in North Carolina is #${topWrestler.rank} ${topWrestler.name} from ${topWrestler.school} with a career record of ${topWrestler.record} (${topWrestler.wins} wins, ${topWrestler.losses} losses) over ${topWrestler.years}.`
      if (results.length > 1) {
        resultsText += `\n\nTop ${Math.min(results.length, 10)} Career Winningest Wrestlers:\n${results.slice(0, 10).map((r: any, idx: number) => `${idx + 1}. ${r.name} (${r.school}) - ${r.record} (${r.years})`).join("\n")}`
      }
    } else if (results.length > 0 && results[0].rank_numeric !== undefined && results[0].wrestler_name) {
      // Single season winningest wrestlers
      const topWrestler = results[0]
      resultsText = `The best single season record belongs to #${topWrestler.rank_numeric} ${topWrestler.wrestler_name} from ${topWrestler.school} with a record of ${topWrestler.record} (${topWrestler.wins} wins, ${topWrestler.losses} losses) in ${topWrestler.year}.`
      if (results.length > 1) {
        resultsText += `\n\nTop ${Math.min(results.length, 10)} Single Season Records:\n${results.slice(0, 10).map((r: any, idx: number) => `${idx + 1}. ${r.wrestler_name} (${r.school}) - ${r.record} (${r.year})`).join("\n")}`
      }
    }
  } else if (results.length > 0) {
    // Check if user explicitly asked for "show all" or "all records"
    const userQuery = extractedParams?.query || extractedParams?.message || ""
    const lowerQuery = userQuery.toLowerCase()
    const showAll = lowerQuery.includes("show all") || 
                    lowerQuery.includes("all records") || 
                    lowerQuery.includes("list all") ||
                    lowerQuery.includes("every") ||
                    (lowerQuery.includes("all") && (lowerQuery.includes("mow") || lowerQuery.includes("most outstanding")))
    
    // For state_champion_records, nhsca_champion_records, state_placer_records, nhsca_placer_records, nhsca_all_american (with year), and "show all" queries, don't limit - show all results
    const isUnlimitedQuery = showAll ||
                              extractedParams?.queryType === "state_champion_records" || 
                              extractedParams?.queryType === "nhsca_champion_records" ||
                              extractedParams?.queryType === "state_placer_records" ||
                              extractedParams?.queryType === "nhsca_placer_records" ||
                              (extractedParams?.queryType === "nhsca_all_american" && extractedParams?.year) // Year-specific queries should show all results
    const resultLimit = isUnlimitedQuery ? results.length : 20
    
    // Special handling for 4x state champions - ensure all 14 are explicitly listed
    const is4xStateChamps = extractedParams?.queryType === "state_champion_records" && 
                            extractedParams?.championshipCount === 4
    
    console.log(`[AI] Results formatting: queryType=${extractedParams?.queryType}, results.length=${results.length}, resultLimit=${resultLimit}, isUnlimitedQuery=${isUnlimitedQuery}, is4xStateChamps=${is4xStateChamps}`)
    
    // Special handling for Super32 All-Americans grouped by year
    const isSuper32AllAmericanByYear = extractedParams?.queryType === "super32_all_american" && 
                                       (lowerQuery.includes("by year") || lowerQuery.includes("show all") || !extractedParams?.year)
    
    if (isSuper32AllAmericanByYear && results.length > 0 && (results[0].source === "super32" || results[0].tournament === "Super32")) {
      // Group results by year
      const groupedByYear: Record<number, any[]> = {}
      results.forEach((r: any) => {
        const year = r.year
        if (year) {
          if (!groupedByYear[year]) {
            groupedByYear[year] = []
          }
          groupedByYear[year].push(r)
        }
      })
      
      // Sort years descending
      const sortedYears = Object.keys(groupedByYear)
        .map(y => parseInt(y))
        .sort((a, b) => b - a)
      
      // Calculate total for summary
      const totalCount = results.length
      const yearCount = sortedYears.length
      const champions = results.filter((r: any) => (r.placement || r.place) === 1).length
      
      // Check if this is a champions-only query and gender filter
      const isChampionsOnly = extractedParams?.championsOnly || false
      const genderLabel = extractedParams?.gender === "F" ? "Women's " : extractedParams?.gender === "M" ? "Men's " : ""

      // Add engaging summary
      const summaryLines: string[] = []
      if (isChampionsOnly) {
        summaryLines.push(`🏆 **${genderLabel}Super32 Champions Summary**`)
        summaryLines.push("")
        summaryLines.push(`Found **${totalCount} total ${genderLabel}Champion${totalCount !== 1 ? "s" : ""}** across **${yearCount} year${yearCount !== 1 ? "s" : ""}** 🥇.`)
      } else {
        summaryLines.push(`🏆 **${genderLabel}Super32 All-Americans Summary**`)
        summaryLines.push("")
        summaryLines.push(`Found **${totalCount} total ${genderLabel}All-Americans** across **${yearCount} year${yearCount !== 1 ? "s" : ""}**${champions > 0 ? `, including **${champions} champion${champions !== 1 ? "s" : ""}** 🥇` : ""}.`)
      }
      summaryLines.push("")
      summaryLines.push("---")
      summaryLines.push("")
      
      // Format each year group
      const yearSections = sortedYears.map(year => {
        const yearResults = groupedByYear[year]
          .sort((a, b) => {
            // Sort by placement (1st, 2nd, 3rd, etc.)
            const placementA = a.placement || a.place || 999
            const placementB = b.placement || b.place || 999
            if (placementA !== placementB) return placementA - placementB
            
            // Then by weight
            const weightA = parseInt((a.weight_class || a.weight || "0").toString().replace(/lbs?$/i, "")) || 0
            const weightB = parseInt((b.weight_class || b.weight || "0").toString().replace(/lbs?$/i, "")) || 0
            return weightA - weightB
          })
        
        const yearChampions = yearResults.filter((r: any) => (r.placement || r.place) === 1).length
        const yearCount = yearResults.length
        
        const formattedResults = yearResults.map((r: any) => {
          const name = r.athlete_name || r.wrestler_name || r.name || "Unknown"
          const school = (r.high_school || r.school || "").trim()
          const schoolText = school && school !== "SCHOOL_NAME_HERE" ? ` from ${school}` : ""
          const weight = (r.weight_class || r.weight || "").toString().replace(/lbs?$/i, "").trim()
          const weightText = weight ? `${weight}lbs` : ""
          const placement = r.placement || r.place
          
          // Emoji and placement text
          let emoji = ""
          let placementText = ""
          if (placement !== null && placement !== undefined && placement !== 0 && !isNaN(Number(placement)) && Number(placement) >= 1 && Number(placement) <= 8) {
            const placementNum = Number(placement)
            if (placementNum === 1) {
              emoji = "🥇"
              placementText = "Champion"
            } else if (placementNum === 2) {
              emoji = "🥈"
              placementText = "2nd place"
            } else if (placementNum === 3) {
              emoji = "🥉"
              placementText = "3rd place"
            } else {
              emoji = "🏅"
              placementText = `${placementNum}${getOrdinalSuffix(placementNum)} place`
            }
          }
          
          return `${emoji} ${name}${schoolText} - ${placementText}${weightText ? ` at ${weightText}` : ""}`
        }).join("\n")
        
        // Use "Champions" terminology if this is a champions-only query
        const isChampionsOnly = extractedParams?.championsOnly || false
        const yearHeader = isChampionsOnly 
          ? `**${year}** - ${yearCount} Champion${yearCount !== 1 ? "s" : ""}`
          : `**${year}** - ${yearCount} All-American${yearCount !== 1 ? "s" : ""}${yearChampions > 0 ? ` (${yearChampions} champion${yearChampions !== 1 ? "s" : ""})` : ""}`
        return `${yearHeader}\n${formattedResults}`
      })
      
      resultsText = summaryLines.join("\n") + yearSections.join("\n\n")
    } else if (is4xStateChamps && results.length === 14) {
      // Explicitly format all 14 4x state champions
      resultsText = `There are exactly 14 wrestlers who are 4x State Champions in North Carolina. Here is the complete list:\n\n${results
        .map((r: any, idx: number) => {
          const champYears = r.championships
            .map((c: any) => `${c.year} (${c.classification} ${c.weight_class}lbs)`)
            .join(", ")
          return `${idx + 1}. ${r.wrestler_name} - ${champYears}`
        })
        .join("\n")}\n\nTotal: ${results.length} wrestlers.`
    } else {
          // Special handling for nhsca_placer_records - format with all placements by year
          if (extractedParams?.queryType === "nhsca_placer_records" && results.length > 0 && results[0].all_americans) {
            resultsText = results
              .slice(0, resultLimit)
              .map((r: any) => {
                const placements = r.all_americans.map((aa: any) => {
                  const placementText = aa.placement === 1 
                    ? "National Champion" 
                    : `${aa.placement}${getOrdinalSuffix(aa.placement)} place`
                  // Remove any existing "lbs" suffix before adding it to avoid duplication
                  const weight = (aa.weight || "").toString().replace(/lbs?$/i, "").trim()
                  return `${aa.year} (${aa.division} ${weight}lbs, ${placementText})`
                }).join(", ")
                const schoolText = r.high_schools && r.high_schools.length > 0 ? ` from ${r.high_schools[0]}` : ""
                return `${r.athlete_name}${schoolText} - ${r.all_american_count}x All-American: ${placements}`
              })
              .join("\n")
      } else {
        // Add summary for result lists
        const hasSummary = !extractedParams?.queryType?.includes("count") && results.length > 0
        let summaryText = ""
        
        if (hasSummary) {
          const queryType = extractedParams?.queryType || ""
          const year = extractedParams?.year
          const yearText = year ? ` for **${year}**` : ""
          
          if (queryType.includes("nhsca_all_american") || queryType.includes("super32_all_american")) {
            const champions = results.filter((r: any) => (r.placement || r.place) === 1).length
            const userQuery = extractedParams?.query || extractedParams?.message || ""
            const lowerQuery = userQuery.toLowerCase()
            // Recognizes girls, women, female (word boundaries avoid "men" in "commitments")
            const isWomenQuery = (lowerQuery.includes("female") || lowerQuery.includes("women") || lowerQuery.includes("woman") ||
                                 lowerQuery.includes("girls") || lowerQuery.includes("girl")) &&
                                !/\bmale\b/.test(lowerQuery) && !/\bmen\b/.test(lowerQuery) && !/\bboys?\b/.test(lowerQuery)
            const isMenQuery = /\bmale\b/.test(lowerQuery) || /\bmen\b/.test(lowerQuery) || /\bboys?\b/.test(lowerQuery)
            const genderText = isWomenQuery ? "Women's " : isMenQuery ? "Men's " : ""
            const div = extractedParams?.division
            const divisionText = div ? `${div.charAt(0).toUpperCase() + div.slice(1).toLowerCase()} ` : ""
            summaryText = `📊 **Found ${results.length} ${divisionText}${genderText}All-American${results.length !== 1 ? "s" : ""}${yearText}**${champions > 0 ? ` (${champions} champion${champions !== 1 ? "s" : ""} 🥇)` : ""}\n\n`
          }
        }

        // NHSCA All-Americans: group by year with spacing for readability
        const isNhscaAllAmericanList = extractedParams?.queryType === "nhsca_all_american" &&
          results.length > 0 &&
          (results[0].athlete_name || results[0].year)
        if (isNhscaAllAmericanList) {
          const groupedByYear: Record<number, any[]> = {}
          results.forEach((r: any) => {
            const y = r.year ?? 0
            if (!groupedByYear[y]) groupedByYear[y] = []
            groupedByYear[y].push(r)
          })
          const sortedYears = Object.keys(groupedByYear).map(Number).filter(y => y > 0).sort((a, b) => b - a)
          if (groupedByYear[0]?.length) sortedYears.push(0) // "Unknown" year last
          const formatNhscaRow = (r: any) => {
            const placement = r.placement || r.place
            const emoji = placement === 1 ? "🥇" : placement === 2 ? "🥈" : placement === 3 ? "🥉" : "🏅"
            const placementText = placement === 1 ? "National Champion" : `${placement}${getOrdinalSuffix(placement)} place All-American`
            const div = (r.division || "").trim()
            const divText = div ? `${div} ` : ""
            const w = (r.weight || r.weight_class || "").toString().replace(/lbs?$/i, "").trim()
            const weightText = w ? `${w}lbs` : ""
            const rawName = r.athlete_name || r.name || ""
            const name = formatNameWithProfileLink(rawName, profileLinks)
            const school = r.high_school || r.school || ""
            const schoolText = school ? ` from ${school}` : ""
            return `${emoji} ${name}${schoolText} - ${divText}${weightText}, ${placementText} (${r.year})`
          }
          const sectionLines: string[] = []
          sortedYears.forEach((y, idx) => {
            const yearResults = groupedByYear[y]
              .sort((a: any, b: any) => {
                const pa = a.placement || a.place || 99
                const pb = b.placement || b.place || 99
                if (pa !== pb) return pa - pb
                const wa = parseInt((a.weight || a.weight_class || "0").toString().replace(/\D/g, "")) || 0
                const wb = parseInt((b.weight || b.weight_class || "0").toString().replace(/\D/g, "")) || 0
                return wa - wb
              })
            if (idx > 0) sectionLines.push("")
            sectionLines.push(`**${y || "Unknown"}**`)
            sectionLines.push("")
            yearResults.forEach((r: any) => sectionLines.push(formatNhscaRow(r)))
          })
          resultsText = summaryText + sectionLines.join("\n")
        } else {
          resultsText = summaryText + results
          .slice(0, resultLimit)
          .map((r: any) => {
            if (r.source === "nchsaa") {
            const emoji = r.place === 1 ? "🥇" : r.place === 2 ? "🥈" : r.place === 3 ? "🥉" : "🏅"
            const placeText = r.place === 1 ? "Champion" : `${r.place}${getOrdinalSuffix(r.place)} place`
            const name = formatNameWithProfileLink(r.wrestler_name || "", profileLinks)
            return `${emoji} ${name} from ${r.school} - ${r.classification} ${r.weight_class}lbs, ${placeText} (${r.year})`
          } else if (r.source === "super32") {
            // Super 32 results formatting with enhanced styling
            const rawName = r.athlete_name || r.wrestler_name || r.name || `${r.first_name || ""} ${r.last_name || ""}`.trim()
            const name = formatNameWithProfileLink(rawName, profileLinks)
            const school = (r.high_school || r.school || "").trim()
            const schoolText = school && school !== "SCHOOL_NAME_HERE" ? ` from ${school}` : ""
            const weight = r.weight_class || r.weight || ""
            const weightText = weight ? `${weight}lbs` : ""
            const year = r.year || ""
            const placement = r.placement || r.place
            const record = r.record || (r.wins !== undefined && r.losses !== undefined ? `${r.wins}-${r.losses}` : "")
            const result = r.result || ""
            const opponent = r.opponent_name || r.opponent || ""
            
            // For All-Americans (placement 1-8), show placement prominently with emojis
            if (placement !== null && placement !== undefined && placement !== 0 && !isNaN(Number(placement)) && Number(placement) >= 1 && Number(placement) <= 8) {
              const placementNum = Number(placement)
              let emoji = ""
              let placementText = ""
              
              if (placementNum === 1) {
                emoji = "🥇"
                placementText = "Champion"
              } else if (placementNum === 2) {
                emoji = "🥈"
                placementText = "2nd place"
              } else if (placementNum === 3) {
                emoji = "🥉"
                placementText = "3rd place"
              } else {
                emoji = "🏅"
                placementText = `${placementNum}${getOrdinalSuffix(placementNum)} place`
              }
              
              // Enhanced formatting with better spacing
              return `${emoji} **${name}**${schoolText} - Super32 - ${placementText} (All-American) at ${weightText}${year ? ` (${year})` : ""}`
            } else if (record) {
              // Add record if available and not an All-American
              return `📊 ${name}${schoolText} - Super32 record: ${record}${weightText ? ` at ${weightText}` : ""}${year ? ` (${year})` : ""}`
            }
            
            // If it's a match result (has opponent), show that instead
            if (opponent && !record && !placement) {
              return `⚔️ ${name}${schoolText} - Super32: ${result || "vs"} ${opponent}${weightText ? ` at ${weightText}` : ""}${year ? ` (${year})` : ""}`
            }
            
            // Fallback
            return `📊 ${name}${schoolText} - Super32${weightText ? ` at ${weightText}` : ""}${year ? ` (${year})` : ""}`
          } else if (r.tournament && (r.tournament === "NHSCA" || r.tournament === "Super32")) {
            // Combined All-American results (includes both NHSCA and Super32)
            const placement = r.placement || r.place
            const record = r.record ? ` • Record: ${r.record}` : ""
            const divisionText = r.division ? `${r.division} ` : ""
            // Clean weight - remove existing "lbs" if present
            const rawWeight = (r.weight || r.weight_class || "").toString()
            const cleanWeight = rawWeight.replace(/lbs?$/i, "").trim()
            const weightText = cleanWeight ? `${cleanWeight}lbs` : ""
            
            // Check if placement is valid (1-8 for All-Americans)
            let emoji = ""
            let placementText = ""
            if (placement !== null && placement !== undefined && placement !== 0 && !isNaN(Number(placement)) && Number(placement) >= 1 && Number(placement) <= 8) {
              const placementNum = Number(placement)
              const isChampion = placementNum === 1
              emoji = isChampion ? "🥇" : placementNum === 2 ? "🥈" : placementNum === 3 ? "🥉" : "🏅"
              if (r.tournament === "NHSCA") {
                placementText = isChampion ? "National Champion" : `${placementNum}${getOrdinalSuffix(placementNum)} place All-American`
              } else {
                // Super32
                placementText = isChampion ? "Champion (All-American)" : `${placementNum}${getOrdinalSuffix(placementNum)} place (All-American)`
              }
            } else {
              // Did not place - only show record if available
              emoji = "📊"
              placementText = "did not place"
            }
            
            const tournamentText = r.tournament === "NHSCA" ? "NHSCA" : "Super32"
            const name1 = formatNameWithProfileLink(r.athlete_name || "", profileLinks)
            return `${emoji} ${name1} from ${r.high_school || r.school} - ${tournamentText} ${divisionText}${weightText}, ${placementText}${record} (${r.year})`
          } else if (r.source === "nhsca" || r.source === "nhsca_merged" || r.athlete_name) {
            const placement = r.placement || r.place
            const record = r.record ? ` • Record: ${r.record}` : ""
            const divisionText = r.division ? `${r.division} ` : ""
            // Clean weight - remove existing "lbs" if present
            const rawWeight = (r.weight || r.weight_class || "").toString()
            const cleanWeight = rawWeight.replace(/lbs?$/i, "").trim()
            const weightText = cleanWeight ? `${cleanWeight}lbs` : ""
            
            // Check if placement is valid (1-8 for All-Americans, null/undefined/0 means did not place)
            let emoji = ""
            let placementText = ""
            if (placement !== null && placement !== undefined && placement !== 0 && !isNaN(Number(placement)) && Number(placement) >= 1 && Number(placement) <= 8) {
              const placementNum = Number(placement)
              const isChampion = placementNum === 1
              emoji = isChampion ? "🥇" : placementNum === 2 ? "🥈" : placementNum === 3 ? "🥉" : "🏅"
              placementText = isChampion ? "National Champion" : `${placementNum}${getOrdinalSuffix(placementNum)} place All-American`
            } else {
              // Did not place - only show record if available
              emoji = "📊"
              placementText = "did not place"
            }
            
            const name2 = formatNameWithProfileLink(r.athlete_name || "", profileLinks)
            return `${emoji} ${name2} from ${r.high_school || r.school} - ${divisionText}${weightText}, ${placementText}${record} (${r.year})`
          } else if (r.source === "nhsca_no_state") {
            const record = r.record ? `, Tournament Record: ${r.record}` : ""
            const name3 = formatNameWithProfileLink(r.athlete_name || "", profileLinks)
            return `${name3} from ${r.high_school} - ${r.division} ${r.weight}lbs, ${r.placement}${getOrdinalSuffix(r.placement)} place All-American${record} (${r.year}) - Did not place at states`
          } else if (r.school && r.count && r.rank !== undefined) {
            // Dual team leaderboard format
            const yearsText = r.years && r.years.length > 0 
              ? ` - Years: ${r.years.slice(0, 10).join(", ")}${r.years.length > 10 ? ` (+${r.years.length - 10} more)` : ""}`
              : ""
            const divisionsText = r.divisions && r.divisions.length > 0 
              ? ` (${r.divisions.join(", ")})`
              : ""
            return `${r.rank}. ${r.school}: ${r.count} title${r.count !== 1 ? "s" : ""}${divisionsText}${yearsText}`
          } else if (r.school && r.count) {
            return `${r.school}: ${r.count} All-American${r.count !== 1 ? "s" : ""}`
          } else if (r.year && r.count) {
            return `${r.year}: ${r.count} All-American${r.count !== 1 ? "s" : ""}`
          } else if (r.name && r.high_school && r.year) {
            // Dave Schultz or Tricia Saunders winner
            const name4 = formatNameWithProfileLink(r.name, profileLinks)
            return `${name4} from ${r.high_school} - ${r.year}${r.college ? ` (College: ${r.college})` : ""}`
          } else if (r.college && r.count) {
            // College recruiter leaderboard
            return `${r.college}: ${r.count} NC wrestler${r.count !== 1 ? "s" : ""}`
          } else if (r.year && r.count && !r.athlete_name) {
            // Yearly commit counts
            return `${r.year}: ${r.count} commit${r.count !== 1 ? "s" : ""}`
          } else if (r.athlete_name && r.college) {
            // College commitment - ALWAYS include college name
            const highSchoolText = r.high_school ? ` from ${r.high_school}` : ""
            const levelText = r.level || r.division ? ` - ${r.level || r.division}` : ""
            const cleanWeight = (r.weight_class || "").toString().replace(/lbs?$/i, "").trim()
            const weightText = cleanWeight ? `, ${cleanWeight}lbs` : ""
            const yearText = r.graduation_year ? ` (Class of ${r.graduation_year})` : ""
            const name5 = formatNameWithProfileLink(r.athlete_name, profileLinks)
            return `${name5}${highSchoolText} committed to ${r.college}${levelText}${weightText}${yearText}`
          } else if (r.athlete_name && r.high_school && (r.level || r.division) && !r.college) {
            // College commitment format but missing college - should not happen but handle gracefully
            const levelText = r.level || r.division ? ` - ${r.level || r.division}` : ""
            const cleanWeight = (r.weight_class || "").toString().replace(/lbs?$/i, "").trim()
            const weightText = cleanWeight ? `, ${cleanWeight}lbs` : ""
            const name6 = formatNameWithProfileLink(r.athlete_name, profileLinks)
            return `${name6} from ${r.high_school}${levelText}${weightText} - College commitment information not available`
          } else if (r.school && r.total_commits !== undefined) {
            // High school college breakdown
            const levelBreakdown = r.by_level
              ? Object.entries(r.by_level)
                  .map(([level, count]: [string, any]) => `${level}: ${count}`)
                  .join(", ")
              : ""
            return `${r.school} has sent ${r.total_commits} athlete${r.total_commits !== 1 ? "s" : ""} to college. Breakdown by level: ${levelBreakdown || "N/A"}`
          } else if (r.school && r.count !== undefined && !r.athlete_name) {
            // High school college count
            return `${r.school} has sent ${r.count} athlete${r.count !== 1 ? "s" : ""} to college programs.`
          } else if (r.source === "commitment" || (r.college && (r.athlete_name || r.name))) {
            // College commitment with college name
            const rawName = r.athlete_name || r.name
            const name = formatNameWithProfileLink(rawName, profileLinks)
            const highSchoolText = r.high_school ? ` from ${r.high_school}` : ""
            const levelText = r.level || r.division ? ` - ${r.level || r.division}` : ""
            const cleanWeight = (r.weight_class || "").toString().replace(/lbs?$/i, "").trim()
            const weightText = cleanWeight ? `, ${cleanWeight}lbs` : ""
            const yearText = r.graduation_year ? ` (Class of ${r.graduation_year})` : ""
            return `${name}${highSchoolText} committed to ${r.college}${levelText}${weightText}${yearText}`
          } else if (r.champion_school) {
            return `${r.champion_school} won the ${r.division || "championship"} dual team title in ${r.year}`
          } else if (r.wrestler_name && r.championship_count !== undefined) {
            // State champion records
            const champYears = r.championships
              .map((c: any) => `${c.year} (${c.classification} ${c.weight_class}lbs)`)
              .join(", ")
            const wn = formatNameWithProfileLink(r.wrestler_name, profileLinks)
            return `${wn} - ${r.championship_count}x State Champion: ${champYears}`
          } else if (r.athlete_name && r.championship_count !== undefined) {
            // NHSCA champion records
            const champYears = r.championships
              .map((c: any) => `${c.year} (${c.division} ${c.weight}lbs)`)
              .join(", ")
            const an1 = formatNameWithProfileLink(r.athlete_name, profileLinks)
            return `${an1} - ${r.championship_count}x NHSCA National Champion: ${champYears}`
          } else if (r.wrestler_name && r.placement_count !== undefined) {
            // State placer records
            const placerYears = r.placements
              .map((p: any) => `${p.year} (${p.classification} ${p.weight_class}lbs, ${p.place === 1 ? "Champion" : `${p.place}${getOrdinalSuffix(p.place)} place`})`)
              .join(", ")
            const champText = r.championships > 0 ? ` (${r.championships} championship${r.championships !== 1 ? "s" : ""})` : ""
            const wn2 = formatNameWithProfileLink(r.wrestler_name, profileLinks)
            return `${wn2} - ${r.placement_count}x State Placer: ${placerYears}${champText}`
          } else if (r.athlete_name && r.placement_count !== undefined) {
            // NHSCA placer records
            const placerYears = r.placements
              .map((p: any) => `${p.year} (${p.division} ${p.weight}lbs, ${p.placement === 1 ? "National Champion" : `${p.placement}${getOrdinalSuffix(p.placement)} place All-American`})`)
              .join(", ")
            const champText = r.championships > 0 ? ` (${r.championships} national championship${r.championships !== 1 ? "s" : ""})` : ""
            const an2 = formatNameWithProfileLink(r.athlete_name, profileLinks)
            return `${an2} - ${r.placement_count}x NHSCA All-American: ${placerYears}${champText}`
          } else if (r.wrestler_name && r.record && r.wins !== undefined) {
            // Wrestler record
            const yearText = r.year ? ` (${r.year})` : ""
            const schoolText = r.high_school ? ` - ${r.high_school}` : ""
            const pinsText = r.pins ? `, ${r.pins} pins` : ""
            const wn3 = formatNameWithProfileLink(r.wrestler_name, profileLinks)
            return `${wn3}${schoolText}: ${r.record}${yearText}${pinsText}`
          } else if (r.wrestler_name && r.opponent_name) {
            // Wrestler opponent match
            const dateText = r.match_date ? ` on ${r.match_date}` : ""
            const resultText = r.result ? ` (${r.result})` : ""
            const yearText = r.year ? ` in ${r.year}` : ""
            return `${r.wrestler_name} wrestled ${r.opponent_name}${dateText}${yearText}${resultText}`
          } else if (r.school && r.classification) {
            return `${r.school} (${r.classification})`
          } else if (r.wrestler_name && r.record && r.wins !== undefined && r.year) {
            // Single season winningest
            const wn4 = formatNameWithProfileLink(r.wrestler_name, profileLinks)
            return `#${r.rank_numeric} ${wn4} (${r.school}) - ${r.record} (${r.year})`
          } else if (r.name && r.record && r.wins !== undefined && r.years) {
            // Career winningest
            return `#${r.rank} ${r.name} (${r.school}) - ${r.record} (${r.years})`
          } else if (r.athlete_name && r.category && r.record_value) {
            // Record books
            return `${r.athlete_name} (${r.school || "N/A"}) - ${r.category}: ${r.record_value}${r.description ? ` (${r.description})` : ""}`
          } else {
            return JSON.stringify(r)
          }
        })
        .join("\n")
        }
      }
    }
  }
  
  // Ensure resultsText is set
  if (!resultsText) {
    // For calendar queries, NEVER return "No results found" - calendar handler should handle this
    // But if we somehow get here, return a simple message
    if (extractedParams?.queryType === "calendar") {
      resultsText = "📅 I don't see that event in the calendar."
    } else {
      const queryType = extractedParams?.queryType || ""
      if (queryType.includes("all_american") || queryType.includes("champion") || queryType.includes("placer")) {
        resultsText = "🔍 I couldn't find any results matching your query. Try adjusting the year, school, or wrestler name."
      } else {
        resultsText = "🔍 No results found. Try rephrasing your question or checking your search terms."
      }
    }
  }

  return resultsText
}

