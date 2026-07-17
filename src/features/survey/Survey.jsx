import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronRight, Check } from 'lucide-react';
import Button from '../../components/ui/Button';
import LoadingScreen from '../../components/ui/LoadingScreen';
import { surveyService } from '../../services/surveyService';
import { courseService } from '../../services/courseService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import styles from './Survey.module.css';

const Survey = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const { t, language, toggleLanguage } = useLanguage();
    const [questions, setQuestions] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [selections, setSelections] = useState({});
    const [loading, setLoading] = useState(true);
    const { user, profile } = useAuth();
    const [isPreparing, setIsPreparing] = useState(false);
    const [prepareProgress, setPrepareProgress] = useState(0);

    useEffect(() => {
        const loadQuestions = async () => {
            try {
                // 1. Fetch course details to check status and visibility
                const courseData = await courseService.getCourseById(courseId).catch(() => null);
                const isAdmin = profile?.role === 'admin';
                if (courseData && courseData.status !== 'published' && !isAdmin) {
                    console.log('Access denied: Hidden course survey.');
                    navigate('/courses', { replace: true });
                    return;
                }

                const data = await surveyService.getQuestionsByCourse(courseId);
                setQuestions(data);
            } catch (error) {
                console.error("Error loading questions:", error);
            } finally {
                setLoading(false);
            }
        };
        loadQuestions();
    }, [courseId, profile, navigate]);

    const handleSelect = (optionId) => {
        setSelections({
            ...selections,
            [currentStep]: optionId
        });
    };

    const handleContinue = async () => {
        if (currentStep < questions.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            setIsPreparing(true);
            
            // Start progress simulation (3 seconds)
            const duration = 3000;
            const step = 40;
            const increment = 100 / (duration / step);
            
            const timer = setInterval(() => {
                setPrepareProgress(prev => {
                    const next = prev + increment;
                    if (next >= 100) {
                        clearInterval(timer);
                        return 100;
                    }
                    return next;
                });
            }, step);

            // Countdown timer sync (removed timeLeft update)

            const finalizeTransition = () => {
                setTimeout(() => {
                    navigate(`/learn/${courseId}`);
                }, duration + 600); 
            };

            if (user) {
                try {
                    await surveyService.saveSurveyResponse(courseId, selections);
                    finalizeTransition();
                } catch (error) {
                    console.error("Error saving survey:", error);
                    await courseService.enrollUserInCourse(user.id, courseId);
                    finalizeTransition();
                }
            } else {
                localStorage.setItem('pending_enrollment', JSON.stringify({
                    courseId,
                    selections,
                    surveyCompleted: true
                }));
                finalizeTransition();
            }
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        } else {
            navigate(-1);
        }
    };

    if (loading || (questions.length === 0 && !loading)) {
        return <LoadingScreen />;
    }

    const currentQuestion = questions[currentStep];
    const progress = ((currentStep + 1) / questions.length) * 100;

    if (isPreparing) {
        return (
            <div className={styles.preparingWrapper}>
                <div className={styles.preparingContent}>
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={styles.preparingMascot}
                    >
                        <DotLottieReact
                            src="/models/Bee looking.lottie"
                            loop
                            autoplay
                        />
                    </motion.div>
                    
                    <div className={styles.preparingDetails}>
                        <h2 className={styles.preparingText}>
                            {language === 'bn' ? 'আপনার কোর্সটি প্রস্তুত করা হচ্ছে...' : 'Preparing your course...'}
                        </h2>
                        <div className={styles.preparingProgressBar}>
                            <div 
                                className={styles.preparingProgressFill} 
                                style={{ width: `${prepareProgress}%` }}
                            />
                        </div>
                        <div className={styles.preparingPercentage}>
                            {language === 'bn' ? Math.round(prepareProgress).toLocaleString('bn-BD') : Math.round(prepareProgress)}%
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.surveyWrapper}>
            <header className={styles.topBar}>
                <div className={styles.topBarContent}>
                    <button 
                        className={styles.backBtn} 
                        onClick={handleBack}
                        aria-label={t('go_back')}
                    >
                        <ArrowLeft size={24} />
                    </button>
                    {/* Add question step indicator if needed */}
                    <span className={styles.stepIndicator}>
                        {t('step')} {language === 'bn' ? (currentStep + 1).toLocaleString('bn-BD') : currentStep + 1} / {language === 'bn' ? questions.length.toLocaleString('bn-BD') : questions.length}
                    </span>
                </div>
                <div className={styles.progressContainer}>
                    <div
                        className={styles.progressBar}
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            </header>

            <main className={styles.mainContent}>
                <section className={styles.characterArea}>
                    <motion.div
                        key={`buddy-${currentStep}`}
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{
                            duration: 0.6,
                            ease: [0.22, 1, 0.36, 1]
                        }}
                        className={styles.lottieWrapper}
                    >
                        <DotLottieReact
                            src="/models/Bee looking.lottie"
                            loop
                            autoplay
                        />
                    </motion.div>
                    
                    <motion.div
                        key={`question-${currentStep}`}
                        initial={{ opacity: 0, scale: 0.8, x: -20, originX: 0 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        transition={{
                            delay: 0.1,
                            duration: 0.5,
                            type: "spring",
                            stiffness: 100,
                            damping: 15
                        }}
                        className={styles.speechBubble}
                    >
                        {language === 'bn' ? currentQuestion.questionBn : currentQuestion.questionEn}
                    </motion.div>
                </section>

                <div className={styles.optionsGrid}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={`options-${currentStep}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            style={{ display: 'contents' }}
                        >
                            {currentQuestion.options.map((option, index) => (
                                <motion.div
                                    key={option.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{
                                        delay: 0.3 + (index * 0.05),
                                        duration: 0.3
                                    }}
                                    whileHover={{ scale: 1.005 }}
                                    className={`${styles.optionCard} ${selections[currentStep] === option.id ? styles.selected : ''}`}
                                    onClick={() => handleSelect(option.id)}
                                >
                                    <div className={styles.optionNumber}>
                                        {selections[currentStep] === option.id ? (
                                            <Check size={18} strokeWidth={3} />
                                        ) : (
                                            language === 'bn' ? (index + 1).toLocaleString('bn-BD') : index + 1
                                        )}
                                    </div>
                                    <span>{language === 'bn' ? option.textBn : option.textEn}</span>
                                </motion.div>
                            ))}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            <footer className={styles.bottomBar}>
                <div className={styles.continueBtnWrapper}>
                    <Button
                        variant="primary"
                        className={styles.continueBtn}
                        onClick={handleContinue}
                        disabled={!selections[currentStep]}
                    >
                        {currentStep === questions.length - 1 ? t('survey_complete') : t('survey_continue')}
                        {selections[currentStep] && <ChevronRight size={18} style={{ marginLeft: '8px' }} />}
                    </Button>
                </div>
            </footer>
        </div>
    );
};

export default Survey;
