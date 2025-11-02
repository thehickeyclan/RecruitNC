// This file defines the database schema for reference

export interface LogoMapping {
  id: string
  entity_name: string
  entity_type: "college" | "highschool" | "club"
  logo_url: string
  created_at: string
  updated_at: string
}

// Supabase tables:
// - logo_mappings
//   - id: uuid (primary key)
//   - entity_name: text (not null)
//   - entity_type: text (not null) - 'college', 'highschool', or 'club'
//   - logo_url: text (not null)
//   - created_at: timestamp with time zone (default: now())
//   - updated_at: timestamp with time zone (default: now())
