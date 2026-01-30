import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { ArrowLeft } from 'lucide-react';
import Button from '../../components/ui/Button';
import { surveyService } from '../../services/surveyService';
import styles from './Survey.module.css';

const Survey = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const [questions, setQuestions] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [selections, setSelections] = useState({});
    const [loading, setLoading] = useState(true);

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
            // Save results and redirect to learning page
            await surveyService.saveSurveyResponse(courseId, selections);
            navigate(`/learn/${courseId}`);
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
                <button className={styles.backBtn} onClick={() => navigate(-1)}>
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
                    <div className={styles.lottieWrapper}>
                        <DotLottieReact
                            src="https://lottie.host/5bcd5231-cb69-4122-875d-aa86dfc0f832/6NuZNI7yn3.lottie"
                            loop
                            autoplay
                        />
                    </div>
                    <div className={styles.speechBubble}>
                        {currentQuestion.question}
                    </div>
                </div>

                <div className={styles.optionsGrid}>
                    {currentQuestion.options.map((option, index) => (
                        <div
                            key={option.id}
                            className={`${styles.optionCard} ${selections[currentStep] === option.id ? styles.selected : ''}`}
                            onClick={() => handleSelect(option.id)}
                        >
                            <div className={styles.optionNumber}>{index + 1}</div>
                            <span>{option.text}</span>
                        </div>
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
