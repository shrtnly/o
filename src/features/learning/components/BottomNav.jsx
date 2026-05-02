import React, { useState, useEffect } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { Home, Compass, User, Swords, Bell } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { courseService } from '../../../services/courseService';
import { cn } from '../../../lib/utils';
import { useNotifications } from '../../../context/NotificationContext';
import styles from './BottomNav.module.css';

const BottomNav = () => {
    const { user, profile } = useAuth();
    const { t, language } = useLanguage();
    const { unreadCount, pendingConnectionsCount, hasNewMsg } = useNotifications();
    const { courseId: currentCourseId } = useParams();
    const [lastCourseId, setLastCourseId] = useState(null);
    const [imgError, setImgError] = useState(false);

    useEffect(() => {
        setImgError(false); // Reset error when profile/avatar changes
    }, [profile?.avatar_url]);

    useEffect(() => {
        const fetchLastCourse = async () => {
            if (user) {
                try {
                    const id = await courseService.getLastPracticedCourseId(user.id);
                    setLastCourseId(id);
                } catch (error) {
                    console.error('Error fetching last course:', error);
                }
            }
        };
        fetchLastCourse();
    }, [user?.id, currentCourseId]);

    // Priority: 1. Current course in URL, 2. Last practiced course from DB, 3. Default root (which redirects)
    const learnPath = currentCourseId ? `/learn/${currentCourseId}` : (lastCourseId ? `/learn/${lastCourseId}` : '/');

    return (
        <nav className={styles.bottomNav}>
            <NavLink
                to={learnPath}
                className={({ isActive }) => {
                    const active = isActive || (currentCourseId && learnPath.includes(currentCourseId));
                    return cn(styles.navItem, active && styles.navItemActive);
                }}
            >
                {({ isActive }) => {
                    const active = isActive || (currentCourseId && learnPath.includes(currentCourseId));
                    return (
                        <>
                            <Home size={26} strokeWidth={1.5} />
                            {active && <span className={styles.navLabel}>{t('learn')}</span>}
                        </>
                    );
                }}
            </NavLink>

            <NavLink to="/courses" className={({ isActive }) => cn(styles.navItem, isActive && styles.navItemActive)}>
                {({ isActive }) => (
                    <>
                        <Compass size={26} strokeWidth={1.5} />
                        {isActive && <span className={styles.navLabel}>{t('courses')}</span>}
                    </>
                )}
            </NavLink>



            <NavLink to="/connections" className={({ isActive }) => cn(styles.navItem, isActive && styles.navItemActive)}>
                {({ isActive }) => (
                    <div className={styles.notifArea}>
                        <div className={styles.iconWrapper}>
                            <Swords size={26} strokeWidth={1.5} />
                            {pendingConnectionsCount > 0 && (
                                <span className={styles.navBadge}>{pendingConnectionsCount > 9 ? '9+' : pendingConnectionsCount}</span>
                            )}
                            {hasNewMsg && pendingConnectionsCount === 0 && (
                                <span className={styles.msgDot} />
                            )}
                        </div>
                        {isActive && <span className={styles.navLabel}>{t('tab_connection')}</span>}
                    </div>
                )}
            </NavLink>

            <NavLink to="/notifications" className={({ isActive }) => cn(styles.navItem, isActive && styles.navItemActive)}>
                {({ isActive }) => (
                    <div className={styles.notifArea}>
                        <div className={styles.iconWrapper}>
                            <Bell size={26} strokeWidth={1.5} />
                            {unreadCount > 0 && (
                                <span className={styles.navBadge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                            )}
                        </div>
                        {isActive && <span className={styles.navLabel}>{t('notifications')}</span>}
                    </div>
                )}
            </NavLink>

            <NavLink to="/profile" className={({ isActive }) => cn(styles.navItem, isActive && styles.navItemActive)}>
                {({ isActive }) => (
                    <>
                        {profile?.avatar_url && !imgError ? (
                            <img 
                                src={profile.avatar_url} 
                                alt="Profile" 
                                className={styles.profileImage}
                                onError={() => setImgError(true)}
                            />
                        ) : (
                            <User size={26} strokeWidth={1.5} />
                        )}
                        {isActive && <span className={styles.navLabel}>{t('profile')}</span>}
                    </>
                )}
            </NavLink>
        </nav>
    );
};

export default BottomNav;
