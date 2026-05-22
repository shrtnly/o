import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import Button from '../../components/ui/Button';
import styles from './GamifiedLearningSection.module.css';

const GamifiedLearningSection = () => {
    return (
        <section className={styles.section}>
            <div className={styles.container}>
                <div className={styles.card}>
                    <div className={styles.content}>
                        <motion.h2 
                            className={styles.title}
                            initial={{ opacity: 0, y: 15 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5 }}
                        >
                            গেমের মতো শেখা
                        </motion.h2>
                        
                        <motion.p 
                            className={styles.subtitle}
                            initial={{ opacity: 0, y: 15 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                        >
                            গেম, গল্প ও ইন্টারেক্টিভ অভিজ্ঞতার মাধ্যমে শিখুন সহজ, স্মার্ট ও মজার উপায়ে - যা আপনার আগ্রহ ধরে রাখবে
                        </motion.p>

                        <motion.div 
                            className={styles.bullets}
                            initial={{ opacity: 0, y: 15 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                        >
                            <div className={styles.bulletItem}>
                                <CheckCircle2 size={18} className={styles.bulletIcon} />
                                <span>পয়েন্ট, স্ট্রিক এবং আকর্ষণীয় গেম মেকানিক্স</span>
                            </div>
                            <div className={styles.bulletItem}>
                                <CheckCircle2 size={18} className={styles.bulletIcon} />
                                <span>ক্লান্তিকর লেকচারের বদলে বাস্তব দৃশ্যপট-ভিত্তিক গল্প</span>
                            </div>
                            <div className={styles.bulletItem}>
                                <CheckCircle2 size={18} className={styles.bulletIcon} />
                                <span>সরাসরি প্র্যাকটিস করে দক্ষতা যাচাইয়ের সুযোগ</span>
                            </div>
                        </motion.div>
                    </div>

                    <motion.div 
                        className={styles.imageWrapper}
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
                    >
                        <img 
                            src="/gamified_bee.png" 
                            alt="Gamified learning illustration" 
                            className={styles.image}
                        />
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

export default GamifiedLearningSection;
