import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import { X, Check } from 'lucide-react';
import { connectionService } from '../services/connectionService';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const refreshUnreadCount = useCallback(async () => {
        if (!user) return;
        try {
            const { count, error } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('is_read', false);
            
            if (!error) {
                setUnreadCount(count || 0);
            }
        } catch (err) {
            console.error('Error refreshing unread count:', err);
        }
    }, [user]);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*, actor:profiles!actor_id(*)')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);
            
            if (error) throw error;
            setNotifications(data || []);
            refreshUnreadCount();
        } catch (err) {
            console.error('Error fetching notifications:', err);
        }
    }, [user, refreshUnreadCount]);

    const deleteNotification = async (id) => {
        try {
            const deleted = notifications.find(n => n.id === id);
            if (deleted && !deleted.is_read) {
                setUnreadCount(u => Math.max(0, u - 1));
            }
            setNotifications(prev => prev.filter(n => n.id !== id));

            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('id', id);
            
            if (error) {
                // If it fails, we should probably re-add it, but usually delete is safe.
                console.error('Failed to delete from DB:', error);
            }
        } catch (err) {
            console.error('Error deleting notification:', err);
        }
    };

    const markAsRead = async (id) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', id);
            
            if (error) throw error;
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            refreshUnreadCount();
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

    const respondToConnectionRequest = async (notifId, connectionId, status, actorId) => {
        try {
            await connectionService.respondToRequest(connectionId, status, actorId, user.id);
            
            if (status === 'accepted') {
                const { error } = await supabase
                    .from('notifications')
                    .update({ 
                        data: { connection_id: connectionId, status: 'accepted' },
                        is_read: true 
                    })
                    .eq('id', notifId);
                
                if (error) throw error;
                
                setNotifications(prev => prev.map(n => 
                    n.id === notifId ? { ...n, is_read: true, data: { ...n.data, status: 'accepted' } } : n
                ));
                refreshUnreadCount();
            } else {
                await deleteNotification(notifId);
            }
        } catch (err) {
            console.error('Error responding to connection from notification:', err);
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
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                },
                async (payload) => {
                    const { eventType, new: newNotif, old: oldNotif } = payload;

                    // Always refresh the unread count globally for any change
                    refreshUnreadCount();

                    if (eventType === 'INSERT') {
                        let actorProfile = null;
                        if (newNotif.actor_id) {
                            const { data } = await supabase
                                .from('profiles')
                                .select('*')
                                .eq('id', newNotif.actor_id)
                                .single();
                            actorProfile = data;
                        }

                        const enrichedNotif = { ...newNotif, actor: actorProfile };
                        setNotifications(prev => [enrichedNotif, ...prev]);
                        refreshUnreadCount();

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
                                        fontSize: '9px', 
                                        color: 'var(--color-primary)', 
                                        fontWeight: '800', 
                                        textTransform: 'uppercase', 
                                        letterSpacing: '1px', 
                                        marginBottom: '2px' 
                                    }}>
                                        {newNotif.title}
                                    </div>
                                    <div style={{ 
                                        fontSize: '0.85rem', 
                                        fontWeight: '700', 
                                        color: '#fff', 
                                        lineHeight: '1.2' 
                                    }}>
                                        {actorProfile?.full_name || actorProfile?.display_name || 'লার্নার'}
                                    </div>
                                </div>

                                {/* Action Buttons for Connection */}
                                {newNotif.type === 'connection' && newNotif.data?.status === 'pending' ? (
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button 
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                await connectionService.respondToRequest(newNotif.data.connection_id, 'accepted', newNotif.actor_id, user.id);
                                                toast.dismiss(t);
                                            }}
                                            style={{
                                                background: 'var(--color-primary)',
                                                border: 'none',
                                                borderRadius: '8px',
                                                width: '30px',
                                                height: '30px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                color: '#000'
                                            }}
                                        >
                                            <Check size={18} strokeWidth={3} />
                                        </button>
                                        <button 
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                await connectionService.respondToRequest(newNotif.data.connection_id, 'rejected');
                                                toast.dismiss(t);
                                            }}
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                border: 'none',
                                                borderRadius: '8px',
                                                width: '30px',
                                                height: '30px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                color: 'rgba(255, 255, 255, 0.4)'
                                            }}
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => toast.dismiss(t)} 
                                        style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.2)', cursor: 'pointer', padding: '4px' }}
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        ), { duration: 5000 });
                    } else if (eventType === 'UPDATE') {
                        setNotifications(prev => prev.map(n => n.id === newNotif.id ? { ...n, ...newNotif } : n));
                    } else if (eventType === 'DELETE') {
                        setNotifications(prev => prev.filter(n => n.id !== oldNotif.id));
                    }
                }
            )
            .subscribe();


        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, fetchNotifications]);

    const [activeChatId, setActiveChatId] = useState(null);
    const [isInboxOpen, setIsInboxOpen] = useState(false);

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            markAsRead,
            markAllAsRead,
            deleteNotification,
            respondToConnectionRequest,
            refresh: fetchNotifications,
            activeChatId,
            setActiveChatId,
            isInboxOpen,
            setIsInboxOpen
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
