import { Link } from 'react-router-dom';
import { Moon, Sun, LogOut, User } from 'lucide-react';
import Button from '../ui/Button';
import styles from './Navbar.module.css';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
    const { isDark, toggleTheme } = useTheme();
    const { user, signOut } = useAuth();

    return (
        <nav className={styles.navbar}>
            <div className={styles.container}>
                <Link to="/" className={styles.logo}>
                    <div className={styles.logoIcon}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                    </div>
                    <span className={styles.logoText}>প্ল্যাটফর্ম</span>
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
                                <User size={18} />
                                <span className={styles.userName}>{user.email.split('@')[0]}</span>
                            </div>
                            <button
                                className={styles.logoutBtn}
                                onClick={() => signOut()}
                                title="লগ আউট"
                            >
                                <LogOut size={20} />
                            </button>
                        </div>
                    ) : (
                        <Link to="/auth">
                            <Button variant="primary" className={styles.loginBtn}>
                                লগইন করুন
                            </Button>
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
