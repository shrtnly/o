import React from 'react';
import { Mail, X, CheckCircle2, ArrowRight } from 'lucide-react';
import Button from '../../components/ui/Button';
import styles from './ConfirmationModal.module.css';

const ConfirmationModal = ({ email, onClose, isVisible }) => {
    if (!isVisible) return null;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <button className={styles.closeBtn} onClick={onClose}>
                    <X size={20} />
                </button>

                <div className={styles.iconWrapper}>
                    <div className={styles.checkBadge}>
                        <CheckCircle2 size={48} className={styles.checkIcon} />
                    </div>
                    <div className={styles.pulseRing}></div>
                </div>

                <div className={styles.textContainer}>
                    <h2>ইমেইল যাচাই করুন!</h2>
                    <p className={styles.mainTask}>
                        আমরা একটি ভেরিফিকেশন লিঙ্ক পাঠিয়েছি:
                    </p>
                    <div className={styles.emailBadge}>
                        <Mail size={16} />
                        <span>{email}</span>
                    </div>
                    <p className={styles.instruction}>
                        অনুগ্রহ করে আপনার ইনবক্স চেক করুন এবং অ্যাকাউন্টটি সক্রিয় করতে লিঙ্কটিতে ক্লিক করুন।
                    </p>
                </div>

                <div className={styles.tipsSection}>
                    <h4>লিঙ্কটি খুঁজে পাচ্ছেন না?</h4>
                    <ul>
                        <li>আপনার স্প্যাম (Spam) বা প্রোমোশন ফোল্ডারটি চেক করুন।</li>
                        <li>মিনিট খানেক অপেক্ষা করে আবার ট্রাই করুন।</li>
                    </ul>
                </div>

                <Button
                    variant="primary"
                    className={styles.finishBtn}
                    onClick={onClose}
                >
                    ঠিক আছে, বুঝেছি!
                    <ArrowRight size={18} />
                </Button>
            </div>
        </div>
    );
};

export default ConfirmationModal;
