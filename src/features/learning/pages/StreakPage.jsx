import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Flame, Calendar, Trophy, ChevronRight, Share2, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { rewardService } from '../../../services/rewardService';
import ConsistencyTracker from '../components/ConsistencyTracker';
import InlineLoader from '../../../components/ui/InlineLoader';
import styles from './StreakPage.module.css';

const StreakPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { t } = useLanguage();

    const [streak, setStreak] = useState({ current_streak: 0, longest_streak: 0 });
    const [fullHistory, setFullHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.id) return;

        const fetchStreakData = async () => {
            setLoading(true);
            try {
                const [streakData, historyData] = await Promise.all([
                    rewardService.getUserStreak(user.id),
                    rewardService.getActivityHistory(user.id, 365)
                ]);

                setStreak(streakData || { current_streak: 0, longest_streak: 0 });
                setFullHistory(historyData || []);
            } catch (error) {
                console.error('Error fetching streak data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStreakData();
    }, [user?.id]);

    const totalDays = fullHistory.length;

    return (
        <div className={styles.container}>
            <div style={{ paddingBottom: '16px', display: 'flex', alignItems: 'center' }}>
                <button
                    onClick={() => navigate(-1)}
                    style={{ background: 'none', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '8px 0' }}
                >
                    <ChevronLeft size={28} />
                </button>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                    <InlineLoader />
                </div>
            ) : (
                <div style={{ marginBottom: '24px' }}>
                    <ConsistencyTracker
                        profile={null}
                        streak={streak}
                        history={fullHistory}
                        calendarTopContent={
                            <h2 className={styles.tagline} style={{ marginBottom: '20px', textAlign: 'center' }}>
                                {streak.current_streak === 0 ? 'শুরু করুন! আজ থেকেই আপনার ধারাবাহিকতা তৈরি করুন।' :
                                    streak.current_streak <= 3 ? 'আপনি দারুণ শুরু করেছেন! আপনার ধারাবাহিকতা বজায় রাখুন।' :
                                        streak.current_streak <= 10 ? 'অসাধারণ! আপনি ধারাবাহিকভাবে এগিয়ে যাচ্ছেন। থামবেন না।' :
                                            streak.current_streak <= 25 ? 'চমৎকার! আপনার ধারাবাহিকতা সত্যিই শক্তিশালী হয়ে উঠছে।' :
                                                'অবিশ্বাস্য! আপনি একজন স্ট্রিক লেজেন্ড। এভাবেই চালিয়ে যান।'}
                            </h2>
                        }
                    />
                </div>
            )}



            <section className={styles.milestones}>
                <h3>স্ট্রিক মাইলফলক</h3>
                <div className={styles.milestoneList}>
                    {[10, 30, 50, 100].map(m => {
                        const isAchieved = streak.longest_streak >= m;
                        const remaining = Math.max(0, m - streak.current_streak);
                        
                        return (
                            <div key={m} className={styles.milestoneItem}>
                                <div className={styles.milestoneIcon}>
                                    <Flame 
                                        size={20} 
                                        fill={isAchieved ? "url(#flameGradientTracker)" : "none"} 
                                        stroke={isAchieved ? "url(#flameGradientTracker)" : "#666"} 
                                        strokeWidth={2} 
                                    />
                                </div>
                                <div className={styles.milestoneText}>
                                    <h4>{m} দিনের মাইলফলক</h4>
                                    <p>{isAchieved ? 'অর্জিত!' : `${remaining} দিন বাকি`}</p>
                                </div>
                                {isAchieved && <ChevronRight size={20} className={styles.chevron} />}
                            </div>
                        );
                    })}
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
