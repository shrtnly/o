import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { supabase } from '../../lib/supabaseClient';
import { rewardService } from '../../services/rewardService';
import InlineLoader from '../../components/ui/InlineLoader';
import ConnectionSkeleton from './components/ConnectionSkeleton';
import LearnerConnection from '../profile/components/LearnerConnection';
import styles from './ConnectionPage.module.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords } from 'lucide-react';

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

    return (
        <div className={styles.connectionPage}>
            <div className={styles.container}>
                <AnimatePresence mode="wait">
                    {loading && !profile ? (
                        <motion.div
                            key="page-skeleton"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ConnectionSkeleton />
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="page-content"
                            initial={{ opacity: 0, scale: 0.99 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <header className={styles.pageHeader}>
                                <h1 className={styles.pageTitle}>
                                    <Swords className={styles.titleIcon} strokeWidth={2.5} />
                                    {language === 'bn' ? 'ব্যাটেল রুম' : 'Battle Room'}
                                </h1>
                            </header>

                            <div className={styles.connectionWrapper}>
                                <LearnerConnection 
                                    user={user} 
                                    userXp={profile?.xp || 0}
                                    userProfile={profile}
                                    onSelectLearner={(l) => {}} 
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default ConnectionPage;
