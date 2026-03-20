import React, { useEffect, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'sonner';
import { Users, Check, X, User } from 'lucide-react';
import Sidebar from '../../features/learning/components/Sidebar';
import BottomNav from '../../features/learning/components/BottomNav';
import { rewardService } from '../../services/rewardService';
import { connectionService } from '../../services/connectionService';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import styles from './MainLayout.module.css';

const MainLayout = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { isInboxOpen, activeChatId } = useNotifications();
    const intervalRef = useRef(null);

    // Heartbeat tracker
    useEffect(() => {
        if (!user?.id) return;

        const startHeartbeat = () => {
            intervalRef.current = setInterval(async () => {
                if (document.visibilityState === 'visible') {
                    await rewardService.addMinuteSpent(user.id);
                }
            }, 60000);
        };

        startHeartbeat();

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [user?.id]);

    // Global Real-time connection request listener
    useEffect(() => {
        if (!user?.id) return;



        const showMessageToast = async (msg) => {
            // IF ALREADY IN INBOX OR CHATTING WITH SENDER, DO NOT SHOW
            if (isInboxOpen && (!activeChatId || activeChatId === msg.sender_id)) return;
            // If we are explicitly chatting with this person elsewhere
            if (activeChatId === msg.sender_id) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', msg.sender_id)
                .single();

            if (!profile) return;

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
                    {/* Avatar */}
                    <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        background: 'rgba(255, 255, 255, 0.05)',
                        flexShrink: 0,
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                        {profile.avatar_url ? (
                            <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                <User size={18} color="rgba(255, 255, 255, 0.4)" />
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ 
                            fontSize: '9px', 
                            color: 'var(--color-primary)', 
                            fontWeight: '800', 
                            textTransform: 'uppercase', 
                            letterSpacing: '1px' 
                        }}>
                            নতুন মেসেজ
                        </div>
                        <div style={{ 
                            fontSize: '0.85rem', 
                            fontWeight: '700', 
                            color: '#fff', 
                            lineHeight: '1.2' 
                        }}>
                            {profile.full_name || profile.display_name}
                        </div>
                        <div style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: '400', 
                            whiteSpace: 'nowrap', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            color: 'rgba(255,255,255,0.5)',
                            marginTop: '1px' 
                        }}>
                            {msg.content || 'ছবি পাঠানো হয়েছে'}
                        </div>
                    </div>

                    {/* Action */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button 
                            onClick={() => {
                                toast.dismiss(t);
                                navigate(`/profile?tab=connection&sub=inbox&partnerId=${msg.sender_id}`);
                            }}
                            style={{
                                background: 'var(--color-primary)',
                                color: '#000',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '6px 14px',
                                fontSize: '11px',
                                fontWeight: '800',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            দেখুন
                        </button>
                        <button 
                            onClick={() => toast.dismiss(t)}
                            style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.2)', cursor: 'pointer', padding: '4px' }}
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            ), { duration: 5000 });
        };

        // Unified notifications are handled in NotificationContext.jsx

        const messageChannel = supabase
            .channel(`global-messages-${user.id}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` },
                (payload) => {
                    showMessageToast(payload.new);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(messageChannel);
        };
    }, [user?.id, isInboxOpen, activeChatId]);

    return (
        <div className={styles.appLayout}>
            <svg width="0" height="0" style={{ position: 'absolute' }}>
                <defs>
                    <linearGradient id="flameGradientTracker" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f1c40f" />
                        <stop offset="100%" stopColor="#ff4d00" />
                    </linearGradient>
                </defs>
            </svg>
            <Sidebar />
            <main className={styles.mainContent}>
                <Outlet />
            </main>
            <BottomNav />
        </div>
    );
};

export default MainLayout;
