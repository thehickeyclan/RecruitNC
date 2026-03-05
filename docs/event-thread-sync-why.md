# Why a registration might not add anyone to the event thread

## How thread sync works

For event-linked threads (e.g. NHSCA Duals 2026), **one RecruitNC user** is added to the thread per **paid registration**. That user is determined only by:

1. **`parent_user_id`** on the registration (set when the parent previously loaded the hub while signed in), or  
2. **`parent_email`** on the registration → we look up a RecruitNC account (Supabase Auth + `user_profiles`) with that **exact email**. If we find one, we add that user and backfill `parent_user_id`.

We do **not** use the athlete’s name or `athlete_email` for thread membership. So “who gets added” is always the **account that owns the parent/guardian email**.

## Why someone might be “missing” (e.g. Tobin McNair)

- **Dad registered with dad’s email, and dad has no RecruitNC account**  
  Then `parent_email` does not match any user. We never get a `user_id`, so **no one** is added for that registration. The household (e.g. “Tobin McNair”) won’t appear in the thread until:
  - The parent signs up at RecruitNC with that same email and loads the hub (so we can backfill `parent_user_id`), or  
  - Someone with access adds them via **Add RecruitNC user** in the thread (or hub workspace) by searching for the parent’s email or name.

- **Dad registered with dad’s email, and Tobin has his own RecruitNC account**  
  We only add the **parent** (the account tied to `parent_email`). Tobin’s account is not added automatically. To get Tobin in the thread, any member (or admin) can use **Add RecruitNC user** and search for Tobin.

- **Dad registered with Tobin’s email by mistake**  
  Then we try to resolve Tobin’s email. If Tobin has a RecruitNC account with that email, Tobin gets added (not dad). If Tobin doesn’t have an account, no one is added.

## How to fix a missing person

1. **Check the registration**  
   In `national_team_event_registrations`, find the row for that athlete (e.g. Tobin McNair). Note `parent_email` and `parent_user_id`.

2. **If `parent_user_id` is null**  
   The parent email didn’t resolve. Either:
   - Have that parent sign up at RecruitNC with **that exact email** and open the event hub once (sync will run and backfill), or  
   - Have an admin or any thread member use **Add RecruitNC user** and add the parent (or the athlete, if they have their own account) by search.

3. **Server logs**  
   When the hub runs sync, we log unresolved parent emails:  
   `[RecruitNC] hub sync: parent_email had no RecruitNC account (no thread add)` with the event and the email(s). That confirms “this registration’s parent_email has no RecruitNC user.”

## Summary

- **Only `parent_email` (or `parent_user_id`) is used** to decide who is auto-added to the event thread.  
- If the parent signed up for the event with an email that **doesn’t have a RecruitNC account**, nobody is added until they sign up with that email or are added manually.  
- Athletes with their own RecruitNC accounts are not auto-added; they can be added via **Add RecruitNC user** in the thread or hub.
