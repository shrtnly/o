import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import Button from '../../components/ui/Button';
import { surveyService } from '../../services/surveyService';
import { courseService } from '../../services/courseService';
import { useAuth } from '../../context/AuthContext';
import styles from './Survey.module.css';

const Survey = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const [questions, setQuestions] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [selections, setSelections] = useState({});
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        const loadQuestions = async () => {
            const data = await surveyService.getQuestionsByCourse(courseId);
            setQuestions(data);
            setLoading(false);
        };
        loadQuestions();
    }, [courseId]);

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
            if (user) {
                try {
                    await surveyService.saveSurveyResponse(courseId, selections);
                    navigate(`/learn/${courseId}`);
                } catch (error) {
                    console.error("Error saving survey:", error);
                    await courseService.enrollUserInCourse(user.id, courseId);
                    navigate(`/learn/${courseId}`);
                }
            } else {
                localStorage.setItem('pending_enrollment', JSON.stringify({
                    courseId,
                    selections,
                    surveyCompleted: true
                }));
                navigate('/auth');
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

    if (loading || questions.length === 0) {
        return <div className={styles.surveyWrapper}>Loading...</div>;
    }

    const currentQuestion = questions[currentStep];
    const progress = ((currentStep + 1) / questions.length) * 100;

    return (
        <div className={styles.surveyWrapper}>
            <div className={styles.topBar}>
                <button className={styles.backBtn} onClick={handleBack}>
                    <ArrowLeft size={24} />
                </button>
                <div className={styles.progressContainer}>
                    <div
                        className={styles.progressBar}
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            </div>

            <main className={styles.mainContent}>
                <div className={styles.characterArea}>
                    <motion.div
                        key={`buddy-${currentStep}`}
                        initial={{ opacity: 0, x: -50, scale: 0.7, rotate: -10 }}
                        animate={{ opacity: 1, x: 0, scale: 1, rotate: 0 }}
                        transition={{
                            duration: 0.6,
                            type: "spring",
                            stiffness: 260,
                            damping: 20
                        }}
                        className={styles.lottieWrapper}
                    >
                        <DotLottieReact
                            src="https://lottie.host/8ab6daa9-e871-43cd-bfcf-e5832fe9037d/YX1TPvuAvM.lottie"
                            loop
                            autoplay
                        />
                    </motion.div>
                    <motion.div
                        key={`question-${currentStep}`}
                        initial={{ opacity: 0, x: 30, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        transition={{
                            delay: 0.3,
                            duration: 0.5,
                            type: "spring",
                            stiffness: 200,
                            damping: 15
                        }}
                        className={styles.speechBubble}
                    >
                        {currentQuestion.question}
                    </motion.div>
                </div>

                <div className={styles.optionsGrid}>
                    {currentQuestion.options.map((option, index) => (
                        <motion.div
                            key={option.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                                delay: 0.5 + (index * 0.1),
                                type: "spring",
                                stiffness: 300,
                                damping: 25
                            }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`${styles.optionCard} ${selections[currentStep] === option.id ? styles.selected : ''}`}
                            onClick={() => handleSelect(option.id)}
                        >
                            <div className={styles.optionNumber}>{index + 1}</div>
                            <span>{option.text}</span>
                        </motion.div>
                    ))}
                </div>
            </main>

            <div className={styles.bottomBar}>
                <div className={styles.continueBtnWrapper}>
                    <Button
                        variant="primary"
                        className={styles.continueBtn}
                        onClick={handleContinue}
                        disabled={!selections[currentStep]}
                    >
                        {currentStep === questions.length - 1 ? 'সম্পূর্ণ করুন' : 'চালিয়ে যান'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default Survey;
