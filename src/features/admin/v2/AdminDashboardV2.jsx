import React, { useState } from 'react';
import {
    BookOpen,
    Users,
    Settings,
    ChevronLeft,
    Menu,
    LogOut,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import CourseList from './CourseList';
import CourseEditor from './CourseEditor';
import { Toaster } from 'sonner';

const AdminDashboardV2 = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [activeView, setActiveView] = useState('courses');
    const [selectedCourseId, setSelectedCourseId] = useState(null);

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
        <div className="flex h-screen bg-white font-sans text-slate-900 overflow-hidden">
            <Toaster position="top-right" richColors />

            {/* Simple Sidebar */}
            <aside className={cn(
                "bg-slate-50 border-r border-slate-200 transition-all duration-300 flex flex-col z-50",
                isSidebarOpen ? "w-64" : "w-20"
            )}>
                <div className="p-6 flex items-center justify-between border-b border-slate-100 bg-white">
                    <div className={cn("font-bold text-lg text-slate-900 truncate transition-opacity", !isSidebarOpen && "opacity-0")}>
                        ও-শেখা Admin
                    </div>
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-400 hover:text-slate-900">
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
                                    ? "bg-slate-900 text-white"
                                    : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-900"
                            )}
                        >
                            <item.icon size={18} />
                            {isSidebarOpen && <span className="ml-3">{item.label}</span>}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <button className="flex items-center w-full p-3 text-slate-400 hover:text-red-500 text-sm font-medium">
                        <LogOut size={18} />
                        {isSidebarOpen && <span className="ml-3">Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Simple Main Surface */}
            <main className="grow flex flex-col h-full bg-white relative overflow-auto">
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
                        <div className="py-20 text-center text-slate-400">
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
