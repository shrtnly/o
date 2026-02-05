-- ============================================
-- LEADERBOARD SYSTEM SETUP (FIXED)
-- ============================================

-- 1. Drop the foreign key constraint so we can add dummy/system profiles
-- Note: This allows us to have leaderboard bots/dummies without real auth accounts.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. Ensure profiles table has names and avatars
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 3. Function to update display names from auth metadata if available
CREATE OR REPLACE FUNCTION public.sync_profile_names()
RETURNS void AS $$
BEGIN
    UPDATE public.profiles p
    SET 
        display_name = COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1)),
        avatar_url = u.raw_user_meta_data->>'avatar_url'
    FROM auth.users u
    WHERE p.id = u.id AND (p.display_name IS NULL OR p.display_name = '');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create dummy users for each tier
DO $$
DECLARE
    dummy_names_silver TEXT[] := ARRAY['Anika', 'Rahul', 'Nabil', 'Sara', 'Tanvir', 'Mitu', 'Zubair', 'Ishrat', 'Faisal', 'Nadia'];
    dummy_names_gold TEXT[] := ARRAY['Arif', 'Lamia', 'Sajjad', 'Riya', 'Kamal', 'Sumaiya', 'Mustafa', 'Farah', 'Imran', 'Lubna'];
    dummy_names_platinum TEXT[] := ARRAY['Shahnaz', 'Rakib', 'Tasnim', 'Asif', 'Bithi', 'Hasan', 'Mina', 'Jewel', 'Keya', 'Nasir'];
    dummy_names_diamond TEXT[] := ARRAY['Abir', 'Shuvo', 'Pronto', 'Rifat', 'Nishi', 'Tarek', 'Jannat', 'Sami', 'Sumi', 'Rafat'];
    i INTEGER;
BEGIN
    -- Insert Silver Tier Dummies
    FOR i IN 1..10 LOOP
        INSERT INTO public.profiles (id, display_name, xp, gems, hearts, max_hearts)
        VALUES (gen_random_uuid(), dummy_names_silver[i], floor(random() * 2000), floor(random() * 100), 5, 10);
    END LOOP;

    -- Insert Gold Tier Dummies
    FOR i IN 1..10 LOOP
        INSERT INTO public.profiles (id, display_name, xp, gems, hearts, max_hearts)
        VALUES (gen_random_uuid(), dummy_names_gold[i], 2500 + floor(random() * 2000), floor(random() * 500), 5, 10);
    END LOOP;

    -- Insert Platinum Tier Dummies
    FOR i IN 1..10 LOOP
        INSERT INTO public.profiles (id, display_name, xp, gems, hearts, max_hearts)
        VALUES (gen_random_uuid(), dummy_names_platinum[i], 5000 + floor(random() * 4000), floor(random() * 1000), 5, 10);
    END LOOP;

    -- Insert Diamond Tier Dummies
    FOR i IN 1..10 LOOP
        INSERT INTO public.profiles (id, display_name, xp, gems, hearts, max_hearts)
        VALUES (gen_random_uuid(), dummy_names_diamond[i], 10000 + floor(random() * 10000), floor(random() * 5000), 5, 10);
    END LOOP;
END $$;

-- 5. Create a leaderboard view for easy fetching
CREATE OR REPLACE VIEW public.leaderboard_view AS
SELECT 
    id,
    display_name,
    avatar_url,
    xp,
    CASE 
        WHEN xp >= 10000 THEN 'DIAMOND'
        WHEN xp >= 5000 THEN 'PLATINUM'
        WHEN xp >= 2500 THEN 'GOLD'
        ELSE 'SILVER'
    END as tier
FROM public.profiles
ORDER BY xp DESC;
