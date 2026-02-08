import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Heart, Check, Lightbulb, Star, ArrowRight, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useHeartRefill } from '../../hooks/useHeartRefill';
import { rewardService } from '../../services/rewardService';
import styles from './StudyPage.module.css';

const StudyPage = () => {
    const { courseId, chapterId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Use heart refill system
    const {
        hearts,
        maxHearts,
        refillTimeDisplay,
        deductHeart,
        canAnswer,
        needsRefill,
        loading: heartsLoading
    } = useHeartRefill(user?.id);

    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(0);
    const [showResults, setShowResults] = useState(false);
    const [stats, setStats] = useState({ correct: 0, total: 0 });
    const [shake, setShake] = useState(false);
    const [showNoHeartsModal, setShowNoHeartsModal] = useState(false);

    useEffect(() => {
        const fetchContent = async () => {
            setLoading(true);
            try {
                // Fetch hierarchy content: Point -> Questions -> Options
                const { data: points, error: pErr } = await supabase
                    .from('learning_points')
                    .select('*, mcq_questions(*, mcq_options(*))')
                    .eq('chapter_id', chapterId)
                    .order('order_index', { ascending: true });

                if (pErr) throw pErr;

                if (points && points.length > 0) {
                    // Flatten into questions list while preserving narrative context from point
                    const enrichedQuestions = [];
                    points.forEach(point => {
                        if (point.mcq_questions && point.mcq_questions.length > 0) {
                            point.mcq_questions.sort((a, b) => a.order_index - b.order_index).forEach(q => {
                                enrichedQuestions.push({
                                    ...q,
                                    narrative: point.content,
                                    mcq_options: q.mcq_options.sort((a, b) => a.order_index - b.order_index)
                                });
                            });
                        }
                    });

                    setQuestions(enrichedQuestions);
                    setStats(prev => ({ ...prev, total: enrichedQuestions.length }));
                }

                // Hearts are now managed by useHeartRefill hook
                // No need to fetch hearts here
            } catch (err) {
                console.error('Error fetching study content:', err);
            } finally {
                setLoading(false);
            }
        };

        if (chapterId) fetchContent();
    }, [chapterId, user]);

    const handleOptionSelect = (optionId) => {
        if (isAnswered) return;
        setSelectedOption(optionId);
    };

    const handleCheck = async () => {
        if (!selectedOption || isAnswered) return;

        // Check if user has hearts to answer
        if (!canAnswer) {
            setShowNoHeartsModal(true);
            return;
        }

        const currentQuestion = questions[currentIndex];
        const selected = currentQuestion.mcq_options.find(o => o.id === selectedOption);

        const correct = !!selected?.is_correct;
        setIsCorrect(correct);
        setIsAnswered(true);

        if (correct) {
            setStats(prev => ({ ...prev, correct: prev.correct + 1 }));
        } else {
            // Deduct heart using the hook
            setShake(true);
            setTimeout(() => setShake(false), 500);

            if (user) {
                await deductHeart(1);
            }
        }

        setProgress(((currentIndex + 1) / questions.length) * 100);
    };

    const handleNext = async () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setSelectedOption(null);
            setIsAnswered(false);
            setIsCorrect(false);
        } else {
            // Chapter Completed!
            if (user && courseId && chapterId) {
                try {
                    const earnedXp = stats.correct; // 1 XP per correct answer

                    // 1. Update or Insert Progress with detailed statistics
                    const { data: existingProgress } = await supabase
                        .from('user_progress')
                        .select('id, xp_earned')
                        .eq('user_id', user.id)
                        .eq('chapter_id', chapterId)
                        .single();

                    if (!existingProgress) {
                        await supabase.from('user_progress').insert({
                            user_id: user.id,
                            course_id: courseId,
                            chapter_id: chapterId,
                            is_completed: true,
                            completed_at: new Date().toISOString(),
                            total_questions: stats.total,
                            correct_answers: stats.correct,
                            xp_earned: earnedXp,
                            last_accessed: new Date().toISOString()
                        });
                    } else {
                        await supabase.from('user_progress')
                            .update({
                                is_completed: true,
                                completed_at: new Date().toISOString(),
                                total_questions: stats.total,
                                correct_answers: stats.correct,
                                xp_earned: earnedXp,
                                last_accessed: new Date().toISOString()
                            })
                            .eq('id', existingProgress.id);
                    }

                    // 2. Award XP using reward service (Handles both RPC and manual fallback)
                    if (earnedXp > 0) {
                        console.log('StudyPage - Awarding XP via RewardService:', {
                            userId: user.id,
                            amount: earnedXp,
                            chapterId,
                            courseId
                        });

                        const result = await rewardService.awardXP(user.id, earnedXp, 'chapter_complete', {
                            chapterId,
                            courseId,
                            total_questions: stats.total,
                            correct_answers: stats.correct,
                            accuracy: Math.round((stats.correct / (stats.total || 1)) * 100)
                        });

                        if (result.success) {
                            console.log('StudyPage - Successfully awarded XP and logged activity!');
                        } else {
                            console.error('StudyPage - Failed to award XP even with fallback.');
                        }
                    }
                } catch (err) {
                    console.error('Error updating progress:', err);
                }
            }
            setShowResults(true);
        }
    };

    if (loading) return (
        <div className={styles.loadingContainer}>
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className={styles.loader}
            />
        </div>
    );

    if (questions.length === 0) return (
        <div className={styles.loadingContainer}>
            <div className="text-center space-y-4">
                <h2 className="text-xl font-bold">এই অধ্যায়ে কোনো প্রশ্ন পাওয়া যায়নি।</h2>
                <button
                    onClick={() => navigate(-1)}
                    className="bg-blue-500 text-white px-6 py-2 rounded-xl"
                >
                    ফিরে যান
                </button>
            </div>
        </div>
    );

    const currentQuestion = questions[currentIndex];
    const optionLabels = ['A', 'B', 'C', 'D', 'E'];

    return (
        <div className={styles.studyPage}>
            {/* Minimalist Top Bar */}
            <header className={styles.header}>
                <button className={styles.closeBtn} onClick={() => navigate(-1)}>
                    <X size={24} strokeWidth={3} />
                </button>
                <div className={styles.progressContainer}>
                    <div className={styles.progressBar}>
                        <motion.div
                            className={styles.progressFill}
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                    </div>
                </div>
                <div className={styles.heartsContainer}>
                    <motion.div
                        animate={shake ? { x: [-5, 5, -5, 5, 0] } : {}}
                        transition={{ duration: 0.4 }}
                    >
                        <Heart size={24} color="#ff4b4b" fill="#ff4b4b" strokeWidth={0} />
                    </motion.div>
                    <span className={styles.heartCount}>{hearts}</span>
                    {needsRefill && refillTimeDisplay && (
                        <span className={styles.refillTimer}>
                            <Clock size={12} />
                            {refillTimeDisplay}
                        </span>
                    )}
                </div>
            </header>

            <main className={styles.mainContent}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className={styles.questionSection}
                    >
                        {/* Read & Answer Context */}
                        {(currentQuestion.narrative || currentQuestion.explanation) && (
                            <motion.div
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className={styles.contextText}
                            >
                                <span className={styles.lightbulb}><Lightbulb size={20} color="#1cb0f6" /></span>
                                {currentQuestion.narrative?.replace(/^💡\s*পড়াশোনার বিষয়\/হিন্ট:\s*/, '').trim() || "মনোযোগ দিয়ে পড়ুন..."}
                            </motion.div>
                        )}

                        {/* Question Title */}
                        <motion.h2
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className={styles.questionTitle}
                        >
                            {currentQuestion.question_text || "সফলভাবে শেখার জন্য সঠিক উত্তরটি নির্বাচন করুন"}
                        </motion.h2>

                        {/* Stacked Options */}
                        <div className={styles.optionsList}>
                            {(currentQuestion.mcq_options || []).map((option, idx) => (
                                <motion.button
                                    key={option.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 + (idx * 0.1) }}
                                    whileHover={!isAnswered ? { scale: 1.01 } : {}}
                                    whileTap={!isAnswered ? { scale: 0.98 } : {}}
                                    className={`
                                        ${styles.optionBtn} 
                                        ${selectedOption === option.id ? styles.selected : ''} 
                                        ${isAnswered && option.is_correct && isCorrect ? styles.correct : ''} 
                                        ${isAnswered && selectedOption === option.id && !option.is_correct ? styles.incorrect : ''}
                                    `}
                                    onClick={() => handleOptionSelect(option.id)}
                                    disabled={isAnswered}
                                >
                                    <div className={styles.optionIndex}>{optionLabels[idx] || (idx + 1)}</div>
                                    <span className={styles.optionText}>{option.option_text}</span>

                                    {isAnswered && option.is_correct && isCorrect && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className={styles.correctIcon}
                                        >
                                            <Check size={20} strokeWidth={3} />
                                        </motion.div>
                                    )}
                                    {isAnswered && selectedOption === option.id && !option.is_correct && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className={styles.incorrectIcon}
                                        >
                                            <X size={20} strokeWidth={3} />
                                        </motion.div>
                                    )}
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Dynamic Footer */}
            <footer className={`
                ${styles.footer} 
                ${isAnswered ? (isCorrect ? styles.footerCorrect : styles.footerIncorrect) : ''}
            `}>
                <div className={styles.footerContent}>
                    {!isAnswered ? (
                        <>
                            <button
                                className={styles.skipBtn}
                                onClick={handleNext}
                            >
                                এগিয়ে যান
                            </button>
                            <button
                                className={styles.checkBtn}
                                disabled={!selectedOption}
                                onClick={handleCheck}
                            >
                                যাচাই করুন
                            </button>
                        </>
                    ) : (
                        <motion.div
                            initial={{ y: 100 }}
                            animate={{ y: 0 }}
                            className={styles.resultOverlay}
                        >
                            <div className={styles.resultCardInner}>
                                <div className={styles.resultStatus}>
                                    <div className={styles.statusHeader}>
                                        {isCorrect ? (
                                            <div className={styles.statusIcon}>
                                                <Check size={24} strokeWidth={4} />
                                            </div>
                                        ) : (
                                            <div className={styles.statusIcon}>
                                                <X size={24} strokeWidth={4} />
                                            </div>
                                        )}
                                        <h3>{isCorrect ? "সঠিক উত্তর" : "ভুল উত্তর"}</h3>
                                    </div>
                                    <p className={styles.explanationText}>
                                        {isCorrect
                                            ? "আপনার উত্তরটি সঠিক হয়েছে।"
                                            : currentQuestion.explanation || "পরের বার আরও ভালো করবেন।"
                                        }
                                    </p>
                                </div>
                                <button className={styles.continueBtn} onClick={handleNext}>
                                    <span>{currentIndex < questions.length - 1 ? "চালিয়ে যান" : "সম্পন্ন করুন"}</span>
                                    <ArrowRight size={20} strokeWidth={3} />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </div>
            </footer>

            {/* Premium Result Modal */}
            <AnimatePresence>
                {showResults && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={styles.resultModal}
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            transition={{ type: "spring", damping: 15 }}
                            className={styles.resultCard}
                        >
                            <div className={styles.chartContainer}>
                                <svg viewBox="0 0 100 100" className={styles.radialChart}>
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="45"
                                        className={styles.chartBg}
                                    />
                                    <motion.circle
                                        cx="50"
                                        cy="50"
                                        r="45"
                                        className={styles.chartFill}
                                        initial={{ strokeDasharray: "0 283" }}
                                        animate={{ strokeDasharray: `${(stats.correct / (stats.total || 1)) * 283} 283` }}
                                        transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                                    />
                                </svg>
                                <div className={styles.chartText}>
                                    <motion.span
                                        initial={{ opacity: 0, scale: 0.5 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 1 }}
                                    >
                                        {Math.round((stats.correct / (stats.total || 1)) * 100)}%
                                    </motion.span>
                                    <p>সফলতা</p>
                                </div>
                            </div>

                            <div className={styles.statsSummary}>
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 1.2 }}
                                    className={styles.summaryItem}
                                >
                                    <div className={styles.summaryIcon} style={{ background: 'rgba(88, 204, 2, 0.1)' }}>
                                        <Check size={20} color="#58cc02" />
                                    </div>
                                    <div className={styles.summaryInfo}>
                                        <span>সঠিক উত্তর</span>
                                        <strong>{stats.correct}</strong>
                                    </div>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 1.3 }}
                                    className={styles.summaryItem}
                                >
                                    <div className={styles.summaryIcon} style={{ background: 'rgba(255, 75, 75, 0.1)' }}>
                                        <X size={20} color="#ff4b4b" />
                                    </div>
                                    <div className={styles.summaryInfo}>
                                        <span>ভুল উত্তর</span>
                                        <strong>{stats.total - stats.correct}</strong>
                                    </div>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 1.4 }}
                                    className={styles.summaryItem}
                                >
                                    <div className={styles.summaryIcon} style={{ background: 'rgba(28, 176, 246, 0.1)' }}>
                                        <Star size={20} color="#1cb0f6" />
                                    </div>
                                    <div className={styles.summaryInfo}>
                                        <span>অর্জিত XP</span>
                                        <strong>+{stats.correct}</strong>
                                    </div>
                                </motion.div>
                            </div>

                            <motion.button
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 1.6 }}
                                className={styles.finishBtn}
                                onClick={() => navigate(-1)}
                            >
                                চালিয়ে যান
                            </motion.button>
                        </motion.div>

                        {/* Background Confetti Effect Particles */}
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                            {[...Array(20)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    initial={{
                                        top: "100%",
                                        left: `${Math.random() * 100}%`,
                                        scale: Math.random() * 0.5 + 0.5,
                                        rotate: 0
                                    }}
                                    animate={{
                                        top: "-10%",
                                        left: `${Math.random() * 100}%`,
                                        rotate: 360
                                    }}
                                    transition={{
                                        duration: Math.random() * 2 + 2,
                                        delay: i * 0.1,
                                        repeat: Infinity,
                                        ease: "linear"
                                    }}
                                    style={{
                                        position: 'absolute',
                                        width: '8px',
                                        height: '8px',
                                        backgroundColor: ['#1cb0f6', '#58cc02', '#ff4b4b', '#ffc800'][i % 4],
                                        borderRadius: i % 2 === 0 ? '50%' : '2px'
                                    }}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* No Hearts Modal */}
            <AnimatePresence>
                {showNoHeartsModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={styles.resultModal}
                        onClick={() => setShowNoHeartsModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            transition={{ type: "spring", damping: 15 }}
                            className={styles.resultCard}
                            onClick={(e) => e.stopPropagation()}
                            style={{ maxWidth: '400px' }}
                        >
                            <div style={{ textAlign: 'center', padding: '20px' }}>
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                                    style={{ fontSize: '64px', marginBottom: '20px' }}
                                >
                                    💔
                                </motion.div>

                                <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '12px', color: '#fff' }}>
                                    হার্ট শেষ হয়ে গেছে!
                                </h2>

                                <p style={{ fontSize: '14px', color: '#afafaf', marginBottom: '24px' }}>
                                    আপনার সব হার্ট শেষ হয়ে গেছে। পরবর্তী রিফিলের জন্য অপেক্ষা করুন অথবা মিস্ট্রি বক্স থেকে হার্ট পান।
                                </p>

                                <div style={{
                                    background: 'rgba(255, 75, 75, 0.1)',
                                    border: '2px solid #ff4b4b',
                                    borderRadius: '16px',
                                    padding: '20px',
                                    marginBottom: '24px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '8px' }}>
                                        <Heart size={32} fill="#ff4b4b" color="#ff4b4b" />
                                        <span style={{ fontSize: '32px', fontWeight: 900, color: '#fff' }}>
                                            {hearts}
                                        </span>
                                    </div>

                                    {refillTimeDisplay && (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
                                            <Clock size={20} color="#1cb0f6" />
                                            <span style={{ fontSize: '18px', fontWeight: 700, color: '#1cb0f6' }}>
                                                রিফিল হবে: {refillTimeDisplay}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <button
                                    className={styles.finishBtn}
                                    onClick={() => setShowNoHeartsModal(false)}
                                    style={{ width: '100%' }}
                                >
                                    ঠিক আছে
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
};

export default StudyPage;
