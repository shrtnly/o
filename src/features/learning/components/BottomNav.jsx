import React, { useState, useEffect } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { Home, Trophy, Compass, Store, User, Settings, Flame } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { courseService } from '../../../services/courseService';
import { cn } from '../../../lib/utils';
import styles from './BottomNav.module.css';

const BottomNav = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const { courseId: currentCourseId } = useParams();
    const [lastCourseId, setLastCourseId] = useState(null);

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
    }, [user, currentCourseId]);

    // Priority: 1. Current course in URL, 2. Last practiced course from DB, 3. Default courses page
    const learnPath = currentCourseId ? `/learn/${currentCourseId}` : (lastCourseId ? `/learn/${lastCourseId}` : '/courses');

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


            <NavLink to="/leaderboard" className={({ isActive }) => cn(styles.navItem, isActive && styles.navItemActive)}>
                {({ isActive }) => (
                    <>
                        <Trophy size={26} strokeWidth={1.5} />
                        {isActive && <span className={styles.navLabel}>{t('leaderboard')}</span>}
                    </>
                )}
            </NavLink>

            <NavLink to="/shop" className={({ isActive }) => cn(styles.navItem, isActive && styles.navItemActive)}>
                {({ isActive }) => (
                    <>
                        <Store size={26} strokeWidth={1.5} />
                        {isActive && <span className={styles.navLabel}>{t('shop')}</span>}
                    </>
                )}
            </NavLink>

            <NavLink to="/profile" className={({ isActive }) => cn(styles.navItem, isActive && styles.navItemActive)}>
                {({ isActive }) => (
                    <>
                        <User size={26} strokeWidth={1.5} />
                        {isActive && <span className={styles.navLabel}>{t('profile')}</span>}
                    </>
                )}
            </NavLink>
        </nav>
    );
};

export default BottomNav;
