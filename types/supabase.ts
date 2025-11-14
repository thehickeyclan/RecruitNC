export interface LogoMapping {
  id: string
  entity_name: string
  entity_type: string
  logo_url: string
  created_at: string
  updated_at: string
}

export interface Database {
  public: {
    Tables: {
      logo_mappings: {
        Row: LogoMapping
        Insert: Omit<LogoMapping, "id" | "created_at" | "updated_at">
        Update: Partial<Omit<LogoMapping, "id" | "created_at" | "updated_at">>
      }
    }
  }
}
