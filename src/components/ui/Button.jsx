import React from 'react';
import styles from './Button.module.css';

const Button = ({ variant = 'primary', className = '', children, ...props }) => {
    return (
        <button
            className={`${styles.button} ${styles[variant]} ${className}`}
            {...props}
        >
            <span className={styles.inner}>
                {children}
            </span>
        </button>
    );
};

export default Button;
