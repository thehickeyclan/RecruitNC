"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Crown, Calendar, ArrowRight, Star, TrendingUp, ChevronDown, School, Archive, MapPin } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { regionsData } from "@/lib/regional-data"
import { NCHSAAYearResultsClient } from "./[year]/year-results-client"

export default function NCHSAAOverview() {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
  const [selectedYear, setSelectedYear] = useState<number | null>(null)

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const classificationData = {
    "8A": {
      schools: [
        "Apex — 2481",
        "Apex Friendship — 2768",
        "Ardrey Kell — 3125",
        "Athens Drive — 2514",
        "Broughton — 2504",
        "Chambers — 2686",
        "Corinth Holders — 2253",
        "East Mecklenburg — 2498",
        "Enloe — 3005",
        "Garinger — 2348",
        "Green Hope — 2589",
        "Green Level — 2292",
        "Hoggard — 2235",
        "Hoke County — 2536",
        "Hough — 2593",
        "Jordan — 2397",
        "Laney — 2525",
        "Leesville Road — 2443",
        "Mallard Creek — 2304",
        "Millbrook — 2538",
        "Myers Park — 3317",
        "Northwest Guilford — 2240",
        "Palisades — 2460",
        "Panther Creek — 2624",
        "Pinecrest — 2346",
        "Providence — 2248",
        "Rolesville — 2368",
        "South Mecklenburg — 2615",
        "Wakefield — 2467",
        "West Charlotte — 2332",
        "West Forsyth — 2205",
        "Willow Spring — 2248",
      ],
      description:
        "The largest schools in North Carolina with enrollment over 2,200 students. These schools represent the highest level of high school competition with extensive resources and deep talent pools.",
      color: "from-[#003366] to-[#001a38]",
      bgColor: "from-[#003366]/5 to-[#003366]/10",
      borderColor: "border-[#003366]/20",
    },
    "7A": {
      schools: [
        "A.L. Brown — 1726",
        "Ashley — 2045",
        "Ballantyne Ridge — 2133",
        "Butler — 1926",
        "Cape Fear — 1623",
        "Cardinal Gibbons — 1605",
        "Cary — 2084",
        "Chapel Hill — 1638",
        "Clayton — 1983",
        "Cleveland — 1941",
        "Cox Mill — 1772",
        "Cuthbertson — 1853",
        "D.H. Conley — 1744",
        "Davie County — 1949",
        "East Forsyth — 1695",
        "East Wake — 1840",
        "Fuquay-Varina — 1903",
        "Garner — 1735",
        "Grimsley — 2044",
        "Heritage — 1797",
        "Hickory Ridge — 1671",
        "Hillside — 1831",
        "Holly Springs — 2039",
        "Hopewell — 2098",
        "Independence — 2148",
        "Jack Britt — 2064",
        "Knightdale — 1775",
        "Lake Norman — 1981",
        "Lumberton — 1945",
        "Marvin Ridge — 1959",
        "McDowell — 1702",
        "Mooresville — 1953",
        "New Bern — 1678",
        "New Hanover — 1691",
        "North Brunswick — 1620",
        "North Mecklenburg — 2102",
        "Overhills — 2006",
        "Page — 1808",
        "Parkland — 1758",
        "Pine Forest — 1720",
        "Porter Ridge — 1802",
        "Purnell Swett — 1636",
        "R.J. Reynolds — 1819",
        "Reagan — 2167",
        "Richmond Senior — 2181",
        "Riverside — 2113",
        "Rocky River — 1848",
        "Sanderson — 1687",
        "Smithfield-Selma — 1617",
        "South Central — 1706",
        "South Garner — 1883",
        "South Iredell — 1841",
        "Southeast Raleigh — 1867",
        "Southern Durham — 1797",
        "Southwest Guilford — 1662",
        "Topsail — 2010",
        "Wake Forest — 2070",
        "Weddington — 1895",
        "West Cabarrus — 1626",
        "West Mecklenburg — 1914",
      ],
      description:
        "Large schools with enrollment between 1,600-2,199 students. These programs feature strong wrestling traditions and competitive depth.",
      color: "from-[#003366] to-[#001a38]",
      bgColor: "from-[#003366]/5 to-[#003366]/10",
      borderColor: "border-[#003366]/20",
    },
    "6A": {
      schools: [
        "A.C. Reynolds — 1271",
        "Alexander Central — 1407",
        "Ashbrook — 1386",
        "Asheboro — 1286",
        "Asheville — 1529",
        "Ben L. Smith — 1523",
        "Berry Academy — 1527",
        "Central Cabarrus — 1369",
        "Charlotte Catholic — 1369",
        "Dudley — 1468",
        "E.E. Smith — 1243",
        "East Chapel Hill — 1455",
        "Eastern Guilford — 1344",
        "Felton Grove — 1400",
        "Franklinton — 1212",
        "Freedom — 1337",
        "Glenn — 1488",
        "Gray's Creek — 1560",
        "Harding University — 1344",
        "Harnett Central — 1534",
        "J.H. Rose — 1538",
        "Jacksonville — 1428",
        "Kings Mountain — 1305",
        "Lee County — 1614",
        "Middle Creek — 1613",
        "Mount Tabor — 1491",
        "North Iredell — 1248",
        "Northern Durham — 1492",
        "Northern Guilford — 1328",
        "Northern Nash — 1225",
        "Olympic — 1613",
        "Piedmont — 1264",
        "Ragsdale — 1457",
        "Scotland — 1518",
        "Seventy-First — 1608",
        "South Caldwell — 1481",
        "South Johnston — 1335",
        "South View — 1616",
        "Southeast Guilford — 1270",
        "Southern Alamance — 1218",
        "Southern Lee — 1321",
        "St. Stephens — 1209",
        "Statesville — 1244",
        "Sun Valley — 1256",
        "Swansboro — 1228",
        "T.C. Roberson — 1550",
        "Terry Sanford — 1353",
        "Triton — 1280",
        "Union Pines — 1491",
        "Vance County — 1530",
        "Watauga — 1583",
        "West Brunswick — 1466",
        "West Johnston — 1614",
        "Western Guilford — 1381",
        "Western Harnett — 1338",
        "Westover — 1396",
        "White Oak — 1241",
        "Williams — 1255",
      ],
      description:
        "Mid-large schools with enrollment between 1,200-1,599 students. These schools balance competitive programs with community focus.",
      color: "from-[#B31B1B] to-[#8f1616]",
      bgColor: "from-[#B31B1B]/5 to-[#B31B1B]/10",
      borderColor: "border-[#B31B1B]/20",
    },
    "5A": {
      schools: [
        "Atkins — 1187",
        "C.B. Aycock — 1144",
        "Carson — 1052",
        "Cedar Ridge — 1141",
        "Concord — 1128",
        "Crest — 1098",
        "Croatan — 1018",
        "Currituck County — 1054",
        "Dixon — 1083",
        "Douglas Byrd — 1194",
        "Durham School of Arts — 1070",
        "East Lincoln — 1043",
        "East Rowan — 974",
        "Eastern Alamance — 990",
        "Enka — 1166",
        "Erwin — 1082",
        "Fike — 1019",
        "Forest Hills — 963",
        "Forestview — 1133",
        "Franklin — 1010",
        "Havelock — 1075",
        "Hickory — 1195",
        "High Point Central — 1193",
        "Hunt — 1102",
        "Hunter Huss — 1165",
        "J.F. Webb — 999",
        "Monroe — 1192",
        "Montgomery Central — 1117",
        "North Buncombe — 997",
        "North Davidson — 967",
        "North Forsyth — 1160",
        "North Gaston — 1061",
        "North Henderson — 1041",
        "North Lincoln — 1123",
        "Northeast Guilford — 1100",
        "Northside-Jacksonville — 1050",
        "Northwest Cabarrus — 1142",
        "Oak Grove — 1008",
        "Orange — 1153",
        "Parkwood — 1079",
        "Person — 1205",
        "Richlands — 1021",
        "Robinson — 1186",
        "Rockingham — 1010",
        "Rocky Mount — 1182",
        "Seaforth — 1123",
        "Smoky Mountain — 994",
        "South Brunswick — 1154",
        "South Granville — 1065",
        "South Point — 989",
        "Southeast Alamance — 1143",
        "Southern Guilford — 1002",
        "Southern Nash — 1165",
        "Southern Wayne — 1028",
        "St. Pauls — 1186",
        "West Carteret — 1078",
        "West Henderson — 1050",
        "West Rowan — 956",
        "Western Alamance — 1187",
      ],
      description:
        "Medium schools with enrollment between 950-1,199 students. These programs often feature strong community support and developing talent.",
      color: "from-[#CBAF5D] to-[#b89c4a]",
      bgColor: "from-[#CBAF5D]/5 to-[#CBAF5D]/10",
      borderColor: "border-[#CBAF5D]/20",
    },
    "4A": {
      schools: [
        "Anson County — 925",
        "Ashe County — 912",
        "Bandys — 909",
        "Brevard — 798",
        "Bunker Hill — 834",
        "Bunn — 848",
        "Burns — 925",
        "Carrboro — 896",
        "Carver — 867",
        "Central Academy — 875",
        "Central Davidson — 935",
        "Clinton — 809",
        "Cummings — 821",
        "East Burke — 893",
        "East Duplin — 854",
        "East Gaston — 917",
        "East Henderson — 929",
        "Eastern Wayne — 926",
        "Fairmont — 796",
        "First Flight — 902",
        "Forbush — 800",
        "Fred T. Foard — 903",
        "Graham — 839",
        "Hibriten — 947",
        "Jordan-Matthews — 901",
        "Lake Norman Charter — 808",
        "Ledford — 806",
        "Lexington — 876",
        "Lincoln Charter — 815",
        "Maiden — 838",
        "Morehead — 857",
        "Mount Pleasant — 894",
        "Nash Central — 886",
        "Newton-Conover — 808",
        "North Johnston — 823",
        "North Lenoir — 954",
        "North Pitt — 838",
        "North Surry — 811",
        "Pisgah — 852",
        "R-S Central — 843",
        "Randleman — 868",
        "Red Springs — 872",
        "Reidsville — 795",
        "Roanoke Rapids — 885",
        "Salisbury — 916",
        "South Rowan — 929",
        "SouthWest Edgecombe — 801",
        "Southwest Onslow — 797",
        "Southwestern Randolph — 800",
        "Stuart Cramer — 953",
        "T.W. Andrews — 843",
        "Tuscola — 851",
        "Uwharrie Charter — 875",
        "Washington — 805",
        "West Craven — 848",
        "West Iredell — 830",
        "West Stanly — 914",
        "West Stokes — 872",
        "Wilkes Central — 815",
      ],
      description:
        "Mid-size schools with enrollment between 795-954 students. These schools often have tight-knit wrestling communities with passionate support.",
      color: "from-[#003366] to-[#001a38]",
      bgColor: "from-[#003366]/5 to-[#003366]/10",
      borderColor: "border-[#003366]/20",
    },
    "3A": {
      schools: [
        "Ayden-Grifton — 748",
        "Bartlett Yancey — 624",
        "Beddingfield — 630",
        "Bessemer City — 590",
        "CHASE — 642",
        "Draughn — 686",
        "East Davidson — 735",
        "East Rutherford — 691",
        "East Surry — 588",
        "Eastern Randolph — 585",
        "Farmville Central — 767",
        "Goldsboro — 656",
        "Greene Central — 778",
        "Hendersonville — 789",
        "Hertford County — 732",
        "James Kenan — 745",
        "Kinston — 659",
        "Lincolnton — 793",
        "Louisburg — 671",
        "Madison — 603",
        "Martin County — 765",
        "McMichael — 770",
        "Midway — 725",
        "Mount Airy — 613",
        "Mountain Heritage — 628",
        "NC Science & Math: Durham — 675",
        "North Moore — 606",
        "North Stanly — 651",
        "North Wilkes — 617",
        "Northeastern — 652",
        "Northwood — 676",
        "Owen — 738",
        "Pasquotank County — 646",
        "Patton — 776",
        "Pender — 692",
        "Piedmont Community — 630",
        "Pine Lake Prep — 685",
        "Polk County — 660",
        "Princeton — 602",
        "Providence Grove — 587",
        "Shelby — 792",
        "South Columbus — 669",
        "South Lenoir — 722",
        "Spring Creek — 734",
        "Surry Central — 701",
        "Thomasville — 595",
        "Trask — 772",
        "Trinity — 673",
        "Union Academy — 633",
        "Wake Prep — 721",
        "Walkertown — 684",
        "Wallace-Rose Hill — 727",
        "West Bladen — 707",
        "West Caldwell — 763",
        "West Davidson — 781",
        "West Lincoln — 731",
        "West Wilkes — 677",
        "Wheatmore — 664",
        "Whiteville — 646",
      ],
      description:
        "Smaller schools with enrollment between 585-793 students. These programs emphasize individual development and community pride.",
      color: "from-[#B31B1B] to-[#8f1616]",
      bgColor: "from-[#B31B1B]/5 to-[#B31B1B]/10",
      borderColor: "border-[#B31B1B]/20",
    },
    "2A": {
      schools: [
        "ALA-Johnston — 505",
        "Albemarle — 528",
        "Alleghany — 394",
        "Avery County — 550",
        "Bertie — 550",
        "Bishop McGuinness — 477",
        "Bradford Prep — 517",
        "Camden County — 582",
        "Cherokee — 389",
        "Cherryville — 484",
        "Christ the King — 434",
        "Community School of Davidson — 558",
        "Cornerstone Charter — 417",
        "Corvian Community — 454",
        "East Bladen — 517",
        "East Carteret — 519",
        "East Wake Academy — 407",
        "East Wilkes — 504",
        "Elkin — 401",
        "Eno River Academy — 393",
        "Franklin Academy — 528",
        "Gates County — 436",
        "Gray Stone Day — 405",
        "Hayesville — 387",
        "Henderson Collegiate — 392",
        "Highland Tech — 538",
        "Hobbton — 473",
        "Holmes — 551",
        "Lakewood — 474",
        "Langtree Charter — 465",
        "Lejeune — 444",
        "Manteo — 552",
        "Mitchell — 480",
        "Mountain Island Charter — 559",
        "Murphy — 422",
        "North Duplin — 400",
        "North Rowan — 544",
        "Northampton County — 400",
        "Northwest Halifax — 386",
        "Pamlico — 424",
        "Perquimans — 558",
        "Piedmont Classical — 478",
        "Queen's Grant — 572",
        "Raleigh Charter — 551",
        "Research Triangle — 570",
        "Rosewood — 460",
        "Roxboro Community — 394",
        "South Stanly — 501",
        "South Stokes — 580",
        "Southside — 422",
        "Starmount — 557",
        "Sugar Creek Charter — 409",
        "Swain County — 535",
        "Tarboro — 520",
        "Triangle Math & Science — 468",
        "Union — 505",
        "Voyager Academy — 418",
        "Warren County — 500",
        "West Columbus — 460",
      ],
      description:
        "Small schools with enrollment between 386-582 students. These schools often have close-knit communities where wrestling is a family affair.",
      color: "from-[#CBAF5D] to-[#b89c4a]",
      bgColor: "from-[#CBAF5D]/5 to-[#CBAF5D]/10",
      borderColor: "border-[#CBAF5D]/20",
    },
    "1A": {
      schools: [
        "Andrews — 225",
        "Ascend Leadership — 346",
        "Bear Grass Charter — 245",
        "Bethany Community — 379",
        "Blue Ridge Early College — 74",
        "Bonnie Cone Leadership Academy — 263",
        "Cape Hatteras — 209",
        "Carolina International — 270",
        "Central Carolina Academy — 226",
        "Chatham Central — 335",
        "Chatham Charter — 194",
        "Clover Garden — 269",
        "Columbia — 176",
        "Discovery Charter Academy — 220",
        "East Columbus — 383",
        "Excelsior Classical Academy — 185",
        "Falls Lake Academy — 356",
        "Highlands — 90",
        "Hiwassee Dam — 137",
        "Hobgood Charter — 132",
        "Jackson Day — 203",
        "Jones — 336",
        "KIPP Pride — 344",
        "Mattamuskeet — 98",
        "Millennium Charter Academy — 126",
        "Nantahala — 31",
        "NC Science & Math: Morganton — 300",
        "Neuse Charter — 232",
        "North East Carolina Prep — 331",
        "North Edgecombe — 371",
        "North Stokes — 309",
        "Northside-Pinetown — 381",
        "Ocracoke — 54",
        "Oxford Prep — 263",
        "Phoenix Academy — 335",
        "River Mill Academy — 175",
        "Robbinsville — 334",
        "Rocky Mount Prep — 242",
        "Rosman — 254",
        "Sallie B Howard School — 280",
        "South Davidson — 368",
        "Southeast Halifax — 271",
        "Southern Wake Academy — 285",
        "Summit Charter — 82",
        "The College Prep & Leadership — 217",
        "The NC Leadership Academy — 348",
        "Thomas Jefferson Classical — 356",
        "Tri-County Early College — 151",
        "Triad Math & Science — 383",
        "Valor Prep — 191",
        "Vance Charter — 334",
        "Washington County — 319",
        "Weldon — 254",
        "Wilson Prep — 191",
        "Winston-Salem Prep — 177",
        "Woods Charter — 185",
      ],
      description:
        "The smallest schools with enrollment under 385 students. These schools represent the heart of rural North Carolina wrestling where every wrestler matters.",
      color: "from-[#003366] to-[#001a38]",
      bgColor: "from-[#003366]/5 to-[#003366]/10",
      borderColor: "border-[#003366]/20",
    },
  }

  // Helper function to get regions for a classification
  const getRegionsForClassification = (classification: string) => {
    if (classification === "1A" || classification === "2A") {
      return regionsData.filter((r) => r.region.startsWith("1A/2A"))
    }
    return regionsData.filter((r) => r.region.startsWith(classification))
  }

  if (selectedYear !== null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="container mx-auto px-4 py-8">
          <button
            type="button"
            onClick={() => setSelectedYear(null)}
            className="text-[#B91C1C] font-medium hover:underline mb-4"
          >
            ← Back to Overview
          </button>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#003366]">{selectedYear} NCHSAA Results</h1>
          <p className="text-slate-600 text-sm sm:text-base mb-6">North Carolina State Wrestling Championships</p>
          <NCHSAAYearResultsClient displayYear={selectedYear} yearParam={String(selectedYear)} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        {/* Browse Archive CTA front and center at top */}
        <div className="mb-6 md:mb-8">
          <Card className="border-2 border-[#003366] bg-gradient-to-r from-[#003366] to-[#001a38]">
            <CardContent className="p-4 sm:p-6 md:p-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
                <div className="flex flex-col md:flex-row items-center gap-3 md:gap-6 w-full md:w-auto">
                  <Image
                    src="/images/nchsaa-logo.png"
                    alt="NCHSAA Logo"
                    width={80}
                    height={80}
                    className="object-contain w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 flex-shrink-0"
                  />
                  <div className="text-center md:text-left flex-1 min-w-0 w-full md:w-auto">
                    <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-1 md:mb-2 leading-tight">
                      NCHSAA State Championships
                    </h1>
                    <p className="text-white/80 text-sm sm:text-base md:text-lg">
                      North Carolina's Premier High School Wrestling Tournament
                    </p>
                  </div>
                </div>
                <a href="/nchsaa/archive" className="w-full md:w-auto mt-2 md:mt-0 block">
                  <Button
                    size="lg"
                    className="bg-[#CBAF5D] hover:bg-[#b89c4a] text-[#003366] font-bold text-sm sm:text-base md:text-lg px-4 md:px-8 py-2 md:py-3 lg:py-6 shadow-lg w-full md:w-auto"
                  >
                    <Archive className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                    Browse Archive
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          <button
            type="button"
            onClick={() => setSelectedYear(2026)}
            className="w-full h-full text-left cursor-pointer border-0 p-0 bg-transparent"
          >
            <Card className="border-2 border-[#003366] hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader className="bg-[#003366] text-white p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Calendar className="w-4 h-4 md:w-5 md:h-5" />
                  2026 NCHSAA Results
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                <p className="text-[#003366] text-sm md:text-base">
                  View 2026 State Championship results, MOW by division, and the new 7-class format.
                </p>
                <div className="flex items-center text-[#003366] font-semibold mt-3 md:mt-4 text-sm md:text-base">
                  View Results <ArrowRight className="w-4 h-4 ml-2" />
                </div>
              </CardContent>
            </Card>
          </button>
          <button
            type="button"
            onClick={() => setSelectedYear(2025)}
            className="w-full h-full text-left cursor-pointer border-0 p-0 bg-transparent"
          >
            <Card className="border-2 border-[#B31B1B] hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader className="bg-[#B31B1B] text-white p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Calendar className="w-4 h-4 md:w-5 md:h-5" />
                  2025 NCHSAA Results
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                <p className="text-[#003366] text-sm md:text-base">
                  View 2025 NCHSAA State Championship results across all classifications.
                </p>
                <div className="flex items-center text-[#B31B1B] font-semibold mt-3 md:mt-4 text-sm md:text-base">
                  View Results <ArrowRight className="w-4 h-4 ml-2" />
                </div>
              </CardContent>
            </Card>
          </button>
          <form action="/nchsaa/archive" method="get" className="block h-full">
            <button type="submit" className="w-full h-full text-left cursor-pointer border-0 p-0 bg-transparent">
              <Card className="border-2 border-[#003366] hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader className="bg-[#003366] text-white p-4 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <Archive className="w-4 h-4 md:w-5 md:h-5" />
                    Historical Archive
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 md:p-6">
                  <p className="text-[#003366] text-sm md:text-base">
                    Search and explore historical NCHSAA State Championship results by year, school, or wrestler.
                  </p>
                  <div className="flex items-center text-[#003366] font-semibold mt-3 md:mt-4 text-sm md:text-base">
                    Browse Archive <ArrowRight className="w-4 h-4 ml-2" />
                  </div>
                </CardContent>
              </Card>
            </button>
          </form>
        </div>

        {/* Tournament Overview */}
        <div className="grid lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          <Card className="lg:col-span-2 border-2 border-[#003366]">
            <CardHeader className="bg-[#003366] text-white p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <Crown className="w-5 h-5 md:w-6 md:h-6" />
                About NCHSAA State Championships
              </CardTitle>
              <CardDescription className="text-white/80 text-sm md:text-base">
                The ultimate high school wrestling competition in North Carolina
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <div className="space-y-3 md:space-y-4">
                <p className="text-[#003366] leading-relaxed text-sm md:text-base">
                  The North Carolina High School Athletic Association (NCHSAA) State Wrestling Championships represents
                  the pinnacle of high school wrestling competition in North Carolina. Each year, the state's top
                  wrestlers compete across multiple classifications for the coveted title of State Champion.
                </p>
                <p className="text-[#003366] leading-relaxed text-sm md:text-base">
                  Only the best wrestlers from each region advance to the state tournament, making every match a battle
                  between elite competitors. NC United has proudly coached numerous state champions and place winners
                  throughout our history.
                </p>
                <div className="grid md:grid-cols-2 gap-3 md:gap-4 mt-4 md:mt-6">
                  <div className="bg-[#CBAF5D]/10 p-3 md:p-4 rounded-lg border border-[#CBAF5D]/30">
                    <h4 className="font-semibold text-[#003366] mb-2 text-sm md:text-base">Tournament Format</h4>
                    <ul className="text-xs md:text-sm space-y-1 text-[#003366]/80">
                      <li>• Multiple Classifications (1A-8A)</li>
                      <li>• 14 Weight Classes per classification</li>
                      <li>• Top 4 finishers earn medals</li>
                      <li>• Double elimination format</li>
                    </ul>
                  </div>
                  <div className="bg-[#003366]/5 p-3 md:p-4 rounded-lg border border-[#003366]/20">
                    <h4 className="font-semibold text-[#003366] mb-2 text-sm md:text-base">Qualification</h4>
                    <ul className="text-xs md:text-sm space-y-1 text-[#003366]/80">
                      <li>• Regional tournament qualifiers</li>
                      <li>• Top 4 from each regional</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-2 border-yellow-400">
              <CardHeader className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Tournament Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Classifications</span>
                    <Badge className="bg-[#003366]">7 (1A/2A combine at states)</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Weight Classes</span>
                    <Badge className="bg-[#003366]">14 per class</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Medal Winners</span>
                    <Badge className="bg-yellow-500 text-white">Top 4 per weight</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Archive Years</span>
                    <Badge className="bg-blue-600 text-white">Historic</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-[#2563eb]">
              <CardHeader className="bg-gradient-to-r from-[#2563eb] to-blue-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  NC United Legacy
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3 text-sm">
                  <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                    <div className="font-semibold text-[#003366]">🏆 State Champions</div>
                    <div className="text-slate-600">Multiple NCHSAA State Champions</div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded border border-blue-200">
                    <div className="font-semibold text-[#003366]">🥈 Place Winners</div>
                    <div className="text-slate-600">Numerous top-6 finishers</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded border border-slate-200">
                    <div className="font-semibold text-[#003366]">📈 Consistency</div>
                    <div className="text-slate-600">Decades of state tournament success</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="mb-6 md:mb-8">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-[#003366] flex items-center gap-2 text-lg md:text-xl">
              <School className="w-5 h-5 md:w-6 md:h-6" />
              New 8A Classification System
            </CardTitle>
            <CardDescription className="text-sm md:text-base">
              North Carolina's expanded classification system now includes 8 divisions (1A-8A) based on school
              enrollment
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="mb-4 md:mb-6 p-3 md:p-4 bg-gradient-to-r from-[#003366]/5 to-[#003366]/10 rounded-lg border border-[#003366]/20">
              <h3 className="font-semibold text-[#003366] mb-2 text-sm md:text-base">About the 8A System</h3>
              <p className="text-[#003366] text-xs md:text-sm leading-relaxed">
                The NCHSAA has expanded from the traditional 4-classification system to an 8-classification system,
                providing more balanced competition by creating smaller enrollment ranges within each division. This
                ensures schools compete against others of similar size and resources.
              </p>
            </div>

            <div className="space-y-3 md:space-y-4">
              {Object.entries(classificationData).map(([classification, data]) => (
                <Collapsible
                  key={classification}
                  open={openSections[classification]}
                  onOpenChange={() => toggleSection(classification)}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-between p-3 md:p-4 h-auto bg-gradient-to-r ${data.bgColor} border-2 ${data.borderColor} hover:shadow-md transition-all`}
                    >
                      <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                        <Badge className={`bg-gradient-to-r ${data.color} text-white px-2 md:px-3 py-1 text-xs md:text-sm font-bold flex-shrink-0`}>
                          {classification}
                        </Badge>
                        <div className="text-left min-w-0 flex-1">
                          <div className="font-semibold text-slate-800 text-sm md:text-base truncate">{classification} Classification</div>
                          <div className="text-xs md:text-sm text-slate-600">{data.schools.length} Schools</div>
                        </div>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 md:w-5 md:h-5 transition-transform flex-shrink-0 ${openSections[classification] ? "rotate-180" : ""}`}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <Card className={`border-2 ${data.borderColor}`}>
                      <CardContent className="p-3 md:p-4">
                        <p className="text-[#003366] text-xs md:text-sm mb-3 md:mb-4 leading-relaxed">{data.description}</p>

                        {/* Regional Breakdown */}
                        {(() => {
                          const regions = getRegionsForClassification(classification)
                          if (regions.length > 0) {
                            return (
                              <div className="mb-4 md:mb-6 space-y-3 md:space-y-4">
                                <h4 className="font-semibold text-[#003366] text-xs md:text-sm mb-2 md:mb-3 flex items-center gap-2">
                                  <MapPin className="w-3 h-3 md:w-4 md:h-4" />
                                  Regional Breakdown
                                </h4>
                                {regions.map((regionData) => {
                                  const isEast = regionData.region.includes("East")
                                  const regionKey = `${classification}-${regionData.region.replace(/\s+/g, "-").toLowerCase()}`
                                  return (
                                    <Collapsible
                                      key={regionData.region}
                                      open={openSections[regionKey]}
                                      onOpenChange={() => toggleSection(regionKey)}
                                    >
                                      <CollapsibleTrigger asChild>
                                        <Button
                                          variant="outline"
                                          className={`w-full justify-between p-2 md:p-3 h-auto bg-gradient-to-r ${
                                            isEast ? "from-[#B31B1B]/5 to-[#B31B1B]/10" : "from-[#003366]/5 to-[#003366]/10"
                                          } border-2 ${
                                            isEast ? "border-[#B31B1B]/20" : "border-[#003366]/20"
                                          } hover:shadow-md transition-all`}
                                        >
                                          <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                                            <Badge
                                              className={`bg-gradient-to-r ${
                                                isEast ? "from-[#B31B1B] to-[#8f1616]" : "from-[#003366] to-[#001a38]"
                                              } text-white px-1.5 md:px-2 py-0.5 md:py-1 text-xs font-bold flex-shrink-0`}
                                            >
                                              {isEast ? "East" : "West"}
                                            </Badge>
                                            <div className="text-left min-w-0 flex-1">
                                              <div className="font-semibold text-slate-800 text-xs md:text-sm truncate">{regionData.region}</div>
                                              <div className="text-xs text-slate-600">{regionData.schools.length} Schools</div>
                                            </div>
                                          </div>
                                          <ChevronDown
                                            className={`w-3 h-3 md:w-4 md:h-4 transition-transform flex-shrink-0 ${openSections[regionKey] ? "rotate-180" : ""}`}
                                          />
                                        </Button>
                                      </CollapsibleTrigger>
                                      <CollapsibleContent className="mt-2">
                                        <Card className={`border-2 ${isEast ? "border-[#B31B1B]/20" : "border-[#003366]/20"}`}>
                                          <CardContent className="p-2 md:p-3">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 md:gap-2">
                                              {regionData.schools.map((school, index) => (
                                                <div
                                                  key={index}
                                                  className="p-1.5 md:p-2 bg-white rounded border border-slate-200 hover:bg-slate-50 transition-colors"
                                                >
                                                  <span className="font-medium text-slate-800 text-xs leading-tight block">{school}</span>
                                                </div>
                                              ))}
                                            </div>
                                          </CardContent>
                                        </Card>
                                      </CollapsibleContent>
                                    </Collapsible>
                                  )
                                })}
                              </div>
                            )
                          }
                          return null
                        })()}
                      </CardContent>
                    </Card>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* State Tournament Qualification */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-[#003366] flex items-center gap-2">
              <TrendingUp className="w-6 h-6" />
              State Tournament Qualification
            </CardTitle>
            <CardDescription>
              How wrestlers qualify for the NCHSAA State Tournament under the new 8-class system (effective 2025-26)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 bg-gradient-to-r from-[#B31B1B]/5 to-[#CBAF5D]/5 rounded-lg border border-[#B31B1B]/20">
              <h3 className="font-semibold text-[#003366] mb-2">Key Changes for 2025-26</h3>
              <p className="text-[#003366] text-sm leading-relaxed">
                Qualification has been reduced from 16 to 8 wrestlers per classification. There will be two regional
                championships for each classification (East and West), with the top four wrestlers from each regional
                advancing to the State Championship.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <Card className="border-2 border-[#003366]/20">
                <CardHeader className="bg-[#003366]/5">
                  <CardTitle className="text-[#003366] text-lg">Regional Structure</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-[#003366] text-white">East Regional</Badge>
                      <span className="text-[#003366]/70 text-sm">Top 4 advance</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-[#003366] text-white">West Regional</Badge>
                      <span className="text-[#003366]/70 text-sm">Top 4 advance</span>
                    </div>
                    <div className="mt-4 p-3 bg-[#CBAF5D]/10 rounded border border-[#CBAF5D]/30">
                      <div className="font-semibold text-[#003366] text-sm">Total State Qualifiers</div>
                      <div className="text-[#003366]/70 text-sm">8 wrestlers per weight class</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-[#CBAF5D]/20">
                <CardHeader className="bg-[#CBAF5D]/10">
                  <CardTitle className="text-[#003366] text-lg">Championship Format</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-[#003366] mb-2">Boys Wrestling</h4>
                      <ul className="text-sm space-y-1 text-[#003366]/80">
                        <li>• 1A & 2A: Combined championship</li>
                        <li>• 3A-8A: Individual championships</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-[#003366] mb-2">Girls Wrestling</h4>
                      <ul className="text-sm space-y-1 text-[#003366]/80">
                        <li>• 1A-4A: Combined championship</li>
                        <li>• 5A-8A: Individual championships</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-2 border-[#003366]/20">
              <CardHeader>
                <CardTitle className="text-[#003366] text-lg">Qualification Summary Table</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left p-2 font-semibold text-[#003366]">Classification</th>
                        <th className="text-left p-2 font-semibold text-[#003366]"># Regionals</th>
                        <th className="text-left p-2 font-semibold text-[#003366]">Advancers per Regional</th>
                        <th className="text-left p-2 font-semibold text-[#003366]">Total State Qualifiers</th>
                        <th className="text-left p-2 font-semibold text-[#003366]">Boys Format</th>
                        <th className="text-left p-2 font-semibold text-[#003366]">Girls Format</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-100">
                        <td className="p-2">1A, 2A</td>
                        <td className="p-2">2</td>
                        <td className="p-2">4 per regional</td>
                        <td className="p-2">8 per class</td>
                        <td className="p-2">
                          <Badge variant="outline" className="text-xs">
                            Combined
                          </Badge>
                        </td>
                        <td className="p-2">
                          <Badge variant="outline" className="text-xs">
                            Combined
                          </Badge>
                        </td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="p-2">3A-8A (each)</td>
                        <td className="p-2">2</td>
                        <td className="p-2">4 per regional</td>
                        <td className="p-2">8 per class</td>
                        <td className="p-2">
                          <Badge variant="outline" className="text-xs">
                            Separate
                          </Badge>
                        </td>
                        <td className="p-2">
                          <Badge variant="outline" className="text-xs">
                            Separate (5A-8A)
                          </Badge>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2">1A-4A (Girls only)</td>
                        <td className="p-2">N/A</td>
                        <td className="p-2">N/A</td>
                        <td className="p-2">N/A</td>
                        <td className="p-2">N/A</td>
                        <td className="p-2">
                          <Badge variant="outline" className="text-xs">
                            Combined
                          </Badge>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 p-3 bg-[#003366]/5 rounded border border-[#003366]/20">
                  <p className="text-[#003366] text-sm">
                    <strong>Bottom Line:</strong> Wrestlers must place in the top four at their regional (East or West)
                    to qualify for the state tournament. Every classification now gets just eight spots total.
                  </p>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        {/* Most Outstanding Wrestlers */}
        <Card className="mb-8 border-2 border-orange-400">
          <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardTitle className="flex items-center gap-2">
              <Star className="w-6 h-6" />
              Most Outstanding Wrestlers
            </CardTitle>
            <CardDescription className="text-orange-100">
              Honoring the most exceptional performers at each NCHSAA State Championship
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-[#CBAF5D]/10 to-[#CBAF5D]/10 p-4 rounded-lg border border-[#CBAF5D]/30">
                <h3 className="font-semibold text-[#003366] mb-2">About the Award</h3>
                <p className="text-[#003366] text-sm leading-relaxed">
                  The Most Outstanding Wrestler award is presented annually to the wrestler who demonstrates exceptional
                  skill, sportsmanship, and performance at the NCHSAA State Championships. This prestigious honor has
                  been awarded since 1958, recognizing the finest high school wrestlers in North Carolina history.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-[#003366] flex items-center gap-2">
                    <Crown className="w-5 h-5" />
                    Award Criteria
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-start gap-3 p-3 bg-white rounded border border-orange-200">
                      <Star className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-slate-800 text-sm">Exceptional Performance</div>
                        <div className="text-slate-600 text-xs">Dominant wrestling throughout the tournament</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-white rounded border border-orange-200">
                      <Star className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-slate-800 text-sm">Technical Excellence</div>
                        <div className="text-slate-600 text-xs">Superior wrestling technique and skill</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-white rounded border border-orange-200">
                      <Star className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-slate-800 text-sm">Sportsmanship</div>
                        <div className="text-slate-600 text-xs">Exemplary conduct and character</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-[#003366] flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Historical Context
                  </h4>
                  <div className="space-y-3">
                    <div className="bg-[#CBAF5D]/10 p-3 rounded border border-[#CBAF5D]/30">
                      <div className="font-semibold text-[#003366] text-sm">Award History</div>
                      <div className="text-[#003366]/70 text-xs">Presented annually since 1958</div>
                    </div>
                    <div className="bg-[#003366]/5 p-3 rounded border border-[#003366]/20">
                      <div className="font-semibold text-[#003366] text-sm">Era Changes</div>
                      <div className="text-[#003366]/70 text-xs">
                        Open era (1958-1986) → Divisional era (1987-present)
                      </div>
                    </div>
                    <div className="bg-slate-100 p-3 rounded border border-slate-200">
                      <div className="font-semibold text-[#003366] text-sm">Legacy</div>
                      <div className="text-slate-600 text-xs">65+ years of wrestling excellence</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-[#003366]/5 to-[#001a38]/5 p-4 rounded-lg border border-[#003366]/20">
                <h4 className="font-semibold text-[#003366] mb-2">Find Award Winners</h4>
                <p className="text-[#003366] text-sm mb-3">
                  Search our athlete database to find Most Outstanding Wrestler award winners. These exceptional
                  athletes are marked with special badges in their profiles, highlighting their historic achievements.
                </p>
                <Link href="/athletes">
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white text-sm">
                    <Star className="w-4 h-4 mr-2" />
                    Search Award Winners
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
