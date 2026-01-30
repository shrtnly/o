import React, { useEffect, useState } from 'react';
import { ArrowLeft, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CourseCard from '../landing/CourseCard';
import Navbar from '../../components/layout/Navbar';
import LoadingScreen from '../../components/ui/LoadingScreen';
import { courseService } from '../../services/courseService';
import styles from './CourseListPage.module.css';

const CATEGORIES = [
    { id: 'Everyday Life Skills', name: 'দৈনন্দিন জীবন দক্ষতা' },
    { id: 'Civic & Legal Awareness', name: 'নাগরিক ও আইনি সচেতনতা' },
    { id: 'Safety & Health', name: 'নিরাপত্তা ও স্বাস্থ্য' },
    { id: 'Digital Literacy', name: 'ডিজিটাল লিটারেসি' },
    { id: 'Fun / Curiosity Learning', name: 'মজার / কৌতূহলী শিক্ষা' }
];

const CourseListPage = () => {
    const [courses, setCourses] = useState([]);
    const [filteredCourses, setFilteredCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('All');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const data = await courseService.getAllCourses();
                console.log('Fetched courses:', data);
                setCourses(data);
                setFilteredCourses(data);
            } catch (error) {
                console.error('Error fetching courses:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchCourses();
    }, []);

    useEffect(() => {
        let result = courses;

        if (activeCategory !== 'All') {
            result = result.filter(c => c.category === activeCategory);
        }

        setFilteredCourses(result);
    }, [activeCategory, courses]);

    return (
        <div className={styles.pageWrapper}>
            <Navbar />

            <main className={styles.main}>
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
                        <LoadingScreen />
                    ) : (
                        <div className={styles.content}>
                            {activeCategory === 'All' ? (
                                // Grouped by Category View
                                <>
                                    {CATEGORIES.map(cat => {
                                        const catCourses = courses.filter(c => c.category === cat.id);
                                        if (catCourses.length === 0) return null;

                                        return (
                                            <section key={cat.id} className={styles.categorySection}>
                                                <h2 className={styles.categoryTitle}>{cat.name}</h2>
                                                <div className={styles.grid}>
                                                    {catCourses.map(course => (
                                                        <CourseCard key={course.id} course={course} />
                                                    ))}
                                                </div>
                                            </section>
                                        );
                                    })}

                                    {/* Fallback for courses with no category or unmatched category */}
                                    {(() => {
                                        const categorizedIds = new Set(CATEGORIES.map(c => c.id));
                                        const uncategorized = courses.filter(c => !c.category || !categorizedIds.has(c.category));
                                        if (uncategorized.length === 0) return null;

                                        return (
                                            <section className={styles.categorySection}>
                                                <h2 className={styles.categoryTitle}>অন্যান্য কোর্স</h2>
                                                <div className={styles.grid}>
                                                    {uncategorized.map(course => (
                                                        <CourseCard key={course.id} course={course} />
                                                    ))}
                                                </div>
                                            </section>
                                        );
                                    })()}
                                </>
                            ) : (
                                // Search/Filter Result View
                                <div className={styles.resultView}>
                                    <h2 className={styles.resultTitle}>
                                        {filteredCourses.length} টি কোর্স পাওয়া গেছে
                                    </h2>
                                    {filteredCourses.length > 0 ? (
                                        <div className={styles.grid}>
                                            {filteredCourses.map(course => (
                                                <CourseCard key={course.id} course={course} />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className={styles.emptyState}>
                                            কোনো কোর্স পাওয়া যায়নি।
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default CourseListPage;
