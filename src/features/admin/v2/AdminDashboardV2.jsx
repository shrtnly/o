import React, { useState } from 'react';
import {
    BookOpen,
    Users,
    Settings,
    ChevronLeft,
    Menu,
    LogOut,
    Sun,
    Moon
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import CourseList from './CourseList';
import CourseEditor from './CourseEditor';
import { Toaster } from 'sonner';
import { useTheme } from '../../../context/ThemeContext';

const AdminDashboardV2 = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [activeView, setActiveView] = useState('courses');
    const [selectedCourseId, setSelectedCourseId] = useState(null);
    const { isDark, toggleTheme } = useTheme();

    const navItems = [
        { id: 'courses', label: 'Curriculum', icon: BookOpen },
        { id: 'users', label: 'Students', icon: Users },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    const handleEditCourse = (courseId) => {
        setSelectedCourseId(courseId);
        setActiveView('editor');
    };

    return (
        <div className="flex h-screen bg-white dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 overflow-hidden">
            <Toaster position="top-right" richColors theme={isDark ? 'dark' : 'light'} />

            {/* Simple Sidebar */}
            <aside className={cn(
                "bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 flex flex-col z-50",
                isSidebarOpen ? "w-64" : "w-20"
            )}>
                <div className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
                    <div className={cn("font-bold text-lg text-slate-900 dark:text-slate-100 truncate transition-opacity", !isSidebarOpen && "opacity-0")}>
                        BeeLesson Admin
                    </div>
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
                        {isSidebarOpen ? <ChevronLeft size={18} /> : <Menu size={18} />}
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveView(item.id)}
                            className={cn(
                                "flex items-center w-full p-3 rounded-xl transition-colors font-medium text-sm",
                                activeView === item.id || (activeView === 'editor' && item.id === 'courses')
                                    ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100"
                            )}
                        >
                            <item.icon size={18} />
                            {isSidebarOpen && <span className="ml-3">{item.label}</span>}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <button
                        onClick={toggleTheme}
                        className="flex items-center w-full p-3 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors text-sm font-medium"
                    >
                        {isDark ? <Sun size={18} /> : <Moon size={18} />}
                        {isSidebarOpen && <span className="ml-3">{isDark ? 'Light' : 'Night'} Mode</span>}
                    </button>
                    <button className="flex items-center w-full p-3 text-slate-400 dark:text-slate-500 hover:text-red-500 text-sm font-medium transition-colors">
                        <LogOut size={18} />
                        {isSidebarOpen && <span className="ml-3">Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Simple Main Surface */}
            <main className="grow flex flex-col h-full bg-white dark:bg-slate-950 relative overflow-auto">
                <div className="p-8 max-w-6xl mx-auto w-full">
                    {activeView === 'courses' && (
                        <CourseList
                            onEditCourse={handleEditCourse}
                            onCreateCourse={() => { setSelectedCourseId(null); setActiveView('editor'); }}
                        />
                    )}
                    {activeView === 'editor' && (
                        <CourseEditor
                            courseId={selectedCourseId}
                            onBack={() => setActiveView('courses')}
                        />
                    )}
                    {(activeView !== 'courses' && activeView !== 'editor') && (
                        <div className="py-20 text-center text-slate-400 dark:text-slate-600">
                            <Settings size={48} className="mx-auto mb-4 opacity-10" />
                            <p className="text-lg font-medium">Coming Soon</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AdminDashboardV2;
