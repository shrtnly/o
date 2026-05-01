import React from 'react';
import { motion } from 'framer-motion';
import { XCircle } from 'lucide-react';
import styles from './BattleWar.module.css';

export const ExitModal = ({ onConfirm, onCancel, language }) => (
    <motion.div
        className={styles.modalOverlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        style={{ zIndex: 3000 }}
    >
        <motion.div
            className={styles.confirmModal}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={e => e.stopPropagation()}
        >
            <div className={styles.confirmIconWrap}>
                <XCircle size={48} strokeWidth={2.5} />
            </div>
            <h3>{language === 'bn' ? 'ব্যাটল থেকে বের হচ্ছেন?' : 'Exiting Battle?'}</h3>
            <p>
                {language === 'bn'
                    ? 'আপনি কি নিশ্চিত যে আপনি এই ব্যাটলটি মাঝপথে ছেড়ে দিতে চান? আপনার কোনো পয়েন্ট বা রেকর্ড জমা হবে না।'
                    : 'Are you sure you want to quit? No points or history records will be saved if you leave now.'}
            </p>
            <div className={styles.confirmActions}>
                <button className={styles.stayBtn} onClick={onCancel}>
                    {language === 'bn' ? 'না, লড়াই করি' : 'No, Keep Fighting'}
                </button>
                <button className={styles.quitBtn} onClick={onConfirm}>
                    {language === 'bn' ? 'হ্যাঁ, বের হন' : 'Yes, Quit Session'}
                </button>
            </div>
        </motion.div>
    </motion.div>
);

export default ExitModal;
