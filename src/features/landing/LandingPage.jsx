import React from 'react';
import Navbar from '../../components/layout/Navbar';
import Hero from './Hero';
import CourseSection from './CourseSection';
import BiteSizedSection from './BiteSizedSection';
import GamifiedLearningSection from './GamifiedLearningSection';
import BattleSection from './BattleSection';
import CertificateSection from './CertificateSection';
import FeaturesSection from './FeaturesSection';
import HowItWorks from './HowItWorks';
import MissionSection from './MissionSection';
import Footer from '../../components/layout/Footer';
import styles from './LandingPage.module.css';
import { motion } from 'framer-motion';

const LandingPage = () => {
    return (
        <div className={styles.landingPage}>
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
                <div id="features">
                    <FeaturesSection />
                </div>
                <HowItWorks />
                <MissionSection />
                <Footer />

            </motion.div>
        </div>
    );
};

export default LandingPage;
