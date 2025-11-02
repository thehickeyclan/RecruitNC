# Professional Athlete Contract (Single Source of Truth)

Use this object shape everywhere a card is rendered. All APIs and pages must map to this contract before rendering.

Required fields
- id: string
- name: string
- graduationyear: number
- weightclass: string | number
- highschool: string
- college: string
- division: string
- photourl: string | null
- commitmentdate: string | null

Optional fields (allowed but must not break rendering)
- achievements?: string[]
- location?: string
- ncUnitedTeam?: string
- instagram?: string
- gender?: string

Notes
- This matches the normalization in components/athletes-grid.tsx (which feeds ProfessionalCommitmentCard).
- If an API returns different keys (graduation_year, weight_class, image_url, etc.), map them BEFORE rendering.

Do not render from any other object shape.
