import React, { useState, useEffect } from 'react';
import {
    ArrowLeft,
    Save,
    Plus,
    FileText,
    HelpCircle,
    Layout,
    Layers,
    Clock
} from 'lucide-react';
import { courseService } from '../../../services/courseService';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';
import ModuleSection from './components/ModuleSection';

const CourseEditor = ({ courseId, onBack }) => {
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('essentials');

    useEffect(() => {
        if (courseId) {
            loadCourse();
        } else {
            setCourse({ title: '', description: '', image_url: '', category: 'Everyday Life Skills' });
            setLoading(false);
        }
    }, [courseId]);

    const loadCourse = async () => {
        try {
            const data = await courseService.getCourseById(courseId);
            setCourse(data);
        } catch (err) {
            toast.error('Load failed');
        } finally {
            setLoading(false);
        }
    };

    const handleAutoSave = async (updatedData) => {
        if (!courseId) {
            setCourse(prev => ({ ...prev, ...updatedData }));
            return;
        }
        try {
            setIsSaving(true);
            await courseService.updateCourse(courseId, updatedData);
            setCourse(prev => ({ ...prev, ...updatedData }));
        } catch (err) {
            toast.error('Auto-save failed');
        } finally {
            setIsSaving(false);
        }
    };

    const handleInitialSave = async () => {
        if (!course.title) return toast.error('Enter title');
        try {
            setIsSaving(true);
            await courseService.createCourse(course);
            toast.success('Course Created');
            onBack();
        } catch (err) {
            toast.error('Save failed');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div className="py-20 text-center text-slate-400 dark:text-slate-600">Loading...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Simple Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-6">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{courseId ? 'Edit Course' : 'New Course'}</h2>
                        {isSaving && <span className="text-xs text-blue-500 dark:text-blue-400 font-medium tracking-wide">Syncing changes...</span>}
                    </div>
                </div>
                {!courseId && (
                    <button onClick={handleInitialSave} className="bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white px-5 py-2 rounded-lg font-bold text-sm">
                        Create Course
                    </button>
                )}
            </div>

            {/* Simple Tabs */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl w-fit border border-slate-200 dark:border-slate-800">
                <button
                    onClick={() => setActiveTab('essentials')}
                    className={cn("px-6 py-2 rounded-lg text-sm font-bold transition-all", activeTab === 'essentials' ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}
                >
                    1. General Info
                </button>
                <button
                    onClick={() => courseId ? setActiveTab('architecture') : toast.error('Save first')}
                    className={cn("px-6 py-2 rounded-lg text-sm font-bold transition-all", activeTab === 'architecture' ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}
                >
                    2. Course Content
                </button>
            </div>

            {/* Simple Content Editor */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
                {activeTab === 'essentials' ? (
                    <div className="max-w-2xl space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-600 dark:text-slate-400">Course Title</label>
                            <input
                                type="text"
                                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-slate-900 dark:focus:border-slate-100 transition-all font-medium text-slate-900 dark:text-slate-100"
                                value={course.title}
                                onChange={(e) => setCourse({ ...course, title: e.target.value })}
                                onBlur={(e) => handleAutoSave({ title: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-600 dark:text-slate-400">Category</label>
                                <select
                                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-slate-900 dark:focus:border-slate-100 transition-all font-medium text-slate-900 dark:text-slate-100"
                                    value={course.category}
                                    onChange={(e) => handleAutoSave({ category: e.target.value })}
                                >
                                    <option value="Everyday Life Skills">দৈনন্দিন জীবন দক্ষতা (Life Skills)</option>
                                    <option value="Civic & Legal Awareness">নাগরিক ও আইনি সচেতনতা (Civic)</option>
                                    <option value="Safety & Health">নিরাপত্তা ও স্বাস্থ্য (Health)</option>
                                    <option value="Digital Literacy">ডিজিটাল লিটারেসি (Digital)</option>
                                    <option value="Fun / Curiosity Learning">মজার / কৌতূহলী শিক্ষা (Fun)</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-600 dark:text-slate-400">Thumbnail URL</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-slate-900 dark:focus:border-slate-100 transition-all font-medium text-slate-900 dark:text-slate-100"
                                    value={course.image_url}
                                    onChange={(e) => setCourse({ ...course, image_url: e.target.value })}
                                    onBlur={(e) => handleAutoSave({ image_url: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-600 dark:text-slate-400">Description</label>
                            <textarea
                                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-slate-900 dark:focus:border-slate-100 transition-all font-medium min-h-[120px] resize-none text-slate-900 dark:text-slate-100"
                                value={course.description}
                                onChange={(e) => setCourse({ ...course, description: e.target.value })}
                                onBlur={(e) => handleAutoSave({ description: e.target.value })}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800/50 pb-4">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Curriculum Hierarchy</h3>
                            <p className="text-slate-400 dark:text-slate-500 text-sm">Add modules and chapters below.</p>
                        </div>
                        <ModuleSection courseId={courseId} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default CourseEditor;
