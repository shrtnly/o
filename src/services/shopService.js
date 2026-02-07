import { supabase } from '../lib/supabaseClient';

export const shopService = {
    /**
     * Convert gems to hearts
     * Rate: 10 gems = 1 heart
     */
    async convertGemsToHearts(userId, heartsToBuy) {
        const gemCost = heartsToBuy * 10;

        const { data, error } = await supabase.rpc('convert_gems_to_hearts', {
            p_user_id: userId,
            p_hearts_amount: heartsToBuy,
            p_gem_cost: gemCost
        });

        if (error) throw error;

        // Log transaction for conversion (optional, but good for tracking)
        try {
            await supabase.from('transactions').insert({
                user_id: userId,
                item_type: 'hearts',
                item_id: 'gem_conversion',
                amount: heartsToBuy,
                price: 0
            });
        } catch (e) {
            console.error('Transaction logging failed:', e);
        }

        return data;
    },

    /**
     * Subscribe to premium (monthly or yearly)
     */
    async subscribeToPremium(userId, planType, price) {
        const { data, error } = await supabase.rpc('process_subscription_purchase', {
            p_user_id: userId,
            p_plan_type: planType,
            p_amount: price
        });

        if (error) throw error;
        return data;
    },

    /**
     * Buy gems (using secure RPC and transaction tracking)
     */
    async buyGems(userId, amount, price, itemId) {
        const { data, error } = await supabase.rpc('process_gem_purchase', {
            p_user_id: userId,
            p_gem_amount: amount,
            p_price: price,
            p_item_id: itemId
        });

        if (error) throw error;
        return data;
    },

    /**
     * Fetch user transactions
     */
    async getTransactions(userId) {
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    /**
     * Fetch active subscription
     */
    async getActiveSubscription(userId) {
        const { data, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .gt('end_date', new Date().toISOString())
            .order('end_date', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // Ignore not found
        return data;
    }
};
