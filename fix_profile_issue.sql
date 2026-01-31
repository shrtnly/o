-- ============================================
-- FIX PROFILE ISSUE
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Check if you have a profile
SELECT 
    u.id as user_id,
    u.email,
    p.id as profile_id,
    p.xp,
    p.gems,
    p.hearts
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LIMIT 5;

-- If profile_id is NULL, you need to create profiles

-- Step 2: Create profiles for users who don't have one
INSERT INTO profiles (id, xp, gems, hearts, max_hearts)
SELECT 
    u.id,
    0 as xp,
    0 as gems,
    10 as hearts,
    10 as max_hearts
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- Step 3: Verify profiles were created
SELECT 
    u.id as user_id,
    u.email,
    p.xp,
    p.gems,
    p.hearts,
    p.max_hearts
FROM auth.users u
INNER JOIN profiles p ON u.id = p.id
LIMIT 5;

-- Step 4: Update your profile with dummy data
-- First, get your user ID
SELECT id, email FROM auth.users WHERE email = 'YOUR_EMAIL_HERE' LIMIT 1;

-- Then update (replace YOUR_USER_ID)
UPDATE profiles 
SET 
    xp = 250,
    gems = 120,
    hearts = 8,
    max_hearts = 10
WHERE id = 'YOUR_USER_ID';

-- Step 5: Verify the update
SELECT id, xp, gems, hearts, max_hearts 
FROM profiles 
WHERE id = 'YOUR_USER_ID';
