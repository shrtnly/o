import { Link } from 'react-router-dom';
import { Moon, Sun, LogOut, Users, Bell, User } from 'lucide-react';
import Button from '../ui/Button';
import logo from '../../assets/shields/Logo_BeeLesson.png';
import styles from './Navbar.module.css';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNotifications } from '../../context/NotificationContext';

import React, { useState, useEffect, useRef } from 'react';

const Navbar = () => {
    const { isDark, toggleTheme } = useTheme();
    const { user, signOut } = useAuth();
    const { t } = useLanguage();
    const { unreadCount, pendingConnectionsCount } = useNotifications();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const lastScrollY = useRef(0);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            
            // Add scrolled style if scrolled down more than 50px
            setIsScrolled(currentScrollY > 50);

            // Hide header if scrolling down past 100px threshold, show if scrolling up
            if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
                setIsVisible(false);
            } else {
                setIsVisible(true);
            }
            
            lastScrollY.current = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav className={`${styles.navbar} ${isScrolled ? styles.scrolled : ''} ${!isVisible ? styles.navHidden : ''}`}>

            <div className={styles.container}>
                <Link to="/" className={styles.logo}>
                    <img src={logo} alt="BeeLesson" className={styles.navLogo} />
                </Link>

                <div className={styles.actions}>

                    <button
                        className={styles.iconBtn}
                        onClick={toggleTheme}
                        aria-label="Toggle Theme"
                    >
                        {isDark ? <Sun size={20} /> : <Moon size={20} />}
                    </button>

                    {user ? (
                        <div className={styles.userSection}>
                            <Link to="/connections" className={styles.navLink} title={t('tab_connection')}>
                                <Users size={18} />
                                {pendingConnectionsCount > 0 && (
                                    <span className={styles.badge}>{pendingConnectionsCount > 9 ? '9+' : pendingConnectionsCount}</span>
                                )}
                            </Link>
                            <Link to="/notifications" className={styles.navLink} title={t('notifications')}>
                                <Bell size={18} />
                                {unreadCount > 0 && (
                                    <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                                )}
                            </Link>
                            <div className={styles.userInfo}>
                                <span className={styles.userName}>{user.email.split('@')[0]}</span>
                            </div>
                            <button
                                className={styles.logoutBtn}
                                onClick={() => signOut()}
                                title={t('logout')}
                            >
                                <LogOut size={20} />
                            </button>
                        </div>
                    ) : (
                        <Link to="/auth" className={styles.iconBtn} title={t('login_btn')}>
                            <User size={20} />
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
