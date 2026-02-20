import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Check, Lightbulb, Star, ArrowRight, Clock, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { supabase } from '../../lib/supabaseClient';
import HoneyDropIcon from '../../components/HoneyDropIcon';
import { useAuth } from '../../context/AuthContext';
import { useHeartRefill } from '../../hooks/useHeartRefill';
import { rewardService } from '../../services/rewardService';
import LoadingScreen from '../../components/ui/LoadingScreen';

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
    const [dotLottie, setDotLottie] = useState(null);
    const [isSubLooping, setIsSubLooping] = useState(false);
    const [selectedAnimation, setSelectedAnimation] = useState('1'); // Default to animation 1
    const hasStarted = React.useRef(false);
    const hasPlayed = React.useRef(false);

    // Load animation preference from localStorage
    useEffect(() => {
        const savedAnimation = localStorage.getItem('studyPageAnimation');
        if (savedAnimation) {
            setSelectedAnimation(savedAnimation);
        }
    }, []);

    useEffect(() => {
        if (!dotLottie || selectedAnimation === 'none') return;

        // শুধু animation 1 এর জন্য বিশেষ লজিক
        if (selectedAnimation === '1') {
            // শুধু প্রথমবার সেগমেন্ট সেট করা
            if (!hasStarted.current) {
                dotLottie.setSegment(187, 330);
                dotLottie.setLoop(true);
                hasStarted.current = true;
            }

            const handleFrame = (event) => {
                const frame = Math.floor(event.currentFrame);

                // সাব-লুপ ট্রিগার - infinite loop
                if (frame >= 293 && frame <= 298 && !isSubLooping && !hasPlayed.current) {
                    setIsSubLooping(true);
                    hasPlayed.current = true;
                    dotLottie.setSegment(293, 305);
                    dotLottie.setLoop(true);
                    setTimeout(() => dotLottie.setMode('bounce'), 50);
                    // No timeout to stop - infinite loop
                }
            };

            dotLottie.addEventListener('frame', handleFrame);
            return () => {
                dotLottie.removeEventListener('frame', handleFrame);
            };
        }
        // অন্য অ্যানিমেশনগুলো শুধু infinite loop করবে (কোনো বিশেষ frame handling নেই)
    }, [dotLottie, isSubLooping, selectedAnimation]);

    useEffect(() => {
        const fetchContent = async () => {
            setLoading(true);
            try {
                const { data: points, error: pErr } = await supabase
                    .from('learning_points')
                    .select('*, mcq_questions(*, mcq_options(*))')
                    .eq('chapter_id', chapterId)
                    .order('order_index', { ascending: true });

                if (pErr) throw pErr;

                if (points && points.length > 0) {
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
            setShake(true);
            setTimeout(() => setShake(false), 500);
            if (user) await deductHeart(1);
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
            if (user && courseId && chapterId) {
                try {
                    const earnedXp = stats.correct;
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

                    if (earnedXp > 0) {
                        await rewardService.awardXP(user.id, earnedXp, 'chapter_complete', {
                            chapterId,
                            courseId,
                            total_questions: stats.total,
                            correct_answers: stats.correct,
                            accuracy: Math.round((stats.correct / (stats.total || 1)) * 100)
                        });
                    }
                } catch (err) {
                    console.error('Error updating progress:', err);
                }
            }
            setShowResults(true);
        }
    };

    if (loading) return <LoadingScreen />;

    if (questions.length === 0) return (
        <div className={styles.loadingContainer}>
            <div className="text-center space-y-4">
                <h2 className="text-xl font-bold">এই অধ্যায়ে কোনো প্রশ্ন পাওয়া যায়নি।</h2>
                <button onClick={() => navigate(-1)} className="bg-[#ff9902] text-white px-6 py-2 rounded-xl shadow-[0_4px_0_#e68a00] active:translate-y-1 active:shadow-none transition-all">ফিরে যান</button>
            </div>
        </div>
    );

    const currentQuestion = questions[currentIndex];
    const optionLabels = ['A', 'B', 'C', 'D', 'E'];

    return (
        <div className={styles.studyPage}>
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
                    <motion.div animate={shake ? { x: [-5, 5, -5, 5, 0] } : {}} transition={{ duration: 0.4 }}>
                        <HoneyDropIcon
                            size={28}
                            isEmpty={hearts === 0 && refillTimeDisplay}
                        />
                    </motion.div>
                    {!(hearts === 0 && refillTimeDisplay) && <span className={styles.heartCount}>{hearts}</span>}
                    {needsRefill && refillTimeDisplay && (
                        <span className={styles.refillTimer}>
                            <Clock size={12} />
                            {refillTimeDisplay}
                        </span>
                    )}
                </div>
            </header>

            <main className={styles.mainContent}>
                <div className={styles.studyContentWrapper}>
                    <AnimatePresence>
                        {selectedAnimation !== 'none' && (
                            <motion.div
                                className={styles.mascotArea}
                                initial={{ opacity: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.5 }}
                            >
                                <div className={styles.mascotWrapper}>
                                    <DotLottieReact
                                        src={
                                            selectedAnimation === '1' ? '/models/NewBee.lottie' :
                                                selectedAnimation === '2' ? '/models/Bee - lounging.lottie' :
                                                    selectedAnimation === '3' ? '/models/Bee looking.lottie' :
                                                        selectedAnimation === '4' ? '/models/Loading Flying Beee.lottie' :
                                                            selectedAnimation === '5' ? '/models/Happy Bee.lottie' :
                                                                '/models/NewBee.lottie'
                                        }
                                        autoplay={true}
                                        loop={true}
                                        speed={selectedAnimation === '1' && isSubLooping ? 0.4 : 1}
                                        dotLottieRefCallback={setDotLottie}
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentIndex}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className={styles.questionSection}
                        >
                            {(currentQuestion.narrative || currentQuestion.explanation) && (
                                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={styles.contextText}>
                                    <span className={styles.lightbulb}><Lightbulb size={20} color="#ff9902" /></span>
                                    {currentQuestion.narrative?.replace(/^💡\s*পড়াশোনার বিষয়\/হিন্ট:\s*/, '').trim() || "মনোযোগ দিয়ে পড়ুন..."}
                                </motion.div>
                            )}

                            <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className={styles.questionTitle}>
                                <HelpCircle className={styles.questionIcon} size={28} />
                                {currentQuestion.question_text || "সফলভাবে শেখার জন্য সঠিক উত্তরটি নির্বাচন করুন"}
                            </motion.h2>

                            <div className={styles.optionsList}>
                                {(currentQuestion.mcq_options || []).map((option, idx) => (
                                    <motion.button
                                        key={option.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4 + (idx * 0.1) }}
                                        whileHover={!isAnswered ? { scale: 1.01 } : {}}
                                        whileTap={!isAnswered ? { scale: 0.98 } : {}}
                                        className={`${styles.optionBtn} ${selectedOption === option.id ? styles.selected : ''} ${isAnswered && option.is_correct && isCorrect ? styles.correct : ''} ${isAnswered && selectedOption === option.id && !option.is_correct ? styles.incorrect : ''}`}
                                        onClick={() => handleOptionSelect(option.id)}
                                        disabled={isAnswered}
                                    >
                                        <div className={styles.optionIndex}>{optionLabels[idx] || (idx + 1)}</div>
                                        <span className={styles.optionText}>{option.option_text}</span>
                                        {isAnswered && option.is_correct && isCorrect && (
                                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={styles.correctIcon}><Check size={20} strokeWidth={3} /></motion.div>
                                        )}
                                        {isAnswered && selectedOption === option.id && !option.is_correct && (
                                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={styles.incorrectIcon}><X size={20} strokeWidth={3} /></motion.div>
                                        )}
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            <footer className={`${styles.footer} ${isAnswered ? (isCorrect ? styles.footerCorrect : styles.footerIncorrect) : ''}`}>
                <div className={styles.footerContent}>
                    {!isAnswered ? (
                        <>
                            <button className={styles.skipBtn} onClick={handleNext}>এগিয়ে যান</button>
                            <button className={styles.checkBtn} disabled={!selectedOption} onClick={handleCheck}>যাচাই করুন</button>
                        </>
                    ) : (
                        <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className={styles.resultOverlay}>
                            <div className={styles.resultCardInner}>
                                <div className={styles.resultStatus}>
                                    <div className={styles.statusHeader}>
                                        <div className={styles.statusIcon}>{isCorrect ? <Check size={24} strokeWidth={4} /> : <X size={24} strokeWidth={4} />}</div>
                                        <h3>{isCorrect ? "সঠিক উত্তর! 🍯" : "ওহ নো! একটি হানি ড্রপ হারিয়ে গেল! 🐝"}</h3>
                                    </div>
                                    <p className={styles.explanationText}>
                                        {isCorrect
                                            ? "আপনার উত্তরটি সঠিক হয়েছে।"
                                            : currentQuestion.explanation
                                                ? `ভুল থেকে শেখাই আসল শেখা। ${currentQuestion.explanation}`
                                                : `ভুল থেকে শেখাই আসল শেখা। আপনার কাছে আর মাত্র ${hearts}টি Honey Drop আছে।`
                                        }
                                    </p>
                                </div>
                                <button className={styles.continueBtn} onClick={handleNext}>
                                    <span>{currentIndex < questions.length - 1 ? "আবার চেষ্টা করি" : "সম্পন্ন করুন"}</span>
                                    <ArrowRight size={20} strokeWidth={3} />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </div>
            </footer>

            <AnimatePresence>
                {showResults && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={styles.resultModal}>
                        <motion.div initial={{ scale: 0.8, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", damping: 15 }} className={styles.resultCard}>
                            <div className={styles.chartContainer}>
                                <svg viewBox="0 0 100 100" className={styles.radialChart}>
                                    <circle cx="50" cy="50" r="45" className={styles.chartBg} />
                                    <motion.circle cx="50" cy="50" r="45" className={styles.chartFill} initial={{ strokeDasharray: "0 283" }} animate={{ strokeDasharray: `${(stats.correct / (stats.total || 1)) * 283} 283` }} transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }} />
                                </svg>
                                <div className={styles.chartText}>
                                    <motion.span initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1 }}>{Math.round((stats.correct / (stats.total || 1)) * 100)}%</motion.span>
                                    <p>সফলতা</p>
                                </div>
                            </div>
                            <div className={styles.statsSummary}>
                                <div className={styles.summaryItem}>
                                    <div className={styles.summaryIcon} style={{ background: 'rgba(255, 153, 2, 0.1)' }}><Check size={20} color="#ff9902" /></div>
                                    <div className={styles.summaryInfo}><span>সঠিক উত্তর</span><strong>{stats.correct}</strong></div>
                                </div>
                                <div className={styles.summaryItem}>
                                    <div className={styles.summaryIcon} style={{ background: 'rgba(255, 75, 75, 0.1)' }}><X size={20} color="#ff4b4b" /></div>
                                    <div className={styles.summaryInfo}><span>ভুল উত্তর</span><strong>{stats.total - stats.correct}</strong></div>
                                </div>
                                <div className={styles.summaryItem}>
                                    <div className={styles.summaryIcon} style={{ background: 'rgba(255, 153, 2, 0.1)' }}><Star size={20} color="#ff9902" /></div>
                                    <div className={styles.summaryInfo}><span>অর্জিত XP</span><strong>+{stats.correct}</strong></div>
                                </div>
                            </div>
                            <button className={styles.finishBtn} onClick={() => navigate(-1)}>চালিয়ে যান</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showNoHeartsModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={styles.resultModal} onClick={() => setShowNoHeartsModal(false)}>
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            transition={{ type: "spring", damping: 15 }}
                            className={styles.resultCard}
                            onClick={(e) => e.stopPropagation()}
                            style={{ maxWidth: '420px', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}
                        >
                            <div style={{ textAlign: 'center', padding: '28px 24px' }}>
                                {/* Header */}
                                <motion.div
                                    animate={{ rotate: [-5, 5, -5, 5, 0] }}
                                    transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
                                    style={{ fontSize: '72px', marginBottom: '16px', lineHeight: 1 }}
                                >🍯</motion.div>

                                <h2 style={{
                                    fontSize: '22px',
                                    fontWeight: 900,
                                    marginBottom: '8px',
                                    color: '#ffa202',
                                    textShadow: '0 0 20px rgba(255,162,2,0.4)'
                                }}>আপনার মৌচাকে মধু শেষ!</h2>

                                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginBottom: '20px', lineHeight: 1.6 }}>
                                    নতুন হানি ড্রপ রিফিল হতে সময় লাগবে।<br />
                                    আপনি কি অপেক্ষা করবেন, নাকি এখনই ওড়া শুরু করতে চান?
                                </p>

                                {/* Refill Timer Card */}
                                {refillTimeDisplay && (
                                    <div style={{
                                        background: 'rgba(255, 162, 2, 0.1)',
                                        border: '2px solid rgba(255,162,2,0.4)',
                                        borderRadius: '14px',
                                        padding: '14px 20px',
                                        marginBottom: '20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '10px'
                                    }}>
                                        <Clock size={20} color="#ffa202" />
                                        <span style={{ fontSize: '16px', fontWeight: 700, color: '#ffa202' }}>রিফিল হবে: {refillTimeDisplay}</span>
                                    </div>
                                )}

                                {/* Options */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {/* Queen Bee Option */}
                                    <button
                                        onClick={() => { setShowNoHeartsModal(false); window.location.href = '/shop'; }}
                                        style={{
                                            background: 'linear-gradient(135deg, #ffa202 0%, #ff6b00 100%)',
                                            border: 'none',
                                            borderRadius: '14px',
                                            padding: '14px 20px',
                                            color: '#fff',
                                            fontWeight: 900,
                                            fontSize: '15px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            boxShadow: '0 4px 20px rgba(255,162,2,0.4)',
                                            width: '100%'
                                        }}
                                    >
                                        <span>👑</span> Queen Bee হন মাত্র ৯৯ টাকায়!
                                    </button>

                                    {/* Wait Option */}
                                    <button
                                        onClick={() => setShowNoHeartsModal(false)}
                                        style={{
                                            background: 'rgba(255,255,255,0.08)',
                                            border: '1px solid rgba(255,255,255,0.15)',
                                            borderRadius: '14px',
                                            padding: '12px 20px',
                                            color: 'rgba(255,255,255,0.7)',
                                            fontWeight: 600,
                                            fontSize: '14px',
                                            cursor: 'pointer',
                                            width: '100%'
                                        }}
                                    >
                                        🕐 আমি অপেক্ষা করবো
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StudyPage;
