-- ============================================
-- ADD applicable_to COLUMN TO promo_codes
-- Run this in your Supabase SQL Editor
-- ============================================

ALTER TABLE public.promo_codes 
ADD COLUMN IF NOT EXISTS applicable_to TEXT DEFAULT 'all';

-- Comments to describe values:
-- 'all': Applicable to any purchase
-- 'subscription': Applicable to Super Bee Premium
-- '1day': Applicable to Quick Honey Drop (1 day)
