import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import styles from './Footer.module.css';
import { Facebook, Twitter, Instagram, Youtube, Mail } from 'lucide-react';

const Footer = () => {
    const { t, language } = useLanguage();

    return (
        <footer className={styles.footer}>
            <div className={styles.container}>
                <div className={styles.top}>
                    <div className={styles.brand}>
                        <h2 className={styles.logo}>O-Sekha</h2>
                        <p className={styles.brandDesc}>
                            {language === 'bn' 
                                ? 'বাংলাদেশের প্রথম গেমিফাইড লার্নিং প্ল্যাটফর্ম। আমরা শেখার প্রথাগত পদ্ধতি বদলে দিতে চাই।' 
                                : 'The first gamified learning platform in Bangladesh. We want to change the traditional way of learning.'}
                        </p>
                        <div className={styles.socials}>
                            <a href="#" className={styles.socialLink}><Facebook size={20} /></a>
                            <a href="#" className={styles.socialLink}><Twitter size={20} /></a>
                            <a href="#" className={styles.socialLink}><Instagram size={20} /></a>
                            <a href="#" className={styles.socialLink}><Youtube size={20} /></a>
                        </div>
                    </div>

                    <div className={styles.linksGrid}>
                        <div className={styles.linkGroup}>
                            <h4 className={styles.groupTitle}>{t('learn')}</h4>
                            <Link to="/courses" className={styles.link}>{t('all_courses')}</Link>
                            <Link to="/leaderboard" className={styles.link}>{t('leaderboard')}</Link>
                            <Link to="/shop" className={styles.link}>{t('shop')}</Link>
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
                                <Mail size={16} /> support@beelesson.com
                            </a>
                        </div>
                    </div>
                </div>

                <div className={styles.bottom}>
                    <p className={styles.copyright}>
                        &copy; {new Date().getFullYear()} O-Sekha. {t('footer_copy')}
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
