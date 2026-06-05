import React, { useState, useEffect } from 'react';
import { Flame, Trophy, X, CircleCheckBig, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { rewardService } from '../../../services/rewardService';
import ConsistencyTracker from '../components/ConsistencyTracker';
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

    return (
        <div className={styles.container}>
            <div style={{ paddingBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                <button
                    onClick={() => navigate('/')}
                    className={`${styles.closeButton} ${loading ? styles.skeleton : ''}`}
                >
                    <X size={24} strokeWidth={2} />
                </button>
            </div>

            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Tagline Skeleton */}
                    <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                        <div className={styles.skeleton} style={{ width: '70%', height: '24px', borderRadius: '8px', marginBottom: '8px' }} />
                        <div className={styles.skeleton} style={{ width: '50%', height: '20px', borderRadius: '6px' }} />
                    </div>
                    
                    {/* Main Card (ConsistencyTracker_replacement) */}
                    <div style={{ background: 'var(--color-bg-alt)', borderRadius: '24px', padding: '24px', border: '1px solid var(--color-border)' }}>
                        {/* Stats Row */}
                        <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '32px', position: 'relative' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div className={styles.skeleton} style={{ width: '100px', height: '14px', marginBottom: '12px' }} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div className={styles.skeleton} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                                    <div className={styles.skeleton} style={{ width: '30px', height: '32px' }} />
                                </div>
                            </div>
                            <div style={{ width: '1px', height: '60px', background: 'rgba(255,255,255,0.1)' }} />
                            <div style={{ textAlign: 'center' }}>
                                <div className={styles.skeleton} style={{ width: '100px', height: '14px', marginBottom: '12px' }} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div className={styles.skeleton} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                                    <div className={styles.skeleton} style={{ width: '30px', height: '32px' }} />
                                </div>
                            </div>
                        </div>

                        {/* Calendar Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <div className={styles.skeleton} style={{ width: '140px', height: '28px', borderRadius: '8px' }} />
                            <div className={styles.skeleton} style={{ width: '100px', height: '28px', borderRadius: '20px' }} />
                        </div>

                        {/* Calendar Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                            {[...Array(35)].map((_, i) => (
                                <div key={i} className={styles.skeleton} style={{ width: '100%', aspectRatio: '1/1', borderRadius: '8px' }} />
                            ))}
                        </div>
                    </div>

                    {/* Milestone Header */}
                    <div className={styles.skeleton} style={{ width: '150px', height: '24px', borderRadius: '6px' }} />
                    
                    {/* Milestone List Skeletons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className={styles.milestoneItem}>
                                <div className={styles.skeleton} style={{ width: '44px', height: '44px', borderRadius: '12px' }} />
                                <div className={styles.milestoneText}>
                                    <div className={styles.skeleton} style={{ width: '160px', height: '14px', marginBottom: '6px', borderRadius: '4px' }} />
                                    <div className={styles.skeleton} style={{ width: '100px', height: '12px', borderRadius: '4px' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <>
                    <div style={{ marginBottom: '24px' }}>
                        <ConsistencyTracker
                            profile={null}
                            streak={streak}
                            history={fullHistory}
                            calendarTopContent={
                                <h2 className={styles.tagline} style={{ marginBottom: '20px', textAlign: 'center' }}>
                                    {streak.current_streak === 0 ? t('streak_tagline_0') :
                                        streak.current_streak <= 3 ? t('streak_tagline_1_3') :
                                            streak.current_streak <= 10 ? t('streak_tagline_4_10') :
                                                streak.current_streak <= 25 ? t('streak_tagline_11_25') :
                                                    t('streak_tagline_legend')}
                                </h2>
                            }
                        />
                    </div>

                    <section className={styles.milestones}>
                        <h3>স্ট্রিক মাইলফলক</h3>
                        <div className={styles.milestoneList}>
                            {[10, 30, 50, 100].map(m => {
                                const isAchieved = streak.longest_streak >= m;
                                const remaining = Math.max(0, m - streak.current_streak);

                                return (
                                    <div key={m} className={`${styles.milestoneItem} ${isAchieved ? styles.milestoneAchieved : styles.milestoneLocked}`}>
                                        <div className={`${styles.milestoneIcon} ${isAchieved ? styles.iconAchieved : styles.iconLocked}`}>
                                            <Flame
                                                size={20}
                                                fill={isAchieved ? "#FFB800" : "none"}
                                                stroke={isAchieved ? "#FFB800" : "#666"}
                                                strokeWidth={2}
                                            />
                                        </div>
                                        <div className={styles.milestoneText}>
                                            <h4 style={{ color: isAchieved ? '#FFB800' : 'inherit' }}>{m} দিনের মাইলফলক</h4>
                                            <p>{isAchieved ? 'অর্জিত!' : `${remaining} দিন বাকি`}</p>
                                        </div>
                                        {isAchieved ? (
                                            <CircleCheckBig size={20} className={styles.chevron} style={{ color: '#FFB800' }} />
                                        ) : (
                                            <Lock size={18} className={styles.lockIcon} style={{ color: 'var(--color-text-muted)', opacity: 0.5 }} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </>
            )}
        </div>
    );
};

export default StreakPage;
