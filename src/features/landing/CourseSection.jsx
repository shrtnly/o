import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CourseCard from './CourseCard';
import Button from '../../components/ui/Button';
import { courseService } from '../../services/courseService';
import InlineLoader from '../../components/ui/InlineLoader';
import styles from './CourseSection.module.css';

const CourseSection = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const data = await courseService.getFeaturedCourses();
                setCourses(data);
            } catch (error) {
                console.error('Error fetching courses:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCourses();
    }, []);

    return (
        <section className={styles.section}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h2 className={styles.title}>পছন্দের বিষয় যুক্ত করুন</h2>
                    <p className={styles.subtitle}>নিজের শেখার তালিকায় পছন্দের প্রোগ্রাম যোগ করুন এবং শেখা শুরু করুন।</p>
                </div>

                {loading ? (
                    <InlineLoader />
                ) : (
                    <>
                        <div className={styles.grid}>
                            {courses.map(course => (
                                <CourseCard key={course.id} course={course} />
                            ))}
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
                    </>
                )}
            </div>
        </section>
    );
};

export default CourseSection;
