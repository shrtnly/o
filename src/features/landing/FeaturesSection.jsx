import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Swords, Zap, Award, ShoppingBag, Users } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import styles from './FeaturesSection.module.css';

const FeaturesSection = () => {
    const { t, language } = useLanguage();

    const features = [
        {
            icon: <BookOpen size={32} />,
            title: language === 'bn' ? 'ইন্টারেক্টিভ লার্নিং' : 'Interactive Learning',
            desc: language === 'bn' ? 'মজাদার অ্যানিমেশন এবং কুইজের মাধ্যমে শিখুন সহজে।' : 'Learn easily through fun animations and interactive quizzes.',
            color: '#3498db'
        },
        {
            icon: <Swords size={32} />,
            title: language === 'bn' ? 'ব্যাটেল রুম' : 'Battle Room',
            desc: language === 'bn' ? 'বন্ধুদের সাথে রিয়েল-টাইম প্রতিযোগিতায় অংশ নিন।' : 'Participate in real-time competitions with your friends.',
            color: '#e74c3c'
        },
        {
            icon: <Zap size={32} />,
            title: language === 'bn' ? 'দৈনিক স্ট্রিক' : 'Daily Streak',
            desc: language === 'bn' ? 'প্রতিদিন শিখুন এবং নিজের ধারাবাহিকতা বজায় রাখুন।' : 'Learn every day and maintain your learning consistency.',
            color: '#FFB800'
        },
        {
            icon: <Award size={32} />,
            title: language === 'bn' ? 'সার্টিফিকেট' : 'Certificates',
            desc: language === 'bn' ? 'কোর্স সম্পন্ন করে অর্জন করুন আকর্ষণীয় সার্টিফিকেট।' : 'Earn attractive certificates by completing courses.',
            color: '#2ecc71'
        },
        {
            icon: <ShoppingBag size={32} />,
            title: language === 'bn' ? 'শপ ও রিওয়ার্ড' : 'Shop & Rewards',
            desc: language === 'bn' ? 'অর্জিত XP দিয়ে কিনুন বিশেষ পাওয়ার-আপ এবং আইটেম।' : 'Buy special power-ups and items with your earned XP.',
            color: '#9b59b6'
        },
        {
            icon: <Users size={32} />,
            title: language === 'bn' ? 'লার্নার কমিউনিটি' : 'Learner Community',
            desc: language === 'bn' ? 'অন্যান্য শিক্ষার্থীদের সাথে যুক্ত হোন এবং একসাথে শিখুন।' : 'Connect with other learners and learn together.',
            color: '#1abc9c'
        }
    ];

    return (
        <section className={styles.features}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h2 className={styles.title}>
                        {language === 'bn' ? 'আমাদের বিশেষত্ব' : 'Our Features'}
                    </h2>
                    <p className={styles.subtitle}>
                        {language === 'bn' ? 'আপনার শেখার যাত্রাকে আরও আকর্ষণীয় করতে আমাদের রয়েছে দারুণ সব ফিচার।' : 'We have amazing features to make your learning journey more engaging.'}
                    </p>
                </div>

                <div className={styles.grid}>
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            className={styles.card}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ y: -10, transition: { duration: 0.2 } }}
                        >
                            <div className={styles.iconWrapper} style={{ '--feature-color': feature.color }}>
                                {feature.icon}
                            </div>
                            <h3 className={styles.featureTitle}>{feature.title}</h3>
                            <p className={styles.featureDesc}>{feature.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FeaturesSection;
