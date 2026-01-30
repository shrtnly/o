import React, { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    MoreVertical,
    Edit,
    Trash2,
    ExternalLink,
    Users,
    Star,
    LayoutGrid,
    List,
    BookOpen
} from 'lucide-react';
import { courseService } from '../../../services/courseService';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';

const CourseList = ({ onEditCourse, onCreateCourse }) => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('grid'); // grid, list

    useEffect(() => {
        loadCourses();
    }, []);

    const loadCourses = async () => {
        try {
            const data = await courseService.getAllCourses();
            setCourses(data || []);
        } catch (err) {
            toast.error('Failed to load courses: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (courseId) => {
        if (!window.confirm('Are you sure you want to delete this course?')) return;
        try {
            await courseService.deleteCourse(courseId);
            setCourses(courses.filter(c => c.id !== courseId));
            toast.success('Course deleted successfully');
        } catch (err) {
            toast.error('Failed to delete course');
        }
    };

    const filteredCourses = courses.filter(course =>
        course.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Curriculum Design</h1>
                    <p className="text-slate-500 mt-1 font-medium">Manage and organize your learning pathways.</p>
                </div>
                <button
                    onClick={onCreateCourse}
                    className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-sm hover:translate-y-[-1px] active:translate-y-[0px]"
                >
                    <Plus size={20} />
                    <span>Create New Course</span>
                </button>
            </div>

            {/* Filter & View Bar */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search courses..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-slate-900/5 transition-all outline-none text-slate-700 font-medium"
                    />
                </div>
                <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={cn(
                            "p-2 rounded-lg transition-all",
                            viewMode === 'grid' ? "bg-white shadow-sm text-slate-900" : "text-slate-400 hover:text-slate-600"
                        )}
                    >
                        <LayoutGrid size={18} />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={cn(
                            "p-2 rounded-lg transition-all",
                            viewMode === 'list' ? "bg-white shadow-sm text-slate-900" : "text-slate-400 hover:text-slate-600"
                        )}
                    >
                        <List size={18} />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white h-72 rounded-3xl border border-slate-200 animate-pulse" />
                    ))}
                </div>
            ) : filteredCourses.length === 0 ? (
                <div className="bg-white py-20 rounded-3xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
                    <BookOpen size={64} className="mb-4 opacity-20" />
                    <p className="text-xl font-medium">No courses found matching your query</p>
                    <button onClick={() => setSearchQuery('')} className="mt-4 text-blue-500 hover:underline font-semibold">Clear search</button>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCourses.map(course => (
                        <div
                            key={course.id}
                            className="group bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 overflow-hidden flex flex-col"
                        >
                            <div className="aspect-video bg-slate-100 relative overflow-hidden">
                                {course.image_url ? (
                                    <img
                                        src={course.image_url}
                                        alt={course.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300 backdrop-blur-3xl">
                                        <BookOpen size={48} />
                                    </div>
                                )}
                                <div className="absolute top-4 right-4 flex gap-2">
                                    <button
                                        onClick={() => onEditCourse(course.id)}
                                        className="p-2 bg-white/90 backdrop-blur-md rounded-xl text-slate-700 hover:bg-white hover:text-blue-600 shadow-sm transition-all"
                                    >
                                        <Edit size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(course.id)}
                                        className="p-2 bg-white/90 backdrop-blur-md rounded-xl text-slate-700 hover:bg-white hover:text-red-600 shadow-sm transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                {course.is_featured && (
                                    <div className="absolute top-4 left-4">
                                        <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider">Featured</span>
                                    </div>
                                )}
                            </div>
                            <div className="p-6 flex-1 flex flex-col">
                                <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">{course.title}</h3>
                                <p className="text-slate-500 text-sm mt-2 line-clamp-2 leading-relaxed">
                                    {course.description || "No description provided for this course architecture."}
                                </p>
                                <div className="mt-auto pt-6 flex items-center justify-between border-t border-slate-50">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-xs">
                                            <Users size={14} className="text-slate-400" />
                                            <span>{course.students_count || 0}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-xs">
                                            <Star size={14} className="text-amber-400 fill-amber-400" />
                                            <span>{course.rating || '4.5'}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => onEditCourse(course.id)}
                                        className="flex items-center gap-1.5 text-slate-900 font-bold text-sm hover:gap-2 transition-all"
                                    >
                                        Settings <ExternalLink size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                                <th className="px-6 py-4">Course Name</th>
                                <th className="px-6 py-4">Stats</th>
                                <th className="px-6 py-4">Featured</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            {filteredCourses.map(course => (
                                <tr key={course.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
                                                {course.image_url && <img src={course.image_url} className="w-full h-full object-cover" />}
                                            </div>
                                            <div>
                                                <div className="text-slate-900 group-hover:text-blue-600 transition-colors">{course.title}</div>
                                                <div className="text-slate-400 text-xs mt-0.5">{course.category || 'Curriculum'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <span className="flex items-center gap-1 text-xs text-slate-500"><Users size={12} /> {course.students_count}</span>
                                            <span className="flex items-center gap-1 text-xs text-slate-500"><Star size={12} className="text-amber-400 fill-amber-400" /> {course.rating}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {course.is_featured ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">ACTIVE</span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right whitespace-nowrap">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => onEditCourse(course.id)}
                                                className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(course.id)}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default CourseList;
