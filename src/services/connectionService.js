import { supabase } from '../lib/supabaseClient';

export const connectionService = {
    /**
     * Search learners by name or email
     */
    async searchLearners(query, currentUserId) {
        if (!query || query.length < 1) return [];
        
        // Trim and clean query
        const cleanQuery = query.trim();
        
        // Search by full name or email with better matching
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .neq('id', currentUserId)
            .or(`full_name.ilike.%${cleanQuery}%,email.ilike.%${cleanQuery}%,display_name.ilike.%${cleanQuery}%`)
            .limit(10);
            
        if (error) throw error;
        return data || [];
    },

    /**
     * Get suggested learners (similar or lower XP)
     */
    async getSuggestions(userId, userXp, limit = 5) {
        const { data: existingConns, error: connError } = await supabase
            .from('learner_connections')
            .select('sender_id, receiver_id')
            .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
            
        if (connError) throw connError;

        const connectedIds = [userId, ...existingConns.map(c => c.sender_id === userId ? c.receiver_id : c.sender_id)];

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .not('id', 'in', `(${connectedIds.join(',')})`)
            .lte('xp', userXp + 500) // suggested level
            .order('xp', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    },

    /**
     * Send a connection request
     */
    async sendRequest(senderId, receiverId) {
        const { data, error } = await supabase
            .from('learner_connections')
            .insert({
                sender_id: senderId,
                receiver_id: receiverId,
                status: 'pending'
            })
            .select()
            .single();

        if (error) throw error;

        // Create notification for receiver
        await supabase.from('notification_history').insert({
            user_id: receiverId,
            title: 'নতুন কানেকশন অনুরোধ!',
            message: 'একজন শিক্ষার্থী আপনাকে কানেকশন অনুরোধ পাঠিয়েছেন।',
            type: 'system'
        });

        return data;
    },

    /**
     * Get connections for a user
     */
    async getConnections(userId) {
        const { data, error } = await supabase
            .from('learner_connections')
            .select(`
                *,
                sender:profiles!sender_id(*),
                receiver:profiles!receiver_id(*)
            `)
            .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

        if (error) throw error;
        
        return {
            pending: data.filter(c => c.status === 'pending' && c.receiver_id === userId),
            outgoing: data.filter(c => c.status === 'pending' && c.sender_id === userId),
            active: data.filter(c => c.status === 'accepted')
        };
    },

    /**
     * Respond to a request
     */
    async respondToRequest(connectionId, status, senderId, receiverId) {
        const { error } = await supabase
            .from('learner_connections')
            .update({ status })
            .eq('id', connectionId);

        if (error) throw error;

        if (status === 'accepted') {
            // Notify original sender
            await supabase.from('notification_history').insert({
                user_id: senderId,
                title: 'অনুরোধ গ্রহণ করা হয়েছে!',
                message: 'আপনার কানেকশন অনুরোধটি গ্রহণ করা হয়েছে।',
                type: 'system'
            });
        }
        
        return true;
    },

    /**
     * Remove or cancel connection
     */
    async removeConnection(connectionId) {
        const { error } = await supabase
            .from('learner_connections')
            .delete()
            .eq('id', connectionId);

        if (error) throw error;
        return true;
    }
};
