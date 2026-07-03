import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import styles from './Footer.module.css';
import { Facebook, Twitter, Instagram, Youtube, Mail } from 'lucide-react';
import logo from '../../assets/shields/Logo_BeeLesson.png';

const Footer = () => {
    const { t, language } = useLanguage();

    return (
        <footer className={styles.footer}>
            <div className={styles.container}>
                <div className={styles.top}>
                    <div className={styles.brand}>
                        <Link to="/" className={styles.logoWrapper}>
                            <img src={logo} alt="BeeLesson" className={styles.logo} />
                        </Link>
                        <p className={styles.brandDesc}>
                            {language === 'bn' 
                                ? 'বাংলাদেশী গেমিফাইড লার্নিং প্ল্যাটফর্ম।' 
                                : 'Gamified learning platform in Bangladesh.'}
                        </p>
                        <div className={styles.socials}>
                            <a href="#" className={styles.socialLink} aria-label="Facebook"><Facebook size={18} /></a>
                            <a href="#" className={styles.socialLink} aria-label="Twitter"><Twitter size={18} /></a>
                            <a href="#" className={styles.socialLink} aria-label="Instagram"><Instagram size={18} /></a>
                            <a href="#" className={styles.socialLink} aria-label="Youtube"><Youtube size={18} /></a>
                        </div>
                    </div>

                    <div className={styles.linksGrid}>
                        <div className={styles.linkGroup}>
                            <h4 className={styles.groupTitle}>{t('learn')}</h4>
                            <Link to="/courses" className={styles.link}>{t('all_courses')}</Link>
                            <Link to="/leaderboard" className={styles.link}>{t('leaderboard')}</Link>
                        </div>

                        <div className={styles.linkGroup}>
                            <h4 className={styles.groupTitle}>{t('legal')}</h4>
                            <Link to="/privacy" className={styles.link}>{t('privacy_policy')}</Link>
                            <Link to="/terms" className={styles.link}>{t('terms_title')}</Link>
                        </div>

                        <div className={styles.linkGroup}>
                            <h4 className={styles.groupTitle}>{t('help')}</h4>
                            <Link to="/help" className={styles.link}>{t('help_center')}</Link>
                            <a href="mailto:support@beelesson.com" className={styles.contactLink}>
                                <Mail size={14} /> support@beelesson.com
                            </a>
                        </div>
                    </div>
                </div>

                <div className={styles.bottom}>
                    <p className={styles.copyright}>
                        &copy; {new Date().getFullYear()} BeeLesson. সকল স্বত্ব সংরক্ষিত।</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
