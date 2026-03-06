import React, { useState, useEffect } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { Home, Trophy, Compass, Store, User, Settings } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { courseService } from '../../../services/courseService';
import { cn } from '../../../lib/utils';
import styles from './BottomNav.module.css';

const BottomNav = () => {
    const { user } = useAuth();
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
                className={({ isActive }) => cn(styles.navItem, (isActive || (currentCourseId && learnPath.includes(currentCourseId))) && styles.navItemActive)}
            >
                <Home size={22} />
                <span>শিখুন</span>
            </NavLink>

            <NavLink to="/courses" className={({ isActive }) => cn(styles.navItem, isActive && styles.navItemActive)}>
                <Compass size={22} />
                <span>কোর্সসমূহ</span>
            </NavLink>

            <NavLink to="/leaderboard" className={({ isActive }) => cn(styles.navItem, isActive && styles.navItemActive)}>
                <Trophy size={22} />
                <span>লিডারবোর্ড</span>
            </NavLink>

            <NavLink to="/shop" className={({ isActive }) => cn(styles.navItem, isActive && styles.navItemActive)}>
                <Store size={22} />
                <span>দোকান</span>
            </NavLink>

            <NavLink to="/profile" className={({ isActive }) => cn(styles.navItem, isActive && styles.navItemActive)}>
                <User size={22} />
                <span>প্রোফাইল</span>
            </NavLink>

            <NavLink to="/settings" className={({ isActive }) => cn(styles.navItem, isActive && styles.navItemActive)}>
                <Settings size={22} />
                <span>সেটিংস</span>
            </NavLink>
        </nav>
    );
};

export default BottomNav;
