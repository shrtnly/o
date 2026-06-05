import React, { useState, useEffect, useCallback, Fragment, useTransition } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
import { 
    Users, Search, UserPlus, UserRoundSearch, UserMinus, 
    Check, CheckCheck, X, ChevronRight, ChevronLeft, Zap, 
    MapPin, User, Send, SendHorizontal, MessageSquare, ImagePlus,
    ChevronDown, Trash2, Ban, Image as ImageIcon, Swords
} from 'lucide-react';
import { connectionService } from '../../../services/connectionService';
import { messageService } from '../../../services/messageService';
import { useLanguage } from '../../../context/LanguageContext';
import InlineLoader from '../../../components/ui/InlineLoader';
import { toast } from 'sonner';
import { useNotifications } from '../../../context/NotificationContext';
import styles from './LearnerConnection.module.css';
import { motion, AnimatePresence } from 'framer-motion';
import Skeleton from '../../../components/ui/Skeleton';
import BattleWar from '../../connections/components/BattleWar';
import BattleSkeleton from '../../connections/components/BattleSkeleton';

const LearnerConnection = ({ user, userXp, userProfile, onSelectLearner }) => {
    const { t, language } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();
    const [subTab, setSubTab] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        const subValue = params.get('sub');
        if (subValue === 'received' || subValue === 'sent') return 'my';
        return subValue || 'battle';
    }); // battle, suggest, my, sent, inbox
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    
    const [connections, setConnections] = useState({ pending: [], active: [], outgoing: [] });
    const [suggestions, setSuggestions] = useState([]);
    const [blockedList, setBlockedList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // See All States
    const [showAllSuggest, setShowAllSuggest] = useState(false);
    const [showAllActive, setShowAllActive] = useState(false);
    const [showAllPending, setShowAllPending] = useState(false);
    const [showAllSent, setShowAllSent] = useState(false);

    const [sendingId, setSendingId] = useState(null);
    const [cardAction, setCardAction] = useState({ id: null, loading: false, success: false, msg: '' });
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [requestType, setRequestType] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        const subValue = params.get('sub');
        if (subValue === 'received' || subValue === 'sent') return subValue;
        return 'all';
    }); // all, received, sent

    // Inbox States
    const [conversations, setConversations] = useState([]);
    const [selectedPartner, setSelectedPartner] = useState(null);
    const [messages, setMessages] = useState([]);
    const [canSend, setCanSend] = useState(false); // lightweight bool — avoids re-render per keystroke
    const [, startCanSendTransition] = useTransition(); // defers setCanSend so typing is never blocked
    const [isSendingMsg, setIsSendingMsg] = useState(false);
    const [isMessagesLoading, setIsMessagesLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isMobileChatOpen, setIsMobileChatOpen] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('sub') === 'inbox' && params.get('partnerId') && window.innerWidth <= 768;
    });
    const [isDeepLinking, setIsDeepLinking] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('sub') === 'inbox' && !!params.get('partnerId');
    });
    const [pendingAttachmentUrl, setPendingAttachmentUrl] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const [viewerImage, setViewerImage] = useState(null);
    const { setActiveChatId, setIsInboxOpen, clearMsgIndicator } = useNotifications();
    const scrollRef = React.useRef(null);
    const fileInputRef = React.useRef(null);
    const chatWindowRef = React.useRef(null);
    const chatHeaderRef = React.useRef(null);
    const chatInputRowRef = React.useRef(null);
    const messageInputRef = React.useRef(null);
    const oldestMsgTimestampRef = React.useRef(null); // cursor for load-more pagination

    const [hasMoreMessages, setHasMoreMessages] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const [inboxSearchQuery, setInboxSearchQuery] = useState('');
    const [isConversationsLoading, setIsConversationsLoading] = useState(true);
    const [msgOptionsId, setMsgOptionsId] = useState(null);
    const [battlePhase, setBattlePhase] = useState('lobby'); // lobby, searching, matchmaking, game, result

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
        const stopProp = (e) => e.stopPropagation();

        const header = chatHeaderRef.current;
        const inputRow = chatInputRowRef.current;

        if (header) {
            header.addEventListener('touchstart', stopProp);
            header.addEventListener('touchmove', preventDefault, { passive: false });
        }
        // NOTE: do NOT block touchmove on inputRow — it freezes the textarea on mobile

        return () => {
            if (header) {
                header.removeEventListener('touchstart', stopProp);
                header.removeEventListener('touchmove', preventDefault);
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

    const fetchBlockedList = useCallback(async () => {
        if (!user?.id) return;
        try {
            const { data, error } = await supabase
                .from('blocked_users')
                .select('*, blocked:profiles!blocked_id(*)')
                .eq('blocker_id', user.id)
                .order('created_at', { ascending: false });
            if (!error) setBlockedList(data || []);
        } catch (err) {
            console.error('Error fetching block list:', err);
        }
    }, [user?.id]);

    const fetchData = useCallback(async (isSilent = false) => {
        if (!user?.id) return;
        if (!isSilent) setIsLoading(true);
        await Promise.all([
            fetchConnections(true),
            fetchSuggestions(true),
            fetchBlockedList()
        ]);
        setIsLoading(false);
    }, [fetchConnections, fetchSuggestions, fetchBlockedList]);

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

    // const location = useLocation(); // moved up

    // Deep link handler for subTab and partnerId
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const sub = params.get('sub');
        const partnerId = params.get('partnerId');

        if (sub === 'inbox' && partnerId) {
            const handleDeepLink = async () => {
                const existing = conversations.find(c => c.partner.id === partnerId);
                if (existing) {
                    handleSelectConversation(existing.partner);
                } else {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', partnerId)
                        .single();
                    if (profile) handleSelectConversation(profile);
                }
                setIsDeepLinking(false);
                // remove only partnerId, keep sub=inbox
                params.delete('partnerId');
                navigate(`?${params.toString()}`, { replace: true });
            };
            handleDeepLink();
        }
    }, [location.search, conversations.length]);

    // Sync URL with Tab State
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        let targetSub = subTab;
        if (subTab === 'my') {
            if (requestType === 'received') targetSub = 'received';
            else if (requestType === 'sent') targetSub = 'sent';
        }
        
        if (params.get('sub') !== targetSub && !params.get('partnerId')) {
            params.set('sub', targetSub);
            navigate(`?${params.toString()}`, { replace: true });
        }
    }, [subTab, requestType, location.pathname]);


    useEffect(() => {
        setIsInboxOpen(subTab === 'inbox');
        // Clear active chat if not in inbox or if switching tabs
        if (subTab !== 'inbox') {
            setActiveChatId(null);
        } else {
            // User entered inbox — clear the nav dot indicator
            clearMsgIndicator();
            if (!selectedPartner) {
                setActiveChatId(null);
            } else {
                setActiveChatId(selectedPartner.id);
            }
        }

        return () => {
            setIsInboxOpen(false);
            setActiveChatId(null);
        };
    }, [subTab, selectedPartner, setIsInboxOpen, setActiveChatId, clearMsgIndicator]);

    // Handle body scroll locking when mobile chat is open
    useEffect(() => {
        if (isMobileChatOpen && window.innerWidth <= 768) {
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

    // Intercept browser/hardware back button while mobile chat is open
    useEffect(() => {
        if (!isMobileChatOpen || window.innerWidth > 768) return;

        // Push a phantom history entry so the back button can be intercepted
        window.history.pushState({ mobileChatOpen: true }, '');

        const handlePopState = (e) => {
            // Back was pressed — close chat instead of navigating away
            setSelectedPartner(null);
            setIsMobileChatOpen(false);
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
            // If the chat is closed programmatically (via back button in UI),
            // consume the phantom entry so history stays clean
            if (window.history.state?.mobileChatOpen) {
                window.history.back();
            }
        };
    }, [isMobileChatOpen]);

    // Handle mobile keyboard resize using Visual Viewport API
    useEffect(() => {
        const isMobileScreen = () => window.innerWidth <= 768;
        if (!window.visualViewport || !isMobileChatOpen || !isMobileScreen()) return;

        let rafId = null;
        let scrollTimer = null;

        const handleResize = () => {
            if (!chatWindowRef.current) return;
            const vv = window.visualViewport;

            // Cancel any pending RAF before scheduling a new one (debounce)
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                const el = chatWindowRef.current;
                if (!el) return;
                el.style.setProperty('top', `${vv.offsetTop}px`, 'important');
                el.style.setProperty('height', `${vv.height}px`, 'important');
                el.style.setProperty('bottom', 'auto', 'important');
            });

            // Debounce scroll-to-bottom so only the final resize fires it
            if (scrollTimer) clearTimeout(scrollTimer);
            scrollTimer = setTimeout(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
            }, 120);
        };

        window.visualViewport.addEventListener('resize', handleResize);
        handleResize();

        return () => {
            window.visualViewport.removeEventListener('resize', handleResize);
            if (rafId) cancelAnimationFrame(rafId);
            if (scrollTimer) clearTimeout(scrollTimer);
            if (chatWindowRef.current) {
                const el = chatWindowRef.current;
                el.style.removeProperty('top');
                el.style.removeProperty('height');
                el.style.removeProperty('bottom');
            }
        };
    }, [isMobileChatOpen]);

    const handleDeleteMessage = async (msgId) => {
        try {
            await messageService.deleteMessage(msgId, user.id);
            // Optimistically mark as deleted — shows placeholder in chat on both sides
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_deleted: true } : m));
            setMsgOptionsId(null);
            // Instantly update the conversation card for the sender
            if (selectedPartner) {
                setConversations(prev => {
                    const idx = prev.findIndex(c => c.partner.id === selectedPartner.id);
                    if (idx === -1) return prev;
                    const updated = { ...prev[idx], lastIsDeleted: true, lastDeletedBySelf: true };
                    return [updated, ...prev.filter((_, i) => i !== idx)];
                });
            }
            handleFetchConversations(true);
        } catch (err) {
            console.error('Error deleting message:', err);
            toast.error('মুছে ফেলতে সমস্যা হয়েছে');
        }
    };

    // Keep selectedPartner ref for real-time listener to avoid re-subscribing
    const partnerRef = React.useRef(selectedPartner);
    const subTabRef = React.useRef(subTab);
    useEffect(() => { partnerRef.current = selectedPartner; }, [selectedPartner]);
    useEffect(() => { subTabRef.current = subTab; }, [subTab]);

    const handleFetchConversations = useCallback(async (isSilent = false) => {
        if (!user?.id) return;
        if (!isSilent) setIsConversationsLoading(true);
        try {
            const data = await messageService.getConversations(user.id);
            setConversations(data);
        } catch (err) {
            console.error('Error fetching conversations:', err);
        } finally {
            setIsConversationsLoading(false);
        }
    }, [user?.id]);

    const handleFetchMessages = useCallback(async (partnerId) => {
        if (!user?.id || !partnerId) return;
        setIsMessagesLoading(true);
        oldestMsgTimestampRef.current = null;
        setHasMoreMessages(false);

        const { messages: data, hasMore } = await messageService.getMessages(user.id, partnerId);
        setMessages(data);
        setHasMoreMessages(hasMore);
        if (data.length > 0) {
            oldestMsgTimestampRef.current = data[0].created_at;
        }
        setIsMessagesLoading(false);
        // Fire-and-forget: don't block message display on read/conversation refresh
        messageService.markAsRead(user.id, partnerId).catch(() => {});
        handleFetchConversations(true);
    }, [user?.id, handleFetchConversations]);

    const handleLoadMoreMessages = useCallback(async () => {
        if (!user?.id || !selectedPartner?.id || isLoadingMore || !hasMoreMessages) return;
        if (!oldestMsgTimestampRef.current) return;

        setIsLoadingMore(true);
        const container = scrollRef.current;
        const prevScrollHeight = container?.scrollHeight ?? 0;

        const { messages: older, hasMore } = await messageService.getMessages(
            user.id, selectedPartner.id,
            { before: oldestMsgTimestampRef.current }
        );

        if (older.length > 0) {
            oldestMsgTimestampRef.current = older[0].created_at;
            setMessages(prev => [...older, ...prev]);
            setHasMoreMessages(hasMore);
            // Restore scroll position — prevent the view jumping to top after prepend
            requestAnimationFrame(() => {
                if (container) {
                    container.scrollTop = container.scrollHeight - prevScrollHeight;
                }
            });
        } else {
            setHasMoreMessages(false);
        }
        setIsLoadingMore(false);
    }, [user?.id, selectedPartner?.id, isLoadingMore, hasMoreMessages]);

    // Heartbeat for real-time messages
    useEffect(() => {
        if (!user?.id) return;

        // Instantly patch the conversations sidebar card from a realtime payload
        const updateConversationFromPayload = (msg, options = {}) => {
            const { markNew = false, markDeleted = false } = options;
            const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;

            setConversations(prev => {
                const existingIdx = prev.findIndex(c => c.partner.id === partnerId);

                if (existingIdx === -1) {
                    // New conversation — will be filled in properly by background fetch
                    return prev;
                }

                const existing = prev[existingIdx];
                const updated = {
                    ...existing,
                    lastMessage: markDeleted ? existing.lastMessage : (msg.content ?? existing.lastMessage),
                    lastAttachment: markDeleted ? existing.lastAttachment : (msg.attachment_url ?? existing.lastAttachment),
                    lastIsDeleted: markDeleted ? true : false,
                    lastDeletedBySelf: markDeleted ? (msg.sender_id === user.id) : false,
                    timestamp: msg.created_at ?? existing.timestamp,
                    isNew: markNew
                        ? (msg.receiver_id === user.id && partnerRef.current?.id !== partnerId)
                        : existing.isNew,
                };

                // Move to top
                const rest = prev.filter((_, i) => i !== existingIdx);
                return [updated, ...rest];
            });
        };

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
                        // Instantly update the conversation card (zero latency)
                        updateConversationFromPayload(payload.new, { markNew: true });
                        // Background sync for accuracy (unread counts, partner profile etc.)
                        handleFetchConversations(true);
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'messages' },
                (payload) => {
                    if (payload.new.sender_id === user.id || payload.new.receiver_id === user.id) {
                        if (payload.new.is_deleted) {
                            // Mark as deleted in state so both sides show the placeholder
                            setMessages(prev => prev.map(m =>
                                m.id === payload.new.id ? { ...m, is_deleted: true } : m
                            ));
                            // Clear the last message preview on the card if it was this message
                            updateConversationFromPayload(payload.new, { markDeleted: true });
                        } else {
                            setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, is_read: payload.new.is_read } : m));
                        }
                        handleFetchConversations(true);
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'messages' },
                (payload) => {
                    // payload.old contains the deleted row (id, sender_id, receiver_id)
                    const deletedId = payload.old?.id;
                    if (!deletedId) return;

                    const currentPartner = partnerRef.current;
                    // Remove from chat window if this conversation is open
                    if (
                        currentPartner?.id === payload.old?.sender_id ||
                        currentPartner?.id === payload.old?.receiver_id
                    ) {
                        setMessages(prev => prev.filter(m => m.id !== deletedId));
                    }
                    // Refresh conversation list for both sides
                    handleFetchConversations(true);
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

    // Smart auto-scroll: only jump to bottom on NEW messages, not when prepending older ones
    const isLoadingMoreRef = React.useRef(false);
    useEffect(() => { isLoadingMoreRef.current = isLoadingMore; }, [isLoadingMore]);

    useEffect(() => {
        if (isLoadingMoreRef.current) return; // don't scroll when prepending old messages
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Scroll-up listener — trigger load-more when user reaches the top
    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return;

        const handleScroll = () => {
            if (container.scrollTop < 60 && hasMoreMessages && !isLoadingMore) {
                handleLoadMoreMessages();
            }
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, [hasMoreMessages, isLoadingMore, handleLoadMoreMessages]);

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
        // Read directly from DOM ref — no state read, zero extra re-renders
        const content = messageInputRef.current?.value?.trim() || '';
        const attachment = pendingAttachmentUrl;

        if ((!content && !attachment) || !selectedPartner || isSendingMsg || isUploading) return;

        // Declare optimisticId outside try so catch can reference it for rollback
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

        try {
            setIsSendingMsg(true);

            // Clear the uncontrolled textarea and reset height
            if (messageInputRef.current) {
                messageInputRef.current.value = '';
                messageInputRef.current.style.height = 'auto';
            }
            setCanSend(false);
            setPendingAttachmentUrl(null);
            setFilePreview(null);
            setMessages(prev => [...prev, optimisticMsg]);

            // Instantly update the conversation card for the sender (zero latency)
            setConversations(prev => {
                const partnerId = selectedPartner.id;
                const idx = prev.findIndex(c => c.partner.id === partnerId);
                if (idx === -1) return prev;
                const updated = {
                    ...prev[idx],
                    lastMessage: content,
                    lastAttachment: attachment || null,
                    timestamp: optimisticMsg.created_at,
                    isNew: false,
                };
                return [updated, ...prev.filter((_, i) => i !== idx)];
            });

            messageInputRef.current?.focus();

            const msg = await messageService.sendMessage(user.id, selectedPartner.id, content, attachment);
            
            // Replace optimistic message with the real one from DB
            setMessages(prev => prev.map(m => m.id === optimisticId ? msg : m));
        } catch (err) {
            toast.error('মেসেজ পাঠানো সম্ভব হয়নি');
            // Remove failed optimistic message and restore text to input
            setMessages(prev => prev.filter(m => m.id !== optimisticId));
            if (messageInputRef.current) messageInputRef.current.value = content;
            setCanSend(true);
            setPendingAttachmentUrl(attachment);
        } finally {
            setIsSendingMsg(false);
            messageInputRef.current?.focus();
        }
    };

    const handleSelectConversation = (partner) => {
        setSelectedPartner(partner);
        handleFetchMessages(partner.id);
        // Only trigger full-screen overlay on mobile
        if (window.innerWidth <= 768) {
            setIsMobileChatOpen(true);
        }
    };

    useEffect(() => {
        // Always fetch on mount so unread badge is visible from any tab
        handleFetchConversations(true);
    }, [handleFetchConversations]);

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

    const getDateLabel = (dateString) => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        const dString = date.toLocaleDateString();
        const tString = today.toLocaleDateString();
        const yString = yesterday.toLocaleDateString();

        if (dString === tString) {
            return t('today');
        } else if (dString === yString) {
            return t('yesterday');
        } else {
            return date.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
            });
        }
    };

    // Count unread conversations for inbox badge
    const unreadCount = conversations.filter(c => c.isNew).length;

    return (
        <Fragment>
            <div className={styles.container}>
            {!(subTab === 'battle' && battlePhase !== 'lobby') && (
                <div className={styles.subTabHeader}>
                <button 
                    className={`${styles.subTabBtn} ${subTab === 'battle' ? styles.subTabActive : ''}`}
                    onClick={() => setSubTab('battle')}
                >
                    {subTab === 'battle' && (
                        <motion.div 
                            layoutId="activeTabPill"
                            className={styles.activeBackground}
                            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                        />
                    )}
                    <span className={styles.btnContent}>
                        <Swords size={18} />
                        {subTab === 'battle' && <span>{t('subtab_battle')}</span>}
                    </span>
                </button>
                <button 
                    className={`${styles.subTabBtn} ${subTab === 'my' ? styles.subTabActive : ''}`}
                    onClick={() => setSubTab('my')}
                >
                    {subTab === 'my' && (
                        <motion.div 
                            layoutId="activeTabPill"
                            className={styles.activeBackground}
                            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                        />
                    )}
                    <span className={styles.btnContent}>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <Users size={18} />
                            {connections.pending.length > 0 && subTab !== 'my' && (
                                <span 
                                    className={`${styles.filterCount} ${styles.filterCountAlert}`}
                                    style={{ position: 'absolute', top: '-6px', right: '-8px', zIndex: 10 }}
                                >
                                    {connections.pending.length}
                                </span>
                            )}
                        </div>
                        {subTab === 'my' && <span>{t('subtab_my')}</span>}
                    </span>
                </button>
                <button 
                    className={`${styles.subTabBtn} ${subTab === 'suggest' ? styles.subTabActive : ''}`}
                    onClick={() => setSubTab('suggest')}
                >
                    {subTab === 'suggest' && (
                        <motion.div 
                            layoutId="activeTabPill"
                            className={styles.activeBackground}
                            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                        />
                    )}
                    <span className={styles.btnContent}>
                        <Search size={18} />
                        {subTab === 'suggest' && <span>{t('subtab_suggest')}</span>}
                    </span>
                </button>
                <button 
                    className={`${styles.subTabBtn} ${subTab === 'inbox' ? styles.subTabActive : ''}`}
                    onClick={() => setSubTab('inbox')}
                >
                    {subTab === 'inbox' && (
                        <motion.div 
                            layoutId="activeTabPill"
                            className={styles.activeBackground}
                            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                        />
                    )}
                    <span className={styles.btnContent}>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <MessageSquare size={18} />
                            {subTab !== 'inbox' && unreadCount > 0 && (
                                <span 
                                    className={styles.subTabUnread}
                                    style={{ position: 'absolute', top: '-6px', right: '-8px' }}
                                >
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </div>
                        {subTab === 'inbox' && <span>{t('subtab_inbox')}</span>}
                    </span>
                </button>
            </div>
            )}

            {/* Sub-Tab Content */}
            <div className={styles.subTabContent}>
                <AnimatePresence mode="wait">
                    {(subTab !== 'battle' && (subTab === 'inbox' ? isConversationsLoading : isLoading)) ? (
                        <motion.div 
                                key="skeleton"
                                initial={false}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className={styles.skeletonList}
                            >
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className={styles.skeletonItem}>
                                        <div className={styles.skeletonAvatarWrapper}>
                                            <Skeleton width="48px" height="48px" borderRadius="50%" />
                                        </div>
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <Skeleton width="140px" height="18px" borderRadius="6px" />
                                            <Skeleton width="100px" height="13px" borderRadius="4px" />
                                        </div>
                                        <div className={styles.skeletonActionWrapper}>
                                            <Skeleton width="40px" height="40px" borderRadius="12px" />
                                        </div>
                                </div>
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div
                            key={subTab}
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                        >
                        {subTab === 'battle' ? (
                            <BattleWar 
                                user={user} 
                                userProfile={userProfile} 
                                onPhaseChange={setBattlePhase}
                            />
                        ) : subTab === 'inbox' ? (
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
                                                placeholder={t('search_chat')} 
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
                                        {isConversationsLoading ? (
                                            <div className={styles.skeletonList}>
                                                {[...Array(6)].map((_, i) => (
                                                    <div key={i} className={styles.skeletonItem}>
                                                        <Skeleton width="40px" height="40px" borderRadius="50%" />
                                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                            <Skeleton width="60%" height="14px" />
                                                            <Skeleton width="40%" height="10px" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : filteredConversations.length === 0 && !inboxSearchQuery ? (
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
                                                            <div className={styles.convNameRow}>
                                                                <span className={styles.partnerName}>{conv.partner.full_name || conv.partner.display_name}</span>
                                                                {conv.timestamp && (
                                                                    <span className={styles.convTime}>
                                                                        {new Date(conv.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className={styles.lastMsg}>
                                                                {conv.lastIsDeleted ? (
                                                                    <span className={styles.lastMsgDeleted}>
                                                                        <Ban size={11} strokeWidth={1.8} />
                                                                        {conv.lastDeletedBySelf
                                                                            ? (language === 'bn' ? 'আপনি এই বার্তাটি মুছে ফেলেছেন' : 'You deleted this message')
                                                                            : (language === 'bn' ? 'এই বার্তাটি মুছে ফেলা হয়েছে' : 'This message was deleted')
                                                                        }
                                                                    </span>
                                                                ) : conv.lastAttachment && !conv.lastMessage ? (
                                                                    <span className={styles.lastMsgPhoto}>
                                                                        <ImageIcon size={13} strokeWidth={1.8} />
                                                                        {language === 'bn' ? 'ছবি' : 'Photo'}
                                                                    </span>
                                                                ) : conv.lastAttachment && conv.lastMessage ? (
                                                                    <span className={styles.lastMsgPhoto}>
                                                                        <ImageIcon size={13} strokeWidth={1.8} />
                                                                        {conv.lastMessage}
                                                                    </span>
                                                                ) : (
                                                                    conv.lastMessage
                                                                )}
                                                            </span>
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
                                                    placeholder={t('search_learner') || 'খুঁজুন...'} 
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
                                                {isSearching && (
                                                    <div className={styles.searchLoader}>
                                                        <Skeleton width="100%" height="100%" borderRadius="50%" />
                                                    </div>
                                                )}
                                            </div>
                                            {searchResults.length > 0 ? (
                                                <div className={styles.searchResults}>
                                                    {searchResults.map(learner => (
                                                        <div key={learner.id} className={styles.learnerItem}>
                                                            <div className={styles.learnerCore} onClick={() => navigate(`/learner/${learner.id}`)} style={{ cursor: 'pointer' }}>
                                                                <div className={styles.avatarMini}>
                                                                    {learner.avatar_url ? <img src={learner.avatar_url} alt={learner.full_name} /> : <User size={20} />}
                                                                    <StatusIndicator lastSeen={learner.last_seen} />
                                                                </div>
                                                                <div className={styles.learnerText}>
                                                                    <span className={styles.learnerName}>{learner.full_name || learner.display_name}</span>
                                                                    <div className={styles.learnerSub}>
                                                                        <Zap size={10} color="#FFB800" />
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
                                                                        <Check size={16} color="#FFB800" /> : <UserPlus size={16} />
                                                                    )}
                                                                </button>
                                                                {(learner.request_sent || connections.outgoing.some(o => o.receiver_id === learner.id)) && (
                                                                    <span style={{ fontSize: '10px', color: 'var(--color-primary)', fontWeight: '600' }}>
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
                                                        color: 'var(--color-text-muted)',
                                                        textAlign: 'center',
                                                        background: 'var(--color-bg-alt)',
                                                        borderRadius: '12px',
                                                        border: '1px dashed var(--color-border-muted)',
                                                        marginTop: '8px'
                                                    }}>
                                                        "{searchQuery}" এর জন্য কোনো learner পাওয়া যায় নি
                                                    </div>
                                                )
                                            )}
                                        </div>

                                        {!searchQuery && !isSearchFocused && (
                                            <>
                                                {suggestions.length > 0 ? (
                                                    <>
                                                        <span className={styles.sectionLabel}>{t('suggestions_for_you')}</span>
                                                        <div className={styles.connGrid}>
                                                        {suggestions.map(s => (
                                                            <div key={s.id} className={styles.connCard}>
                                                                <div className={styles.learnerCore} onClick={() => navigate(`/learner/${s.id}`)} style={{ cursor: 'pointer' }}>
                                                                    <div className={styles.avatarMini}>
                                                                        {s.avatar_url ? <img src={s.avatar_url} /> : <User size={20} />}
                                                                        <StatusIndicator lastSeen={s.last_seen} />
                                                                    </div>
                                                                    <div className={styles.learnerText}>
                                                                        <span className={styles.learnerName}>{s.full_name || s.display_name}</span>
                                                                        <div className={styles.learnerSub}>
                                                                            <Zap size={10} color="#FFB800" />
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
                                                                            s.request_sent ? <Check size={16} color="#FFB800" /> : <UserPlus size={16} />
                                                                        )}
                                                                    </button>
                                                                    {s.request_sent && (
                                                                        <span style={{ fontSize: '10px', color: 'var(--color-primary)', fontWeight: '600' }}>
                                                                            অনুরোধ পাঠানো হয়েছে
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                        </div>
                                                    </>
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
                                        {/* Connection Filter Toggles */}
                                        <div className={styles.connFilterRow}>
                                            <button 
                                                className={`${styles.connFilterPill} ${requestType === 'all' ? styles.connFilterActive : ''}`}
                                                onClick={() => setRequestType('all')}
                                            >
                                                {t('filter_all')}
                                            </button>
                                            <button 
                                                className={`${styles.connFilterPill} ${requestType === 'received' ? styles.connFilterActive : ''}`}
                                                onClick={() => setRequestType('received')}
                                            >
                                                {t('filter_received')}
                                                {connections.pending.length > 0 && (
                                                    <span className={`${styles.filterCount} ${styles.filterCountAlert}`}>{connections.pending.length > 9 ? '9+' : connections.pending.length}</span>
                                                )}
                                            </button>
                                            <button 
                                                className={`${styles.connFilterPill} ${requestType === 'sent' ? styles.connFilterActive : ''}`}
                                                onClick={() => setRequestType('sent')}
                                            >
                                                {t('filter_sent')}
                                            </button>
                                            <button 
                                                className={`${styles.connFilterPill} ${requestType === 'blocked' ? styles.connFilterActive : ''}`}
                                                onClick={() => setRequestType('blocked')}
                                                style={requestType === 'blocked' ? { background: 'rgba(231,76,60,0.15)', color: '#E74C3C', borderColor: 'rgba(231,76,60,0.3)' } : {}}
                                            >
                                                {t('filter_blocked')}
                                            </button>
                                        </div>

                                        {requestType === 'blocked' && (
                                            <>
                                                {blockedList.length > 0 ? (
                                                    <div className={styles.connGrid}>
                                                        <AnimatePresence mode='popLayout'>
                                                            {blockedList.map(item => (
                                                                <motion.div
                                                                    key={item.id}
                                                                    layout
                                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                                    animate={{ opacity: 1, scale: 1 }}
                                                                    exit={{ opacity: 0, scale: 0.9 }}
                                                                    className={styles.connCard}
                                                                >
                                                                    <div className={styles.learnerCore} onClick={() => navigate(`/learner/${item.blocked_id}`)} style={{ cursor: 'pointer' }}>
                                                                        <div className={styles.avatarMini}>
                                                                            {item.blocked?.avatar_url ? <img src={item.blocked.avatar_url} /> : <User size={20} />}
                                                                        </div>
                                                                        <div className={styles.learnerText}>
                                                                            <span className={styles.learnerName}>{item.blocked?.full_name || item.blocked?.display_name || '—'}</span>
                                                                            <span className={styles.learnerSub} style={{ color: '#E74C3C' }}>ব্লক করা হয়েছে</span>
                                                                        </div>
                                                                    </div>
                                                                    <button
                                                                        className={styles.actionBtn}
                                                                        style={{ background: 'rgba(231,76,60,0.1)', color: '#E74C3C', fontSize: '11px', padding: '6px 10px' }}
                                                                        onClick={async () => {
                                                                            await supabase.from('blocked_users').delete().eq('id', item.id);
                                                                            setBlockedList(prev => prev.filter(b => b.id !== item.id));
                                                                        }}
                                                                    >
                                                                        Unblock
                                                                    </button>
                                                                </motion.div>
                                                            ))}
                                                        </AnimatePresence>
                                                    </div>
                                                ) : (
                                                    <div className={styles.emptyState}>
                                                        <Ban size={40} opacity={0.2} />
                                                        <p>ব্লক লিস্ট খালি</p>
                                                    </div>
                                                )}
                                            </>
                                        )}

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
                                                                        <div className={styles.learnerCore} onClick={() => navigate(`/learner/${other.id}`)} style={{ cursor: 'pointer' }}>
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
                                                                                        <Check color="#FFB800" size={20} />
                                                                                    </motion.div>
                                                                                ) : (
                                                                                    <InlineLoader size={120} showText={false} />
                                                                                )}
                                                                                {cardAction.success && (
                                                                                    <motion.span 
                                                                                        initial={{ opacity: 0, y: 5 }}
                                                                                        animate={{ opacity: 1, y: 0 }}
                                                                                        style={{ fontSize: '11px', color: '#FFB800', fontWeight: '600' }}
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
                                                        <div className={styles.emptyHeader}>
                                                            <Users size={40} opacity={0.2} />
                                                            <p style={{ fontWeight: '600', fontSize: '1rem', color: 'var(--color-text-muted)' }}>
                                                                {t('no_connections') || 'আপনার কোনো কানেকশন নেই'}
                                                            </p>
                                                        </div>
                                                        
                                                        {suggestions.length > 0 && (
                                                            <div className={styles.emptySuggestWrap}>
                                                                <h4 className={styles.emptySuggestTitle}>{t('suggestions_for_you')}</h4>
                                                                <div className={styles.connGrid}>
                                                                    {suggestions.slice(0, 6).map(s => (
                                                                        <div key={s.id} className={styles.connCard}>
                                                                            <div className={styles.learnerCore} onClick={() => navigate(`/learner/${s.id}`)} style={{ cursor: 'pointer' }}>
                                                                                <div className={styles.avatarMini}>
                                                                                    {s.avatar_url ? <img src={s.avatar_url} /> : <User size={20} />}
                                                                                    <StatusIndicator lastSeen={s.last_seen} />
                                                                                </div>
                                                                                <div className={styles.learnerText}>
                                                                                    <span className={styles.learnerName}>{s.full_name || s.display_name}</span>
                                                                                    <div className={styles.learnerSub}>
                                                                                        <Zap size={10} color="#FFB800" />
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
                                                                                        s.request_sent ? <Check size={16} color="var(--color-primary-dark)" /> : <UserPlus size={16} />
                                                                                    )}
                                                                                </button>
                                                                                {s.request_sent && (
                                                                                    <span style={{ fontSize: '10px', color: 'var(--color-primary)', fontWeight: '600', marginTop: '4px' }}>
                                                                                        অনুরোধ পাঠানো হয়েছে
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                {suggestions.length > 6 && (
                                                                    <button className={styles.seeMoreEmptyBtn} onClick={() => setSubTab('suggest')}>
                                                                        {t('view_all_suggestions')}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
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
                                                                    <div className={styles.learnerCore} onClick={() => navigate(`/learner/${conn.sender.id}`)} style={{ cursor: 'pointer' }}>
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
                                                                                    <Check color="#FFB800" size={20} />
                                                                                </motion.div>
                                                                            ) : (
                                                                                <InlineLoader size={120} showText={false} />
                                                                            )}
                                                                            {cardAction.success && (
                                                                                <motion.span 
                                                                                    initial={{ opacity: 0, y: 5 }}
                                                                                    animate={{ opacity: 1, y: 0 }}
                                                                                    style={{ fontSize: '11px', color: '#FFB800', fontWeight: '600' }}
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
                                                                    <div className={styles.learnerCore} onClick={() => navigate(`/learner/${conn.receiver.id}`)} style={{ cursor: 'pointer' }}>
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
                                                                                    <Check color="#FFB800" size={20} />
                                                                                </motion.div>
                                                                            ) : (
                                                                                <InlineLoader size={120} showText={false} />
                                                                            )}
                                                                            {cardAction.success && (
                                                                                <motion.span 
                                                                                    initial={{ opacity: 0, y: 5 }}
                                                                                    animate={{ opacity: 1, y: 0 }}
                                                                                    style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: '600' }}
                                                                                >
                                                                                    {cardAction.msg}
                                                                                </motion.span>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <button className={styles.actionBtn} style={{ background: 'var(--color-bg-alt)', color: 'var(--color-text-muted)' }} onClick={() => cancelRequest(conn.id)}>
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
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
                                {/* Floating Chat Window (Facebook Style on Desktop, Full Overlay on Mobile) */}
                                <AnimatePresence>
                                    {(selectedPartner || isDeepLinking) && (
                                        <div ref={chatWindowRef} className={`${styles.chatWindow} ${isMobileChatOpen ? styles.mobileChatActive : ''}`}>
                                            <div ref={chatHeaderRef} className={styles.chatHeader}>
                                                {selectedPartner ? (
                                                    <>
                                                        <button 
                                                            className={styles.backToInbox}
                                                            onClick={() => { setSelectedPartner(null); setIsMobileChatOpen(false); }}
                                                        >
                                                            <ChevronLeft size={24} />
                                                        </button>

                                                        <div 
                                                            className={styles.headerPartnerLink}
                                                            onClick={() => navigate(`/learner/${selectedPartner.id}`)}
                                                        >
                                                            <div className={styles.partnerAvatar}>
                                                                {selectedPartner.avatar_url ? (
                                                                    <img src={selectedPartner.avatar_url} alt="" />
                                                                ) : (
                                                                    <div className={styles.avatarPlaceholder}><User size={18} /></div>
                                                                )}
                                                                <StatusIndicator lastSeen={selectedPartner.last_seen} />
                                                            </div>

                                                            <div className={styles.headerInfo}>
                                                                <span className={styles.partnerTitle}>{selectedPartner.full_name || selectedPartner.display_name}</span>
                                                            </div>
                                                        </div>

                                                        <button 
                                                            className={styles.closeChatBtn}
                                                            onClick={() => { setSelectedPartner(null); setIsMobileChatOpen(false); }}
                                                        >
                                                            <X size={20} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--color-bg-deep)' }} />
                                                        <div style={{ width: '100px', height: '14px', borderRadius: '4px', background: 'var(--color-bg-deep)' }} />
                                                    </div>
                                                )}
                                            </div>

                                            <div ref={scrollRef} className={styles.messageScroll}>
                                                {(isMessagesLoading || isDeepLinking) ? (
                                                    <div className={styles.chatLoader}>
                                                        <InlineLoader size={40} showText={false} />
                                                    </div>
                                                ) : (
                                                    <AnimatePresence>
                                                        {/* Load-more indicator at the top */}
                                                        {isLoadingMore && (
                                                            <div key="load-more-spinner" className={styles.loadMoreSpinner}>
                                                                <InlineLoader size={24} showText={false} />
                                                            </div>
                                                        )}
                                                        {!isLoadingMore && hasMoreMessages && (
                                                            <div key="load-more-hint" className={styles.loadMoreHint}>
                                                                scroll up for older messages
                                                            </div>
                                                        )}
                                                        {messages.map((msg, idx) => {
                                                            const msgDate = new Date(msg.created_at).toLocaleDateString();
                                                            const prevMsg = idx > 0 ? messages[idx - 1] : null;
                                                            const prevDate = prevMsg ? new Date(prevMsg.created_at).toLocaleDateString() : null;
                                                            const showDivider = msgDate !== prevDate;

                                                            return (
                                                                <div key={msg.id || idx} style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
                                                                    {showDivider && (
                                                                        <div className={styles.dateDivider}>
                                                                            <span>{getDateLabel(msg.created_at)}</span>
                                                                        </div>
                                                                    )}
                                                                    <motion.div 
                                                                        initial={{ opacity: 0, y: 8 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        exit={{ opacity: 0 }}
                                                                        transition={{ duration: 0.15 }}
                                                                        className={msg.sender_id === user.id ? styles.msgSent : styles.msgReceived}
                                                                        style={{ alignSelf: msg.sender_id === user.id ? 'flex-end' : 'flex-start' }}
                                                                    >
                                                                        <div className={styles.msgBubble}>
                                                                            {msg.is_deleted ? (
                                                                                /* Deleted message placeholder */
                                                                                <span className={styles.msgDeletedText}>
                                                                                    <Ban size={11} strokeWidth={1.8} />
                                                                                    {msg.sender_id === user.id
                                                                                        ? (language === 'bn' ? 'আপনি এই বার্তাটি মুছে ফেলেছেন' : 'You deleted this message')
                                                                                        : (language === 'bn' ? 'এই বার্তাটি মুছে ফেলা হয়েছে' : 'This message was deleted')
                                                                                    }
                                                                                </span>
                                                                            ) : (
                                                                                <>
                                                                                    {msg.sender_id === user.id && (
                                                                                        <>
                                                                                            <button 
                                                                                                className={styles.msgOptionBtn} 
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    setMsgOptionsId(msgOptionsId === msg.id ? null : msg.id);
                                                                                                }}
                                                                                            >
                                                                                                <ChevronDown size={14} />
                                                                                            </button>
                                                                                            {msgOptionsId === msg.id && (
                                                                                                <div className={styles.deleteMenu}>
                                                                                                    <button className={styles.deleteBtn} onClick={() => handleDeleteMessage(msg.id)}>
                                                                                                        {t('delete_msg')}
                                                                                                    </button>
                                                                                                </div>
                                                                                            )}
                                                                                        </>
                                                                                    )}
                                                                                    {msg.attachment_url && (
                                                                                        <div className={styles.msgAttachment} onClick={() => setViewerImage(msg.attachment_url)}>
                                                                                            <img src={msg.attachment_url} alt="" />
                                                                                        </div>
                                                                                    )}
                                                                                    {msg.content && <span>{msg.content}</span>}
                                                                                </>
                                                                            )}
                                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: msg.sender_id === user.id ? 'flex-end' : 'flex-start', gap: '4px' }}>
                                                                                <span className={styles.msgTime}>
                                                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                                </span>
                                                                                {msg.sender_id === user.id && !msg.is_deleted && (
                                                                                    <span style={{ display: 'flex' }}>
                                                                                            <CheckCheck 
                                                                                                size={12} 
                                                                                                color={msg.is_read ? "var(--color-primary)" : "var(--color-text-muted)"} 
                                                                                                opacity={msg.is_read ? 1 : 0.4}
                                                                                                style={{ transition: 'all 0.3s ease' }}
                                                                                            />
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </motion.div>
                                                                </div>
                                                            );
                                                        })}
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
                                                    placeholder={t('write_msg')} 
                                                    onChange={(e) => {
                                                        // Auto-expand height — pure DOM, zero React re-render
                                                        const el = e.target;
                                                        el.style.height = 'auto';
                                                        el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
                                                        // Defer state update — never blocks keystrokes
                                                        const hasText = el.value.trim().length > 0;
                                                        startCanSendTransition(() => {
                                                            setCanSend(prev => prev !== hasText ? hasText : prev);
                                                        });
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                            e.preventDefault();
                                                            handleSendMessage();
                                                            // Reset height
                                                            if (messageInputRef.current) {
                                                                messageInputRef.current.style.height = 'auto';
                                                            }
                                                        }
                                                    }}
                                                    className={styles.chatInput}
                                                />
                                                <button 
                                                    type="button" 
                                                    className={styles.sendBtn}
                                                    onClick={() => handleSendMessage()}
                                                    disabled={(!canSend && !pendingAttachmentUrl) || isSendingMsg || isUploading}
                                                >
                                                    {isSendingMsg ? (
                                                        <InlineLoader size={20} showText={false} />
                                                    ) : (
                                                        <SendHorizontal size={20} />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </AnimatePresence>
        </div>

        {/* Image Viewer Modal */}
        <AnimatePresence>
            {viewerImage && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className={styles.imageViewerOverlay} 
                    onClick={() => setViewerImage(null)}
                >
                    <button className={styles.viewerClose} onClick={() => setViewerImage(null)}>
                        <X size={24} />
                    </button>
                    <motion.img 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        src={viewerImage} 
                        className={styles.viewerImage} 
                        alt="" 
                        onClick={(e) => e.stopPropagation()} 
                    />
                </motion.div>
            )}
        </AnimatePresence>
        </Fragment>
    );
};

export default LearnerConnection;
