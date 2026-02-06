import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * Custom hook to manage heart system with automatic refill
 * 
 * Features:
 * - Initial 5 hearts for new users
 * - Automatic refill to 5 hearts after 2 hours when hearts reach 0
 * - Real-time countdown to next refill
 * - Deduct hearts on wrong answers
 * 
 * @param {string} userId - The user's ID
 * @returns {object} Heart system state and methods
 */
export const useHeartRefill = (userId) => {
    const [hearts, setHearts] = useState(5);
    const [maxHearts, setMaxHearts] = useState(5);
    const [lastRefillAt, setLastRefillAt] = useState(null);
    const [timeUntilRefill, setTimeUntilRefill] = useState(null);
    const [isRefilling, setIsRefilling] = useState(false);
    const [loading, setLoading] = useState(true);

    /**
     * Check and refill hearts if 2 hours have passed
     */
    const checkAndRefillHearts = useCallback(async () => {
        if (!userId) return;

        try {
            const { data, error } = await supabase.rpc('check_and_refill_hearts', {
                p_user_id: userId
            });

            if (error) throw error;

            if (data && data.length > 0) {
                const result = data[0];
                setHearts(result.hearts);
                setMaxHearts(result.max_hearts);
                setLastRefillAt(result.last_refill_at);

                // Parse interval to milliseconds for countdown
                if (result.time_until_next_refill) {
                    const interval = result.time_until_next_refill;
                    // Parse PostgreSQL interval format
                    const match = interval.match(/(\d+):(\d+):(\d+)/);
                    if (match) {
                        const hours = parseInt(match[1]);
                        const minutes = parseInt(match[2]);
                        const seconds = parseInt(match[3]);
                        const totalMs = (hours * 3600 + minutes * 60 + seconds) * 1000;
                        setTimeUntilRefill(totalMs);
                    }
                }

                if (result.refilled) {
                    console.log('Hearts refilled!', result);
                }
            }
        } catch (error) {
            console.error('Error checking heart refill:', error);

            // Fallback: fetch from profiles directly
            try {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('hearts, max_hearts, last_heart_refill_at')
                    .eq('id', userId)
                    .single();

                if (profile) {
                    setHearts(profile.hearts || 5);
                    setMaxHearts(profile.max_hearts || 5);
                    setLastRefillAt(profile.last_heart_refill_at);
                }
            } catch (fallbackError) {
                console.error('Fallback heart fetch failed:', fallbackError);
            }
        } finally {
            setLoading(false);
        }
    }, [userId]);

    /**
     * Deduct hearts (called when user answers incorrectly)
     */
    const deductHeart = useCallback(async (amount = 1) => {
        if (!userId) return { success: false, newHearts: hearts };

        try {
            setIsRefilling(true);

            const { data, error } = await supabase.rpc('deduct_user_hearts', {
                p_user_id: userId,
                p_amount: amount
            });

            if (error) throw error;

            if (data && data.length > 0) {
                const newHearts = data[0].new_hearts;
                setHearts(newHearts);

                // If hearts reached 0, start the 3-hour timer
                if (newHearts === 0) {
                    setLastRefillAt(new Date().toISOString());
                    setTimeUntilRefill(2 * 60 * 60 * 1000); // 2 hours in ms
                }

                return { success: true, newHearts };
            }
        } catch (error) {
            console.error('Error deducting hearts:', error);

            // Fallback
            const newHearts = Math.max(0, hearts - amount);
            setHearts(newHearts);

            try {
                await supabase
                    .from('profiles')
                    .update({ hearts: newHearts })
                    .eq('id', userId);
            } catch (fallbackError) {
                console.error('Fallback heart deduction failed:', fallbackError);
            }

            return { success: false, newHearts };
        } finally {
            setIsRefilling(false);
        }
    }, [userId, hearts]);

    /**
     * Award hearts (from mystery boxes, etc.)
     */
    const awardHearts = useCallback(async (amount, source = 'mystery_box', metadata = {}) => {
        if (!userId) return { success: false, newHearts: hearts };

        try {
            setIsRefilling(true);

            const { data, error } = await supabase.rpc('award_user_hearts', {
                p_user_id: userId,
                p_amount: amount,
                p_source: source,
                p_chapter_id: metadata.chapterId || null,
                p_course_id: metadata.courseId || null,
                p_metadata: metadata
            });

            if (error) throw error;

            if (data && data.length > 0) {
                const newHearts = data[0].new_hearts;
                setHearts(newHearts);
                return { success: true, newHearts };
            }
        } catch (error) {
            console.error('Error awarding hearts:', error);

            // Fallback
            const newHearts = Math.min(maxHearts, hearts + amount);
            setHearts(newHearts);

            try {
                await supabase
                    .from('profiles')
                    .update({ hearts: newHearts })
                    .eq('id', userId);
            } catch (fallbackError) {
                console.error('Fallback heart award failed:', fallbackError);
            }

            return { success: false, newHearts };
        } finally {
            setIsRefilling(false);
        }
    }, [userId, hearts, maxHearts]);

    /**
     * Format time until refill for display
     */
    const getRefillTimeDisplay = useCallback(() => {
        if (!timeUntilRefill || timeUntilRefill <= 0 || hearts >= maxHearts) {
            return null;
        }

        const totalSeconds = Math.floor(timeUntilRefill / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, [timeUntilRefill, hearts, maxHearts]);

    // Initial load
    useEffect(() => {
        if (userId) {
            checkAndRefillHearts();
        }
    }, [userId, checkAndRefillHearts]);

    // Check for refill every minute
    useEffect(() => {
        if (!userId) return;

        const interval = setInterval(() => {
            checkAndRefillHearts();
        }, 60000); // Check every minute

        return () => clearInterval(interval);
    }, [userId, checkAndRefillHearts]);

    // Countdown timer (updates every second)
    useEffect(() => {
        if (timeUntilRefill === null || timeUntilRefill <= 0) return;

        const interval = setInterval(() => {
            setTimeUntilRefill(prev => {
                if (prev === null || prev <= 1000) {
                    // Time's up! Check for refill
                    checkAndRefillHearts();
                    return 0;
                }
                return prev - 1000;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [timeUntilRefill, checkAndRefillHearts]);

    return {
        hearts,
        maxHearts,
        lastRefillAt,
        timeUntilRefill,
        refillTimeDisplay: getRefillTimeDisplay(),
        isRefilling,
        loading,
        deductHeart,
        awardHearts,
        checkAndRefillHearts,
        canAnswer: hearts > 0,
        needsRefill: hearts === 0
    };
};
