import React, { useState, useEffect } from 'react';
import {
    Plus,
    Trash2,
    FileText,
    HelpCircle,
    CheckCircle2,
    Circle,
    MessageSquare,
    Type
} from 'lucide-react';
import { courseService } from '../../../../services/courseService';
import { cn } from '../../../../lib/utils';
import { toast } from 'sonner';

const LearningPointSection = ({ chapterId }) => {
    const [nodes, setNodes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadNodes();
    }, [chapterId]);

    const loadNodes = async () => {
        try {
            const data = await courseService.getChapterContent(chapterId);
            setNodes(data || []);
        } catch (err) {
            toast.error('Failed to load content nodes');
        } finally {
            setLoading(false);
        }
    };

    const handleAddNode = async () => {
        try {
            const lp = await courseService.saveLearningPoint({
                chapter_id: chapterId,
                title: 'New Node',
                content: '',
                order_index: nodes.length + 1
            });
            setNodes([...nodes, { ...lp, mcq_questions: [] }]);
            toast.success('Node created');
        } catch (err) {
            toast.error('Failed to create node');
        }
    };

    const handleUpdateNode = async (nodeId, updates) => {
        try {
            const node = nodes.find(n => n.id === nodeId);
            await courseService.saveLearningPoint({
                id: nodeId,
                chapter_id: chapterId,
                order_index: node.order_index,
                ...updates
            });
        } catch (err) {
            toast.error('Sync failed');
        }
    };

    const handleUpdateMCQ = async (node, updates) => {
        try {
            const mcq = node.mcq_questions?.[0] || {};
            const res = await courseService.saveQuestion({
                id: mcq.id,
                learning_point_id: node.id,
                question_text: mcq.question_text || '',
                explanation: mcq.explanation || '',
                order_index: 0,
                ...updates
            });
            setNodes(nodes.map(n => n.id === node.id ? { ...n, mcq_questions: [res] } : n));
        } catch (err) {
            toast.error('Failed to save question');
        }
    };

    const handleUpdateOption = async (node, optionIdx, text, isCorrect = null) => {
        try {
            const mcq = node.mcq_questions?.[0];
            if (!mcq) {
                toast.error('Please enter question text first');
                return;
            }

            // Build full set of 3 options to solve index jumps
            const currentOptions = mcq.mcq_options || [];
            const slots = [{}, {}, {}];
            currentOptions.forEach(opt => {
                if (opt.order_index >= 0 && opt.order_index < 3) slots[opt.order_index] = opt;
            });

            const targetOption = slots[optionIdx];
            const updatedOption = {
                ...targetOption,
                option_text: text,
                is_correct: isCorrect !== null ? isCorrect : !!targetOption.is_correct,
                order_index: optionIdx
            };

            const newOptions = [...slots];
            newOptions[optionIdx] = updatedOption;

            if (isCorrect === true) {
                newOptions.forEach((o, i) => { if (i !== optionIdx) o.is_correct = false; });
            }

            // Validation: Don't allow marking empty option as correct
            if (isCorrect === true && (!text || text.trim() === '')) {
                toast.error('Please enter option text before marking as correct');
                return;
            }

            await courseService.saveOptions(mcq.id, newOptions);
            loadNodes(); // Refresh
        } catch (err) {
            toast.error('Save failed: ' + (err.message || 'Check database constraints'));
        }
    };

    const handleDeleteNode = async (nodeId) => {
        if (!window.confirm('Delete this knowledge node?')) return;
        try {
            await courseService.deleteLearningPoint(nodeId);
            setNodes(nodes.filter(n => n.id !== nodeId));
            toast.success('Removed');
        } catch (err) {
            toast.error('Delete failed');
        }
    };

    if (loading) return <div className="py-10 text-center text-slate-400 text-xs">Synchronizing segments...</div>;

    return (
        <div className="space-y-10">
            {nodes.map((node, nodeIdx) => (
                <div key={node.id} className="bg-white border border-slate-200 rounded-[2rem] p-8 space-y-8 shadow-sm transition-all">
                    {/* Compact Header */}
                    <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                        <div className="flex items-center gap-4">
                            <span className="w-10 h-10 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-xs font-black">
                                {nodeIdx + 1}
                            </span>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Node</span>
                                <input
                                    className="bg-transparent border-none p-0 font-bold text-slate-900 outline-none focus:ring-0 text-lg placeholder:text-slate-200"
                                    defaultValue={node.title}
                                    onBlur={(e) => handleUpdateNode(node.id, { title: e.target.value })}
                                />
                            </div>
                        </div>
                        <button onClick={() => handleDeleteNode(node.id)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                            <Trash2 size={20} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-10">
                        {/* Section 1: Narrative Context */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                <FileText size={16} className="text-blue-500" /> 1. Read and Respond (Context)
                            </label>
                            <textarea
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-6 outline-none focus:ring-4 focus:ring-blue-500/5 focus:bg-white transition-all text-sm min-h-[120px] resize-none leading-relaxed font-medium"
                                placeholder="Explain the concept or provide instructions..."
                                defaultValue={node.content}
                                onBlur={(e) => handleAutoSave ? handleUpdateNode(node.id, { content: e.target.value }) : handleUpdateNode(node.id, { content: e.target.value })}
                            // Note: handleAutoSave was a placeholder in my mind, just calling handleUpdateNode
                            />
                        </div>

                        {/* Section 2: Interactive Logic */}
                        <div className="bg-slate-50/50 rounded-[2rem] p-8 space-y-8 border border-slate-100">
                            <div className="flex items-center gap-2">
                                <HelpCircle size={18} className="text-amber-500" />
                                <span className="text-sm font-black text-slate-900 uppercase tracking-wider">2. MCQ Logic Configuration</span>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                {/* Question Pillar */}
                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Type size={16} className="text-slate-900" /> Question Prompt
                                        </label>
                                        <input
                                            className="w-full bg-white border border-slate-200 rounded-2xl p-5 text-sm font-bold placeholder:text-slate-200 outline-none focus:border-slate-900 transition-all shadow-sm"
                                            placeholder="e.g. প্রশ্ন ১: এই পদের জন্য সঠিক উত্তরটি নির্বাচন করুন।"
                                            defaultValue={node.mcq_questions?.[0]?.question_text || ''}
                                            onBlur={(e) => handleUpdateMCQ(node, { question_text: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <MessageSquare size={16} className="text-emerald-500" /> Answer Explanation
                                        </label>
                                        <textarea
                                            className="w-full bg-white border border-slate-200 rounded-2xl p-5 text-sm font-medium placeholder:text-slate-200 outline-none focus:border-slate-900 transition-all min-h-[120px] resize-none shadow-sm"
                                            placeholder="e.g. এইচটিএমএল স্ট্যান্ডার্ড অনুযায়ী এটিই সঠিক নিয়ম।"
                                            defaultValue={node.mcq_questions?.[0]?.explanation || ''}
                                            onBlur={(e) => handleUpdateMCQ(node, { explanation: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Option Pillar */}
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Plus size={16} className="text-blue-500" /> Valid Options (Locked to 3)
                                    </label>
                                    <div className="space-y-3">
                                        {[0, 1, 2].map((oIdx) => {
                                            // Robust mapping: find option by order_index
                                            const options = node.mcq_questions?.[0]?.mcq_options || [];
                                            const opt = options.find(o => o.order_index === oIdx) || {};

                                            return (
                                                <div key={oIdx} className={cn(
                                                    "group flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-300",
                                                    opt.is_correct
                                                        ? "border-emerald-500 bg-white shadow-lg shadow-emerald-500/10"
                                                        : "border-transparent bg-white shadow-sm hover:border-slate-200"
                                                )}>
                                                    <button
                                                        onClick={() => handleUpdateOption(node, oIdx, opt.option_text || '', true)}
                                                        className={cn(
                                                            "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                                                            opt.is_correct
                                                                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/50"
                                                                : "bg-slate-50 border border-slate-100 text-slate-200 group-hover:border-slate-300"
                                                        )}
                                                    >
                                                        {opt.is_correct ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                                                    </button>
                                                    <input
                                                        className="bg-transparent border-none p-0 text-sm font-bold w-full outline-none placeholder:text-slate-200"
                                                        placeholder={`Option ${oIdx + 1}`}
                                                        defaultValue={opt.option_text || ''}
                                                        onBlur={(e) => handleUpdateOption(node, oIdx, e.target.value)}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold italic opacity-60">* Option D disabled to simplify student cognition.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            <button
                onClick={handleAddNode}
                className="w-full py-12 border-2 border-dashed border-slate-200 rounded-[2.5rem] text-slate-400 font-black hover:bg-white hover:border-slate-900 hover:text-slate-900 transition-all flex flex-col items-center justify-center gap-4 group bg-slate-50/30"
            >
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center border border-slate-100 shadow-sm group-hover:scale-110 transition-transform">
                    <Plus size={32} />
                </div>
                <div className="flex flex-col items-center gap-1">
                    <span className="text-sm uppercase tracking-[0.2em]">Deploy Knowledge Segment</span>
                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Context + MCQ Configuration</span>
                </div>
            </button>
        </div>
    );
};

export default LearningPointSection;
