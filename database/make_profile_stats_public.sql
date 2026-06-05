-- Run this script in the Supabase SQL Editor to make all learner profile stats public.
-- This ensures that public profiles can successfully fetch stats for any user.

-- 1. battle_history: Make battle history readable by anyone
ALTER TABLE public.battle_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to battle_history" ON public.battle_history;
CREATE POLICY "Allow public read access to battle_history"
ON public.battle_history FOR SELECT USING (true);

-- 2. user_daily_activity: Make daily activity readable by anyone (used by user_stats_summary view)
ALTER TABLE public.user_daily_activity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to user_daily_activity" ON public.user_daily_activity;
CREATE POLICY "Allow public read access to user_daily_activity"
ON public.user_daily_activity FOR SELECT USING (true);

-- 3. user_streaks: Make streaks readable by anyone
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to user_streaks" ON public.user_streaks;
CREATE POLICY "Allow public read access to user_streaks"
ON public.user_streaks FOR SELECT USING (true);

-- 4. certificates: Make certificates readable by anyone
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to certificates" ON public.certificates;
CREATE POLICY "Allow public read access to certificates"
ON public.certificates FOR SELECT USING (true);

-- 5. user_stats_summary: Recreate the view as SECURITY DEFINER if necessary (Optional, usually allowing RLS on base tables is enough)
-- If the above policies do not fix the view, you can force the view to bypass RLS:
/*
DROP VIEW IF EXISTS public.user_stats_summary;
CREATE OR REPLACE VIEW public.user_stats_summary 
WITH (security_invoker = off) AS
SELECT 
    user_id,
    SUM(xp_earned) as total_xp,
    SUM(lessons_completed) as total_lessons
FROM public.user_daily_activity
GROUP BY user_id;
*/
