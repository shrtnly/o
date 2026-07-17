import React, { useState, useEffect } from 'react';
import {
    BookOpen,
    Search,
    Filter,
    Loader2,
    Eye,
    EyeOff,
    CheckCircle2,
    XCircle,
    Globe,
    Lock
} from 'lucide-react';
import { courseService } from '../../../services/courseService';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';

const CourseControl = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [updatingId, setUpdatingId] = useState(null);

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        setLoading(true);
        try {
            const data = await courseService.getAllCourses(true);
            setCourses(data || []);
        } catch (err) {
            console.error('Error fetching courses:', err);
            toast.error('Failed to load courses');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (courseId, currentStatus) => {
        const newStatus = currentStatus === 'published' ? 'draft' : 'published';
        const actionLabel = newStatus === 'published' ? 'publish' : 'hide';

        if (!confirm(`Are you sure you want to ${actionLabel} this course?`)) {
            return;
        }

        setUpdatingId(courseId);
        const toastId = toast.loading(`Updating course status...`);

        try {
            const updated = await courseService.updateCourse(courseId, { status: newStatus });
            
            if (!updated) {
                throw new Error('Course update returned empty response');
            }

            toast.success(`Course successfully ${newStatus === 'published' ? 'published' : 'hidden'}`, { id: toastId });
            
            // Update local state
            setCourses(prev => prev.map(c => c.id === courseId ? { ...c, status: newStatus } : c));
        } catch (err) {
            console.error('Error toggling course status:', err);
            toast.error(`Failed to update course status: ${err.message || 'Unknown error'}`, { id: toastId });
        } finally {
            setUpdatingId(null);
        }
    };

    const filteredCourses = courses.filter(course => {
        const matchesSearch = 
            (course.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (course.title_en || '').toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = 
            statusFilter === 'all' || 
            (statusFilter === 'published' && course.status === 'published') ||
            (statusFilter === 'hidden' && course.status !== 'published');
        
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-slate-900 dark:text-slate-100 font-sans">
                        <BookOpen className="text-blue-500" size={24} />
                        Course Control
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-sans">
                        Publish or hide courses. Hidden courses are only visible to admins on the frontend.
                    </p>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row gap-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 font-sans">
                <div className="flex-1 relative flex items-center bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3">
                    <Search className="text-slate-400 mr-2" size={18} />
                    <input 
                        type="text" 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search by Course Title..."
                        className="bg-transparent border-none text-sm focus:ring-0 w-full py-2.5 focus:outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400"
                    />
                </div>

                <div className="flex items-center gap-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3">
                    <Filter className="text-slate-400" size={16} />
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="bg-transparent border-none text-sm focus:ring-0 py-2.5 focus:outline-none font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                        <option value="all">All Courses</option>
                        <option value="published">Published (Public)</option>
                        <option value="hidden">Hidden (Admin Only)</option>
                    </select>
                </div>
            </div>

            {/* Course Control List/Table */}
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm font-sans">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase tracking-wider font-bold text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
                                <th className="px-6 py-4">Course Info</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4">Visibility Status</th>
                                <th className="px-6 py-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-20 text-center">
                                        <Loader2 className="mx-auto animate-spin text-blue-500 mb-2" size={32} />
                                        <p className="text-sm text-slate-500">Loading courses...</p>
                                    </td>
                                </tr>
                            ) : filteredCourses.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-20 text-center">
                                        <div className="text-slate-400 dark:text-slate-600 mb-2 font-bold text-lg">No Courses Found</div>
                                        <p className="text-sm text-slate-500">No courses match your criteria.</p>
                                    </td>
                                </tr>
                            ) : filteredCourses.map((course) => {
                                const isPublished = course.status === 'published';
                                return (
                                    <tr key={course.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden flex-shrink-0 border border-slate-100 dark:border-slate-800">
                                                    {course.image_url ? (
                                                        <img src={course.image_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-400"><BookOpen size={16} /></div>
                                                    )}
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 block line-clamp-1">{course.title}</span>
                                                    <span className="text-xs text-slate-400 dark:text-slate-500 block line-clamp-1">{course.title_en || 'No English Title'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                                {course.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                                                isPublished 
                                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
                                                    : "bg-slate-100 text-slate-800 dark:bg-slate-800/40 dark:text-slate-400"
                                            )}>
                                                {isPublished ? <Globe size={12} /> : <Lock size={12} />}
                                                {isPublished ? 'Published' : 'Hidden'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleToggleStatus(course.id, course.status)}
                                                disabled={updatingId === course.id}
                                                className={cn(
                                                    "inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2",
                                                    isPublished
                                                        ? "bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50"
                                                        : "bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50"
                                                )}
                                            >
                                                {updatingId === course.id ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : isPublished ? (
                                                    <EyeOff size={14} />
                                                ) : (
                                                    <Eye size={14} />
                                                )}
                                                {isPublished ? 'Hide Course' : 'Publish Course'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CourseControl;
