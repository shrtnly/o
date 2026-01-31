import React, { useState, useEffect } from 'react';
import {
    Plus,
    Trash2,
    ChevronDown,
    ChevronRight,
    Clock,
    GripVertical,
    Heart,
    Gem,
    Gift
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
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

    const handleAddChapter = async (type = 'lesson') => {
        try {
            const title = type === 'lesson' ? 'New Chapter' : 'Mystery Box';
            const newChapter = await courseService.createChapter({
                unit_id: moduleId,
                title,
                order_index: chapters.length + 1,
                type,
                reward_hearts: type === 'mystery_box' ? 5 : 0,
                reward_gems: type === 'mystery_box' ? 10 : 0
            });
            setChapters([...chapters, newChapter]);
            if (type === 'lesson') setExpandedChapterId(newChapter.id);
            toast.success(`${type.replace('_', ' ')} Added`);
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

    const handleOnDragEnd = async (result) => {
        if (!result.destination) return;

        const items = Array.from(chapters);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        // Update state immediately
        const updatedItems = items.map((item, index) => ({
            ...item,
            order_index: index + 1
        }));
        setChapters(updatedItems);

        // Update database
        try {
            const updates = updatedItems.map(item =>
                courseService.updateChapter(item.id, { order_index: item.order_index })
            );
            await Promise.all(updates);
            toast.success('Chapter order updated');
        } catch (error) {
            toast.error('Failed to save chapter order');
            loadChapters();
        }
    };

    return (
        <div className="space-y-3">
            <DragDropContext onDragEnd={handleOnDragEnd}>
                <Droppable droppableId={`chapters-${moduleId}`}>
                    {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                            {chapters.map((chapter, index) => (
                                <Draggable key={chapter.id} draggableId={chapter.id} index={index}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            className={cn(
                                                "border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-sm transition-all",
                                                snapshot.isDragging && "shadow-lg ring-2 ring-blue-500/20 scale-[1.01] z-50"
                                            )}
                                        >
                                            <div className="flex items-center gap-4 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <div {...provided.dragHandleProps} className="p-1 -ml-1 text-slate-300 dark:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-grab active:cursor-grabbing">
                                                    <GripVertical size={14} />
                                                </div>
                                                <input
                                                    type="text"
                                                    className="flex-1 bg-transparent border-none p-0 font-bold text-slate-800 dark:text-slate-100 text-sm outline-none focus:ring-0"
                                                    defaultValue={chapter.title}
                                                    onBlur={(e) => handleUpdateChapter(chapter.id, { title: e.target.value })}
                                                />
                                                <div className="flex items-center gap-2">
                                                    {chapter.type === 'mystery_box' && (
                                                        <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                                                            <div className="flex items-center gap-1.5 border-right border-slate-300 pr-2">
                                                                <Heart size={14} className="text-red-500" fill="currentColor" />
                                                                <input
                                                                    type="number"
                                                                    className="w-12 bg-transparent border-none p-0 text-xs font-black text-slate-900 dark:text-white outline-none"
                                                                    defaultValue={chapter.reward_hearts || 0}
                                                                    onBlur={(e) => handleUpdateChapter(chapter.id, { reward_hearts: parseInt(e.target.value) || 0 })}
                                                                />
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <Gem size={14} className="text-blue-400" fill="currentColor" />
                                                                <input
                                                                    type="number"
                                                                    className="w-12 bg-transparent border-none p-0 text-xs font-black text-slate-900 dark:text-white outline-none"
                                                                    defaultValue={chapter.reward_gems || 0}
                                                                    onBlur={(e) => handleUpdateChapter(chapter.id, { reward_gems: parseInt(e.target.value) || 0 })}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                    {chapter.type === 'lesson' && (
                                                        <>
                                                            <Clock size={14} className="text-slate-400 dark:text-slate-600" />
                                                            <input
                                                                type="text"
                                                                placeholder="Time"
                                                                className="w-16 bg-transparent border-none p-0 text-xs font-medium text-slate-500 dark:text-slate-400 outline-none"
                                                                defaultValue={chapter.estimated_time || ''}
                                                                onBlur={(e) => handleUpdateChapter(chapter.id, { estimated_time: e.target.value })}
                                                            />
                                                        </>
                                                    )}
                                                    <button onClick={() => handleDeleteChapter(chapter.id)} className="p-1 text-slate-300 dark:text-slate-600 hover:text-red-500 rounded-md transition-colors"><Trash2 size={14} /></button>
                                                    {chapter.type === 'lesson' && (
                                                        <button
                                                            onClick={() => setExpandedChapterId(expandedChapterId === chapter.id ? null : chapter.id)}
                                                            className={cn("p-1.5 rounded text-slate-400 font-bold transition-all", expandedChapterId === chapter.id ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800")}
                                                        >
                                                            {expandedChapterId === chapter.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            {expandedChapterId === chapter.id && (
                                                <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800">
                                                    <LearningPointSection chapterId={chapter.id} />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>
            <div className="flex items-center gap-4">
                <button onClick={() => handleAddChapter('lesson')} className="flex items-center gap-2 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 font-bold text-xs p-2 transition-colors">
                    <Plus size={14} /> Add Chapter
                </button>
                <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800"></div>
                <button onClick={() => handleAddChapter('mystery_box')} className="flex items-center gap-2 text-purple-400/80 hover:text-purple-500 font-bold text-xs p-2 transition-colors">
                    <Gift size={14} /> Add Mystery Box
                </button>
            </div>
        </div>
    );
};

export default ChapterSection;
