import React, { useState, useEffect } from 'react';
import { 
    Tag, 
    Plus, 
    Trash2, 
    Edit, 
    Check, 
    X,
    Calendar,
    Percent,
    Banknote,
    Loader2,
    Search,
    Filter
} from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';

const PromoCodeManager = () => {
    const [promoCodes, setPromoCodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        code: '',
        discount_type: 'percentage',
        discount_value: '',
        min_purchase: 0,
        max_discount_amount: '',
        valid_until: '',
        usage_limit: '',
        is_active: true
    });

    useEffect(() => {
        fetchPromoCodes();
    }, []);

    const fetchPromoCodes = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('promo_codes')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPromoCodes(data || []);
        } catch (err) {
            console.error('Error fetching promo codes:', err);
            toast.error('Failed to load promo codes');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const payload = {
            ...formData,
            discount_value: parseFloat(formData.discount_value),
            min_purchase: parseFloat(formData.min_purchase) || 0,
            max_discount_amount: formData.max_discount_amount ? parseFloat(formData.max_discount_amount) : null,
            usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
            valid_until: formData.valid_until || null,
            code: formData.code.toUpperCase().trim()
        };

        try {
            if (editingId) {
                const { error } = await supabase
                    .from('promo_codes')
                    .update(payload)
                    .eq('id', editingId);
                if (error) throw error;
                toast.success('Promo code updated');
            } else {
                const { error } = await supabase
                    .from('promo_codes')
                    .insert([payload]);
                if (error) throw error;
                toast.success('Promo code created');
            }
            setIsAdding(false);
            setEditingId(null);
            setFormData({
                code: '',
                discount_type: 'percentage',
                discount_value: '',
                min_purchase: 0,
                max_discount_amount: '',
                valid_until: '',
                usage_limit: '',
                is_active: true
            });
            fetchPromoCodes();
        } catch (err) {
            console.error('Error saving promo code:', err);
            toast.error(err.message || 'Failed to save promo code');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this promo code?')) return;
        try {
            const { error } = await supabase
                .from('promo_codes')
                .delete()
                .eq('id', id);
            if (error) throw error;
            toast.success('Promo code deleted');
            fetchPromoCodes();
        } catch (err) {
            console.error('Error deleting promo code:', err);
            toast.error('Failed to delete promo code');
        }
    };

    const handleToggleActive = async (id, currentStatus) => {
        try {
            const { error } = await supabase
                .from('promo_codes')
                .update({ is_active: !currentStatus })
                .eq('id', id);
            if (error) throw error;
            fetchPromoCodes();
        } catch (err) {
            console.error('Error toggling status:', err);
            toast.error('Failed to update status');
        }
    };

    const startEdit = (code) => {
        setFormData({
            code: code.code,
            discount_type: code.discount_type,
            discount_value: code.discount_value,
            min_purchase: code.min_purchase,
            max_discount_amount: code.max_discount_amount || '',
            valid_until: code.valid_until ? new Date(code.valid_until).toISOString().split('T')[0] : '',
            usage_limit: code.usage_limit || '',
            is_active: code.is_active
        });
        setEditingId(code.id);
        setIsAdding(true);
    };

    const filteredCodes = promoCodes.filter(c => 
        c.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Tag className="text-blue-500" />
                        Promo Codes
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Manage discounts and seasonal offers</p>
                </div>
                <button 
                    onClick={() => { setIsAdding(!isAdding); setEditingId(null); }}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-blue-500/20"
                >
                    {isAdding ? <X size={18} /> : <Plus size={18} />}
                    {isAdding ? 'Cancel' : 'Create New Code'}
                </button>
            </div>

            {isAdding && (
                <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 animate-in fade-in slide-in-from-top-4 duration-300">
                    <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Promo Code</label>
                            <input 
                                type="text"
                                value={formData.code}
                                onChange={e => setFormData({...formData, code: e.target.value})}
                                placeholder="E.G. RAMADAN20"
                                required
                                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 transition-all uppercase"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Type</label>
                                <select 
                                    value={formData.discount_type}
                                    onChange={e => setFormData({...formData, discount_type: e.target.value})}
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="percentage">Percentage (%)</option>
                                    <option value="fixed">Fixed (৳)</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Value</label>
                                <input 
                                    type="number"
                                    value={formData.discount_value}
                                    onChange={e => setFormData({...formData, discount_value: e.target.value})}
                                    placeholder={formData.discount_type === 'percentage' ? '20' : '50'}
                                    required
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Min. Purchase (৳)</label>
                                <input 
                                    type="number"
                                    value={formData.min_purchase}
                                    onChange={e => setFormData({...formData, min_purchase: e.target.value})}
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Max Discount (৳)</label>
                                <input 
                                    type="number"
                                    value={formData.max_discount_amount}
                                    onChange={e => setFormData({...formData, max_discount_amount: e.target.value})}
                                    disabled={formData.discount_type === 'fixed'}
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Expiry Date</label>
                                <input 
                                    type="date"
                                    value={formData.valid_until}
                                    onChange={e => setFormData({...formData, valid_until: e.target.value})}
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Usage Limit</label>
                                <input 
                                    type="number"
                                    value={formData.usage_limit}
                                    onChange={e => setFormData({...formData, usage_limit: e.target.value})}
                                    placeholder="Empty for unlimited"
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="md:col-span-2 flex justify-end gap-3 pt-4">
                            <button 
                                type="button"
                                onClick={() => { setIsAdding(false); setEditingId(null); }}
                                className="px-6 py-2 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-8 py-2 rounded-xl text-sm font-bold shadow-lg"
                            >
                                {editingId ? 'Update Code' : 'Save Code'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                    <Search className="text-slate-400" size={18} />
                    <input 
                        type="text" 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search codes..."
                        className="bg-transparent border-none text-sm focus:ring-0 w-full"
                    />
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase tracking-wider font-bold text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
                                <th className="px-6 py-4">Code</th>
                                <th className="px-6 py-4">Discount</th>
                                <th className="px-6 py-4">Rules</th>
                                <th className="px-6 py-4">Stats</th>
                                <th className="px-6 py-4">Valid Until</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-20 text-center">
                                        <Loader2 className="mx-auto animate-spin text-blue-500 mb-2" size={32} />
                                        <p className="text-sm text-slate-500">Loading promo codes...</p>
                                    </td>
                                </tr>
                            ) : filteredCodes.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-20 text-center">
                                        <div className="text-slate-400 dark:text-slate-600 mb-2 font-bold text-lg">No Promo Codes Found</div>
                                        <p className="text-sm text-slate-500">Create your first promo code to get started.</p>
                                    </td>
                                </tr>
                            ) : filteredCodes.map((code) => (
                                <tr key={code.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{code.code}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 font-bold text-blue-600 dark:text-blue-400">
                                            {code.discount_type === 'percentage' ? <Percent size={14} /> : <Banknote size={14} />}
                                            <span>{code.discount_value}{code.discount_type === 'percentage' ? '%' : ' ৳'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">Min Spend: ৳{code.min_purchase}</p>
                                            {code.max_discount_amount && (
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">Max Dist: ৳{code.max_discount_amount}</p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs font-medium">
                                            <span className="text-blue-500 font-bold">{code.usage_count}</span>
                                            <span className="text-slate-400"> / {code.usage_limit || '∞'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-medium">
                                            <Calendar size={14} />
                                            {code.valid_until ? new Date(code.valid_until).toLocaleDateString() : 'Never Ends'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button 
                                            onClick={() => handleToggleActive(code.id, code.is_active)}
                                            className={cn(
                                                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all",
                                                code.is_active 
                                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                                                    : "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20"
                                            )}
                                        >
                                            {code.is_active ? 'Active' : 'Paused'}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => startEdit(code)}
                                                className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-all"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(code.id)}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
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
            </div>
        </div>
    );
};

export default PromoCodeManager;
