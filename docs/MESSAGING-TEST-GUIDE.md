# How to test RecruitNC Messaging

## Prerequisites

1. **Schema applied**  
   If you haven’t already, run the full messaging schema in **Supabase → SQL Editor** (from `docs/MESSAGING-TECHNICAL-PRD.md` §1): create `messaging_threads`, `messaging_thread_members`, `messaging_messages`, indexes, RLS, and policies.

2. **Signed-in user**  
   Use an account you can sign in with (e.g. your admin account).

---

## Step 1: Get your user ID

In **Supabase → Authentication → Users**, open your user and copy the **User UID** (e.g. `a1b2c3d4-e5f6-7890-abcd-ef1234567890`).  
You’ll use it in the next step.

---

## Step 2: Create a test thread and add yourself

Run this in **Supabase → SQL Editor**. Replace **`your-email@example.com`** with the email you use to sign in (the rest is automatic):

```sql
WITH new_thread AS (
  INSERT INTO messaging_threads (type, name, context_type, context_id, created_at, last_message_at)
  VALUES ('group', 'NHSCA Duals 2026', 'event', 'nhsca-duals-2026', now(), now())
  RETURNING id
),
my_user AS (
  SELECT id FROM auth.users WHERE email = 'your-email@example.com' LIMIT 1
)
INSERT INTO messaging_thread_members (thread_id, user_id, role, notification_level)
SELECT t.id, u.id, 'admin', 'all'
FROM new_thread t
CROSS JOIN my_user u;
```

If you prefer to use your User UID instead of email, use this and replace the UUID with the one from Step 1:

```sql
WITH new_thread AS (
  INSERT INTO messaging_threads (type, name, context_type, context_id, created_at, last_message_at)
  VALUES ('group', 'NHSCA Duals 2026', 'event', 'nhsca-duals-2026', now(), now())
  RETURNING id
)
INSERT INTO messaging_thread_members (thread_id, user_id, role, notification_level)
SELECT id, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 'admin', 'all'
FROM new_thread;
```
(Use your real UUID, e.g. from Supabase → Authentication → Users.)

---

## Step 3: Test in the app

1. **Inbox**  
   Sign in → click **Messages** in the nav (or go to `/messages`).  
   You should see **NHSCA Duals 2026** in the list.

2. **Open thread**  
   Click the thread. URL will be `/messages/[threadId]`.  
   You should see the thread view with “No messages yet” and a composer at the bottom.

3. **Send a message**  
   Type in the box and press Enter or click Send.  
   The message should appear in the thread.

4. **Unread (optional)**  
   From another browser or incognito, sign in as a different user and add that user to the same thread in Supabase (`messaging_thread_members`). Send a message as the first user; the second user should see an unread count in the inbox until they open the thread.

---

## Quick checklist

- [ ] Schema run in Supabase (tables + RLS)
- [ ] User UID copied from Auth
- [ ] Seed SQL run with your UID
- [ ] Signed in → **Messages** → see thread
- [ ] Open thread → send message → message appears

---

## Optional: second user for 2-person test

1. Create a second account (or use an existing one) and get its User UID from Supabase Auth.
2. Get the thread ID:  
   `SELECT id FROM messaging_threads WHERE name = 'NHSCA Duals 2026' LIMIT 1;`
3. Add the second user:  
   `INSERT INTO messaging_thread_members (thread_id, user_id, role) VALUES ('THREAD_ID', 'SECOND_USER_UID', 'member');`
4. Sign in as the second user → Messages → open the same thread; both users can send and see messages.
