import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import Button from '../../components/ui/Button';
import styles from './CertificateSection.module.css';

const CertificateSection = () => {
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
                            অর্জন করুন ভেরিফাইড সার্টিফিকেট
                        </motion.h2>
                        
                        <motion.p 
                            className={styles.subtitle}
                            initial={{ opacity: 0, y: 15 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                        >
                            কোর্স সম্পন্ন করার পর সংগ্রহ করুন ভেরিফাইড ডিজিটাল সার্টিফিকেট এবং নিজের অর্জন সোশ্যাল মিডিয়ায় সবার সাথে শেয়ার করুন।
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
                                <span>অনন্য আইডি-সহ ভেরিফাইড ডিজিটাল সার্টিফিকেট</span>
                            </div>
                            <div className={styles.bulletItem}>
                                <CheckCircle2 size={18} className={styles.bulletIcon} />
                                <span>এক ক্লিকে লিঙ্কডইন এবং ফেসবুকে শেয়ার করার সুবিধা</span>
                            </div>
                            <div className={styles.bulletItem}>
                                <CheckCircle2 size={18} className={styles.bulletIcon} />
                                <span>ক্যারিয়ারের অগ্রগতিতে নিজের সিভিতে যুক্ত করার সুযোগ</span>
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
                            src="/certificate_bee.png" 
                            alt="Certificate illustration" 
                            className={styles.image}
                        />
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

export default CertificateSection;
