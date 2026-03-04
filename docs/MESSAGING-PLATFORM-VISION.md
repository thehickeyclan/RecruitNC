# RecruitNC Messaging — Vision & Principles

**Goal:** One platform-wide messaging layer that feels **simple, clean, modern, and elite** — better than GroupMe. Coaches ↔ athletes/parents, user-to-user, and private groups (e.g. NHSCA Duals). Optional public/semi-public discussions later.

---

## Why “better than GroupMe”

- **One place.** No app sprawl. In-app only (or plus optional email digest). Everything lives in RecruitNC.
- **Clear hierarchy.** One inbox: DMs, then groups. No “which group was that?” — names and context are obvious.
- **Quiet by default.** No random @everyone spam. Notifications are controllable; threads don’t blow up your phone unless you choose.
- **Obvious who’s who.** Real names, roles (Coach, Parent, Athlete), and context (e.g. “NHSCA Duals 2026”) so it feels professional, not chaotic.
- **Fast and reliable.** Send, read, and scroll without lag or clutter. No gimmicks — just messages that work.
- **Trust and safety.** Only the right people are in each space. Coaches see only their scope; groups are gated (e.g. paid roster, Blue members).

---

## Principles (non‑negotiable)

1. **Simplicity first.** Every screen has one job. No feature creep. If it doesn’t make “send/read/respond” better, cut it for V1.
2. **One inbox.** All conversations (DMs + groups) in one list. Unread and “last message” visible at a glance. No separate “team chat” vs “DMs” silos that feel like different products.
3. **Context over noise.** Every thread has a clear name and purpose. Joining a group is intentional; you’re not dropped into 50 channels.
4. **Mobile-first, desktop-great.** Works perfectly on phone; same experience on desktop. Clean typography, plenty of whitespace, no tiny touch targets.
5. **Elite, not “social app.”** Tone is professional and supportive. Feels like a tool for serious athletes and coaches, not a generic chat app.
6. **Performance and reliability.** Messages send quickly; list and thread load fast. No “better than GroupMe” if it’s slow or flaky.

---

## What we explicitly avoid

- **GroupMe’s pain points:** Notification overload, unclear threads, mixed personal/team chaos, “another app to check.”
- **Slack/Discord complexity:** No channels, no roles to configure, no bots for V1. Just conversations and clear membership.
- **Feature bloat:** No stickers, no stories, no “status” for V1. Focus on text (and maybe one clear “announcement” style for coaches).

---

## Scope (keep it tight)

**V1 — Private groups + one clear entry point**

- **Private groups only.** E.g. NHSCA Duals 2026, Blue 2026. Membership from existing data (registrations, Blue members). No public/open rooms yet.
- **One “Messages” or “Chat” in nav.** Opens to inbox: list of DMs (if we add 1:1 in V1) and groups. Tap a group → thread. Send message. Done.
- **Thread = messages in order.** Last message preview and unread count on list. Inside thread: chronological, newest at bottom. Optional: “Announcement” from coach/org (one-way, no reply-all storm).
- **Notifications:** Optional push/email; user controls. Default: notify for DMs and @mentions; group noise controlled per-thread (e.g. “all / mentions / mute”).

**V2 — 1:1 and coach → athlete**

- DMs between users. Coach can message athlete or parent from roster/CRM.
- Clear rules: who can message whom, consent, and “message requests” if we need a filter.

**V3 — Public / semi-public (only if needed)**

- GroupMe-like “discussions” or program-wide announcements. Still gated by program/event so it doesn’t become a free-for-all.

---

## UX tenets (implementation checklist)

- [ ] **Inbox list:** Avatar + name + last message preview + time + unread badge. Sorted by last activity.
- [ ] **Thread view:** Messages in bubbles (or clean blocks). Sender name + role/context when helpful. Timestamps subtle but available.
- [ ] **Compose:** Single input; send on Enter (or primary button). No formatting toolbar for V1.
- [ ] **Empty states:** “No messages yet” and “Start a conversation” (or “You’re in this group — say hi”) — never a blank confusing screen.
- [ ] **Loading:** Skeletons or minimal spinners; no full-page loader for thread open.
- [ ] **Access control:** Group membership from DB (e.g. `national_team_event_registrations` for NHSCA). No “invite link” that leaks; join = you’re already in the roster.

---

## Tech / data (high level)

- **Threads:** Each thread has type (dm vs group), name, and optional context_id (e.g. event_slug, program_id). Groups are private by default.
- **Members:** Thread membership table (user_id, thread_id, role?). Derived where possible (e.g. “all paid NHSCA Duals parents”) so we don’t duplicate membership logic.
- **Messages:** message_id, thread_id, sender_id, body, created_at. No edits/deletes for V1 to keep scope small (or one simple “delete for me” only).
- **Realtime:** Use Supabase Realtime (or similar) for “new message” in open thread and unread counts. Keep payloads small; no full message history over the wire for list.

---

## One-line summary

**Simple, one inbox, private groups first, clean UI, fast and reliable — so it feels elite and clearly better than GroupMe.**

Use this doc as the north star when designing and building. If a feature doesn’t make “simple, clean, elite” better, cut it from V1.
