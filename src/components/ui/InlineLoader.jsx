import React from 'react';
import styles from './InlineLoader.module.css';

const InlineLoader = () => {
    return (
        <div className={styles.loader}>
            <div className={styles.spinner} />
        </div>
    );
};

export default InlineLoader;
