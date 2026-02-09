# Fix division in one place: Supabase

Division is read **only** from the table `college_division_mappings`. If a division is wrong, that table has the wrong or missing row.

**Supabase Dashboard → Table Editor → `college_division_mappings`**

Edit the `division` column or add rows. Use exactly: **NCAA Division I**, **NCAA Division II**, **NCAA Division III**, **NAIA**, or **NJCAA**. `college_name` must match what appears in athlete records.

To bulk-fix, run the SQL script (ask for "college division mappings SQL" or get it from the admin College division mappings page) in Supabase → SQL Editor. Then refresh the Blue page.
