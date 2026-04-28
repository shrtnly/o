import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext';
import styles from './StatsSection.module.css';

const StatsSection = () => {
    const { language } = useLanguage();

    const stats = [
        {
            value: '50K+',
            label: language === 'bn' ? 'শিক্ষার্থী' : 'Active Learners'
        },
        {
            value: '100+',
            label: language === 'bn' ? 'কোর্স' : 'Expert Courses'
        },
        {
            value: '1M+',
            label: language === 'bn' ? 'মধু সংগৃহীত' : 'XP Collected'
        },
        {
            value: '20K+',
            label: language === 'bn' ? 'সার্টিফিকেট' : 'Certificates Issued'
        }
    ];

    return (
        <section className={styles.stats}>
            <div className={styles.container}>
                <div className={styles.grid}>
                    {stats.map((stat, index) => (
                        <motion.div
                            key={index}
                            className={styles.statItem}
                            initial={{ opacity: 0, scale: 0.8 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <h2 className={styles.value}>{stat.value}</h2>
                            <p className={styles.label}>{stat.label}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default StatsSection;
