import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';
import CourseListPage from './CourseListPage';
import styles from './CourseListPage.module.css';
import { useAuth } from '../../context/AuthContext';
import SEO from '../../components/SEO';

const GuestCoursePage = () => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    // If a logged-in user lands here (e.g. after social OAuth redirect race),
    // send them to the proper authenticated courses page.
    useEffect(() => {
        if (!loading && user) {
            navigate('/courses', { replace: true });
        }
    }, [user, loading, navigate]);

    return (
        <div className={styles.guestLayoutWrapper}>
            <Navbar />
            <CourseListPage />
        </div>
    );
};

export default GuestCoursePage;
