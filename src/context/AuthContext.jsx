import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [profileLoading, setProfileLoading] = useState(false);

    // Refs that always hold the LATEST state values.
    // Fixes the stale closure bug in onAuthStateChange (created once, captures null values).
    const userRef = useRef(null);
    const profileRef = useRef(null);
    useEffect(() => { userRef.current = user; }, [user]);
    useEffect(() => { profileRef.current = profile; }, [profile]);

    // Prevents two concurrent fetchProfile calls (e.g. getSession + onAuthStateChange racing)
    const isFetchingProfileRef = useRef(false);

    const fetchProfile = async (userId, passedUser = null) => {
        if (!userId) {
            setProfile(null);
            profileRef.current = null;
            return;
        }
        // Guard: skip if another fetch is already in flight for this user
        if (isFetchingProfileRef.current) return;
        isFetchingProfileRef.current = true;
        setProfileLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
            if (error) {
                console.error('Error fetching profile:', error);
                // Fallback to a temporary profile so the UI never hangs
                const currentUser = passedUser || userRef.current;
                if (currentUser) {
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
                    profileRef.current = tempProfile;
                }
            } else {
                setProfile(data);
                profileRef.current = data;
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
        } finally {
            isFetchingProfileRef.current = false;
            setProfileLoading(false);
        }
    };

    // Persists across async callbacks without causing re-renders
    const isInitialisedRef = useRef(false);

    useEffect(() => {
        // Detect if we are returning from a social OAuth flow (PKCE code in URL).
        // In that case, Supabase will exchange the code and fire onAuthStateChange.
        // We must NOT call setLoading(false) early from getSession() or the router
        // will see user=null and redirect to /guest/courses before the session is ready.
        const hasPKCECode =
            window.location.search.includes('code=') ||
            window.location.hash.includes('access_token=');

        const getSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const currentUser = session?.user ?? null;
                setUser(currentUser);
                userRef.current = currentUser;
                if (currentUser) await fetchProfile(currentUser.id, currentUser);

                // If there's a PKCE code in the URL, a session might not exist yet
                // (exchange still in flight). Let onAuthStateChange handle loading.
                if (!hasPKCECode) {
                    isInitialisedRef.current = true;
                    setLoading(false);
                }
            } catch (err) {
                console.error('AuthContext: getSession error', err);
                // Always unblock loading on error to avoid infinite spinner
                isInitialisedRef.current = true;
                setLoading(false);
            }
        };

        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            const currentUser = session?.user ?? null;

            // TOKEN_REFRESHED — silent token refresh, just sync the user object
            if (event === 'TOKEN_REFRESHED') {
                setUser(currentUser);
                userRef.current = currentUser;
                return;
            }

            // SIGNED_IN fired after first load (PKCE tab-return behavior or duplicate after getSession).
            // Use refs (not stale closure vars) to check if we already have this user's profile.
            if (
                event === 'SIGNED_IN' &&
                isInitialisedRef.current &&
                userRef.current?.id === currentUser?.id &&
                profileRef.current
            ) {
                // Same user, profile already loaded — silently sync the access token only
                setUser(currentUser);
                userRef.current = currentUser;
                return;
            }

            // First-time SIGNED_IN, SIGNED_OUT, USER_UPDATED, PASSWORD_RECOVERY
            setUser(currentUser);
            userRef.current = currentUser;
            if (currentUser) {
                if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
                    await fetchProfile(currentUser.id, currentUser);
                }
            } else {
                setProfile(null);
                profileRef.current = null;
                isFetchingProfileRef.current = false;
            }

            // Set loading=false on first auth resolution
            // This is the primary path when returning from a social OAuth redirect.
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
                    profileRef.current = payload.new;
                }
            )
            .subscribe();

        return () => supabase.removeChannel(profileSub);
    }, [user?.id]);

    // Track user activity (last_seen)
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

        updateLastSeen();
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
            setProfile(data);
            profileRef.current = data;
            return data;
        },
        user,
        profile,
        loading,
        profileLoading
    };

    return (
        <AuthContext.Provider value={value}>
            {/* Always render children — individual pages handle their own loading states */}
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
