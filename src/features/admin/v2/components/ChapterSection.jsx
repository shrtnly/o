import React, { useState, useEffect } from 'react';
import {
    Plus,
    Trash2,
    ChevronDown,
    ChevronRight,
    Clock,
    GripVertical
} from 'lucide-react';
import { courseService } from '../../../../services/courseService';
import { cn } from '../../../../lib/utils';
import { toast } from 'sonner';
import LearningPointSection from './LearningPointSection';

const ChapterSection = ({ moduleId }) => {
    const [chapters, setChapters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedChapterId, setExpandedChapterId] = useState(null);

    useEffect(() => {
        loadChapters();
    }, [moduleId]);

    const loadChapters = async () => {
        try {
            const data = await courseService.getChapters(moduleId);
            setChapters(data || []);
        } catch (err) {
            toast.error('Load failed');
        } finally {
            setLoading(false);
        }
    };

    const handleAddChapter = async () => {
        try {
            const newChapter = await courseService.createChapter({
                unit_id: moduleId,
                title: 'New Chapter',
                order_index: chapters.length + 1
            });
            setChapters([...chapters, newChapter]);
            setExpandedChapterId(newChapter.id);
            toast.success('Chapter Added');
        } catch (err) {
            toast.error('Add failed');
        }
    };

    const handleUpdateChapter = async (chapterId, updates) => {
        try {
            await courseService.updateChapter(chapterId, updates);
            setChapters(chapters.map(c => c.id === chapterId ? { ...c, ...updates } : c));
        } catch (err) {
            toast.error('Save failed');
        }
    };

    const handleDeleteChapter = async (chapterId) => {
        if (!window.confirm('Delete chapter?')) return;
        try {
            await courseService.deleteChapter(chapterId);
            setChapters(chapters.filter(c => c.id !== chapterId));
            toast.success('Deleted');
        } catch (err) {
            toast.error('Delete failed');
        }
    };

    return (
        <div className="space-y-3">
            {chapters.map((chapter) => (
                <div key={chapter.id} className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                    <div className="flex items-center gap-4 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <GripVertical size={14} className="text-slate-300 dark:text-slate-700" />
                        <input
                            type="text"
                            className="flex-1 bg-transparent border-none p-0 font-bold text-slate-800 dark:text-slate-100 text-sm outline-none focus:ring-0"
                            defaultValue={chapter.title}
                            onBlur={(e) => handleUpdateChapter(chapter.id, { title: e.target.value })}
                        />
                        <div className="flex items-center gap-2">
                            <Clock size={14} className="text-slate-400 dark:text-slate-600" />
                            <input
                                type="text"
                                placeholder="Time"
                                className="w-16 bg-transparent border-none p-0 text-xs font-medium text-slate-500 dark:text-slate-400 outline-none"
                                defaultValue={chapter.estimated_time || ''}
                                onBlur={(e) => handleUpdateChapter(chapter.id, { estimated_time: e.target.value })}
                            />
                            <button onClick={() => handleDeleteChapter(chapter.id)} className="p-1 text-slate-300 dark:text-slate-600 hover:text-red-500 rounded-md transition-colors"><Trash2 size={14} /></button>
                            <button
                                onClick={() => setExpandedChapterId(expandedChapterId === chapter.id ? null : chapter.id)}
                                className={cn("p-1.5 rounded text-slate-400 font-bold transition-all", expandedChapterId === chapter.id ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800")}
                            >
                                {expandedChapterId === chapter.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                        </div>
                    </div>
                    {expandedChapterId === chapter.id && (
                        <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800">
                            <LearningPointSection chapterId={chapter.id} />
                        </div>
                    )}
                </div>
            ))}
            <button onClick={handleAddChapter} className="flex items-center gap-2 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 font-bold text-xs p-2 transition-colors">
                <Plus size={14} /> Add Chapter
            </button>
        </div>
    );
};

export default ChapterSection;
