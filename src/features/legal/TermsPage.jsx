import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, UserCheck, ShieldAlert, Coins, Copyright, RefreshCw } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import styles from './TermsPage.module.css';

const TermsPage = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();

    const sections = [
        { id: 1, title: 't_section_1_title', desc: 't_section_1_desc', icon: UserCheck },
        { id: 2, title: 't_section_2_title', desc: 't_section_2_desc', icon: ShieldAlert },
        { id: 3, title: 't_section_3_title', desc: 't_section_3_desc', icon: Coins },
        { id: 4, title: 't_section_4_title', desc: 't_section_4_desc', icon: Copyright },
        { id: 5, title: 't_section_5_title', desc: 't_section_5_desc', icon: RefreshCw },
    ];

    return (
        <div className={styles.termsPage}>
            <div className={styles.container}>
                <button
                    onClick={() => navigate(-1)}
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

                <div className={styles.footer}>
                    <p className={styles.copyright}>
                        &copy; {new Date().getFullYear()} BeeLesson. সকল স্বত্ব সংরক্ষিত।</p>
                </div>
            </div>
        </div>
    );
};

export default TermsPage;
