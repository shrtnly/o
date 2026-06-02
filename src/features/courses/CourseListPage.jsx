import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Info, LayoutGrid, List as ListIcon, TrendingUp, Star, X, WifiOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { courseService } from '../../services/courseService';
import CourseCard from '../landing/CourseCard';
import CourseSkeleton from '../landing/CourseSkeleton';
import styles from './CourseListPage.module.css';
import { useLanguage } from '../../context/LanguageContext';

const getCategories = (t) => [
    { id: 'All', name: t('all_courses') },
    { id: 'Digital Literacy & Security', name: t('cat_digital_security_literacy') },
    { id: 'Legal Awareness & Citizen Rights', name: t('cat_legal_rights') },
    { id: 'Financial Awareness & Smart Banking', name: t('cat_finance_banking') },
    { id: 'Career & Skills', name: t('cat_career_skills') },
    { id: 'Mental Health & Self-Development', name: t('cat_mental_health') }
];

const CourseListPage = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [courses, setCourses] = useState([]);
    const [enrolledCourseIds, setEnrolledCourseIds] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [activeCategory, setActiveCategory] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewType, setViewType] = useState('grid'); // 'grid' or 'list'
    const [sortBy, setSortBy] = useState('popularity'); // 'popularity' or 'rating'
    const navigate = useNavigate();

    const baseCategories = getCategories(t);
    const categories = [
        ...(enrolledCourseIds.size > 0 ? [{ id: 'My Courses', name: t('my_courses') }] : []),
        baseCategories[0], // All Courses
        ...baseCategories.slice(1)
    ];

    useEffect(() => {
        let isMounted = true;
        
        const timeout = (ms, defaultValue = null) => 
            new Promise(resolve => setTimeout(() => {
                console.log(`CourseListPage: query timeout of ${ms}ms reached, returning fallback`);
                resolve(defaultValue);
            }, ms));

        const fetchData = async () => {
            console.log("CourseListPage: fetchData started");
            setError(null);
            try {
                // Fetch basic course data first to show something immediately if possible
                console.log("CourseListPage: calling getAllCourses...");
                const allCourses = await Promise.race([
                    courseService.getAllCourses(),
                    timeout(6000, [])
                ]);
                console.log("CourseListPage: getAllCourses returned", allCourses?.length, "courses");
                
                if (!isMounted) {
                    console.log("CourseListPage: isMounted is false, aborting");
                    return;
                }

                // Then fetch optional stats and enrollment
                console.log("CourseListPage: fetching enrollment and bulk stats...");
                const [enrolledData, bulkStats] = await Promise.race([
                    Promise.all([
                        user ? supabase.from('user_courses').select('course_id').eq('user_id', user.id).then(r => r).catch((e) => { console.error("user_courses fetch failed:", e); return null; }) : Promise.resolve({ data: [] }),
                        courseService.getBulkCourseStats().catch((e) => { console.error("getBulkCourseStats failed:", e); return {}; })
                    ]),
                    timeout(6000, [{ data: [] }, {}])
                ]);
                console.log("CourseListPage: enrollment and bulk stats done", { enrolledCount: enrolledData?.data?.length, hasBulkStats: !!bulkStats });

                if (!isMounted) {
                    console.log("CourseListPage: isMounted is false after Promise.all, aborting");
                    return;
                }

                // Merge live stats into course data
                const updatedCourses = (allCourses || []).map(course => ({
                    ...course,
                    students_count: bulkStats[course.id]?.count || course.students_count || 0,
                    rating: bulkStats[course.id]?.rating || course.rating || 0
                }));

                setCourses(updatedCourses);
                if (enrolledData?.data && enrolledData.data.length > 0) {
                    const enrolledIds = new Set(enrolledData.data.map(d => d.course_id));
                    setEnrolledCourseIds(enrolledIds);
                    setActiveCategory('My Courses');
                } else {
                    setActiveCategory('All');
                }
            } catch (err) {
                if (isMounted) {
                    console.error('Error fetching course data in CourseListPage catch:', err);
                    setError(true);
                }
            } finally {
                if (isMounted) {
                    console.log("CourseListPage: setting loading to false");
                    setLoading(false);
                }
            }
        };
        fetchData();
        return () => {
            isMounted = false;
        };
    }, [user?.id, retryCount]);

    // Compute filtered and sorted courses
    const filteredCourses = courses.filter(course => {
        const isEnrolled = enrolledCourseIds.has(course.id);
        
        // Category filtering
        let matchesCategory = false;
        if (activeCategory === 'All') {
            matchesCategory = true;
        } else if (activeCategory === 'My Courses') {
            matchesCategory = isEnrolled;
        } else {
            matchesCategory = course.category === activeCategory;
        }

        const matchesSearch = !searchQuery.trim() || 
            (course.title && course.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (course.title_en && course.title_en.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (course.category && course.category.toLowerCase().includes(searchQuery.toLowerCase()));
        
        return matchesCategory && matchesSearch;
    }).sort((a, b) => {
        // Always prioritize featured courses
        if (a.is_featured && !b.is_featured) return -1;
        if (!a.is_featured && b.is_featured) return 1;

        if (sortBy === 'rating') {
            return (b.rating || 0) - (a.rating || 0);
        } else if (sortBy === 'popularity') {
            return (b.students_count || 0) - (a.students_count || 0);
        }
        return 0; // Maintain default order
    });

    return (
        <div className={styles.pageWrapper}>
            <div className={styles.mainContainer}>
                <div className={styles.container}>
                    {loading ? (
                        <div className={styles.loadingState}>
                            <div className={styles.skeletonHeader} />
                            <div className={styles.grid}>
                                {[...Array(6)].map((_, i) => (
                                    <CourseSkeleton key={i} />
                                ))}
                            </div>
                        </div>
                    ) : error ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon} style={{ color: 'var(--color-danger)' }}>
                                <WifiOff size={48} />
                            </div>
                            <h3>{t('error_fetch_courses')}</h3>
                            <p>{t('check_internet')}</p>
                            <button 
                                className={styles.resetBtn}
                                onClick={() => {
                                    setLoading(true);
                                    setRetryCount(prev => prev + 1);
                                }}
                            >
                                {t('try_again')}
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Sticky Header for Search and Categories */}
                            <div className={styles.stickyHeader}>
                                <div className={styles.topBar}>
                                    <div className={styles.searchBox}>
                                        <Search size={18} className={styles.searchIcon} />
                                        <input 
                                            type="text" 
                                            placeholder={t('search_courses')} 
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                        {searchQuery && (
                                            <button 
                                                className={styles.clearSearch} 
                                                onClick={() => setSearchQuery('')}
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>

                                    <div className={styles.controls}>
                                        <div className={styles.sortGroup}>
                                            <span className={styles.controlLabel}>{t('sort_by')}</span>
                                            <div className={styles.togglePair}>
                                                <button 
                                                    className={`${styles.toggleBtn} ${sortBy === 'popularity' ? styles.activeToggle : ''}`}
                                                    onClick={() => setSortBy('popularity')}
                                                    title={t('sort_popularity')}
                                                >
                                                    <TrendingUp size={16} />
                                                </button>
                                                <button 
                                                    className={`${styles.toggleBtn} ${sortBy === 'rating' ? styles.activeToggle : ''}`}
                                                    onClick={() => setSortBy('rating')}
                                                    title={t('sort_rating')}
                                                >
                                                    <Star size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className={styles.divider} />

                                        <div className={styles.viewToggle}>
                                            <div className={styles.togglePair}>
                                                <button 
                                                    className={`${styles.toggleBtn} ${viewType === 'grid' ? styles.activeToggle : ''}`}
                                                    onClick={() => setViewType('grid')}
                                                    title={t('grid_view')}
                                                >
                                                    <LayoutGrid size={18} />
                                                </button>
                                                <button 
                                                    className={`${styles.toggleBtn} ${viewType === 'list' ? styles.activeToggle : ''}`}
                                                    onClick={() => setViewType('list')}
                                                    title={t('list_view')}
                                                >
                                                    <ListIcon size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Horizontal Category Tabs */}
                                <div className={styles.tabsRow}>
                                    <div className={styles.tabsContainer}>
                                        {categories.map(cat => (
                                            <button
                                                key={cat.id}
                                                className={`${styles.tab} ${activeCategory === cat.id ? styles.activeTab : ''}`}
                                                onClick={() => setActiveCategory(cat.id)}
                                            >
                                                {cat.name}
                                            </button>
                                        ))}
                                    </div>

                                </div>
                            </div>

                            <div className={styles.content}>
                                {filteredCourses.length > 0 ? (
                                    <div className={viewType === 'grid' ? styles.grid : styles.list}>
                                        {filteredCourses.map(course => (
                                            <CourseCard
                                                key={course.id}
                                                course={course}
                                                isEnrolled={enrolledCourseIds.has(course.id)}
                                                viewType={viewType}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className={styles.emptyState}>
                                        <div className={styles.emptyIcon}>
                                            <Info size={48} />
                                        </div>
                                        <h3>{t('no_courses_found')}</h3>
                                        <p>{t('try_different_filter')}</p>
                                        <button 
                                            className={styles.resetBtn}
                                            onClick={() => {
                                                setActiveCategory('All');
                                                setSearchQuery('');
                                            }}
                                        >
                                            {t('reset_filters')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CourseListPage;
