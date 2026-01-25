# RecruitNC → LegacyNC Consolidation Plan

## Overview
This document outlines the plan to consolidate RecruitNC features into LegacyNC. Both projects share the same Supabase database and auth system, making this consolidation logical.

## ✅ Benefits of Consolidation

1. **Single Codebase** - One project to maintain, deploy, and update
2. **No Proxy Dependencies** - Remove the AI chat proxy (RecruitNC currently proxies to LegacyNC)
3. **Unified User Experience** - Single domain/branding
4. **Simplified Development** - Shared components and utilities directly
5. **Cost Efficiency** - One deployment instead of two

## 📋 Migration Checklist

### Phase 1: Assessment & Preparation

- [ ] **Backup Both Codebases**
  - Create full backup of RecruitNC codebase
  - Create full backup of LegacyNC codebase
  
- [ ] **Document Current State**
  - List all RecruitNC-specific routes/features
  - List all LegacyNC routes/features
  - Identify potential conflicts
  
- [ ] **Environment Variables Audit**
  - Compare `.env` files between projects
  - Identify unique variables needed
  - Document required variables

- [ ] **Dependency Comparison**
  - Compare `package.json` files
  - Identify unique dependencies
  - Check for version conflicts

### Phase 2: Core Features Migration

#### 2.1 Recruiting Pages
- [ ] `/recruiting` → LegacyNC `app/recruiting/page.tsx`
- [ ] `/prospects` → LegacyNC `app/prospects/page.tsx`
- [ ] `/prospects/all` → LegacyNC `app/prospects/all/page.tsx`
- [ ] `/prospects/[id]` → LegacyNC `app/prospects/[id]/page.tsx`
- [ ] `/public-rankings` → LegacyNC `app/public-rankings/page.tsx`
- [ ] `/public-rankings/[year]` → LegacyNC `app/public-rankings/[year]/page.tsx`

#### 2.2 Coach Portal Features
- [ ] `/coaches` → LegacyNC `app/coaches/page.tsx`
- [ ] `/coaches/dashboard` → LegacyNC `app/coaches/dashboard/page.tsx`
- [ ] `/coaches/my-recruits` → LegacyNC `app/coaches/my-recruits/page.tsx`
- [ ] `/coach-portal` → LegacyNC `app/coach-portal/page.tsx`
- [ ] `/schools/[schoolId]/portal` → LegacyNC `app/schools/[schoolId]/portal/page.tsx`
- [ ] `/colleges/[college]/my-recruits` → LegacyNC `app/colleges/[college]/my-recruits/page.tsx`

#### 2.3 API Routes Migration

**Coach APIs:**
- [ ] `/api/coaches/*` → LegacyNC `app/api/coaches/*`
- [ ] `/api/coach-portal/*` → LegacyNC `app/api/coach-portal/*`
- [ ] `/api/coaches/nc-recruits` → LegacyNC `app/api/coaches/nc-recruits/route.ts`
- [ ] `/api/coaches/create-prospect` → LegacyNC `app/api/coaches/create-prospect/route.ts`
- [ ] `/api/coaches/starred-athletes` → LegacyNC `app/api/coaches/starred-athletes/route.ts`
- [ ] `/api/coaches/update-pipeline-stage` → LegacyNC `app/api/coaches/update-pipeline-stage/route.ts`
- [ ] `/api/coaches/pipeline-history` → LegacyNC `app/api/coaches/pipeline-history/route.ts`
- [ ] `/api/coaches/activities` → LegacyNC `app/api/coaches/activities/route.ts`
- [ ] `/api/coaches/all-actions` → LegacyNC `app/api/coaches/all-actions/route.ts`

**Prospect APIs:**
- [ ] `/api/prospects` → LegacyNC `app/api/prospects/route.ts`
- [ ] `/api/admin/prospects/*` → LegacyNC `app/api/admin/prospects/*`
- [ ] `/api/admin/prospects/calculate-scores` → LegacyNC `app/api/admin/prospects/calculate-scores/route.ts`
- [ ] `/api/admin/prospects/ranking` → LegacyNC `app/api/admin/prospects/ranking/route.ts`
- [ ] `/api/admin/prospects/ai-ranking` → LegacyNC `app/api/admin/prospects/ai-ranking/route.ts`

**NHSCA Import System:**
- [ ] `/api/admin/nhsca-placements/*` → LegacyNC `app/api/admin/nhsca-placements/*`
  - `bulk-import/route.ts`
  - `match/route.ts`
  - `merge/route.ts`
  - `list/route.ts`
  - `analytics/route.ts`
  - `debug/route.ts`
  - `delete-year/route.ts`
  - `manual-match/route.ts`
  - `multi-all-americans/route.ts`
  - `query/route.ts`
  - `test-count/route.ts`

**Public Rankings APIs:**
- [ ] `/api/public-rankings` → LegacyNC `app/api/public-rankings/route.ts`

**Remove Proxy:**
- [ ] Delete `/api/ai/chat/route.ts` from RecruitNC (no longer needed, LegacyNC has the real implementation)

#### 2.4 Components Migration

**Recruiting Components:**
- [ ] `components/ai-chat-widget-recruitnc.tsx` → LegacyNC (can likely merge into existing AI widget)
- [ ] `components/recruiting-*` → LegacyNC `components/recruiting-*`
- [ ] `components/create-prospect-modal.tsx` → LegacyNC
- [ ] `components/recruiting-funnel-chart.tsx` → LegacyNC
- [ ] `components/recruiting-actions-dashboard.tsx` → LegacyNC
- [ ] `components/recruits-pipeline-view.tsx` → LegacyNC
- [ ] `components/star-rating.tsx` → LegacyNC
- [ ] `components/birthday-calendar.tsx` → LegacyNC

**Prospect Components:**
- [ ] All prospect-related components → LegacyNC

#### 2.5 Services & Libraries

- [ ] `services/rankings-service.ts` → LegacyNC `services/rankings-service.ts`
- [ ] `lib/nhsca-auto-fetch.ts` → LegacyNC `lib/nhsca-auto-fetch.ts`
- [ ] Check for other recruiting-specific utilities in `lib/`

### Phase 3: Admin Features

**Recruiting Admin:**
- [ ] `/admin/prospects/*` → LegacyNC `app/admin/prospects/*`
- [ ] `/admin/college-coaches` → LegacyNC `app/admin/college-coaches/page.tsx`

**NHSCA Admin Tools:**
- [ ] All NHSCA admin features already in `/admin/*` can stay (shared location)

### Phase 4: Configuration & Dependencies

- [ ] **Merge package.json dependencies**
  - Add RecruitNC-specific dependencies to LegacyNC
  - Resolve version conflicts
  
- [ ] **Update Environment Variables**
  - Merge `.env.example` files
  - Remove `LEGACY_NC_API_URL` (no longer needed)
  - Ensure all required variables are documented

- [ ] **Update Navigation/Menu**
  - Add recruiting links to LegacyNC navigation
  - Update routing structure

- [ ] **Update Middleware**
  - Ensure auth middleware works for all routes
  - Check route protection/authorization

### Phase 5: Data & Database

- [ ] **Database Tables** - ✅ Already shared, no migration needed
- [ ] **RLS Policies** - Verify policies work for all consolidated routes
- [ ] **Database Functions** - Check if any RecruitNC-specific functions need migration

### Phase 6: Testing & Validation

- [ ] **Test All Migrated Routes**
  - Test recruiting pages
  - Test coach portal
  - Test prospect management
  - Test NHSCA import system
  - Test API endpoints

- [ ] **Test Integration**
  - Verify AI chat works (should now be direct, no proxy)
  - Test data flow between features
  - Test authentication/authorization

- [ ] **User Acceptance Testing**
  - Test from coach perspective
  - Test from admin perspective
  - Test from public user perspective

### Phase 7: Cleanup

- [ ] **Remove Proxy Code**
  - Delete proxy implementation from RecruitNC
  - Update any references

- [ ] **Update Documentation**
  - Update README files
  - Update API documentation
  - Update deployment docs

- [ ] **Code Cleanup**
  - Remove duplicate code
  - Consolidate shared utilities
  - Remove unused imports/components

### Phase 8: Deployment

- [ ] **Update Deployment Config**
  - Update Vercel/production config
  - Update domain routing if needed
  - Update environment variables in production

- [ ] **DNS/Domain Updates** (if applicable)
  - Point RecruitNC domain to LegacyNC
  - Or set up redirects

- [ ] **Monitor After Deployment**
  - Watch for errors
  - Monitor performance
  - Check user feedback

## 🔍 Key Files to Migrate

### Critical Routes
```
app/recruiting/page.tsx
app/prospects/page.tsx
app/prospects/all/page.tsx
app/prospects/[id]/page.tsx
app/public-rankings/page.tsx
app/public-rankings/[year]/page.tsx
app/coaches/page.tsx
app/coaches/dashboard/page.tsx
app/coaches/my-recruits/page.tsx
app/coach-portal/page.tsx
app/schools/[schoolId]/portal/page.tsx
app/colleges/[college]/my-recruits/page.tsx
```

### Critical API Routes
```
app/api/coaches/**/*
app/api/coach-portal/**/*
app/api/admin/nhsca-placements/**/*
app/api/admin/prospects/**/*
app/api/prospects/route.ts
app/api/public-rankings/route.ts
```

### Critical Components
```
components/recruiting-*
components/create-prospect-modal.tsx
components/recruiting-funnel-chart.tsx
components/recruiting-actions-dashboard.tsx
components/recruits-pipeline-view.tsx
components/star-rating.tsx
components/birthday-calendar.tsx
```

### Critical Services
```
services/rankings-service.ts
lib/nhsca-auto-fetch.ts
```

## ⚠️ Potential Conflicts to Watch For

1. **Route Conflicts**
   - Check if LegacyNC has any routes with same paths
   - May need to consolidate or rename

2. **Component Naming**
   - Check for duplicate component names
   - May need to rename or merge

3. **API Route Conflicts**
   - Verify no duplicate API routes
   - Merge functionality if duplicates exist

4. **Dependencies**
   - Watch for conflicting package versions
   - Test thoroughly after merging

5. **Navigation/Menu**
   - Update LegacyNC nav to include recruiting links
   - Ensure proper routing

6. **Styling/Branding**
   - May need to align design systems
   - Check for CSS conflicts

## 🚀 Migration Strategy

### Recommended Approach: Feature-by-Feature

1. **Start Small** - Migrate one feature set at a time
2. **Test Frequently** - Test each migration before moving to next
3. **Keep RecruitNC Running** - Keep both apps running during migration
4. **Use Feature Flags** - Use feature flags to gradually enable migrated features
5. **Monitor Closely** - Watch for issues during migration

### Alternative: Big Bang (Not Recommended)
- Migrate everything at once
- Higher risk, but faster completion
- Only if you have strong test coverage

## 📝 Post-Migration Checklist

- [ ] All RecruitNC features working in LegacyNC
- [ ] AI chat proxy removed (direct implementation working)
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Deployment successful
- [ ] RecruitNC domain redirected/retired
- [ ] Users notified (if applicable)

## 🔗 Related Documentation

- `scripts/data-dawg-integration-guide.md` - AI chat integration details
- `scripts/NHSCA_DATA_ARCHITECTURE.md` - NHSCA import system architecture
- `scripts/LEGACYNC_NHSCA_INTEGRATION.md` - Database integration details

## ❓ Questions to Resolve

1. **Domain Strategy**
   - Will RecruitNC domain redirect to LegacyNC?
   - Or will recruiting features be under LegacyNC domain?

2. **Branding**
   - Unified branding or keep separate branding sections?
   - Update "RecruitNC" references to "LegacyNC"?

3. **User Migration**
   - Any user accounts that need migration?
   - Any user-specific data that needs to be moved?

4. **Timeline**
   - Preferred timeline for migration?
   - Any deadlines or milestones?
