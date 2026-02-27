import React, { useState, useEffect } from 'react';
import { Plus, Trash2, User, UserCircle, MessageCircle } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { createAvatar } from '@dicebear/core';
import { lorelei } from '@dicebear/collection';

const CHARACTERS = [
    { id: 'rakib', name: 'Rakib (Male)', label: 'রাকিব', color: 'blue', seed: 'Emery' },
    { id: 'lisa', name: 'Lisa (Female)', label: 'লিসা', color: 'rose', seed: 'Eliza' },
    { id: 'assistant', name: 'AI Assistant', label: 'সহকারী', color: 'emerald', seed: 'Eden' },
    { id: 'andrea', name: 'Andrea', label: 'আন্দ্রেয়া', color: 'amber', seed: 'Andrea' }
];

const AvatarPreview = ({ seed, className }) => {
    const avatar = createAvatar(lorelei, {
        seed: seed,
        backgroundType: ["transparent"]
    });

    return (
        <div
            className={className}
            dangerouslySetInnerHTML={{ __html: avatar.toString() }}
        />
    );
};

const StorytellingManager = ({ content, onUpdate }) => {
    const [dialogues, setDialogues] = useState(() => {
        try {
            return JSON.parse(content || '[]');
        } catch (e) {
            return [];
        }
    });

    const handleAddDialogue = () => {
        const newList = [...dialogues, { avatar: 'rakib', text: '' }];
        setDialogues(newList);
        onUpdate(JSON.stringify(newList));
    };

    const handleUpdateDialogue = (idx, updates) => {
        const newList = [...dialogues];
        newList[idx] = { ...newList[idx], ...updates };
        setDialogues(newList);
        onUpdate(JSON.stringify(newList));
    };

    const handleRemoveDialogue = (idx) => {
        const newList = dialogues.filter((_, i) => i !== idx);
        setDialogues(newList);
        onUpdate(JSON.stringify(newList));
    };

    return (
        <div className="space-y-4">
            <div className="space-y-3">
                {dialogues.map((dialogue, idx) => (
                    <div key={idx} className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 rounded-2xl group transition-all">
                        <div className="flex flex-col gap-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Avatar</label>
                            <div className="flex flex-col gap-1">
                                {CHARACTERS.map(char => {
                                    return (
                                        <button
                                            key={char.id}
                                            onClick={() => handleUpdateDialogue(idx, { avatar: char.id })}
                                            className={cn(
                                                "w-10 h-10 rounded-full flex items-center justify-center transition-all border",
                                                dialogue.avatar === char.id
                                                    ? "border-blue-500"
                                                    : "border-transparent hover:bg-slate-100 dark:hover:bg-slate-800"
                                            )}
                                            title={char.name}
                                        >
                                            <AvatarPreview seed={char.seed} className="w-8 h-8" />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <MessageCircle size={10} />
                                    {CHARACTERS.find(c => c.id === dialogue.avatar)?.label || 'Speaker'} Speech
                                </label>
                                <button
                                    onClick={() => handleRemoveDialogue(idx)}
                                    className="p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                            <textarea
                                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none min-h-[60px]"
                                value={dialogue.text}
                                onChange={(e) => handleUpdateDialogue(idx, { text: e.target.value })}
                                placeholder="Enter what this character says..."
                            />
                        </div>
                    </div>
                ))}
            </div>

            <button
                onClick={handleAddDialogue}
                className="w-full py-3 flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all font-bold text-xs uppercase"
            >
                <Plus size={14} /> Add Dialogue Line
            </button>
        </div>
    );
};

export default StorytellingManager;
