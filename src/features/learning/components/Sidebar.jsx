import React, { useState, useEffect } from 'react';
import { NavLink, useParams, useNavigate } from 'react-router-dom';
import { Home, Trophy, Compass, Store, User, MoreHorizontal, Settings, HelpCircle, LogOut } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { courseService } from '../../../services/courseService';
import { honeyJarService } from '../../../services/honeyJarService';
import { cn } from '../../../lib/utils';
import logo from '../../../assets/shields/Logo_BeeLesson.png';
import { supabase } from '../../../lib/supabaseClient';
import styles from './Sidebar.module.css';
import ConfirmModal from '../../../components/ui/ConfirmModal';

const Sidebar = () => {
    const { user, signOut } = useAuth();
    const { courseId: currentCourseId } = useParams();
    const navigate = useNavigate();
    const [lastCourseId, setLastCourseId] = useState(null);
    const [moreOpen, setMoreOpen] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showsJarNotif, setShowsJarNotif] = useState(false);

    const handleLogout = async () => {
        try {
            await signOut();
            navigate('/auth');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

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

        // Robust logic for Notification Dot: Show if (Jar is 100% FULL) OR (There is an Unclaimed Gift)
        if (user) {
            const checkNotificationStatus = async () => {
                try {
                    const [progress, gift] = await Promise.all([
                        honeyJarService.getJarProgress(user.id),
                        honeyJarService.getUnclaimedGift(user.id)
                    ]);
                    setShowsJarNotif(!!(progress?.is_full || gift));
                } catch (err) {
                    console.error('Initial notif check error:', err);
                }
            };

            checkNotificationStatus();

            // 1. Subscribe to Jar Progress (for "Jar is Full" event)
            const jarChannel = honeyJarService.subscribeToJarProgress(user.id, (payload) => {
                if (payload.is_full) {
                    setShowsJarNotif(true);
                } else {
                    // Re-verify gifts to be sure
                    honeyJarService.getUnclaimedGift(user.id).then(gift => {
                        setShowsJarNotif(!!gift);
                    });
                }
            });

            // 2. Subscribe to Gifts (for "Gift Claimed" event)
            const giftChannel = honeyJarService.subscribeToGifts(user.id, (payload) => {
                if (payload.is_claimed) {
                    // If claimed, double check jar status before hiding
                    honeyJarService.getJarProgress(user.id).then(progress => {
                        setShowsJarNotif(!!progress?.is_full);
                    });
                } else {
                    setShowsJarNotif(true); // New gift arrived
                }
            });

            return () => {
                if (jarChannel) supabase.removeChannel(jarChannel);
                if (giftChannel) supabase.removeChannel(giftChannel);
            };
        }
    }, [user, currentCourseId]);

    // Priority: 1. Current course in URL, 2. Last practiced course from DB, 3. Default courses page
    const learnPath = currentCourseId ? `/learn/${currentCourseId}` : (lastCourseId ? `/learn/${lastCourseId}` : '/courses');

    return (
        <aside className={styles.leftSidebar}>
            <div className={styles.logoArea}>
                <img src={logo} alt="BeeLesson" className={styles.logoImg} />
            </div>

            <NavLink
                to={learnPath}
                className={({ isActive }) => `${styles.navItem} ${isActive || (currentCourseId && learnPath.includes(currentCourseId)) ? styles.navItemActive : ''}`}
            >
                <div className={styles.navIconWrapper}>
                    <Home size={24} />
                </div>
                <span>শিখুন</span>
            </NavLink>

            <NavLink to="/courses" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}>
                <div className={styles.navIconWrapper}>
                    <Compass size={24} />
                </div>
                <span>কোর্সসমূহ</span>
            </NavLink>

            <NavLink to="/leaderboard" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}>
                <div className={styles.navIconWrapper}>
                    <Trophy size={24} />
                </div>
                <span>লিডারবোর্ড</span>
            </NavLink>

            <NavLink to="/shop" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}>
                <div className={styles.navIconWrapper}>
                    <Store size={24} />
                </div>
                <span>দোকান</span>
            </NavLink>

            <NavLink to="/profile" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}>
                <div className={styles.navIconWrapper}>
                    <User size={24} />
                    {showsJarNotif && <div className={styles.notifDot} />}
                </div>
                <span>প্রোফাইল</span>
            </NavLink>

            <div className={styles.moreContainer}>
                <button
                    className={cn(styles.navItem, moreOpen && styles.navItemActive)}
                    onClick={() => setMoreOpen(!moreOpen)}
                >
                    <MoreHorizontal size={24} />
                    <span>আরও</span>
                </button>

                {moreOpen && (
                    <div className={styles.moreDropdown}>
                        <NavLink
                            to="/settings"
                            className={styles.dropdownItem}
                            onClick={() => setMoreOpen(false)}
                        >
                            <Settings size={20} />
                            <span>সেটিংস</span>
                        </NavLink>
                        <NavLink
                            to="/help"
                            className={styles.dropdownItem}
                            onClick={() => setMoreOpen(false)}
                        >
                            <HelpCircle size={20} />
                            <span>সহায়তা</span>
                        </NavLink>
                        <button
                            className={styles.logoutBtn}
                            onClick={() => {
                                setMoreOpen(false);
                                setShowLogoutModal(true);
                            }}
                        >
                            <LogOut size={20} />
                            <span>লগআউট</span>
                        </button>
                    </div>
                )}
            </div>

            <ConfirmModal
                isOpen={showLogoutModal}
                onClose={() => setShowLogoutModal(false)}
                onConfirm={handleLogout}
            />
        </aside>
    );
};

export default Sidebar;
