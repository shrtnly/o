import React from 'react';
import styles from './FlamingBadge.module.css';
import { cn } from '../lib/utils';

const FlamingBadge = ({ size = 20, className }) => {
    return (
        <div className={cn(styles.badgeContainer, className)} style={{ width: size, height: size }}>
            <div className={styles.flameOuter}>
                <svg
                    width={size}
                    height={size}
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className={styles.flameSvg}
                >
                    <path
                        d="M12 2C12 2 10 6 10 9C10 11.5 11.5 13 13 13C14.5 13 16 11.5 16 9C16 11.5 19 13.5 19 17C19 20.5 16 23 12 23C8 23 5 20.5 5 17C5 13 8 9 12 2Z"
                        fill="url(#blueFlameGradient)"
                    />
                    <path
                        d="M12 7C12 7 11 9 11 11C11 12.5 11.5 13.5 12.5 13.5C13.5 13.5 14.5 12.5 14.5 11C14.5 12 16 13 16 15C16 17.5 14 19 12 19C10 19 8 17.5 8 15C8 12.5 10 10.5 12 7Z"
                        fill="white"
                        fillOpacity="0.8"
                    />
                    <defs>
                        <linearGradient id="blueFlameGradient" x1="12" y1="2" x2="12" y2="23" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor="#00E5FF" />
                            <stop offset="50%" stopColor="#0091FF" />
                            <stop offset="100%" stopColor="#004CFF" />
                        </linearGradient>
                    </defs>
                </svg>
            </div>
            <div className={styles.innerGlow}></div>
        </div>
    );
};

export default FlamingBadge;
