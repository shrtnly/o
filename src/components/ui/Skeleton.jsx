import React from 'react';
import styles from './Skeleton.module.css';

const Skeleton = ({ width, height, borderRadius, className = '' }) => {
    const style = {
        width: width || '100%',
        height: height || '20px',
        borderRadius: borderRadius || '4px',
    };

    return (
        <div 
            className={`${styles.skeleton} ${className}`} 
            style={style}
        >
            <div className={styles.shimmer}></div>
        </div>
    );
};

export default Skeleton;
