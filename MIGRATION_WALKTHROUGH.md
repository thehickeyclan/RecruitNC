# 🚀 Migration Walkthrough: Using the Migration Script

## Overview
This guide walks you through migrating RecruitNC features into LegacyNC using the automated migration script.

---

## 📋 Prerequisites Checklist

Before starting, make sure:
- ✅ You have a backup of RecruitNC (we created one earlier)
- ✅ LegacyNC is located at: `/Users/matthickey/Downloads/legacy-nc`
- ✅ You're in the RecruitNC directory
- ✅ Both projects are not running (to avoid conflicts)

---

## 🎯 Step-by-Step Migration Process

### Step 1: Navigate to RecruitNC Directory

```bash
cd /Users/matthickey/RecruitNC_MyRecruits/Recruit-NC-main
```

### Step 2: View Available Features

First, let's see what we can migrate:

```bash
./scripts/migrate-to-legacync.sh list
```

You should see:
```
Available features to migrate:
  recruiting-pages      - /recruiting pages
  prospects            - /prospects pages
  coach-portal         - Coach portal pages
  coach-apis           - Coach API routes
  nhsca-import         - NHSCA import system
  prospect-apis        - Prospect API routes
  public-rankings      - Public rankings pages & API
  recruiting-components - Recruiting-related components
  rankings-service     - Rankings service
  all                  - Migrate everything
```

### Step 3: Choose Your Migration Strategy

You have two options:

#### Option A: Migrate Feature-by-Feature (Recommended)
This is safer - you can test each feature after migration.

#### Option B: Migrate Everything at Once
Faster, but you'll need to fix all issues at once.

---

## 📦 Option A: Feature-by-Feature Migration

### Example: Migrate Recruiting Pages First

```bash
./scripts/migrate-to-legacync.sh recruiting-pages
```

**What happens:**
1. Script checks if backup reference exists (extracts if needed)
2. Copies `app/recruiting/` from RecruitNC to LegacyNC
3. Asks for confirmation if files already exist
4. Shows what was copied

**Expected output:**
```
🔄 RecruitNC → LegacyNC Migration Helper

📋 Migrating: Recruiting Pages
   Source: app/recruiting
   Dest:   app/recruiting
✅ Copied successfully

✅ Migration complete!
```

### After Each Migration:

1. **Navigate to LegacyNC**:
   ```bash
   cd /Users/matthickey/Downloads/legacy-nc
   ```

2. **Install/Update Dependencies**:
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Check for Import Errors**:
   ```bash
   npm run build
   # Look for any import errors related to migrated files
   ```

4. **Test the Feature**:
   ```bash
   npm run dev
   # Navigate to the new route (e.g., /recruiting)
   # Test functionality
   ```

5. **Fix Any Issues**:
   - Missing components? Migrate them next
   - Import errors? Fix import paths
   - Missing dependencies? Add to package.json

### Continue with Next Features

Once recruiting pages work, migrate related features:

```bash
# Go back to RecruitNC directory
cd /Users/matthickey/RecruitNC_MyRecruits/Recruit-NC-main

# Migrate components needed by recruiting pages
./scripts/migrate-to-legacync.sh recruiting-components

# Migrate the API routes
./scripts/migrate-to-legacync.sh coach-apis
./scripts/migrate-to-legacync.sh prospect-apis

# Migrate more features
./scripts/migrate-to-legacync.sh prospects
./scripts/migrate-to-legacync.sh coach-portal
./scripts/migrate-to-legacync.sh nhsca-import
./scripts/migrate-to-legacync.sh public-rankings
./scripts/migrate-to-legacync.sh rankings-service
```

---

## 🚀 Option B: Migrate Everything at Once

If you want to migrate everything in one go:

```bash
./scripts/migrate-to-legacync.sh all
```

**Warning:** This will:
- Migrate all features at once
- Ask for confirmation before starting
- Overwrite existing files (with confirmation)

**After migration:**
1. Navigate to LegacyNC
2. Install dependencies
3. Fix all import errors
4. Test all features
5. Update navigation/menus

---

## 🔍 What the Script Does

### Automatic Setup
1. **Creates Reference Directory**: Extracts your backup zip to `/Users/matthickey/RecruitNC_MyRecruits/recruitnc-reference/` (if not exists)
2. **Verifies Paths**: Checks that LegacyNC directory exists
3. **Finds Latest Backup**: Automatically uses your most recent backup

### Smart Copying
1. **Checks if Destination Exists**: Won't overwrite without asking
2. **Creates Directories**: Creates necessary parent directories
3. **Preserves Structure**: Maintains the same folder structure

### Safety Features
- ✅ Won't overwrite without confirmation
- ✅ Shows what it's copying before copying
- ✅ Reports errors clearly
- ✅ Uses your backup as source (not live files)

---

## 📝 Detailed Feature Descriptions

### `recruiting-pages`
**Copies:**
- `app/recruiting/page.tsx` - Main recruiting landing page

**Dependencies:**
- May need `recruiting-components` 
- May need API routes

### `prospects`
**Copies:**
- `app/prospects/page.tsx` - Main prospects page
- `app/prospects/all/page.tsx` - All prospects list
- `app/prospects/[id]/page.tsx` - Individual prospect pages

**Dependencies:**
- Needs `prospect-apis`
- Needs prospect components

### `coach-portal`
**Copies:**
- `app/coaches/*` - Coach pages
- `app/coach-portal/*` - Coach portal
- `app/schools/[schoolId]/portal/*` - School-specific portal

**Dependencies:**
- Needs `coach-apis`
- Needs recruiting components

### `coach-apis`
**Copies:**
- `app/api/coaches/*` - All coach API routes
- `app/api/coach-portal/*` - Coach portal API routes

### `nhsca-import`
**Copies:**
- `app/api/admin/nhsca-placements/*` - Complete NHSCA import system

### `prospect-apis`
**Copies:**
- `app/api/prospects/*` - Prospect API routes
- `app/api/admin/prospects/*` - Admin prospect APIs

### `public-rankings`
**Copies:**
- `app/public-rankings/*` - Public rankings pages
- `app/api/public-rankings/*` - Rankings API

### `recruiting-components`
**Copies:**
- All components matching `recruiting-*`
- All components matching `*prospect*`
- `create-prospect*` components

### `rankings-service`
**Copies:**
- `services/rankings-service.ts` - Rankings service utility

---

## 🛠️ Troubleshooting

### Issue: "LegacyNC directory not found"
**Solution:** Update the `LEGACYNC_DIR` path in the script:
```bash
# Edit the script
nano scripts/migrate-to-legacync.sh
# Update line 12 with your LegacyNC path
```

### Issue: "No backup zip found"
**Solution:** Create a backup first:
```bash
./scripts/backup.sh
```

### Issue: "Destination already exists"
**Solution:** 
- The script will ask if you want to overwrite
- Choose `y` to overwrite, `N` to skip
- Or manually backup the existing file first

### Issue: Import Errors After Migration
**Solution:**
1. Check if components/services are missing
2. Migrate missing dependencies
3. Fix import paths (may need to adjust for LegacyNC structure)
4. Check `package.json` for missing dependencies

### Issue: Missing Dependencies
**Solution:**
1. Compare `package.json` files:
   ```bash
   diff Recruit-NC-main/package.json legacy-nc/package.json
   ```
2. Merge dependencies manually
3. Run `npm install` in LegacyNC

---

## ✅ Post-Migration Checklist

After migrating all features:

- [ ] All files copied successfully
- [ ] Dependencies installed (`npm install` in LegacyNC)
- [ ] No import errors (check with `npm run build`)
- [ ] All routes working (test each migrated route)
- [ ] API endpoints working (test API routes)
- [ ] Navigation updated (add links to new routes)
- [ ] Environment variables updated (merge .env files)
- [ ] Middleware updated (if needed for new routes)
- [ ] Tests passing (if you have tests)
- [ ] Documentation updated

---

## 🎯 Recommended Migration Order

For best results, migrate in this order:

1. **Services & Libraries First**
   ```bash
   ./scripts/migrate-to-legacync.sh rankings-service
   ```

2. **Components Second**
   ```bash
   ./scripts/migrate-to-legacync.sh recruiting-components
   ```

3. **API Routes Third**
   ```bash
   ./scripts/migrate-to-legacync.sh coach-apis
   ./scripts/migrate-to-legacync.sh prospect-apis
   ./scripts/migrate-to-legacync.sh nhsca-import
   ```

4. **Pages Last**
   ```bash
   ./scripts/migrate-to-legacync.sh recruiting-pages
   ./scripts/migrate-to-legacync.sh prospects
   ./scripts/migrate-to-legacync.sh coach-portal
   ./scripts/migrate-to-legacync.sh public-rankings
   ```

This order ensures dependencies are available before they're needed.

---

## 📞 Next Steps

Once migration is complete:
1. Remove the proxy code from RecruitNC (if it exists)
2. Update LegacyNC navigation to include new routes
3. Test thoroughly
4. Deploy LegacyNC
5. Consider retiring RecruitNC domain (or redirecting)

---

## 🆘 Need Help?

If you encounter issues:
1. Check the troubleshooting section above
2. Review the `CONSOLIDATION_PLAN.md` for details
3. Check error messages carefully
4. Test each feature individually

Happy migrating! 🎉
