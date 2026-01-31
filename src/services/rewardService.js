import { supabase } from '../lib/supabaseClient';

/**
 * Reward Service - Handles XP, Gems, and Hearts operations
 * Uses database functions for atomic transactions and proper tracking
 */
export const rewardService = {
    /**
     * Award XP to a user
     * @param {string} userId - User ID
     * @param {number} amount - Amount of XP to award
     * @param {string} source - Source of XP (mcq_correct, chapter_complete, etc.)
     * @param {object} metadata - Additional metadata
     * @returns {Promise<{success: boolean, newXp: number, transactionId: string}>}
     */
    async awardXP(userId, amount, source = 'mcq_correct', metadata = {}) {
        try {
            const { data, error } = await supabase.rpc('award_user_xp', {
                p_user_id: userId,
                p_amount: amount,
                p_source: source,
                p_chapter_id: metadata.chapterId || null,
                p_course_id: metadata.courseId || null,
                p_metadata: metadata
            });

            if (error) throw error;

            return {
                success: true,
                newXp: data?.[0]?.new_xp || 0,
                transactionId: data?.[0]?.transaction_id
            };
        } catch (error) {
            console.error('Error awarding XP:', error);

            // Fallback: direct update if function doesn't exist
            try {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('xp')
                    .eq('id', userId)
                    .single();

                const newXp = (profile?.xp || 0) + amount;

                await supabase
                    .from('profiles')
                    .update({ xp: newXp })
                    .eq('id', userId);

                return { success: true, newXp, transactionId: null };
            } catch (fallbackError) {
                console.error('Fallback XP update failed:', fallbackError);
                return { success: false, newXp: 0, transactionId: null };
            }
        }
    },

    /**
     * Award gems to a user
     * @param {string} userId - User ID
     * @param {number} amount - Amount of gems to award
     * @param {string} source - Source of gems
     * @param {object} metadata - Additional metadata
     * @returns {Promise<{success: boolean, newGems: number, transactionId: string}>}
     */
    async awardGems(userId, amount, source = 'mystery_box', metadata = {}) {
        try {
            const { data, error } = await supabase.rpc('award_user_gems', {
                p_user_id: userId,
                p_amount: amount,
                p_source: source,
                p_chapter_id: metadata.chapterId || null,
                p_course_id: metadata.courseId || null,
                p_metadata: metadata
            });

            if (error) throw error;

            return {
                success: true,
                newGems: data?.[0]?.new_gems || 0,
                transactionId: data?.[0]?.transaction_id
            };
        } catch (error) {
            console.error('Error awarding gems:', error);

            // Fallback: direct update
            try {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('gems')
                    .eq('id', userId)
                    .single();

                const newGems = (profile?.gems || 0) + amount;

                await supabase
                    .from('profiles')
                    .update({ gems: newGems })
                    .eq('id', userId);

                return { success: true, newGems, transactionId: null };
            } catch (fallbackError) {
                console.error('Fallback gems update failed:', fallbackError);
                return { success: false, newGems: 0, transactionId: null };
            }
        }
    },

    /**
     * Deduct hearts from a user
     * @param {string} userId - User ID
     * @param {number} amount - Amount of hearts to deduct
     * @returns {Promise<{success: boolean, newHearts: number, transactionId: string}>}
     */
    async deductHearts(userId, amount = 1) {
        try {
            const { data, error } = await supabase.rpc('deduct_user_hearts', {
                p_user_id: userId,
                p_amount: amount
            });

            if (error) throw error;

            return {
                success: true,
                newHearts: data?.[0]?.new_hearts || 0,
                transactionId: data?.[0]?.transaction_id
            };
        } catch (error) {
            console.error('Error deducting hearts:', error);

            // Fallback: direct update
            try {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('hearts')
                    .eq('id', userId)
                    .single();

                const newHearts = Math.max(0, (profile?.hearts || 0) - amount);

                await supabase
                    .from('profiles')
                    .update({ hearts: newHearts })
                    .eq('id', userId);

                return { success: true, newHearts, transactionId: null };
            } catch (fallbackError) {
                console.error('Fallback hearts update failed:', fallbackError);
                return { success: false, newHearts: 0, transactionId: null };
            }
        }
    },

    /**
     * Get user statistics summary
     * @param {string} userId - User ID
     * @returns {Promise<object>}
     */
    async getUserStats(userId) {
        try {
            const { data, error } = await supabase
                .from('user_stats_summary')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Error fetching user stats:', error);
            return null;
        }
    },

    /**
     * Get recent reward transactions
     * @param {string} userId - User ID
     * @param {number} limit - Number of transactions to fetch
     * @returns {Promise<Array>}
     */
    async getRecentTransactions(userId, limit = 10) {
        try {
            const { data, error } = await supabase
                .from('user_reward_transactions')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Error fetching transactions:', error);
            return [];
        }
    }
};
