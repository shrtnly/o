import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { 
    Users, Search, UserPlus, UserRoundSearch, UserMinus, 
    Check, CheckCheck, X, ChevronRight, ChevronLeft, Zap, 
    MapPin, User, Send, MessageSquare, ImagePlus
} from 'lucide-react';
import { connectionService } from '../../../services/connectionService';
import { messageService } from '../../../services/messageService';
import { useLanguage } from '../../../context/LanguageContext';
import InlineLoader from '../../../components/ui/InlineLoader';
import { toast } from 'sonner';
import styles from './LearnerConnection.module.css';
import { motion, AnimatePresence } from 'framer-motion';

const LearnerConnection = ({ user, userXp, onSelectLearner }) => {
    const { t } = useLanguage();
    const [subTab, setSubTab] = useState('my'); // suggest, my, sent
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    
    const [connections, setConnections] = useState({ pending: [], active: [], outgoing: [] });
    const [suggestions, setSuggestions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // See All States
    const [showAllSuggest, setShowAllSuggest] = useState(false);
    const [showAllActive, setShowAllActive] = useState(false);
    const [showAllPending, setShowAllPending] = useState(false);
    const [showAllSent, setShowAllSent] = useState(false);

    const [sendingId, setSendingId] = useState(null);
    const [cardAction, setCardAction] = useState({ id: null, loading: false, success: false, msg: '' });
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [requestType, setRequestType] = useState('all'); // all, received, sent

    // Inbox States
    const [conversations, setConversations] = useState([]);
    const [selectedPartner, setSelectedPartner] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSendingMsg, setIsSendingMsg] = useState(false);
    const [isMessagesLoading, setIsMessagesLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
    const [pendingAttachmentUrl, setPendingAttachmentUrl] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const scrollRef = React.useRef(null);
    const fileInputRef = React.useRef(null);
    const chatWindowRef = React.useRef(null);
    const chatHeaderRef = React.useRef(null);
    const chatInputRowRef = React.useRef(null);
    const messageInputRef = React.useRef(null);

    const [inboxSearchQuery, setInboxSearchQuery] = useState('');

    // Derived filtered lists for the inbox search
    const filteredConversations = conversations.filter(conv => 
        (conv.partner.full_name || conv.partner.display_name)?.toLowerCase().includes(inboxSearchQuery.toLowerCase())
    );

    const filteredConnections = connections.active.filter(conn => {
        const other = conn.sender_id === user.id ? conn.receiver : conn.sender;
        const name = (other.full_name || other.display_name)?.toLowerCase();
        const matchesSearch = name.includes(inboxSearchQuery.toLowerCase());
        const alreadyInInbox = conversations.some(conv => conv.partner.id === other.id);
        return matchesSearch && !alreadyInInbox;
    });

    // Hard-lock touch gestures on stationary parts of the UI
    useEffect(() => {
        const preventDefault = (e) => {
            if (e.cancelable) e.preventDefault();
        };

        const header = chatHeaderRef.current;
        const inputRow = chatInputRowRef.current;

        if (header) {
            header.addEventListener('touchstart', (e) => e.stopPropagation());
            header.addEventListener('touchmove', preventDefault, { passive: false });
        }

        if (inputRow) {
            inputRow.addEventListener('touchstart', (e) => e.stopPropagation());
            inputRow.addEventListener('touchmove', preventDefault, { passive: false });
        }

        return () => {
            if (header) {
                header.removeEventListener('touchstart', (e) => e.stopPropagation());
                header.removeEventListener('touchmove', preventDefault);
            }
            if (inputRow) {
                inputRow.removeEventListener('touchstart', (e) => e.stopPropagation());
                inputRow.removeEventListener('touchmove', preventDefault);
            }
        };
    }, [isMobileChatOpen]);

    const fetchConnections = useCallback(async (isSilent = false) => {
        if (!user?.id) return;
        if (!isSilent) setIsLoading(true);
        try {
            const data = await connectionService.getConnections(user.id);
            setConnections(data);
        } catch (err) {
            console.error('Error fetching connections:', err);
        } finally {
            setIsLoading(false);
        }
    }, [user?.id]);

    const fetchSuggestions = useCallback(async (isSilent = false) => {
        if (!user?.id) return;
        try {
            const data = await connectionService.getSuggestions(user.id, userXp, 12);
            setSuggestions(data);
        } catch (err) {
            console.error('Error fetching suggestions:', err);
        }
    }, [user?.id, userXp]);

    const fetchData = useCallback(async (isSilent = false) => {
        if (!user?.id) return;
        if (!isSilent) setIsLoading(true);
        await Promise.all([
            fetchConnections(true),
            fetchSuggestions(true)
        ]);
        setIsLoading(false);
    }, [fetchConnections, fetchSuggestions]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Heartbeat for real-time connection updates
    useEffect(() => {
        if (!user?.id) return;

        const connectionSub = supabase
            .channel('connection-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'learner_connections' },
                (payload) => {
                    if (payload.new?.receiver_id === user.id || payload.old?.receiver_id === user.id || 
                        payload.new?.sender_id === user.id || payload.old?.sender_id === user.id) {
                        fetchConnections(true);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(connectionSub);
        };
    }, [user?.id, fetchConnections]);

    // Handle body scroll locking when mobile chat is open
    useEffect(() => {
        if (isMobileChatOpen) {
            const scrollY = window.scrollY;
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100vw';
            document.body.style.overflow = 'hidden';
            document.body.classList.add('mobile-chat-open');
        } else {
            const scrollY = document.body.style.top;
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.overflow = '';
            document.body.classList.remove('mobile-chat-open');
            if (scrollY) {
                window.scrollTo(0, parseInt(scrollY || '0') * -1);
            }
        }
        return () => {
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.overflow = '';
            document.body.classList.remove('mobile-chat-open');
        };
    }, [isMobileChatOpen]);

    // Handle mobile keyboard resize using Visual Viewport API
    useEffect(() => {
        if (!window.visualViewport || !isMobileChatOpen) return;

        const handleResize = () => {
            if (chatWindowRef.current) {
                chatWindowRef.current.style.height = `${window.visualViewport.height}px`;
                // Force scroll to bottom when keyboard opens/resizes
                if (scrollRef.current) {
                    setTimeout(() => {
                        if (scrollRef.current) {
                            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                        }
                    }, 100);
                }
            }
        };

        window.visualViewport.addEventListener('resize', handleResize);
        handleResize();

        return () => {
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', handleResize);
            }
        };
    }, [isMobileChatOpen]);

    // Keep selectedPartner ref for real-time listener to avoid re-subscribing
    const partnerRef = React.useRef(selectedPartner);
    const subTabRef = React.useRef(subTab);
    useEffect(() => { partnerRef.current = selectedPartner; }, [selectedPartner]);
    useEffect(() => { subTabRef.current = subTab; }, [subTab]);

    const handleFetchConversations = useCallback(async (isSilent = false) => {
        if (!user?.id) return;
        const data = await messageService.getConversations(user.id);
        setConversations(data);
    }, [user?.id]);

    const handleFetchMessages = useCallback(async (partnerId) => {
        if (!user?.id || !partnerId) return;
        setIsMessagesLoading(true);
        const data = await messageService.getMessages(user.id, partnerId);
        setMessages(data);
        setIsMessagesLoading(false);
        await messageService.markAsRead(user.id, partnerId);
        handleFetchConversations(true);
    }, [user?.id, handleFetchConversations]);

    // Heartbeat for real-time messages
    useEffect(() => {
        if (!user?.id) return;

        const messageSub = supabase
            .channel(`message-realtime-${user.id}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages' },
                (payload) => {
                    const currentPartner = partnerRef.current;
                    const currentTab = subTabRef.current;
                    // Only add messages via realtime if they were NOT sent by me
                    // My sent messages are already handled by the handleSendMessage optimistic update
                    if (payload.new.sender_id !== user.id && (payload.new.receiver_id === user.id || payload.new.sender_id === user.id)) {
                        if (currentPartner?.id === payload.new.sender_id || currentPartner?.id === payload.new.receiver_id) {
                            setMessages(prev => {
                                if (prev.filter(m => m.id === payload.new.id).length > 0) return prev;
                                return [...prev, payload.new];
                            });
                            if (payload.new.receiver_id === user.id && currentTab === 'inbox') {
                                messageService.markAsRead(user.id, currentPartner.id);
                            }
                        }
                        handleFetchConversations(true);
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'messages' },
                (payload) => {
                    if (payload.new.sender_id === user.id || payload.new.receiver_id === user.id) {
                        setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, is_read: payload.new.is_read } : m));
                        handleFetchConversations(true);
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Successfully subscribed to message-realtime');
                }
            });

        return () => {
            supabase.removeChannel(messageSub);
        };
    }, [user?.id, handleFetchConversations]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const resizeImage = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const MAX_SIZE = 800;
                    
                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    canvas.toBlob((blob) => {
                        resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                    }, 'image/jpeg', 0.6);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !selectedPartner || isUploading) return;
        
        try {
            setIsUploading(true);
            const resized = await resizeImage(file);
            
            // Show local preview immediately
            const localPreview = URL.createObjectURL(resized);
            setFilePreview(localPreview);

            const publicUrl = await messageService.uploadAttachment(resized, user.id);
            setPendingAttachmentUrl(publicUrl);
        } catch (err) {
            console.error('Upload error:', err);
            toast.error('ছবি প্রসেস করা সম্ভব হয়নি');
            setFilePreview(null);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const removePendingAttachment = () => {
        setPendingAttachmentUrl(null);
        setFilePreview(null);
    };

    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();
        const content = newMessage.trim();
        const attachment = pendingAttachmentUrl;

        if ((!content && !attachment) || !selectedPartner || isSendingMsg || isUploading) return;

        try {
            setIsSendingMsg(true);

            // Optimistically clear the input and reset state to make it feel instant
            const optimisticId = `temp-${Date.now()}`;
            const optimisticMsg = {
                id: optimisticId,
                sender_id: user.id,
                receiver_id: selectedPartner.id,
                content: content,
                attachment_url: attachment,
                created_at: new Date().toISOString(),
                is_sending: true
            };

            setNewMessage('');
            setPendingAttachmentUrl(null);
            setFilePreview(null);
            setMessages(prev => [...prev, optimisticMsg]);
            
            messageInputRef.current?.focus();

            const msg = await messageService.sendMessage(user.id, selectedPartner.id, content, attachment);
            
            // Replace optimistic message with the real one from DB
            setMessages(prev => prev.map(m => m.id === optimisticId ? msg : m));
        } catch (err) {
            toast.error('মেসেজ পাঠানো সম্ভব হয়নি');
            // Revert message if it failed or add back content to input? 
            // For now, just remove the failed optimistic message
            setMessages(prev => prev.filter(m => m.id !== optimisticId));
            setNewMessage(content); // Restore content to try again
        } finally {
            setIsSendingMsg(false);
            messageInputRef.current?.focus();
        }
    };

    const handleSelectConversation = (partner) => {
        setSelectedPartner(partner);
        handleFetchMessages(partner.id);
        setIsMobileChatOpen(true);
    };

    useEffect(() => {
        if (subTab === 'inbox') {
            handleFetchConversations();
        }
    }, [subTab, handleFetchConversations]);

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
        setSendingId(receiverId);
        try {
            await connectionService.sendRequest(user.id, receiverId);
            
            // Mark as sent locally first
            setSearchResults(prev => prev.map(r => r.id === receiverId ? { ...r, request_sent: true } : r));
            setSuggestions(prev => prev.map(s => s.id === receiverId ? { ...s, request_sent: true } : s));
            
            // Wait with the golden checkmark
            setTimeout(() => {
                setSearchResults(prev => prev.filter(r => r.id !== receiverId));
                setSuggestions(prev => prev.filter(s => s.id !== receiverId));
                fetchData(true); // silent update
            }, 1800);
            
        } catch (err) {
            console.error('Error sending request:', err);
        } finally {
            setSendingId(null);
        }
    };

    const handleAction = async (connId, status, sId, rId) => {
        setCardAction({ id: connId, loading: true, success: false, msg: '' });
        try {
            await connectionService.respondToRequest(connId, status, sId, rId);
            setCardAction({ id: connId, loading: false, success: true, msg: status === 'accepted' ? 'গ্রহণ করা হয়েছে' : 'বাতিল হয়েছে' });
            
            // Wait for user to read success msg
            setTimeout(() => {
                setConnections(prev => ({
                    ...prev,
                    pending: prev.pending.filter(p => p.id !== connId)
                }));
                setCardAction({ id: null, loading: false, success: false, msg: '' });
                fetchConnections(true);
            }, 1000);
        } catch (err) {
            console.error('Error responding to request:', err);
            toast.error('অনুরোধটি প্রসেসিং-এ সমস্যা হয়েছে');
            setCardAction({ id: null, loading: false, success: false, msg: '' });
        }
    };

    const cancelRequest = async (connId) => {
        setCardAction({ id: connId, loading: true, success: false, msg: '' });
        try {
            await connectionService.removeConnection(connId);
            setCardAction({ id: connId, loading: false, success: true, msg: 'বাতিল করা হয়েছে' });
            
            // Wait for user to read success msg
            setTimeout(() => {
                setConnections(prev => ({
                    ...prev,
                    active: prev.active.filter(a => a.id !== connId),
                    outgoing: prev.outgoing.filter(o => o.id !== connId)
                }));
                setCardAction({ id: null, loading: false, success: false, msg: '' });
                fetchConnections(true);
            }, 1000);
        } catch (err) {
            console.error('Error canceling request:', err);
            toast.error('রিমুভ করতে সমস্যা হয়েছে');
            setCardAction({ id: null, loading: false, success: false, msg: '' });
        }
    };

    const isOnline = (lastSeen) => {
        if (!lastSeen) return false;
        const lastSeenDate = new Date(lastSeen);
        const now = new Date();
        const diffMinutes = (now - lastSeenDate) / (1000 * 60);
        return diffMinutes < 5;
    };

    const StatusIndicator = ({ lastSeen }) => (
        <div className={`${styles.statusDot} ${isOnline(lastSeen) ? styles.statusOnline : styles.statusOffline}`} />
    );

    return (
        <div className={styles.container}>
            {/* Sub-Tab Header */}
            <div className={styles.subTabHeader}>
                <button 
                    className={`${styles.subTabBtn} ${subTab === 'my' ? styles.subTabActive : ''}`}
                    onClick={() => setSubTab('my')}
                >
                    <Users size={16} />
                    {'আমার কানেকশন'}
                </button>
                <button 
                    className={`${styles.subTabBtn} ${subTab === 'suggest' ? styles.subTabActive : ''}`}
                    onClick={() => setSubTab('suggest')}
                >
                    <UserRoundSearch size={16} />
                    {'সার্চ কানেকশন'}
                </button>
                <button 
                    className={`${styles.subTabBtn} ${subTab === 'inbox' ? styles.subTabActive : ''}`}
                    onClick={() => setSubTab('inbox')}
                >
                    <MessageSquare size={16} />
                    {'ইনবক্স'}
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
                        {subTab === 'inbox' ? (
                            <div className={`${styles.inboxWrapper} ${isMobileChatOpen ? styles.mobileChatActive : ''}`}>
                                {/* Conversation Sidebar */}
                                <div className={styles.conversationsSidebar}>
                                    <div className={styles.sidebarHeader}>
                                        <div className={styles.inboxSearchBox}>
                                            <Search size={14} />
                                            <textarea 
                                                rows="1"
                                                name="inbox_search_q_v2"
                                                autoComplete="off"
                                                autoCorrect="off"
                                                spellCheck="false"
                                                data-lpignore="true"
                                                aria-autocomplete="none"
                                                inputMode="search"
                                                placeholder="সার্চ করুন" 
                                                value={inboxSearchQuery}
                                                onChange={(e) => setInboxSearchQuery(e.target.value)}
                                            />
                                            {inboxSearchQuery && (
                                                <button 
                                                    className={styles.clearSearchBtn}
                                                    onClick={() => setInboxSearchQuery('')}
                                                    type="button"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className={styles.sidebarList}>
                                        {filteredConversations.length === 0 && !inboxSearchQuery ? (
                                            <div className={styles.emptyInbox}>
                                                <MessageSquare size={32} opacity={0.1} />
                                                <p>ইনবক্স খালি</p>
                                            </div>
                                        ) : (
                                            <>
                                                {filteredConversations.map(conv => (
                                                    <div 
                                                        key={conv.partner.id} 
                                                        className={`${styles.conversationItem} ${selectedPartner?.id === conv.partner.id ? styles.convActive : ''}`}
                                                        onClick={() => handleSelectConversation(conv.partner)}
                                                    >
                                                        <div className={styles.partnerAvatar}>
                                                            {conv.partner.avatar_url ? (
                                                                <img src={conv.partner.avatar_url} alt="" />
                                                            ) : (
                                                                <div className={styles.avatarPlaceholder}><User size={18} /></div>
                                                            )}
                                                            <StatusIndicator lastSeen={conv.partner.last_seen} />
                                                        </div>
                                                        <div className={styles.convDetails}>
                                                            <span className={styles.partnerName}>{conv.partner.full_name || conv.partner.display_name}</span>
                                                            <span className={styles.lastMsg}>{conv.lastMessage}</span>
                                                        </div>
                                                        {conv.isNew && (
                                                            <div className={styles.unreadBadge}>
                                                                <span>NEW</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                                
                                                {/* "Search New Learners" section if we're searching */}
                                                {inboxSearchQuery && filteredConnections.length > 0 && (
                                                    <div className={styles.newChatSection}>
                                                        <span className={styles.sectionLabel}>নতুন কানেকশন</span>
                                                        {filteredConnections.map(conn => {
                                                            const other = conn.sender_id === user.id ? conn.receiver : conn.sender;
                                                            return (
                                                                <div 
                                                                    key={other.id}
                                                                    className={styles.conversationItem}
                                                                    onClick={() => handleSelectConversation(other)}
                                                                >
                                                                    <div className={styles.partnerAvatar}>
                                                                        {other.avatar_url ? (
                                                                            <img src={other.avatar_url} alt="" />
                                                                        ) : (
                                                                            <div className={styles.avatarPlaceholder}><User size={18} /></div>
                                                                        )}
                                                                        <StatusIndicator lastSeen={other.last_seen} />
                                                                    </div>
                                                                    <div className={styles.convDetails}>
                                                                        <span className={styles.partnerName}>{other.full_name || other.display_name}</span>
                                                                        <span className={styles.lastMsg}>কানেক্টেড • চ্যাট শুরু করুন</span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {inboxSearchQuery && filteredConversations.length === 0 && filteredConnections.length === 0 && (
                                                    <div className={styles.noResults}>
                                                        <span>"{inboxSearchQuery}" এর জন্য কোনো চ্যাট পাওয়া যায়নি</span>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Chat Window */}
                                <div ref={chatWindowRef} className={styles.chatWindow}>
                                    {selectedPartner ? (
                                        <>
                                            <div ref={chatHeaderRef} className={styles.chatHeader}>
                                                <button 
                                                    className={styles.backToInbox}
                                                    onClick={() => setIsMobileChatOpen(false)}
                                                >
                                                    <ChevronLeft size={20} />
                                                </button>
                                                <div className={styles.partnerAvatar} onClick={() => onSelectLearner(selectedPartner)} style={{ cursor: 'pointer' }}>
                                                    {selectedPartner.avatar_url ? (
                                                        <img src={selectedPartner.avatar_url} alt="" />
                                                    ) : (
                                                        <div className={styles.avatarPlaceholder}><User size={18} /></div>
                                                    )}
                                                    <StatusIndicator lastSeen={selectedPartner.last_seen} />
                                                </div>
                                                <div className={styles.headerInfo}>
                                                    <span className={styles.partnerTitle}>{selectedPartner.full_name || selectedPartner.display_name}</span>
                                                    <span className={styles.onlineStatus}>{isOnline(selectedPartner.last_seen) ? 'অনলাইন' : 'অফলাইন'}</span>
                                                </div>
                                            </div>

                                            <div ref={scrollRef} className={styles.messageScroll}>
                                                {isMessagesLoading ? (
                                                    <div className={styles.chatLoader}><InlineLoader size={80} showText={false} /></div>
                                                ) : (
                                                    <AnimatePresence mode="popLayout">
                                                        {messages.map((msg, idx) => (
                                                            <motion.div 
                                                                key={msg.id || idx}
                                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                                className={msg.sender_id === user.id ? styles.msgSent : styles.msgReceived}
                                                            >
                                                                <div className={styles.msgBubble}>
                                                                    {msg.attachment_url && (
                                                                        <div className={styles.msgAttachment}>
                                                                            <img src={msg.attachment_url} alt="" onClick={() => window.open(msg.attachment_url, '_blank')} />
                                                                        </div>
                                                                    )}
                                                                    {msg.content && <span>{msg.content}</span>}
                                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                                                                        <span className={styles.msgTime}>
                                                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                        </span>
                                                                        {msg.sender_id === user.id && (
                                                                            <span style={{ display: 'flex' }}>
                                                                                    <CheckCheck 
                                                                                        size={12} 
                                                                                        color={msg.is_read ? "var(--color-primary)" : "rgba(255,255,255,0.2)"} 
                                                                                        style={{ transition: 'all 0.3s ease' }}
                                                                                    />
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        ))}
                                                    </AnimatePresence>
                                                )}
                                                <div style={{ height: '1px' }} />
                                            </div>

                                            {filePreview && (
                                                <div className={styles.imagePreviewContainer}>
                                                    <div className={styles.imagePreview}>
                                                        <img src={filePreview} alt="" />
                                                        <button 
                                                            className={styles.removePreview} 
                                                            onClick={removePendingAttachment}
                                                            type="button"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                        {isUploading && (
                                                            <div className={styles.previewLoader}>
                                                                <InlineLoader size={30} showText={false} />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            <div ref={chatInputRowRef} className={styles.chatInputRow}>
                                                <button 
                                                    type="button" 
                                                    className={styles.attachBtn} 
                                                    onClick={() => fileInputRef.current?.click()} 
                                                    disabled={isUploading || isSendingMsg}
                                                >
                                                    <ImagePlus size={20} />
                                                </button>
                                                <input 
                                                    type="file" 
                                                    ref={fileInputRef} 
                                                    style={{ display: 'none' }} 
                                                    accept="image/*" 
                                                    onChange={handleImageUpload} 
                                                />
                                                <textarea 
                                                    ref={messageInputRef}
                                                    rows="1"
                                                    name="msg_field_v1"
                                                    autoComplete="off"
                                                    autoCorrect="off"
                                                    spellCheck="false"
                                                    data-lpignore="true"
                                                    enterKeyHint="send"
                                                    inputMode="text"
                                                    aria-autocomplete="none"
                                                    placeholder="কোনো কিছু লিখুন..." 
                                                    value={newMessage}
                                                    onChange={(e) => setNewMessage(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                            e.preventDefault();
                                                            handleSendMessage();
                                                        }
                                                    }}
                                                    className={styles.chatInput}
                                                />
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleSendMessage()}
                                                    disabled={(!newMessage.trim() && !pendingAttachmentUrl) || isSendingMsg || isUploading}
                                                >
                                                    {isSendingMsg ? (
                                                        <InlineLoader size={20} showText={false} />
                                                    ) : (
                                                        <Send 
                                                            size={22} 
                                                            fill={(newMessage.trim() || pendingAttachmentUrl) ? "currentColor" : "none"} 
                                                            fillOpacity={0.1}
                                                        />
                                                    )}
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className={styles.chatEmptyState}>
                                            <MessageSquare size={48} opacity={0.1} />
                                            <p>কথা বলা শুরু করুন</p>
                                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>একটি কনভারসেশন সিলেক্ট করুন</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <>
                                {subTab === 'suggest' && (
                                    <div className={styles.suggestedSection}>
                                        {/* Search Box Moved Here */}
                                        <div className={styles.searchSection}>
                                            <div className={styles.searchBox}>
                                                <Search size={18} className={styles.searchIcon} />
                                                <input 
                                                    type="text" 
                                                    placeholder={t('search_learner') || 'শিক্ষার্থী খুঁজুন...'} 
                                                    value={searchQuery}
                                                    onChange={handleSearch}
                                                    onFocus={() => setIsSearchFocused(true)}
                                                />
                                                {(searchQuery || isSearchFocused) && (
                                                    <button 
                                                        className={styles.clearSearchBtn}
                                                        onClick={() => {
                                                            setSearchQuery('');
                                                            setSearchResults([]);
                                                            setIsSearchFocused(false);
                                                        }}
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                )}
                                                {isSearching && <div className={styles.searchLoader}><InlineLoader size={40} showText={false} /></div>}
                                            </div>
                                            {searchResults.length > 0 ? (
                                                <div className={styles.searchResults}>
                                                    {searchResults.map(learner => (
                                                        <div key={learner.id} className={styles.learnerItem}>
                                                            <div className={styles.learnerCore} onClick={() => onSelectLearner(learner)}>
                                                                <div className={styles.avatarMini}>
                                                                    {learner.avatar_url ? <img src={learner.avatar_url} alt={learner.full_name} /> : <User size={20} />}
                                                                    <StatusIndicator lastSeen={learner.last_seen} />
                                                                </div>
                                                                <div className={styles.learnerText}>
                                                                    <span className={styles.learnerName}>{learner.full_name || learner.display_name}</span>
                                                                    <div className={styles.learnerSub}>
                                                                        <Zap size={10} color="#F1C40F" />
                                                                        {learner.xp} XP
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                                                <button 
                                                                    className={styles.actionBtn}
                                                                    onClick={() => sendRequest(learner.id)}
                                                                    disabled={sendingId === learner.id || learner.request_sent || connections.outgoing.some(o => o.receiver_id === learner.id) || connections.active.some(a => a.sender_id === learner.id || a.receiver_id === learner.id)}
                                                                >
                                                                    {sendingId === learner.id ? (
                                                                        <InlineLoader size={30} showText={false} />
                                                                    ) : (
                                                                        (learner.request_sent || connections.outgoing.some(o => o.receiver_id === learner.id)) ? 
                                                                        <Check size={16} color="#F1C40F" /> : <UserPlus size={16} />
                                                                    )}
                                                                </button>
                                                                {(learner.request_sent || connections.outgoing.some(o => o.receiver_id === learner.id)) && (
                                                                    <span style={{ fontSize: '10px', color: '#F1C40F', fontWeight: '600' }}>
                                                                        অনুরোধ পাঠানো হয়েছে
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                searchQuery.trim().length > 0 && !isSearching && (
                                                    <div style={{ 
                                                        padding: '24px 8px', 
                                                        fontSize: '0.85rem', 
                                                        color: 'rgba(255,255,255,0.4)',
                                                        textAlign: 'center',
                                                        background: 'rgba(255,255,255,0.01)',
                                                        borderRadius: '12px',
                                                        border: '1px dashed rgba(255,255,255,0.05)',
                                                        marginTop: '8px'
                                                    }}>
                                                        "{searchQuery}" এর জন্য কোনো learner পাওয়া যায় নি
                                                    </div>
                                                )
                                            )}
                                        </div>

                                        {!searchQuery && !isSearchFocused && (
                                            <>
                                                <div className={styles.sectionHeader}>
                                                </div>
                                                {suggestions.length > 0 ? (
                                                    <div className={styles.connGrid}>
                                                        {suggestions.map(s => (
                                                            <div key={s.id} className={styles.connCard}>
                                                                <div className={styles.learnerCore} onClick={() => onSelectLearner(s)}>
                                                                    <div className={styles.avatarMini}>
                                                                        {s.avatar_url ? <img src={s.avatar_url} /> : <User size={20} />}
                                                                        <StatusIndicator lastSeen={s.last_seen} />
                                                                    </div>
                                                                    <div className={styles.learnerText}>
                                                                        <span className={styles.learnerName}>{s.full_name || s.display_name}</span>
                                                                        <div className={styles.learnerSub}>
                                                                            <Zap size={10} color="#F1C40F" />
                                                                            {s.xp} XP
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                                                    <button 
                                                                        className={styles.actionBtn} 
                                                                        onClick={() => sendRequest(s.id)}
                                                                        disabled={sendingId === s.id || s.request_sent}
                                                                    >
                                                                        {sendingId === s.id ? (
                                                                            <InlineLoader size={30} showText={false} />
                                                                        ) : (
                                                                            s.request_sent ? <Check size={16} color="#F1C40F" /> : <UserPlus size={16} />
                                                                        )}
                                                                    </button>
                                                                    {s.request_sent && (
                                                                        <span style={{ fontSize: '10px', color: '#F1C40F', fontWeight: '600' }}>
                                                                            অনুরোধ পাঠানো হয়েছে
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className={styles.emptyState}>
                                                        <Users size={40} opacity={0.2} />
                                                        <p>{t('no_suggestions') || 'এখনো কোনো সাজেশন নেই'}</p>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}

                                {subTab === 'my' && (
                                    <div className={styles.myConnSection}>
                                        {/* Connection Toggles */}
                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '0.75rem', padding: '0 4px' }}>
                                            <button 
                                                className={`${styles.tagBtn} ${requestType === 'all' ? styles.tagActive : ''}`}
                                                onClick={() => setRequestType('all')}
                                            >
                                                কানেকশন
                                            </button>
                                            <button 
                                                className={`${styles.tagBtn} ${requestType === 'received' ? styles.tagActive : ''}`}
                                                onClick={() => setRequestType('received')}
                                            >
                                                প্রাপ্ত
                                                {connections.pending.length > 0 && <span className={styles.tagBadge}>{connections.pending.length}</span>}
                                            </button>
                                            <button 
                                                className={`${styles.tagBtn} ${requestType === 'sent' ? styles.tagActive : ''}`}
                                                onClick={() => setRequestType('sent')}
                                            >
                                                পাঠানো
                                            </button>
                                        </div>

                                        {requestType === 'all' && (
                                            <>
                                                {connections.active.length > 0 ? (
                                                    <div className={styles.connGrid}>
                                                        <AnimatePresence mode='popLayout'>
                                                            {connections.active.map(conn => {
                                                                const other = conn.sender_id === user.id ? conn.receiver : conn.sender;
                                                                return (
                                                                    <motion.div 
                                                                        key={conn.id} 
                                                                        layout
                                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                                        animate={{ opacity: 1, scale: 1 }}
                                                                        exit={{ opacity: 0, scale: 0.9, x: -20 }}
                                                                        className={styles.connCard}
                                                                    >
                                                                        <div className={styles.learnerCore} onClick={() => onSelectLearner(other)}>
                                                                            <div className={styles.avatarMini}>
                                                                                {other.avatar_url ? <img src={other.avatar_url} /> : <User size={20} />}
                                                                                <StatusIndicator lastSeen={other.last_seen} />
                                                                            </div>
                                                                            <div className={styles.learnerText}>
                                                                                <span className={styles.learnerName}>{other.full_name || other.display_name}</span>
                                                                                <span className={styles.learnerSub}>কানেক্টেড • {other.xp} XP</span>
                                                                            </div>
                                                                        </div>
                                                                        {cardAction.id === conn.id ? (
                                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '80px', gap: '4px' }}>
                                                                                {cardAction.success ? (
                                                                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ marginBottom: '2px' }}>
                                                                                        <Check color="#f1c40f" size={20} />
                                                                                    </motion.div>
                                                                                ) : (
                                                                                    <InlineLoader size={120} showText={false} />
                                                                                )}
                                                                                {cardAction.success && (
                                                                                    <motion.span 
                                                                                        initial={{ opacity: 0, y: 5 }}
                                                                                        animate={{ opacity: 1, y: 0 }}
                                                                                        style={{ fontSize: '11px', color: '#f1c40f', fontWeight: '600' }}
                                                                                    >
                                                                                        {cardAction.msg}
                                                                                    </motion.span>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <button 
                                                                                className={styles.actionBtn} 
                                                                                style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--color-primary)' }}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setSubTab('inbox');
                                                                                    handleSelectConversation(other);
                                                                                }}
                                                                            >
                                                                                <MessageSquare size={16} fill="currentColor" fillOpacity={0.1} />
                                                                            </button>
                                                                        )}
                                                                    </motion.div>
                                                                );
                                                            })}
                                                        </AnimatePresence>
                                                    </div>
                                                ) : (
                                                    <div className={styles.emptyState}>
                                                        <Users size={40} opacity={0.2} />
                                                        <p>{t('no_connections')}</p>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {requestType === 'received' && (
                                            <>
                                                {connections.pending.length > 0 ? (
                                                    <div className={styles.connGrid}>
                                                        <AnimatePresence mode='popLayout'>
                                                            {connections.pending.map(conn => (
                                                                <motion.div 
                                                                    key={conn.id} 
                                                                    layout
                                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                                    animate={{ opacity: 1, scale: 1 }}
                                                                    exit={{ opacity: 0, scale: 0.9, x: 20 }}
                                                                    className={styles.connCard}
                                                                >
                                                                    <div className={styles.learnerCore} onClick={() => onSelectLearner(conn.sender)}>
                                                                        <div className={styles.avatarMini}>
                                                                            {conn.sender.avatar_url ? <img src={conn.sender.avatar_url} /> : <User size={20} />}
                                                                            <StatusIndicator lastSeen={conn.sender.last_seen} />
                                                                        </div>
                                                                        <div className={styles.learnerText}>
                                                                            <span className={styles.learnerName}>{conn.sender.full_name || conn.sender.display_name}</span>
                                                                            <span className={styles.learnerSub}>নতুন অনুরোধ</span>
                                                                        </div>
                                                                    </div>
                                                                    {cardAction.id === conn.id ? (
                                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '80px', gap: '4px' }}>
                                                                            {cardAction.success ? (
                                                                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ marginBottom: '2px' }}>
                                                                                    <Check color="#f1c40f" size={20} />
                                                                                </motion.div>
                                                                            ) : (
                                                                                <InlineLoader size={120} showText={false} />
                                                                            )}
                                                                            {cardAction.success && (
                                                                                <motion.span 
                                                                                    initial={{ opacity: 0, y: 5 }}
                                                                                    animate={{ opacity: 1, y: 0 }}
                                                                                    style={{ fontSize: '11px', color: '#f1c40f', fontWeight: '600' }}
                                                                                >
                                                                                    {cardAction.msg}
                                                                                </motion.span>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                                            <button className={styles.actionBtn} onClick={() => handleAction(conn.id, 'accepted', conn.sender_id, conn.receiver_id)}>
                                                                                <Check size={16} />
                                                                            </button>
                                                                            <button className={styles.actionBtn} style={{ background: 'rgba(231, 76, 60, 0.2)', color: '#E74C3C' }} onClick={() => handleAction(conn.id, 'rejected')}>
                                                                                <X size={16} />
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </motion.div>
                                                            ))}
                                                        </AnimatePresence>
                                                    </div>
                                                ) : (
                                                    <div className={styles.emptyState}>
                                                        <Users size={40} opacity={0.2} />
                                                        <p>প্রাপ্ত অনুরোধ নেই</p>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {requestType === 'sent' && (
                                            <>
                                                {connections.outgoing.length > 0 ? (
                                                    <div className={styles.connGrid}>
                                                        <AnimatePresence mode='popLayout'>
                                                            {connections.outgoing.map(conn => (
                                                                <motion.div 
                                                                    key={conn.id} 
                                                                    layout
                                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                                    animate={{ opacity: 1, scale: 1 }}
                                                                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                                                    className={styles.connCard}
                                                                >
                                                                    <div className={styles.learnerCore} onClick={() => onSelectLearner(conn.receiver)}>
                                                                        <div className={styles.avatarMini}>
                                                                            {conn.receiver.avatar_url ? <img src={conn.receiver.avatar_url} /> : <User size={20} />}
                                                                            <StatusIndicator lastSeen={conn.receiver.last_seen} />
                                                                        </div>
                                                                        <div className={styles.learnerText}>
                                                                            <span className={styles.learnerName}>{conn.receiver.full_name || conn.receiver.display_name}</span>
                                                                            <span className={styles.learnerSub}>অপেক্ষমান</span>
                                                                        </div>
                                                                    </div>
                                                                    {cardAction.id === conn.id ? (
                                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '80px', gap: '4px' }}>
                                                                            {cardAction.success ? (
                                                                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ marginBottom: '2px' }}>
                                                                                    <Check color="#f1c40f" size={20} />
                                                                                </motion.div>
                                                                            ) : (
                                                                                <InlineLoader size={120} showText={false} />
                                                                            )}
                                                                            {cardAction.success && (
                                                                                <motion.span 
                                                                                    initial={{ opacity: 0, y: 5 }}
                                                                                    animate={{ opacity: 1, y: 0 }}
                                                                                    style={{ fontSize: '11px', color: '#f1c40f', fontWeight: '600' }}
                                                                                >
                                                                                    {cardAction.msg}
                                                                                </motion.span>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <button className={styles.actionBtn} style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }} onClick={() => cancelRequest(conn.id)}>
                                                                            <X size={16} />
                                                                        </button>
                                                                    )}
                                                                </motion.div>
                                                            ))}
                                                        </AnimatePresence>
                                                    </div>
                                                ) : (
                                                    <div className={styles.emptyState}>
                                                        <Send size={40} opacity={0.2} />
                                                        <p>পাঠানো অনুরোধ নেই</p>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default LearnerConnection;
