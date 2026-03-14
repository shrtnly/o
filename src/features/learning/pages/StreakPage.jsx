import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Flame, Calendar, Trophy, ChevronRight, Share2 } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import styles from './StreakPage.module.css';

const StreakPage = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [streakData, setStreakData] = useState({
        currentStreak: 7,
        highestStreak: 15,
        totalDays: 42,
        todayCompleted: true
    });

    const days = ['শনি', 'রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র'];
    const completedDays = [true, true, true, true, true, true, true]; // Mock data

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={styles.streakBadge}
                >
                    <div className={styles.streakIconWrapper}>
                        <Flame size={48} fill="url(#flameGradientTracker)" stroke="url(#flameGradientTracker)" strokeWidth={2} />
                    </div>
                    <h1 className={styles.streakNumber}>{streakData.currentStreak}</h1>
                    <p className={styles.streakLabel}>দিন স্ট্রিক</p>
                </motion.div>
                
                <h2 className={styles.tagline}>আপনি দারুণ করছেন! আপনার গুনগুন স্ট্রিক বজায় রাখুন।</h2>
            </header>

            <section className={styles.weekSection}>
                <div className={styles.weekGrid}>
                    {days.map((day, index) => (
                        <div key={day} className={styles.dayCol}>
                            <div className={`${styles.dayCircle} ${completedDays[index] ? styles.completed : ''}`}>
                                {completedDays[index] ? <Flame size={20} fill="url(#flameGradientTracker)" stroke="url(#flameGradientTracker)" strokeWidth={2} /> : index + 1}
                            </div>
                            <span className={styles.dayName}>{day}</span>
                        </div>
                    ))}
                </div>
            </section>

            <div className={styles.statsGrid}>
                <motion.div 
                    whileHover={{ y: -5 }}
                    className={styles.statCard}
                >
                    <Trophy className={styles.statIcon} color="#f1c40f" size={32} />
                    <div className={styles.statInfo}>
                        <h3>সর্বোচ্চ স্ট্রিক</h3>
                        <p>{streakData.highestStreak} দিন</p>
                    </div>
                </motion.div>

                <motion.div 
                    whileHover={{ y: -5 }}
                    className={styles.statCard}
                >
                    <Calendar className={styles.statIcon} color="#3498db" size={32} />
                    <div className={styles.statInfo}>
                        <h3>মোট দিন</h3>
                        <p>{streakData.totalDays} দিন</p>
                    </div>
                </motion.div>
            </div>

            <section className={styles.milestones}>
                <h3>স্ট্রিক মাইলফলক</h3>
                <div className={styles.milestoneList}>
                    {[10, 30, 50, 100].map(m => (
                        <div key={m} className={styles.milestoneItem}>
                            <div className={styles.milestoneIcon}>
                                <Flame size={20} fill={streakData.totalDays >= m ? "url(#flameGradientTracker)" : "none"} stroke={streakData.totalDays >= m ? "url(#flameGradientTracker)" : "#666"} strokeWidth={2} />
                            </div>
                            <div className={styles.milestoneText}>
                                <h4>{m} দিনের মাইলফলক</h4>
                                <p>{streakData.totalDays >= m ? 'অর্জিত!' : `${m - streakData.totalDays} দিন বাকি`}</p>
                            </div>
                            {streakData.totalDays >= m && <ChevronRight size={20} className={styles.chevron} />}
                        </div>
                    ))}
                </div>
            </section>

            <button className={styles.shareButton}>
                <Share2 size={20} />
                বন্ধুদের সাথে শেয়ার করুন
            </button>
        </div>
    );
};

export default StreakPage;
