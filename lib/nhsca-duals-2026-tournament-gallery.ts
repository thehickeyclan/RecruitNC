import type { CommandCenterScope } from "@/lib/nhsca-duals-command-center"

const GALLERY_BASE = "/national-team/nhsca-duals-2026/tournament-gallery"

export type NhscaDualsTournamentGalleryPhoto = {
  id: string
  wrestler: string
  weightClass: string
  team: "national" | "select"
  src: string
}

/** In-action tournament photos (separate from designed athlete card art). */
export const NHSCA_DUALS_2026_TOURNAMENT_GALLERY: NhscaDualsTournamentGalleryPhoto[] = [
  { id: "xan-moody", wrestler: "Xan Moody", weightClass: "106", team: "national", src: `${GALLERY_BASE}/xan-moody-106.png` },
  { id: "kris-kerr", wrestler: "Kristopher Kerr Jr.", weightClass: "106", team: "select", src: `${GALLERY_BASE}/kristopher-kerr-106.png` },
  { id: "jekai-sedgwick", wrestler: "Jekai Sedgwick", weightClass: "120", team: "national", src: `${GALLERY_BASE}/jekai-sedgwick-120.png` },
  { id: "danny-mcdermott", wrestler: "Danny McDermott", weightClass: "120", team: "select", src: `${GALLERY_BASE}/danny-mcdermott-120.png` },
  { id: "ayden-sumners", wrestler: "Ayden Sumners", weightClass: "126", team: "national", src: `${GALLERY_BASE}/ayden-sumners-126.png` },
  { id: "shane-shuster", wrestler: "Shane Shuster", weightClass: "132", team: "select", src: `${GALLERY_BASE}/shane-shuster-132.png` },
  { id: "cole-shuster", wrestler: "Cole Shuster", weightClass: "138", team: "select", src: `${GALLERY_BASE}/cole-shuster-138.png` },
  { id: "sammy-gantt", wrestler: "Sammy Gantt", weightClass: "145", team: "national", src: `${GALLERY_BASE}/sammy-gantt-145.png` },
  { id: "aidan-gore", wrestler: "Aidan Gore", weightClass: "152", team: "national", src: `${GALLERY_BASE}/aidan-gore-152.png` },
  { id: "jack-kancler", wrestler: "Jack Kancler", weightClass: "144", team: "select", src: `${GALLERY_BASE}/jack-kancler-144.png` },
  { id: "jon-burns", wrestler: "Jon Burns", weightClass: "160", team: "select", src: `${GALLERY_BASE}/jon-burns-160.png` },
  { id: "dom-blue", wrestler: "Dom Blue", weightClass: "170", team: "national", src: `${GALLERY_BASE}/dom-blue-170.png` },
  { id: "brieon-mayfield", wrestler: "Brieon Mayfield", weightClass: "182", team: "national", src: `${GALLERY_BASE}/brieon-mayfield-182.png` },
  { id: "luke-padgett", wrestler: "Luke Padgett", weightClass: "195", team: "national", src: `${GALLERY_BASE}/luke-padgett-195.png` },
  { id: "gavin-lopez", wrestler: "Gavin Lopez", weightClass: "220", team: "national", src: `${GALLERY_BASE}/gavin-lopez-220.png` },
  { id: "cory-thomas", wrestler: "Cory Thomas", weightClass: "220", team: "select", src: `${GALLERY_BASE}/cory-thomas-220.png` },
  { id: "keyshon-morrison", wrestler: "Keyshon Morrison", weightClass: "HWT", team: "national", src: `${GALLERY_BASE}/keyshon-morrison-hwt.png` },
  { id: "mason-hocker", wrestler: "Mason Hocker", weightClass: "HWT", team: "select", src: `${GALLERY_BASE}/mason-hocker-hwt.png` },
]

export function galleryPhotosForScope(scope: CommandCenterScope): NhscaDualsTournamentGalleryPhoto[] {
  if (scope === "all") return NHSCA_DUALS_2026_TOURNAMENT_GALLERY
  return NHSCA_DUALS_2026_TOURNAMENT_GALLERY.filter((p) => p.team === scope)
}
