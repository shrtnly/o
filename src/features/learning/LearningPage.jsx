import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { NavLink, useNavigate, useLocation, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import {
    Settings, Bell, Shield, User, Sliders, BookOpen, ChevronRight, Moon, Sun, Globe, Sparkles,
    Volume2, VolumeX, Crown, RotateCcw, AlertTriangle, Check, X, Zap, ShoppingBag, Drone,
    LogOut, Flame, Play, Plus, ChevronDown, ChevronLeft, Star, Lock, PenTool, Activity,
    Gift, PackageOpen, ArrowUp, ArrowDown, Send, Shapes, ChartPie, Command, Lightbulb,
    Timer, Settings2, Rocket, MousePointerClick, Layers2, Anchor, Infinity as InfinityIcon
} from 'lucide-react';
import { rewardService } from '../../services/rewardService';
import styles from './LearningPage.module.css';
import LoadingScreen from '../../components/ui/LoadingScreen';
import InlineLoader from '../../components/ui/InlineLoader';
import HoneyDropIcon from '../../components/HoneyDropIcon';
import PollenIcon from '../../components/PollenIcon';
import ShieldIcon from '../../components/ShieldIcon';
import Sidebar from './components/Sidebar';
import StatsSidebar from './components/StatsSidebar';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import RewardModal from './components/RewardModal';
import { useHeartRefill } from '../../hooks/useHeartRefill';
import { courseService } from '../../services/courseService';
import { useTheme } from '../../context/ThemeContext';


// Helper for node positioning (Snake pattern: Always 3 nodes per row with scaling)
const getNodePos = (i, nodesPerRow) => {
    const windowWidth = window.innerWidth;
    const isMobile = windowWidth <= 768;

    // Dynamic centerX based on viewport - ensure nodes stay centered
    // On mobile, the main area is the full window. On desktop, it's roughly 1fr of the grid.
    const centerX = isMobile ? (windowWidth / 2) : 320;

    // Basic spacings
    let xSpacing = 160;
    let ySpacing = 160;

    // Scale spacing based on screen size
    if (windowWidth < 480) {
        xSpacing = 95;
        ySpacing = 135;
    } else if (windowWidth < 768) {
        xSpacing = 125;
        ySpacing = 145;
    }

    const row = Math.floor(i / nodesPerRow);
    const col = i % nodesPerRow;
    const isEvenRow = row % 2 === 0;
    const xCol = isEvenRow ? col : (nodesPerRow - 1 - col);

    const startY = 60;

    const offsetFactor = (nodesPerRow - 1) / 2;
    return {
        x: centerX + (xCol - offsetFactor) * xSpacing,
        y: startY + row * ySpacing,
        centerX // Pass centerX for path calculations
    };
};

const getPathData = (chapters, nodesPerRow) => {
    if (chapters.length < 2) return '';
    let d = '';

    const windowWidth = window.innerWidth;
    const curveTension = windowWidth < 480 ? 65 : (windowWidth < 768 ? 85 : 100);

    for (let i = 0; i < chapters.length; i++) {
        const pos = getNodePos(i, nodesPerRow);
        const centerX = pos.centerX;

        if (i === 0) {
            d = `M ${pos.x},${pos.y}`;
        } else {
            const prevPos = getNodePos(i - 1, nodesPerRow);
            if (prevPos.y === pos.y) {
                // Same row: Horizontal line
                d += ` L ${pos.x},${pos.y}`;
            } else {
                // Next row: S-curve at the edge
                const cpX = prevPos.x > centerX ? prevPos.x + curveTension : prevPos.x - curveTension;
                d += ` C ${cpX},${prevPos.y} ${cpX},${pos.y} ${pos.x},${pos.y}`;
            }
        }
    }
    return d;
};

// Pool of icons for chapters
const CHAPTER_ICONS = [Play, BookOpen, PenTool, Star, Globe, Activity, Send, Shapes, Sparkles, ChartPie, Command, Lightbulb, Timer, Settings2, Rocket, MousePointerClick, Layers2, Anchor];

// Optimized Chapter Node component
const ChapterNode = React.memo(({ chapter, pos, isCompleted, isActive, isLocked, iconIdx, onClick, isDark }) => {
    return (
        <div
            className={cn(styles.nodeWrapper, isLocked && styles.nodeLocked)}
            style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
            onClick={onClick}
        >
            <div className={cn(
                styles.node,
                isActive && styles.nodeActive,
                isCompleted && styles.nodeCompleted,
                isLocked && styles.nodeLocked,
                chapter.type !== 'lesson' && styles.rewardNode,
                chapter.type === 'mystery_box' && styles.mysteryNode,
                chapter.type === 'heart_box' && styles.heartNode,
                chapter.type === 'pollen_box' && styles.gemsNode
            )}>
                <div className={styles.nodeRing}>
                    <div className={styles.nodeInner}>
                        {chapter.type !== 'lesson' && !isLocked && !isCompleted && (
                            <div className={styles.activeRewardGlow} />
                        )}
                        {(() => {
                            if (chapter.type === 'mystery_box' || chapter.type === 'heart_box' || chapter.type === 'pollen_box') {
                                if (isCompleted) {
                                    return <PackageOpen size={24} color={isDark ? "rgba(255, 215, 0, 0.6)" : "rgba(184, 134, 11, 0.7)"} strokeWidth={2.5} />;
                                }
                                return <Gift size={24} color="#ffd700" strokeWidth={2.5} />;
                            }
                            const IconComponent = CHAPTER_ICONS[iconIdx % CHAPTER_ICONS.length];
                            return (
                                <IconComponent
                                    size={24}
                                    color={isActive || isCompleted ? "var(--unit-color-bg)" : (isDark ? "rgba(255, 255, 255, 0.45)" : "rgba(0, 0, 0, 0.25)")}
                                    strokeWidth={2}
                                />
                            );
                        })()}
                    </div>
                    {isLocked && (
                        <div className={styles.lockIconBadge}>
                            <Lock size={12} fill={isDark ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.3)"} stroke="none" />
                        </div>
                    )}
                </div>
                <div className={styles.nodeLabel}>{chapter.title}</div>
            </div>
        </div>
    );
});

const LearningPage = () => {


    const { courseId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { isDark } = useTheme();
    const [unitsWithChapters, setUnitsWithChapters] = useState([]);
    const [profile, setProfile] = useState(null);
    const [progress, setProgress] = useState([]);
    const [courses, setCourses] = useState([]); // Added to store all enrolled courses
    const [streak, setStreak] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeUnit, setActiveUnit] = useState(null);
    const [nodesPerRow, setNodesPerRow] = useState(3);
    const location = useLocation();

    const [streakHistory, setStreakHistory] = useState([]);
    const [showStreakTooltip, setShowStreakTooltip] = useState(false);
    const [showXpTooltip, setShowXpTooltip] = useState(false);
    const [showPollenTooltip, setShowPollenTooltip] = useState(false);

    // Use heart refill system
    const {
        hearts: refillHearts,
        refillTimeDisplay,
        checkAndRefillHearts
    } = useHeartRefill(user?.id);

    const [scrolled, setScrolled] = useState(false);
    const mainContentRef = useRef(null);

    const [showRewardModal, setShowRewardModal] = useState(false);
    const [lastReward, setLastReward] = useState({ hearts: 0, gems: 0 }); // Note: 'gems' here refers to the pollen count in DB
    const [showHeartsTooltip, setShowHeartsTooltip] = useState(false);

    const handleScroll = () => {
        if (!mainContentRef.current || unitsWithChapters.length === 0) return;

        const container = mainContentRef.current;
        const scrollTop = container.scrollTop;

        // 1. Update scrolled state
        const isScrolled = scrollTop > 20;
        if (isScrolled !== scrolled) {
            setScrolled(isScrolled);
        }

        // 2. Detect the active unit section more efficiently
        const sections = container.querySelectorAll('[data-unit-section]');
        if (sections.length === 0) return;

        let currentActiveUnit = activeUnit;
        const containerTop = container.getBoundingClientRect().top;

        for (const section of sections) {
            const rect = section.getBoundingClientRect();
            // A buffer of 100px from top of container
            if (rect.top - containerTop <= 100) {
                const unitId = section.getAttribute('data-unit-section');
                const unit = unitsWithChapters.find(u => u.id === unitId);
                if (unit) {
                    currentActiveUnit = unit;
                }
            } else {
                // Since sections are in order, we can break once we find one below the threshold
                break;
            }
        }

        if (currentActiveUnit && activeUnit?.id !== currentActiveUnit.id) {
            setActiveUnit(currentActiveUnit);
        }

        // 3. Detect if we should show 'Up' or 'Down' and if active node is visible
        const activeNode = container.querySelector(`.${styles.nodeActive}`);
        if (activeNode) {
            const activeRect = activeNode.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();

            // A node is visible if it is within the vertical bounds of the container
            // adding a small buffer of 20px
            const visible = activeRect.top >= containerRect.top - 20 &&
                activeRect.bottom <= containerRect.bottom + 20;

            setIsActiveNodeVisible(visible);

            const containerCenter = containerRect.top + container.clientHeight / 2;

            // If the active node is above center or we've scrolled deep, show Up.
            // If the active node is significantly below center, show Down.
            setScrolledPastActive(activeRect.top < containerCenter - 100);
        }
    };

    const [scrolledPastActive, setScrolledPastActive] = useState(false);
    const [isActiveNodeVisible, setIsActiveNodeVisible] = useState(true);

    useEffect(() => {
        const updateLayout = () => {
            // Force 3 nodes per row but can adjust if user wants different behavior
            setNodesPerRow(3);
        };
        updateLayout();
        window.addEventListener('resize', updateLayout);
        return () => window.removeEventListener('resize', updateLayout);
    }, []);

    useEffect(() => {
        const fetchDeepContent = async () => {
            // Only show full loading if we have no data yet
            if (unitsWithChapters.length === 0) {
                setLoading(true);
            }
            try {
                const promises = [];

                // 1. Universal data for units (Doesn't depend on user)
                promises.push(supabase
                    .from('units')
                    .select('*')
                    .eq('course_id', courseId)
                    .order('order_index', { ascending: true })
                );

                // 2. User-specific data
                if (user) {
                    promises.push(supabase
                        .from('user_courses')
                        .select('course_id, courses(*)')
                        .eq('user_id', user.id)
                    );
                    promises.push(supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', user.id)
                        .single()
                    );
                    promises.push(supabase
                        .from('user_progress')
                        .select('*')
                        .eq('user_id', user.id)
                    );
                    promises.push(rewardService.getUserStreak(user.id));
                    promises.push(rewardService.getActivityHistory(user.id, 7));

                    // Update last practiced tracking in background
                    courseService.getLastPracticedCourseId(user.id).then(() => {
                        supabase.from('user_progress')
                            .select('id')
                            .eq('user_id', user.id)
                            .eq('course_id', courseId)
                            .limit(1)
                            .then(({ data: existing }) => {
                                if (existing?.length > 0) {
                                    supabase.from('user_progress')
                                        .update({ last_accessed: new Date().toISOString() })
                                        .eq('id', existing[0].id)
                                        .then(() => { });
                                }
                            });
                    });
                }

                const results = await Promise.all(promises);

                let unitsData = results[0]?.data;
                let enrolledCoursesData = results[1]?.data;
                let profileData = results[2]?.data;
                let progressData = results[3]?.data;
                let streakData = results[4];
                let streakHistoryData = results[5];

                // Set course selector data
                if (enrolledCoursesData) {
                    const enrolledCourses = enrolledCoursesData.map(d => d.courses).filter(Boolean);
                    setCourses(enrolledCourses);
                } else if (user) {
                    // Fallback
                    const { data: all } = await supabase.from('courses').select('*');
                    setCourses(all || []);
                }

                if (profileData) setProfile(profileData);
                if (progressData) setProgress(progressData);
                if (streakData) setStreak(streakData);
                if (streakHistoryData) setStreakHistory(streakHistoryData);

                // 3. Fetch chapters for the identified units
                if (unitsData && unitsData.length > 0) {
                    const unitIds = unitsData.map(u => u.id);
                    const { data: chaptersData, error: chaptersError } = await supabase
                        .from('chapters')
                        .select('*')
                        .in('unit_id', unitIds)
                        .order('order_index', { ascending: true });

                    if (chaptersError) throw chaptersError;

                    const integratedData = unitsData.map(unit => ({
                        ...unit,
                        chapters: chaptersData.filter(c => c.unit_id === unit.id)
                    }));

                    setUnitsWithChapters(integratedData);
                    setActiveUnit(integratedData[0]);
                }
            } catch (err) {
                console.error('Error fetching deep course content:', err);
            } finally {
                setLoading(false);
            }
        };

        if (courseId) {
            fetchDeepContent();
            if (checkAndRefillHearts) checkAndRefillHearts();
        }
    }, [courseId, user?.id]);

    // Auto-scroll to active node on mount/load
    useEffect(() => {
        if (!loading && unitsWithChapters.length > 0) {
            // Give a tiny delay for React to finish rendering the DOM
            const timer = setTimeout(() => {
                scrollToActive();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [loading, unitsWithChapters.length]);

    const handleChapterClick = useCallback(async (chapter, isLocked, isCompleted) => {
        if (isLocked) return;

        if (chapter.type === 'mystery_box' || chapter.type === 'heart_box' || chapter.type === 'pollen_box') {
            if (isCompleted) {
                toast.info('আপনি ইতিমধ্যে এই পুরষ্কারটি দাবি করেছেন।');
                return;
            }

            try {
                const hReward = chapter.reward_hearts || 0;
                const gReward = chapter.reward_gems || 0;

                // For legacy data support if any
                const legacyReward = chapter.reward_amount || 0;
                const finalHReward = hReward || (chapter.type === 'heart_box' ? legacyReward : 0);
                const finalGReward = gReward || (chapter.type === 'pollen_box' ? legacyReward : 0);

                // 1. Update Profile
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({
                        hearts: (profile?.hearts || 0) + finalHReward,
                        gems: (profile?.gems || 0) + finalGReward
                    })
                    .eq('id', user.id);

                if (profileError) throw profileError;

                // 2. Mark as completed in user_progress
                const { error: progressError } = await supabase
                    .from('user_progress')
                    .insert([{
                        user_id: user.id,
                        course_id: courseId,
                        chapter_id: chapter.id,
                        is_completed: true,
                        completed_at: new Date().toISOString()
                    }]);

                if (progressError) throw progressError;

                // 3. Update local state
                setProfile(prev => ({
                    ...prev,
                    hearts: (prev?.hearts || 0) + finalHReward,
                    gems: (prev?.gems || 0) + finalGReward
                }));
                setProgress(prev => [...prev, { chapter_id: chapter.id, is_completed: true }]);

                // 4. Show Gaming Modal
                setLastReward({ hearts: finalHReward, gems: finalGReward });
                setShowRewardModal(true);
            } catch (err) {
                console.error('Claim error:', err);
                toast.error('পুরষ্কার দাবি করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
            }
            return;
        }

        navigate(`/study/${courseId}/${chapter.id}`);
    }, [courseId, user, profile, navigate]);

    const allChapters = unitsWithChapters.flatMap(u => u.chapters);
    const completedChapterIds = new Set(progress.filter(p => p.is_completed).map(p => p.chapter_id));
    const firstIncompleteChapter = allChapters.find(c => !completedChapterIds.has(c.id));
    const activeChapterId = firstIncompleteChapter?.id || (allChapters.length > 0 ? allChapters[allChapters.length - 1].id : null);

    const scrollToTop = () => {
        if (mainContentRef.current) {
            mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const scrollToActive = () => {
        const activeNode = mainContentRef.current?.querySelector(`.${styles.nodeActive}`);
        if (activeNode) {
            activeNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    const UNIT_COLORS = [
        { bg: '#f1c40f', border: '#d4ac0d' }, // Honey Golden (Bee Theme)
        { bg: '#3498db', border: '#2980b9' }, // Blue
        { bg: '#9b59b6', border: '#8e44ad' }, // Purple
        { bg: '#f1c40f', border: '#f39c12' }, // Yellow
        { bg: '#e67e22', border: '#d35400' }, // Orange
        { bg: '#e74c3c', border: '#c0392b' }, // Red
    ];

    const getUnitColor = (index) => {
        const idx = (index - 1) % UNIT_COLORS.length;
        return UNIT_COLORS[idx >= 0 ? idx : 0];
    };

    const currentColor = getUnitColor(activeUnit?.order_index || 1);

    // Optimized Units Calculation moved to top level (Hook)
    const unitSections = useMemo(() => unitsWithChapters.map((unit, index) => {
        const unitChapters = unit.chapters;
        const pathD = getPathData(unitChapters, nodesPerRow);
        const numRows = Math.ceil(unitChapters.length / nodesPerRow);

        // Dynamic height
        const width = window.innerWidth;
        const ySpacing = width < 480 ? 130 : (width < 768 ? 140 : 160);
        const containerHeight = (numRows - 1) * ySpacing + 120;

        const windowWidth = window.innerWidth;
        const isMobile = windowWidth <= 768;
        const svgWidth = isMobile ? windowWidth : 640;

        const isSeparator = index > 0;

        return (
            <React.Fragment key={unit.id}>
                {isSeparator && (
                    <div className={styles.unitSeparator}>
                        <div className={styles.separatorLine} />
                        <div
                            className={styles.separatorText}
                            style={{ color: getUnitColor(unit.order_index).border }}
                        >
                            {unit.title}
                        </div>
                        <div className={styles.separatorLine} />
                    </div>
                )}
                <section
                    data-unit-section={unit.id}
                    className={styles.unitSection}
                    style={{
                        '--unit-color-bg': getUnitColor(unit.order_index).bg,
                        '--unit-color-border': getUnitColor(unit.order_index).border
                    }}
                >
                    <div className={styles.pathContainer} style={{ height: `${containerHeight}px` }}>

                        <svg className={styles.connectingPath} viewBox={`0 0 ${svgWidth} ${containerHeight}`} preserveAspectRatio="xMinYMin meet">
                            <path d={pathD} className={styles.pathLine} />
                        </svg>


                        {unitChapters.map((chapter, cIdx) => {
                            const pos = getNodePos(cIdx, nodesPerRow);
                            const isCompleted = completedChapterIds.has(chapter.id);
                            const isActive = chapter.id === activeChapterId;
                            const isLocked = !isCompleted && !isActive && allChapters.findIndex(c => c.id === chapter.id) > allChapters.findIndex(c => c.id === activeChapterId);

                            return (
                                <ChapterNode
                                    key={chapter.id}
                                    chapter={chapter}
                                    pos={pos}
                                    isCompleted={isCompleted}
                                    isActive={isActive}
                                    isLocked={isLocked}
                                    iconIdx={cIdx}
                                    onClick={() => handleChapterClick(chapter, isLocked, isCompleted)}
                                    isDark={isDark}
                                />
                            );
                        })}
                    </div>
                </section>
            </React.Fragment>
        );
    }), [unitsWithChapters, completedChapterIds, activeChapterId, nodesPerRow, allChapters, handleChapterClick]);

    const refreshProfile = useCallback(async () => {
        if (!user) return;
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) setProfile(data);
    }, [user]);

    // Compute last 7 days for the streak tooltip
    const last7DaysStreak = useMemo(() => {
        const days = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            const isCompleted = streakHistory.some(h => h.activity_date === dateStr);
            days.push({
                date: dateStr,
                dayName: d.toLocaleDateString('bn-BD', { weekday: 'short' }),
                completed: isCompleted
            });
        }
        return days;
    }, [streakHistory]);

    return (

        <div className={styles.learningPage}>
            <main className={styles.mainContent} ref={mainContentRef} onScroll={handleScroll}>
                {/* Robust Mobile Header Toggle Bar */}
                {!loading && unitsWithChapters.length > 0 && (
                    <div
                        className={cn(
                            styles.unitHeader,
                            scrolled && styles.unitHeaderScrolled,
                            styles.mobileHeaderFixed
                        )}
                        style={{
                            '--unit-bg': currentColor.bg,
                            '--unit-border': currentColor.border
                        }}
                    >
                        {/* Top: Mobile Stats & Course Switcher (Stacked) */}
                        <div className={styles.mobileHeaderBar}>

                            <div className={styles.mobileMainHeaderArea}>
                                <div className={styles.mobileHeaderStats}>
                                    <div className={styles.mobileHeaderStatWrapper}>
                                        <div className={styles.mobileHeaderStat} onClick={() => setShowStreakTooltip(true)} style={{ cursor: 'pointer' }}>
                                            <Flame size={24} color="#f1c40f" fill="#f1c40f" />
                                            <span>{streak?.current_streak || 0}</span>
                                        </div>

                                        {showStreakTooltip && (
                                            <>
                                                <div className={styles.streakTooltipOverlay} onClick={() => setShowStreakTooltip(false)} />
                                                <div className={styles.streakTooltipBox}>
                                                    <div className={styles.streakTooltipHeader}>
                                                        <Flame size={24} color="#f1c40f" fill="#f1c40f" />
                                                        <div className={styles.streakInfoLeft}>
                                                            <h4 style={{ margin: 0 }}>{streak?.current_streak || 0} দিনের ধারাবাহিকতা</h4>
                                                        </div>
                                                    </div>

                                                    <div className={styles.streakSevenDaysRow}>
                                                        {last7DaysStreak.map((day, idx) => (
                                                            <div key={idx} className={styles.streakDayItem}>
                                                                <div className={styles.streakDayName}>{day.dayName}</div>
                                                                <div className={day.completed ? styles.streakDayCircleActive : styles.streakDayCircle}>
                                                                    {day.completed ? <Check size={14} strokeWidth={4} color="#f1c40f" /> : null}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <button
                                                        className={styles.shopButton}
                                                        style={{ background: '#2d383e', color: '#fff', borderBottom: '3px solid #1a1f22', width: '100%', marginTop: '16px' }}
                                                        onClick={() => { setShowStreakTooltip(false); navigate('/streak'); }}
                                                    >
                                                        <span>বিস্তারিত দেখুন</span>
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className={styles.mobileHeaderStatWrapper}>
                                        <div className={styles.mobileHeaderStat} onClick={() => setShowXpTooltip(true)} style={{ cursor: 'pointer' }}>
                                            <ShieldIcon xp={profile?.xp || 0} size={24} showShadow={false} />
                                            <span>{profile?.xp || 0}</span>
                                        </div>

                                        {showXpTooltip && (
                                            <>
                                                <div className={styles.streakTooltipOverlay} onClick={() => setShowXpTooltip(false)} />
                                                <div className={styles.streakTooltipBoxCenter}>
                                                    <div className={styles.streakTooltipHeader}>
                                                        <div className={styles.streakInfoLeft}>
                                                            <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <ShieldIcon xp={profile?.xp || 0} size={24} /> মধু সংগৃহীত &nbsp; {profile?.xp || 0}
                                                            </h4>
                                                            <p>দৈনিক অনুশীলন করে মধু সংগ্রহ করুন এবং লিডারবোর্ডে এগিয়ে থাকুন!</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        className={styles.shopButton}
                                                        style={{ background: '#2d383e', color: '#fff', borderBottom: '3px solid #1a1f22', width: '100%' }}
                                                        onClick={() => { setShowXpTooltip(false); navigate('/leaderboard'); }}
                                                    >
                                                        <span>লিডারবোর্ড দেখুন</span>
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className={styles.mobileHeaderStatWrapper}>
                                        <div className={styles.mobileHeaderStat} onClick={() => setShowPollenTooltip(true)} style={{ cursor: 'pointer' }}>
                                            <PollenIcon size={24} />
                                            <span>{profile?.gems || 0}</span>
                                        </div>

                                        {showPollenTooltip && (
                                            <>
                                                <div className={styles.streakTooltipOverlay} onClick={() => setShowPollenTooltip(false)} />
                                                <div className={styles.streakTooltipBoxRight}>
                                                    <div className={styles.streakTooltipHeader}>
                                                        <div className={styles.streakInfoLeft}>
                                                            <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <PollenIcon size={24} /> মধুরেণু &nbsp; {profile?.gems || 0}
                                                            </h4>
                                                            <p>দৈনিক এক্টিভিটি এবং স্ট্রিক বজায় রেখে রেণু সংগ্রহ করুন!</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className={styles.mobileHeaderStatWrapper}>
                                        <div className={styles.mobileHeaderStat} onClick={() => setShowHeartsTooltip(true)} style={{ cursor: 'pointer' }}>
                                            <HoneyDropIcon size={24} isEmpty={refillHearts === 0 && refillTimeDisplay} />
                                            <span>
                                                {(profile?.is_premium || profile?.is_1day_premium) ? (
                                                    <InfinityIcon size={24} strokeWidth={3} stroke="#f1c40f" />
                                                ) : refillHearts}
                                            </span>
                                        </div>

                                        {showHeartsTooltip && (
                                            <>
                                                <div className={styles.heartsTooltipOverlay} onClick={() => setShowHeartsTooltip(false)} />
                                                <div className={styles.heartsTooltipBox}>
                                                    {(profile?.is_premium || profile?.is_1day_premium) ? (
                                                        <div className={styles.tooltipSubscriber}>
                                                            <div className={styles.tooltipNonSubscriber}>
                                                                <div className={styles.upsellSection} style={{ borderBottom: 'none', paddingBottom: 0 }}>
                                                                    <Crown size={24} color="#f1c40f" />
                                                                    <div className={styles.tooltipTextContent}>
                                                                        <h4>{(profile?.gender === 'female' || profile?.gender === 'নারী') ? 'কুইন বী সক্রিয় আছে' : 'কিং বী সক্রিয় আছে'}</h4>
                                                                        {profile?.premium_until ? (
                                                                            <p>মেয়াদ শেষ হবে: {new Date(profile.premium_until).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                                                        ) : (
                                                                            <p>আনলিমিটেড মধু ফোঁটা</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className={styles.tooltipNonSubscriber}>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                <button
                                                                    className={styles.shopButton}
                                                                    style={{ background: 'linear-gradient(135deg, #FFD700 0%, #F1A20F 100%)', borderBottom: '3px solid #d48e00' }}
                                                                    onClick={() => { setShowHeartsTooltip(false); navigate('/shop', { state: { directCheckout: 'monthly' } }); }}
                                                                >
                                                                    <Crown size={16} />
                                                                    <span>{(profile?.gender === 'female' || profile?.gender === 'নারী') ? 'কুইন বী সক্রিয় করুন' : 'কিং বী সক্রিয় করুন'}</span>
                                                                </button>

                                                                <button
                                                                    className={styles.shopButton}
                                                                    style={{ background: '#2d383e', color: '#fff', borderBottom: '3px solid #1a1f22' }}
                                                                    onClick={() => { setShowHeartsTooltip(false); navigate('/shop'); }}
                                                                >
                                                                    <ShoppingBag size={16} />
                                                                    <span>শপে যান</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* Bottom: Unit Title & Description (Stacked) */}
                        <div className={styles.unitHeaderInner}>
                            <div className={styles.unitInfo}>
                                <h2 className={styles.mobileUnitTitle}>
                                    {activeUnit?.title || 'লোড হচ্ছে...'}
                                </h2>
                            </div>
                        </div>
                    </div>
                )}
                {loading ? (
                    <div className="flex items-center justify-center h-full w-full">
                        <InlineLoader />
                    </div>
                ) : (
                    <>
                        <div className={styles.mobileHeaderSpacer} />
                        {unitSections}

                        {/* Single Dynamic Floating Navigation Button - Hidden when active node is visible */}
                        {!isActiveNodeVisible && (
                            <div className={styles.scrollNav}>
                                <button
                                    className={`${styles.scrollBtn} ${styles.scrollBtnPrimary}`}
                                    onClick={scrollToActive}
                                    title="বর্তমান পাঠে যান"
                                >
                                    {scrolledPastActive ? <ArrowUp size={28} /> : <ArrowDown size={28} />}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </main>

            <StatsSidebar
                profile={profile}
                refreshProfile={refreshProfile}
                hearts={refillHearts}
                refillTime={refillTimeDisplay}
                courses={courses}
                currentCourseId={courseId}
            />

            <RewardModal
                isOpen={showRewardModal}
                onClose={() => setShowRewardModal(false)}
                hearts={lastReward.hearts}
                gems={lastReward.gems}
            />
        </div >
    );
};

export default LearningPage;
