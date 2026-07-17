import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Star, CheckCircle2 } from 'lucide-react';
import { courseService } from '../../services/courseService';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { getCourseBaseStats } from '../../utils/courseBaseStats';
import styles from './CourseCard.module.css';

const CourseCard = ({ course, isEnrolled, viewType = 'grid' }) => {
    const { t, language } = useLanguage();
    const { profile } = useAuth();
    const navigate = useNavigate();
    const isAdmin = profile?.role === 'admin';
    const isPublished = course.status === 'published';

    // Merge dummy base stats with real DB values
    // displayed students = dummy base + real enrolled count from DB
    // displayed rating   = baseRating until `minReviews` real reviews accumulate, then real DB rating
    const { baseStudents, baseRating, minReviews } = getCourseBaseStats(course.title || '');
    const realStudents = Number(course.students_count) || 0;
    const students = baseStudents + realStudents;
    const realRating = parseFloat(course.rating) || 0;
    const reviewCount = Number(course.review_count) || 0;
    const rating = (reviewCount >= minReviews && minReviews > 0 && realRating > 0)
        ? realRating
        : (baseRating > 0 ? baseRating : realRating);

    const displayTitle = (language === 'en' && course.title_en) ? course.title_en : course.title;

    const handleClick = () => {
        if (isEnrolled) {
            navigate(`/learn/${course.id}`);
        } else {
            navigate(`/survey/${course.id}`);
        }
    };

    return (
        <div className={`${styles.card} ${viewType === 'list' ? styles.listCard : ''}`} onClick={handleClick}>
            {isEnrolled && (
                <div className={styles.enrolledBadge}>
                    <CheckCircle2 size={12} />
                </div>
            )}
            {!isPublished && isAdmin && (
                <div className={styles.draftBadge}>
                    {language === 'bn' ? 'ড্রাফট' : 'Draft'}
                </div>
            )}
            <div className={styles.imageWrapper}>
                <img src={course.image_url} alt={displayTitle} className={styles.image} />
            </div>
            <div className={styles.content}>
                <h3 className={styles.title}>{displayTitle}</h3>
                <div className={styles.meta}>
                    <div className={styles.stat} title={t('students_count')}>
                        <Users size={14} />
                        <span>{students}</span>
                    </div>
                    <div className={styles.stat} title={t('course_rating')}>
                        <Star size={14} className={styles.starIcon} />
                        <span>{rating.toFixed(1)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CourseCard;
