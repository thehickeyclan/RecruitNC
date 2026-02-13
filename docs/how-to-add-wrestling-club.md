# How to add a new wrestling club

New clubs appear in:

- **Unified profile** – club name and logo (if set) on athlete pages
- **Admin athlete** – wrestling club dropdown when adding/editing an athlete (and on submit-profile / create-profile flows that use the same list)

## Steps

1. **Open the Enhanced Logo Manager**  
   Go to **Admin → Enhanced Logo Manager** (`/admin/enhanced-logo-manager`).

2. **Add a new mapping**  
   In the “Add new mapping” section:
   - **Entity Name:** exact name of the club (e.g. `My New Club`). This is what will show in the dropdown and on profiles.
   - **Entity Type:** leave or set to **Wrestling Club**.
   - **Logo URL:** optional. You can:
     - Leave empty to use the default club placeholder, or
     - Enter a URL, or
     - Use “Upload Logo” to upload an image (the URL will be filled for you).
   - **Aliases (optional):** comma-separated alternate names (e.g. `MNC, My New Club WC`) so athletes who type a variant still match this club and get the logo.

3. **Create the mapping**  
   Click **Create Mapping**. The new club is stored in `logo_mappings` with `entity_type = 'club'`.

4. **Where it shows up**
   - The **admin athlete form** (and any form that uses the club dropdown) loads clubs from `GET /api/logo-mappings/by-entity/club` and merges them with a built-in list, so the new club appears in the dropdown after creation.
   - **Unified profile** uses the athlete’s `wrestling_club` / `wrestlingClub` value; if it matches `entity_name` or an alias in `logo_mappings`, the club logo is shown.

## Technical note

- Clubs are stored in the **logo_mappings** table (`entity_type = 'club'`). There is no separate “clubs” table.
- The athlete form dropdown is built from: hardcoded list in `components/athlete-form.tsx` (`WRESTLING_CLUBS`) **plus** all `entity_name` values from `logo_mappings` where `entity_type = 'club'` (from `/api/logo-mappings/by-entity/club`).
