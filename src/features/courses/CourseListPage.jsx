import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Filter } from 'lucide-react';
import InlineLoader from '../../components/ui/InlineLoader';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { courseService } from '../../services/courseService';
import CourseCard from '../landing/CourseCard';
import styles from './CourseListPage.module.css';

const CATEGORIES = [
    { id: 'Digital safety', name: 'ডিজিটাল নিরাপত্তা' },
    { id: 'Legal Awareness', name: 'আইনি সচেতনতা' },
    { id: 'Digital Literacy', name: 'ডিজিটাল লিটারেসি' },
    { id: 'Financial Literacy', name: 'আর্থিক সচেতনতা' },
    { id: 'Career & Skill', name: 'ক্যারিয়ার ও দক্ষতা' }
];

const CourseListPage = () => {
    const { user } = useAuth();
    const [courses, setCourses] = useState([]);
    const [enrolledCourseIds, setEnrolledCourseIds] = useState(new Set());
    const [filteredCourses, setFilteredCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('All');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
                    <header className={styles.header}>
                        <h1 className={styles.pageTitle}>আপনার পছন্দের <span className={styles.highlight}>কোর্সসমূহ</span> যুক্ত করুন</h1>
                    </header>

                    {loading ? (
                        <InlineLoader />
                    ) : (
                        <div className={styles.content}>
                            {activeCategory === 'All' ? (
                                <section className={styles.categorySection}>
                                    <div className={styles.sectionHeader}>
                                        <h2 className={styles.categoryTitle}>সব কোর্স</h2>

                                        <div className={styles.filterDropdown} ref={dropdownRef}>
                                            <button
                                                className={`${styles.dropdownToggle} ${isDropdownOpen ? styles.isOpen : ''}`}
                                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                            >
                                                <div className={styles.toggleContent}>
                                                    <Filter size={18} className={styles.filterIcon} />
                                                    <span>
                                                        {activeCategory === 'All'
                                                            ? 'সব কোর্স'
                                                            : CATEGORIES.find(cat => cat.id === activeCategory)?.name}
                                                    </span>
                                                </div>
                                                <ChevronDown size={20} className={styles.chevron} />
                                            </button>

                                            {isDropdownOpen && (
                                                <div className={styles.dropdownMenu}>
                                                    <div
                                                        className={`${styles.dropdownItem} ${activeCategory === 'All' ? styles.active : ''}`}
                                                        onClick={() => {
                                                            setActiveCategory('All');
                                                            setIsDropdownOpen(false);
                                                        }}
                                                    >
                                                        সব কোর্স
                                                    </div>
                                                    {CATEGORIES.map(cat => (
                                                        <div
                                                            key={cat.id}
                                                            className={`${styles.dropdownItem} ${activeCategory === cat.id ? styles.active : ''}`}
                                                            onClick={() => {
                                                                setActiveCategory(cat.id);
                                                                setIsDropdownOpen(false);
                                                            }}
                                                        >
                                                            {cat.name}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
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
                            ) : (
                                <section className={styles.categorySection}>
                                    <div className={styles.sectionHeader}>
                                        <h2 className={styles.categoryTitle}>
                                            {CATEGORIES.find(c => c.id === activeCategory)?.name}
                                        </h2>

                                        <div className={styles.filterDropdown} ref={dropdownRef}>
                                            <button
                                                className={`${styles.dropdownToggle} ${isDropdownOpen ? styles.isOpen : ''}`}
                                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                            >
                                                <div className={styles.toggleContent}>
                                                    <Filter size={18} className={styles.filterIcon} />
                                                    <span>
                                                        {activeCategory === 'All'
                                                            ? 'সব কোর্স'
                                                            : CATEGORIES.find(cat => cat.id === activeCategory)?.name}
                                                    </span>
                                                </div>
                                                <ChevronDown size={20} className={styles.chevron} />
                                            </button>

                                            {isDropdownOpen && (
                                                <div className={styles.dropdownMenu}>
                                                    <div
                                                        className={`${styles.dropdownItem} ${activeCategory === 'All' ? styles.active : ''}`}
                                                        onClick={() => {
                                                            setActiveCategory('All');
                                                            setIsDropdownOpen(false);
                                                        }}
                                                    >
                                                        সব কোর্স
                                                    </div>
                                                    {CATEGORIES.map(cat => (
                                                        <div
                                                            key={cat.id}
                                                            className={`${styles.dropdownItem} ${activeCategory === cat.id ? styles.active : ''}`}
                                                            onClick={() => {
                                                                setActiveCategory(cat.id);
                                                                setIsDropdownOpen(false);
                                                            }}
                                                        >
                                                            {cat.name}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
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
                                            এই ক্যাটাগরিতে কোনো কোর্স পাওয়া যায়নি।
                                        </div>
                                    )}
                                </section>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CourseListPage;
