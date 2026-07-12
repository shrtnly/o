import React, { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Bell, 
    Check, 
    X, 
    Trophy, 
    Flame, 
    BookOpen, 
    Award, 
    ChevronRight,
    User,
    CheckCheck,
    Swords
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNotifications } from '../../context/NotificationContext';
import InlineLoader from '../../components/ui/InlineLoader';
import Skeleton from '../../components/ui/Skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './NotificationPage.module.css';
import SEO from '../../components/SEO';

const NotificationPage = () => {
    const { user } = useAuth();
    const { t, language } = useLanguage();
    const navigate = useNavigate();
    const { 
        notifications, 
        markAsRead, 
        markAllAsRead, 
        deleteNotification,
        refresh,
        loadMore,
        isLoading,
        hasMore,
        isLoadingMore
    } = useNotifications();
    const scrollRef = useRef(null);
    const observer = useRef();

    const lastNotifRef = useCallback(node => {
        if (isLoading || isLoadingMore) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                loadMore();
            }
        }, { threshold: 0.1 });
        if (node) observer.current.observe(node);
    }, [isLoading, isLoadingMore, hasMore, loadMore]);

    useEffect(() => {
        if (!user) {
            navigate('/auth');
            return;
        }
    }, [user, navigate]);

    const formatNotifDate = (dateStr) => {
        const d = new Date(dateStr);
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (isToday) return timeStr;

        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (d.toDateString() === yesterday.toDateString()) {
            return `${t('yesterday')}, ${timeStr}`;
        }

        // For earlier dates, show DD MMM, HH:MM
        const datePart = d.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { day: '2-digit', month: 'short' });
        return `${datePart}, ${timeStr}`;
    };

    const hasUnread = notifications.some(notif => !notif.is_read);

    return (
        <motion.div 
            className={styles.notifPage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
        >
            <div className={styles.container}>
                <header className={styles.header}>
                    <div className={styles.headerTitle}>
                        <Bell size={24} className={styles.icon} />
                        <h1>{t('notifications')}</h1>
                    </div>
                    { !isLoading && notifications.length > 0 && (
                        <button 
                            className={styles.markAllBtn} 
                            onClick={markAllAsRead}
                            disabled={!hasUnread}
                            title={t('notif_mark_all')}
                            aria-label={t('notif_mark_all')}
                        >
                            <CheckCheck size={16} />
                        </button>
                    )}
                </header>

                <div ref={scrollRef} className={styles.body}>
                    <AnimatePresence>
                        {isLoading ? (
                            <motion.div 
                                key="skeleton"
                                initial={false}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className={styles.skeletonList}
                            >
                                {[...Array(8)].map((_, i) => (
                                    <div key={i} className={styles.notifRow} style={{ pointerEvents: 'none' }}>
                                        <div className={styles.notifUnreadDot} />
                                        <div className={styles.notifTypeIcon}>
                                            <Skeleton width="34px" height="34px" borderRadius="50%" />
                                        </div>
                                        <div className={styles.notifRowText} style={{ flex: 1, gap: '8px' }}>
                                            <Skeleton width="40%" height="14px" />
                                            <Skeleton width="75%" height="11px" />
                                            <Skeleton width="20%" height="9px" />
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        ) : notifications.length === 0 ? (
                            <motion.div 
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.2 }}
                                className={styles.emptyState}
                            >
                                <div className={styles.emptyIcon}>
                                    <Bell size={48} />
                                </div>
                                <h3>{t('empty_notif')}</h3>
                                <p>{t('no_notifications')}</p>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="list"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.2 }}
                            >
                                {(() => {
                                    const seenIds = new Set();
                                    const groups = notifications.reduce((acc, notif) => {
                                        if (seenIds.has(notif.id)) return acc;
                                        seenIds.add(notif.id);
                                        const d = new Date(notif.created_at);
                                        const today = new Date();
                                        const yesterday = new Date(today);
                                        yesterday.setDate(yesterday.getDate() - 1);
                                        
                                        let key = t('earlier');
                                        if (d.toDateString() === today.toDateString()) key = t('today');
                                        else if (d.toDateString() === yesterday.toDateString()) key = t('yesterday');
                                        
                                        if (!acc[key]) acc[key] = [];
                                        acc[key].push(notif);
                                        return acc;
                                    }, {});

                                    return Object.entries(groups).map(([groupName, items]) => (
                                        <div key={groupName} className={styles.notifGroup}>
                                            <h5 className={styles.groupHeading}>{groupName}</h5>
                                            <div className={styles.groupItems}>
                                                <AnimatePresence initial={false}>
                                                    {items.map((notif, idx) => {
                                                        const isLastOverall = groupName === Object.keys(groups)[Object.keys(groups).length - 1] && idx === items.length - 1;
                                                        return (
                                                            <motion.div
                                                                key={notif.id}
                                                                ref={isLastOverall ? lastNotifRef : null}
                                                                className={`${styles.notifRow} ${!notif.is_read ? styles.notifRowUnread : ''}`}
                                                                onClick={() => !notif.is_read && markAsRead(notif.id)}
                                                                layout
                                                                initial={{ opacity: 1, height: 'auto' }}
                                                                exit={{
                                                                    opacity: 0,
                                                                    x: -80,
                                                                    height: 0,
                                                                    paddingTop: 0,
                                                                    paddingBottom: 0,
                                                                    borderBottomWidth: 0,
                                                                    overflow: 'hidden'
                                                                }}
                                                                transition={{
                                                                    type: 'spring',
                                                                    stiffness: 400,
                                                                    damping: 30,
                                                                    mass: 0.8,
                                                                    opacity: { duration: 0.15 },
                                                                    height: { duration: 0.2 }
                                                                }}
                                                            >
                                                                {/* Unread dot */}
                                                                <div className={styles.notifUnreadDot}>
                                                                    {!notif.is_read && <div className={styles.unreadDot} />}
                                                                </div>

                                                                {/* Icon */}
                                                                <div className={styles.notifTypeIcon} style={{
                                                                    background: notif.type === 'reward' ? 'rgba(255, 184, 0,0.08)' :
                                                                        notif.type === 'streak' ? 'rgba(230,126,34,0.08)' :
                                                                            notif.type === 'course' ? 'rgba(46,204,113,0.08)' :
                                                                                notif.type === 'unlock' || notif.type === 'achievement' ? 'rgba(155,89,182,0.08)' :
                                                                                    'rgba(52,152,219,0.08)'
                                                                }}>
                                                                    {notif.actor?.avatar_url ? (
                                                                        <img src={notif.actor.avatar_url} alt="" className={styles.notifActorImg} />
                                                                    ) : (
                                                                        <>
                                                                            {notif.type === 'reward' && <Trophy size={15} color="#FFB800" />}
                                                                            {notif.type === 'streak' && <Flame size={15} color="#E67E22" />}
                                                                            {notif.type === 'course' && <BookOpen size={15} color="#2ECC71" />}
                                                                            {notif.type === 'unlock' && (
                                                                                notif.data?.unlock_type === 'shield_gold' ? <Trophy size={15} color="#FFB800" /> :
                                                                                notif.data?.unlock_type === 'shield_platinum' ? <Award size={15} color="#9B59B6" /> :
                                                                                notif.data?.unlock_type === 'shield_diamond' ? <Award size={15} color="#3498DB" /> :
                                                                                <Award size={15} color="#9B59B6" />
                                                                            )}
                                                                            {notif.type === 'achievement' && <Award size={15} color="#9B59B6" />}
                                                                            {notif.type === 'battle_invite' && <Swords size={15} color="var(--color-primary)" />}
                                                                            {!['reward', 'streak', 'course', 'unlock', 'achievement', 'battle_invite'].includes(notif.type) && <Bell size={15} color="#3498DB" />}
                                                                        </>
                                                                    )}
                                                                </div>

                                                                {/* Text */}
                                                                <div className={styles.notifRowText}>
                                                                    <span className={styles.nTitle}>
                                                                        {notif.type === 'connection' && notif.data?.status === 'pending'
                                                                            ? 'নতুন কানেকশন অনুরোধ!'
                                                                            : notif.title}
                                                                    </span>
                                                                    <span className={styles.nMsg}>
                                                                        {notif.type === 'connection' && notif.data?.status === 'pending'
                                                                            ? `${notif.actor?.full_name || 'কেউ একজন'} আপনাকে কানেকশন অনুরোধ পাঠিয়েছেন।`
                                                                            : notif.message}
                                                                    </span>

                                                                    {/* Actions */}
                                                                    {notif.type === 'connection' && notif.data?.status === 'accepted' && (
                                                                        <div className={styles.respondedStatus}>
                                                                            <Check size={12} strokeWidth={3} />
                                                                            <span>সংযুক্ত হয়েছেন</span>
                                                                        </div>
                                                                    )}
                                                                    {notif.type === 'reward' && (
                                                                        <button className={styles.actionLink} onClick={() => navigate('/shop')}>
                                                                            শপ দেখুন <ChevronRight size={11} />
                                                                        </button>
                                                                    )}

                                                                    {notif.type === 'battle_invite' && notif.data?.status === 'accepted' && (
                                                                        <div className={styles.respondedStatus}>
                                                                            <Check size={12} strokeWidth={3} />
                                                                            <span>ব্যাটেল করেছেন</span>
                                                                        </div>
                                                                    )}

                                                                    {notif.type === 'battle_invite' && notif.data?.status === 'finished' && (
                                                                        <div className={styles.respondedStatus} style={{ color: 'var(--color-primary)', background: 'var(--color-primary-soft)' }}>
                                                                            <Trophy size={12} strokeWidth={3} />
                                                                            <span>ফলাফল দেখুন</span>
                                                                        </div>
                                                                    )}

                                                                    {notif.type === 'battle_invite' && !notif.data?.status && (
                                                                        (() => {
                                                                            const createdAt = new Date(notif.created_at).getTime();
                                                                            const now = new Date().getTime();
                                                                            const diffSeconds = (now - createdAt) / 1000;
                                                                            const isExpired = diffSeconds > 20;

                                                                            if (isExpired) {
                                                                                return (
                                                                                    <div className={styles.respondedStatus} style={{ color: 'var(--color-text-muted)', background: 'var(--color-bg-hover)' }}>
                                                                                        <X size={12} strokeWidth={3} />
                                                                                        <span>গ্রহণ করা হয়নি</span>
                                                                                    </div>
                                                                                );
                                                                            }

                                                                            return (
                                                                                <button
                                                                                    className={styles.actionLink}
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        window.location.href = `/connections?sub=battle&joinCode=${notif.data?.roomCode}`;
                                                                                        if (!notif.is_read) markAsRead(notif.id);
                                                                                    }}
                                                                                >
                                                                                    ব্যাটলে যোগ দিন <ChevronRight size={11} />
                                                                                </button>
                                                                            );
                                                                        })()
                                                                    )}

                                                                    {notif.type === 'connection' && notif.data?.status === 'pending' && (
                                                                        <button
                                                                            className={styles.actionLink}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                navigate('/connections?sub=received');
                                                                                if (!notif.is_read) markAsRead(notif.id);
                                                                            }}
                                                                        >
                                                                            দেখুন <ChevronRight size={11} />
                                                                        </button>
                                                                    )}

                                                                    <span className={styles.nTime}>{formatNotifDate(notif.created_at)}</span>
                                                                </div>

                                                                {/* Delete */}
                                                                <button
                                                                    type="button"
                                                                    className={styles.deleteNotif}
                                                                    onClick={e => { e.preventDefault(); e.stopPropagation(); deleteNotification(notif.id); }}
                                                                >
                                                                    <X size={13} />
                                                                </button>
                                                            </motion.div>
                                                        );
                                                    })}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    ));
                                })()}
                                {isLoadingMore && (
                                    <div className={styles.loadMoreRow}>
                                        <InlineLoader size={20} />
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

            </div>
        </motion.div>
    );
};

export default NotificationPage;
