import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import { X } from 'lucide-react';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);
            
            if (error) throw error;
            setNotifications(data || []);
            setUnreadCount(data?.filter(n => !n.is_read).length || 0);
        } catch (err) {
            console.error('Error fetching notifications:', err);
        }
    }, [user]);

    const markAsRead = async (id) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', id);
            
            if (error) throw error;
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Error marking notification as read:', err);
        }
    };

    const markAllAsRead = async () => {
        if (!user) return;
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', user.id)
                .eq('is_read', false);
            
            if (error) throw error;
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Error marking all as read:', err);
        }
    };

    useEffect(() => {
        if (!user) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }

        fetchNotifications();

        const channel = supabase
            .channel(`user-notifications-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                },
                async (payload) => {
                    const newNotif = payload.new;
                    setNotifications(prev => [newNotif, ...prev]);
                    setUnreadCount(prev => prev + 1);
                    
                    // Fetch actor profile if exists
                    let actorProfile = null;
                    if (newNotif.actor_id) {
                        const { data } = await supabase
                            .from('profiles')
                            .select('*')
                            .eq('id', newNotif.actor_id)
                            .single();
                        actorProfile = data;
                    }

                    // Show Premium Custom Toast
                    toast.custom((t) => (
                        <div style={{
                            background: 'rgba(12, 12, 12, 0.98)',
                            padding: '10px 14px',
                            borderRadius: '16px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(16px)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            width: '90vw',
                            maxWidth: '320px',
                            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
                            color: '#fff',
                            fontFamily: "'Hind Siliguri', sans-serif"
                        }}>
                            {/* Icon/Avatar */}
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                overflow: 'hidden',
                                background: 'rgba(255, 255, 255, 0.05)',
                                flexShrink: 0,
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {actorProfile?.avatar_url ? (
                                    <img src={actorProfile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ background: 'var(--color-primary-soft)', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {newNotif.type === 'reward' && <span style={{ fontSize: '18px' }}>🏆</span>}
                                        {newNotif.type === 'streak' && <span style={{ fontSize: '18px' }}>🔥</span>}
                                        {newNotif.type === 'course' && <span style={{ fontSize: '18px' }}>📚</span>}
                                        {(!['reward', 'streak', 'course'].includes(newNotif.type)) && <span style={{ fontSize: '18px' }}>🔔</span>}
                                    </div>
                                )}
                            </div>

                            {/* Text Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ 
                                    fontSize: '10px', 
                                    color: 'var(--color-primary)', 
                                    fontWeight: '800', 
                                    textTransform: 'uppercase', 
                                    letterSpacing: '0.8px', 
                                    marginBottom: '2px' 
                                }}>
                                    {newNotif.title}
                                </div>
                                <div style={{ 
                                    fontSize: '0.82rem', 
                                    fontWeight: '700', 
                                    whiteSpace: 'normal', 
                                    overflow: 'hidden',
                                    lineHeight: '1.3',
                                    color: 'rgba(255, 255, 255, 0.9)'
                                }}>
                                    {newNotif.message}
                                </div>
                            </div>

                            {/* Close */}
                            <button 
                                onClick={() => toast.dismiss(t)} 
                                style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.3)', cursor: 'pointer', padding: '4px' }}
                            >
                                <X size={16} />
                            </button>
                        </div>
                    ), { duration: 5000 });
                }
            )
            .subscribe();


        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, fetchNotifications]);

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            markAsRead,
            markAllAsRead,
            refresh: fetchNotifications
        }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
