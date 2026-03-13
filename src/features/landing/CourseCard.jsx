import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Star, CheckCircle2 } from 'lucide-react';
import { courseService } from '../../services/courseService';
import styles from './CourseCard.module.css';

const CourseCard = ({ course, isEnrolled }) => {
    const navigate = useNavigate();

    // Use values from course object, fallback to 0
    const rating = parseFloat(course.rating) || 0;
    const students = Number(course.students_count) || 0;

    const handleClick = () => {
        if (isEnrolled) {
            navigate(`/learn/${course.id}`);
        } else {
            navigate(`/survey/${course.id}`);
        }
    };

    return (
        <div className={styles.card} onClick={handleClick}>
            <div className={styles.imageWrapper}>
                <img src={course.image_url} alt={course.title} className={styles.image} />
                {isEnrolled && (
                    <div className={styles.enrolledBadge}>
                        <CheckCircle2 size={12} />
                    </div>
                )}
            </div>
            <div className={styles.content}>
                <h3 className={styles.title}>{course.title}</h3>
                <div className={styles.meta}>
                    <div className={styles.stat} title="শিক্ষার্থী সংখ্যা">
                        <Users size={14} />
                        <span>{students}</span>
                    </div>
                    <div className={styles.stat} title="কোর্স রেটিং">
                        <Star size={14} className={styles.starIcon} />
                        <span>{rating.toFixed(1)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CourseCard;
