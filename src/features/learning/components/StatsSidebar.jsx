import React from 'react';
import { Zap, Gem, Heart, HeartCrack, Shield, ChevronDown, Check, Play, Plus, Flame, Lock, Trophy, Infinity, Gift } from 'lucide-react';
import HoneyDropIcon from '../../../components/HoneyDropIcon';
import PollenIcon from '../../../components/PollenIcon';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { rewardService } from '../../../services/rewardService';
import ConsistencyTracker from './ConsistencyTracker';
import Button from '../../../components/ui/Button';
import ShieldIcon from '../../../components/ShieldIcon';
import styles from '../LearningPage.module.css';
import { formatLocalDate } from '../../../lib/dateUtils';
import { leaderboardService } from '../../../services/leaderboardService';
import { getShieldLevel, getLevelProgress } from '../../../utils/shieldSystem';
import { useLanguage } from '../../../context/LanguageContext';
import { honeyJarService } from '../../../services/honeyJarService';
import { supabase } from '../../../lib/supabaseClient';
import { cn } from '../../../lib/utils';

const GIFT_CONFIG = {
    pollen: {
        emoji: '🌼',
        color: '#FFD700',
        label: 'পরাগরেণু',
    },
    honey_drops: {
        emoji: '🍯',
        color: '#F1A20F',
        label: 'মধু ফোঁটা',
    },
    xp: {
        emoji: '⚡',
        color: '#1CB0F6',
        label: 'এক্সপি',
    },
};

const StatsSidebar = ({ profile, refreshProfile, hearts, refillTime, courses = [], currentCourseId }) => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [isCourseOpen, setIsCourseOpen] = React.useState(false);
    const [isExpanded, setIsExpanded] = React.useState(false);

    const currentCourse = courses.find(c => c.id === currentCourseId);

    const handleCourseSwitch = (newId) => {
        setIsCourseOpen(false);
        if (newId !== currentCourseId) {
            navigate(`/learn/${newId}`);
        }
    };

    const [streak, setStreak] = React.useState({ current_streak: 0, last_activity_date: null });
    const [weeklyActivity, setWeeklyActivity] = React.useState([]);
    const [fullHistory, setFullHistory] = React.useState([]);

    const [userRank, setUserRank] = React.useState(null);
    const [leaderboardData, setLeaderboardData] = React.useState([]);
    const [streakLoading, setStreakLoading] = React.useState(true);
    const [leaderboardLoading, setLeaderboardLoading] = React.useState(true);

    // Honey Jar states
    const [jarProgress, setJarProgress] = React.useState({ fill_percent: 0, pollen_in_cycle: 0, is_full: false });
    const [pendingGift, setPendingGift] = React.useState(null);
    const [jarSplash, setJarSplash] = React.useState(false);
    const [giftGenerationLoading, setGiftGenerationLoading] = React.useState(false);
    const [claimingGift, setClaimingGift] = React.useState(false);

    // Fetch streak and activity data — only re-runs when user ID changes, NOT on XP change
    React.useEffect(() => {
        if (!profile?.id) return;

        const fetchStreakData = async () => {
            setStreakLoading(true);
            try {
                // Fetch 365 days once — slice in memory for weekly view (saves 1 DB round-trip)
                const [streakData, full] = await Promise.all([
                    rewardService.getUserStreak(profile.id),
                    rewardService.getActivityHistory(profile.id, 365),
                    // Honey jar fetched in parallel too
                    (async () => {
                        const [progress, gift] = await Promise.all([
                            honeyJarService.getJarProgress(profile.id),
                            honeyJarService.getUnclaimedGift(profile.id),
                        ]);
                        setJarProgress(progress || { fill_percent: 0, pollen_in_cycle: 0, is_full: false });
                        if (gift) {
                            setPendingGift(gift);
                        } else if (progress?.is_full) {
                            handleJarFull();
                        }
                    })()
                ]);

                setStreak(streakData);
                setFullHistory(full);
                // Derive weekly from the same data — no extra DB call
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                setWeeklyActivity(full.filter(a => new Date(a.activity_date) >= sevenDaysAgo));
            } catch (error) {
                console.error('Error fetching streak data:', error);
            } finally {
                setStreakLoading(false);
            }
        };

        const fetchLeaderboard = async () => {
            setLeaderboardLoading(true);
            try {
                if (profile.xp > 0) {
                    const tier = getShieldLevel(profile.xp).level;
                    // Fetch leaderboard and rank in parallel
                    const [result, rank] = await Promise.all([
                        leaderboardService.getLeaderboardByTier(tier, 2),
                        leaderboardService.getUserRank(profile.id, tier)
                    ]);
                    setLeaderboardData(result.data || []);
                    setUserRank(rank);
                }
            } catch (error) {
                console.error('Error fetching leaderboard:', error);
                setLeaderboardData([]);
                setUserRank(null);
            } finally {
                setLeaderboardLoading(false);
            }
        };

        // Run streak (fast) and leaderboard (slower) independently
        // so streak cards appear immediately without waiting for leaderboard
        fetchStreakData();
        fetchLeaderboard();

        // Subscriptions for real-time jar updates
        const channel = honeyJarService.subscribeToJarProgress(profile.id, (newData) => {
            setJarProgress(newData);
            setJarSplash(true);
            setTimeout(() => setJarSplash(false), 800);
            if (newData.is_full) handleJarFull();
        });

        const giftChannel = honeyJarService.subscribeToGifts(profile.id, (newGift) => {
            if (!newGift.is_claimed) {
                setPendingGift(newGift);
            }
        });

        return () => {
            supabase.removeChannel(channel);
            supabase.removeChannel(giftChannel);
        };
    }, [profile?.id]); // ✅ Only re-fetch on user change, NOT on every XP update

    const handleJarFull = async () => {
        if (giftGenerationLoading) return;
        setGiftGenerationLoading(true);
        try {
            // First check if a gift already exists to avoid duplicates
            const existing = await honeyJarService.getUnclaimedGift(profile.id);
            if (existing) {
                setPendingGift(existing);
                setGiftGenerationLoading(false);
                return;
            }

            const gift = await honeyJarService.generateMysteryGift(profile.id);
            if (gift) {
                setPendingGift(gift);
            }
        } catch (err) {
            console.error('handleJarFull error:', err);
        } finally {
            setGiftGenerationLoading(false);
        }
    };

    const handleClaimGift = async (giftId) => {
        setClaimingGift(true);
        const result = await honeyJarService.claimMysteryGift(profile.id, giftId);
        if (result?.success) {
            const progress = await honeyJarService.getJarProgress(profile.id);
            setJarProgress(progress);
            setPendingGift(null);
            // Refresh parent profile to update XP/Gems/Hearts
            if (refreshProfile) await refreshProfile();
        }
        setClaimingGift(false);
        return result;
    };

    return (
        <aside className={styles.rightSidebar}>
            {/* Course Selector */}
            <div className={styles.courseSelectorContainer}>
                {(!currentCourse && courses.length === 0) ? (
                    <div className={`${styles.courseSelectorBtn} ${styles.skeleton}`} style={{ height: '56px', width: '100%' }}></div>
                ) : (
                    <>
                        <button
                            className={`${styles.courseSelectorBtn} ${isCourseOpen ? styles.btnOpen : ''}`}
                            onClick={() => setIsCourseOpen(!isCourseOpen)}
                        >
                            <div className={styles.courseBtnContent}>
                                <div className={styles.courseIcon}>
                                    <Play size={18} fill="currentColor" />
                                </div>
                                <span className={styles.courseTitle}>
                                    {currentCourse?.title || 'কোর্স নির্বাচন করুন'}
                                </span>
                            </div>
                            <ChevronDown size={20} className={`${styles.chevron} ${isCourseOpen ? styles.chevronRotate : ''}`} />
                        </button>

                        {isCourseOpen && (
                            <div className={styles.courseDropdown}>
                                {courses.map(course => (
                                    <div
                                        key={course.id}
                                        className={`${styles.courseOption} ${course.id === currentCourseId ? styles.optionActive : ''}`}
                                        onClick={() => handleCourseSwitch(course.id)}
                                    >
                                        <span className={styles.optionTitle}>{course.title}</span>
                                        {course.id === currentCourseId && <Check size={16} color="#f1c40f" strokeWidth={3} />}
                                    </div>
                                ))}
                                <div className={styles.courseDropdownDivider}></div>
                                <button
                                    className={styles.addCourseOption}
                                    onClick={() => navigate('/courses')}
                                >
                                    <Plus size={18} />
                                    <span className={styles.optionTitle}>কোর্স যোগ করুন</span>
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className={styles.statsRow}>
                {(!profile || streakLoading) ? (
                    <>
                        <div className={`${styles.statItem} ${styles.skeleton}`} style={{ width: '80px', height: '40px' }}></div>
                        <div className={`${styles.statItem} ${styles.skeleton}`} style={{ width: '80px', height: '40px' }}></div>
                        <div className={`${styles.statItem} ${styles.skeleton}`} style={{ width: '80px', height: '40px' }}></div>
                    </>
                ) : (
                    <>
                        <div className={styles.statItem} title="মোট মধু">
                            <ShieldIcon
                                xp={profile?.xp || 0}
                                size={30}
                                showShadow={getShieldLevel(profile?.xp || 0).level !== 'SILVER'}
                            />
                            <span>{profile?.xp || 0}</span>
                        </div>
                        <div className={styles.statItem} style={{ color: '#ffc800' }} title={t('pollen')}>
                            <PollenIcon size={30} />
                            <span>{profile?.gems || 0}</span>
                        </div>
                        <div className={styles.statItem} style={{ color: '#f1c40f', position: 'relative' }} title={t('honey_drop')}>
                            <HoneyDropIcon
                                size={30}
                                isEmpty={(hearts == 0 || Number(hearts) === 0) && refillTime}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                {!(Number(hearts) === 0 && refillTime) && (
                                    profile?.is_premium ? (
                                        <>
                                            <svg width="0" height="0" style={{ position: 'absolute' }}>
                                                <defs>
                                                    <linearGradient id="infinityGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                                        <stop offset="0%" stopColor="#f1c40f" />
                                                        <stop offset="100%" stopColor="#e67e22" />
                                                    </linearGradient>
                                                </defs>
                                            </svg>
                                            <Infinity
                                                size={28}
                                                strokeWidth={3}
                                                stroke="url(#infinityGradient)"
                                                style={{ marginTop: '2px' }}
                                            />
                                        </>
                                    ) : (
                                        <span>{hearts !== undefined ? hearts : (profile?.hearts || 0)}</span>
                                    )
                                )}
                                {refillTime && (
                                    <span style={{
                                        fontSize: '0.75rem',
                                        color: '#1cb0f6',
                                        marginTop: hearts === 0 ? '0' : '-4px',
                                        fontWeight: '900',
                                        display: 'block'
                                    }}>
                                        {refillTime}
                                    </span>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>


            {/* Daily Practices Tracker / Consistency Tracker */}
            <div className={cn(styles.card, styles.cardGolden)} style={{ borderBottom: isExpanded ? '5px solid #37464f' : '' }}>
                <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>
                        <Zap size={20} className={styles.cardTitleIcon} />
                        <span>{t('buzz_streak')}</span>
                    </h3>
                    <div
                        onClick={() => setIsExpanded(!isExpanded)}
                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}
                    >
                        <ChevronDown
                            size={20}
                            color="#ffffff"
                            style={{
                                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.3s ease'
                            }}
                        />
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {!isExpanded ? (
                        <motion.div
                            key="collapsed"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className={styles.practiceTracker}
                        >
                            <svg width="0" height="0" style={{ position: 'absolute' }}>
                                <defs>
                                    <linearGradient id="flameGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" style={{ stopColor: '#FFD700', stopOpacity: 1 }} />
                                        <stop offset="50%" style={{ stopColor: '#F1C40F', stopOpacity: 1 }} />
                                        <stop offset="100%" style={{ stopColor: '#E67E22', stopOpacity: 1 }} />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div className={styles.flameRow}>
                                {(!profile || streakLoading) ? (
                                    [...Array(7)].map((_, i) => (
                                        <div key={i} className={`${styles.flameIcon} ${styles.skeleton}`} style={{ width: '32px', height: '32px', borderRadius: '50%' }}></div>
                                    ))
                                ) : (
                                    [...Array(7)].map((_, index) => {
                                        const now = new Date();
                                        const dayOfWeek = now.getDay(); // 0 = Sunday

                                        const d = new Date(now);
                                        d.setDate(now.getDate() - dayOfWeek + index);

                                        const dateStr = formatLocalDate(d);
                                        const todayStr = formatLocalDate(now);

                                        // Check if this date has any practice recorded
                                        const isPracticed = weeklyActivity.some(a => {
                                            const activityDate = typeof a.activity_date === 'string'
                                                ? a.activity_date.split('T')[0]
                                                : formatLocalDate(new Date(a.activity_date));
                                            return activityDate === dateStr;
                                        });

                                        const isToday = dateStr === todayStr;
                                        const isPast = index <= dayOfWeek;

                                        return (
                                            <div key={index} className={styles.flameContainer} title={dateStr}>
                                                <div className={cn(styles.flameIcon, isPracticed && styles.flameActive, isToday && styles.flameToday)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {isPracticed ? (
                                                        <Flame size={24} fill="url(#flameGradient)" stroke="url(#flameGradient)" />
                                                    ) : (
                                                        <Flame
                                                            size={24}
                                                            fill={isToday ? "rgba(241, 196, 15, 0.1)" : "none"}
                                                            stroke={isToday ? "#f1c40f" : "#37464f"}
                                                            style={isToday ? { filter: 'drop-shadow(0 0 4px rgba(241, 196, 15, 0.4))' } : {}}
                                                        />
                                                    )}
                                                </div>
                                                <span className={cn(styles.flameDayLabel, (isPast || isPracticed) && styles.flameDayLabelActive)}>
                                                    {['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র', 'শনি'][index]}
                                                </span>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="expanded"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{ overflow: 'hidden' }}
                        >
                            <ConsistencyTracker
                                profile={profile}
                                streak={streak}
                                history={fullHistory}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className={cn(styles.card, styles.cardGolden)} onClick={() => profile?.xp >= 100 && navigate('/leaderboard')} style={{ cursor: profile?.xp >= 100 ? 'pointer' : 'default' }}>
                <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>
                        <Trophy size={18} className={styles.cardTitleIcon} />
                        <span>{profile?.xp >= 100 ? 'আপনার লিডারবোর্ড' : 'লিডারবোর্ড'}</span>
                    </h3>
                    {profile?.xp >= 100 && (
                        <span className={styles.viewAll}></span>
                    )}
                </div>
                <div className={styles.leaderboardContent}>
                    {profile && (
                        leaderboardLoading ? (
                            <div className={`${styles.leaderboardRow} ${styles.skeleton}`} style={{ height: '45px', marginBottom: '12px' }}></div>
                        ) : (
                            <>
                                <div className={`${styles.leaderboardRow} ${styles.leaderboardRowActive}`}>
                                    <div className={styles.leaderboardRowLeft}>
                                        <span className={styles.rowRank}>{userRank || '-'}</span>
                                        <img
                                            src={profile.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${profile.display_name || profile.id}`}
                                            className={styles.rowAvatar}
                                            alt={profile.display_name || 'লার্নার'}
                                        />
                                        <span className={styles.rowName}>
                                            {profile.display_name || 'লার্নার'}
                                        </span>
                                    </div>
                                    <div className={styles.leaderboardRowRight}>
                                        <ShieldIcon
                                            xp={profile.xp || 0}
                                            size={22}
                                            showTooltip={false}
                                            showShadow={getShieldLevel(profile.xp || 0).level !== 'SILVER'}
                                        />
                                        <span className={styles.rowXP}>{profile.xp || 0}</span>
                                    </div>
                                </div>
                                <div className={styles.leaderboardDivider}>•••</div>
                            </>
                        )
                    )}

                    {profile?.xp >= 100 ? (
                        <div className={styles.leaderboardPreview}>
                            {(leaderboardLoading || !leaderboardData?.length) ? (
                                <div className={styles.leaderboardPreview}>
                                    <div className={`${styles.leaderboardRow} ${styles.skeleton}`} style={{ height: '40px', marginBottom: '8px' }}></div>
                                    <div className={`${styles.leaderboardRow} ${styles.skeleton}`} style={{ height: '40px' }}></div>
                                </div>
                            ) : (
                                leaderboardData.slice(0, 2).map((user, index) => {
                                    // Deterministic avatar for dummy users if no avatar_url
                                    const avatarSeed = index === 0 ? 'Felix' : 'Vivian'; // Boy for #1, Girl for #2
                                    const avatarUrl = user.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.id === profile.id ? (profile.display_name || profile.id) : avatarSeed}`;

                                    return (
                                        <div
                                            key={user.id}
                                            className={`${styles.leaderboardRow} ${user.id === profile.id ? styles.leaderboardRowActive : ''}`}
                                        >
                                            <div className={styles.leaderboardRowLeft}>
                                                <span className={styles.rowRank}>{index + 1}</span>
                                                <img
                                                    src={avatarUrl}
                                                    className={styles.rowAvatar}
                                                    alt={user.display_name || 'লার্নার'}
                                                />
                                                <span className={styles.rowName}>
                                                    {user.display_name || 'লার্নার'}
                                                </span>
                                            </div>
                                            <div className={styles.leaderboardRowRight}>
                                                <ShieldIcon
                                                    xp={user.xp}
                                                    size={22}
                                                    showTooltip={false}
                                                    showShadow={getShieldLevel(user.xp).level !== 'SILVER'}
                                                />
                                                <span className={styles.rowXP}>{user.xp}</span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            {userRank > 2 && (
                                <>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className={styles.unlockContent}>
                            <div className={styles.iconBoxLocked}>
                                <Lock size={40} className={styles.lockIconLarge} />
                            </div>
                            <div className={styles.unlockInfo}>
                                <h4 className={styles.unlockTitle}>লিডারবোর্ড আনলক করুন!</h4>
                                <p className={styles.unlockDesc}>প্রতিযোগিতা শুরু করতে 100 টি XP অর্জন করুন</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>


            {/* Honey Jar Card */}
            <div className={cn(styles.card, styles.cardGolden)}>
                <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>
                        <span className={styles.cardTitleEmoji}>🍯</span>
                        <span>মধু-পূর্ণতা</span>
                    </h3>
                </div>
                <div className={styles.jarLayout} style={{ background: 'none', border: 'none', padding: 0, boxShadow: 'none' }}>
                    <div className={styles.honeyJarContainer}>
                        <div className={styles.honeyJar} style={{ width: '56px' }}>
                            {jarProgress.is_full && (
                                <div className={styles.jarOverflowDrips} style={{ gap: '3px' }}>
                                    <div className={styles.overflowDrip} style={{ width: '5px', height: '5px' }} />
                                    <div className={styles.overflowDrip} style={{ width: '5px', height: '5px', animationDelay: '0.3s' }} />
                                    <div className={styles.overflowDrip} style={{ width: '5px', height: '5px', animationDelay: '0.6s' }} />
                                </div>
                            )}
                            <div className={styles.jarLid} style={{ height: '8px' }}></div>
                            <div className={styles.jarBody}>
                                <div className={`${styles.jarGlass} ${jarSplash ? styles.jarSplash : ''}`} style={{ width: '56px', height: '84px' }}>
                                    <div className={styles.jarFill} style={{ height: `${jarProgress.fill_percent}%` }}>
                                        <div className={styles.liquidWave}></div>
                                    </div>
                                    <div className={styles.jarGlossLeft}></div>
                                </div>
                            </div>
                            <div className={styles.jarPercentOverlay} style={{ top: '8px' }}>
                                <span style={{ fontSize: '0.65rem' }}>{jarProgress.fill_percent}%</span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.jarInfo}>
                        {jarProgress.is_full ? (
                            <div className={styles.giftStatusArea}>
                                {pendingGift ? (
                                    <div className={styles.rewardPreview}>
                                        <div className={styles.rewardIconBg} style={{ backgroundColor: GIFT_CONFIG[pendingGift.gift_type]?.color + '20' }}>
                                            <span style={{ fontSize: '1.5rem' }}>{GIFT_CONFIG[pendingGift.gift_type]?.emoji}</span>
                                        </div>
                                        <div className={styles.rewardText}>
                                            <span className={styles.rewardAmt}>+{pendingGift.gift_amount} {GIFT_CONFIG[pendingGift.gift_type]?.label}</span>
                                            <button
                                                className={styles.claimGiftBtn}
                                                style={{ marginTop: '4px', padding: '6px 12px' }}
                                                onClick={() => handleClaimGift(pendingGift.id)}
                                                disabled={claimingGift}
                                            >
                                                <span>{claimingGift ? 'সংগ্রহ হচ্ছে...' : 'সংগ্রহ করুন'}</span>
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        className={styles.claimGiftBtn}
                                        onClick={() => handleJarFull()}
                                        disabled={giftGenerationLoading}
                                    >
                                        <Gift size={14} />
                                        <span>{giftGenerationLoading ? 'অপেক্ষা করুন...' : 'উপহার খুলুন!'}</span>
                                    </button>
                                )}
                            </div>
                        ) : (
                            <p className={styles.jarLabel} style={{ fontSize: '0.78rem' }}>
                                জার <strong>{jarProgress.fill_percent}%</strong> পূর্ণ
                            </p>
                        )}

                        <p className={styles.pollenCounter} style={{ fontSize: '0.68rem', opacity: 0.8 }}>
                            🌼 <strong>{jarProgress.pollen_in_cycle || 0}</strong> সংগ্রহ
                        </p>

                        <div className={styles.xpBarWrapper} style={{ gap: '5px' }}>
                            <div className={styles.xpBar} style={{ height: '5px' }}>
                                <div
                                    className={`${styles.xpFill} ${jarProgress.is_full ? styles.xpFillFull : ''}`}
                                    style={{ width: `${jarProgress.fill_percent}%` }}
                                ></div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>


            {!profile && (
                <div className={styles.ctaCard}>
                    <p className={styles.ctaText}>প্রগতি সংরক্ষণ করতে একটি প্রোফাইল তৈরি করুন!</p>
                    <div className={styles.ctaButtons}>
                        <Button variant="primary" style={{ backgroundColor: '#fff', color: '#1cb0f6' }}>প্রোফাইল তৈরি করুন</Button>
                        <Button variant="outline" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}>লগইন করুন</Button>
                    </div>
                </div>
            )}
        </aside>
    );
};

export default StatsSidebar;
