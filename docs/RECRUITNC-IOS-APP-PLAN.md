# RecruitNC iPhone App Plan

**Working title:** RecruitNC  
**Platform:** iPhone first  
**Positioning:** The premium mobile home for North Carolina wrestling  
**Primary promise:** Follow the athletes, rankings, commitments, events, and conversations that matter—then ask Data Dawg for the full story.

---

## 1. Product Vision

The RecruitNC app should not feel like the website compressed onto a smaller screen. It should feel like a premium sports intelligence product built specifically for the daily habits of wrestlers, parents, coaches, and fans.

The app brings six core experiences together:

1. **Data Dawg**
2. **Athlete profiles**
3. **Rankings**
4. **College commitments**
5. **Calendar**
6. **Messaging**

Profiles are the connective tissue. A Data Dawg result, ranking row, commitment, live result, calendar entry, or message should always lead naturally to the relevant athlete, school, college, or event.

### Product principles

- **Fast before broad:** The most important information should be one or two taps away.
- **Verified over noisy:** Clearly distinguish official results, RecruitNC rankings, commitments, and community content.
- **North Carolina first:** Every screen should reinforce that this is the definitive home for North Carolina wrestling.
- **Personal by default:** Favorites, alerts, saved athletes, and role-specific experiences should make the app feel different for every user.
- **Premium, not busy:** Strong hierarchy, restrained motion, crisp typography, excellent photos, and purposeful use of gold.
- **Data Dawg is a product feature, not a chatbot tab:** It should understand the current screen and help users move through the app.

---

## 2. Target Audiences

### Wrestlers

- Track rankings, profiles, results, and commitments
- Follow competitors and teammates
- Manage or claim their profile
- Receive event and ranking notifications
- Use Data Dawg to understand résumés and historical context

### Parents

- Follow one or more linked athletes
- View schedules, results, messages, and reminders
- Receive event, registration, and profile-update notifications
- Quickly share athlete profiles and achievements

### College coaches

- Search and save prospects
- Review complete athlete résumés
- Monitor ranking and commitment changes
- Access approved recruiting contact information
- Use a mobile version of My Recruits in a later phase

### High school and club coaches

- Follow athletes and teams
- Communicate with groups
- Review schedules and results
- Share official updates

### Fans

- Follow athletes, schools, colleges, and weight classes
- Browse rankings and commitments
- Receive breaking news and event alerts
- Ask Data Dawg historical and current questions

---

## 3. Premium Brand Direction

### Brand personality

RecruitNC should feel:

- Authoritative
- Modern
- Competitive
- Proudly North Carolina
- Editorial, not generic
- Premium without becoming corporate

### Core palette

- **RecruitNC Navy:** `#003366`
- **Deep Navy:** `#002147`
- **Midnight Surface:** `#0A1628`
- **Championship Gold:** `#CBAF5D`
- **Highlight Gold:** `#D3B574`
- **NC Red:** `#B31B1B`
- **Warm White:** `#F8F7F3`
- **Slate:** `#64748B`

Gold should signal achievement, selection, and premium actions. Red should be reserved for live status, breaking news, destructive actions, or urgent alerts.

### Typography

- **Display / scores / section labels:** Barlow Condensed
- **Body / controls / Data Dawg:** DM Sans
- Use large, confident numbers for rankings, records, placements, and dates.
- Avoid dense all-caps text except for short labels.

### Visual language

- Dark navy hero surfaces with warm white content cards
- Gold keylines and restrained metallic gradients
- Full-bleed athlete photography where available
- Subtle depth, not heavy shadows
- Rounded cards with firm geometry—not playful bubbles
- Haptics for follows, saves, ranking filters, and successful actions
- Motion should be quick and athletic: 180–250 ms transitions

### App icon

Use a simplified RecruitNC or NC United mark designed specifically for the iOS icon grid. It must remain recognizable at notification size and should not reuse a complex full logo without simplification.

---

## 4. Information Architecture

### Primary tab bar

1. **Home**
2. **Rankings**
3. **Data Dawg**
4. **Calendar**
5. **Inbox**

The centered Data Dawg tab should be visually distinct but still behave like a normal native tab. Profiles, commitments, saved items, and settings are reached through Home, search, deep links, and the account menu.

### Global actions

- Search athletes, schools, colleges, and events
- Open notifications
- Open account/profile
- Share the current athlete, ranking, commitment, or event

---

## 5. Core Experiences

## 5.1 Home

The Home screen should be personalized and editorial—not a generic dashboard.

### Modules

- **Top story or breaking update**
- **Following:** recent activity from saved athletes and schools
- **Latest commitments**
- **Ranking movement**
- **Upcoming events**
- **Live now / recently completed**
- **Continue with Data Dawg**
- **Recommended athletes**

### Role-aware variations

- Athlete/parent: linked athlete first
- College coach: saved prospects and recent movement first
- Coach: team messages and calendar first
- Fan: favorites, rankings, and news first

---

## 5.2 Data Dawg

Data Dawg should be the app’s intelligence layer.

### v1 capabilities

- Ask about athletes, schools, rankings, commitments, and tournament history
- Stream answers
- Render native athlete, school, event, and ranking cards inside answers
- Open profile links in the app
- Save recent conversations
- Suggested prompts based on the current screen
- Feedback control: helpful / something is off

### Context-aware behavior

Examples:

- From an athlete profile: “Compare his state and national progression.”
- From rankings: “Who moved the most in this class?”
- From a school page: “Who are this school’s best NHSCA All-Americans?”
- From calendar: “What events are near Raleigh next month?”

### Trust requirements

- Show verified-source labels
- Ask a short clarifying question when scope materially changes the answer
- Never assume school versus statewide scope from a previous athlete without confirming
- Deep-link names to canonical `/view-profile?id=…` profiles
- Display data freshness where helpful

---

## 5.3 Athlete Profiles

Profiles should be the most polished screen in the product.

### Header

- Athlete photo
- Name
- School
- Class year
- College commitment
- RecruitNC rank
- Follow / save button
- Share button

Do not make current weight the dominant identity element; weight changes frequently.

### Profile sections

- Career snapshot
- NCHSAA results
- NHSCA results
- Fargo results
- Super32 results
- NC United participation
- Match data
- Rankings history
- Commitment details
- News and updates
- Verified sources

### Premium interactions

- Horizontal career timeline
- Expandable result cards
- Ranking-history visualization
- Shareable athlete card
- Follow alerts for results, rankings, and commitments

---

## 5.4 Rankings

### Core functions

- Class-year tabs
- Weight and classification filters
- Search
- Rank movement indicators
- Follow athlete
- Compare athletes
- Open full profiles

### Presentation

- Dark midnight surface
- Large rank number
- Gold accent for top-tier placement
- Clear committed/uncommitted status
- Avoid spreadsheet-style density

### Later additions

- Saved ranking views
- “Movers this week”
- Position history
- Coach-only recruiting filters

---

## 5.5 College Commitments

### Feed

- Latest commitment cards
- Athlete, school, college, division, and commitment date
- Filter by class, college, division, or high school
- Follow athlete or college
- Share commitment

### Detail

- Athlete profile link
- College page
- Commitment history when relevant
- Related recruits

### Trust

- “Verified commitment” indicator
- Submission and correction workflow should remain moderated

---

## 5.6 Calendar

### Views

- Agenda
- Month
- Saved events

### Event types

- Tournaments
- Duals
- NC United events
- Drop-ins
- Registration deadlines
- Camps and clinics
- Recruiting dates

### Native advantages

- Add to Apple Calendar
- Location and Maps integration
- Registration deep links
- Reminder controls
- Push notifications for saved events

---

## 5.7 Messaging

Messaging must have a single mobile product model. Do not expose both legacy threads and the newer forum system as separate concepts.

### Recommendation

Use the forum/group architecture as the long-term mobile messaging foundation, with:

- Direct messages
- Team/group channels
- Announcements
- Media and link previews
- Unread state
- Per-thread notification controls
- Report/block tools

### v1 decision gate

Messaging should only ship in the first App Store release if:

- The canonical backend model is selected
- Realtime updates are reliable
- Push notifications work
- Moderation and privacy rules are complete

Otherwise, release messaging in v1.1 rather than shipping two inconsistent inboxes.

---

## 6. Following, Favorites, and Notifications

Following is the retention engine.

### Followable entities

- Athlete
- School
- College
- Weight/class ranking view
- Event

### Notification types

- New message
- Commitment announced
- Ranking changed
- Athlete result posted
- Event reminder
- Schedule change
- Breaking news
- Profile correction approved

### Controls

- Immediate, daily digest, or muted
- Per-athlete and per-thread settings
- Quiet hours
- Role-sensitive defaults

True Apple Push Notification service support is net-new work and is required before messaging is considered complete.

---

## 7. Search

One global search should cover:

- Athletes
- Schools
- Colleges
- Events
- Data Dawg questions

Search results should be grouped by entity type and tolerate spelling variants. Recent searches and saved entities should appear before typing.

---

## 8. Technical Direction

### Recommended client

**React Native with Expo, using TypeScript.**

Why:

- Strong fit with the existing TypeScript team and domain models
- Native navigation, push, haptics, camera/photo access, and Apple integrations
- Faster iteration than a separate Swift-only codebase
- Supports a future Android app without compromising the iPhone-first design

Use native iOS patterns and components; do not make the app look like a cross-platform web wrapper.

### Backend reuse

Reuse:

- Supabase Auth and database
- Existing RLS policies
- Existing JSON APIs
- Data Dawg backend
- Rankings APIs
- Profile data services
- Calendar APIs
- Commitment APIs
- Messaging APIs after consolidation

### Mobile API layer

Create a curated `/api/mobile/v1` surface or equivalent service boundary. Do not make the app depend directly on dozens of internal web/admin routes.

Initial endpoints should cover:

- Session and current user
- Home feed
- Global search
- Athlete profile
- Rankings
- Commitments
- Calendar
- Data Dawg
- Following
- Notifications
- Messaging

### Authentication

- Supabase Auth with secure native token storage
- Bearer-token API requests
- Sign in with Apple
- Email magic link or one-time code
- Existing role and verification rules remain authoritative

### Analytics and reliability

- Privacy-conscious product analytics
- Crash reporting
- API latency and failure monitoring
- Data Dawg answer latency and feedback
- Push delivery monitoring
- Feature flags for staged releases

---

## 9. Privacy, Safety, and App Store Requirements

Because many users and athletes may be minors:

- Publish clear privacy and data-retention policies
- Minimize exposed personal information
- Keep coach contact access approval-gated
- Add report/block flows for messaging
- Document moderation escalation
- Support account deletion in-app
- Support data export where required
- Complete Apple privacy nutrition labels
- Review user-generated content requirements before messaging launch
- Avoid public display of private phone/email data

---

## 10. Delivery Plan

## Phase 0 — Product and platform foundation (2–3 weeks)

- Confirm audiences and v1 scope
- Select the canonical messaging backend
- Define design tokens and component library
- Define `/api/mobile/v1`
- Audit Supabase RLS for native clients
- Create app icon and launch assets
- Set up analytics, crash reporting, feature flags, and CI/CD

**Exit criteria:** Approved clickable prototype, API contract, and App Store readiness checklist.

## Phase 1 — Premium read experience (6–8 weeks)

- Native authentication
- Home
- Global search
- Athlete profiles
- Rankings
- College commitments
- Calendar
- Favorites/following
- In-app notifications
- Deep links and sharing

**Exit criteria:** Internal TestFlight build with complete browse/follow loop.

## Phase 2 — Data Dawg (3–4 weeks, overlaps Phase 1)

- Streaming chat
- Native result cards
- Context-aware prompts
- Conversation history
- Feedback
- Clarification handling
- Profile/event/ranking deep links

**Exit criteria:** Data Dawg answers open the correct native destination and meet latency targets.

## Phase 3 — Push and messaging (4–6 weeks)

- APNs
- Notification preferences
- Direct and group messaging
- Realtime unread state
- Moderation tools
- Notification deep links

**Exit criteria:** Reliable message delivery, push, mute, report, and block flows.

## Phase 4 — Live and recruiting expansion

- Live event hub and result alerts
- Coach My Recruits
- Prospect comparisons
- Saved searches
- Apple Calendar and richer Maps integrations
- Athlete profile management

---

## 11. Recommended v1 Scope

### Ship

- Home
- Data Dawg
- Athlete profiles
- Rankings
- College commitments
- Calendar
- Following/favorites
- Notifications
- Global search
- Account and role-aware settings

### Ship only if ready

- Messaging
- Push notifications

Push should ship with or before messaging; an inbox without dependable push will feel unfinished.

### Do not block v1

- Full admin
- Imports
- Store management
- Fundraising administration
- Tournament operations
- Heavy coach CRM
- Video editing or film rooms

---

## 12. Launch Quality Bar

The first public build should meet these standards:

- Cold launch feels responsive
- Core content remains usable on weak cellular service
- Profiles and rankings load with skeleton states, never blank screens
- Every push opens the correct destination
- Every Data Dawg athlete link opens the correct native profile
- Accessibility supports Dynamic Type and VoiceOver
- Dark mode is intentionally designed
- No webviews for core product screens
- No broken or empty navigation destinations
- Account deletion is available
- Crash-free session target: at least 99.5%

---

## 13. Success Metrics

### Activation

- User follows at least one athlete, school, college, or event
- User opens a profile
- User asks Data Dawg a question
- User enables notifications

### Engagement

- Weekly active users
- Profiles viewed per active user
- Data Dawg questions per active user
- Calendar saves
- Commitment feed opens
- Ranking views

### Retention

- Week 1 and Week 4 retention
- Percentage of active users following at least three entities
- Push open rate by notification type
- Return rate after event and ranking alerts

### Trust

- Data Dawg “something is off” rate
- Profile correction rate
- Verified commitment accuracy
- Messaging report rate

---

## 14. Key Decisions Before Development

1. Is the app branded **RecruitNC**, **NC United**, or “RecruitNC by NC United”?
2. Is messaging required for v1, or can it follow in v1.1?
3. Is the first audience athletes/parents, coaches, or all users?
4. Which messaging system becomes canonical?
5. Which follow events trigger push at launch?
6. Will coach CRM features be included in the same app or remain web-first?
7. Who owns profile verification and correction review?

---

## 15. Recommended Product Position

Launch as:

> **RecruitNC — North Carolina Wrestling**
>
> Rankings, athlete profiles, college commitments, schedules, messages, and Data Dawg intelligence in one premium app.

The strongest launch story is not “the website now has an app.” It is:

> **Everything happening in North Carolina wrestling—personalized for you.**
