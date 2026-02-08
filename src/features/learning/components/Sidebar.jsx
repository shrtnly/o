import React, { useState, useEffect } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { Home, Trophy, Compass, Store, User, MoreHorizontal } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { courseService } from '../../../services/courseService';
import styles from '../LearningPage.module.css';

const Sidebar = () => {
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
        <aside className={styles.leftSidebar}>
            <div className={styles.logoArea}>
                <span className={styles.logoText}>ও-শেখা</span>
            </div>

            <NavLink
                to={learnPath}
                className={({ isActive }) => `${styles.navItem} ${isActive || (currentCourseId && learnPath.includes(currentCourseId)) ? styles.navItemActive : ''}`}
            >
                <Home size={24} />
                <span>শিখুন</span>
            </NavLink>

            <NavLink to="/courses" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}>
                <Compass size={24} />
                <span>কোর্সসমূহ</span>
            </NavLink>

            <NavLink to="/leaderboard" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}>
                <Trophy size={24} />
                <span>লিডারবোর্ড</span>
            </NavLink>

            <NavLink to="/shop" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}>
                <Store size={24} />
                <span>দোকান</span>
            </NavLink>

            <NavLink to="/profile" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}>
                <User size={24} />
                <span>প্রোফাইল</span>
            </NavLink>

            <button className={styles.navItem}>
                <MoreHorizontal size={24} />
                <span>আরও</span>
            </button>
        </aside>
    );
};

export default Sidebar;
