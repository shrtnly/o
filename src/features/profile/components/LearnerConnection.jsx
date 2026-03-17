import React, { useState, useEffect, useCallback } from 'react';
import { 
    Users, Search, UserPlus, UserMinus, 
    Check, X, ChevronRight, Zap, 
    Flame, MapPin, User, Send
} from 'lucide-react';
import { connectionService } from '../../../services/connectionService';
import { useLanguage } from '../../../context/LanguageContext';
import InlineLoader from '../../../components/ui/InlineLoader';
import styles from './LearnerConnection.module.css';
import { motion, AnimatePresence } from 'framer-motion';

const LearnerConnection = ({ user, userXp, onSelectLearner }) => {
    const { t } = useLanguage();
    const [subTab, setSubTab] = useState('suggest'); // suggest, my, sent
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    
    const [connections, setConnections] = useState({ pending: [], active: [], outgoing: [] });
    const [suggestions, setSuggestions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchData = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const connData = await connectionService.getConnections(user.id);
            setConnections(connData);
            
            const suggestedData = await connectionService.getSuggestions(user.id, userXp, 6);
            setSuggestions(suggestedData);
        } catch (err) {
            console.error('Error fetching connection data:', err);
        } finally {
            setIsLoading(false);
        }
    }, [user, userXp]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSearch = async (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        if (query.trim().length < 1) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const results = await connectionService.searchLearners(query, user.id);
            setSearchResults(results);
        } catch (err) {
            console.error('Search error:', err);
        } finally {
            setIsSearching(false);
        }
    };

    const sendRequest = async (receiverId) => {
        try {
            await connectionService.sendRequest(user.id, receiverId);
            fetchData();
            setSearchResults(prev => prev.map(r => r.id === receiverId ? { ...r, request_sent: true } : r));
            setSuggestions(prev => prev.filter(s => s.id !== receiverId));
        } catch (err) {
            console.error('Error sending request:', err);
        }
    };

    const handleAction = async (connId, status, sId, rId) => {
        try {
            await connectionService.respondToRequest(connId, status, sId, rId);
            fetchData();
        } catch (err) {
            console.error('Error responding to request:', err);
        }
    };

    const cancelRequest = async (connId) => {
        try {
            await connectionService.removeConnection(connId);
            fetchData();
        } catch (err) {
            console.error('Error canceling request:', err);
        }
    };

    return (
        <div className={styles.container}>
            {/* Search Box */}
            <div className={styles.searchSection}>
                <div className={styles.searchBox}>
                    <Search size={18} className={styles.searchIcon} />
                    <input 
                        type="text" 
                        placeholder={t('search_learner')} 
                        value={searchQuery}
                        onChange={handleSearch}
                    />
                    {isSearching && <div className={styles.searchLoader}><InlineLoader size="sm" /></div>}
                </div>
                {searchResults.length > 0 && (
                    <div className={styles.searchResults}>
                        {searchResults.map(l => (
                            <div key={l.id} className={styles.learnerItem}>
                                <div className={styles.learnerCore} onClick={() => onSelectLearner(l)}>
                                    <div className={styles.avatarMini}>
                                        {l.avatar_url ? <img src={l.avatar_url} /> : <User size={16} />}
                                    </div>
                                    <div className={styles.learnerText}>
                                        <span className={styles.learnerName}>{l.full_name || l.display_name}</span>
                                        <div className={styles.learnerSub}>
                                            <Zap size={10} color="#F1C40F" />
                                            {l.xp} XP
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    className={styles.actionBtn}
                                    onClick={() => sendRequest(l.id)}
                                    disabled={l.request_sent || connections.outgoing.some(o => o.receiver_id === l.id) || connections.active.some(a => a.sender_id === l.id || a.receiver_id === l.id)}
                                >
                                    { (l.request_sent || connections.outgoing.some(o => o.receiver_id === l.id)) ? <Check size={16} /> : <UserPlus size={16} />}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Sub-Tab Header */}
            <div className={styles.subTabHeader}>
                <button 
                    className={`${styles.subTabBtn} ${subTab === 'suggest' ? styles.subTabActive : ''}`}
                    onClick={() => setSubTab('suggest')}
                >
                    <Flame size={16} />
                    {t('suggest_connection') || 'কারা হতে পারে বন্ধু?'}
                </button>
                <button 
                    className={`${styles.subTabBtn} ${subTab === 'my' ? styles.subTabActive : ''}`}
                    onClick={() => setSubTab('my')}
                >
                    <Users size={16} />
                    {t('my_connections')}
                    {connections.pending.length > 0 && <span className={styles.notifBadge}>{connections.pending.length}</span>}
                </button>
                <button 
                    className={`${styles.subTabBtn} ${subTab === 'sent' ? styles.subTabActive : ''}`}
                    onClick={() => setSubTab('sent')}
                >
                    <Send size={16} />
                    {t('sent_connection') || 'পাঠানো অনুরোধ'}
                </button>
            </div>

            {/* Sub-Tab Content */}
            <div className={styles.subTabContent}>
                {isLoading ? (
                    <div style={{ padding: '4rem', textAlign: 'center' }}>
                        <InlineLoader />
                    </div>
                ) : (
                    <>
                        {subTab === 'suggest' && (
                            <div className={styles.suggestedSection}>
                                <h3 className={styles.sectionTitle}>{t('suggestions_for_you') || 'আপনার জন্য সাজেশন'}</h3>
                                {suggestions.length > 0 ? (
                                    <div className={styles.connGrid}>
                                        {suggestions.map(s => (
                                            <div key={s.id} className={styles.connCard}>
                                                <div className={styles.learnerCore} onClick={() => onSelectLearner(s)}>
                                                    <div className={styles.avatarMini}>
                                                        {s.avatar_url ? <img src={s.avatar_url} /> : <User size={20} />}
                                                    </div>
                                                    <div className={styles.learnerText}>
                                                        <span className={styles.learnerName}>{s.full_name || s.display_name}</span>
                                                        <div className={styles.learnerSub}>
                                                            <Zap size={10} color="#F1C40F" />
                                                            {s.xp} XP
                                                        </div>
                                                    </div>
                                                </div>
                                                <button className={styles.actionBtn} onClick={() => sendRequest(s.id)}>
                                                    <UserPlus size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className={styles.emptyState}>
                                        <Users size={40} opacity={0.2} />
                                        <p>{t('no_suggestions') || 'এখনো কোনো সাজেশন নেই'}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {subTab === 'my' && (
                            <div className={styles.myConnSection}>
                                {/* Pending Requests First */}
                                {connections.pending.length > 0 && (
                                    <div style={{ marginBottom: '2rem' }}>
                                        <h3 className={styles.sectionTitle}>{t('pending_requests')}</h3>
                                        <div className={styles.connGrid}>
                                            {connections.pending.map(conn => (
                                                <div key={conn.id} className={styles.connCard}>
                                                    <div className={styles.learnerCore} onClick={() => onSelectLearner(conn.sender)}>
                                                        <div className={styles.avatarMini}>
                                                            {conn.sender.avatar_url ? <img src={conn.sender.avatar_url} /> : <User size={20} />}
                                                        </div>
                                                        <div className={styles.learnerText}>
                                                            <span className={styles.learnerName}>{conn.sender.full_name || conn.sender.display_name}</span>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button className={styles.actionBtn} onClick={() => handleAction(conn.id, 'accepted', conn.sender_id, conn.receiver_id)}>
                                                            <Check size={16} />
                                                        </button>
                                                        <button className={styles.actionBtn} style={{ background: 'rgba(231, 76, 60, 0.2)', color: '#E74C3C' }} onClick={() => handleAction(conn.id, 'rejected')}>
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <h3 className={styles.sectionTitle}>{t('my_connections')}</h3>
                                {connections.active.length > 0 ? (
                                    <div className={styles.connGrid}>
                                        {connections.active.map(conn => {
                                            const other = conn.sender_id === user.id ? conn.receiver : conn.sender;
                                            return (
                                                <div key={conn.id} className={styles.connCard} onClick={() => onSelectLearner(other)}>
                                                    <div className={styles.avatarMini}>
                                                        {other.avatar_url ? <img src={other.avatar_url} /> : <User size={20} />}
                                                    </div>
                                                    <div className={styles.learnerText}>
                                                        <span className={styles.learnerName}>{other.full_name || other.display_name}</span>
                                                        <div className={styles.learnerSub}>
                                                            <Zap size={10} color="#F1C40F" />
                                                            {other.xp} XP
                                                        </div>
                                                    </div>
                                                    <ChevronRight size={16} color="rgba(255,255,255,0.2)" />
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className={styles.emptyState}>
                                        <Users size={40} opacity={0.2} />
                                        <p>{t('no_connections')}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {subTab === 'sent' && (
                            <div className={styles.sentSection}>
                                <h3 className={styles.sectionTitle}>{t('sent_connection') || 'পাঠানো অনুরোধ'}</h3>
                                {connections.outgoing.length > 0 ? (
                                    <div className={styles.connGrid}>
                                        {connections.outgoing.map(conn => (
                                            <div key={conn.id} className={styles.connCard}>
                                                <div className={styles.learnerCore} onClick={() => onSelectLearner(conn.receiver)}>
                                                    <div className={styles.avatarMini}>
                                                        {conn.receiver.avatar_url ? <img src={conn.receiver.avatar_url} /> : <User size={20} />}
                                                    </div>
                                                    <div className={styles.learnerText}>
                                                        <span className={styles.learnerName}>{conn.receiver.full_name || conn.receiver.display_name}</span>
                                                        <span className={styles.learnerSub}>{t('pending' || 'অপেক্ষমান')}</span>
                                                    </div>
                                                </div>
                                                <button className={styles.actionBtn} style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }} onClick={() => cancelRequest(conn.id)}>
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className={styles.emptyState}>
                                        <Send size={40} opacity={0.2} />
                                        <p>{t('no_sent_requests') || 'কোনো পেন্ডিং অনুরোধ নেই'}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default LearnerConnection;
