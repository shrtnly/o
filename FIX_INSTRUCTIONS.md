# ✅ SIMPLE FIX - No More Errors!

## The Problem
You got this error:
```
ERROR: 42703: column "user_id" does not exist
```

This happened because the RLS policy tried to use `user_id` before the table was fully created.

## ✅ The Solution (1 Minute)

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase dashboard
2. Click "SQL Editor" in the left sidebar
3. Click "New query"

### Step 2: Copy and Paste
1. Open the file: **`SIMPLE_FIX.sql`**
2. Copy the **ENTIRE** content
3. Paste it into the SQL Editor

### Step 3: Run
1. Click the **"Run"** button (or press Ctrl+Enter)
2. Wait for the success message

### Step 4: Verify
You should see output like:
```
status: "Tables created successfully!"

email: your@email.com
xp: 250
gems: 120
hearts: 8
max_hearts: 10
```

### Step 5: Refresh Browser
1. Go back to your app: `http://localhost:5173`
2. Hard refresh: **Ctrl + Shift + R**
3. Navigate to a learning page
4. Check the sidebar - stats should now be visible!

## What This Script Does

✅ Creates `survey_responses` table
✅ Creates `user_courses` table  
✅ Adds indexes for performance
✅ Enables Row Level Security
✅ Creates RLS policies
✅ Creates/updates your profile with dummy data
✅ Shows your profile to verify

## Expected Result

After running the script and refreshing your browser:

**Console should show:**
```
LearningPage - Profile XP: 250
LearningPage - Profile Gems: 120
LearningPage - Profile Hearts: 8
StatsSidebar - XP: 250
StatsSidebar - Gems: 120
StatsSidebar - Hearts: 8
```

**Sidebar should display:**
```
┌──────────────────────┐
│  Course Selector ▼   │
├──────────────────────┤
│  ⚡ 250 💎 120 ❤️ 8 │
├──────────────────────┤
│  Unlock Leaderboard  │
└──────────────────────┘
```

**Survey should work:**
- No more "user_id does not exist" error
- Completing survey enrolls you in course
- Course appears in Course Selector

## If You Still Get Errors

### Error: "relation already exists"
**This is OK!** It means the table was already created. The script will skip it and continue.

### Error: "policy already exists"  
**This is OK!** The script drops old policies first, so this shouldn't happen, but if it does, it's harmless.

### Error: "permission denied"
**Problem:** You don't have permission to create tables.
**Solution:** Make sure you're using the Supabase SQL Editor, not a regular SQL client.

## Troubleshooting

### Tables created but profile still null?

Run this:
```sql
SELECT id, email FROM auth.users LIMIT 1;
-- Copy the ID

SELECT * FROM profiles WHERE id = 'PASTE_ID_HERE';
-- If this returns nothing, run:

INSERT INTO profiles (id, xp, gems, hearts, max_hearts)
VALUES ('PASTE_ID_HERE', 250, 120, 8, 10);
```

### Stats still not showing?

1. Check browser console (F12)
2. Look for the debug logs
3. If profile is still null, run the INSERT query above
4. Hard refresh browser

## Success Checklist

- [ ] Ran `SIMPLE_FIX.sql` in Supabase
- [ ] Saw "Tables created successfully!" message
- [ ] Saw your profile with XP/Gems/Hearts
- [ ] Refreshed browser (Ctrl+Shift+R)
- [ ] Console shows profile data (not null)
- [ ] Sidebar displays stats
- [ ] Survey works without errors

---

**File to use:** `SIMPLE_FIX.sql`  
**Time required:** 1 minute  
**Difficulty:** Easy - just copy and paste!
