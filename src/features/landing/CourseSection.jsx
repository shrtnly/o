import React, { useEffect, useState, useRef } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Users, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { courseService } from '../../services/courseService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { supabase } from '../../lib/supabaseClient';
import { getCourseBaseStats } from '../../utils/courseBaseStats';
import styles from './CourseSection.module.css';

const CourseSection = () => {
    const { user } = useAuth();
    const { language } = useLanguage();
    const [courses, setCourses] = useState([]);
    const [enrolledCourseIds, setEnrolledCourseIds] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const scrollRef = useRef(null);

    // Desired display order — matched by title substring (case-insensitive)
    const DISPLAY_ORDER = [
        'শ্রম আইন',
        'সিভি',
        'সাইবার',
        'প্রোডাক্টিভিটি',
        'পাসওয়ার্ড',
    ];

    const sortCourses = (list) => {
        return [...list].sort((a, b) => {
            const aIdx = DISPLAY_ORDER.findIndex(kw =>
                (a.title || '').includes(kw) || (a.title_en || '').toLowerCase().includes(kw.toLowerCase())
            );
            const bIdx = DISPLAY_ORDER.findIndex(kw =>
                (b.title || '').includes(kw) || (b.title_en || '').toLowerCase().includes(kw.toLowerCase())
            );
            const aOrder = aIdx === -1 ? DISPLAY_ORDER.length : aIdx;
            const bOrder = bIdx === -1 ? DISPLAY_ORDER.length : bIdx;
            return aOrder - bOrder;
        });
    };

    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(true);

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const [data, enrolledData] = await Promise.all([
                    courseService.getFeaturedCourses(),
                    user ? supabase.from('user_courses').select('course_id').eq('user_id', user.id) : { data: [] }
                ]);

                setCourses(sortCourses(data || []));
                if (enrolledData?.data) {
                    setEnrolledCourseIds(new Set(enrolledData.data.map(d => d.course_id)));
                }
            } catch (error) {
                console.error('Error fetching courses:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCourses();
    }, [user]);

    const updateArrows = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            setShowLeftArrow(scrollLeft > 5);
            setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 5);
        }
    };

    useEffect(() => {
        const el = scrollRef.current;
        if (el) {
            el.addEventListener('scroll', updateArrows);
            // Run initially
            setTimeout(updateArrows, 100);
            window.addEventListener('resize', updateArrows);
        }
        return () => {
            if (el) el.removeEventListener('scroll', updateArrows);
            window.removeEventListener('resize', updateArrows);
        };
    }, [courses, loading]);

    const handleScroll = (direction) => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current;
            const scrollAmount = clientWidth * 0.6;
            scrollRef.current.scrollTo({
                left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    const handleClick = (course) => {
        const isEnrolled = enrolledCourseIds.has(course.id);
        if (isEnrolled) {
            navigate(`/learn/${course.id}`);
        } else {
            navigate(`/survey/${course.id}`);
        }
    };

    return (
        <section className={styles.section}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h2 className={styles.title}>আপনার শেখার যাত্রা শুরু করুন</h2>
                </div>

                <div className={styles.sliderWrapper}>
                    <button 
                        className={`${styles.arrowBtn} ${styles.leftArrow}`} 
                        onClick={() => handleScroll('left')}
                        disabled={!showLeftArrow}
                        aria-label="Previous courses"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    
                    <div className={styles.scrollContainer} ref={scrollRef} onScroll={updateArrows}>
                        {loading ? (
                            [...Array(6)].map((_, i) => (
                                <div key={i} className={`${styles.courseItem} ${styles.skeletonItem}`}>
                                    <div className={styles.skeletonIcon} />
                                    <div className={styles.skeletonText} />
                                </div>
                            ))
                        ) : (
                            courses.map(course => {
                                const displayTitle = (language === 'en' && course.title_en) ? course.title_en : course.title;
                                const { baseStudents, baseRating } = getCourseBaseStats(course.title || '');
                                const realStudents = Number(course.students_count) || 0;
                                const displayStudents = baseStudents + realStudents;
                                const realRating = parseFloat(course.rating) || 0;
                                const displayRating = realRating > 0 ? realRating : baseRating;
                                return (
                                    <div 
                                        key={course.id} 
                                        className={styles.courseItem}
                                        onClick={() => handleClick(course)}
                                    >
                                        <img 
                                            src={course.image_url} 
                                            alt={displayTitle} 
                                            className={styles.courseIcon} 
                                        />
                                        <span className={styles.courseTitle}>{displayTitle}</span>
                                        <div className={styles.courseMeta}>
                                            <span className={styles.courseStat}>
                                                <Users size={11} />
                                                {displayStudents}
                                            </span>
                                            <span className={styles.courseStat}>
                                                <Star size={11} className={styles.starIcon} />
                                                {displayRating.toFixed(1)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <button 
                        className={`${styles.arrowBtn} ${styles.rightArrow}`} 
                        onClick={() => handleScroll('right')}
                        disabled={!showRightArrow}
                        aria-label="Next courses"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>

                <div className={styles.footer}>
                    <Button
                        variant="outline"
                        className={styles.allBtn}
                        onClick={() => navigate('/courses')}
                    >
                        সব কোর্স দেখুন
                        <ArrowRight size={20} style={{ marginLeft: '12px' }} />
                    </Button>
                </div>
            </div>
        </section>
    );
};

export default CourseSection;
