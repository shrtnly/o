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
import SEO from '../../components/SEO';

const getCategories = (t) => [
    { id: 'All', name: t('all_courses') },
    { id: 'Digital Literacy & Security', name: t('cat_digital_security_literacy') },
    { id: 'Legal Awareness & Citizen Rights', name: t('cat_legal_rights') },
    { id: 'Financial Awareness & Smart Banking', name: t('cat_finance_banking') },
    { id: 'Career & Skills', name: t('cat_career_skills') },
    { id: 'Mental Health & Self-Development', name: t('cat_mental_health') }
];

const CourseListPage = () => {
    const { user, loading: authLoading } = useAuth();
    const { t } = useLanguage();
    const [courses, setCourses] = useState([]);
    const [enrolledCourseIds, setEnrolledCourseIds] = useState(new Set());
    const [dataLoading, setDataLoading] = useState(true);
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

    // Track how many auto-retries we've done (separate from manual retryCount)
    const autoRetryRef = useRef(0);
    const retryTimerRef = useRef(null);
    // Reset the auto-retry counter only when the user changes (not on every retryCount tick)
    const prevUserIdRef = useRef(null);

    useEffect(() => {
        // Don't start fetching while auth is still resolving (important for social login PKCE flow)
        if (authLoading) return;

        // Reset auto-retry only when the user changes identity
        if (prevUserIdRef.current !== (user?.id ?? null)) {
            prevUserIdRef.current = user?.id ?? null;
            autoRetryRef.current = 0;
        }

        let isMounted = true;
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);

        const fetchData = async () => {
            setError(null);
            // stopLoading = false prevents finally from hiding the skeleton during auto-retry
            let stopLoading = true;

            try {
                // Race against 15s hard timeout so we never hang forever
                const allCourses = await Promise.race([
                    courseService.getAllCourses(),
                    new Promise(resolve => setTimeout(() => resolve([]), 15000))
                ]);

                if (!isMounted) { stopLoading = false; return; }

                // 0 courses right after social login = PKCE token not fully ready yet.
                // Schedule a retry (up to 2x) and keep the skeleton visible.
                if (allCourses.length === 0 && autoRetryRef.current < 2) {
                    autoRetryRef.current += 1;
                    stopLoading = false; // <-- key: prevents finally from stopping the skeleton
                    const delay = 1500 * autoRetryRef.current;
                    retryTimerRef.current = setTimeout(() => {
                        if (isMounted) {
                            courseService.getAllCourses(true); // bust cache
                            setDataLoading(true);
                            setRetryCount(c => c + 1);
                        }
                    }, delay);
                    return;
                }

                // Fetch enrollment + stats in parallel (both optional)
                const [enrolledData, bulkStats] = await Promise.all([
                    user
                        ? supabase
                            .from('user_courses')
                            .select('course_id')
                            .eq('user_id', user.id)
                            .then(r => r)
                            .catch(() => ({ data: [] }))
                        : Promise.resolve({ data: [] }),
                    courseService.getBulkCourseStats().catch(() => ({}))
                ]);

                if (!isMounted) { stopLoading = false; return; }

                const updatedCourses = allCourses.map(course => ({
                    ...course,
                    students_count: bulkStats[course.id]?.count || course.students_count || 0,
                    rating: bulkStats[course.id]?.rating || course.rating || 0
                }));

                setCourses(updatedCourses);
                if (enrolledData?.data && enrolledData.data.length > 0) {
                    setEnrolledCourseIds(new Set(enrolledData.data.map(d => d.course_id)));
                    setActiveCategory('My Courses');
                } else {
                    setActiveCategory('All');
                }
            } catch (err) {
                if (isMounted) {
                    console.error('CourseListPage fetch error:', err);
                    setError(true);
                }
            } finally {
                // Only stop the skeleton when NOT waiting for an auto-retry
                if (isMounted && stopLoading) {
                    setDataLoading(false);
                }
            }
        };

        fetchData();
        return () => {
            isMounted = false;
            if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        };
    }, [user?.id, retryCount, authLoading]);


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

    const isBn = language === 'bn';
    const seoTitle = isBn 
        ? 'আমাদের কোর্সসমূহ | বি লেসন (BeeLesson)' 
        : 'Explore Courses | BeeLesson';
        
    const seoDescription = isBn 
        ? 'ডিজিটাল নিরাপত্তা, আইনি সচেতনতা, ক্যারিয়ার স্কিলস, মানসিক স্বাস্থ্য ও আর্থিক সচেতনতার ওপর আমাদের চমৎকার গেমিফাইড কোর্সগুলো দেখুন।' 
        : 'Explore our gamified courses on digital security, legal rights, career skills, mental health, and smart banking on BeeLesson.';

    const courseSchema = courses.length > 0 ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "numberOfItems": courses.length,
        "itemListElement": courses.map((course, idx) => ({
            "@type": "ListItem",
            "position": idx + 1,
            "item": {
                "@type": "Course",
                "name": isBn ? (course.title || course.name) : (course.title_en || course.name_en || course.title),
                "description": isBn 
                    ? (course.description || course.summary || '') 
                    : (course.description_en || course.summary_en || course.description || ''),
                "provider": {
                    "@type": "Organization",
                    "name": "BeeLesson",
                    "sameAs": "https://www.beelesson.com"
                }
            }
        }))
    } : null;

    return (
        <div className={styles.pageWrapper}>
            <SEO 
                title={seoTitle} 
                description={seoDescription} 
                schema={courseSchema}
            />
            <div className={styles.mainContainer}>
                <div className={styles.container}>
                    {(dataLoading || authLoading) ? (
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
                                    autoRetryRef.current = 0;
                                    setDataLoading(true);
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
