-- ============================================
-- FIX STREAK CALCULATION
-- This script creates a function to calculate streaks
-- and a trigger to update them automatically
-- ============================================

-- Function to calculate current streak from user_daily_activity
CREATE OR REPLACE FUNCTION calculate_user_streak(p_user_id UUID)
RETURNS TABLE(current_streak INTEGER, longest_streak INTEGER) AS $$
DECLARE
    v_current_streak INTEGER := 0;
    v_longest_streak INTEGER := 0;
    v_temp_streak INTEGER := 0;
    v_last_date DATE := NULL;
    v_activity_record RECORD;
BEGIN
    -- Get all activity dates for the user, ordered by date descending
    FOR v_activity_record IN
        SELECT DISTINCT activity_date::DATE as activity_date
        FROM user_daily_activity
        WHERE user_id = p_user_id
        ORDER BY activity_date DESC
    LOOP
        -- First record
        IF v_last_date IS NULL THEN
            v_temp_streak := 1;
            v_last_date := v_activity_record.activity_date;
        -- Check if consecutive day
        ELSIF v_activity_record.activity_date = v_last_date - INTERVAL '1 day' THEN
            v_temp_streak := v_temp_streak + 1;
            v_last_date := v_activity_record.activity_date;
        -- Streak broken
        ELSE
            -- Update longest streak if needed
            IF v_temp_streak > v_longest_streak THEN
                v_longest_streak := v_temp_streak;
            END IF;
            -- Reset temp streak
            v_temp_streak := 1;
            v_last_date := v_activity_record.activity_date;
        END IF;
    END LOOP;

    -- Check if current streak is still active (last activity was today or yesterday)
    IF v_last_date IS NOT NULL THEN
        IF v_last_date >= CURRENT_DATE - INTERVAL '1 day' THEN
            v_current_streak := v_temp_streak;
        ELSE
            v_current_streak := 0;
        END IF;
        
        -- Update longest streak one more time
        IF v_temp_streak > v_longest_streak THEN
            v_longest_streak := v_temp_streak;
        END IF;
    END IF;

    RETURN QUERY SELECT v_current_streak, v_longest_streak;
END;
$$ LANGUAGE plpgsql;

-- Function to update user_streaks table
CREATE OR REPLACE FUNCTION update_user_streaks(p_user_id UUID)
RETURNS void AS $$
DECLARE
    v_current_streak INTEGER;
    v_longest_streak INTEGER;
    v_last_activity_date DATE;
BEGIN
    -- Calculate streaks
    SELECT * INTO v_current_streak, v_longest_streak
    FROM calculate_user_streak(p_user_id);

    -- Get last activity date
    SELECT MAX(activity_date::DATE) INTO v_last_activity_date
    FROM user_daily_activity
    WHERE user_id = p_user_id;

    -- Insert or update user_streaks
    INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_activity_date, updated_at)
    VALUES (p_user_id, v_current_streak, v_longest_streak, v_last_activity_date, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
        current_streak = EXCLUDED.current_streak,
        longest_streak = GREATEST(user_streaks.longest_streak, EXCLUDED.longest_streak),
        last_activity_date = EXCLUDED.last_activity_date,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger function to update streaks when activity is recorded
CREATE OR REPLACE FUNCTION trigger_update_user_streaks()
RETURNS TRIGGER AS $$
BEGIN
    -- Update streaks for the user
    PERFORM update_user_streaks(NEW.user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_streaks_on_activity ON user_daily_activity;

-- Create trigger on user_daily_activity
CREATE TRIGGER update_streaks_on_activity
AFTER INSERT OR UPDATE ON user_daily_activity
FOR EACH ROW
EXECUTE FUNCTION trigger_update_user_streaks();

-- ============================================
-- RECALCULATE ALL EXISTING STREAKS
-- Run this to fix current data
-- ============================================

-- Recalculate streaks for all users who have activity
DO $$
DECLARE
    v_user RECORD;
BEGIN
    FOR v_user IN
        SELECT DISTINCT user_id FROM user_daily_activity
    LOOP
        PERFORM update_user_streaks(v_user.user_id);
    END LOOP;
    
    RAISE NOTICE 'Streaks recalculated for all users';
END $$;

-- ============================================
-- VERIFICATION QUERY
-- Run this to check if streaks are correct
-- ============================================

SELECT 
    us.user_id,
    us.current_streak,
    us.longest_streak,
    us.last_activity_date,
    (SELECT COUNT(DISTINCT activity_date::DATE) 
     FROM user_daily_activity 
     WHERE user_id = us.user_id) as total_active_days,
    (SELECT MIN(activity_date::DATE) 
     FROM user_daily_activity 
     WHERE user_id = us.user_id) as first_activity,
    (SELECT MAX(activity_date::DATE) 
     FROM user_daily_activity 
     WHERE user_id = us.user_id) as last_activity
FROM user_streaks us
ORDER BY us.current_streak DESC;
