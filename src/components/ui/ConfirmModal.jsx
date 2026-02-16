import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, X } from 'lucide-react';
import styles from './ConfirmModal.module.css';

const ConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    title = 'লগআউট',
    message = 'আপনি কি নিশ্চিত যে আপনি লগআউট করতে চান?',
    confirmText = 'হ্যাঁ',
    cancelText = 'না',
    icon: Icon = LogOut,
    type = 'danger' // 'danger', 'info'
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className={styles.overlay}>
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0, y: 20 }}
                        className={styles.modal}
                    >
                        <button className={styles.closeBtn} onClick={onClose}>
                            <X size={24} />
                        </button>

                        <div className={styles.content}>
                            <div className={styles.iconWrapper} data-type={type}>
                                <Icon size={32} className={styles.icon} />
                            </div>

                            <h2 className={styles.title}>{title}</h2>
                            <p className={styles.message}>{message}</p>

                            <div className={styles.btnGroup}>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className={`${styles.btn} ${styles.cancelBtn}`}
                                    onClick={onClose}
                                >
                                    {cancelText}
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className={`${styles.btn} ${styles.confirmBtn}`}
                                    data-type={type}
                                    onClick={async () => {
                                        await onConfirm();
                                        onClose();
                                    }}
                                >
                                    {confirmText}
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ConfirmModal;
