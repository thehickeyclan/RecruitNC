# Data Dawg Integration - Testing Checklist

## Pre-Testing Setup

### 1. Environment Variables
Add to RecruitNC's `.env.local`:
```bash
# LegacyNC API URL for proxy
# Local development (if LegacyNC runs on port 3000):
LEGACY_NC_API_URL=http://localhost:3000

# Production (replace with your actual LegacyNC domain):
# LEGACY_NC_API_URL=https://legacync.com
```

### 2. Verify Files Exist
- [ ] `app/api/ai/chat/route.ts` exists (proxy endpoint)
- [ ] `components/ai-chat-widget-recruitnc.tsx` exists (or component copied from LegacyNC)
- [ ] Component is imported in `app/layout.tsx`

### 3. Start Servers
- [ ] LegacyNC server running (usually `npm run dev` on port 3000)
- [ ] RecruitNC server running (usually `npm run dev` on port 3001 or different port)
- [ ] Both servers can access the same Supabase instance

## Integration Testing

### Component Testing
- [ ] Component renders on RecruitNC pages
- [ ] Floating button appears in bottom-right corner
- [ ] Chat opens/closes correctly
- [ ] Voice input works (if supported)
- [ ] Suggested prompts are RecruitNC-appropriate (recruiting-focused)
- [ ] Mobile responsive
- [ ] Project detection works (should detect "recruit-nc")

### API Proxy Testing
- [ ] API endpoint responds correctly (`/api/ai/chat`)
- [ ] Check browser console for `[RecruitNC Proxy]` log messages
- [ ] Verify proxy forwards to LegacyNC successfully
- [ ] Check LegacyNC logs to confirm requests are received
- [ ] **CRITICAL:** System prompt selection works (test with project: "recruit-nc")

### System Prompt Verification Tests

These queries should return **recruiting-focused** responses:

#### Test 1: College Commitment Query
**Query:** "What college does Liam Hickey wrestle for?"

**Expected Response:**
- Should mention college name (e.g., "UNC Chapel Hill")
- Should mention division (e.g., "NCAA Division I")
- Should mention graduation year
- Should indicate if currently attending or committed for future
- Should be recruiting-focused (not just records-focused)

**How to verify:**
- Response should include context about recruiting/commitment
- Should mention high school if available
- Should be clear about current status vs future commitment

#### Test 2: Division-Specific Commitments
**Query:** "What Division II commitments were there in the class of 2025?"

**Expected Response:**
- Should list DII commitments for 2025
- Should be organized by college
- Should include athlete names, weights, and colleges
- Should show count/statistics
- Should be recruiting-focused

**How to verify:**
- Response should emphasize recruiting context
- Should group by college for easy scanning
- Should include relevant recruiting details

#### Test 3: High School Recruiting Stats
**Query:** "What high schools sent most kids to college programs?"

**Expected Response:**
- Should show leaderboard of high schools
- Should include counts of commitments
- Should be recruiting-focused
- Should emphasize the recruiting pipeline

**How to verify:**
- Response should frame as recruiting achievement
- Should highlight schools' success in placing athletes
- Should be relevant to recruiting context

### Additional Test Queries

#### Match Records
**Query:** "What was Tobin McNair's record as a freshman?"

**Expected Response:**
- Should show season record (wins-losses)
- Should include season context
- Should be recruiting-relevant (shows prospect performance)

#### Career Records
**Query:** "What was Colt Campbell's HS career record?"

**Expected Response:**
- Should show all 4-year records
- Should include season breakdown
- Should be formatted for recruiting context

#### Losses Query
**Query:** "What losses did Liam Hickey have in his high school career?"

**Expected Response:**
- Should list individual losses
- Should include opponent, date, method
- Should be recruiting-relevant (shows competition level)

## Debugging

### Check Proxy Logs
Look for these in RecruitNC console:
```
[RecruitNC Proxy] Forwarding request to LegacyNC: { project: 'recruit-nc', messageLength: 45 }
[RecruitNC Proxy] Successfully proxied response from LegacyNC
```

### Check LegacyNC Logs
Look for these in LegacyNC console:
```
[AI] Project detected: recruit-nc
[AI] Using RecruitNC system prompt
```

### Common Issues

#### Issue: Proxy returns 502/504
- **Check:** Is LegacyNC server running?
- **Check:** Is `LEGACY_NC_API_URL` set correctly?
- **Check:** Can RecruitNC reach LegacyNC URL?

#### Issue: Wrong system prompt being used
- **Check:** Is `project: "recruit-nc"` being sent in request?
- **Check:** LegacyNC logs should show "Using RecruitNC system prompt"
- **Check:** Component's `detectProject()` function

#### Issue: Responses not recruiting-focused
- **Check:** System prompt selection in LegacyNC API
- **Check:** `getRecruitNCSystemPrompt()` function exists and is configured
- **Check:** Test with explicit `project: "recruit-nc"` parameter

#### Issue: Database queries fail
- **Check:** Both projects use same `SUPABASE_URL`
- **Check:** Both projects use same `SUPABASE_SERVICE_ROLE_KEY`
- **Check:** RLS policies allow necessary queries

## Success Criteria

✅ **Integration is successful when:**
1. Component renders and functions correctly
2. Proxy forwards requests successfully
3. System prompt selection works (RecruitNC prompts used)
4. Responses are recruiting-focused (not just records-focused)
5. Database queries return correct data
6. All test queries return appropriate responses

## Next Steps After Testing

Once testing is successful:
1. Deploy to staging/preview environment
2. Test in production-like environment
3. Monitor for errors
4. Gather user feedback
5. Iterate on system prompts if needed

## Quick Reference

**Proxy Endpoint:** `app/api/ai/chat/route.ts`
**Component:** `components/ai-chat-widget-recruitnc.tsx` (or copied from LegacyNC)
**Environment Variable:** `LEGACY_NC_API_URL`
**Integration Guide:** `scripts/data-dawg-integration-guide.md`





