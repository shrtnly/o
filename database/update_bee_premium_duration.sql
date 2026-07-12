-- ============================================
-- UPDATE BEE PREMIUM DURATION FROM 1 TO 10 DAYS
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Drop existing overloaded functions to avoid conflicts
DROP FUNCTION IF EXISTS public.process_1day_premium_purchase(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.process_1day_premium_purchase(UUID, NUMERIC, NUMERIC, UUID);

-- 2. Re-create function for 2-parameter signature (user_id, amount)
CREATE OR REPLACE FUNCTION public.process_1day_premium_purchase(
    p_user_id UUID,
    p_amount INTEGER
)
RETURNS JSON AS $$
DECLARE
    v_new_expiry TIMESTAMPTZ;
BEGIN
    -- Calculate new expiry: if already premium and expiry is in the future, add 10 days.
    -- Otherwise, start 10 days from now.
    SELECT CASE 
        WHEN is_1day_premium = TRUE AND one_day_premium_until > NOW() THEN one_day_premium_until + INTERVAL '10 days'
        ELSE NOW() + INTERVAL '10 days'
    END INTO v_new_expiry
    FROM public.profiles
    WHERE id = p_user_id;

    -- Update profile status
    UPDATE public.profiles
    SET 
        is_1day_premium = TRUE,
        one_day_premium_until = v_new_expiry
    WHERE id = p_user_id;

    -- Log reward transaction
    INSERT INTO public.user_reward_transactions (
        user_id, transaction_type, amount, source, metadata
    ) VALUES (
        p_user_id, 'gem_spent', p_amount, 'purchase', '{"plan": "bee_premium_10day"}'::jsonb
    );

    RETURN json_build_object(
        'success', TRUE,
        'premium_until', v_new_expiry
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-create function for 4-parameter signature (user_id, amount, original_price, promo_id)
CREATE OR REPLACE FUNCTION public.process_1day_premium_purchase(
    p_user_id UUID,
    p_amount NUMERIC,
    p_original_price NUMERIC,
    p_promo_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_new_expiry TIMESTAMPTZ;
BEGIN
    -- Calculate new expiry: if already premium and expiry is in the future, add 10 days.
    -- Otherwise, start 10 days from now.
    SELECT CASE 
        WHEN is_1day_premium = TRUE AND one_day_premium_until > NOW() THEN one_day_premium_until + INTERVAL '10 days'
        ELSE NOW() + INTERVAL '10 days'
    END INTO v_new_expiry
    FROM public.profiles
    WHERE id = p_user_id;

    -- Update profile status
    UPDATE public.profiles
    SET 
        is_1day_premium = TRUE,
        one_day_premium_until = v_new_expiry
    WHERE id = p_user_id;

    -- Log payment/transaction details
    INSERT INTO public."Payment" (
        user_id, email, transaction_id, amount, plan_type, subscription_type, status
    ) 
    SELECT 
        p_user_id, 
        email, 
        'BEE-PREMIUM-' || substring(gen_random_uuid()::text from 1 for 8), 
        p_amount, 
        '1day', 
        'bee_premium', 
        'approved'
    FROM public.profiles
    WHERE id = p_user_id;

    RETURN json_build_object(
        'success', TRUE,
        'premium_until', v_new_expiry
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant permissions so the functions can be invoked from the application client
GRANT EXECUTE ON FUNCTION public.process_1day_premium_purchase(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_1day_premium_purchase(UUID, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.process_1day_premium_purchase(UUID, NUMERIC, NUMERIC, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_1day_premium_purchase(UUID, NUMERIC, NUMERIC, UUID) TO anon;
