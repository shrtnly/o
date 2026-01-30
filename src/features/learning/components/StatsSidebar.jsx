import React from 'react';
import { Zap, Gem, Heart, Shield, ChevronDown, Check, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import styles from '../LearningPage.module.css';

const StatsSidebar = ({ profile, courses = [], currentCourseId }) => {
    const navigate = useNavigate();
    const [isCourseOpen, setIsCourseOpen] = React.useState(false);

    const currentCourse = courses.find(c => c.id === currentCourseId);

    const handleCourseSwitch = (newId) => {
        setIsCourseOpen(false);
        if (newId !== currentCourseId) {
            navigate(`/learning/${newId}`);
        }
    };

    return (
        <aside className={styles.rightSidebar}>
            {/* Course Selector */}
            <div className={styles.courseSelectorContainer}>
                <button
                    className={`${styles.courseSelectorBtn} ${isCourseOpen ? styles.btnOpen : ''}`}
                    onClick={() => setIsCourseOpen(!isCourseOpen)}
                >
                    <div className={styles.courseBtnContent}>
                        <div className={styles.courseIcon}>
                            <Play size={18} fill="currentColor" />
                        </div>
                        <span className={styles.courseTitle}>
                            {currentCourse?.title || 'কোর্স নির্বাচন করুন'}
                        </span>
                    </div>
                    <ChevronDown size={20} className={`${styles.chevron} ${isCourseOpen ? styles.chevronRotate : ''}`} />
                </button>

                {isCourseOpen && (
                    <div className={styles.courseDropdown}>
                        {courses.map(course => (
                            <div
                                key={course.id}
                                className={`${styles.courseOption} ${course.id === currentCourseId ? styles.optionActive : ''}`}
                                onClick={() => handleCourseSwitch(course.id)}
                            >
                                <span className={styles.optionTitle}>{course.title}</span>
                                {course.id === currentCourseId && <Check size={16} color="#58cc02" strokeWidth={3} />}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className={styles.statsRow}>
                <div className={styles.statItem} style={{ color: '#ff9600' }}>
                    <Zap size={24} fill="#ff9600" />
                    <span>{profile?.xp || 0}</span>
                </div>
                <div className={styles.statItem} style={{ color: '#1cb0f6' }}>
                    <Gem size={24} fill="#1cb0f6" />
                    <span>{profile?.gems || 0}</span>
                </div>
                <div className={styles.statItem} style={{ color: '#ff4b4b' }}>
                    <Heart size={24} fill="#ff4b4b" />
                    <span>{profile?.hearts || 0}</span>
                </div>
            </div>

            <div style={{ height: '8px' }}></div>

            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>লিডারবোর্ড আনলক করুন!</h3>
                </div>
                <div className={styles.unlockContent}>
                    <div className={styles.iconBox}>
                        <Shield size={32} color="#4b4b4b" />
                    </div>
                    <p className={styles.unlockText}>প্রতিযোগিতা শুরু করতে আরও ১০টি পাঠ সম্পূর্ণ করুন</p>
                </div>
            </div>

            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>দৈনিক অনুসন্ধান</h3>
                    <span className={styles.viewAll}>সব দেখুন</span>
                </div>
                <div className={styles.questItem}>
                    <Zap size={32} color="#ffc800" fill="#ffc800" />
                    <div className={styles.progressContainer}>
                        <div className={styles.questTitle}>১০ XP অর্জন করুন</div>
                        <div className={styles.progressBar}>
                            <div className={styles.progressFill} style={{ width: '0%' }}></div>
                        </div>
                    </div>
                </div>
            </div>

            {!profile && (
                <div className={styles.ctaCard}>
                    <p className={styles.ctaText}>প্রগতি সংরক্ষণ করতে একটি প্রোফাইল তৈরি করুন!</p>
                    <div className={styles.ctaButtons}>
                        <Button variant="primary" style={{ backgroundColor: '#fff', color: '#1cb0f6' }}>প্রোফাইল তৈরি করুন</Button>
                        <Button variant="outline" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}>লগইন করুন</Button>
                    </div>
                </div>
            )}
        </aside>
    );
};

export default StatsSidebar;
