import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Info, Activity, Shield, Eye, Settings } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import styles from './PrivacyPage.module.css';

const PrivacyPage = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();

    const sections = [
        { id: 1, title: 'p_section_1_title', desc: 'p_section_1_desc', icon: Info },
        { id: 2, title: 'p_section_2_title', desc: 'p_section_2_desc', icon: Activity },
        { id: 3, title: 'p_section_3_title', desc: 'p_section_3_desc', icon: Eye },
        { id: 4, title: 'p_section_4_title', desc: 'p_section_4_desc', icon: Shield },
        { id: 5, title: 'p_section_5_title', desc: 'p_section_5_desc', icon: Settings },
    ];

    return (
        <div className={styles.privacyPage}>
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
                    <h1>{t('privacy_policy')}</h1>
                    <p>{t('privacy_desc')}</p>
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
                    <p>{t('p_contact_us')}</p>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPage;
