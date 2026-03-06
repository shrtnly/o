import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, Star, Lock, Play, PenTool, Globe, Activity, Sparkles, Gift, PackageOpen, ArrowUp, ArrowDown, Send, Shapes, ChartPie, Command, Lightbulb, Timer, Settings2, Rocket, MousePointerClick, Layers2, Anchor } from 'lucide-react';


import { supabase } from '../../lib/supabaseClient';
import styles from './LearningPage.module.css';
import LoadingScreen from '../../components/ui/LoadingScreen';
import InlineLoader from '../../components/ui/InlineLoader';
import HoneyDropIcon from '../../components/HoneyDropIcon';
import PollenIcon from '../../components/PollenIcon';
import Sidebar from './components/Sidebar';
import StatsSidebar from './components/StatsSidebar';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import RewardModal from './components/RewardModal';
import { useHeartRefill } from '../../hooks/useHeartRefill';
import { courseService } from '../../services/courseService';


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
const ChapterNode = React.memo(({ chapter, pos, isCompleted, isActive, isLocked, iconIdx, onClick }) => {
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
                                    return <PackageOpen size={24} color="rgba(255, 215, 0, 0.6)" strokeWidth={2.5} />;
                                }
                                return <Gift size={24} color="#ffd700" strokeWidth={2.5} />;
                            }
                            const IconComponent = CHAPTER_ICONS[iconIdx % CHAPTER_ICONS.length];
                            return (
                                <IconComponent
                                    size={24}
                                    color={isActive || isCompleted ? "var(--unit-color-bg)" : "rgba(255, 255, 255, 0.45)"}
                                    strokeWidth={2}
                                />
                            );
                        })()}
                    </div>
                    {isLocked && (
                        <div className={styles.lockIconBadge}>
                            <Lock size={12} fill="rgba(255, 255, 255, 0.4)" stroke="none" />
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
    const [unitsWithChapters, setUnitsWithChapters] = useState([]);
    const [profile, setProfile] = useState(null);
    const [progress, setProgress] = useState([]);
    const [courses, setCourses] = useState([]); // Added to store all enrolled courses
    const [loading, setLoading] = useState(true);
    const [activeUnit, setActiveUnit] = useState(null);
    const [nodesPerRow, setNodesPerRow] = useState(3);
    const location = useLocation();

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

    return (
        <div className={styles.learningPage}>
            <main className={styles.mainContent} ref={mainContentRef} onScroll={handleScroll}>
                {loading ? (
                    <div className="flex items-center justify-center h-full w-full">
                        <InlineLoader />
                    </div>
                ) : (
                    <>
                        {/* Single Unit Header at the Top */}
                        {unitsWithChapters.length > 0 && (
                            <div
                                className={`${styles.unitHeader} ${scrolled ? styles.unitHeaderScrolled : ''}`}
                                style={{
                                    '--unit-bg': currentColor.bg,
                                    '--unit-border': currentColor.border
                                }}
                            >
                                <div className={styles.unitHeaderInner}>
                                    <div className={styles.unitInfo}>
                                        <h2>
                                            {activeUnit?.title || 'লোড হচ্ছে...'}
                                        </h2>
                                    </div>

                                    {/* Mobile Stats Header */}
                                    <div className={styles.mobileStats}>
                                        <div className={styles.mobileStatItem} title="মধু ফোঁটা">
                                            <HoneyDropIcon size={20} isEmpty={refillHearts === 0 && refillTimeDisplay} />
                                            <span>{profile?.is_premium ? '∞' : refillHearts}</span>
                                        </div>
                                        <div className={styles.mobileStatItem} title="পরাগরেণু">
                                            <PollenIcon size={20} />
                                            <span>{profile?.gems || 0}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

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
        </div>
    );
};

export default LearningPage;
