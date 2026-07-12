import React, { useState, useEffect } from 'react';
import { 
    CreditCard, 
    Search, 
    Filter, 
    Loader2, 
    Calendar,
    User
} from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';

const PaymentManager = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [updatingId, setUpdatingId] = useState(null);

    useEffect(() => {
        fetchPayments();
    }, []);

    const fetchPayments = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('Payment')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPayments(data || []);
        } catch (err) {
            console.error('Error fetching payments:', err);
            toast.error('Failed to load payments');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (paymentId, newStatus, payment) => {
        if (!confirm(`Are you sure you want to change status to "${newStatus}"?`)) {
            return;
        }

        setUpdatingId(paymentId);
        const toastId = toast.loading(`Updating status to ${newStatus}...`);

        try {
            // If approving, activate the subscription/recharge directly in profile
            if (newStatus === 'approved' && payment.status !== 'approved') {
                const plan = payment.plan_type;
                
                // Fetch current user profile first to calculate correct expiry date
                const { data: profile, error: profileErr } = await supabase
                    .from('profiles')
                    .select('is_1day_premium, one_day_premium_until, is_premium, premium_until')
                    .eq('id', payment.user_id)
                    .single();

                if (profileErr) throw new Error(`Could not fetch user profile: ${profileErr.message}`);

                const now = new Date();

                if (plan === '1day' || plan === '10day') {
                    // Calculate 10-day active premium expiry
                    let currentExpiry = profile.one_day_premium_until ? new Date(profile.one_day_premium_until) : null;
                    let newExpiry;
                    if (profile.is_1day_premium && currentExpiry && currentExpiry > now) {
                        newExpiry = new Date(currentExpiry.getTime() + 10 * 24 * 60 * 60 * 1000);
                    } else {
                        newExpiry = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
                    }

                    // Update user profile directly
                    const { error: updateErr } = await supabase
                        .from('profiles')
                        .update({
                            is_1day_premium: true,
                            one_day_premium_until: newExpiry.toISOString()
                        })
                        .eq('id', payment.user_id);

                    if (updateErr) throw new Error(`Failed to activate premium: ${updateErr.message}`);

                    // Send real-time notification
                    await supabase.from('notifications').insert({
                        user_id: payment.user_id,
                        actor_id: payment.user_id,
                        title: 'বি প্রিমিয়াম সক্রিয়!',
                        message: 'আপনার বি প্রিমিয়াম (১০ দিন) মেম্বারশিপ সক্রিয় করা হয়েছে। ১০ দিন আনলিমিটেড হানি ড্রপ উপভোগ করুন!',
                        type: 'unlock',
                        is_read: false,
                        data: {
                            type: 'subscription_approved',
                            display_title: 'বি প্রিমিয়াম সক্রিয়! 🎉',
                            display_msg: '১০ দিন আনলিমিটেড হানি ড্রপ উপভোগ করুন!'
                        }
                    });

                    toast.success('Bee Premium (10-Day) subscription activated for user!');

                } else if (plan === 'monthly' || plan === 'yearly') {
                    // Calculate membership expiry (monthly = 30 days, yearly = 365 days)
                    const daysToAdd = plan === 'monthly' ? 30 : 365;
                    let currentExpiry = profile.premium_until ? new Date(profile.premium_until) : null;
                    let newExpiry;
                    if (profile.is_premium && currentExpiry && currentExpiry > now) {
                        newExpiry = new Date(currentExpiry.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
                    } else {
                        newExpiry = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
                    }

                    // Update user profile directly
                    const { error: updateErr } = await supabase
                        .from('profiles')
                        .update({
                            is_premium: true,
                            premium_until: newExpiry.toISOString(),
                            premium_status: 'active'
                        })
                        .eq('id', payment.user_id);

                    if (updateErr) throw new Error(`Failed to activate subscription: ${updateErr.message}`);

                    // Send real-time notification
                    await supabase.from('notifications').insert({
                        user_id: payment.user_id,
                        actor_id: payment.user_id,
                        title: 'সুপার বি সক্রিয়!',
                        message: `আপনার সুপার বি (${plan === 'monthly' ? 'মাসিক' : 'বাৎসরিক'}) মেম্বারশিপ সক্রিয় করা হয়েছে।`,
                        type: 'unlock',
                        is_read: false,
                        data: {
                            type: 'subscription_approved',
                            display_title: 'সুপার বি সক্রিয়! 👑',
                            display_msg: `সুপার বি (${plan === 'monthly' ? 'মাসিক' : 'বাৎসরিক'}) মেম্বারশিপ সক্রিয়!`
                        }
                    });

                    toast.success(`Super Bee (${plan}) subscription activated for user!`);
                }
            }

            // Update status in public.Payment table
            const { error } = await supabase
                .from('Payment')
                .update({ status: newStatus })
                .eq('id', paymentId);

            if (error) throw error;

            toast.success('Payment status updated successfully', { id: toastId });
            fetchPayments();
        } catch (err) {
            console.error('Error updating payment status:', err);
            toast.error(`Failed to update status: ${err.message || 'Unknown error'}`, { id: toastId });
        } finally {
            setUpdatingId(null);
        }
    };

    const formatPlanType = (type) => {
        if (type === '1day' || type === '10day') return '10 day';
        if (type === 'monthly') return 'Monthly';
        if (type === 'yearly') return 'Yearly';
        return type;
    };

    const filteredPayments = payments.filter(p => {
        const matchesSearch = 
            (p.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.transaction_id || '').toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
        
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-slate-900 dark:text-slate-100 font-sans">
                        <CreditCard className="text-blue-500" size={24} />
                        Payment Management
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-sans">
                        Review, approve, or reject learner manual payments.
                    </p>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row gap-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 font-sans">
                <div className="flex-1 relative flex items-center bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3">
                    <Search className="text-slate-400 mr-2" size={18} />
                    <input 
                        type="text" 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search by Email or Transaction ID..."
                        className="bg-transparent border-none text-sm focus:ring-0 w-full py-2.5 focus:outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400"
                    />
                </div>

                <div className="flex items-center gap-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3">
                    <Filter className="text-slate-400" size={16} />
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="bg-transparent border-none text-sm focus:ring-0 py-2.5 focus:outline-none font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                        <option value="all">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>
            </div>

            {/* Payments Table */}
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm font-sans">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase tracking-wider font-bold text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
                                <th className="px-6 py-4">User Email</th>
                                <th className="px-6 py-4">Plan Type</th>
                                <th className="px-6 py-4">Transaction ID</th>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4">Submitted Date</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-20 text-center">
                                        <Loader2 className="mx-auto animate-spin text-blue-500 mb-2" size={32} />
                                        <p className="text-sm text-slate-500">Loading payments...</p>
                                    </td>
                                </tr>
                            ) : filteredPayments.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-20 text-center">
                                        <div className="text-slate-400 dark:text-slate-600 mb-2 font-bold text-lg">No Payments Found</div>
                                        <p className="text-sm text-slate-500">No payment requests match your criteria.</p>
                                    </td>
                                </tr>
                            ) : filteredPayments.map((payment) => (
                                <tr key={payment.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
                                                <User size={14} />
                                            </div>
                                            <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">{payment.email}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider",
                                            (payment.plan_type === '1day' || payment.plan_type === '10day') 
                                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
                                                : "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400"
                                        )}>
                                            {formatPlanType(payment.plan_type)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-mono text-xs font-medium text-slate-600 dark:text-slate-400">{payment.transaction_id}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200 text-sm">
                                            <span>৳{payment.amount}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                                            <Calendar size={12} />
                                            <span>{new Date(payment.created_at).toLocaleString()}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <select
                                            value={payment.status}
                                            onChange={(e) => handleStatusChange(payment.id, e.target.value, payment)}
                                            disabled={updatingId === payment.id}
                                            className={cn(
                                                "text-xs font-bold rounded-lg px-2.5 py-1.5 focus:ring-0 focus:outline-none cursor-pointer border transition-colors",
                                                payment.status === 'approved' && "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50",
                                                payment.status === 'pending' && "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50",
                                                payment.status === 'rejected' && "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50"
                                            )}
                                        >
                                            <option value="pending" className="bg-white dark:bg-slate-900 text-amber-700 font-sans">Pending</option>
                                            <option value="approved" className="bg-white dark:bg-slate-900 text-emerald-700 font-sans">Approved</option>
                                            <option value="rejected" className="bg-white dark:bg-slate-900 text-rose-700 font-sans">Rejected</option>
                                        </select>
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

export default PaymentManager;
