import { supabase } from '../lib/supabaseClient';

export const leaderboardService = {
    /**
     * Get leaderboard for a specific tier
     * @param {string} tier - SILVER, GOLD, PLATINUM, DIAMOND
     * @param {number} limit - Number of users to fetch
     * @returns {Promise<Array>}
     */
    async getLeaderboardByTier(tier, limit = 50, offset = 0) {
        try {
            const { data, count, error } = await supabase
                .from('leaderboard_view')
                .select('*', { count: 'exact' })
                .eq('tier', tier.toUpperCase())
                .range(offset, offset + limit - 1);

            if (error) throw error;
            return { data: data || [], total: count || 0 };
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            return { data: [], total: 0 };
        }
    },

    /**
     * Get user's current rank in their tier
     * @param {string} userId - User ID
     * @param {string} tier - User's tier
     * @returns {Promise<number>}
     */
    async getUserRank(userId, tier) {
        try {
            // This is a bit complex in Supabase without a RPC, 
            // but for simple leaderboard we can fetch data and find index
            const { data } = await this.getLeaderboardByTier(tier, 1000);
            const rank = data.findIndex(user => user.id === userId);
            return rank !== -1 ? rank + 1 : null;
        } catch (error) {
            console.error('Error getting user rank:', error);
            return null;
        }
    }
};
