import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, UserCheck, ShieldAlert, Coins, Copyright, RefreshCw, Mail, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import styles from './TermsPage.module.css';
import SEO from '../../components/SEO';

const TermsPage = () => {
    const navigate = useNavigate();
    const { t, language } = useLanguage();

    const sections = [
        { id: 1, title: 't_section_1_title', desc: 't_section_1_desc', icon: UserCheck },
        { id: 2, title: 't_section_2_title', desc: 't_section_2_desc', icon: ShieldAlert },
        { id: 3, title: 't_section_3_title', desc: 't_section_3_desc', icon: Coins },
        { id: 4, title: 't_section_4_title', desc: 't_section_4_desc', icon: Copyright },
        { id: 5, title: 't_section_5_title', desc: 't_section_5_desc', icon: RefreshCw },
        { id: 6, title: 't_section_6_title', desc: 't_section_6_desc', icon: AlertTriangle },
    ];

    const isBn = language === 'bn';
    const seoTitle = isBn 
        ? 'টার্মস এবং কন্ডিশনস | বি লেসন (BeeLesson)' 
        : 'Terms and Conditions | BeeLesson';
        
    const seoDescription = isBn 
        ? 'বি লেসন (BeeLesson)-এর ব্যবহারিক শর্তাবলী এবং নিয়মকানুনসমূহ পড়ুন।' 
        : 'Read the terms of service and user agreements for BeeLesson.';

    return (
        <div className={styles.termsPage}>
            <SEO title={seoTitle} description={seoDescription} />
            <div className={styles.container}>
                <button
                    onClick={() => navigate('/settings?tab=legal')}
                    className={styles.backBtn}
                    aria-label="Go back"
                >
                    <ChevronLeft size={20} />
                    <span>{t('go_back')}</span>
                </button>

                <header className={styles.header}>
                    <h1>{t('terms_title')}</h1>
                    <p>{t('terms_desc')}</p>
                </header>

                <div className={styles.content}>
                    {sections.map((section) => {
                        const Icon = section.icon;
                        return (
                            <section key={section.id} className={styles.section}>
                                <h2>
                                    <Icon size={20} />
                                    {t(section.title)}
                                </h2>
                                <p>{t(section.desc)}</p>
                            </section>
                        );
                    })}
                </div>

                <div className={styles.contact}>
                    <Mail size={24} style={{ marginBottom: '12px', opacity: 0.8 }} />
                    <p>{t('p_contact_us')}</p>
                </div>
            </div>
        </div>
    );
};

export default TermsPage;
