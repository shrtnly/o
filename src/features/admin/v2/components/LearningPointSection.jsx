import React, { useState, useEffect } from 'react';
import {
    Plus,
    Trash2,
    FileText,
    HelpCircle,
    CheckCircle2,
    Circle,
    MessageSquare,
    Type,
    ChevronDown,
    ChevronUp,
    ArrowUp,
    ArrowDown,
    Layers,
    CheckSquare,
    Link,
    Contrast
} from 'lucide-react';
import { courseService } from '../../../../services/courseService';
import { cn } from '../../../../lib/utils';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabaseClient';
import StorytellingManager from './StorytellingManager';

const LearningPointSection = ({ chapterId }) => {
    const [nodes, setNodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [collapsedNodes, setCollapsedNodes] = useState(new Set());

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

    const handleAddNode = async (type = 'standard') => {
        try {
            const lp = await courseService.saveLearningPoint({
                chapter_id: chapterId,
                title: type === 'standard' ? 'New Node' : 'New Storytelling Scenario',
                content: type === 'standard' ? '' : '[]',
                order_index: nodes.length + 1,
                type: type
            });

            let initialQuestions = [];
            if (type === 'standard') {
                const q = await courseService.saveQuestion({
                    learning_point_id: lp.id,
                    question_text: 'New Question',
                    explanation: '',
                    order_index: 0
                });
                initialQuestions = [{ ...q, mcq_options: [] }];
            }

            setNodes([...nodes, { ...lp, mcq_questions: initialQuestions }]);
            toast.success(type === 'standard' ? 'Node created' : 'Storytelling scenario initialized');
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

    const handleUpdateMCQ = async (node, questionId, updates) => {
        try {
            const res = await courseService.saveQuestion({
                id: questionId,
                learning_point_id: node.id,
                ...updates
            });
            setNodes(nodes.map(n => n.id === node.id ? {
                ...n,
                mcq_questions: n.mcq_questions.map(q => q.id === questionId ? { ...q, ...res } : q)
            } : n));
        } catch (err) {
            console.error('Failed to save question:', err);
            toast.error('Failed to save question');
        }
    };

    const handleAddQuestion = async (node) => {
        try {
            const res = await courseService.saveQuestion({
                learning_point_id: node.id,
                question_text: 'New Question',
                explanation: '',
                narrative: node.type === 'storytelling' ? '[]' : '',
                order_index: (node.mcq_questions?.length || 0) + 1
            });
            setNodes(nodes.map(n => n.id === node.id ? {
                ...n,
                mcq_questions: [...(n.mcq_questions || []), { ...res, mcq_options: [] }]
            } : n));
            toast.success('Question added');
        } catch (err) {
            toast.error('Failed to add question');
        }
    };

    const handleDeleteQuestion = async (nodeId, questionId) => {
        if (!window.confirm('Delete this question?')) return;
        try {
            await supabase.from('mcq_questions').delete().eq('id', questionId);
            setNodes(nodes.map(n => n.id === nodeId ? {
                ...n,
                mcq_questions: n.mcq_questions.filter(q => q.id !== questionId)
            } : n));
            toast.success('Question removed');
        } catch (err) {
            toast.error('Delete failed');
        }
    };

    const handleUpdateOption = async (node, qId, optionIdx, text, isCorrect = null) => {
        try {
            const mcq = node.mcq_questions?.find(q => q.id === qId);
            if (!mcq) return;

            const isCheckmark = mcq.question_type === 'checkmark';
            const currentOptions = mcq.mcq_options || [];

            // Maintain at least 3 slots, or more if current options exceed 3
            const slotCount = Math.max(3, currentOptions.length, optionIdx + 1);
            const slots = Array.from({ length: slotCount }, (_, i) => {
                const existing = currentOptions.find(o => o.order_index === i);
                return existing ? { ...existing } : { order_index: i, option_text: '', is_correct: false };
            });

            const targetOption = slots[optionIdx];
            const newIsCorrect = isCorrect !== null ? isCorrect : !!targetOption.is_correct;

            const updatedOption = {
                ...targetOption,
                option_text: text,
                is_correct: newIsCorrect,
                order_index: optionIdx
            };

            const newOptions = [...slots];
            newOptions[optionIdx] = updatedOption;

            // Enforcement: If NOT checkmark and we just enabled correct, disable others
            if (newIsCorrect === true && !isCheckmark) {
                newOptions.forEach((o, i) => {
                    if (i !== optionIdx) o.is_correct = false;
                });
            }

            if (newIsCorrect === true && (!text || text.trim() === '')) {
                toast.error('Please enter option text first');
                return;
            }

            const saved = await courseService.saveOptions(qId, newOptions);
            setNodes(nodes.map(n => n.id === node.id ? {
                ...n,
                mcq_questions: n.mcq_questions.map(q => q.id === qId ? { ...q, mcq_options: saved } : q)
            } : n));
        } catch (err) {
            toast.error('Save failed');
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

    const handleMoveNode = async (nodeId, direction) => {
        const index = nodes.findIndex(n => n.id === nodeId);
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === nodes.length - 1) return;

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        const currentNode = nodes[index];
        const targetNode = nodes[targetIndex];

        try {
            // Use current timestamps to ensure relative ordering if order_index is identical
            const oldOrder = currentNode.order_index || index;
            const newOrder = targetNode.order_index || targetIndex;

            await Promise.all([
                courseService.saveLearningPoint({ ...currentNode, order_index: newOrder }),
                courseService.saveLearningPoint({ ...targetNode, order_index: oldOrder })
            ]);

            const updatedNodes = [...nodes];
            updatedNodes[index] = { ...targetNode, order_index: oldOrder };
            updatedNodes[targetIndex] = { ...currentNode, order_index: newOrder };
            setNodes(updatedNodes.sort((a, b) => a.order_index - b.order_index));
            toast.success('Position updated');
        } catch (err) {
            console.error('Move node error:', err);
            toast.error('Failed to move node');
        }
    };

    const toggleCollapse = (nodeId) => {
        setCollapsedNodes(prev => {
            const next = new Set(prev);
            if (next.has(nodeId)) next.delete(nodeId);
            else next.add(nodeId);
            return next;
        });
    };

    if (loading) return <div className="py-10 text-center text-slate-400 dark:text-slate-600 text-xs">Synchronizing segments...</div>;

    return (
        <div className="space-y-10">
            {nodes.map((node, nodeIdx) => (
                <div key={node.id} className={cn(
                    "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-8 shadow-sm transition-all",
                    collapsedNodes.has(node.id) ? "space-y-0" : "space-y-8"
                )}>
                    {/* Compact Header */}
                    <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-6 group/header">
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col gap-1 mr-2 opacity-0 group-hover/header:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleMoveNode(node.id, 'up')}
                                    disabled={nodeIdx === 0}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 disabled:opacity-0"
                                >
                                    <ArrowUp size={14} />
                                </button>
                                <button
                                    onClick={() => handleMoveNode(node.id, 'down')}
                                    disabled={nodeIdx === nodes.length - 1}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 disabled:opacity-0"
                                >
                                    <ArrowDown size={14} />
                                </button>
                            </div>
                            <span className="w-10 h-10 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl flex items-center justify-center text-xs font-black">
                                {nodeIdx + 1}
                            </span>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Active Node</span>
                                <input
                                    className="bg-transparent border-none p-0 font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-0 text-lg placeholder:text-slate-200 dark:placeholder:text-slate-700"
                                    defaultValue={node.title}
                                    onBlur={(e) => handleUpdateNode(node.id, { title: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => toggleCollapse(node.id)}
                                className="p-3 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all"
                            >
                                {collapsedNodes.has(node.id) ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                            </button>
                            <button onClick={() => handleDeleteNode(node.id)} className="p-3 text-slate-300 dark:text-slate-700 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all">
                                <Trash2 size={20} />
                            </button>
                        </div>
                    </div>

                    {!collapsedNodes.has(node.id) && (
                        <div className="grid grid-cols-1 gap-10">
                            {node.type === 'standard' && (
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <FileText size={16} className="text-blue-500" /> 1. Read and Respond (Context)
                                    </label>
                                    <textarea
                                        className="w-full bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 outline-none focus:ring-4 focus:ring-blue-500/5 focus:bg-white dark:focus:bg-slate-900 transition-all text-sm min-h-[120px] resize-none leading-relaxed font-medium text-slate-700 dark:text-slate-300 placeholder:text-slate-300 dark:placeholder:text-slate-700"
                                        placeholder="Explain the concept or provide instructions..."
                                        defaultValue={node.content}
                                        onBlur={(e) => handleUpdateNode(node.id, { content: e.target.value })}
                                    />
                                </div>
                            )}

                            <div className="space-y-6">
                                {(node.mcq_questions || []).map((q, qIdx) => (
                                    <div key={q.id || qIdx} className="bg-slate-50/50 dark:bg-slate-950/20 rounded-[2rem] p-8 space-y-8 border border-slate-100 dark:border-slate-800 relative group/mcq">
                                        <button
                                            onClick={() => handleDeleteQuestion(node.id, q.id)}
                                            className="absolute top-6 right-6 p-2 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover/mcq:opacity-100"
                                        >
                                            <Trash2 size={14} />
                                        </button>

                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg flex items-center justify-center text-[10px] font-black">
                                                    {qIdx + 1}
                                                </div>
                                                <span className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">Question Configuration</span>
                                            </div>
                                            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                                {[
                                                    { id: 'mcq', icon: Layers, label: 'MCQ' },
                                                    { id: 'checkmark', icon: CheckSquare, label: 'Checkmark' },
                                                    { id: 'matching', icon: Link, label: 'Match' },
                                                    { id: 'boolean', icon: Contrast, label: 'Y/N' }
                                                ].map(type => (
                                                    <button
                                                        key={type.id}
                                                        onClick={() => handleUpdateMCQ(node, q.id, { question_type: type.id })}
                                                        className={cn(
                                                            "px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all",
                                                            (q.question_type || 'mcq') === type.id
                                                                ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white"
                                                                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                                        )}
                                                    >
                                                        <type.icon size={14} />
                                                        <span className="text-[10px] font-bold uppercase tracking-tighter">{type.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Storytelling Dialogue for this specific question */}
                                        {node.type === 'storytelling' && (
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                                    <MessageSquare size={16} className="text-amber-500" /> Story Dialogue (Before Question)
                                                </label>
                                                <StorytellingManager
                                                    content={q.narrative}
                                                    onUpdate={(newContent) => handleUpdateMCQ(node, q.id, { narrative: newContent })}
                                                />
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                            <div className="space-y-8">
                                                <div className="space-y-4">
                                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                        <Type size={16} className="text-slate-900 dark:text-slate-100" /> Question Prompt
                                                    </label>
                                                    <input
                                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 text-sm font-bold placeholder:text-slate-200 dark:placeholder:text-slate-700 text-slate-900 dark:text-slate-100 outline-none focus:border-slate-900 dark:focus:border-slate-100 transition-all shadow-sm"
                                                        placeholder="Enter question..."
                                                        defaultValue={q.question_text || ''}
                                                        onBlur={(e) => handleUpdateMCQ(node, q.id, { question_text: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-4">
                                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                        <MessageSquare size={16} className="text-emerald-500" /> Answer Explanation
                                                    </label>
                                                    <textarea
                                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 text-sm font-medium placeholder:text-slate-200 dark:placeholder:text-slate-700 text-slate-700 dark:text-slate-300 outline-none focus:border-slate-900 dark:focus:border-slate-100 transition-all min-h-[120px] resize-none shadow-sm"
                                                        placeholder="Explain the answer..."
                                                        defaultValue={q.explanation || ''}
                                                        onBlur={(e) => handleUpdateMCQ(node, q.id, { explanation: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                        {q.question_type === 'matching' ? <Link size={16} className="text-blue-500" /> : <Plus size={16} className="text-blue-500" />}
                                                        {q.question_type === 'matching' ? 'Pairs (Left to Right)' : q.question_type === 'boolean' ? 'Logic Options' : 'Options (3)'}
                                                    </label>
                                                </div>

                                                <div className="space-y-3">
                                                    {q.question_type === 'matching' ? (
                                                        <div className="space-y-3">
                                                            {(q.metadata?.pairs || [{}, {}, {}]).map((pair, pIdx) => {
                                                                const pairs = q.metadata?.pairs || [];
                                                                return (
                                                                    <div key={pIdx} className="grid grid-cols-[1fr,1fr,auto] gap-3 p-4 bg-white dark:bg-slate-900/40 rounded-3xl border border-slate-100 dark:border-slate-800">
                                                                        <input
                                                                            placeholder="Left Item (Leave empty for Distractor)..."
                                                                            className="bg-transparent border-none p-0 text-xs font-bold outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-200"
                                                                            defaultValue={pair.left}
                                                                            onBlur={(e) => {
                                                                                const newPairs = [...pairs];
                                                                                while (newPairs.length <= pIdx) newPairs.push({ left: '', right: '' });
                                                                                newPairs[pIdx] = { ...newPairs[pIdx], left: e.target.value };
                                                                                handleUpdateMCQ(node, q.id, { metadata: { ...q.metadata, pairs: newPairs } });
                                                                            }}
                                                                        />
                                                                        <input
                                                                            placeholder="Right Match..."
                                                                            className="bg-transparent border-l border-slate-100 dark:border-slate-800 pl-3 text-xs font-bold outline-none text-blue-500 placeholder:text-slate-300"
                                                                            defaultValue={pair.right}
                                                                            onBlur={(e) => {
                                                                                const newPairs = [...pairs];
                                                                                while (newPairs.length <= pIdx) newPairs.push({ left: '', right: '' });
                                                                                newPairs[pIdx] = { ...newPairs[pIdx], right: e.target.value };
                                                                                handleUpdateMCQ(node, q.id, { metadata: { ...q.metadata, pairs: newPairs } });
                                                                            }}
                                                                        />
                                                                        <button
                                                                            onClick={() => {
                                                                                const newPairs = pairs.filter((_, i) => i !== pIdx);
                                                                                handleUpdateMCQ(node, q.id, { metadata: { ...q.metadata, pairs: newPairs } });
                                                                            }}
                                                                            className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                                                                        >
                                                                            <Trash2 size={12} />
                                                                        </button>
                                                                    </div>
                                                                );
                                                            })}
                                                            <button
                                                                onClick={() => {
                                                                    const pairs = q.metadata?.pairs || [];
                                                                    const newPairs = [...pairs, { left: '', right: '' }];
                                                                    handleUpdateMCQ(node, q.id, { metadata: { ...q.metadata, pairs: newPairs } });
                                                                }}
                                                                className="w-full py-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all"
                                                            >
                                                                + Add Pair
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        [0, 1, 2, 3, 4, 5].slice(0, Math.max(q.mcq_options?.length || 0, q.question_type === 'boolean' ? 2 : 3)).map((oIdx) => {
                                                            const opt = q.mcq_options?.find(o => o.order_index === oIdx) || {};
                                                            if (q.question_type === 'boolean' && !opt.option_text) {
                                                                opt.option_text = oIdx === 0 ? 'হ্যাঁ' : 'না';
                                                            }
                                                            return (
                                                                <div className="space-y-3">
                                                                    {[0, 1, 2, 3, 4, 5, 6, 7].slice(0, Math.max(q.mcq_options?.length || 0, q.question_type === 'boolean' ? 2 : 3)).map((oIdx) => {
                                                                        const opt = q.mcq_options?.find(o => o.order_index === oIdx) || {};
                                                                        if (q.question_type === 'boolean' && !opt.option_text) {
                                                                            opt.option_text = oIdx === 0 ? 'হ্যাঁ' : 'না';
                                                                        }
                                                                        return (
                                                                            <div
                                                                                key={oIdx}
                                                                                className={cn(
                                                                                    "group relative flex items-center gap-4 p-5 rounded-3xl border-2 transition-all duration-400 cursor-pointer overflow-hidden",
                                                                                    opt.is_correct
                                                                                        ? "border-emerald-500 bg-emerald-50/5 dark:bg-emerald-500/5 shadow-xl shadow-emerald-500/10"
                                                                                        : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-600"
                                                                                )}
                                                                                onClick={() => handleUpdateOption(node, q.id, oIdx, opt.option_text || '', !opt.is_correct)}
                                                                            >
                                                                                {opt.is_correct && (
                                                                                    <div className="absolute top-0 right-0 pt-1.5 pr-4">
                                                                                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-bl-lg">Correct</span>
                                                                                    </div>
                                                                                )}
                                                                                <div className={cn(
                                                                                    "w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 flex-shrink-0",
                                                                                    opt.is_correct ? "bg-emerald-500 text-white scale-110 shadow-lg" : "bg-slate-100 dark:bg-slate-800 text-slate-300"
                                                                                )}>
                                                                                    {opt.is_correct ? <CheckCircle2 size={20} /> : <span className="text-xs font-black">{oIdx + 1}</span>}
                                                                                </div>
                                                                                <div className="flex-1 flex items-center gap-2">
                                                                                    <input
                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                        readOnly={q.question_type === 'boolean'}
                                                                                        className={cn(
                                                                                            "bg-transparent border-none p-0 text-sm font-bold w-full outline-none placeholder:text-slate-300 dark:placeholder:text-slate-700 text-slate-900 dark:text-slate-100",
                                                                                            q.question_type === 'boolean' && "cursor-default"
                                                                                        )}
                                                                                        placeholder={`Option ${oIdx + 1}...`}
                                                                                        value={opt.option_text || ''}
                                                                                        onChange={() => { }} // Controlled by blur for others
                                                                                        onBlur={(e) => q.question_type !== 'boolean' && handleUpdateOption(node, q.id, oIdx, e.target.value)}
                                                                                    />
                                                                                    {q.question_type !== 'boolean' && (
                                                                                        <button
                                                                                            onClick={async (e) => {
                                                                                                e.stopPropagation();
                                                                                                const isConfirmed = window.confirm('Delete this option?');
                                                                                                if (!isConfirmed) return;
                                                                                                const newOptions = (q.mcq_options || []).filter(o => o.order_index !== oIdx);
                                                                                                const saved = await courseService.saveOptions(q.id, newOptions);
                                                                                                setNodes(nodes.map(n => n.id === node.id ? {
                                                                                                    ...n,
                                                                                                    mcq_questions: n.mcq_questions.map(mq => mq.id === q.id ? { ...mq, mcq_options: saved } : mq)
                                                                                                } : n));
                                                                                            }}
                                                                                            className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                                                        >
                                                                                            <Trash2 size={14} />
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                    {q.question_type !== 'boolean' && (
                                                                        <button
                                                                            onClick={() => handleUpdateOption(node, q.id, (q.mcq_options?.length || 0), '', false)}
                                                                            className="w-full py-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all"
                                                                        >
                                                                            + Add Option
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {node.type === 'storytelling' && (
                                    <button
                                        onClick={() => handleAddQuestion(node)}
                                        className="w-full py-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 transition-all flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest"
                                    >
                                        <Plus size={16} /> Add Another Question & Dialogue
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ))}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                    onClick={() => handleAddNode('standard')}
                    className="py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem] text-slate-400 dark:text-slate-600 font-black hover:bg-white dark:hover:bg-slate-900 hover:border-slate-900 dark:hover:border-slate-100 hover:text-slate-900 dark:hover:text-slate-100 transition-all flex flex-col items-center justify-center gap-4 group bg-slate-50/30 dark:bg-slate-900/10"
                >
                    <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-100 dark:border-slate-800 shadow-sm group-hover:scale-110 transition-transform">
                        <Plus size={32} />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-sm uppercase tracking-[0.2em]">Deploy Knowledge Segment</span>
                        <span className="text-[9px] font-bold text-slate-300 dark:text-slate-700 uppercase tracking-widest">Context + MCQ Configuration</span>
                    </div>
                </button>

                <button
                    onClick={() => handleAddNode('storytelling')}
                    className="py-12 border-2 border-dashed border-amber-200 dark:border-amber-900/30 rounded-[2.5rem] text-amber-600/60 dark:text-amber-500/40 font-black hover:bg-amber-50 dark:hover:bg-amber-900/10 hover:border-amber-500 dark:hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-500 transition-all flex flex-col items-center justify-center gap-4 group bg-amber-50/30 dark:bg-amber-950/5"
                >
                    <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center border border-amber-100 dark:border-amber-900/20 shadow-sm group-hover:scale-110 transition-transform">
                        <MessageSquare size={32} className="text-amber-500" />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-sm uppercase tracking-[0.2em] text-amber-600 dark:text-amber-500">Deploy Storytelling Scenario</span>
                        <span className="text-[9px] font-bold text-amber-400 dark:text-amber-700 uppercase tracking-widest">Character Dialogue + MCQ</span>
                    </div>
                </button>
            </div>
        </div>
    );
};

export default LearningPointSection;
