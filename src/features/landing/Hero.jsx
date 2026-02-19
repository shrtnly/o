import React from 'react';
import Button from '../../components/ui/Button';
import styles from './Hero.module.css';
import heroImg from '../../assets/Hero_Dark.webp';
import { useLanguage } from '../../context/LanguageContext';

const Hero = () => {
    const { t } = useLanguage();

    return (
        <section className={styles.hero}>
            <div className={styles.heroBg}>
                <img src={heroImg} alt="Hero Background" className={styles.bgImage} />
                <div className={styles.overlay}></div>
            </div>

            <div className={styles.container}>
                <div className={styles.content}>
                    <div className={styles.badge}>{t('hero_badge')}</div>

                    <h1 className={styles.title}>
                        {t('hero_title_br')} <br />
                        <span className={styles.highlight}>{t('hero_highlight')}</span>
                    </h1>

                    <p className={styles.description}>
                        {t('hero_description')}
                    </p>

                    <div className={styles.cta}>
                        <Button variant="primary" className={styles.mainBtn}>
                            {t('start_learning')}
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '10px' }}><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Hero;
