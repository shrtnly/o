-- ============================================
-- HEART REFILL SYSTEM
-- Implements automatic heart refill every 3 hours
-- ============================================

-- Step 1: Add heart refill tracking columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_heart_refill_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS hearts_refill_enabled BOOLEAN DEFAULT TRUE;

-- Step 2: Update existing profiles to set initial values
UPDATE profiles 
SET 
    hearts = CASE WHEN hearts IS NULL THEN 5 ELSE hearts END,
    max_hearts = CASE WHEN max_hearts IS NULL THEN 5 ELSE max_hearts END,
    last_heart_refill_at = CASE WHEN last_heart_refill_at IS NULL THEN NOW() ELSE last_heart_refill_at END,
    hearts_refill_enabled = CASE WHEN hearts_refill_enabled IS NULL THEN TRUE ELSE hearts_refill_enabled END
WHERE hearts IS NULL OR max_hearts IS NULL OR last_heart_refill_at IS NULL OR hearts_refill_enabled IS NULL;

-- Step 3: Create function to check and refill hearts
CREATE OR REPLACE FUNCTION public.check_and_refill_hearts(
    p_user_id UUID
)
RETURNS TABLE(
    hearts INTEGER, 
    max_hearts INTEGER, 
    last_refill_at TIMESTAMPTZ,
    refilled BOOLEAN,
    time_until_next_refill INTERVAL
) AS $$
DECLARE
    v_current_hearts INTEGER;
    v_max_hearts INTEGER;
    v_last_refill TIMESTAMPTZ;
    v_refill_enabled BOOLEAN;
    v_hours_since_refill NUMERIC;
    v_refilled BOOLEAN := FALSE;
BEGIN
    -- Get current heart status
    SELECT 
        p.hearts, 
        p.max_hearts, 
        p.last_heart_refill_at,
        p.hearts_refill_enabled
    INTO 
        v_current_hearts, 
        v_max_hearts, 
        v_last_refill,
        v_refill_enabled
    FROM profiles p
    WHERE p.id = p_user_id;

    -- If user not found, return null
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Calculate hours since last refill
    v_hours_since_refill := EXTRACT(EPOCH FROM (NOW() - v_last_refill)) / 3600;

    -- Check if 3 hours have passed and hearts are below max
    IF v_refill_enabled AND v_hours_since_refill >= 3 AND v_current_hearts < v_max_hearts THEN
        -- Refill hearts to max
        UPDATE profiles
        SET 
            hearts = v_max_hearts,
            last_heart_refill_at = NOW()
        WHERE id = p_user_id
        RETURNING profiles.hearts, profiles.last_heart_refill_at 
        INTO v_current_hearts, v_last_refill;
        
        v_refilled := TRUE;
    END IF;

    -- Calculate time until next refill (3 hours from last refill)
    RETURN QUERY SELECT 
        v_current_hearts,
        v_max_hearts,
        v_last_refill,
        v_refilled,
        CASE 
            WHEN v_current_hearts >= v_max_hearts THEN INTERVAL '0 seconds'
            ELSE (INTERVAL '3 hours' - (NOW() - v_last_refill))
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create function to award hearts (for mystery boxes, etc.)
CREATE OR REPLACE FUNCTION public.award_user_hearts(
    p_user_id UUID,
    p_amount INTEGER,
    p_source TEXT DEFAULT 'mystery_box',
    p_chapter_id UUID DEFAULT NULL,
    p_course_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(new_hearts INTEGER, transaction_id UUID) AS $$
DECLARE
    v_transaction_id UUID;
    v_new_hearts INTEGER;
    v_max_hearts INTEGER;
BEGIN
    -- Generate transaction ID
    v_transaction_id := gen_random_uuid();

    -- Get max hearts
    SELECT max_hearts INTO v_max_hearts
    FROM profiles
    WHERE id = p_user_id;

    -- Update profile hearts (cap at max_hearts)
    UPDATE profiles
    SET hearts = LEAST(COALESCE(max_hearts, 5), COALESCE(hearts, 0) + p_amount)
    WHERE id = p_user_id
    RETURNING hearts INTO v_new_hearts;

    -- Log the transaction
    INSERT INTO user_reward_transactions (
        id, user_id, reward_type, amount, source, 
        chapter_id, course_id, metadata
    ) VALUES (
        v_transaction_id, p_user_id, 'hearts', p_amount, p_source,
        p_chapter_id, p_course_id, p_metadata
    );

    RETURN QUERY SELECT v_new_hearts, v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Update deduct_user_hearts to update last_refill_at when hearts reach 0
CREATE OR REPLACE FUNCTION public.deduct_user_hearts(
    p_user_id UUID,
    p_amount INTEGER DEFAULT 1
)
RETURNS TABLE(new_hearts INTEGER, transaction_id UUID) AS $$
DECLARE
    v_transaction_id UUID;
    v_new_hearts INTEGER;
    v_old_hearts INTEGER;
BEGIN
    -- Generate transaction ID
    v_transaction_id := gen_random_uuid();

    -- Get current hearts
    SELECT hearts INTO v_old_hearts
    FROM profiles
    WHERE id = p_user_id;

    -- Update profile hearts (ensure it doesn't go below 0)
    UPDATE profiles
    SET hearts = GREATEST(0, COALESCE(hearts, 0) - p_amount),
        -- Update last_refill_at when hearts reach 0 to start the 3-hour timer
        last_heart_refill_at = CASE 
            WHEN GREATEST(0, COALESCE(hearts, 0) - p_amount) = 0 THEN NOW()
            ELSE last_heart_refill_at
        END
    WHERE id = p_user_id
    RETURNING hearts INTO v_new_hearts;

    RETURN QUERY SELECT v_new_hearts, v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create trigger to set initial hearts for new users
CREATE OR REPLACE FUNCTION public.initialize_user_hearts()
RETURNS TRIGGER AS $$
BEGIN
    -- Set initial values for new profiles
    NEW.hearts := COALESCE(NEW.hearts, 5);
    NEW.max_hearts := COALESCE(NEW.max_hearts, 5);
    NEW.last_heart_refill_at := COALESCE(NEW.last_heart_refill_at, NOW());
    NEW.hearts_refill_enabled := COALESCE(NEW.hearts_refill_enabled, TRUE);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_initialize_user_hearts ON profiles;
CREATE TRIGGER trigger_initialize_user_hearts
    BEFORE INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION initialize_user_hearts();

-- Step 7: Grant permissions
GRANT EXECUTE ON FUNCTION public.check_and_refill_hearts TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_user_hearts TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_user_hearts TO authenticated;

-- Step 8: Test the system (optional - uncomment to test)
-- SELECT * FROM check_and_refill_hearts('YOUR_USER_ID'::uuid);

-- Step 9: Verify the setup
SELECT 
    id,
    hearts,
    max_hearts,
    last_heart_refill_at,
    hearts_refill_enabled,
    EXTRACT(EPOCH FROM (NOW() - last_heart_refill_at)) / 3600 as hours_since_refill
FROM profiles
LIMIT 5;
