import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

interface Insight {
  category: "trend" | "recognition" | "shoutout"
  text: string
  filters?: Record<string, any>
  icon: string
}

async function generateInsights() {
  const insights: Insight[] = []

  // Generate trend insights
  await generateTrendInsights(insights)

  // Generate recognition insights
  await generateRecognitionInsights(insights)

  // Generate shoutout insights
  await generateShoutoutInsights(insights)

  // Save insights to database
  if (insights.length > 0) {
    const { error } = await supabase.from("ai_insights").insert(
      insights.map((insight) => ({
        category: insight.category,
        text: insight.text,
        filters: insight.filters,
        icon: insight.icon,
      })),
    )

    if (error) {
      console.error("Error saving insights:", error)
    } else {
      console.log(`Successfully generated ${insights.length} insights`)
    }
  }
}

async function generateTrendInsights(insights: Insight[]) {
  // Year-over-year growth
  const { data: yearData } = await supabase
    .from("athletes")
    .select("graduationyear, count")
    .not("graduationyear", "is", null)
    .groupBy("graduationyear")
    .order("graduationyear")

  if (yearData && yearData.length >= 2) {
    const currentYear = yearData[yearData.length - 1]
    const previousYear = yearData[yearData.length - 2]

    const growth = currentYear.count - previousYear.count
    const growthPercent = Math.round((growth / previousYear.count) * 100)

    if (Math.abs(growthPercent) >= 10) {
      insights.push({
        category: "trend",
        text: `${growthPercent > 0 ? "Increase" : "Decrease"} of ${Math.abs(growthPercent)}% in commitments from ${previousYear.graduationyear} to ${currentYear.graduationyear}`,
        filters: {
          graduationyear: currentYear.graduationyear,
        },
        icon: growthPercent > 0 ? "📈" : "📉",
      })
    }
  }

  // Division growth
  const { data: divisionData } = await supabase
    .from("athletes")
    .select("division, count")
    .not("division", "is", null)
    .groupBy("division")
    .order("count", { ascending: false })

  if (divisionData && divisionData.length > 0) {
    const topDivision = divisionData[0]

    insights.push({
      category: "trend",
      text: `${topDivision.division} leads with ${topDivision.count} commitments, representing ${Math.round((topDivision.count / divisionData.reduce((sum, div) => sum + div.count, 0)) * 100)}% of all commitments`,
      filters: {
        division: topDivision.division,
      },
      icon: "🏆",
    })
  }
}

async function generateRecognitionInsights(insights: Insight[]) {
  // Top college
  const { data: collegeData } = await supabase
    .from("colleges")
    .select("name, athlete_count")
    .order("athlete_count", { ascending: false })
    .limit(1)

  if (collegeData && collegeData.length > 0) {
    insights.push({
      category: "recognition",
      text: `${collegeData[0].name} leads all colleges with ${collegeData[0].athlete_count} NC United athlete commitments`,
      filters: {
        college: collegeData[0].name,
      },
      icon: "🎓",
    })
  }

  // Top high school
  const { data: highSchoolData } = await supabase
    .from("high_schools")
    .select("name, athlete_count")
    .order("athlete_count", { ascending: false })
    .limit(1)

  if (highSchoolData && highSchoolData.length > 0) {
    insights.push({
      category: "recognition",
      text: `${highSchoolData[0].name} leads all high schools with ${highSchoolData[0].athlete_count} NC United athletes`,
      filters: {
        highschool: highSchoolData[0].name,
      },
      icon: "🏫",
    })
  }

  // Top wrestling club
  const { data: clubData } = await supabase
    .from("wrestling_clubs")
    .select("name, athlete_count")
    .order("athlete_count", { ascending: false })
    .limit(1)

  if (clubData && clubData.length > 0) {
    insights.push({
      category: "recognition",
      text: `${clubData[0].name} leads all wrestling clubs with ${clubData[0].athlete_count} NC United athletes`,
      filters: {
        wrestlingclub: clubData[0].name,
      },
      icon: "🤼",
    })
  }
}

async function generateShoutoutInsights(insights: Insight[]) {
  // First female commit
  const { data: femaleData } = await supabase
    .from("athletes")
    .select("name, college, commitmentdate")
    .eq("gender", "female")
    .order("commitmentdate")
    .limit(1)

  if (femaleData && femaleData.length > 0) {
    insights.push({
      category: "shoutout",
      text: `Shoutout to ${femaleData[0].name} for being the first female NC United athlete to commit to ${femaleData[0].college}!`,
      filters: {
        gender: "female",
      },
      icon: "🎉",
    })
  }

  // Recent commit
  const { data: recentData } = await supabase
    .from("athletes")
    .select("name, college, commitmentdate")
    .order("commitmentdate", { ascending: false })
    .limit(1)

  if (recentData && recentData.length > 0) {
    insights.push({
      category: "shoutout",
      text: `Congratulations to ${recentData[0].name} on their recent commitment to ${recentData[0].college}!`,
      icon: "🎊",
    })
  }
}

// Run the script
generateInsights().catch(console.error)
