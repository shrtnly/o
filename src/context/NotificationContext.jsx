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
    const [pendingConnectionsCount, setPendingConnectionsCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const PAGE_SIZE = 15;

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

    const refreshConnectionsCount = useCallback(async () => {
        if (!user) return;
        try {
            const { count, error } = await supabase
                .from('learner_connections')
                .select('*', { count: 'exact', head: true })
                .eq('receiver_id', user.id)
                .eq('status', 'pending');
            
            if (!error) {
                setPendingConnectionsCount(count || 0);
            }
        } catch (err) {
            console.error('Error refreshing connections count:', err);
        }
    }, [user]);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*, actor:profiles!actor_id(*)')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(PAGE_SIZE);
            
            if (error) throw error;
            setNotifications(data || []);
            setHasMore((data || []).length === PAGE_SIZE);
            refreshUnreadCount();
            refreshConnectionsCount();
        } catch (err) {
            console.error('Error fetching notifications:', err);
        } finally {
            setIsLoading(false);
        }
    }, [user, refreshUnreadCount, refreshConnectionsCount]);

    const loadMoreNotifications = useCallback(async () => {
        if (!user || isLoading || isLoadingMore || !hasMore) return;
        
        setIsLoadingMore(true);
        try {
            const lastNotif = notifications[notifications.length - 1];
            if (!lastNotif) {
                setHasMore(false);
                return;
            }

            const { data, error } = await supabase
                .from('notifications')
                .select('*, actor:profiles!actor_id(*)')
                .eq('user_id', user.id)
                .lt('created_at', lastNotif.created_at)
                .order('created_at', { ascending: false })
                .limit(PAGE_SIZE);
            
            if (error) throw error;
            
            if (data && data.length > 0) {
                // Avoid duplicates if realtime listener already added them
                setNotifications(prev => {
                    const existingIds = new Set(prev.map(n => n.id));
                    const newData = data.filter(n => !existingIds.has(n.id));
                    return [...prev, ...newData];
                });
                setHasMore(data.length === PAGE_SIZE);
            } else {
                setHasMore(false);
            }
        } catch (err) {
            console.error('Error loading more notifications:', err);
        } finally {
            setIsLoadingMore(false);
        }
    }, [user, notifications, hasMore, isLoading, isLoadingMore]);


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

        const notificationChannel = supabase
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
                        setNotifications(prev => {
                            if (prev.find(n => n.id === enrichedNotif.id)) return prev;
                            return [enrichedNotif, ...prev];
                        });
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
                                width: '320px',
                                minWidth: '280px',
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
                                            {newNotif.type === 'reward' && <span style={{ fontSize: '18px' }}>🌕</span>}
                                            {newNotif.type === 'streak' && <span style={{ fontSize: '18px' }}>🔥</span>}
                                            {newNotif.type === 'course' && (
                                                <span style={{ fontSize: '18px' }}>
                                                    {newNotif.data?.type === 'course_complete' ? '🎓' : 
                                                     newNotif.data?.type === 'module_complete' ? '🌟' : '📚'}
                                                </span>
                                            )}
                                            {newNotif.type === 'unlock' && (
                                                <span style={{ fontSize: '18px' }}>
                                                    {newNotif.data?.unlock_type === 'shield_gold' ? '🏆' :
                                                     newNotif.data?.unlock_type === 'shield_platinum' ? '💎' :
                                                     newNotif.data?.unlock_type === 'shield_diamond' ? '💠' : '🏆'}
                                                </span>
                                            )}
                                            {(!['reward', 'streak', 'course', 'unlock'].includes(newNotif.type)) && <span style={{ fontSize: '18px' }}>🔔</span>}
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
                                        {newNotif.data?.display_title || newNotif.title}
                                    </div>
                                    <div style={{ 
                                        fontSize: '0.82rem', 
                                        fontWeight: '800', 
                                        color: '#fff', 
                                        lineHeight: '1.2' 
                                    }}>
                                        {newNotif.data?.display_msg || (actorProfile?.full_name || actorProfile?.display_name || 'BeeLesson Achievement')}
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
                        ), { 
                            id: newNotif.id,
                            duration: 4000 
                        });
                    } else if (eventType === 'UPDATE') {
                        setNotifications(prev => prev.map(n => n.id === newNotif.id ? { ...n, ...newNotif } : n));
                    } else if (eventType === 'DELETE') {
                        setNotifications(prev => prev.filter(n => n.id !== oldNotif.id));
                    }
                }
            )
            .subscribe();


        const connectionsChannel = supabase
            .channel(`user-connections-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'learner_connections',
                    filter: `receiver_id=eq.${user.id}`
                },
                () => {
                    refreshConnectionsCount();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(notificationChannel);
            supabase.removeChannel(connectionsChannel);
        };
    }, [user, fetchNotifications, refreshConnectionsCount]);

    const [activeChatId, setActiveChatId] = useState(null);
    const [isInboxOpen, setIsInboxOpen] = useState(false);
    const [hasNewMsg, setHasNewMsg] = useState(false);

    const clearMsgIndicator = useCallback(() => {
        setHasNewMsg(false);
    }, []);

    // Realtime listener for new incoming messages — drives the Connections nav dot
    useEffect(() => {
        if (!user?.id) return;

        const msgChannel = supabase
            .channel(`msg-indicator-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `receiver_id=eq.${user.id}`
                },
                () => {
                    // Only light up the indicator when user is NOT already in inbox
                    setIsInboxOpen(prev => {
                        if (!prev) setHasNewMsg(true);
                        return prev;
                    });
                }
            )
            .subscribe();

        return () => supabase.removeChannel(msgChannel);
    }, [user?.id]);

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            pendingConnectionsCount,
            markAsRead,
            markAllAsRead,
            deleteNotification,
            respondToConnectionRequest,
            refresh: fetchNotifications,
            loadMore: loadMoreNotifications,
            isLoading,
            hasMore,
            isLoadingMore,
            activeChatId,
            setActiveChatId,
            isInboxOpen,
            setIsInboxOpen,
            hasNewMsg,
            clearMsgIndicator
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
