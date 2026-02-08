import { useNavigate } from 'react-router-dom';
import { Users, Star, CheckCircle2 } from 'lucide-react';
import styles from './CourseCard.module.css';

const CourseCard = ({ course, isEnrolled }) => {
    const navigate = useNavigate();

    const handleClick = () => {
        if (isEnrolled) {
            navigate(`/learn/${course.id}`);
        } else {
            navigate(`/survey/${course.id}`);
        }
    };

    return (
        <div className={styles.card} onClick={handleClick}>
            {isEnrolled && (
                <div className={styles.cardBadge}>
                    <CheckCircle2 size={22} fill="#58cc02" color="#fff" />
                </div>
            )}
            <div className={styles.imageWrapper}>
                <img src={course.image_url} alt={course.title} className={styles.image} />
            </div>
            <div className={styles.content}>
                <h3 className={styles.title}>{course.title}</h3>
                <div className={styles.meta}>
                    <div className={styles.stat}>
                        <Users size={16} />
                        <span>{course.students_count}</span>
                    </div>
                    <div className={styles.stat}>
                        <Star size={16} fill="currentColor" />
                        <span>{course.rating}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CourseCard;
