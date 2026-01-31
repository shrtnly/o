-- ============================================
-- TEST DATA FOR O-SEKHA REWARD SYSTEM
-- Run this AFTER the main migration
-- ============================================

-- First, let's check if the migration was successful
DO $$
BEGIN
    -- Check if table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_reward_transactions') THEN
        RAISE NOTICE 'user_reward_transactions table exists ✓';
    ELSE
        RAISE EXCEPTION 'user_reward_transactions table does NOT exist! Run database_migration_rewards.sql first.';
    END IF;

    -- Check if functions exist
    IF EXISTS (SELECT FROM pg_proc WHERE proname = 'award_user_xp') THEN
        RAISE NOTICE 'award_user_xp function exists ✓';
    ELSE
        RAISE EXCEPTION 'award_user_xp function does NOT exist! Run database_migration_rewards.sql first.';
    END IF;
END $$;

-- ============================================
-- INSERT DUMMY TEST DATA
-- ============================================

-- Note: Replace 'YOUR_USER_ID_HERE' with an actual user ID from auth.users
-- You can get your user ID by running: SELECT id FROM auth.users LIMIT 1;

-- Test 1: Award 50 XP for completing MCQs
-- SELECT * FROM award_user_xp(
--     'YOUR_USER_ID_HERE'::uuid,
--     50,
--     'mcq_correct',
--     NULL,
--     NULL,
--     '{"total_questions": 10, "correct_answers": 5, "accuracy": 50}'::jsonb
-- );

-- Test 2: Award 25 Gems from mystery box
-- SELECT * FROM award_user_gems(
--     'YOUR_USER_ID_HERE'::uuid,
--     25,
--     'mystery_box',
--     NULL,
--     NULL,
--     '{}'::jsonb
-- );

-- Test 3: Deduct 2 hearts
-- SELECT * FROM deduct_user_hearts(
--     'YOUR_USER_ID_HERE'::uuid,
--     2
-- );

-- ============================================
-- VERIFY TEST DATA
-- ============================================

-- Check user profile (replace with your user ID)
-- SELECT id, xp, gems, hearts FROM profiles WHERE id = 'YOUR_USER_ID_HERE'::uuid;

-- Check transaction history (replace with your user ID)
-- SELECT 
--     transaction_type,
--     amount,
--     source,
--     metadata,
--     created_at
-- FROM user_reward_transactions 
-- WHERE user_id = 'YOUR_USER_ID_HERE'::uuid
-- ORDER BY created_at DESC
-- LIMIT 10;

-- Check user stats summary (replace with your user ID)
-- SELECT * FROM user_stats_summary WHERE user_id = 'YOUR_USER_ID_HERE'::uuid;

-- ============================================
-- QUICK TEST SCRIPT
-- ============================================
-- Copy this section and replace YOUR_USER_ID_HERE with your actual user ID

/*
-- Get your user ID first
SELECT id, email FROM auth.users LIMIT 1;

-- Then use that ID in the tests below:
DO $$
DECLARE
    v_user_id UUID := 'YOUR_USER_ID_HERE'; -- Replace this!
    v_xp_result RECORD;
    v_gem_result RECORD;
    v_heart_result RECORD;
BEGIN
    -- Test XP award
    SELECT * INTO v_xp_result FROM award_user_xp(
        v_user_id,
        100, -- Award 100 XP
        'mcq_correct',
        NULL,
        NULL,
        '{"test": true, "correct_answers": 10}'::jsonb
    );
    RAISE NOTICE 'XP Test: New XP = %, Transaction ID = %', v_xp_result.new_xp, v_xp_result.transaction_id;

    -- Test Gem award
    SELECT * INTO v_gem_result FROM award_user_gems(
        v_user_id,
        50, -- Award 50 gems
        'mystery_box',
        NULL,
        NULL,
        '{"test": true}'::jsonb
    );
    RAISE NOTICE 'Gem Test: New Gems = %, Transaction ID = %', v_gem_result.new_gems, v_gem_result.transaction_id;

    -- Test Heart deduction
    SELECT * INTO v_heart_result FROM deduct_user_hearts(
        v_user_id,
        1 -- Deduct 1 heart
    );
    RAISE NOTICE 'Heart Test: New Hearts = %, Transaction ID = %', v_heart_result.new_hearts, v_heart_result.transaction_id;

    -- Show final stats
    RAISE NOTICE '=== Final Stats ===';
    RAISE NOTICE 'Check the profiles table and user_reward_transactions table to see the results';
END $$;

-- View results
SELECT id, xp, gems, hearts FROM profiles WHERE id = 'YOUR_USER_ID_HERE';
SELECT * FROM user_reward_transactions WHERE user_id = 'YOUR_USER_ID_HERE' ORDER BY created_at DESC LIMIT 5;
*/

-- ============================================
-- RESET TEST DATA (if needed)
-- ============================================
/*
-- WARNING: This will delete all reward transactions for a user
-- DELETE FROM user_reward_transactions WHERE user_id = 'YOUR_USER_ID_HERE';

-- Reset user stats to default
-- UPDATE profiles SET xp = 0, gems = 0, hearts = 10 WHERE id = 'YOUR_USER_ID_HERE';
*/
