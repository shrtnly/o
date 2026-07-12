-- ============================================
-- 1. CREATE PAYMENT TABLE (IF NOT EXISTS)
-- ============================================

CREATE TABLE IF NOT EXISTS public."Payment" (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    transaction_id TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    plan_type TEXT NOT NULL,          -- 'monthly', 'yearly', '1day', 'gems', 'hearts'
    subscription_type TEXT NOT NULL,  -- e.g., 'super_bee_king', 'super_bee_queen', 'bee_premium', etc.
    status TEXT DEFAULT 'pending' NOT NULL, -- 'pending', 'approved', 'rejected'
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public."Payment" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid duplication errors
DROP POLICY IF EXISTS "Users can view their own payments" ON public."Payment";
DROP POLICY IF EXISTS "Users can insert their own payments" ON public."Payment";

-- Create RLS Policies
CREATE POLICY "Users can view their own payments" 
ON public."Payment" FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payments" 
ON public."Payment" FOR INSERT 
WITH CHECK (auth.uid() = user_id);


-- ============================================
-- 2. UPDATE BEE PREMIUM DURATION FUNCTIONS
-- ============================================

-- Drop existing overloaded functions to avoid conflicts
DROP FUNCTION IF EXISTS public.process_1day_premium_purchase(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.process_1day_premium_purchase(UUID, NUMERIC, NUMERIC, UUID);

-- Re-create function for 2-parameter signature (user_id, amount)
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

-- Re-create function for 4-parameter signature (user_id, amount, original_price, promo_id)
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

-- Grant permissions so the functions can be invoked from the application client
GRANT EXECUTE ON FUNCTION public.process_1day_premium_purchase(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_1day_premium_purchase(UUID, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.process_1day_premium_purchase(UUID, NUMERIC, NUMERIC, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_1day_premium_purchase(UUID, NUMERIC, NUMERIC, UUID) TO anon;
