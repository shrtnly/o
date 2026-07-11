import React from 'react';
import Navbar from '../../components/layout/Navbar';
import Hero from './Hero';
import CourseSection from './CourseSection';
import BiteSizedSection from './BiteSizedSection';
import GamifiedLearningSection from './GamifiedLearningSection';
import BattleSection from './BattleSection';
import CertificateSection from './CertificateSection';
import Footer from '../../components/layout/Footer';
import styles from './LandingPage.module.css';
import { motion } from 'framer-motion';
import SEO from '../../components/SEO';
import { useLanguage } from '../../context/LanguageContext';

const LandingPage = () => {
    const { language } = useLanguage();
    const isBn = language === 'bn';

    const seoTitle = isBn 
        ? 'বি লেসন (BeeLesson) | গেম খেলে শিখুন ক্যারিয়ার ও আইনি সচেতনতা' 
        : 'BeeLesson | Gamified Learning Platform for Career & Legal Skills';
        
    const seoDescription = isBn 
        ? 'বি লেসন (BeeLesson) বাংলাদেশের প্রথম গ্যামিফাইড লার্নিং প্ল্যাটফর্ম। ইন্টারেক্টিভ কুইজ ও গেম খেলার মাধ্যমে ফ্রিতে শিখুন ক্যারিয়ার গাইড, আইনি সচেতনতা, ডিজিটাল নিরাপত্তা ও স্মার্ট ব্যাংকিং।' 
        : 'BeeLesson is Bangladesh\'s first gamified learning platform. Learn career skills, legal awareness, digital security, and smart banking through interactive stories, quizzes, and games.';

    const schema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebSite",
                "@id": "https://www.beelesson.com/#website",
                "url": "https://www.beelesson.com",
                "name": "BeeLesson",
                "description": seoDescription,
                "publisher": {
                    "@id": "https://www.beelesson.com/#organization"
                },
                "potentialAction": {
                    "@type": "SearchAction",
                    "target": "https://www.beelesson.com/courses?search={search_term_string}",
                    "query-input": "required name=search_term_string"
                },
                "inLanguage": isBn ? "bn-BD" : "en-US"
            },
            {
                "@type": "Organization",
                "@id": "https://www.beelesson.com/#organization",
                "name": "BeeLesson",
                "url": "https://www.beelesson.com",
                "logo": {
                    "@type": "ImageObject",
                    "url": "https://www.beelesson.com/favicon.png",
                    "caption": "BeeLesson Logo"
                }
            }
        ]
    };

    return (
        <div className={styles.landingPage}>
            <SEO 
                title={seoTitle} 
                description={seoDescription} 
                schema={schema}
            />
            <Navbar />
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
            >
                <Hero />
                <CourseSection />
                <BiteSizedSection />
                <GamifiedLearningSection />
                <BattleSection />
                <CertificateSection />
                <Footer />

            </motion.div>
        </div>
    );
};

export default LandingPage;
