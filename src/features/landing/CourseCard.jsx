import { useNavigate } from 'react-router-dom';
import { Users, Star } from 'lucide-react';
import styles from './CourseCard.module.css';

const CourseCard = ({ course }) => {
    const navigate = useNavigate();

    return (
        <div className={styles.card} onClick={() => navigate(`/survey/${course.id}`)}>
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
