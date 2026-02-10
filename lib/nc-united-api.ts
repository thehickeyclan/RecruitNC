// Helper functions for fetching NC United National Team data from API routes

export interface Tournament {
  id: string
  name: string
  year: number
  location: string | null
  start_date: string | null
  end_date: string | null
  team_record: string | null
  overall_placement: string | null
  total_team_points: number | null
  individual_wins: number | null
  individual_losses: number | null
  win_percentage: number | null
  highlights: string[] | null
  created_at: string
  updated_at: string
}

export interface Wrestler {
  id: string
  first_name: string
  last_name: string
  weight: number | null
  high_school: string | null
  created_at: string
  updated_at: string
}

export interface Match {
  id: string
  tournament_result_id: string
  match_number: number
  opponent_name: string | null
  opponent_team: string | null
  result: string
  points: number
  match_type: string
  created_at: string
}

export interface TournamentResult {
  id: string
  tournament_id: string
  wrestler_id: string
  weight: number
  record: string
  wins: number
  losses: number
  total_points: number | null
  category: string | null
  notes: string | null
  image_path: string | null
  created_at: string
  updated_at: string
  wrestler: Wrestler
  matches?: Match[]
}

export interface DualResult {
  id: string
  tournament_id: string
  match_number: number | null
  opponent_team: string
  our_score: number | null
  opponent_score: number | null
  result: string
  notes: string | null
  created_at: string
}

export interface GalleryImage {
  id: string
  tournament_id: string | null
  wrestler_id: string | null
  image_path: string
  image_type: string | null
  alt_text: string | null
  caption: string | null
  display_order: number
  created_at: string
  updated_at: string
}

// Fetch all tournaments
export async function getTournaments(filters?: { year?: number; name?: string }): Promise<Tournament[]> {
  const params = new URLSearchParams()
  if (filters?.year) params.set("year", filters.year.toString())
  if (filters?.name) params.set("name", filters.name)

  const url = `/api/nc-united/tournaments${params.toString() ? `?${params.toString()}` : ""}`
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) throw new Error(`Failed to fetch tournaments: ${res.statusText}`)

  const data = await res.json()
  if (!data.ok) throw new Error(data.error || "Failed to fetch tournaments")
  return data.tournaments || []
}

// Fetch a single tournament by name and year
export async function getTournamentByNameAndYear(name: string, year: number): Promise<Tournament | null> {
  const tournaments = await getTournaments({ name, year })
  return tournaments.find((t) => t.name === name && t.year === year) || null
}

// Fetch tournament results with matches
export async function getTournamentResults(tournamentId: string): Promise<TournamentResult[]> {
  const res = await fetch(`/api/nc-united/tournaments/${tournamentId}/results`, { cache: "no-store" })
  if (!res.ok) throw new Error(`Failed to fetch tournament results: ${res.statusText}`)

  const data = await res.json()
  if (!data.ok) throw new Error(data.error || "Failed to fetch tournament results")
  return data.results || []
}

// Fetch dual results for a tournament
export async function getDualResults(tournamentId: string): Promise<DualResult[]> {
  const res = await fetch(`/api/nc-united/tournaments/${tournamentId}/duals`, { cache: "no-store" })
  if (!res.ok) throw new Error(`Failed to fetch dual results: ${res.statusText}`)

  const data = await res.json()
  if (!data.ok) throw new Error(data.error || "Failed to fetch dual results")
  return data.duals || []
}

// Fetch wrestlers
export async function getWrestlers(filters?: { tournament_id?: string; name?: string }): Promise<Wrestler[]> {
  const params = new URLSearchParams()
  if (filters?.tournament_id) params.set("tournament_id", filters.tournament_id)
  if (filters?.name) params.set("name", filters.name)

  const url = `/api/nc-united/wrestlers${params.toString() ? `?${params.toString()}` : ""}`
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) throw new Error(`Failed to fetch wrestlers: ${res.statusText}`)

  const data = await res.json()
  if (!data.ok) throw new Error(data.error || "Failed to fetch wrestlers")
  return data.wrestlers || []
}

// Fetch gallery images for a tournament
export async function getGalleryImages(tournamentId: string): Promise<GalleryImage[]> {
  const res = await fetch(`/api/nc-united/tournaments/${tournamentId}/gallery`, { cache: "no-store" })
  if (!res.ok) throw new Error(`Failed to fetch gallery images: ${res.statusText}`)

  const data = await res.json()
  return data || []
}

// Helper to get full tournament data (tournament + results + duals)
export async function getFullTournamentData(name: string, year: number) {
  const tournament = await getTournamentByNameAndYear(name, year)
  if (!tournament) {
    throw new Error(`Tournament "${name}" ${year} not found`)
  }

  const [results, duals] = await Promise.all([
    getTournamentResults(tournament.id),
    getDualResults(tournament.id),
  ])

  return {
    tournament,
    results,
    duals,
  }
}
