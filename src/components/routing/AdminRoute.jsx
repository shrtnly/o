import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingScreen from '../ui/LoadingScreen';

const AdminRoute = ({ children }) => {
    const { user, profile, loading } = useAuth();

    if (loading) {
        return <LoadingScreen />;
    }

    // Redirect to home if not logged in or not an admin
    if (!user || profile?.role !== 'admin') {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default AdminRoute;
