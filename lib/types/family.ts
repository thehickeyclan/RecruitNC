// Family-related types for the fundraising system

export interface Family {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export interface FamilyMember {
  id: string
  family_id: string
  user_id: string
  role: 'parent' | 'guardian' | 'other'
  is_primary: boolean
  created_at: string
}

export interface FamilyAthlete {
  id: string
  family_id: string
  athlete_id: string
  relationship: 'child' | 'sibling' | 'other'
  created_at: string
}

export interface FamilyWallet {
  id: string
  family_id: string
  total_raised_cents: number
  total_spent_cents: number
  available_cents: number
  last_transaction_at: string | null
  created_at: string
  updated_at: string
}

export interface AthleteBreakdown {
  athlete_id: string
  athlete_name: string
  raised_cents: number
  spent_cents: number
}

export interface FamilyWalletDetails {
  family_id: string
  family_name: string
  total_raised_cents: number
  total_spent_cents: number
  available_cents: number
  last_transaction_at: string | null
  athlete_breakdown: AthleteBreakdown[] | null
}

export interface UnifiedFundraisingLookup {
  id: string
  athlete_id: string
  first_name: string
  last_name: string
  page_slug: string
  spartan_code: string | null
  donation_code: string
  total_raised_cents: number
  campaign_goal_cents: number | null
  is_active: boolean
  family_id: string | null
  family_name: string | null
}

// Helper to format cents as dollars
export function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

// Helper to calculate contribution percentage
export function getContributionPercent(raised: number, total: number): number {
  if (total === 0) return 0
  return Math.round((raised / total) * 100)
}
