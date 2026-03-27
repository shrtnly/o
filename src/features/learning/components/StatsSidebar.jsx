import React from 'react';
import { Zap, Gem, Heart, HeartCrack, Shield, ChevronDown, Check, Play, Plus, Flame, Lock, Trophy, Infinity, Users, User, UserPlus } from 'lucide-react';
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
import { supabase } from '../../../lib/supabaseClient';
import { cn } from '../../../lib/utils';
import { connectionService } from '../../../services/connectionService';



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



    // Connections & Suggestions
    const [connections, setConnections] = React.useState({ active: [], pending: [], outgoing: [] });
    const [suggestions, setSuggestions] = React.useState([]);
    const [connectionsLoading, setConnectionsLoading] = React.useState(true);
    const [sendingId, setSendingId] = React.useState(null);
    const [leavingId, setLeavingId] = React.useState(null);

    // Fetch streak and activity data — only re-runs when user ID changes, NOT on XP change
    React.useEffect(() => {
        if (!profile?.id) return;

        const fetchStreakData = async () => {
            setStreakLoading(true);
            try {
                // Fetch 365 days once — slice in memory for weekly view (saves 1 DB round-trip)
                const [streakData, full] = await Promise.all([
                    rewardService.getUserStreak(profile.id),
                    rewardService.getActivityHistory(profile.id, 365)
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



        // Listen for profile updates from other components (like Shop)
        const handleProfileUpdate = (e) => {
            if (refreshProfile) refreshProfile();
        };
        window.addEventListener('profileUpdate', handleProfileUpdate);

        return () => {

            window.removeEventListener('profileUpdate', handleProfileUpdate);
        };
    }, [profile?.id, refreshProfile]); // ✅ Only re-fetch on user change, NOT on every XP update

    // Independent fetch for connections and suggestions
    React.useEffect(() => {
        if (!profile?.id) return;

        const fetchConnectionData = async () => {
            setConnectionsLoading(true);
            try {
                const [connRes, suggestRes] = await Promise.all([
                    connectionService.getConnections(profile.id),
                    connectionService.getSuggestions(profile.id, profile.xp, 4) // Fetch 4 suggestions
                ]);
                setConnections(connRes);
                setSuggestions(suggestRes);
            } catch (error) {
                console.error('Error fetching connections in sidebar:', error);
            } finally {
                setConnectionsLoading(false);
            }
        };

        fetchConnectionData();
    }, [profile?.id, profile?.xp]);

    const handleConnectClick = async (targetId) => {
        setSendingId(targetId);
        try {
            await connectionService.sendRequest(profile.id, targetId);
            setSuggestions(prev => prev.map(s => s.id === targetId ? { ...s, request_sent: true } : s));
            
            // Wait for check animation, then trigger exit animation and remove
            setTimeout(() => {
                setLeavingId(targetId);
                setTimeout(() => {
                    setSuggestions(prev => prev.filter(s => s.id !== targetId));
                    setLeavingId(null);
                    refreshProfile && refreshProfile();
                }, 300); // Match itemExit animation duration
            }, 800); // Time to see the animated check
            
        } catch (err) {
            console.error('Connect error:', err);
        } finally {
            setSendingId(null);
        }
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
                                    {currentCourse?.title || t('select_course')}
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
                                    <span className={styles.optionTitle}>{t('add_course')}</span>
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
                        <div className={styles.statItem} title={t('total_xp')}>
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
                                    (profile?.is_premium || profile?.is_1day_premium) ? (
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
            <div className={cn(styles.card, styles.cardGolden)}>
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
                            color="var(--color-text-muted)"
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
                                <stop offset="50%" style={{ stopColor: '#FFB800', stopOpacity: 1 }} />
                                <stop offset="100%" style={{ stopColor: '#F39C12', stopOpacity: 1 }} />
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
                                        const dayOfWeek = now.getDay(); // 0(Sun) to 6(Sat)

                                        // Adjust index so it starts from Saturday (index 0)
                                        const daysFromSaturday = (dayOfWeek + 1) % 7;
                                        const d = new Date(now);
                                        d.setDate(now.getDate() - daysFromSaturday + index);

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
                                                            stroke={isToday ? "#f1c40f" : "var(--color-border)"}
                                                        />
                                                    )}
                                                </div>
                                                <span className={cn(styles.flameDayLabel, (isPast || isPracticed) && styles.flameDayLabelActive)}>
                                                    {[t('sat'), t('sun'), t('mon'), t('tue'), t('wed'), t('thu'), t('fri')][index]}
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
                        <span>{profile?.xp >= 100 ? t('your_leaderboard') : t('leaderboard')}</span>
                    </h3>
                    {profile?.xp >= 100 && (
                        <span className={styles.viewAll}></span>
                    )}
                </div>
                <div className={styles.leaderboardContent}>
                    {profile && (
                        profile.xp < 100 ? (
                            <div className={styles.unlockContent}>
                                <div className={styles.iconBoxLocked}>
                                    <Lock size={40} className={styles.lockIconLarge} />
                                </div>
                                <div className={styles.unlockInfo}>
                                    <h4 className={styles.unlockTitle}>{t('unlock_leaderboard_title')}</h4>
                                    <p className={styles.unlockDesc}>{t('unlock_leaderboard_desc')}</p>
                                </div>
                            </div>
                        ) : leaderboardLoading ? (
                            <div className={`${styles.leaderboardRow} ${styles.skeleton}`} style={{ height: '45px', marginBottom: '12px' }}></div>
                        ) : (
                            <>
                                <div className={`${styles.leaderboardRow} ${styles.leaderboardRowActive}`}>
                                    <div className={styles.leaderboardRowLeft}>
                                        <span className={styles.rowRank}>{userRank || '-'}</span>
                                        <img
                                            src={profile.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${profile.display_name || profile.id}`}
                                            className={styles.rowAvatar}
                                            alt={profile.display_name || t('learner')}
                                        />
                                        <span className={styles.rowName}>
                                            {profile.display_name || t('learner')}
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

                                <div className={styles.leaderboardPreview}>
                                    {(!leaderboardData?.length) ? (
                                        <div className={styles.leaderboardPreview}>
                                            <div className={`${styles.leaderboardRow} ${styles.skeleton}`} style={{ height: '40px', marginBottom: '8px' }}></div>
                                            <div className={`${styles.leaderboardRow} ${styles.skeleton}`} style={{ height: '40px' }}></div>
                                        </div>
                                    ) : (
                                        leaderboardData.slice(0, 2).map((user, index) => {
                                            const avatarSeed = index === 0 ? 'Felix' : 'Vivian';
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
                                                            alt={user.display_name || t('learner')}
                                                        />
                                                        <span className={styles.rowName}>
                                                            {user.display_name || t('learner')}
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
                                </div>
                            </>
                        )
                    )}
                </div>
            </div>


            {/* Suggest list */}
            {(!connectionsLoading && suggestions.length > 0) && (
                <div className={cn(styles.card, styles.cardGolden)} style={{ marginTop: '4px' }}>
                    <div className={styles.cardHeader}>
                        <h3 className={styles.cardTitle}>
                            <Users size={18} className={styles.cardTitleIcon} />
                            <span>{t('connect_now')}</span>
                        </h3>
                    </div>
                    <div className={styles.emptyStateContainer}>
                        <div className={styles.suggestList}>
                            {suggestions.map(s => (
                                <div 
                                    key={s.id} 
                                    className={cn(styles.suggestItem, leavingId === s.id && styles.suggestItemLeaving)}
                                >
                                    <div className={styles.suggestItemLeft}>
                                        <div className={styles.suggestAvatar}>
                                            {s.avatar_url ? (
                                                <img src={s.avatar_url} alt={s.display_name} />
                                            ) : (
                                                <User size={16} />
                                            )}
                                        </div>
                                        <div className={styles.suggestText}>
                                            <span className={styles.suggestName}>{s.display_name || t('learner')}</span>
                                            <span className={styles.suggestXp}>{s.xp} XP</span>
                                        </div>
                                    </div>
                                    <button
                                        className={styles.connectMiniBtn}
                                        onClick={() => handleConnectClick(s.id)}
                                        disabled={sendingId === s.id || s.request_sent}
                                    >
                                        {sendingId === s.id ? (
                                            <div className={styles.tinyLoader} />
                                        ) : (
                                            s.request_sent ? <Check size={14} className={styles.checkAnimated} /> : <Plus size={14} />
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button
                            className={styles.viewConnectionsBtn}
                            onClick={() => navigate('/profile?tab=connection')}
                        >
                            <span>{t('see_all')}</span>
                            <ChevronDown size={14} style={{ transform: 'rotate(-90deg)' }} />
                        </button>
                    </div>
                </div>
            )}





        </aside>
    );
};

export default StatsSidebar;
