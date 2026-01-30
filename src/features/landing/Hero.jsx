import React from 'react';
import Button from '../../components/ui/Button';
import styles from './Hero.module.css';
import heroImg from '../../assets/Hero_Dark.webp';

const Hero = () => {
    return (
        <section className={styles.hero}>
            <div className={styles.heroBg}>
                <img src={heroImg} alt="Hero Background" className={styles.bgImage} />
                <div className={styles.overlay}></div>
            </div>

            <div className={styles.container}>
                <div className={styles.content}>
                    <div className={styles.badge}>সময় কম, আগ্রহ বেশি?</div>

                    <h1 className={styles.title}>
                        সহজে ও বিনা মূল্যে <br />
                        <span className={styles.highlight}>দক্ষ হওয়ার আকর্ষণীয় পদ্ধতি!</span>
                    </h1>

                    <p className={styles.description}>
                        শিখতে থাকুন যখন খুশি, যেখানে খুশি — সহজ, মজার এবং কার্যকর উপায়ে।
                    </p>

                    <div className={styles.cta}>
                        <Button variant="primary" className={styles.mainBtn}>
                            শিখতে শুরু করুন
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '10px' }}><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Hero;
