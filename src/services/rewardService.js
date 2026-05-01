import { supabase } from '../lib/supabaseClient';
import { formatLocalDate } from '../lib/dateUtils';

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
            // Award XP in profiles using RPC
            const { data, error } = await supabase.rpc('award_user_xp', {
                p_user_id: userId,
                p_amount: amount,
                p_source: source,
                p_chapter_id: metadata.chapterId || null,
                p_course_id: metadata.courseId || null,
                p_metadata: metadata
            });

            if (error) throw error;

            // Log cumulative activity for the day
            const today = formatLocalDate(new Date());
            
            // Fetch current daily activity to increment
            const { data: currentActivity } = await supabase
                .from('user_daily_activity')
                .select('xp_earned, lessons_completed')
                .eq('user_id', userId)
                .eq('activity_date', today)
                .maybeSingle();

            const isLesson = source === 'chapter_complete';
            const newDailyXp = (currentActivity?.xp_earned || 0) + amount;
            const newDailyLessons = (currentActivity?.lessons_completed || 0) + (isLesson ? 1 : 0);

            await supabase.from('user_daily_activity').upsert({
                user_id: userId,
                activity_date: today,
                xp_earned: newDailyXp,
                lessons_completed: newDailyLessons
            }, { onConflict: 'user_id,activity_date' });

            // Force recalculate streak in DB
            await supabase.rpc('update_user_streaks', { p_user_id: userId });

            return {
                success: true,
                newXp: data?.[0]?.new_xp || 0,
                transactionId: data?.[0]?.transaction_id
            };
        } catch (error) {
            console.error('Error awarding XP:', error);
            return { success: false, newXp: 0, transactionId: null };
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
            return { success: false, newGems: 0, transactionId: null };
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
            return { success: false, newHearts: 0, transactionId: null };
        }
    },

    /**
     * Check and refill hearts if 3 hours have passed
     * @param {string} userId - User ID
     * @returns {Promise<{hearts: number, maxHearts: number, refilled: boolean, timeUntilRefill: string}>}
     */
    async checkAndRefillHearts(userId) {
        try {
            const { data, error } = await supabase.rpc('check_and_refill_hearts', {
                p_user_id: userId
            });

            if (error) throw error;

            if (data && data.length > 0) {
                return {
                    hearts: data[0].hearts,
                    maxHearts: data[0].max_hearts,
                    lastRefillAt: data[0].last_refill_at,
                    refilled: data[0].refilled,
                    timeUntilRefill: data[0].time_until_next_refill
                };
            }

            return null;
        } catch (error) {
            console.error('Error checking heart refill:', error);

            // Fallback: fetch from profiles
            try {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('hearts, max_hearts, last_heart_refill_at')
                    .eq('id', userId)
                    .single();

                return {
                    hearts: profile?.hearts || 5,
                    maxHearts: profile?.max_hearts || 5,
                    lastRefillAt: profile?.last_heart_refill_at,
                    refilled: false,
                    timeUntilRefill: null
                };
            } catch (fallbackError) {
                console.error('Fallback heart check failed:', fallbackError);
                return null;
            }
        }
    },

    /**
     * Award hearts to a user
     * @param {string} userId - User ID
     * @param {number} amount - Amount of hearts to award
     * @param {string} source - Source of hearts
     * @param {object} metadata - Additional metadata
     * @returns {Promise<{success: boolean, newHearts: number, transactionId: string}>}
     */
    async awardHearts(userId, amount, source = 'mystery_box', metadata = {}) {
        try {
            const { data, error } = await supabase.rpc('award_user_hearts', {
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
                newHearts: data?.[0]?.new_hearts || 0,
                transactionId: data?.[0]?.transaction_id
            };
        } catch (error) {
            console.error('Error awarding hearts:', error);
            return { success: false, newHearts: 0, transactionId: null };
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
    },

    /**
     * Get user streak information
     * @param {string} userId - User ID
     * @returns {Promise<object>}
     */
    async getUserStreak(userId) {
        try {
            // First, trigger a recalculation to handle potential streak expiry
            // especially if the user hasn't practiced for a day or two
            await supabase.rpc('update_user_streaks', { p_user_id: userId });

            const { data, error } = await supabase
                .from('user_streaks')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            const streak = data || { current_streak: 0, longest_streak: 0, last_activity_date: null };
            
            // Check if user has already practiced today in local timezone
            const today = formatLocalDate(new Date());
            // Ensure both the date matches AND the streak is actually active (> 0)
            const isTodayCompleted = streak.current_streak > 0 && streak.last_activity_date === today;

            return { ...streak, is_today_completed: isTodayCompleted };
        } catch (error) {
            console.error('Error fetching/updating user streak:', error);
            // Fallback: regular fetch if RPC fails, though results might be stale
            const { data } = await supabase
                .from('user_streaks')
                .select('*')
                .eq('user_id', userId)
                .single();
            const streak = data || { current_streak: 0, longest_streak: 0, last_activity_date: null };
            const today = formatLocalDate(new Date());
            const isTodayCompleted = streak.last_activity_date === today;
            return { ...streak, is_today_completed: isTodayCompleted };
        }
    },

    /**
     * Get user activity history for calendar and charts
     * @param {string} userId - User ID
     * @param {number} days - Number of days to look back
     * @returns {Promise<Array>}
     */
    async getActivityHistory(userId, days = 365) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const startDateStr = formatLocalDate(startDate);

            const { data, error } = await supabase
                .from('user_daily_activity')
                .select('*')
                .eq('user_id', userId)
                .gte('activity_date', startDateStr)
                .order('activity_date', { ascending: true });

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Error fetching activity history:', error);
            return [];
        }
    },

    /**
     * Get analysis data for the Profile Analyze tab
     * @param {string} userId - User ID
     * @param {number} days - Number of days to look back
     * @returns {Promise<object>}
     */
    async getAnalysisData(userId, days = 'all', dateRange = null) {
        try {
            let activityQuery = supabase
                .from('user_daily_activity')
                .select('*')
                .eq('user_id', userId)
                .order('activity_date', { ascending: true });

            let progressQuery = supabase
                .from('user_progress')
                .select('*, chapters(estimated_time)')
                .eq('user_id', userId)
                .eq('is_completed', true);

            if (dateRange && dateRange.start && dateRange.end) {
                activityQuery = activityQuery
                    .gte('activity_date', dateRange.start)
                    .lte('activity_date', dateRange.end);
                
                progressQuery = progressQuery
                    .gte('completed_at', new Date(dateRange.start).toISOString())
                    .lte('completed_at', new Date(dateRange.end).toISOString());
            } else if (days !== 'all') {
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - parseInt(days));
                const startDateStr = formatLocalDate(startDate);
                
                activityQuery = activityQuery.gte('activity_date', startDateStr);
                progressQuery = progressQuery.gte('completed_at', startDate.toISOString());
            }

            const [activityRes, progressRes] = await Promise.all([
                activityQuery,
                progressQuery
            ]);

            if (activityRes.error) throw activityRes.error;
            if (progressRes.error) throw progressRes.error;

            const activity = activityRes.data || [];
            const progress = progressRes.data || [];

            // Calculate metrics
            let totalCorrect = 0;
            let totalQuestions = 0;
            const totalMinutes = activity.reduce((acc, curr) => acc + (curr.minutes_spent || 0), 0);

            progress.forEach(p => {
                totalCorrect += p.correct_answers || 0;
                totalQuestions += p.total_questions || 0;
            });

            return {
                activity,
                summary: {
                    totalCorrect,
                    totalWrong: Math.max(0, totalQuestions - totalCorrect),
                    totalMinutes,
                    totalXp: activity.reduce((acc, curr) => acc + (curr.xp_earned || 0), 0),
                    totalLessons: activity.reduce((acc, curr) => acc + (curr.lessons_completed || 0), 0)
                }
            };
        } catch (error) {
            console.error('Error in fetchAnalysis:', error);
            return null;
        }
    },

    /**
     * Increment minutes spent by a user today
     * @param {string} userId - User ID
     * @returns {Promise<boolean>}
     */
    async addMinuteSpent(userId) {
        if (!userId) return false;
        try {
            const today = formatLocalDate(new Date());
            
            // First, check if activity entry exists
            const { data, error } = await supabase
                .from('user_daily_activity')
                .select('minutes_spent')
                .eq('user_id', userId)
                .eq('activity_date', today)
                .single();

            const currentMinutes = data?.minutes_spent || 0;

            const { error: upsertError } = await supabase
                .from('user_daily_activity')
                .upsert({
                    user_id: userId,
                    activity_date: today,
                    minutes_spent: currentMinutes + 1
                }, { onConflict: 'user_id,activity_date' });

            if (upsertError) throw upsertError;
            return true;
        } catch (error) {
            console.error('Error tracking time spent:', error);
            return false;
        }
    }
};
