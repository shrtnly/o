import { Link } from 'react-router-dom';
import { Moon, Sun, LogOut, User } from 'lucide-react';
import Button from '../ui/Button';
import logo from '../../assets/shields/Logo_BeeLesson.png';
import styles from './Navbar.module.css';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { honeyJarService } from '../../services/honeyJarService';
import FlamingBadge from '../FlamingBadge';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

const Navbar = () => {
    const { isDark, toggleTheme } = useTheme();
    const { user, signOut } = useAuth();
    const { t } = useLanguage();
    const [flamingBadge, setFlamingBadge] = useState(null);

    useEffect(() => {
        if (!user) return;

        // Initial fetch
        honeyJarService.getActiveFlamingBadge(user.id).then(setFlamingBadge);

        // Subscription
        const channel = honeyJarService.subscribeToGifts(user.id, (payload) => {
            // If any badge-related change, refresh
            honeyJarService.getActiveFlamingBadge(user.id).then(setFlamingBadge);
        });

        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, [user]);

    return (
        <nav className={styles.navbar}>
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
                            <div className={styles.userInfo}>
                                {flamingBadge && <FlamingBadge size={16} className={styles.nameBadge} />}
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
                        <Link to="/auth">
                            <Button variant="primary" className={styles.loginBtn}>
                                {t('login_btn')}
                            </Button>
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
