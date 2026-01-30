import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BookOpen, Star, Lock, Trophy, Check, Play, PenTool, Music, Globe, Activity, Cpu, Tv, Headphones, Camera, Sparkles } from 'lucide-react';


import { supabase } from '../../lib/supabaseClient';
import styles from './LearningPage.module.css';
import Sidebar from './components/Sidebar';
import StatsSidebar from './components/StatsSidebar';
import { useAuth } from '../../context/AuthContext';


// Helper for SVG path
const getPathData = (chapters, offsets) => {
    if (chapters.length < 2) return '';
    const nodeYStep = 180;
    const startY = 50;
    const centerX = 320;
    let d = `M ${centerX + offsets[0]},${startY}`;
    for (let i = 1; i < chapters.length; i++) {
        const prevX = centerX + offsets[i - 1];
        const prevY = (i - 1) * nodeYStep + startY;
        const currX = centerX + offsets[i];
        const currY = i * nodeYStep + startY;
        const midY = (prevY + currY) / 2;
        d += ` C ${prevX},${midY} ${currX},${midY} ${currX},${currY}`;
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

    const [scrolled, setScrolled] = useState(false);
    const mainContentRef = useRef(null);

    const handleScroll = () => {
        if (mainContentRef.current) {
            const isScrolled = mainContentRef.current.scrollTop > 10;
            if (isScrolled !== scrolled) {
                setScrolled(isScrolled);
            }
        }
    };

    useEffect(() => {
        const fetchDeepContent = async () => {
            setLoading(true);
            try {
                if (user) {
                    // Fetch all courses for the selector
                    const { data: coursesData } = await supabase
                        .from('courses')
                        .select('*');
                    setCourses(coursesData || []);

                    const { data: profileData } = await supabase

                        .from('profiles')
                        .select('*')
                        .eq('id', user.id)
                        .single();
                    setProfile(profileData);

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
        }
    }, [courseId, user]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                // Find all intersecting entries
                const intersecting = entries
                    .filter(entry => entry.isIntersecting)
                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio); // Potentially useful but let's simplify

                // We want the section that is currently crossing the "decision line"
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const unitId = entry.target.getAttribute('data-unit-section');
                        const unit = unitsWithChapters.find(u => u.id === unitId);
                        // Only update if it's different and we are intersecting the top area
                        if (unit && activeUnit?.id !== unit.id) {
                            setActiveUnit(unit);
                        }
                    }
                });
            },
            {
                threshold: [0, 0.1],
                rootMargin: "-120px 0px -80% 0px" // Focus on a band near the sticky header
            }
        );

        const sections = document.querySelectorAll(`[data-unit-section]`);
        sections.forEach(s => observer.observe(s));

        return () => observer.disconnect();
    }, [unitsWithChapters]);

    const handleChapterClick = (chapterId, isLocked) => {
        if (isLocked) return;
        navigate(`/study/${courseId}/${chapterId}`);
    };

    if (loading) return (
        <div className={styles.learningPage} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <h2 style={{ color: '#fff' }}>পড়া লোড হচ্ছে...</h2>
        </div>
    );

    const allChapters = unitsWithChapters.flatMap(u => u.chapters);
    const completedChapterIds = new Set(progress.filter(p => p.is_completed).map(p => p.chapter_id));
    const firstIncompleteChapter = allChapters.find(c => !completedChapterIds.has(c.id));
    const activeChapterId = firstIncompleteChapter?.id || (allChapters.length > 0 ? allChapters[allChapters.length - 1].id : null);

    const UNIT_COLORS = [
        { bg: '#58cc02', border: '#46a302' }, // Green
        { bg: '#1cb0f6', border: '#1899d6' }, // Blue
        { bg: '#ce82ff', border: '#af69e3' }, // Purple
        { bg: '#ff9600', border: '#e58600' }, // Orange
        { bg: '#ff4b4b', border: '#d33131' }, // Red
    ];

    const getUnitColor = (index) => {
        return UNIT_COLORS[(index - 1) % UNIT_COLORS.length];
    };

    const currentColor = getUnitColor(activeUnit?.order_index || 1);

    return (
        <div className={styles.learningPage}>
            <Sidebar />

            <main className={styles.mainContent} ref={mainContentRef} onScroll={handleScroll}>
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
                            <h3 key={`idx-${activeUnit?.id}`}>ইউনিট {activeUnit?.order_index || 1}</h3>
                            <h2 key={`title-${activeUnit?.id}`}>{activeUnit?.title || 'লোড হচ্ছে...'}</h2>
                        </div>
                        <button className={styles.guideBtn}>
                            <BookOpen size={18} />
                            গাইডবুক
                        </button>
                    </div>
                )}

                {unitsWithChapters.map((unit, index) => {
                    const unitChapters = unit.chapters;
                    const offsetPattern = [0, -100, 100, 0, -100, 100];

                    // Create an extended list including the trophy node for path calculation
                    const chaptersForPath = [...unitChapters, { id: 'trophy' }];
                    const offsets = chaptersForPath.map((_, i) =>
                        i === chaptersForPath.length - 1 ? 0 : offsetPattern[i % offsetPattern.length]
                    );

                    const pathD = getPathData(chaptersForPath, offsets);

                    return (
                        <section
                            key={unit.id}
                            data-unit-section={unit.id}
                            className={styles.unitSection}
                            style={{
                                '--unit-color-bg': getUnitColor(unit.order_index).bg,
                                '--unit-color-border': getUnitColor(unit.order_index).border
                            }}
                        >
                            <div className={styles.pathContainer}>

                                <svg className={styles.connectingPath} viewBox="0 0 640 1200" preserveAspectRatio="xMinYMin meet">
                                    <path d={pathD} className={styles.pathLine} />
                                </svg>


                                {unitChapters.map((chapter, cIdx) => {
                                    const offset = offsets[cIdx];
                                    const isCompleted = completedChapterIds.has(chapter.id);
                                    const isActive = chapter.id === activeChapterId;
                                    const isLocked = !isCompleted && !isActive && allChapters.findIndex(c => c.id === chapter.id) > allChapters.findIndex(c => c.id === activeChapterId);
                                    const hueRotate = (cIdx * 70) % 360;

                                    return (
                                        <div
                                            key={chapter.id}
                                            className={styles.nodeWrapper}
                                            style={{ transform: `translateX(${offset}px)` }}
                                            onClick={() => handleChapterClick(chapter.id, isLocked)}
                                        >
                                            <div className={`${styles.node} ${isActive ? styles.nodeActive : ''} ${isCompleted ? styles.nodeCompleted : ''} ${isLocked ? styles.nodeLocked : ''}`}>
                                                <div className={styles.nodeRing}>
                                                    <div className={styles.nodeInner}>
                                                        {isLocked ? (
                                                            <div className={styles.lockOverlay}>
                                                                <Lock size={32} color="#4b4b4b" fill="#4b4b4b" />
                                                            </div>
                                                        ) : (
                                                            (() => {
                                                                const IconComponent = CHAPTER_ICONS[cIdx % CHAPTER_ICONS.length];
                                                                return (
                                                                    <IconComponent
                                                                        size={42}
                                                                        color={isActive || isCompleted ? "var(--unit-color-bg)" : "#afafaf"}
                                                                        strokeWidth={2.5}
                                                                    />

                                                                );
                                                            })()
                                                        )}

                                                    </div>
                                                </div>
                                                {isActive && <div className={styles.speechBubble}>শুরু করুন</div>}
                                                <div className={styles.nodeLabel}>{chapter.title}</div>
                                            </div>
                                        </div>
                                    );
                                })}

                                <div className={styles.nodeWrapper} style={{ transform: 'translateX(0)' }}>
                                    <div className={`${styles.node} ${styles.trophyNode}`}>
                                        <div className={styles.nodeRing}>
                                            <div className={styles.nodeInner}>
                                                <Trophy size={40} color="#ffc800" fill="#ffc800" />
                                            </div>
                                        </div>
                                        <div className={styles.nodeLabel}>সমাপ্তি</div>
                                    </div>
                                </div>
                            </div>

                            {index < unitsWithChapters.length - 1 && (
                                <div className={styles.unitSeparator}>
                                    <div className={styles.separatorLine}></div>
                                    <div className={styles.separatorText}>{unitsWithChapters[index + 1].title}</div>
                                    <div className={styles.separatorLine}></div>
                                </div>
                            )}
                        </section>
                    );
                })}

            </main>


            <StatsSidebar
                profile={profile}
                courses={courses}
                currentCourseId={courseId}
            />

        </div>
    );
};

export default LearningPage;
