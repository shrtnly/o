import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext';
import styles from './MissionSection.module.css';

const MissionSection = () => {
    const { t } = useLanguage();

    return (
        <section className={styles.mission}>
            <div className={styles.container}>
                <motion.div 
                    className={styles.content}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    <h2 className={styles.title}>{t('proven_title')}</h2>
                    <p className={styles.desc}>{t('proven_desc')}</p>
                    <div className={styles.divider}></div>
                </motion.div>
            </div>
        </section>
    );
};

export default MissionSection;
