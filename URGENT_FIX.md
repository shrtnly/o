# 🚨 URGENT FIX - Profile Null & Survey Error

## Problems Identified

From your console screenshot:
1. ❌ **Profile data is `null`** - No profile exists in database
2. ❌ **Survey error** - `survey_responses` table doesn't exist
3. ❌ **XP, Gems, Hearts are `undefined`** - Because profile is null

## 🔧 Quick Fix (5 Minutes)

### Step 1: Create Missing Tables (1 minute)

1. Open **Supabase SQL Editor**
2. Copy and paste the **entire content** of `create_survey_tables.sql`
3. Click **Run**
4. Wait for success message

This creates:
- ✅ `survey_responses` table
- ✅ `user_courses` table
- ✅ RLS policies

### Step 2: Fix Profile Issue (2 minutes)

1. In **Supabase SQL Editor**, run this query:

```sql
-- Check if you have a profile
SELECT 
    u.id as user_id,
    u.email,
    p.id as profile_id,
    p.xp,
    p.gems,
    p.hearts
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email = 'YOUR_EMAIL_HERE';  -- Replace with your email
```

2. **If `profile_id` is NULL**, run this to create it:

```sql
-- Create profile for all users who don't have one
INSERT INTO profiles (id, xp, gems, hearts, max_hearts)
SELECT 
    u.id,
    250 as xp,
    120 as gems,
    8 as hearts,
    10 as max_hearts
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;
```

3. **If profile exists but values are NULL**, run this:

```sql
-- Get your user ID first
SELECT id, email FROM auth.users LIMIT 1;

-- Update profile (replace YOUR_USER_ID)
UPDATE profiles 
SET 
    xp = COALESCE(xp, 250),
    gems = COALESCE(gems, 120),
    hearts = COALESCE(hearts, 8),
    max_hearts = COALESCE(max_hearts, 10)
WHERE id = 'YOUR_USER_ID';
```

### Step 3: Verify Fix (1 minute)

Run this query:
```sql
SELECT 
    u.email,
    p.xp,
    p.gems,
    p.hearts,
    p.max_hearts
FROM auth.users u
INNER JOIN profiles p ON u.id = p.id
LIMIT 1;
```

**Expected output:**
```
email: your@email.com
xp: 250
gems: 120
hearts: 8
max_hearts: 10
```

### Step 4: Test in Browser (1 minute)

1. **Hard refresh** browser: `Ctrl + Shift + R`
2. **Navigate** to learning page
3. **Check console** (F12) - should now show:
   ```
   LearningPage - Profile XP: 250
   LearningPage - Profile Gems: 120
   LearningPage - Profile Hearts: 8
   ```
4. **Check sidebar** - should display:
   ```
   ⚡ 250  💎 120  ❤️ 8
   ```

## 🎯 Alternative: One-Command Fix

If you want to fix everything in one go, run this:

```sql
-- 1. Create survey_responses table
CREATE TABLE IF NOT EXISTS public.survey_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    answers JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create user_courses table
CREATE TABLE IF NOT EXISTS public.user_courses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, course_id)
);

-- 3. Create profiles for users without one
INSERT INTO profiles (id, xp, gems, hearts, max_hearts)
SELECT 
    u.id,
    250 as xp,
    120 as gems,
    8 as hearts,
    10 as max_hearts
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- 4. Update existing profiles with default values
UPDATE profiles 
SET 
    xp = COALESCE(xp, 250),
    gems = COALESCE(gems, 120),
    hearts = COALESCE(hearts, 8),
    max_hearts = COALESCE(max_hearts, 10);

-- 5. Enable RLS
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_courses ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies
CREATE POLICY IF NOT EXISTS "Users can view their own survey responses" 
ON public.survey_responses FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own survey responses" 
ON public.survey_responses FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can view their own enrolled courses" 
ON public.user_courses FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can enroll themselves in courses" 
ON public.user_courses FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 7. Verify everything
SELECT 'All tables created and profiles updated!' as status;
```

## ✅ Success Checklist

After running the fixes:

- [ ] `survey_responses` table exists
- [ ] `user_courses` table exists
- [ ] Your profile exists with XP/Gems/Hearts
- [ ] Console shows profile data (not null)
- [ ] Sidebar displays stats
- [ ] Survey completion works without errors

## 🐛 If Still Not Working

### Check 1: Profile exists?
```sql
SELECT COUNT(*) FROM profiles;
```
Should return > 0

### Check 2: Your specific profile?
```sql
SELECT * FROM profiles WHERE id = (SELECT id FROM auth.users LIMIT 1);
```
Should return your profile data

### Check 3: Tables exist?
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('survey_responses', 'user_courses', 'profiles');
```
Should return 3 rows

## 📞 Still Having Issues?

If the problem persists:
1. Share the output of the verification queries
2. Check if there are any errors in Supabase logs
3. Verify you're logged in with the correct account

---

**Priority:** HIGH - Fix this immediately to continue testing
**Time Required:** 5 minutes
**Files to Use:** 
- `create_survey_tables.sql`
- `fix_profile_issue.sql`
