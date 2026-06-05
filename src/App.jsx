import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import AuthPage from './features/auth/AuthPage';

import Survey from './features/survey/Survey';
import LoadingScreen from './components/ui/LoadingScreen';
import LearningPage from './features/learning/LearningPage';
import StudyPage from './features/learning/StudyPage';
import ProfilePage from './features/profile/ProfilePage';
import LeaderboardPage from './features/leaderboard/LeaderboardPage';
import AdminDashboardV2 from './features/admin/v2/AdminDashboardV2';
import ShopPage from './features/shop/ShopPage';
import MainLayout from './components/layout/MainLayout';
import TopProgressBar from './components/layout/TopProgressBar';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { courseService } from './services/courseService';
import { NotificationProvider } from './context/NotificationContext';
import CourseListPage from './features/courses/CourseListPage';
import GuestCoursePage from './features/courses/GuestCoursePage';
import SettingsPage from './features/settings/SettingsPage';
import HelpPage from './features/help/HelpPage';
import StreakPage from './features/learning/pages/StreakPage';
import CertificateVerificationPage from './features/profile/pages/CertificateVerificationPage';
import CheckoutPage from './features/shop/CheckoutPage';
import LearnerProfilePage from './features/profile/LearnerProfilePage';


import ResetPassword from './features/auth/ResetPassword';
import TermsPage from './features/legal/TermsPage';
import PrivacyPage from './features/legal/PrivacyPage';

import { Toaster } from 'sonner';

import LandingPage from './features/landing/LandingPage';
import AdminRoute from './components/routing/AdminRoute';

const HomePage = () => {
  const { user } = useAuth();
  const [lastCourseId, setLastCourseId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchLastCourse = async () => {
      if (user) {
        const id = await courseService.getLastPracticedCourseId(user.id).catch(() => null);
        if (isMounted) setLastCourseId(id);
      }
      if (isMounted) setLoading(false);
    };
    fetchLastCourse();
    return () => { isMounted = false; };
  }, [user?.id]); // Only re-run when user ID changes, not on token refresh

  if (loading) return <LoadingScreen />;

  if (user) {
    if (lastCourseId) {
      return <Navigate to={`/learn/${lastCourseId}`} replace />;
    } else {
      return <Navigate to="/courses" replace />;
    }
  }
  return <LandingPage />;
};


import ConnectionPage from './features/connections/ConnectionPage';
import NotificationPage from './features/notifications/NotificationPage';

const AppContent = () => {
  const { user } = useAuth();
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    // Catch-all for password recovery links landing on the wrong path
    if (window.location.hash.includes('type=recovery') && !window.location.pathname.includes('/reset-password')) {
      const { origin, hash } = window.location;
      console.log('Recovery link detected, redirecting to /reset-password');
      window.location.href = `${origin}/reset-password${hash}`;
    }

    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  if (initialLoading) {
    return <LoadingScreen />;
  }

  return (
    <Router>
      <div className="app-container">
        <TopProgressBar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/survey/:courseId" element={<Survey />} />
          <Route path="/verify/:code" element={<CertificateVerificationPage />} />

          {/* All protected routes inside MainLayout to ensure Sidebar stays stable */}
          <Route element={<MainLayout />}>
            <Route path="/courses" element={user ? <CourseListPage /> : <Navigate to="/guest/courses" replace />} />
            <Route path="/learn/:courseId" element={<LearningPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/streak" element={<StreakPage />} />
            <Route path="/connections" element={<ConnectionPage />} />
            <Route path="/learner/:learnerId" element={<LearnerProfilePage />} />
            <Route path="/notifications" element={<NotificationPage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/settings" element={<SettingsPage />} />

            <Route path="/help" element={<HelpPage />} />
          </Route>

          <Route path="/checkout" element={user ? <CheckoutPage /> : <Navigate to="/auth" replace />} />
          <Route path="/study/:courseId/:chapterId" element={<StudyPage />} />

          {/* Guest Courses version */}
          <Route path="/guest/courses" element={<GuestCoursePage />} />

          <Route path="/admin" element={
            <AdminRoute>
              <AdminDashboardV2 />
            </AdminRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
};


function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <NotificationProvider>
          <ThemeProvider>
            <Toaster position="top-right" expand={true} visibleToasts={5} theme="light" richColors duration={3000} />
            <AppContent />
          </ThemeProvider>
        </NotificationProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
