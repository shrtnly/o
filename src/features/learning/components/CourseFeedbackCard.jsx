import React, { useState, useEffect } from 'react';
import { Star, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { courseService } from '../../../services/courseService';
import styles from './CourseFeedbackCard.module.css';

const CourseFeedbackCard = ({ courseId, userId, onDismiss }) => {
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Delay entrance slightly
        const timer = setTimeout(() => setIsVisible(true), 1000);
        return () => clearTimeout(timer);
    }, []);

    const handleSubmit = async () => {
        if (rating === 0) return;
        
        setIsSubmitting(true);
        try {
            await courseService.submitReview(userId, courseId, rating, feedback);
            setIsSubmitted(true);
            setTimeout(() => {
                onDismiss();
            }, 3000);
        } catch (error) {
            console.error('Error submitting feedback:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div 
                    className={styles.cardWrapper}
                    initial={{ x: 400, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 400, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                >
                    <div className={styles.card}>
                        {!isSubmitted ? (
                            <>
                                <button className={styles.closeBtn} onClick={onDismiss}>
                                    <X size={16} />
                                </button>
                                <div className={styles.header}>
                                    <h4>আপনি এই কোর্সটি কতটুকু উপভোগ করছেন?</h4>
                                    <p>আপনার মতামত আমাদের আরও ভালো করতে সাহায্য করবে।</p>
                                </div>
                                <div className={styles.starsRow}>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <motion.button
                                            key={star}
                                            whileHover={{ scale: 1.2 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => setRating(star)}
                                            onMouseEnter={() => setHover(star)}
                                            onMouseLeave={() => setHover(0)}
                                            className={styles.starBtn}
                                        >
                                            <Star 
                                                size={28} 
                                                fill={(hover || rating) >= star ? "#f1c40f" : "none"}
                                                color={(hover || rating) >= star ? "#f1c40f" : "rgba(255,255,255,0.3)"}
                                                strokeWidth={1.5}
                                            />
                                        </motion.button>
                                    ))}
                                </div>

                                <AnimatePresence>
                                    {rating > 0 && (
                                        <motion.div 
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className={styles.feedbackArea}
                                        >
                                            <textarea
                                                className={styles.textarea}
                                                placeholder="আপনার মতামত লিখুন (ঐচ্ছিক)..."
                                                value={feedback}
                                                onChange={(e) => setFeedback(e.target.value)}
                                                rows={3}
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <button 
                                    className={styles.submitBtn} 
                                    disabled={rating === 0 || isSubmitting}
                                    onClick={handleSubmit}
                                >
                                    {isSubmitting ? 'প্রসেস হচ্ছে...' : 'সাবমিট করুন'}
                                </button>
                            </>
                        ) : (
                            <div className={styles.successState}>
                                <div className={styles.successIcon}>
                                    <Check size={32} />
                                </div>
                                <h4>ধন্যবাদ!</h4>
                                <p>আপনার মূল্যবান মতামত সংরক্ষণ করা হয়েছে।</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CourseFeedbackCard;
