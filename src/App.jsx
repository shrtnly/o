import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Hero from './features/landing/Hero';
import CourseSection from './features/landing/CourseSection';
import AuthPage from './features/auth/AuthPage';
import CourseListPage from './features/courses/CourseListPage';
import Survey from './features/survey/Survey';
import LoadingScreen from './components/ui/LoadingScreen';
import LearningPage from './features/learning/LearningPage';
import StudyPage from './features/learning/StudyPage';
import ProfilePage from './features/profile/ProfilePage';
import LeaderboardPage from './features/leaderboard/LeaderboardPage';
import AdminDashboard from './features/admin/v2/AdminDashboardV2';
import ShopPage from './features/shop/ShopPage';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { courseService } from './services/courseService';
import { surveyService } from './services/surveyService';
import { Navigate } from 'react-router-dom';

// Landing Page UI Component
const LandingPageContent = () => (
  <>
    <Navbar />
    <Hero />
    <CourseSection />

    <section style={{ padding: '100px 0', textAlign: 'center', backgroundColor: 'var(--color-bg)' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px' }}>
        <h2 style={{ fontSize: '2.5rem', color: 'var(--color-primary)', marginBottom: '24px' }}>বৈজ্ঞানিকভাবে প্রমাণিত</h2>
        <p style={{ fontSize: '1.25rem', color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
          আমাদের পাঠদান পদ্ধতি গবেষণালব্ধ এবং কার্যকর। প্রতিটি পাঠ ডিজাইন করা হয়েছে যাতে আপনি দ্রুত এবং আনন্দদায়ক উপায়ে শিখতে পারেন।
        </p>
      </div>
    </section>

    <footer style={{ padding: '60px 0', borderTop: '2px solid var(--color-border)', textAlign: 'center', backgroundColor: 'var(--color-bg-alt)' }}>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', marginBottom: '32px', color: 'var(--color-text-muted)' }}>
        <a href="#">আমাদের সম্পর্কে</a>
        <a href="#">সাহায্য কেন্দ্র</a>
        <a href="#">প্রাইভেসি পলিসি</a>
      </div>
      <p style={{ color: 'var(--color-text-muted)', fontWeight: '600' }}>&copy; 2026 ও-শেখা. সর্বস্বত্ব সংরক্ষিত।</p>
    </footer>
  </>
);

// Home Component with Redirect Logic
const HomePage = () => {
  const { user, loading: authLoading } = useAuth();
  const [lastCourseId, setLastCourseId] = useState(null);
  const [fetchingCourse, setFetchingCourse] = useState(true);

  useEffect(() => {
    const fetchLastCourse = async () => {
      if (user) {
        try {
          // 1. Check for pending enrollment (from survey or guest click)
          const pendingEnrollment = localStorage.getItem('pending_enrollment');
          if (pendingEnrollment) {
            const { courseId, selections } = JSON.parse(pendingEnrollment);

            if (selections) {
              await surveyService.saveSurveyResponse(courseId, selections);
            } else {
              await courseService.enrollUserInCourse(user.id, courseId);
            }

            localStorage.removeItem('pending_enrollment');
            setLastCourseId(courseId);
            setFetchingCourse(false);
            return;
          }

          // 2. Otherwise get the actual last practiced course
          const id = await courseService.getLastPracticedCourseId(user.id);
          setLastCourseId(id);
        } catch (error) {
          console.error("Error fetching last course:", error);
        }
      }
      setFetchingCourse(false);
    };

    if (!authLoading) {
      if (user) {
        fetchLastCourse();
      } else {
        setFetchingCourse(false);
      }
    }
  }, [user, authLoading]);

  if (authLoading || (user && fetchingCourse)) {
    return <LoadingScreen />;
  }

  if (user) {
    if (lastCourseId) {
      return <Navigate to={`/learn/${lastCourseId}`} replace />;
    } else {
      // If no course found, redirect to the courses page
      return <Navigate to="/courses" replace />;
    }
  }

  return <LandingPageContent />;
};

function App() {
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    // Simulate initial loading time to show the Lottie animation
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider>
        {initialLoading && <LoadingScreen />}
        <Router>
          <div className="app-container">
            <main>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/courses" element={<CourseListPage />} />
                <Route path="/survey/:courseId" element={<Survey />} />
                <Route path="/learn/:courseId" element={<LearningPage />} />
                <Route path="/study/:courseId/:chapterId" element={<StudyPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/shop" element={<ShopPage />} />
                <Route path="/admin" element={<AdminDashboard />} />
              </Routes>
            </main>
          </div>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
