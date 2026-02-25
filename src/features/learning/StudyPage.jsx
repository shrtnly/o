import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Lightbulb, Star, ArrowRight, Clock, HelpCircle, Infinity, Zap, ShoppingBag, CreditCard, Loader2, Sparkles, CircleCheckBig, CircleX, Square, Circle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { supabase } from '../../lib/supabaseClient';
import HoneyDropIcon from '../../components/HoneyDropIcon';
import { useAuth } from '../../context/AuthContext';
import { useHeartRefill } from '../../hooks/useHeartRefill';
import { rewardService } from '../../services/rewardService';
import { honeyJarService } from '../../services/honeyJarService';
import { shopService } from '../../services/shopService';
import { useLanguage } from '../../context/LanguageContext';
import LoadingScreen from '../../components/ui/LoadingScreen';

import styles from './StudyPage.module.css';

const SparkleBurst = ({ large = false }) => {
    const spreadX = large ? 2.6 : 0.75;
    const spreadY = large ? 1.8 : 0.75;
    const elements = [
        { Icon: Sparkles, tx: -30 * spreadX, ty: -40 * spreadY, delay: 0, size: large ? 22 : 18 },
        { Icon: Star, tx: 35 * spreadX, ty: -35 * spreadY, delay: 0.1, size: large ? 16 : 14, filled: true },
        { Icon: Square, tx: -45 * spreadX, ty: -60 * spreadY, delay: 0.15, size: large ? 12 : 10, filled: true },
        { Icon: Sparkles, tx: 0 * spreadX, ty: -65 * spreadY, delay: 0.2, size: large ? 24 : 20 },
        { Icon: Circle, tx: 45 * spreadX, ty: -25 * spreadY, delay: 0.25, size: large ? 10 : 8, filled: true },
        { Icon: Star, tx: -50 * spreadX, ty: -25 * spreadY, delay: 0.3, size: large ? 16 : 14, filled: true },
        { Icon: Square, tx: 30 * spreadX, ty: -45 * spreadY, delay: 0.2, size: large ? 11 : 9, filled: false },
        { Icon: Sparkles, tx: 50 * spreadX, ty: -55 * spreadY, delay: 0.15, size: large ? 20 : 16 },
        { Icon: Square, tx: 20 * spreadX, ty: -70 * spreadY, delay: 0.35, size: large ? 10 : 8, filled: true },
        { Icon: Circle, tx: -35 * spreadX, ty: -50 * spreadY, delay: 0.3, size: large ? 9 : 7, filled: false },
        { Icon: Star, tx: -15 * spreadX, ty: -50 * spreadY, delay: 0.25, size: large ? 14 : 12, filled: true },
        { Icon: Circle, tx: -25 * spreadX, ty: -75 * spreadY, delay: 0.1, size: large ? 12 : 10, filled: true },
        { Icon: Sparkles, tx: 15 * spreadX, ty: -60 * spreadY, delay: 0.05, size: large ? 18 : 16 },
    ];
    return (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}>
            {elements.map((el, i) => (
                <motion.div
                    key={i}
                    initial={{ scale: 0, opacity: 0, x: '-50%', y: '-50%' }}
                    animate={{
                        scale: [0, 1.2, 0],
                        opacity: [1, 1, 0],
                        x: `calc(-50% + ${el.tx}px)`,
                        y: `calc(-50% + ${el.ty}px)`,
                        rotate: [0, 180],
                    }}
                    transition={{ duration: 2, delay: el.delay, ease: 'easeOut' }}
                    style={{ position: 'absolute', left: '50%', top: large ? '0%' : '50%' }}
                >
                    <el.Icon
                        size={el.size}
                        color="#f1c40f"
                        fill={el.filled ? '#f1c40f' : 'none'}
                        strokeWidth={1.5}
                        style={{ filter: `drop-shadow(0 0 ${large ? '8px' : '5px'} rgba(241,196,15,0.7))` }}
                    />
                </motion.div>
            ))}
        </div>
    );
};

const StudyPage = () => {
    const { courseId, chapterId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { t } = useLanguage();

    // Use heart refill system
    const {
        hearts,
        maxHearts,
        refillTimeDisplay,
        deductHeart,
        canAnswer,
        needsRefill,
        isPremium,
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
    const [showNoHeartsCheckout, setShowNoHeartsCheckout] = useState(null); // { type, label, price }
    const [checkoutProcessing, setCheckoutProcessing] = useState(false);
    const [dotLottie, setDotLottie] = useState(null);
    const [isSubLooping, setIsSubLooping] = useState(false);
    const [selectedAnimation, setSelectedAnimation] = useState('1');
    const hasStarted = React.useRef(false);
    const hasPlayed = React.useRef(false);
    const [profile, setProfile] = useState(null);

    // Audio pre-loading
    const correctAudio = React.useRef(null);
    const wrongAudio = React.useRef(null);
    const completeAudio = React.useRef(null);

    useEffect(() => {
        // Initialize and pre-load sounds
        const sounds = {
            correct: '/sound/Correct_answer.mp3',
            wrong: '/sound/Wrong_answer.mp3',
            complete: '/sound/Chapter_complete.mp3'
        };

        const initAudio = (path, ref) => {
            const audio = new Audio(path);
            audio.preload = 'auto';
            audio.load();
            ref.current = audio;
        };

        initAudio(sounds.correct, correctAudio);
        initAudio(sounds.wrong, wrongAudio);
        initAudio(sounds.complete, completeAudio);

        return () => {
            [correctAudio, wrongAudio, completeAudio].forEach(ref => {
                if (ref.current) {
                    ref.current.pause();
                    ref.current.src = "";
                }
            });
        };
    }, []);

    const handleNoHeartsCheckout = (type) => {
        if (type === 'hearts') {
            setShowNoHeartsCheckout({ type: 'hearts', label: '১৪০পি ইনস্ট্যান্ট রিফিল', price: 5 });
        } else if (type === 'subscription') {
            const beeName = profile?.gender === 'male' ? t('king_bee_mode') : 'কুইন বী মোড';
            setShowNoHeartsCheckout({ type: 'subscription', label: `${beeName} (মাসিক)`, price: 99 });
        }
    };

    const completeNoHeartsCheckout = async () => {
        if (!showNoHeartsCheckout || !user) return;
        setCheckoutProcessing(true);
        try {
            const { type, price } = showNoHeartsCheckout;
            let result;
            if (type === 'hearts') {
                result = await shopService.buyHearts(user.id, 5, price, 'heart_p1');
                if (result?.success) {
                    setShowNoHeartsCheckout(null);
                    setShowNoHeartsModal(false);
                    toast?.success('৪টি হানি ড্রপ যোক্ত হয়েছে! 🍯');
                }
            } else if (type === 'subscription') {
                result = await shopService.subscribeToPremium(user.id, 'monthly', price);
                if (result?.success) {
                    setShowNoHeartsCheckout(null);
                    setShowNoHeartsModal(false);
                    const beeName = profile?.gender === 'male' ? t('king_bee_mode') : 'কুইন বী মোড';
                    toast?.success(`অভিনন্দন! আপনি এখন ${beeName}! 👑`);
                }
            }
            if (!result?.success) {
                toast?.error('পেমেন্ট সফল হয়নি। পুনরায় চেষ্টা করুন।');
            }
        } catch (err) {
            console.error('Checkout error:', err);
            toast?.error('পেমেন্ট সফল হয়নি। পুনরায় চেষ্টা করুন।');
        } finally {
            setCheckoutProcessing(false);
        }
    };

    // Load animation preference and profile from localStorage/DB
    useEffect(() => {
        const savedAnimation = localStorage.getItem('studyPageAnimation');
        if (savedAnimation) {
            setSelectedAnimation(savedAnimation);
        }

        const fetchProfile = async () => {
            if (!user) return;
            const { data } = await supabase.from('profiles').select('gender').eq('id', user.id).single();
            setProfile(data);
        };
        fetchProfile();
    }, [user]);

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
            // Play success sound
            const soundEnabled = localStorage.getItem('soundEffectsEnabled') !== 'false';
            if (correctAudio.current && soundEnabled) {
                try {
                    correctAudio.current.currentTime = 0;
                    correctAudio.current.play().catch(e => {
                        console.error("Audio playback failed, retrying...", e);
                        // Re-initialize if it lost source
                        correctAudio.current.src = '/sound/Correct_answer.mp3';
                        correctAudio.current.play();
                    });
                } catch (err) {
                    console.error("Audio error:", err);
                }
            }

            setStats(prev => ({ ...prev, correct: prev.correct + 1 }));
            if (user) {
                rewardService.awardXP(user.id, 1, 'correct_answer');
                honeyJarService.addPollenToJar(user.id, 1);
            }
        } else {
            // Play error sound
            const soundEnabled = localStorage.getItem('soundEffectsEnabled') !== 'false';
            if (wrongAudio.current && soundEnabled) {
                try {
                    wrongAudio.current.currentTime = 0;
                    wrongAudio.current.play().catch(e => {
                        console.error("Audio playback failed, retrying...", e);
                        wrongAudio.current.src = '/sound/Wrong_answer.mp3';
                        wrongAudio.current.play();
                    });
                } catch (err) {
                    console.error("Audio error:", err);
                }
            }

            setShake(true);
            setTimeout(() => setShake(false), 500);
            if (user) await deductHeart(1);
        }

        setProgress(((currentIndex + 1) / questions.length) * 100);
    };

    const handleNext = async () => {
        if (currentIndex < questions.length - 1) {
            if (!isPremium && hearts === 0) {
                setShowNoHeartsModal(true);
                return;
            }
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
                } catch (err) {
                    console.error('Error updating progress:', err);
                }
            }
            // Play completion sound
            const soundEnabled = localStorage.getItem('soundEffectsEnabled') !== 'false';
            if (completeAudio.current && soundEnabled) {
                try {
                    completeAudio.current.currentTime = 0;
                    completeAudio.current.play().catch(e => {
                        console.error("Audio playback failed, retrying...", e);
                        completeAudio.current.src = '/sound/Chapter_complete.mp3';
                        completeAudio.current.play();
                    });
                } catch (err) {
                    console.error("Audio error:", err);
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
                <button onClick={() => navigate(-1)} className="bg-[#ffa202] text-white px-6 py-2 rounded-xl shadow-[0_4px_0_#e69200] active:translate-y-1 active:shadow-none transition-all">ফিরে যান</button>
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
                    {!(hearts === 0 && refillTimeDisplay) && (
                        isPremium ? (
                            <Infinity size={24} strokeWidth={3} style={{ marginLeft: '4px', color: '#ff4b4b' }} />
                        ) : (
                            <span className={styles.heartCount}>{hearts}</span>
                        )
                    )}
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
                                    <span className={styles.lightbulb}><Lightbulb size={20} color="#ffa202" /></span>
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
                                        whileTap={!isAnswered ? { scale: 0.98 } : {}}
                                        className={`${styles.optionBtn} ${selectedOption === option.id ? styles.selected : ''} ${isAnswered && option.is_correct && isCorrect ? styles.correct : ''} ${isAnswered && selectedOption === option.id && !option.is_correct ? styles.incorrect : ''}`}
                                        onClick={() => handleOptionSelect(option.id)}
                                        disabled={isAnswered}
                                    >
                                        <div className={styles.optionIndex}>
                                            {optionLabels[idx] || (idx + 1)}
                                        </div>
                                        <span className={styles.optionText}>{option.option_text}</span>
                                        {isAnswered && option.is_correct && isCorrect && (
                                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={styles.correctIcon}>
                                                <CircleCheckBig size={20} strokeWidth={1.5} />
                                            </motion.div>
                                        )}
                                        {isAnswered && selectedOption === option.id && !option.is_correct && (
                                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={styles.incorrectIcon}><CircleX size={20} strokeWidth={1.5} /></motion.div>
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
                                        <div className={styles.statusIcon}>{isCorrect ? <CircleCheckBig size={24} strokeWidth={1.5} /> : <CircleX size={24} strokeWidth={1.5} />}</div>
                                        <h3>{isCorrect ? "সঠিক উত্তর !" : "ভুল উত্তর !"}</h3>
                                    </div>
                                    <p className={styles.explanationText}>
                                        {isCorrect
                                            ? "আপনার উত্তরটি সঠিক হয়েছে।"
                                            : currentQuestion.explanation
                                                ? `সঠিক উত্তর : ${currentQuestion.explanation}`
                                                : `ভুল থেকে শেখাই আসল শেখা। আপনার কাছে আর মাত্র ${hearts}টি ${t('honey_drop')} আছে।`
                                        }
                                    </p>
                                </div>
                                <button className={styles.continueBtn} onClick={handleNext}>
                                    {isCorrect && <SparkleBurst large={true} />}
                                    <span>{currentIndex < questions.length - 1 ? (isCorrect ? "এগিয়ে যান" : "আবার চেষ্টা করি") : "সম্পন্ন করুন"}</span>
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
                                    <div className={styles.summaryIcon} style={{ background: 'rgba(255, 162, 2, 0.1)' }}><CircleCheckBig size={20} color="#ffa202" strokeWidth={1.5} /></div>
                                    <div className={styles.summaryInfo}><span>সঠিক উত্তর</span><strong>{stats.correct}</strong></div>
                                </div>
                                <div className={styles.summaryItem}>
                                    <div className={styles.summaryIcon} style={{ background: 'rgba(255, 75, 75, 0.1)' }}><CircleX size={20} color="#ff4b4b" strokeWidth={1.5} /></div>
                                    <div className={styles.summaryInfo}><span>ভুল উত্তর</span><strong>{stats.total - stats.correct}</strong></div>
                                </div>
                                <div className={styles.summaryItem}>
                                    <div className={styles.summaryIcon} style={{ background: 'rgba(255, 162, 2, 0.1)' }}><Star size={20} color="#ffa202" /></div>
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
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={styles.resultModal}
                        onClick={() => setShowNoHeartsModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.88, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.88, opacity: 0, y: 20 }}
                            transition={{ type: "spring", damping: 20, stiffness: 300 }}
                            className={`${styles.resultCard} ${styles.noHeartsCard}`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Close Button */}
                            <button className={styles.modalCloseBtn} onClick={() => setShowNoHeartsModal(false)}>
                                <X size={18} strokeWidth={2.5} />
                            </button>

                            <div className={styles.noHeartsContent}>
                                {/* Hero Area */}
                                <div className={styles.noHeartsHero}>
                                    <div className={styles.honeyEmoji}>🍯</div>
                                    <div className={styles.noHeartsTextBlock}>
                                        <h2 className={styles.noHeartsTitle}>আপনার মৌচাকে মধু শেষ!</h2>
                                        <p className={styles.noHeartsSub}>চিন্তা নেই! মৌমাছিরা আবার মধু সংগ্রহের জন্য প্রস্তুত।</p>
                                    </div>
                                </div>

                                {/* Refill Timer */}
                                {refillTimeDisplay && (
                                    <div className={styles.refillTimerRow}>
                                        <div className={styles.refillTimerLeft}>
                                            <Clock size={15} />
                                            <span>রিফিল হবে {refillTimeDisplay}-এ</span>
                                        </div>
                                        <button
                                            className={styles.shopInlineBtn}
                                            onClick={() => { setShowNoHeartsModal(false); window.location.href = '/shop'; }}
                                        >
                                            <ShoppingBag size={14} />
                                            <span>শপ এ যান</span>
                                        </button>
                                    </div>
                                )}

                                {/* Divider */}
                                <div className={styles.noHeartsDivider} />

                                {/* Action Buttons */}
                                <div className={styles.noHeartsButtons}>
                                    {/* Primary: Instant Refill */}
                                    <button
                                        className={`${styles.btn3d} ${styles.instantRefillBtn}`}
                                        onClick={() => handleNoHeartsCheckout('hearts')}
                                    >
                                        <Zap size={18} fill="currentColor" strokeWidth={0} />
                                        <span>আনলিমিটেড ২৪ ঘন্টা - মাত্র ৪ টাকা</span>
                                    </button>

                                    {/* Secondary: Premium Mode */}
                                    <button
                                        className={`${styles.btn3d} ${styles.premiumCardBtn}`}
                                        onClick={() => handleNoHeartsCheckout('subscription')}
                                    >
                                        <span>👑</span>
                                        <span>{profile?.gender === 'male' ? t('king_bee_mode') : t('queen_bee_mode')} — যাত্রা মাত্র ৯৯ টাকা</span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* No Hearts Checkout Modal */}
            {showNoHeartsCheckout && (
                <div className={styles.checkoutOverlay} onClick={() => setShowNoHeartsCheckout(null)}>
                    <motion.div
                        initial={{ scale: 0.88, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.88, opacity: 0 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        className={styles.checkoutCard}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className={styles.checkoutCardHeader}>
                            <div className={styles.checkoutCardIcon}>
                                {showNoHeartsCheckout.type === 'hearts' ? '🍯' : '👑'}
                            </div>
                            <h2 className={styles.checkoutCardTitle}>পেমেন্ট কনফার্ম করুন</h2>
                            <p className={styles.checkoutCardSub}>নিচের বিবরণ যাচাই করুন</p>
                        </div>

                        {/* Order summary */}
                        <div className={styles.checkoutSummary}>
                            <div className={styles.checkoutSummaryRow}>
                                <span>আইটেম</span>
                                <span>{showNoHeartsCheckout.label}</span>
                            </div>
                            <div className={`${styles.checkoutSummaryRow} ${styles.checkoutSummaryTotal}`}>
                                <span>মোট</span>
                                <span>৳ {showNoHeartsCheckout.price}</span>
                            </div>
                        </div>

                        {/* Payment methods */}
                        <div className={styles.checkoutMethods}>
                            <div className={`${styles.checkoutMethodBtn} ${styles.checkoutMethodActive}`}>
                                <CreditCard size={22} />
                                <span>বিকাশ</span>
                            </div>
                            <div className={styles.checkoutMethodBtn}>
                                <ShoppingBag size={22} />
                                <span>নগদ</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className={styles.checkoutCardActions}>
                            <button
                                className={styles.checkoutCancelBtn}
                                onClick={() => setShowNoHeartsCheckout(null)}
                                disabled={checkoutProcessing}
                            >
                                বাতিল
                            </button>
                            <button
                                className={styles.checkoutConfirmBtn}
                                onClick={completeNoHeartsCheckout}
                                disabled={checkoutProcessing}
                            >
                                {checkoutProcessing
                                    ? <Loader2 size={20} className={styles.spinnerIcon} />
                                    : 'এখনই পে করুন'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default StudyPage;
