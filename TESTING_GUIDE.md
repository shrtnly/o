# O-Sekha Reward System - Manual Testing Guide

## ✅ Build Status: SUCCESS
The code has been successfully built with no errors!

## 🧪 Testing Steps

### Step 1: Run Database Migrations

1. Open Supabase Dashboard (https://supabase.com)
2. Go to your project: `pvkjocuofxlyrnyndpju`
3. Click on "SQL Editor" in the left sidebar
4. Create a new query
5. Copy and paste the **entire content** of `database_migration_rewards.sql`
6. Click "Run" or press `Ctrl+Enter`
7. Wait for success message

**Expected Output:**
```
Success. No rows returned
```

### Step 2: Verify Migration Success

Run this query in Supabase SQL Editor:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_reward_transactions');

-- Check if functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('award_user_xp', 'award_user_gems', 'deduct_user_hearts');

-- Check if view exists
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name = 'user_stats_summary';
```

**Expected Output:**
- Should return 1 row for `user_reward_transactions`
- Should return 3 rows for the functions
- Should return 1 row for the view

### Step 3: Get Your User ID

```sql
-- Get your user ID
SELECT id, email FROM auth.users LIMIT 1;
```

Copy the `id` value - you'll need it for the next steps.

### Step 4: Add Dummy Test Data

Replace `YOUR_USER_ID_HERE` with your actual user ID from Step 3:

```sql
-- Set initial values for testing
UPDATE profiles 
SET xp = 150, gems = 75, hearts = 8 
WHERE id = 'YOUR_USER_ID_HERE';

-- Verify the update
SELECT id, xp, gems, hearts FROM profiles WHERE id = 'YOUR_USER_ID_HERE';
```

**Expected Output:**
```
id: YOUR_USER_ID_HERE
xp: 150
gems: 75
hearts: 8
```

### Step 5: Test Database Functions

```sql
-- Replace YOUR_USER_ID_HERE with your actual user ID
DO $$
DECLARE
    v_user_id UUID := 'YOUR_USER_ID_HERE'; -- ⚠️ REPLACE THIS!
    v_xp_result RECORD;
    v_gem_result RECORD;
    v_heart_result RECORD;
BEGIN
    -- Test 1: Award 10 XP (simulating 10 correct MCQ answers)
    SELECT * INTO v_xp_result FROM award_user_xp(
        v_user_id,
        10,
        'mcq_correct',
        NULL,
        NULL,
        '{"total_questions": 10, "correct_answers": 10, "accuracy": 100}'::jsonb
    );
    RAISE NOTICE 'Test 1 - XP Award: New XP = %', v_xp_result.new_xp;

    -- Test 2: Award 25 Gems (simulating mystery box)
    SELECT * INTO v_gem_result FROM award_user_gems(
        v_user_id,
        25,
        'mystery_box',
        NULL,
        NULL,
        '{"box_type": "mystery"}'::jsonb
    );
    RAISE NOTICE 'Test 2 - Gem Award: New Gems = %', v_gem_result.new_gems;

    -- Test 3: Deduct 1 Heart (simulating wrong answer)
    SELECT * INTO v_heart_result FROM deduct_user_hearts(
        v_user_id,
        1
    );
    RAISE NOTICE 'Test 3 - Heart Deduction: New Hearts = %', v_heart_result.new_hearts;
END $$;

-- View final results
SELECT id, xp, gems, hearts FROM profiles WHERE id = 'YOUR_USER_ID_HERE';
```

**Expected Output:**
```
NOTICE: Test 1 - XP Award: New XP = 160
NOTICE: Test 2 - Gem Award: New Gems = 100
NOTICE: Test 3 - Heart Deduction: New Hearts = 7

Final values:
xp: 160 (150 + 10)
gems: 100 (75 + 25)
hearts: 7 (8 - 1)
```

### Step 6: Check Transaction History

```sql
-- View transaction history
SELECT 
    transaction_type,
    amount,
    source,
    metadata,
    created_at
FROM user_reward_transactions 
WHERE user_id = 'YOUR_USER_ID_HERE'
ORDER BY created_at DESC
LIMIT 10;
```

**Expected Output:**
Should show 3 transactions:
1. `xp_earned` - 10 - `mcq_correct`
2. `gem_earned` - 25 - `mystery_box`
3. `heart_lost` - 1 - `mcq_correct`

### Step 7: Test in Browser

1. Open your browser and go to: `http://localhost:5173`
2. Login with your account
3. Navigate to any course learning page: `http://localhost:5173/learn/COURSE_ID`
4. Check the **right sidebar** - you should see:
   - ⚡ XP: 160
   - 💎 Gems: 100
   - ❤️ Hearts: 7

5. Click on a chapter to start studying
6. Answer some MCQ questions:
   - **Correct answer** → Should see +1 XP in completion stats
   - **Wrong answer** → Should see hearts decrease by 1

7. Complete the chapter and check the completion statistics card:
   - Should show "অর্জিত XP: +X" where X = number of correct answers

### Step 8: Verify Real-time Updates

After completing a chapter:

```sql
-- Check updated profile
SELECT id, xp, gems, hearts FROM profiles WHERE id = 'YOUR_USER_ID_HERE';

-- Check latest transactions
SELECT 
    transaction_type,
    amount,
    source,
    metadata->>'accuracy' as accuracy,
    created_at
FROM user_reward_transactions 
WHERE user_id = 'YOUR_USER_ID_HERE'
ORDER BY created_at DESC
LIMIT 5;

-- Check user progress
SELECT 
    chapter_id,
    total_questions,
    correct_answers,
    xp_earned,
    completed_at
FROM user_progress 
WHERE user_id = 'YOUR_USER_ID_HERE'
AND is_completed = true
ORDER BY completed_at DESC
LIMIT 5;
```

## 🐛 Troubleshooting

### Issue: Functions not found
**Solution:** Run the migration script again. Make sure you copied the ENTIRE file.

### Issue: XP not updating in sidebar
**Solution:** 
1. Check browser console for errors (F12)
2. Verify the migration was successful
3. Hard refresh the page (Ctrl+Shift+R)

### Issue: Hearts not decreasing
**Solution:**
1. Check if `deduct_user_hearts` function exists
2. Check browser console for errors
3. Verify you're logged in

### Issue: Transaction history is empty
**Solution:**
1. Complete at least one chapter
2. Check if RLS policies are enabled
3. Verify user_id matches your auth.users id

## 📊 Expected Behavior

### When answering MCQ:
- ✅ Correct answer: +1 XP (no immediate update, awarded at chapter completion)
- ✅ Wrong answer: -1 Heart (immediate update)

### When completing chapter:
- ✅ XP awarded = number of correct answers
- ✅ Transaction logged in `user_reward_transactions`
- ✅ Progress saved in `user_progress` with statistics
- ✅ Sidebar updates automatically

### When opening mystery box:
- ✅ Gems/Hearts awarded based on box type
- ✅ Transaction logged
- ✅ Sidebar updates immediately

## ✨ Success Criteria

- [ ] Migration runs without errors
- [ ] Functions exist in database
- [ ] Dummy data inserted successfully
- [ ] Test functions work correctly
- [ ] Sidebar shows correct XP, Gems, Hearts
- [ ] Completing chapter awards XP (1 per correct answer)
- [ ] Wrong answers deduct hearts
- [ ] Transaction history is populated
- [ ] User progress tracks statistics

## 🎯 Quick Verification Checklist

Run these queries to verify everything is working:

```sql
-- 1. Check migration
SELECT COUNT(*) FROM user_reward_transactions; -- Should return a number

-- 2. Check functions
SELECT award_user_xp('YOUR_USER_ID_HERE'::uuid, 1, 'mcq_correct', NULL, NULL, '{}'::jsonb);

-- 3. Check profile
SELECT xp, gems, hearts FROM profiles WHERE id = 'YOUR_USER_ID_HERE';

-- 4. Check stats view
SELECT * FROM user_stats_summary WHERE user_id = 'YOUR_USER_ID_HERE';
```

All queries should return results without errors!

---

**Need Help?** Check the `REWARD_SYSTEM_DOCS.md` file for detailed documentation.
