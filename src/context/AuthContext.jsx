import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active sessions and sets the user
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);
            setLoading(false);
        };

        getSession();

        // Listen for changes on auth state (signed in, signed out, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

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
            return data;
        },
        user,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
