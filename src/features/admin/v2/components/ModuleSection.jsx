import React, { useState, useEffect } from 'react';
import {
    Plus,
    GripVertical,
    ChevronDown,
    ChevronRight,
    Trash2
} from 'lucide-react';
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

    if (loading) return <div className="py-10 text-center text-slate-400">Loading units...</div>;

    return (
        <div className="space-y-4">
            {modules.map((module) => (
                <div key={module.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                    <div className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors">
                        <GripVertical size={16} className="text-slate-300 cursor-grab" />
                        <input
                            type="text"
                            className="flex-1 bg-transparent border-none p-0 font-bold text-slate-900 outline-none focus:ring-0"
                            defaultValue={module.title}
                            onBlur={(e) => handleUpdateModule(module.id, e.target.value)}
                        />
                        <div className="flex items-center gap-2">
                            <button onClick={() => handleDeleteModule(module.id)} className="p-2 text-slate-400 hover:text-red-500 rounded-lg">
                                <Trash2 size={16} />
                            </button>
                            <button
                                onClick={() => setExpandedModuleId(expandedModuleId === module.id ? null : module.id)}
                                className={cn("p-2 rounded-lg transition-all", expandedModuleId === module.id ? "bg-slate-900 text-white" : "text-slate-400 hover:bg-slate-100")}
                            >
                                {expandedModuleId === module.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                            </button>
                        </div>
                    </div>
                    {expandedModuleId === module.id && (
                        <div className="p-6 bg-slate-50 border-t border-slate-100">
                            <ChapterSection moduleId={module.id} />
                        </div>
                    )}
                </div>
            ))}
            <button onClick={handleAddModule} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                <Plus size={18} /> Add Module
            </button>
        </div>
    );
};

export default ModuleSection;
