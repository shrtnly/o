import React, { useState, useEffect } from 'react';
import Button from '../../components/ui/Button';
import styles from './Hero.module.css';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

const MotionDiv = motion.div;
const MotionSpan = motion.span;

const animatedWords = [
    "একাডেমিক",
    "নন -একাডেমিক",
    "নলেজ-বেজড বই",

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
                            <span className={styles.titleLine}>গেম খেলে শিখুন</span>
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
                            শুধু ভিডিও দেখে নয়, ইন্টারেক্টিভ স্টোরি, কুইজ ও গ্যামিফিকেশন অভিজ্ঞতার মাধ্যমে শেখাকে করা হয়েছে আরও কার্যকর, মজার ও বাস্তবমুখী।
                        </p>

                        <div className={styles.cta}>
                            <Button
                                variant="primary3d"
                                className={styles.mainBtn}
                                onClick={() => window.location.href = '/courses'}
                            >
                                ফ্রিতে শেখা শুরু করুন
                            </Button>
                        </div>
                    </div>

                    <MotionDiv
                        className={styles.imageContent}
                        initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.95, y: 15 }}
                        animate={shouldReduceMotion ? undefined : { opacity: 1, scale: 1, y: 0 }}
                        transition={{ delay: 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <img
                            src="/beelessonhero.webp"
                            alt="BeeLesson Hero"
                            className={styles.heroImg}
                            loading="eager"
                        />
                    </MotionDiv>
                </div>
            </MotionDiv>

        </section>
    );
};

export default Hero;
