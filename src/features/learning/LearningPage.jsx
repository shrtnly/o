import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, Star, Lock, Trophy, Check, Play, PenTool, Music, Globe, Activity, Cpu, Tv, Headphones, Camera, Sparkles, Gem, Gift, PackageOpen } from 'lucide-react';


import { supabase } from '../../lib/supabaseClient';
import styles from './LearningPage.module.css';
import LoadingScreen from '../../components/ui/LoadingScreen';
import InlineLoader from '../../components/ui/InlineLoader';
import Sidebar from './components/Sidebar';
import StatsSidebar from './components/StatsSidebar';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import RewardModal from './components/RewardModal';
import { useHeartRefill } from '../../hooks/useHeartRefill';


// Helper for node positioning (Snake pattern: Always 3 nodes per row with scaling)
const getNodePos = (i, nodesPerRow) => {
    // Basic spacings
    let xSpacing = 160;
    let ySpacing = 160;

    // Scale spacing based on screen size (handled via window width in state)
    const windowWidth = window.innerWidth;
    if (windowWidth < 480) {
        xSpacing = 90;
        ySpacing = 130;
    } else if (windowWidth < 768) {
        xSpacing = 120;
        ySpacing = 140;
    }

    const row = Math.floor(i / nodesPerRow);
    const col = i % nodesPerRow;
    const isEvenRow = row % 2 === 0;
    const xCol = isEvenRow ? col : (nodesPerRow - 1 - col);

    const centerX = 320;
    const startY = 50;

    const offsetFactor = (nodesPerRow - 1) / 2;
    return {
        x: centerX + (xCol - offsetFactor) * xSpacing,
        y: startY + row * ySpacing
    };
};

const getPathData = (chapters, nodesPerRow) => {
    if (chapters.length < 2) return '';
    let d = '';

    // Scale curve tension
    const windowWidth = window.innerWidth;
    const curveTension = windowWidth < 480 ? 60 : (windowWidth < 768 ? 80 : 100);

    for (let i = 0; i < chapters.length; i++) {
        const pos = getNodePos(i, nodesPerRow);
        if (i === 0) {
            d = `M ${pos.x},${pos.y}`;
        } else {
            const prevPos = getNodePos(i - 1, nodesPerRow);
            if (prevPos.y === pos.y) {
                // Same row: Horizontal line
                d += ` L ${pos.x},${pos.y}`;
            } else {
                // Next row: S-curve at the edge
                const cpX = prevPos.x > 320 ? prevPos.x + curveTension : prevPos.x - curveTension;
                d += ` C ${cpX},${prevPos.y} ${cpX},${pos.y} ${pos.x},${pos.y}`;
            }
        }
    }
    return d;
};

// Pool of icons for chapters
const CHAPTER_ICONS = [BookOpen, PenTool, Play, Star, Music, Globe, Activity, Cpu, Tv, Headphones, Camera, Sparkles];

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

        // 2. Detect the active unit section
        // We find the section that has currently passed the "header zone"
        const sections = container.querySelectorAll('[data-unit-section]');
        let currentActiveUnit = unitsWithChapters[0]; // Default to first unit

        sections.forEach((section) => {
            const rect = section.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const relativeTop = rect.top - containerRect.top;

            // If the section top is above or at the header (with a small 80px buffer)
            if (relativeTop <= 80) {
                const unitId = section.getAttribute('data-unit-section');
                const unit = unitsWithChapters.find(u => u.id === unitId);
                if (unit) {
                    currentActiveUnit = unit;
                }
            }
        });

        if (currentActiveUnit && activeUnit?.id !== currentActiveUnit.id) {
            setActiveUnit(currentActiveUnit);
        }
    };

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
            setLoading(true);
            try {
                if (user) {
                    // Fetch only enrolled courses for the selector
                    const { data: enrolledData, error: enrolledError } = await supabase
                        .from('user_courses')
                        .select('course_id, courses(*)')
                        .eq('user_id', user.id);

                    if (enrolledError) {
                        console.error('Error fetching enrolled courses:', enrolledError);
                        // Fallback to all courses if user_courses doesn't exist yet (for development)
                        const { data: allCourses } = await supabase.from('courses').select('*');
                        setCourses(allCourses || []);
                    } else {
                        const enrolledCourses = enrolledData?.map(d => d.courses).filter(Boolean) || [];
                        setCourses(enrolledCourses);
                    }

                    const { data: profileData } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', user.id)
                        .single();

                    setProfile(profileData);

                    // Update last_accessed for this course
                    if (courseId) {
                        const { data: existingProgress } = await supabase
                            .from('user_progress')
                            .select('id')
                            .eq('user_id', user.id)
                            .eq('course_id', courseId)
                            .limit(1);

                        if (existingProgress && existingProgress.length > 0) {
                            await supabase
                                .from('user_progress')
                                .update({ last_accessed: new Date().toISOString() })
                                .eq('id', existingProgress[0].id);
                        }
                    }

                    const { data: progressData } = await supabase
                        .from('user_progress')
                        .select('*')
                        .eq('user_id', user.id);
                    setProgress(progressData || []);
                }

                const { data: unitsData, error: unitsError } = await supabase
                    .from('units')
                    .select('*')
                    .eq('course_id', courseId)
                    .order('order_index', { ascending: true });

                if (unitsError) throw unitsError;

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
    }, [courseId, user, location.key]);

    const handleChapterClick = async (chapter, isLocked, isCompleted) => {
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
    };

    const allChapters = unitsWithChapters.flatMap(u => u.chapters);
    const completedChapterIds = new Set(progress.filter(p => p.is_completed).map(p => p.chapter_id));
    const firstIncompleteChapter = allChapters.find(c => !completedChapterIds.has(c.id));
    const activeChapterId = firstIncompleteChapter?.id || (allChapters.length > 0 ? allChapters[allChapters.length - 1].id : null);

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
                                <div className={styles.unitInfo}>
                                    <h2 key={`unit-header-${activeUnit?.id}`}>
                                        {activeUnit?.title || 'লোড হচ্ছে...'}
                                    </h2>
                                </div>
                            </div>
                        )}

                        {unitsWithChapters.map((unit, index) => {
                            const unitChapters = unit.chapters;
                            const pathD = getPathData(unitChapters, nodesPerRow);
                            const numRows = Math.ceil(unitChapters.length / nodesPerRow);

                            // Dynamic height based on row count and device ySpacing
                            const width = window.innerWidth;
                            const ySpacing = width < 480 ? 130 : (width < 768 ? 140 : 160);
                            const containerHeight = (numRows - 1) * ySpacing + 120;

                            const isSeparator = index > 0; // Hide for Unit 1, show for others

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

                                            <svg className={styles.connectingPath} viewBox={`0 0 640 ${containerHeight}`} preserveAspectRatio="xMinYMin meet">
                                                <path d={pathD} className={styles.pathLine} />
                                            </svg>


                                            {unitChapters.map((chapter, cIdx) => {
                                                const pos = getNodePos(cIdx, nodesPerRow);
                                                const isCompleted = completedChapterIds.has(chapter.id);
                                                const isActive = chapter.id === activeChapterId;
                                                const isLocked = !isCompleted && !isActive && allChapters.findIndex(c => c.id === chapter.id) > allChapters.findIndex(c => c.id === activeChapterId);

                                                return (
                                                    <div
                                                        key={chapter.id}
                                                        className={styles.nodeWrapper}
                                                        style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                                                        onClick={() => handleChapterClick(chapter, isLocked, isCompleted)}
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
                                                                    {isLocked && chapter.type === 'lesson' ? (
                                                                        <div className={styles.lockOverlay}>
                                                                            <Lock size={32} color="#4b4b4b" fill="#4b4b4b" />
                                                                        </div>
                                                                    ) : (
                                                                        <>
                                                                            {chapter.type !== 'lesson' && !isLocked && !isCompleted && [1, 2, 3, 4, 5].map(i => (
                                                                                <div
                                                                                    key={i}
                                                                                    className={styles.sparkle}
                                                                                    style={{
                                                                                        '--tx': Math.random() * 60 - 30,
                                                                                        '--ty': Math.random() * 60 - 30,
                                                                                        left: '50%',
                                                                                        top: '50%',
                                                                                        animationDelay: `${i * 0.3}s`
                                                                                    }}
                                                                                />
                                                                            ))}
                                                                            {(() => {
                                                                                if (chapter.type === 'mystery_box' || chapter.type === 'heart_box' || chapter.type === 'pollen_box') {
                                                                                    if (isCompleted) {
                                                                                        return <PackageOpen size={36} color="#ffd700" fill="#ffd700" strokeWidth={3} opacity={0.7} />;
                                                                                    }
                                                                                    return <Gift size={36} color="#ffd700" fill="none" strokeWidth={3} />;
                                                                                }
                                                                                const IconComponent = CHAPTER_ICONS[cIdx % CHAPTER_ICONS.length];
                                                                                return (
                                                                                    <IconComponent
                                                                                        size={32}
                                                                                        color={isActive || isCompleted ? "var(--unit-color-bg)" : "#afafaf"}
                                                                                        strokeWidth={2.5}
                                                                                    />
                                                                                );
                                                                            })()}
                                                                        </>
                                                                    )}

                                                                </div>
                                                            </div>

                                                            <div className={styles.nodeLabel}>{chapter.title}</div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </section>
                                </React.Fragment>
                            );
                        })}
                    </>
                )}
            </main>


            <StatsSidebar
                profile={profile}
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
