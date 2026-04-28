import React from 'react';
import Button from '../../components/ui/Button';
import styles from './Hero.module.css';
import heroImg from '../../assets/Hero_Dark.webp';
import { useLanguage } from '../../context/LanguageContext';
import { motion } from 'framer-motion';


const Hero = () => {
    const { t, language, setLanguage } = useLanguage();

    return (
        <section className={styles.hero}>
            <div className={styles.heroBg}>
                <img src={heroImg} alt="Hero Background" className={styles.bgImage} />
                <div className={styles.overlay}></div>
            </div>

            <motion.div 
                className={styles.container}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
            >
                <div className={styles.content}>
                    <motion.div 
                        className={styles.badge}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                    >
                        {t('hero_badge')}
                    </motion.div>

                    <h1 className={styles.title}>
                        {t('hero_title_br')} <br />
                        <span className={styles.highlight}>{t('hero_highlight')}</span>
                    </h1>

                    <p className={styles.description}>
                        {t('hero_description')}
                    </p>

                    <div className={styles.cta}>
                        <Button 
                            variant="primary" 
                            className={styles.mainBtn}
                            onClick={() => window.location.href = '/auth'}
                        >
                            {t('start_learning')}
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '10px' }}><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                        </Button>
                        <Button 
                            variant="outline" 
                            className={styles.secondaryBtn}
                            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                        >
                            {language === 'bn' ? 'ফিচারগুলো দেখুন' : 'Explore Features'}
                        </Button>
                    </div>
                </div>
            </motion.div>

        </section>
    );
};

export default Hero;
