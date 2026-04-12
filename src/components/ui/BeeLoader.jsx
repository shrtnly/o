import React from 'react';
import { motion } from 'framer-motion';
import styles from './BeeLoader.module.css';

const BeeLoader = ({ size = 120, message = "লোড হচ্ছে..." }) => {
    return (
        <div className={styles.loaderContainer}>
            <motion.div 
                className={styles.beeWrapper}
                animate={{ 
                    y: [0, -15, 0],
                }}
                transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            >
                <svg 
                    width={size} 
                    height={size} 
                    viewBox="0 0 100 100" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                    className={styles.beeSvg}
                >
                    {/* Head - Main Body */}
                    <circle cx="50" cy="50" r="35" fill="var(--color-primary)" />
                    
                    {/* Antennae */}
                    <motion.path 
                        d="M35 25C30 15 25 18 20 12" 
                        stroke="var(--color-text)" 
                        strokeWidth="2.5" 
                        strokeLinecap="round"
                        animate={{ 
                            rotate: [-5, 5, -5]
                        }}
                        transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <motion.path 
                        d="M65 25C70 15 75 18 80 12" 
                        stroke="var(--color-text)" 
                        strokeWidth="2.5" 
                        strokeLinecap="round"
                        animate={{ 
                            rotate: [5, -5, 5]
                        }}
                        transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <circle cx="20" cy="12" r="3" fill="var(--color-text)" />
                    <circle cx="80" cy="12" r="3" fill="var(--color-text)" />

                    {/* Face Stripes (Forehead) */}
                    <path d="M40 22C45 20 55 20 60 22" stroke="var(--color-bg-deep)" strokeWidth="3" strokeLinecap="round" opacity="0.3" />
                    <path d="M42 28C46 26 54 26 58 28" stroke="var(--color-bg-deep)" strokeWidth="3" strokeLinecap="round" opacity="0.2" />

                    {/* Eyes */}
                    <motion.ellipse 
                        cx="38" cy="48" rx="4" ry="5" 
                        fill="var(--color-bg-deep)" 
                        animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
                        transition={{ duration: 4, repeat: Infinity, times: [0, 0.45, 0.5, 0.55, 1] }}
                    />
                    <motion.ellipse 
                        cx="62" cy="48" rx="4" ry="5" 
                        fill="var(--color-bg-deep)" 
                        animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
                        transition={{ duration: 4, repeat: Infinity, times: [0, 0.45, 0.5, 0.55, 1] }}
                    />

                    {/* Smile */}
                    <path 
                        d="M42 62C45 65 55 65 58 62" 
                        stroke="var(--color-bg-deep)" 
                        strokeWidth="2.5" 
                        strokeLinecap="round" 
                    />

                    {/* Blush */}
                    <circle cx="30" cy="55" r="3" fill="#ff7da2" opacity="0.4" />
                    <circle cx="70" cy="55" r="3" fill="#ff7da2" opacity="0.4" />

                    {/* Glassy reflection */}
                    <path 
                        d="M30 35C40 25 60 25 70 35" 
                        stroke="white" 
                        strokeWidth="4" 
                        strokeLinecap="round" 
                        opacity="0.2" 
                    />
                </svg>

                {/* Pulsing Shadow */}
                <motion.div 
                    className={styles.shadow}
                    animate={{ 
                        scale: [1, 0.8, 1],
                        opacity: [0.2, 0.1, 0.2]
                    }}
                    transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
            </motion.div>
            
            {message && (
                <motion.p 
                    className={styles.message}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    {message}
                    <motion.span
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, times: [0, 0.5, 1] }}
                    >
                        ...
                    </motion.span>
                </motion.p>
            )}
        </div>
    );
};

export default BeeLoader;
