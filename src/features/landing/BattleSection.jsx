import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import styles from './BattleSection.module.css';

const BattleSection = () => {
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
                            ব্যাটেল ও লিডারবোর্ড
                        </motion.h2>
                        
                        <motion.p 
                            className={styles.subtitle}
                            initial={{ opacity: 0, y: 15 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                        >
                            বন্ধুদের সাথে রিয়েল-টাইম কুইজ ব্যাটেলে অংশ নিন, পয়েন্ট অর্জন করুন এবং লিডারবোর্ডের শীর্ষে উঠে নিজের দক্ষতা প্রমাণ করুন।
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
                                <span>বন্ধুদের চ্যালেঞ্জ করে রিয়েল-টাইম লাইভ কুইজ লড়াই</span>
                            </div>
                            <div className={styles.bulletItem}>
                                <CheckCircle2 size={18} className={styles.bulletIcon} />
                                <span>লিডারবোর্ডে সেরাদের তালিকায় জায়গা</span>
                            </div>
                            <div className={styles.bulletItem}>
                                <CheckCircle2 size={18} className={styles.bulletIcon} />
                                <span>বিশেষ এক্সপি (XP) এবং অনন্য ব্যাজ অর্জন</span>
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
                        <DotLottieReact
                            src="/models/Section3.2.lottie"
                            loop
                            autoplay
                            style={{ background: 'transparent' }}
                        />
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

export default BattleSection;
