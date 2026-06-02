import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import styles from './BiteSizedSection.module.css';

const BiteSizedSection = () => {
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
                            ছোট ছোট শেখা, বড় পরিবর্তন
                        </motion.h2>

                        <motion.p
                            className={styles.subtitle}
                            initial={{ opacity: 0, y: 15 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                        >
                            প্রতিদিন কয়েক মিনিট সময় দিয়েই গড়ে তুলুন বাস্তব জীবনের গুরুত্বপূর্ণ দক্ষতা।
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
                                <span>কুইজ এবং গেমের মাধ্যমে মজাদার উপায়ে শেখা</span>
                            </div>
                            <div className={styles.bulletItem}>
                                <CheckCircle2 size={18} className={styles.bulletIcon} />
                                <span>প্রতিদিন মাত্র পাঁচ থেকে দশ মিনিটের সহজ সেশন</span>
                            </div>
                            <div className={styles.bulletItem}>
                                <CheckCircle2 size={18} className={styles.bulletIcon} />
                                <span>বাস্তব জীবনের কাজের জন্য প্রয়োজনীয় দক্ষতা অর্জন</span>
                            </div>
                        </motion.div>
                    </div>

                    <div className={styles.animationContainer}>
                        <DotLottieReact
                            src="/models/Section1.2.lottie"
                            loop
                            autoplay
                            style={{ background: 'transparent' }}
                        />
                    </div>
                </div>
            </div>
        </section>
    );
};

export default BiteSizedSection;
