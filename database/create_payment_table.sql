-- ============================================
-- CREATE Payment TABLE
-- Run this in Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS public."Payment" (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    transaction_id TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    plan_type TEXT NOT NULL,          -- 'monthly', 'yearly', '1day', 'gems', 'hearts'
    subscription_type TEXT NOT NULL,  -- e.g., 'super_bee_king', 'super_bee_queen', 'quick_honey_drop', etc.
    status TEXT DEFAULT 'pending' NOT NULL, -- 'pending', 'approved', 'rejected'
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public."Payment" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own payments" 
ON public."Payment" FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payments" 
ON public."Payment" FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Verify table was created
SELECT 'Payment table created' as status 
WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Payment');
