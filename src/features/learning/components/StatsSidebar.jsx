import React from 'react';
import { Zap, Gem, Heart, HeartCrack, Shield, ChevronDown, Check, Play, Plus, Flame, Lock } from 'lucide-react';
import HoneyDropIcon from '../../../components/HoneyDropIcon';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { rewardService } from '../../../services/rewardService';
import ConsistencyTracker from './ConsistencyTracker';
import Button from '../../../components/ui/Button';
import ShieldIcon from '../../../components/ShieldIcon';
import styles from '../LearningPage.module.css';
import { formatLocalDate } from '../../../lib/dateUtils';
import { leaderboardService } from '../../../services/leaderboardService';
import { getShieldLevel } from '../../../utils/shieldSystem';

const StatsSidebar = ({ profile, hearts, refillTime, courses = [], currentCourseId }) => {
    const navigate = useNavigate();
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
    const [internalLoading, setInternalLoading] = React.useState(true);

    // Fetch streak and activity data
    React.useEffect(() => {
        if (!profile?.id) return;

        const fetchStreakData = async () => {
            try {
                const [streakData, history, full] = await Promise.all([
                    rewardService.getUserStreak(profile.id),
                    rewardService.getActivityHistory(profile.id, 7),
                    rewardService.getActivityHistory(profile.id, 365)
                ]);

                setStreak(streakData);
                setWeeklyActivity(history);
                setFullHistory(full);
            } catch (error) {
                console.error('Error fetching streak data:', error);
            }
        };

        const fetchLeaderboard = async () => {
            try {
                if (profile.xp > 0) {
                    const tier = getShieldLevel(profile.xp).level;
                    // Fetch top 2 for preview
                    const result = await leaderboardService.getLeaderboardByTier(tier, 2);
                    setLeaderboardData(result.data || []);

                    // Fetch rank
                    const rank = await leaderboardService.getUserRank(profile.id, tier);
                    setUserRank(rank);
                }
            } catch (error) {
                console.error('Error fetching leaderboard:', error);
                setLeaderboardData([]);
                setUserRank(null);
            }
        };

        const fetchData = async () => {
            setInternalLoading(true);
            try {
                await Promise.all([fetchStreakData(), fetchLeaderboard()]);
            } finally {
                setInternalLoading(false);
            }
        };

        fetchData();
    }, [profile?.id, profile?.xp]);

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
                                        {course.id === currentCourseId && <Check size={16} color="#58cc02" strokeWidth={3} />}
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
                {(!profile || internalLoading) ? (
                    <>
                        <div className={`${styles.statItem} ${styles.skeleton}`} style={{ width: '80px', height: '40px' }}></div>
                        <div className={`${styles.statItem} ${styles.skeleton}`} style={{ width: '80px', height: '40px' }}></div>
                        <div className={`${styles.statItem} ${styles.skeleton}`} style={{ width: '80px', height: '40px' }}></div>
                    </>
                ) : (
                    <>
                        <div className={styles.statItem} title="Total XP">
                            <ShieldIcon
                                xp={profile?.xp || 0}
                                size={40}
                                showShadow={getShieldLevel(profile?.xp || 0).level !== 'SILVER'}
                            />
                            <span>{profile?.xp || 0}</span>
                        </div>
                        <div className={styles.statItem} style={{ color: '#1cb0f6' }} title="Gems">
                            <Gem size={34} fill="#1cb0f6" />
                            <span>{profile?.gems || 0}</span>
                        </div>
                        <div className={styles.statItem} style={{ color: '#ff4b4b', position: 'relative' }} title="Honey Drops 🍯">
                            <HoneyDropIcon
                                size={24}
                                isEmpty={(hearts == 0 || Number(hearts) === 0) && refillTime}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                {!(Number(hearts) === 0 && refillTime) && (
                                    <span>{hearts !== undefined ? hearts : (profile?.hearts || 0)}</span>
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
            <div className={styles.card} style={{ borderBottom: isExpanded ? '5px solid #37464f' : '' }}>
                <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>⚡ Buzz Streak</h3>
                    <span
                        className={styles.viewAll}
                        onClick={() => setIsExpanded(!isExpanded)}
                        style={{ cursor: 'pointer' }}
                    >
                        {isExpanded ? 'সংক্ষেপ করুন' : 'সব দেখুন'}
                    </span>
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
                                        <stop offset="0%" style={{ stopColor: '#ff9600', stopOpacity: 1 }} />
                                        <stop offset="100%" style={{ stopColor: '#ff4b4b', stopOpacity: 1 }} />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div className={styles.flameRow}>
                                {(!profile || internalLoading) ? (
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

                                        return (
                                            <div key={index} className={styles.flameContainer} title={dateStr}>
                                                <div className={`${styles.flameIcon} ${isPracticed ? styles.flameActive : ''} ${isToday ? styles.flameToday : ''}`}>
                                                    <Flame
                                                        size={24}
                                                        fill={isPracticed ? "url(#flameGradient)" : (isToday ? "rgba(255,150,0,0.1)" : "none")}
                                                        stroke={isPracticed ? "none" : (isToday ? "#ff9600" : "#37464f")}
                                                    />
                                                </div>
                                                <span className={styles.flameDayLabel}>
                                                    {['র', 'সো', 'ম', 'বু', 'বৃ', 'শু', 'শ'][index]}
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

            <div className={styles.card} onClick={() => profile?.xp >= 100 && navigate('/leaderboard')} style={{ cursor: profile?.xp >= 100 ? 'pointer' : 'default' }}>
                <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>{profile?.xp >= 100 ? 'আপনার লিডারবোর্ড' : 'লিডারবোর্ড'}</h3>
                </div>
                {profile?.xp >= 100 ? (
                    <div className={styles.leaderboardPreview}>
                        {(internalLoading || !leaderboardData?.length) ? (
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
                                            <span className={styles.rowName}>{user.display_name || 'লার্নার'}</span>
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
                                <div className={styles.leaderboardDivider}>•••</div>
                                <div className={`${styles.leaderboardRow} ${styles.leaderboardRowActive}`}>
                                    <div className={styles.leaderboardRowLeft}>
                                        <span className={styles.rowRank}>{userRank}</span>
                                        <img
                                            src={profile.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${profile.display_name || profile.id}`}
                                            className={styles.rowAvatar}
                                            alt={profile.display_name || 'লার্নার'}
                                        />
                                        <span className={styles.rowName}>{profile.display_name || 'লার্নার'}</span>
                                    </div>
                                    <div className={styles.leaderboardRowRight}>
                                        <ShieldIcon
                                            xp={profile.xp}
                                            size={22}
                                            showTooltip={false}
                                            showShadow={getShieldLevel(profile.xp).level !== 'SILVER'}
                                        />
                                        <span className={styles.rowXP}>{profile.xp}</span>
                                    </div>
                                </div>
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

            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>দৈনিক অনুসন্ধান</h3>
                    <span className={styles.viewAll}>সব দেখুন</span>
                </div>
                {(!profile || internalLoading) ? (
                    <div className={`${styles.questItem} ${styles.skeleton}`} style={{ height: '60px', width: '100%' }}></div>
                ) : (
                    <div className={styles.questItem}>
                        <Zap size={32} color="#ffc800" fill="#ffc800" />
                        <div className={styles.progressContainer}>
                            <div className={styles.questTitle}>১০ XP অর্জন করুন</div>
                            <div className={styles.progressBar}>
                                <div className={styles.progressFill} style={{ width: '0%' }}></div>
                            </div>
                        </div>
                    </div>
                )}
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
