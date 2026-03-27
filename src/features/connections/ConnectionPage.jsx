import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { supabase } from '../../lib/supabaseClient';
import { rewardService } from '../../services/rewardService';
import InlineLoader from '../../components/ui/InlineLoader';
import LearnerConnection from '../profile/components/LearnerConnection';
import styles from './ConnectionPage.module.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Users } from 'lucide-react';

const ConnectionPage = () => {
    const { user } = useAuth();
    const { t, language } = useLanguage();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedLearner, setSelectedLearner] = useState(null);

    const fetchProfileData = useCallback(async () => {
        if (!user?.id) return;
        try {
            setLoading(true);
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            setProfile(profileData);
        } catch (error) {
            console.error('Error fetching profile for connections:', error);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchProfileData();
    }, [fetchProfileData]);

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <InlineLoader />
            </div>
        );
    }

    return (
        <div className={styles.connectionPage}>
            <div className={styles.container}>
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                >
                    <header className={styles.pageHeader}>
                        <h1 className={styles.pageTitle}>
                            <Users className={styles.titleIcon} strokeWidth={2.5} />
                            {language === 'bn' ? 'কানেকশন' : 'Connections'}
                        </h1>
                    </header>

                    <div className={styles.connectionWrapper}>
                        <LearnerConnection 
                            user={user} 
                            userXp={profile?.xp || 0}
                            onSelectLearner={setSelectedLearner}
                        />
                    </div>
                </motion.div>
            </div>

            {/* Reuse the Learner Profile Modal logic if needed, 
                but for now we focus on placing the component */}
        </div>
    );
};

export default ConnectionPage;
