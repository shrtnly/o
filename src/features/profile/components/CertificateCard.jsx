import React from 'react';
import { Lock, Award, Eye, GraduationCap, Calendar, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './CertificateCard.module.css';

const CertificateCard = ({ course, onOpen }) => {
    const navigate = useNavigate();
    const isLocked = course.isLocked;
    const progress = Math.min(100, Math.floor(course.progress || 0));
    const issueDate = course.certificate?.issued_at 
        ? new Date(course.certificate.issued_at).toLocaleDateString() 
        : null;

    const handleCardClick = () => {
        if (isLocked) {
            navigate(`/learn/${course.course_id}`);
        } else {
            onOpen(course);
        }
    };

    return (
        <div 
            className={`${styles.card} ${isLocked ? styles.locked : styles.unlocked}`}
            onClick={handleCardClick}
        >
            {/* Certificate Style Ornaments */}
            <div className={styles.cornerTopLeft}></div>
            <div className={styles.cornerTopRight}></div>
            <div className={styles.cornerBottomLeft}></div>
            <div className={styles.cornerBottomRight}></div>
            
            <div className={styles.cardContent}>
                <div className={styles.body}>
                    <div className={styles.labelRow}>
                        <div className={styles.certLabel}>
                            {isLocked ? 'COURSE ENROLLMENT' : 'CERTIFICATE OF ACHIEVEMENT'}
                        </div>
                        <div className={styles.badgeContainerMini}>
                            {isLocked ? (
                                <Lock size={14} className={styles.lockIconMini} />
                            ) : (
                                <Award size={18} className={styles.awardIconMini} />
                            )}
                        </div>
                    </div>
                    <h3 className={styles.courseTitle}>{course.course_title}</h3>
                    
                    {!isLocked ? (
                        <div className={styles.recipientInfo}>
                            <CheckCircle2 size={14} className={styles.checkIcon} />
                            <span>Successfully Verified</span>
                        </div>
                    ) : (
                        <div className={styles.progressBrander}>
                            <div className={styles.progressLabel}>Current Progress</div>
                            <div className={styles.miniProgressBar}>
                                <div 
                                    className={styles.miniProgressFill} 
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <div className={styles.progressPercent}>{progress}%</div>
                        </div>
                    )}
                </div>

                <div className={styles.footer}>
                    {!isLocked ? (
                        <div className={styles.footerInfo}>
                            <div className={styles.footerItem}>
                                <Calendar size={12} />
                                <span>{issueDate}</span>
                            </div>
                            <div className={styles.viewPrompt}>
                                <span>VIEW FULL</span> <Eye size={12} />
                            </div>
                        </div>
                    ) : (
                        <div className={styles.continuePrompt}>
                            <GraduationCap size={14} />
                            <span>CONTINUE LEARNING</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CertificateCard;
