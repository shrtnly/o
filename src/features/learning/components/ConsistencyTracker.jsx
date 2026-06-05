import React, { useState, useMemo } from 'react';
import {
    Flame,
    Zap,
    TrendingUp,
    Info,
    ChevronLeft,
    ChevronRight,
    Check,
    X,
    Trophy,
    Star,
    Target,
    Rocket,
    Activity
} from 'lucide-react';
import { motion } from 'framer-motion';
import styles from './ConsistencyTracker.module.css';
import { formatLocalDate } from '../../../lib/dateUtils';
import { useLanguage } from '../../../context/LanguageContext';

const ConsistencyTracker = ({ profile, streak, history = [], calendarTopContent }) => {
    const { t, language } = useLanguage();
    const [viewMode, setViewMode] = useState('daily');
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const stats = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        // Get unique days in the selected month where the user was active
        const uniqueActiveDays = new Set(
            history
                .filter(h => {
                    const date = new Date(h.activity_date);
                    return date.getMonth() === month &&
                           date.getFullYear() === year &&
                           (h.xp_earned > 0 || h.lessons_completed > 0);
                })
                .map(h => h.activity_date)
        );

        const achievedDays = uniqueActiveDays.size;
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Calculate days elapsed in current month (up to today)
        const today = new Date();
        const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;
        const isPastMonth = year < today.getFullYear() || (year === today.getFullYear() && month < today.getMonth());
        
        let daysElapsed = daysInMonth;
        if (isCurrentMonth) {
            daysElapsed = today.getDate();
        } else if (!isPastMonth) {
            daysElapsed = 0; // Future month
        }

        const monthlyScore = Math.round((achievedDays / daysInMonth) * 100) || 0;
        const currentPaceScore = daysElapsed > 0 ? Math.round((achievedDays / daysElapsed) * 100) : 0;

        return {
            currentStreak: streak?.current_streak || 0,
            bestStreak: streak?.longest_streak || 0,
            score: monthlyScore,
            achievedDays,
            daysInMonth,
            daysElapsed,
            currentPaceScore
        };
    }, [history, streak, currentMonth]);

    const calendarData = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        const emptyDaysCount = (new Date(year, month, 1).getDay() + 1) % 7;
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const days = [];
        for (let i = 0; i < emptyDaysCount; i++) {
            days.push({ type: 'empty', id: `empty-${i}` });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 1; i <= daysInMonth; i++) {
            const dateObj = new Date(year, month, i);
            dateObj.setHours(0, 0, 0, 0);
            const dateStr = formatLocalDate(dateObj);

            const activity = history.find(h => h.activity_date === dateStr && (h.xp_earned > 0 || h.lessons_completed > 0));
            const isToday = dateObj.getTime() === today.getTime();
            const isFuture = dateObj.getTime() > today.getTime();

            let type = 'missed';
            if (activity) {
                type = 'achieved';
            } else if (isFuture) {
                type = 'future';
            }

            days.push({
                day: i,
                type: type,
                isToday,
                isFuture,
                date: dateStr,
                id: dateStr
            });
        }

        return days;
    }, [currentMonth, history]);

    const weeklyData = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const weeks = [];

        // Find all days for the month
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let w = 0; w < 5; w++) {
            const weekStartDay = w * 7 + 1;
            const weekEndDay = Math.min((w + 1) * 7, daysInMonth);

            if (weekStartDay > daysInMonth) break;

            const weekStartDate = new Date(year, month, weekStartDay);
            weekStartDate.setHours(0, 0, 0, 0);
            const weekEndDate = new Date(year, month, weekEndDay);
            weekEndDate.setHours(0, 0, 0, 0);

            let achievedCount = 0;
            for (let d = weekStartDay; d <= weekEndDay; d++) {
                const dateObj = new Date(year, month, d);
                const dateStr = formatLocalDate(dateObj);
                if (history.some(h => h.activity_date === dateStr && (h.xp_earned > 0 || h.lessons_completed > 0))) {
                    achievedCount++;
                }
            }

            const totalDaysInWeek = (weekEndDay - weekStartDay) + 1;
            const progress = (achievedCount / totalDaysInWeek) * 100;

            const isPast = weekEndDate < today;
            const isCurrent = today >= weekStartDate && today <= weekEndDate;

            weeks.push({
                label: `${t('week')} ${w + 1}`,
                progress,
                isCompleted: progress === 100,
                isIncomplete: progress < 100,
                isStarted: progress > 0,
                isPast,
                isCurrent
            });
        }
        return weeks;
    }, [currentMonth, history]);

    const changeMonth = (offset) => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    };

    const monthOnly = currentMonth.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
        month: 'long'
    });
    const year2Digit = currentMonth.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
        year: '2-digit'
    });
    const monthDisplay = `${monthOnly} -${year2Digit}`;

    const getProgressStatus = (percent) => {
        if (percent >= 90) return { label: language === 'bn' ? 'অসাধারণ ধারাবাহিকতা' : 'Exceptional Consistency', color: '#FFD700', bg: 'rgba(255, 215, 0, 0.12)', border: 'rgba(255, 215, 0, 0.25)', icon: Trophy };
        if (percent >= 70) return { label: language === 'bn' ? 'দারুণ এগিয়ে যাচ্ছেন' : 'Doing Great', color: '#FFB800', bg: 'rgba(255, 184, 0, 0.12)', border: 'rgba(255, 184, 0, 0.25)', icon: Star };
        if (percent >= 50) return { label: language === 'bn' ? 'ভালো অগ্রগতি' : 'Good Progress', color: '#F39C12', bg: 'rgba(243, 156, 18, 0.12)', border: 'rgba(243, 156, 18, 0.25)', icon: TrendingUp };
        if (percent >= 30) return { label: language === 'bn' ? 'চালিয়ে যান' : 'Keep Going', color: '#E67E22', bg: 'rgba(230, 126, 34, 0.12)', border: 'rgba(230, 126, 34, 0.25)', icon: Target };
        return { label: language === 'bn' ? 'প্রায় কাছাকাছি' : 'Almost There', color: '#D35400', bg: 'rgba(211, 84, 0, 0.12)', border: 'rgba(211, 84, 0, 0.25)', icon: Activity };
    };

    const status = getProgressStatus(stats.currentPaceScore);
    const StatusIcon = status.icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={styles.container}
        >
            <svg width="0" height="0" style={{ position: 'absolute' }}>
                <defs>
                    <linearGradient id="flameGradientTracker" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style={{ stopColor: '#FFD700', stopOpacity: 1 }} />
                        <stop offset="50%" style={{ stopColor: '#FFB800', stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: '#E67E22', stopOpacity: 1 }} />
                    </linearGradient>
                </defs>
            </svg>

            {calendarTopContent && (
                <div className={styles.calendarTopContent} style={{ paddingBottom: '20px' }}>
                    {calendarTopContent}
                </div>
            )}

            <div className={styles.statsRow}>
                <div className={styles.statBox}>
                    <span className={styles.statLabel}>{t('current_streak')}</span>
                    <div className={styles.statMain}>
                        <Flame size={40} color="url(#flameGradientTracker)" fill="url(#flameGradientTracker)" />
                        <span className={styles.statValue}>{stats.currentStreak}</span>
                    </div>
                    <div className={styles.statSub}>
                        <span className={styles.bestLabel}>{t('my_best')}</span>
                        <Trophy size={14} color="#FFB800" />
                        <span className={styles.bestValue}>{stats.bestStreak}</span>
                    </div>
                </div>

                <div className={styles.statsDivider}></div>

                <div className={styles.statBox}>
                    <span className={styles.statLabel}>{t('consistency_score')}</span>
                    <div className={styles.statMain}>
                        <StatusIcon size={40} color={status.color} strokeWidth={2.5} />
                        <span className={styles.statValue} style={{ color: status.color }}>{stats.score}%</span>
                    </div>
                    <div className={styles.statSub} style={{ marginTop: '4px' }}>
                        <span 
                            className={styles.statusBubble} 
                            style={{ 
                                color: status.color, 
                                backgroundColor: status.bg,
                                border: `1px solid ${status.border}`,
                                padding: '4px 10px',
                                borderRadius: '100px',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {status.label}
                        </span>
                    </div>
                </div>
            </div>

            <div className={styles.divider}></div>

            <div className={styles.trackerHeader}>
                <div className={styles.monthNav}>
                    <div className={styles.monthSelector}>
                        <span className={styles.monthYear}>{monthDisplay}</span>
                        <div className={styles.navControls}>
                            <button className={styles.navBtn} onClick={() => changeMonth(-1)}>
                                <ChevronLeft size={18} />
                            </button>
                            <button className={styles.navBtn} onClick={() => changeMonth(1)}>
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className={styles.viewSwitcher}>
                    <motion.div
                        className={styles.switchHighlight}
                        animate={{ x: viewMode === 'daily' ? 0 : '100%' }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                    <button
                        className={`${styles.switchBtn} ${viewMode === 'daily' ? styles.switchBtnActive : ''}`}
                        onClick={() => setViewMode('daily')}
                    >
                        {t('daily')}
                    </button>
                    <button
                        className={`${styles.switchBtn} ${viewMode === 'weekly' ? styles.switchBtnActive : ''}`}
                        onClick={() => setViewMode('weekly')}
                    >
                        {t('weekly')}
                    </button>
                </div>
            </div>

            <div className={styles.calendarSection}>
                {viewMode === 'daily' ? (
                    <div className={styles.dailyView}>
                        <div className={styles.calendarGrid}>
                            {[t('sat'), t('sun'), t('mon'), t('tue'), t('wed'), t('thu'), t('fri')].map(dayLabel => (
                                <div key={dayLabel} className={styles.weekdayName}>{dayLabel}</div>
                            ))}
                            {calendarData.map(day => (
                                <div
                                    key={day.id}
                                    className={`
                                        ${styles.daySquare} 
                                        ${day.type === 'achieved' ? styles.dayAchieved : ''} 
                                        ${day.type === 'future' ? styles.dayFuture : ''}
                                        ${day.type === 'empty' ? styles.dayEmpty : ''}
                                        ${day.isToday ? styles.dayToday : ''}
                                    `}
                                    title={day.date}
                                >
                                    {day.isToday && day.type !== 'achieved' ? (
                                        <div className={`${styles.dayNumber} ${styles.todayNumber}`}>
                                            {day.day}
                                        </div>
                                    ) : day.type === 'achieved' ? (
                                        <div className={styles.flameContainer}>
                                            <Flame size={20} color="url(#flameGradientTracker)" fill="url(#flameGradientTracker)" />
                                        </div>
                                    ) : day.type === 'missed' ? (
                                        <div className={styles.flameContainer}>
                                            <Flame size={20} className={styles.inactiveFlame} strokeWidth={2} />
                                        </div>
                                    ) : (
                                        day.day && <span className={styles.dayNumber}>{day.day}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className={styles.weeklyView}>
                        <div className={styles.weekTimeline}>
                            <div className={styles.timelineLine} />
                            {weeklyData.map((week, idx) => (
                                <div key={idx} className={styles.weekNode}>
                                    <div className={`
                                        ${styles.weekCircle} 
                                        ${week.isCompleted ? styles.weekCompleted : ''}
                                        ${(!week.isCompleted && week.isPast) ? styles.weekIncomplete : ''}
                                        ${week.isCurrent && week.progress < 100 ? styles.weekInProgress : ''}
                                    `}>
                                        {week.isCompleted && <Check size={14} color="#fff" strokeWidth={4} />}
                                        {!week.isCompleted && week.isPast && <X size={14} color="#fff" strokeWidth={4} />}
                                        {week.isCurrent && week.progress < 100 && (
                                            <div className={styles.progressRing} style={{ '--progress': `${week.progress}%` }} />
                                        )}
                                    </div>
                                    <span className={styles.weekLabel}>{week.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default ConsistencyTracker;
