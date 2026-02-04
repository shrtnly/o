import React, { useState, useMemo } from 'react';
import {
    Flame,
    Zap,
    TrendingUp,
    Info,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import styles from './ConsistencyTracker.module.css';
import { formatLocalDate } from '../../../lib/dateUtils';

const ConsistencyTracker = ({ profile, streak, history = [] }) => {
    const [viewMode, setViewMode] = useState('daily');
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const stats = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        // Filter history for current month only
        const monthlyHistory = history.filter(h => {
            const date = new Date(h.activity_date);
            return date.getMonth() === month &&
                date.getFullYear() === year;
        });

        const achievedDays = monthlyHistory.length;
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Calculate days elapsed in current month (up to today)
        const today = new Date();
        const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;
        const daysElapsed = isCurrentMonth ? today.getDate() : daysInMonth;

        // Calculate progress percentage based on days elapsed (not total month)
        const progressPercentage = daysElapsed > 0 ? Math.round((achievedDays / daysElapsed) * 100) : 0;

        return {
            currentStreak: streak?.current_streak || 0,
            bestStreak: streak?.longest_streak || 0,
            score: Math.round((achievedDays / daysInMonth) * 100) || 0,
            achievedDays,
            daysInMonth,
            daysElapsed,
            progressPercentage
        };
    }, [history, streak, currentMonth]);

    const calendarData = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const days = [];
        for (let i = 0; i < firstDay; i++) {
            days.push({ type: 'empty', id: `empty-${i}` });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 1; i <= daysInMonth; i++) {
            const dateObj = new Date(year, month, i);
            dateObj.setHours(0, 0, 0, 0);
            const dateStr = formatLocalDate(dateObj);

            const activity = history.find(h => h.activity_date === dateStr);
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

        for (let w = 0; w < 5; w++) {
            const weekStart = w * 7 + 1;
            const weekEnd = Math.min((w + 1) * 7, daysInMonth);

            if (weekStart > daysInMonth) break;

            let achievedCount = 0;
            for (let d = weekStart; d <= weekEnd; d++) {
                const dateObj = new Date(year, month, d);
                const dateStr = formatLocalDate(dateObj);
                if (history.some(h => h.activity_date === dateStr)) {
                    achievedCount++;
                }
            }

            const totalDaysInWeek = (weekEnd - weekStart) + 1;
            const progress = (achievedCount / totalDaysInWeek) * 100;

            weeks.push({
                label: `Week ${w + 1}`,
                progress,
                isCompleted: progress === 100,
                isStarted: progress > 0
            });
        }
        return weeks;
    }, [currentMonth, history]);

    const changeMonth = (offset) => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    };

    const monthDisplay = currentMonth.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
    });

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={styles.container}
        >
            <div className={styles.statsRow}>
                <div className={styles.statBox}>
                    <span className={styles.statLabel}>Current Streak</span>
                    <div className={styles.statMain}>
                        <Flame size={40} color="#ff9600" fill="#ff9600" />
                        <span className={styles.statValue}>{stats.currentStreak}</span>
                    </div>
                    <div className={styles.statSub}>
                        <span className={styles.bestLabel}>My Best</span>
                        <Zap size={14} color="#58cc02" fill="currentColor" />
                        <span className={styles.bestValue}>{stats.bestStreak}</span>
                    </div>
                </div>

                <div className={styles.statsDivider}></div>

                <div className={styles.statBox}>
                    <span className={styles.statLabel}>Consistency Score</span>
                    <div className={styles.statMain}>
                        <TrendingUp size={40} color="#58cc02" strokeWidth={2.5} />
                        <span className={styles.statValue}>{stats.score}</span>
                    </div>
                    <div className={styles.statSub}>
                        <span className={styles.tagline}>
                            {stats.progressPercentage >= 90 ? '🔥 Perfect Progress!' :
                                stats.progressPercentage >= 75 ? '🟢 Almost Perfect!' :
                                    stats.progressPercentage >= 50 ? '🟡 Good Progress!' :
                                        stats.progressPercentage >= 25 ? '🟠 Keep Going!' :
                                            stats.progressPercentage > 0 ? '🔴 Getting Started!' :
                                                '⚪ No Practice Yet'}
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
                    <button
                        className={`${styles.switchBtn} ${viewMode === 'daily' ? styles.switchBtnActive : ''}`}
                        onClick={() => setViewMode('daily')}
                    >
                        Daily
                    </button>
                    <button
                        className={`${styles.switchBtn} ${viewMode === 'weekly' ? styles.switchBtnActive : ''}`}
                        onClick={() => setViewMode('weekly')}
                    >
                        Weekly
                    </button>
                </div>
            </div>

            <div className={styles.calendarSection}>
                {viewMode === 'daily' ? (
                    <div className={styles.dailyView}>
                        <div className={styles.calendarGrid}>
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
                                    {day.type === 'achieved' ? (
                                        <div className={styles.flameContainer}>
                                            <Flame size={20} fill="#ff9600" color="#ff9600" />
                                        </div>
                                    ) : (
                                        (day.type === 'future' || day.isToday) && day.day && <span className={styles.dayNumber}>{day.day}</span>
                                    )}
                                    {day.isToday && <div className={styles.todayIndicator} />}
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
                                        ${week.isStarted && !week.isCompleted ? styles.weekInProgress : ''}
                                    `}>
                                        {week.isCompleted && <Check size={14} color="#fff" strokeWidth={4} />}
                                        {week.isStarted && !week.isCompleted && (
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
