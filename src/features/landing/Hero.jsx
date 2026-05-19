import React, { useState, useEffect } from 'react';
import Button from '../../components/ui/Button';
import styles from './Hero.module.css';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import BeeModel from './BeeModel';

const MotionDiv = motion.div;
const MotionSpan = motion.span;

const animatedWords = [
    "ক্যারিয়ার গাইড",
    "আইনি সচেতনতা",
    "শ্রম আইন",
    "ডিজিটাল নিরাপত্তা",
    "নাগরিক অধিকার",
    "আর্থিক সচেতনতা",
    "স্মার্ট ব্যাংকিং"
];

const Hero = () => {
    const [wordIndex, setWordIndex] = useState(0);
    const shouldReduceMotion = useReducedMotion();

    useEffect(() => {
        if (shouldReduceMotion) return undefined;
        const interval = setInterval(() => {
            setWordIndex((prev) => (prev + 1) % animatedWords.length);
        }, 2800);
        return () => clearInterval(interval);
    }, [shouldReduceMotion]);

    const wordMotion = shouldReduceMotion
        ? {}
        : {
            initial: { opacity: 0, y: 26, filter: 'blur(6px)' },
            animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
            exit: { opacity: 0, y: -22, filter: 'blur(6px)' },
            transition: { duration: 0.48, ease: [0.22, 1, 0.36, 1] }
        };

    return (
        <section className={styles.hero}>
            <div className={styles.heroBg}>
                <div className={styles.overlay}></div>
            </div>

            <MotionDiv
                className={styles.container}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
                animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
                <div className={styles.content}>
                    <div className={styles.textContent}>
                        <h1 className={styles.title}>
                            <span className={styles.titleLine}>গেম খেলুন শিখতে থাকুন</span>
                            <span className={styles.wordWrapper}>
                                <AnimatePresence mode="wait">
                                    <MotionSpan
                                        key={animatedWords[wordIndex]}
                                        className={`${styles.highlight} ${styles.golden} ${styles.animatedWord}`}
                                        {...wordMotion}
                                    >
                                        {animatedWords[wordIndex]}
                                    </MotionSpan>
                                </AnimatePresence>
                            </span>
                        </h1>

                        <p className={styles.description}>
                            বোরিং লেকচার ভুলে যান! গেম খেলতে খেলতেই শিখুন রিয়েল লাইফ স্কিল এবং অর্জন করুন ভেরিফাইড সার্টিফিকেট।
                        </p>

                        <div className={styles.cta}>
                            <Button
                                variant="primary"
                                className={styles.mainBtn}
                                onClick={() => window.location.href = '/auth'}
                            >
                                শেখা শুরু করুন
                            </Button>
                            <Button
                                variant="outline"
                                className={styles.secondaryBtn}
                                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                            >
                                ফিচারগুলো দেখুন
                            </Button>
                        </div>
                    </div>

                    <MotionDiv
                        className={styles.imageContent}
                        aria-hidden="true"
                        initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.9, y: 20 }}
                        animate={shouldReduceMotion ? undefined : { opacity: 1, scale: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <BeeModel className={styles.beeLottie} />
                    </MotionDiv>
                </div>
            </MotionDiv>

        </section>
    );
};

export default Hero;
