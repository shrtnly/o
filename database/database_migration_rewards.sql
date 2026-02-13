-- ============================================
-- O-SEKHA DATABASE MIGRATION
-- XP, Gems, and Hearts Reward System
-- ============================================

-- 1. Create user_reward_transactions table to track all XP, gem, and heart changes
CREATE TABLE IF NOT EXISTS public.user_reward_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('xp_earned', 'gem_earned', 'heart_lost', 'heart_gained', 'gem_spent')),
    amount INTEGER NOT NULL,
    source VARCHAR(50) NOT NULL CHECK (source IN ('mcq_correct', 'chapter_complete', 'mystery_box', 'heart_box', 'gem_box', 'daily_quest', 'streak_bonus', 'purchase')),
    chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_reward_transactions_user_id ON public.user_reward_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_reward_transactions_created_at ON public.user_reward_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_reward_transactions_type ON public.user_reward_transactions(transaction_type);

-- 2. Update user_progress table to track detailed MCQ statistics
ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS total_questions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS correct_answers INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS xp_earned INTEGER DEFAULT 0;

-- 3. Enable RLS on user_reward_transactions
ALTER TABLE public.user_reward_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_reward_transactions
CREATE POLICY "Users can view their own reward transactions" 
ON public.user_reward_transactions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reward transactions" 
ON public.user_reward_transactions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 4. Create a function to award XP and update profiles atomically
CREATE OR REPLACE FUNCTION public.award_user_xp(
    p_user_id UUID,
    p_amount INTEGER,
    p_source VARCHAR(50),
    p_chapter_id UUID DEFAULT NULL,
    p_course_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS TABLE(new_xp INTEGER, transaction_id UUID) AS $$
DECLARE
    v_transaction_id UUID;
    v_new_xp INTEGER;
BEGIN
    -- Insert transaction record
    INSERT INTO public.user_reward_transactions (
        user_id, transaction_type, amount, source, chapter_id, course_id, metadata
    ) VALUES (
        p_user_id, 'xp_earned', p_amount, p_source, p_chapter_id, p_course_id, p_metadata
    ) RETURNING id INTO v_transaction_id;

    -- Update profile XP
    UPDATE public.profiles 
    SET xp = COALESCE(xp, 0) + p_amount
    WHERE id = p_user_id
    RETURNING xp INTO v_new_xp;

    RETURN QUERY SELECT v_new_xp, v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create a function to award gems
CREATE OR REPLACE FUNCTION public.award_user_gems(
    p_user_id UUID,
    p_amount INTEGER,
    p_source VARCHAR(50),
    p_chapter_id UUID DEFAULT NULL,
    p_course_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS TABLE(new_gems INTEGER, transaction_id UUID) AS $$
DECLARE
    v_transaction_id UUID;
    v_new_gems INTEGER;
BEGIN
    -- Insert transaction record
    INSERT INTO public.user_reward_transactions (
        user_id, transaction_type, amount, source, chapter_id, course_id, metadata
    ) VALUES (
        p_user_id, 'gem_earned', p_amount, p_source, p_chapter_id, p_course_id, p_metadata
    ) RETURNING id INTO v_transaction_id;

    -- Update profile gems
    UPDATE public.profiles 
    SET gems = COALESCE(gems, 0) + p_amount
    WHERE id = p_user_id
    RETURNING gems INTO v_new_gems;

    RETURN QUERY SELECT v_new_gems, v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create a function to deduct hearts
CREATE OR REPLACE FUNCTION public.deduct_user_hearts(
    p_user_id UUID,
    p_amount INTEGER DEFAULT 1
)
RETURNS TABLE(new_hearts INTEGER, transaction_id UUID) AS $$
DECLARE
    v_transaction_id UUID;
    v_new_hearts INTEGER;
BEGIN
    -- Insert transaction record
    INSERT INTO public.user_reward_transactions (
        user_id, transaction_type, amount, source, metadata
    ) VALUES (
        p_user_id, 'heart_lost', p_amount, 'mcq_correct', '{}'::jsonb
    ) RETURNING id INTO v_transaction_id;

    -- Update profile hearts (ensure it doesn't go below 0)
    UPDATE public.profiles 
    SET hearts = GREATEST(0, COALESCE(hearts, 0) - p_amount)
    WHERE id = p_user_id
    RETURNING hearts INTO v_new_hearts;

    RETURN QUERY SELECT v_new_hearts, v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create a view for user statistics summary
CREATE OR REPLACE VIEW public.user_stats_summary AS
SELECT 
    p.id as user_id,
    p.xp,
    p.gems,
    p.hearts,
    COUNT(DISTINCT up.chapter_id) as chapters_completed,
    COUNT(DISTINCT up.course_id) as courses_enrolled,
    COALESCE(SUM(up.correct_answers), 0) as total_correct_answers,
    COALESCE(SUM(up.total_questions), 0) as total_questions_attempted,
    CASE 
        WHEN SUM(up.total_questions) > 0 
        THEN ROUND((SUM(up.correct_answers)::NUMERIC / SUM(up.total_questions)::NUMERIC) * 100, 2)
        ELSE 0 
    END as accuracy_percentage
FROM public.profiles p
LEFT JOIN public.user_progress up ON p.id = up.user_id AND up.is_completed = true
GROUP BY p.id, p.xp, p.gems, p.hearts;

-- Grant permissions
GRANT SELECT ON public.user_stats_summary TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_user_xp TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_user_gems TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_user_hearts TO authenticated;

-- ============================================
-- NOTES:
-- 1. Run this migration in your Supabase SQL Editor
-- 2. The system now tracks every XP/gem/heart transaction
-- 3. Use the provided functions for atomic updates
-- 4. The view provides quick access to user statistics
-- ============================================
