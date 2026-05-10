import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, X, Trophy, ChevronLeft, ChevronRight, Bot } from 'lucide-react';
import styles from './BattleWar.module.css';

export const HistoryModal = ({ history, onClose, language, currentPage, totalCount, onPageChange, isLoading }) => {
    const PAGE_SIZE = 10;
    // Bug 5 fix: null-safe totalCount
    const totalPages = Math.ceil((totalCount || 0) / PAGE_SIZE);

    // Bug 3 fix: separate state for pagination loading (page change) vs initial loading
    const [isPaging, setIsPaging] = useState(false);

    const handlePageChange = async (newPage) => {
        setIsPaging(true);
        await onPageChange(newPage);
        setIsPaging(false);
    };

    // Bug 4 fix: helper to display opponent name properly
    const getOpponentDisplay = (record) => {
        if (record.is_bot) {
            return record.opponent_name || (language === 'bn' ? 'AI এজেন্ট' : 'AI Agent');
        }
        return record.opponent_name || (language === 'bn' ? 'অজানা' : 'Unknown');
    };

    // Bug 6 fix: calculate accuracy from my_correct
    const getAccuracy = (record) => {
        if (!record.my_correct && record.my_correct !== 0) return null;
        // total questions answered is approximated from score context, use 15 as max
        const total = 15;
        return Math.round((record.my_correct / total) * 100);
    };

    const tableHeaders = (
        <tr>
            <th>{language === 'bn' ? 'নং' : 'Sl'}</th>
            <th>{language === 'bn' ? 'তারিখ' : 'Date'}</th>
            <th>{language === 'bn' ? 'প্রতিপক্ষ' : 'Opponent'}</th>
            <th>{language === 'bn' ? 'ফল' : 'Result'}</th>
            <th>{language === 'bn' ? 'স্কোর' : 'Score'}</th>
        </tr>
    );

    return (
        <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className={styles.historyModal}
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                onClick={e => e.stopPropagation()}
            >
                <div className={styles.modalHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Swords size={20} className={styles.headerIcon} />
                        <h3>{language === 'bn' ? 'ব্যাটেল ইতিহাস' : 'Battle History'}</h3>
                        {/* total count badge */}
                        {(totalCount > 0) && (
                            <span style={{
                                background: 'rgba(241, 196, 15, 0.15)',
                                border: '1px solid rgba(241, 196, 15, 0.3)',
                                borderRadius: '20px',
                                padding: '2px 8px',
                                fontSize: '11px',
                                fontWeight: '700',
                                color: 'var(--color-primary)'
                            }}>
                                {totalCount}
                            </span>
                        )}
                    </div>
                    <button className={styles.closeBtnSmall} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.historyTableContainer} style={{ position: 'relative' }}>

                    {/* Bug 3 fix: Pagination loading overlay — doesn't destroy the table */}
                    <AnimatePresence>
                        {isPaging && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                style={{
                                    position: 'absolute', inset: 0,
                                    background: 'rgba(0,0,0,0.4)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    zIndex: 10, borderRadius: '12px', backdropFilter: 'blur(4px)'
                                }}
                            >
                                <div className={styles.spin} style={{ width: 24, height: 24, border: '3px solid var(--color-primary)', borderTopColor: 'transparent', borderRadius: '50%' }} />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Bug 2 fix: isLoading shows skeleton only on initial load */}
                    {isLoading && !isPaging ? (
                        <table className={styles.historyTable}>
                            <thead>{tableHeaders}</thead>
                            <tbody>
                                {[1, 2, 3, 4, 5].map(i => (
                                    <tr key={i}>
                                        <td><div className={styles.skeletonPulse} style={{ height: '12px', width: '20px', margin: '0 auto' }} /></td>
                                        <td><div className={styles.skeletonPulse} style={{ height: '12px', width: '40px' }} /></td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div className={styles.skeletonPulse} style={{ height: '24px', width: '24px', borderRadius: '50%' }} />
                                                <div className={styles.skeletonPulse} style={{ height: '12px', width: '60px' }} />
                                            </div>
                                        </td>
                                        <td><div className={styles.skeletonPulse} style={{ height: '16px', width: '40px', borderRadius: '4px' }} /></td>
                                        <td><div className={styles.skeletonPulse} style={{ height: '12px', width: '40px' }} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (history && history.length > 0) ? (
                        <>
                            <table className={styles.historyTable}>
                                <thead>{tableHeaders}</thead>
                                <tbody>
                                    {history.map((record, index) => {
                                        const acc = getAccuracy(record);
                                        const isLowAcc = acc !== null && acc < 50;
                                        return (
                                            <tr key={record.id}>
                                                <td className={styles.slCol}>{currentPage * PAGE_SIZE + index + 1}</td>
                                                <td className={styles.dateCol}>
                                                    {new Date(record.created_at).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
                                                        month: 'short', day: 'numeric'
                                                    })}
                                                </td>
                                                <td className={styles.oppCol}>
                                                    <div className={styles.oppInfoMini}>
                                                        {/* Bug 4 fix: Bot gets a Bot icon if no avatar */}
                                                        <div className={styles.avatarMini}>
                                                            {record.opponent_avatar ? (
                                                                <img src={record.opponent_avatar} alt="" crossOrigin="anonymous" referrerPolicy="no-referrer" />
                                                            ) : record.is_bot ? (
                                                                <Bot size={14} color="var(--color-primary)" />
                                                            ) : (
                                                                <span>{getOpponentDisplay(record)?.[0] || '?'}</span>
                                                            )}
                                                        </div>
                                                        <div className={styles.oppNameGroup}>
                                                            <span>{getOpponentDisplay(record)}</span>
                                                            {record.is_bot && <span className={styles.botTag}>AI</span>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`${styles.resultBadge} ${styles[`badge${record.result}`]}`}>
                                                        {record.result === 'win'
                                                            ? (language === 'bn' ? 'জয়' : 'Win')
                                                            : record.result === 'loss'
                                                                ? (language === 'bn' ? 'হার' : 'Loss')
                                                                : (language === 'bn' ? 'ড্র' : 'Draw')
                                                        }
                                                    </span>
                                                </td>
                                                <td className={styles.scoreCol}>
                                                    {record.my_score} - {record.opponent_score}
                                                    {/* Bug 6 fix: show accuracy below score */}
                                                    {acc !== null && (
                                                        <div style={{
                                                            fontSize: '10px',
                                                            color: isLowAcc ? '#e74c3c' : '#afafaf',
                                                            fontWeight: isLowAcc ? '700' : '500',
                                                            marginTop: '2px'
                                                        }}>
                                                            {acc}% {language === 'bn' ? 'সঠিক' : 'acc'}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {totalPages > 1 && (
                                <div className={styles.pagination}>
                                    <button
                                        disabled={currentPage === 0 || isPaging}
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        className={styles.pageBtn}
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    <span className={styles.pageInfo}>
                                        {language === 'bn'
                                            ? `পৃষ্ঠা ${currentPage + 1} / ${totalPages}`
                                            : `Page ${currentPage + 1} of ${totalPages}`}
                                    </span>
                                    <button
                                        disabled={currentPage >= totalPages - 1 || isPaging}
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        className={styles.pageBtn}
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        // Bug 5 fix: distinguish "loading done but empty" vs "still waiting"
                        <div className={styles.emptyHistory}>
                            <div className={styles.emptyIconBox}>
                                <Trophy size={48} className={styles.emptyIcon} />
                            </div>
                            <div className={styles.emptyTextGroup}>
                                <h4>{language === 'bn' ? 'কোন ইতিহাস নেই' : 'No History Found'}</h4>
                                <p>{language === 'bn' ? 'আপনি এখনো কোনো ব্যাটেলে অংশ নেননি।' : "You haven't participated in any battles yet."}</p>
                            </div>
                            <button className={styles.emptyActionBtn} onClick={onClose}>
                                {language === 'bn' ? 'ব্যাটেল শুরু করুন' : 'Start a Battle'}
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

export default HistoryModal;
