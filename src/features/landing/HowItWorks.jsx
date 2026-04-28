import React from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Search, BookOpen, Trophy, Award } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import styles from './HowItWorks.module.css';

const HowItWorks = () => {
    const { language } = useLanguage();

    const steps = [
        {
            icon: <UserPlus size={24} />,
            title: language === 'bn' ? 'অ্যাকাউন্ট তৈরি করুন' : 'Join the Hive',
            desc: language === 'bn' ? 'খুব সহজে সাইন আপ করে আপনার প্রোফাইল তৈরি করুন।' : 'Sign up easily and create your learner profile.'
        },
        {
            icon: <Search size={24} />,
            title: language === 'bn' ? 'কোর্স নির্বাচন করুন' : 'Pick a Course',
            desc: language === 'bn' ? 'আপনার পছন্দের ডিজিটাল বা জীবনমুখী দক্ষতা বেছে নিন।' : 'Choose your favorite digital or life skills.'
        },
        {
            icon: <BookOpen size={24} />,
            title: language === 'bn' ? 'শেখা শুরু করুন' : 'Start Learning',
            desc: language === 'bn' ? 'ইন্টারেক্টিভ লেসন এবং কুইজের মাধ্যমে দক্ষতা অর্জন করুন।' : 'Gain skills through interactive lessons and quizzes.'
        },
        {
            icon: <Trophy size={24} />,
            title: language === 'bn' ? 'প্রতিযোগিতা করুন' : 'Compete & Earn',
            desc: language === 'bn' ? 'বন্ধুদের সাথে ব্যাটেল করে লিডারবোর্ডে এগিয়ে যান।' : 'Battle with friends and climb the leaderboard.'
        },
        {
            icon: <Award size={24} />,
            title: language === 'bn' ? 'সার্টিফিকেট অর্জন' : 'Get Certified',
            desc: language === 'bn' ? 'আপনার সাফল্যের স্বীকৃতিস্বরূপ সার্টিফিকেট পান।' : 'Get certificates as recognition of your success.'
        }
    ];

    return (
        <section className={styles.howItWorks}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h2 className={styles.title}>
                        {language === 'bn' ? 'কিভাবে কাজ করে?' : 'How It Works?'}
                    </h2>
                    <p className={styles.subtitle}>
                        {language === 'bn' ? 'মাত্র পাঁচটি সহজ ধাপে আপনার শেখার যাত্রা শুরু করুন।' : 'Start your learning journey in just five simple steps.'}
                    </p>
                </div>

                <div className={styles.stepsContainer}>
                    {steps.map((step, index) => (
                        <div key={index} className={styles.stepWrapper}>
                            <motion.div
                                className={styles.stepCard}
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <div className={styles.stepNumber}>{index + 1}</div>
                                <div className={styles.iconCircle}>
                                    {step.icon}
                                </div>
                                <div className={styles.stepContent}>
                                    <h3 className={styles.stepTitle}>{step.title}</h3>
                                    <p className={styles.stepDesc}>{step.desc}</p>
                                </div>
                            </motion.div>
                            {index < steps.length - 1 && (
                                <div className={styles.connector}></div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default HowItWorks;
