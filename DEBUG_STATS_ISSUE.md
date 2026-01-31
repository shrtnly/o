# 🔍 Debug Guide - Stats Not Showing Issue

## Problem
The XP, Gems, and Hearts are not visible in the `_statsRow_1idd5_1363` box on the right sidebar.

## Quick Fix Steps

### Step 1: Check Browser Console
1. Open your browser to http://localhost:5173
2. Press **F12** to open Developer Tools
3. Go to the **Console** tab
4. Navigate to a learning page (e.g., `/learn/COURSE_ID`)
5. Look for these console messages:

```
LearningPage - Fetched profile data: {id: "...", xp: 250, gems: 120, hearts: 8, ...}
LearningPage - Profile XP: 250
LearningPage - Profile Gems: 120
LearningPage - Profile Hearts: 8

StatsSidebar - Profile data: {id: "...", xp: 250, gems: 120, hearts: 8, ...}
StatsSidebar - XP: 250
StatsSidebar - Gems: 120
StatsSidebar - Hearts: 8
```

### Step 2: Diagnose the Issue

#### ✅ If you see the console logs with values:
**Problem:** Data is loading but not displaying (CSS or rendering issue)

**Solution:**
1. Check if the statsRow element exists in the DOM:
   - Right-click on the sidebar
   - Click "Inspect Element"
   - Look for `<div class="LearningPage_statsRow__...">` 
   - Check if the XP/Gems/Hearts values are inside

2. If the element exists but is hidden:
   - Check the CSS styles in the inspector
   - Look for `display: none` or `visibility: hidden`
   - Check if the background color matches the text color

#### ❌ If you see `undefined` or `null` values:
**Problem:** Profile data is not in the database

**Solution:**
1. Open Supabase SQL Editor
2. Run this query:
```sql
-- Get your user ID
SELECT id, email FROM auth.users LIMIT 1;

-- Check your profile (replace YOUR_USER_ID)
SELECT * FROM profiles WHERE id = 'YOUR_USER_ID';
```

3. If the profile doesn't have XP/Gems/Hearts, run:
```sql
UPDATE profiles 
SET xp = 250, gems = 120, hearts = 8 
WHERE id = 'YOUR_USER_ID';
```

#### ❌ If you see NO console logs at all:
**Problem:** Page is not loading or user is not authenticated

**Solution:**
1. Check if you're logged in
2. Check the Network tab for errors
3. Verify the course ID is valid

### Step 3: Check Database Schema

Run this in Supabase SQL Editor:
```sql
-- Check if columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('xp', 'gems', 'hearts');
```

**Expected output:** Should show 3 rows (xp, gems, hearts)

If columns are missing, run:
```sql
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS gems INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS hearts INTEGER DEFAULT 10;
```

### Step 4: Force Refresh Profile Data

If data exists but isn't showing:
1. Hard refresh the browser: **Ctrl + Shift + R**
2. Clear browser cache
3. Try in incognito mode

### Step 5: Check CSS Visibility

Open browser inspector on the statsRow element and check:
```css
/* Should be visible */
.statsRow {
    display: flex;  /* ✅ Not 'none' */
    opacity: 1;     /* ✅ Not 0 */
    visibility: visible; /* ✅ Not 'hidden' */
}

.statItem span {
    color: #fff;    /* ✅ Should contrast with background */
    font-size: 1.1rem; /* ✅ Should be visible */
}
```

## Common Issues & Solutions

### Issue 1: Values show as "0"
**Cause:** Profile exists but values are 0
**Fix:** Update profile with dummy data (see Step 2 solution)

### Issue 2: statsRow is invisible
**Cause:** CSS display issue
**Fix:** Check if parent element has `display: none` or check z-index

### Issue 3: Icons show but no numbers
**Cause:** Font color matches background
**Fix:** Check the span color in CSS inspector

### Issue 4: Entire sidebar is missing
**Cause:** Component not rendering
**Fix:** Check if StatsSidebar is being imported and used in LearningPage

## Quick Test

Run this in browser console (F12):
```javascript
// Check if profile state exists
console.log('Profile state:', window.profile);

// Check if statsRow exists in DOM
console.log('StatsRow element:', document.querySelector('[class*="statsRow"]'));

// Check if values are in the DOM
const statsRow = document.querySelector('[class*="statsRow"]');
if (statsRow) {
    console.log('StatsRow HTML:', statsRow.innerHTML);
}
```

## Expected Result

After fixing, you should see:
```
┌─────────────────────────┐
│  Course Selector ▼      │
├─────────────────────────┤
│ ⚡ 250  💎 120  ❤️ 8   │  ← This should be visible
├─────────────────────────┤
│  Unlock Leaderboard     │
└─────────────────────────┘
```

## Next Steps

1. Open browser console (F12)
2. Navigate to learning page
3. Check console logs
4. Report back what you see:
   - Are the console logs showing?
   - What are the XP/Gems/Hearts values?
   - Is the statsRow element in the DOM?
   - Any errors in console?

---

**Status:** Debugging mode enabled
**Action:** Check browser console and report findings
