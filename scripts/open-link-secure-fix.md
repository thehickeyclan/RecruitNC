# Open link: secure fix (do not expose children)

**Current risk:** `/national-team/nhsca-duals-2026` → hub with `?open=1` shows the **full paid roster** (names, emails, schools, etc.) to anyone with the link. That must not stay.

**After** the link is out to parents and gear updates have been collected, we need to fix this. Options:

1. **Remove the open link entirely**  
   - Rely only on logged-in hub (parent signs in with registration email).  
   - No public roster; no unauthenticated gear updates.

2. **Tokenized / scoped open link**  
   - Open URL includes a one-time or short-lived token per registration (e.g. `/national-team/nhsca-duals-2026?token=...`).  
   - API returns only that parent’s registrations; no full roster.  
   - Gear update allowed only for that registration.  
   - Token sent by email when they register or via “magic link” from a secure flow.

3. **Email-gated view**  
   - Open page: single field “Enter the email we have on file.”  
   - Backend checks against `parent_email` (or contact email) on paid regs.  
   - If match: show only that parent’s athletes and let them update gear (no roster of other kids).  
   - No login, but no exposure of other children.

4. **Hybrid**  
   - Keep a minimal open page that does **not** show any roster.  
   - “Update your gear sizes” → collect email → send magic link that shows only their registrations (like 2).

**Requirement:** Under no circumstance should the open link expose a full roster of minors (names, emails, schools) to unauthenticated users. Document and implement the chosen approach; remove or restrict the current open hub before long-term use.
