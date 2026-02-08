import React from 'react';
import Navbar from '../../components/layout/Navbar';
import CourseListPage from './CourseListPage';
import styles from './CourseListPage.module.css';

const GuestCoursePage = () => {
    return (
        <div className={styles.guestLayoutWrapper}>
            <Navbar />
            <CourseListPage />
        </div>
    );
};

export default GuestCoursePage;
