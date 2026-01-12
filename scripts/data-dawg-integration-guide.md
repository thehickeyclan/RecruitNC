# Data Dawg Integration Guide for RecruitNC

## Overview
This guide explains how to integrate the Data Dawg AI widget from LegacyNC into RecruitNC. 

**Important:** LegacyNC and RecruitNC are **separate projects/codebases** but share the **same Supabase instance**. This means:
- Component code needs to be copied or shared between projects
- API endpoint needs to be created in RecruitNC (or proxied to LegacyNC)
- Both projects access the **same Supabase instance** (same database, same tables)
- Same environment variables for database access (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
- System prompts must be project-specific for relevant responses

## ✅ Key Finding: API Route Already Supports RecruitNC

**Good news!** The LegacyNC API route (`app/api/ai/chat/route.ts`) **already has RecruitNC support built in:**

- ✅ **Project Detection**: Automatically detects `project: "recruit-nc"` from request body
- ✅ **System Prompt Selection**: Already includes `getRecruitNCSystemPrompt()` selection logic
- ✅ **Database Access**: Uses `getSupabaseAdmin()` which works with the shared Supabase instance
- ✅ **Query Handlers**: Already handles college commitments, match records, athlete profiles, etc.

**What this means:**
- If you **proxy to LegacyNC** (Option B), it will automatically use RecruitNC-specific prompts
- If you **copy the endpoint** (Option A), the system prompt selection is already implemented
- You just need to ensure `getRecruitNCSystemPrompt()` function exists and is properly configured

**Next steps:** Choose Option A (copy) or Option B (proxy), then verify the system prompt function exists.

## Prerequisites

### 0. Environment Variables
Both projects need access to the same database and AI service:

**Required:**
- `OPENAI_API_KEY` - Required for the AI chat API
- `SUPABASE_URL` - Same Supabase instance URL (shared between both projects)
- `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_ANON_KEY` - Same database credentials (shared between both projects)

**Note:** Since both projects use the same Supabase instance, they should use the same `SUPABASE_URL` and database credentials. This ensures both can query the same tables (`athletes`, `matches`, `nhsca_placements`, etc.).

### 1. UI Component Dependencies
The widget depends on shadcn/ui components. Verify RecruitNC has these components:

**Required UI components:**
- `components/ui/button.tsx`
- `components/ui/card.tsx` (Card, CardContent, CardHeader, CardTitle)
- `components/ui/input.tsx`
- `components/ui/scroll-area.tsx`

**If missing:** Install via shadcn/ui CLI:
```bash
npx shadcn-ui@latest add button card input scroll-area
```

### 2. API Endpoint Required

### 1. API Endpoint Required
The component calls `/api/ai/chat` which needs to exist in RecruitNC. You have two options:

**Option A: Create the endpoint in RecruitNC** (Self-contained, but requires maintaining same logic)
- Create `app/api/ai/chat/route.ts` in RecruitNC
- Copy the logic from LegacyNC's endpoint
- **CRITICAL:** Must implement system prompt selection (see Step 3)
- This endpoint should handle:
  - `POST` requests with `{ message, project, conversationHistory, feedback?, messageId? }`
  - Detect `project: "recruit-nc"` to provide RecruitNC-specific context
  - Query the shared database for:
    - College commitments (`athletes` table)
    - Match records (`matches` table)
    - Athlete profiles (`athletes` table)
    - NHSCA results (`nhsca_placements` table)
  - Return: `{ answer, messageId, results?, queryType? }`

**Option B: Proxy to LegacyNC** (Recommended - single source of truth)
- Create a proxy endpoint in RecruitNC that forwards to LegacyNC's API
- Keeps AI logic in one place (LegacyNC)
- Requires CORS configuration or server-side proxy
- Example proxy implementation:
```typescript
// app/api/ai/chat/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json()
  const response = await fetch(`${LEGACY_NC_API_URL}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return NextResponse.json(await response.json())
}
```

### 2. Component Location
Since you want code maintained in LegacyNC, you have two approaches:

**Approach 1: Shared Component Package** (Best for maintainability)
- Create a shared package/monorepo structure
- Component lives in LegacyNC but is importable by RecruitNC
- Requires build setup (npm workspaces, turborepo, etc.)

**Approach 2: Copy Component** (Simpler, but requires sync)
- Copy the component to RecruitNC
- Keep it in sync manually or via script
- File location: `components/ai-chat-widget.tsx` or `components/data-dawg-widget.tsx`

**Approach 3: Git Submodule** (Advanced)
- LegacyNC as submodule in RecruitNC
- Import directly from submodule path

## Component Updates Needed

**Reference:** The source component from LegacyNC is available. Copy it and make these updates:

### 1. RecruitNC-Specific Suggested Prompts

The component needs RecruitNC-specific prompts. Update the `getSuggestedPrompts` function in the copied component:

```typescript
// RecruitNC-specific prompts
if (pathname.includes("/athletes") || pathname.includes("/prospects")) {
  return [
    "What college does Liam Hickey wrestle for?",
    "What was Tobin McNair's record as a freshman?",
    "What losses did Liam Hickey have in his high school career?",
    "What was Colt Campbell's HS career record?",
    "Show me all 2025 D1 commitments",
  ]
}

if (pathname.includes("/schools") || pathname.includes("/portal")) {
  return [
    "What college does Liam Hickey wrestle for?",
    "Which athletes are committed to NC State?",
    "Show me all uncommitted 2026 prospects",
    "What are the top recruiting classes by division?",
  ]
}

if (pathname.includes("/colleges")) {
  return [
    "Which colleges have the most NC commitments?",
    "Show me all D1 commitments",
    "What athletes are committed to Appalachian State?",
    "Which division has the most commitments?",
  ]
}
```

### 2. Project Detection
The component already has project detection logic that checks for "recruit" in hostname/pathname. This should work automatically.

### 3. Branding Updates
Update the splash screen text for RecruitNC context:
- Change "NC wrestling records assistant" to "NC wrestling recruiting assistant"
- Update capabilities list to include recruiting-specific features

## Integration Steps

### Step 1: Add Component to RecruitNC

**If using Approach 2 (Copy):**
1. Copy `components/ai-chat-widget.tsx` from LegacyNC to RecruitNC
2. Update imports if paths differ
3. **Update `getSuggestedPrompts()` function** with RecruitNC-specific prompts (see Component Updates section below)
4. **Update branding text:**
   - Change "Your NC wrestling records assistant" → "Your NC wrestling recruiting assistant"
   - Update splash screen capabilities list
   - Update footer text: "Powered by LegacyNC data." → "Powered by RecruitNC data."
5. The component already has project detection that will work for RecruitNC

**Note:** A RecruitNC-specific version is available at `components/ai-chat-widget-recruitnc.tsx` with prompts and branding already updated.

**If using Approach 1 (Shared):**
1. Set up shared package structure
2. Import: `import { AIChatWidget } from "@legacync/components/ai-chat-widget"`

### Step 2: Add to Layout

In `app/layout.tsx`, add the component:

```tsx
import { AIChatWidget } from "@/components/ai-chat-widget"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* ... existing code ... */}
        <AIChatWidget />
        {/* ... rest of layout ... */}
      </body>
    </html>
  )
}
```

### Step 3: Create API Endpoint

**✅ GOOD NEWS:** The LegacyNC API route (`app/api/ai/chat/route.ts`) **already has RecruitNC support built in!**

The API route already includes:
- ✅ Project detection from request body (`detectedProject = body.project || "legacy-nc"`)
- ✅ System prompt selection based on project:
  ```typescript
  if (detectedProject === "recruit-nc") {
    baseSystemPrompt = getRecruitNCSystemPrompt()
  } else if (detectedProject === "ecommerce") {
    baseSystemPrompt = getEcommerceSystemPrompt()
  } else {
    baseSystemPrompt = getLegacyNCSystemPrompt()
  }
  ```
- ✅ Database access via `getSupabaseAdmin()` (works with shared Supabase instance)
- ✅ Query handlers for college commitments, match records, athlete profiles, etc.

**What you need to do:**

**Option A: Copy the endpoint to RecruitNC** (Self-contained)
1. Copy `app/api/ai/chat/route.ts` from LegacyNC to RecruitNC
2. Copy `app/api/ai/system-prompts.ts` (or wherever system prompts are stored)
3. **Verify** `getRecruitNCSystemPrompt()` function exists and is properly configured
4. Ensure all imports resolve (Supabase client, handlers, etc.)

**Option B: Proxy to LegacyNC** (✅ **RECOMMENDED** - single source of truth)

This is the recommended approach because:
- ✅ Keeps all AI logic in one place (LegacyNC)
- ✅ Automatically uses RecruitNC system prompts (via `project: "recruit-nc"`)
- ✅ Easier to maintain (one codebase for AI logic)
- ✅ No code duplication

**Complete Proxy Implementation:**

See the complete implementation below. This proxy:
- Ensures `project: "recruit-nc"` is set (so LegacyNC uses RecruitNC system prompts)
- Handles errors gracefully (timeouts, network errors, etc.)
- Includes proper logging for debugging
- Forwards all request data correctly

**File to create:** `app/api/ai/chat/route.ts` in RecruitNC

The complete code is provided in the next section.

**CRITICAL: System Prompt Verification**

If using Option A, verify that `getRecruitNCSystemPrompt()` exists and includes RecruitNC-specific context:

```typescript
// In app/api/ai/chat/route.ts, around where system prompt is set
const systemPrompt = detectedProject === "recruit-nc"
  ? getRecruitNCSystemPrompt()
  : detectedProject === "ecommerce"
  ? getEcommerceSystemPrompt()
  : getLegacyNCSystemPrompt()
```

**RecruitNC System Prompt should emphasize:**
- College commitments and recruiting status
- Career records and match history
- Prospect rankings and achievements
- Division/college filtering
- Recruiting-focused context

**Example RecruitNC System Prompt:**
```typescript
function getRecruitNCSystemPrompt() {
  return `You are Data Dawg, an AI assistant for North Carolina wrestling recruiting. 
You help users find information about:
- College commitments (which college, division, graduation year)
- High school career records and match history
- Season-by-season statistics
- Prospect rankings and achievements

You have access to a database with:
- athletes table: college commitments, career records, graduation years
- matches table: season records, individual match history
- nhsca_placements table: national tournament results

When answering questions:
- Use the database to find accurate, current information
- For college questions, check graduation year to determine if athlete is currently in college
- For career records, sum across all seasons in matches table
- Be specific with names, colleges, divisions, and years
- If information isn't found, say so clearly`
}
```

**Full Endpoint Example:**

Create `app/api/ai/chat/route.ts`:

```typescript
import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// System prompt functions
function getRecruitNCSystemPrompt() {
  return `You are Data Dawg, an AI assistant for North Carolina wrestling recruiting...`
}

function getLegacyNCSystemPrompt() {
  return `You are Data Dawg, an AI assistant for North Carolina wrestling records...`
}

export async function POST(request: NextRequest) {
  try {
    const { message, project, conversationHistory, feedback, messageId } = await request.json()

    // Handle feedback submission
    if (feedback && messageId) {
      // Store feedback in database
      // ... feedback logic ...
      return NextResponse.json({ success: true })
    }

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    // CRITICAL: Select system prompt based on project
    const detectedProject = project || "recruit-nc"
    const systemPrompt = detectedProject === "recruit-nc"
      ? getRecruitNCSystemPrompt()
      : getLegacyNCSystemPrompt()

    // Initialize AI service (OpenAI, Anthropic, etc.)
    // Query database based on question
    // Generate response using AI with database context and selected system prompt
    
    const answer = await generateAIResponse(message, systemPrompt, conversationHistory)
    const messageId = generateMessageId()

    return NextResponse.json({
      answer,
      messageId,
      // Include query results if applicable
      results: queryResults,
      queryType: detectedQueryType,
    })
  } catch (error) {
    console.error("AI chat error:", error)
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}
```

### Step 4: Verify Database Access

Since both projects use the **same Supabase instance**, verify RecruitNC has the correct credentials:

1. **Verify Supabase credentials match LegacyNC:**
   - Same `SUPABASE_URL` in both projects
   - Same `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_ANON_KEY`)
   - Both projects should be able to query the same tables

2. **Test database connection:**
   ```typescript
   // Quick test query - should work if credentials match
   const supabase = createClient()
   const { data, error } = await supabase
     .from('athletes')
     .select('name, college')
     .limit(1)
   
   if (error) {
     console.error('Database connection issue:', error)
   } else {
     console.log('✅ Database access confirmed')
   }
   ```

3. **Verify RLS policies:**
   - Check that RLS policies allow the queries needed for AI responses
   - Both projects should have the same access level to shared tables

### Step 5: Database Queries for RecruitNC

The AI endpoint should be able to query:

1. **College Commitments:**
   ```sql
   SELECT name, college, division, graduationyear 
   FROM athletes 
   WHERE college IS NOT NULL AND college != ''
   ```

2. **Match Records:**
   ```sql
   SELECT first_name, last_name, season, grade, wins, losses 
   FROM matches 
   WHERE ...
   ```

3. **Career Records:**
   ```sql
   SELECT name, career_record 
   FROM athletes 
   WHERE ...
   ```

See the query documentation files:
- `scripts/college-commitment-queries-for-legacy-system.md`
- `scripts/athlete-match-and-season-queries-for-legacy-system.md`
- `scripts/query-athlete-college-commitment.sql`
- `scripts/query-athlete-match-records.sql`

## Testing Checklist

### Component Testing
- [ ] Component renders on RecruitNC pages
- [ ] Floating button appears in bottom-right
- [ ] Chat opens/closes correctly
- [ ] Voice input works (if supported)
- [ ] Suggested prompts are RecruitNC-appropriate
- [ ] Mobile responsive
- [ ] Project detection works (shows "recruit-nc")

### API Testing
- [ ] API endpoint responds correctly
- [ ] **System prompt selection works** (CRITICAL - test with project: "recruit-nc")
- [ ] Database queries return correct data
- [ ] AI responses are contextually relevant (recruiting-focused)
- [ ] Feedback system works
- [ ] Conversation history is maintained

### Database Testing
- [ ] Can query `athletes` table (college commitments)
- [ ] Can query `matches` table (career records)
- [ ] Can query `nhsca_placements` table (tournament results)
- [ ] RLS policies allow necessary queries

## Common Issues

### Issue: Component not appearing
- Check if component is imported in layout
- Verify no CSS conflicts (z-index, positioning)
- Check browser console for errors

### Issue: API endpoint 404
- Verify route file exists: `app/api/ai/chat/route.ts`
- Check Next.js routing (must be in `app` directory)
- Restart dev server after creating route

### Issue: Database queries fail
- Verify Supabase connection
- Check RLS policies allow queries
- Verify table names match (case-sensitive)

### Issue: AI responses not relevant
- **Check system prompt selection** - Ensure `getRecruitNCSystemPrompt()` is being used
- Verify project detection logic (should detect "recruit-nc")
- Verify conversation history is passed correctly
- Ensure database context is included in AI prompt
- Test with explicit `project: "recruit-nc"` parameter

## Maintenance

Since code is maintained in LegacyNC:
1. Update component in LegacyNC first
2. Test in LegacyNC
3. Sync changes to RecruitNC (copy, submodule update, or package update)
4. Test in RecruitNC
5. Deploy both

## Next Steps

1. **Verify prerequisites:**
   - [ ] Environment variables set (OPENAI_API_KEY, Supabase credentials)
   - [ ] UI components installed (button, card, input, scroll-area)
   - [ ] Database access confirmed (same Supabase instance)

2. **Component setup:**
   - [ ] Copy component from LegacyNC or set up shared package
   - [ ] Update RecruitNC-specific prompts
   - [ ] Update branding text

3. **API endpoint:**
   - [ ] Choose approach (create in RecruitNC vs proxy to LegacyNC)
   - [ ] **Implement system prompt selection** (CRITICAL)
   - [ ] Test with project: "recruit-nc" parameter

4. **Integration:**
   - [ ] Add component to layout
   - [ ] Test all functionality
   - [ ] Verify database queries work

5. **Deploy:**
   - [ ] Test in staging/preview
   - [ ] Deploy to production
   - [ ] Monitor for errors

## Key Reminders

- **Separate projects** = Component needs to be copied or shared
- **Same Supabase instance** = Both projects use the same `SUPABASE_URL` and credentials, query the same tables
- **System prompt selection is CRITICAL** - Without it, responses won't be recruiting-focused
- **UI dependencies** - Ensure all shadcn/ui components are available
- **Environment variables** - Both projects need:
  - `OPENAI_API_KEY` (can be different or shared)
  - `SUPABASE_URL` (must be the same)
  - `SUPABASE_SERVICE_ROLE_KEY` (must be the same)

