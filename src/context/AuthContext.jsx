import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null); // Added profile state
    const [loading, setLoading] = useState(true);
    const [profileLoading, setProfileLoading] = useState(false);

    const fetchProfile = async (userId) => {
        if (!userId) {
            setProfile(null);
            return;
        }
        setProfileLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
            if (error) {
                console.error('Error fetching profile:', error);
                // Fallback to a temporary profile to avoid infinite loading screens or UI hangs
                const { data: { session } } = await supabase.auth.getSession();
                const currentUser = session?.user;
                if (currentUser && currentUser.id === userId) {
                    const tempProfile = {
                        id: userId,
                        xp: 250,
                        gems: 120,
                        hearts: 8,
                        max_hearts: 10,
                        display_name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'Learner',
                        full_name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || 'Learner',
                        avatar_url: currentUser.user_metadata?.avatar_url || null,
                        role: 'user',
                        battle_mode: true,
                        is_temp: true
                    };
                    setProfile(tempProfile);
                }
            } else {
                setProfile(data);
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
        } finally {
            setProfileLoading(false);
        }
    };

    // useRef so the flag persists across async callbacks without causing re-renders
    const isInitialisedRef = useRef(false);

    useEffect(() => {
        const getSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const currentUser = session?.user ?? null;
                setUser(currentUser);
                if (currentUser) await fetchProfile(currentUser.id);
            } catch (err) {
                console.error('AuthContext: getSession error', err);
            } finally {
                isInitialisedRef.current = true;
                setLoading(false);
            }
        };

        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            const currentUser = session?.user ?? null;

            // TOKEN_REFRESHED — silent token refresh on tab return, just update user
            if (event === 'TOKEN_REFRESHED') {
                setUser(currentUser);
                return;
            }

            // SIGNED_IN after first load = Supabase re-fires this on tab return (PKCE flow behavior)
            // We silently update user but do NOT trigger profile fetch if we already have the profile for this user
            if (event === 'SIGNED_IN' && isInitialisedRef.current && user?.id === currentUser?.id && profile) {
                setUser(currentUser);
                return;
            }

            // First-time SIGNED_IN, SIGNED_OUT, USER_UPDATED, PASSWORD_RECOVERY
            setUser(currentUser);
            if (currentUser) {
                if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
                    await fetchProfile(currentUser.id);
                }
            } else {
                setProfile(null);
            }

            // Only set loading=false once (on first auth resolution)
            if (!isInitialisedRef.current) {
                isInitialisedRef.current = true;
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Real-time profile updates
    useEffect(() => {
        if (!user?.id) return;

        const profileSub = supabase
            .channel(`profile-changes-${user.id}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
                (payload) => {
                    setProfile(payload.new);
                }
            )
            .subscribe();

        return () => supabase.removeChannel(profileSub);
    }, [user?.id]);

    // New effect for tracking user activity
    useEffect(() => {
        if (!user?.id) return;

        const updateLastSeen = async () => {
            try {
                await supabase
                    .from('profiles')
                    .update({ last_seen: new Date().toISOString() })
                    .eq('id', user.id);
            } catch (err) {
                console.error('Error updating last seen:', err);
            }
        };

        // Update immediately on mount/login
        updateLastSeen();

        // Update every 2 minutes
        const intervalId = setInterval(updateLastSeen, 2 * 60 * 1000);

        return () => clearInterval(intervalId);
    }, [user?.id]);

    const value = {
        signUp: (data) => supabase.auth.signUp(data),
        signIn: (data) => supabase.auth.signInWithPassword(data),
        signInWithOAuth: (data) => supabase.auth.signInWithOAuth(data),
        signOut: () => supabase.auth.signOut(),
        updateProfile: async (updates) => {
            const { data, error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user?.id)
                .select()
                .single();
            if (error) throw error;
            setProfile(data); // Immediate update
            return data;
        },
        user,
        profile,
        loading,
        profileLoading
    };

    return (
        <AuthContext.Provider value={value}>
            {/* Always render children — individual pages handle their own loading states.
                Blocking render here caused infinite loading on tab switch because
                TOKEN_REFRESHED event re-triggers auth state but never clears loading. */}
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
