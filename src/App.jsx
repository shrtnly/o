import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Hero from './features/landing/Hero';
import CourseSection from './features/landing/CourseSection';
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
import CourseListPage from './features/courses/CourseListPage';
import GuestCoursePage from './features/courses/GuestCoursePage';
import SettingsPage from './features/settings/SettingsPage';
import HelpPage from './features/help/HelpPage';

// Landing Page UI Component
const LandingPageContent = () => {
  const { t } = useLanguage();
  return (
    <>
      <Navbar />
      <Hero />
      <CourseSection />
      <section style={{ padding: '100px 0', textAlign: 'center', backgroundColor: 'var(--color-bg)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px' }}>
          <h2 style={{ fontSize: '2.5rem', color: 'var(--color-primary)', marginBottom: '24px' }}>{t('proven_title')}</h2>
          <p style={{ fontSize: '1.25rem', color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
            {t('proven_desc')}
          </p>
        </div>
      </section>
      <footer style={{ padding: '60px 0', borderTop: '2px solid var(--color-border)', textAlign: 'center', backgroundColor: 'var(--color-bg-alt)' }}>
        <p>&copy; {t('footer_copy')}</p>
      </footer>
    </>
  );
};


const HomePage = () => {
  const { user } = useAuth();
  const [lastCourseId, setLastCourseId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLastCourse = async () => {
      if (user) {
        const id = await courseService.getLastPracticedCourseId(user.id);
        setLastCourseId(id);
      }
      setLoading(false);
    };
    fetchLastCourse();
  }, [user]);

  if (loading) return <LoadingScreen />;

  if (user) {
    if (lastCourseId) {
      return <Navigate to={`/learn/${lastCourseId}`} replace />;
    } else {
      return <Navigate to="/courses" replace />;
    }
  }
  return <LandingPageContent />;
};

const AppContent = () => {
  const { user, loading: authLoading } = useAuth();
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  if (initialLoading || authLoading) {
    return <LoadingScreen />;
  }

  return (
    <Router>
      <div className="app-container">
        <TopProgressBar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/survey/:courseId" element={<Survey />} />

          {/* All protected routes inside MainLayout to ensure Sidebar stays stable */}
          <Route element={<MainLayout />}>
            <Route path="/courses" element={user ? <CourseListPage /> : <Navigate to="/guest/courses" replace />} />
            <Route path="/learn/:courseId" element={<LearningPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/help" element={<HelpPage />} />
          </Route>

          <Route path="/study/:courseId/:chapterId" element={<StudyPage />} />

          {/* Guest Courses version */}
          <Route path="/guest/courses" element={<GuestCoursePage />} />

          <Route path="/admin" element={<AdminDashboardV2 />} />
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
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
