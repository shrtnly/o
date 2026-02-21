import { supabase } from '../lib/supabaseClient';

export const honeyJarService = {

    /**
     * Get current jar progress for a user
     */
    async getJarProgress(userId) {
        try {
            const { data, error } = await supabase
                .from('honey_jar_progress')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code === 'PGRST116') {
                // No record yet — return defaults
                return { fill_percent: 0, pollen_in_cycle: 0, is_full: false };
            }
            if (error) throw error;
            return data;
        } catch (err) {
            console.error('getJarProgress error:', err);
            return { fill_percent: 0, pollen_in_cycle: 0, is_full: false };
        }
    },

    /**
     * Add pollen to the jar (every 3 pollen = 1% fill)
     * Returns updated fill info from database function
     */
    async addPollenToJar(userId, pollenEarned) {
        try {
            const { data, error } = await supabase.rpc('add_pollen_to_jar', {
                p_user_id: userId,
                pollen_earned: pollenEarned,
            });
            if (error) throw error;
            return data; // { fill_percent, is_full, became_full, pollen_in_cycle }
        } catch (err) {
            console.error('addPollenToJar error:', err);
            return null;
        }
    },

    /**
     * Get unclaimed mystery gift for user (if any)
     */
    async getUnclaimedGift(userId) {
        try {
            const { data, error } = await supabase
                .from('honey_jar_gifts')
                .select('*')
                .eq('user_id', userId)
                .eq('is_claimed', false)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code === 'PGRST116') return null;
            if (error) throw error;
            return data;
        } catch (err) {
            console.error('getUnclaimedGift error:', err);
            return null;
        }
    },

    /**
     * Generate a random mystery gift (called when jar becomes full)
     */
    async generateMysteryGift(userId) {
        try {
            const { data, error } = await supabase.rpc('generate_mystery_gift', {
                p_user_id: userId,
            });
            if (error) throw error;
            return data; // { gift_id, gift_type, gift_amount, badge_expires_at }
        } catch (err) {
            console.error('generateMysteryGift error:', err);
            return null;
        }
    },

    /**
     * Claim a mystery gift — applies reward and resets jar to 0
     */
    async claimMysteryGift(userId, giftId) {
        try {
            const { data, error } = await supabase.rpc('claim_mystery_gift', {
                p_user_id: userId,
                p_gift_id: giftId,
            });
            if (error) throw error;
            return data; // { success, gift_type, gift_amount }
        } catch (err) {
            console.error('claimMysteryGift error:', err);
            return { success: false, error: err.message };
        }
    },

    /**
     * Check if learner has an active flaming badge
     */
    async getActiveFlamingBadge(userId) {
        try {
            const { data, error } = await supabase
                .from('learner_active_badges')
                .select('*')
                .eq('user_id', userId)
                .eq('badge_type', 'flaming')
                .eq('is_active', true)
                .gte('expires_at', new Date().toISOString())
                .single();

            if (error && error.code === 'PGRST116') return null;
            if (error) throw error;
            return data;
        } catch (err) {
            console.error('getActiveFlamingBadge error:', err);
            return null;
        }
    },

    /**
     * Subscribe to real-time jar progress changes
     */
    subscribeToJarProgress(userId, callback) {
        return supabase
            .channel(`jar_progress_${userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'honey_jar_progress',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => callback(payload.new)
            )
            .subscribe();
    },

    /**
     * Subscribe to real-time unclaimed gifts
     */
    subscribeToGifts(userId, callback) {
        return supabase
            .channel(`jar_gifts_${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'honey_jar_gifts',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => callback(payload.new)
            )
            .subscribe();
    },
};
