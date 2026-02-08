import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import InlineLoader from '../../components/ui/InlineLoader';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { courseService } from '../../services/courseService';
import CourseCard from '../landing/CourseCard';
import styles from './CourseListPage.module.css';

const CATEGORIES = [
    { id: 'Everyday Life Skills', name: 'দৈনন্দিন জীবন দক্ষতা' },
    { id: 'Civic & Legal Awareness', name: 'নাগরিক ও আইনি সচেতনতা' },
    { id: 'Safety & Health', name: 'নিরাপত্তা ও স্বাস্থ্য' },
    { id: 'Digital Literacy', name: 'ডিজিটাল লিটারেসি' },
    { id: 'Fun / Curiosity Learning', name: 'মজার / কৌতূহলী শিক্ষা' }
];

const CourseListPage = () => {
    const { user } = useAuth();
    const [courses, setCourses] = useState([]);
    const [enrolledCourseIds, setEnrolledCourseIds] = useState(new Set());
    const [filteredCourses, setFilteredCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('All');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [allCourses, enrolledData] = await Promise.all([
                    courseService.getAllCourses(),
                    user ? supabase.from('user_courses').select('course_id').eq('user_id', user.id) : { data: [] }
                ]);

                setCourses(allCourses || []);
                setFilteredCourses(allCourses || []);

                if (enrolledData?.data) {
                    setEnrolledCourseIds(new Set(enrolledData.data.map(d => d.course_id)));
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    useEffect(() => {
        let result = courses;

        if (activeCategory !== 'All') {
            result = result.filter(c => c.category === activeCategory);
        }

        setFilteredCourses(result);
    }, [activeCategory, courses]);

    return (
        <div className={styles.pageWrapper}>
            <div className={styles.mainContainer}>
                <div className={styles.container}>
                    <div className={styles.searchFilterBar}>
                        <div className={styles.categoryFilters}>
                            <button
                                className={`${styles.filterBtn} ${activeCategory === 'All' ? styles.active : ''}`}
                                onClick={() => setActiveCategory('All')}
                            >
                                সব কোর্স
                            </button>
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat.id}
                                    className={`${styles.filterBtn} ${activeCategory === cat.id ? styles.active : ''}`}
                                    onClick={() => setActiveCategory(cat.id)}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {loading ? (
                        <InlineLoader />
                    ) : (
                        <div className={styles.content}>
                            {/* Specific Category Section - only if filtered */}
                            {activeCategory !== 'All' && (
                                <section className={styles.categorySection}>
                                    <h2 className={styles.categoryTitle}>
                                        {CATEGORIES.find(c => c.id === activeCategory)?.name}
                                    </h2>
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
                                            কোনো কোর্স পাওয়া যায়নি।
                                        </div>
                                    )}
                                </section>
                            )}

                            {/* All Courses Section - Always shown */}
                            <section className={styles.categorySection}>
                                <h2 className={styles.categoryTitle}>সব কোর্স</h2>
                                <div className={styles.grid}>
                                    {courses.map(course => (
                                        <CourseCard
                                            key={course.id}
                                            course={course}
                                            isEnrolled={enrolledCourseIds.has(course.id)}
                                        />
                                    ))}
                                </div>
                            </section>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CourseListPage;
