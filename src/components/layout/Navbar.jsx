import { Link } from 'react-router-dom';
import { Moon, Sun, LogOut, User } from 'lucide-react';
import Button from '../ui/Button';
import logo from '../../assets/shields/Logo_BeeLesson.png';
import styles from './Navbar.module.css';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const Navbar = () => {
    const { isDark, toggleTheme } = useTheme();
    const { user, signOut } = useAuth();
    const { t } = useLanguage();

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
                                <User size={18} />
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
