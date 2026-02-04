import React from 'react';
import { Zap, Gem, Heart, Shield, ChevronDown, Check, Play, Plus, Flame } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { rewardService } from '../../../services/rewardService';
import ConsistencyTracker from './ConsistencyTracker';
import Button from '../../../components/ui/Button';
import styles from '../LearningPage.module.css';
import { formatLocalDate } from '../../../lib/dateUtils';

const StatsSidebar = ({ profile, courses = [], currentCourseId }) => {
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

                console.log('StatsSidebar - Fetched Data:', {
                    profileId: profile.id,
                    streakData,
                    weeklyHistory: history,
                    weeklyCount: history?.length,
                    fullHistory: full,
                    fullCount: full?.length
                });

                setStreak(streakData);
                setWeeklyActivity(history);
                setFullHistory(full);
            } catch (error) {
                console.error('Error fetching streak data:', error);
            }
        };

        fetchStreakData();
    }, [profile?.id]);

    return (
        <aside className={styles.rightSidebar}>
            {/* Course Selector */}
            <div className={styles.courseSelectorContainer}>
                {/* ... existing course selector code ... */}
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
            </div>

            <div className={styles.statsRow}>
                <div className={styles.statItem} style={{ color: '#ffc800' }} title="Total XP">
                    <Zap size={24} fill="#ffc800" />
                    <span>{profile?.xp || 0}</span>
                </div>
                <div className={styles.statItem} style={{ color: '#1cb0f6' }} title="Gems">
                    <Gem size={24} fill="#1cb0f6" />
                    <span>{profile?.gems || 0}</span>
                </div>
                <div className={styles.statItem} style={{ color: '#ff4b4b' }} title="Hearts">
                    <Heart size={24} fill="#ff4b4b" />
                    <span>{profile?.hearts || 0}</span>
                </div>
                <div className={styles.statItem} style={{ color: '#ff9600' }} title="Current Streak">
                    <Flame size={24} fill="#ff9600" />
                    <span>{streak?.current_streak || 0}</span>
                </div>
            </div>

            <div style={{ height: '8px' }}></div>

            {/* Daily Practices Tracker / Consistency Tracker */}
            <div className={styles.card} style={{ borderBottom: isExpanded ? '5px solid #37464f' : '' }}>
                <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>দৈনিক অনুশীলন</h3>
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
                                {[...Array(7)].map((_, index) => {
                                    const now = new Date();
                                    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

                                    // Calculate the date for this index (0 = Sunday of current week)
                                    const d = new Date(now);
                                    d.setDate(now.getDate() - dayOfWeek + index);

                                    const dateStr = formatLocalDate(d);
                                    const isPracticed = weeklyActivity.some(a => a.activity_date === dateStr);
                                    const isToday = index === dayOfWeek;

                                    // Debug logging (remove after testing)
                                    if (index === 0) {
                                        console.log('Weekly Flame Tracker Debug:', {
                                            today: formatLocalDate(now),
                                            dayOfWeek,
                                            weeklyActivityCount: weeklyActivity.length,
                                            weeklyActivityDates: weeklyActivity.map(a => a.activity_date)
                                        });
                                    }
                                    console.log(`Day ${index} (${['র', 'সো', 'ম', 'বু', 'বৃ', 'শু', 'শ'][index]}):`, {
                                        date: dateStr,
                                        isPracticed,
                                        isToday
                                    });

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
                                })}
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

            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>লিডারবোর্ড আনলক করুন!</h3>
                </div>
                <div className={styles.unlockContent}>
                    <div className={styles.iconBox}>
                        <Shield size={32} color="#4b4b4b" />
                    </div>
                    <p className={styles.unlockText}>প্রতিযোগিতা শুরু করতে আরও ১০টি পাঠ সম্পূর্ণ করুন</p>
                </div>
            </div>

            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>দৈনিক অনুসন্ধান</h3>
                    <span className={styles.viewAll}>সব দেখুন</span>
                </div>
                <div className={styles.questItem}>
                    <Zap size={32} color="#ffc800" fill="#ffc800" />
                    <div className={styles.progressContainer}>
                        <div className={styles.questTitle}>১০ XP অর্জন করুন</div>
                        <div className={styles.progressBar}>
                            <div className={styles.progressFill} style={{ width: '0%' }}></div>
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
