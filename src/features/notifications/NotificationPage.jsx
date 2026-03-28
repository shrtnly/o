import React, { useEffect, useRef } from 'react';
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
    CheckCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNotifications } from '../../context/NotificationContext';
import InlineLoader from '../../components/ui/InlineLoader';
import Skeleton from '../../components/ui/Skeleton';
import styles from './NotificationPage.module.css';

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
        isLoading
    } = useNotifications();
    const scrollRef = useRef(null);

    useEffect(() => {
        if (!user) {
            navigate('/auth');
            return;
        }
        refresh();
    }, [user, navigate, refresh]);

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

    return (
        <div className={styles.notifPage}>
            <div className={styles.container}>
                <header className={styles.header}>
                    <div className={styles.headerTitle}>
                        <Bell size={24} className={styles.icon} />
                        <h1>{t('notifications')}</h1>
                    </div>
                    {notifications.length > 0 && (
                        <button className={styles.markAllBtn} onClick={markAllAsRead}>
                            <CheckCheck size={16} />
                            <span>{t('notif_mark_all')}</span>
                        </button>
                    )}
                </header>

                <div ref={scrollRef} className={styles.body}>
                    {isLoading ? (
                        <div className={styles.skeletonList}>
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
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>
                                <Bell size={48} />
                            </div>
                            <h3>{t('empty_notif')}</h3>
                            <p>{t('no_notifications')}</p>
                        </div>
                    ) : (() => {
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
                                    {items.map(notif => (
                                        <div
                                            key={notif.id}
                                            className={`${styles.notifRow} ${!notif.is_read ? styles.notifRowUnread : ''}`}
                                            onClick={() => !notif.is_read && markAsRead(notif.id)}
                                        >
                                            {/* Unread dot */}
                                            <div className={styles.notifUnreadDot}>
                                                {!notif.is_read && <div className={styles.unreadDot} />}
                                            </div>

                                            {/* Icon */}
                                            <div className={styles.notifTypeIcon} style={{
                                                background: notif.type === 'reward' ? 'rgba(241,196,15,0.08)' :
                                                    notif.type === 'streak' ? 'rgba(230,126,34,0.08)' :
                                                        notif.type === 'course' ? 'rgba(46,204,113,0.08)' :
                                                            notif.type === 'unlock' || notif.type === 'achievement' ? 'rgba(155,89,182,0.08)' :
                                                                'rgba(52,152,219,0.08)'
                                            }}>
                                                {notif.actor?.avatar_url ? (
                                                    <img src={notif.actor.avatar_url} alt="" className={styles.notifActorImg} />
                                                ) : (
                                                    <>
                                                        {notif.type === 'reward' && <Trophy size={15} color="#F1C40F" />}
                                                        {notif.type === 'streak' && <Flame size={15} color="#E67E22" />}
                                                        {notif.type === 'course' && <BookOpen size={15} color="#2ECC71" />}
                                                        {(notif.type === 'unlock' || notif.type === 'achievement') && <Award size={15} color="#9B59B6" />}
                                                        {!['reward', 'streak', 'course', 'unlock', 'achievement'].includes(notif.type) && <Bell size={15} color="#3498DB" />}
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
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ));
                    })()}
                </div>
            </div>
        </div>
    );
};

export default NotificationPage;
