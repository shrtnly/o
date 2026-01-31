import React, { useState, useEffect } from 'react';
import {
    Plus,
    GripVertical,
    ChevronDown,
    ChevronRight,
    Trash2
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { courseService } from '../../../../services/courseService';
import { cn } from '../../../../lib/utils';
import { toast } from 'sonner';
import ChapterSection from './ChapterSection';

const ModuleSection = ({ courseId }) => {
    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedModuleId, setExpandedModuleId] = useState(null);

    useEffect(() => {
        loadModules();
    }, [courseId]);

    const loadModules = async () => {
        try {
            const data = await courseService.getUnits(courseId);
            setModules(data || []);
        } catch (err) {
            toast.error('Failed to load modules');
        } finally {
            setLoading(false);
        }
    };

    const handleAddModule = async () => {
        try {
            const newModule = await courseService.createUnit({
                course_id: courseId,
                title: 'New Module',
                order_index: modules.length + 1
            });
            setModules([...modules, newModule]);
            setExpandedModuleId(newModule.id);
            toast.success('Module Added');
        } catch (err) {
            toast.error('Add failed');
        }
    };

    const handleUpdateModule = async (moduleId, title) => {
        try {
            await courseService.updateUnit(moduleId, { title });
            setModules(modules.map(m => m.id === moduleId ? { ...m, title } : m));
        } catch (err) {
            toast.error('Save failed');
        }
    };

    const handleDeleteModule = async (moduleId) => {
        if (!window.confirm('Delete this module?')) return;
        try {
            await courseService.deleteUnit(moduleId);
            setModules(modules.filter(m => m.id !== moduleId));
            toast.success('Deleted');
        } catch (err) {
            toast.error('Delete failed');
        }
    };

    const handleOnDragEnd = async (result) => {
        if (!result.destination) return;

        const items = Array.from(modules);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        // Update state immediately for smoothness
        const updatedItems = items.map((item, index) => ({
            ...item,
            order_index: index + 1
        }));
        setModules(updatedItems);

        // Update database
        try {
            const updates = updatedItems.map(item =>
                courseService.updateUnit(item.id, { order_index: item.order_index })
            );
            await Promise.all(updates);
            toast.success('Order updated');
        } catch (error) {
            toast.error('Failed to save order');
            loadModules(); // Revert on failure
        }
    };

    if (loading) return <div className="py-10 text-center text-slate-400 dark:text-slate-600">Loading units...</div>;

    return (
        <div className="space-y-4">
            <DragDropContext onDragEnd={handleOnDragEnd}>
                <Droppable droppableId="modules">
                    {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                            {modules.map((module, index) => (
                                <Draggable key={module.id} draggableId={module.id} index={index}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            className={cn(
                                                "border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900/50 shadow-sm transition-all",
                                                snapshot.isDragging && "shadow-xl ring-2 ring-slate-900/10 dark:ring-slate-100/10 scale-[1.01] z-50"
                                            )}
                                        >
                                            <div className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <div {...provided.dragHandleProps} className="p-1 -ml-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-grab active:cursor-grabbing text-slate-300 dark:text-slate-700">
                                                    <GripVertical size={16} />
                                                </div>
                                                <input
                                                    type="text"
                                                    className="flex-1 bg-transparent border-none p-0 font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-0"
                                                    defaultValue={module.title}
                                                    onBlur={(e) => handleUpdateModule(module.id, e.target.value)}
                                                />
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => handleDeleteModule(module.id)} className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 rounded-lg">
                                                        <Trash2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => setExpandedModuleId(expandedModuleId === module.id ? null : module.id)}
                                                        className={cn("p-2 rounded-lg transition-all", expandedModuleId === module.id ? "bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white" : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800")}
                                                    >
                                                        {expandedModuleId === module.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                                    </button>
                                                </div>
                                            </div>
                                            {expandedModuleId === module.id && (
                                                <div className="p-6 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
                                                    <ChapterSection moduleId={module.id} />
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
            <button onClick={handleAddModule} className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 dark:text-slate-600 font-bold hover:bg-slate-50 dark:hover:bg-slate-900 transition-all flex items-center justify-center gap-2">
                <Plus size={18} /> Add Module
            </button>
        </div>
    );
};

export default ModuleSection;
