import React from 'react';
import styles from './CourseSkeleton.module.css';

const CourseSkeleton = () => {
    return (
        <div className={styles.skeletonCard}>
            <div className={styles.imagePlaceholder}></div>
            <div className={styles.contentPlaceholder}>
                <div className={styles.titleLine}></div>
                <div className={styles.metaRow}>
                    <div className={styles.statPlaceholder}></div>
                    <div className={styles.statPlaceholder}></div>
                </div>
            </div>
        </div>
    );
};

export default CourseSkeleton;
