import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Info } from 'lucide-react';
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
    const categories = getCategories(t);
    const [courses, setCourses] = useState([]);
    const [enrolledCourseIds, setEnrolledCourseIds] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch basic course data first to show something immediately if possible
                const allCourses = await courseService.getAllCourses();
                setCourses(allCourses || []);
                
                // Then fetch optional stats and enrollment
                const [enrolledData, bulkStats] = await Promise.all([
                    user ? supabase.from('user_courses').select('course_id').eq('user_id', user.id) : Promise.resolve({ data: [] }),
                    courseService.getBulkCourseStats().catch(() => ({}))
                ]);

                // Merge live stats into course data
                const updatedCourses = (allCourses || []).map(course => ({
                    ...course,
                    students_count: bulkStats[course.id]?.count || course.students_count || 0,
                    rating: bulkStats[course.id]?.rating || course.rating || 0
                }));

                setCourses(updatedCourses);
                if (enrolledData?.data) {
                    setEnrolledCourseIds(new Set(enrolledData.data.map(d => d.course_id)));
                }
            } catch (error) {
                console.error('Error fetching course data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    // Compute filtered courses during render to avoid blinks
    const filteredCourses = courses.filter(course => {
        const matchesCategory = activeCategory === 'All' || course.category === activeCategory;
        const matchesSearch = !searchQuery.trim() || 
            course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (course.category && course.category.toLowerCase().includes(searchQuery.toLowerCase()));
        
        return matchesCategory && matchesSearch;
    });

    return (
        <div className={styles.pageWrapper}>
            <div className={styles.mainContainer}>
                <div className={styles.container}>
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
                            </div>
                        </div>

                        {/* Horizontal Category Tabs */}
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

                    {loading ? (
                        <div className={styles.grid}>
                            {[...Array(6)].map((_, i) => (
                                <CourseSkeleton key={i} />
                            ))}
                        </div>
                    ) : (
                        <div className={styles.content}>
                            {filteredCourses.length > 0 ? (
                                <div className={styles.grid}>
                                    {filteredCourses.map(course => (
                                        <CourseCard
                                            key={course.id}
                                            course={course}
                                            isEnrolled={enrolledCourseIds.has(course.id)}
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
                    )}
                </div>
            </div>
        </div>
    );
};

export default CourseListPage;
