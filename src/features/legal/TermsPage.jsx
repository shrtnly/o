import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

const TermsPage = () => {
    const navigate = useNavigate();

    return (
        <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px', color: 'var(--color-text)' }}>
            <button
                onClick={() => navigate(-1)}
                style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', marginBottom: '20px', padding: 0 }}
            >
                <ChevronLeft size={20} />
                <span>ফিরে যান</span>
            </button>
            <h1 style={{ color: 'var(--color-primary)', marginBottom: '24px' }}>টার্মস এবং কন্ডিশনস</h1>
            <div style={{ lineHeight: '1.6' }}>
                <p>BeeLesson এ আপনাকে স্বাগতম। আমাদের সেবা ব্যবহার করার মাধ্যমে আপনি নিম্নলিখিত শর্তাবলীতে সম্মত হচ্ছেন:</p>
                <h3 style={{ marginTop: '20px' }}>1. অ্যাকাউন্ট তৈরি</h3>
                <p>সেবাটি ব্যবহারের জন্য আপনাকে সঠিক তথ্য দিয়ে একটি অ্যাকাউন্ট তৈরি করতে হবে। আপনার অ্যাকাউন্টের তথ্যের গোপনীয়তা রক্ষার দায়িত্ব আপনার।</p>
                <h3 style={{ marginTop: '20px' }}>2. সেবার ব্যবহার</h3>
                <p>আপনি শুধুমাত্র বৈধ এবং শিক্ষামূলক উদ্দেশ্যে BeeLesson ব্যবহার করতে পারবেন। কোনো ধরনের অবৈধ কর্মকাণ্ডে এই প্ল্যাটফর্ম ব্যবহার করা নিষিদ্ধ।</p>
                <h3 style={{ marginTop: '20px' }}>3. মেধা সম্পদ</h3>
                <p>এই প্ল্যাটফর্মের সকল কন্টেন্ট (ভিডিও, টেক্সট, ইমেজ) BeeLesson এর সম্পদ। অনুমতি ছাড়া এগুলো কপি বা শেয়ার করা আইনত দণ্ডনীয় অপরাধ।</p>
                <h3 style={{ marginTop: '20px' }}>4. পরিবর্তন</h3>
                <p>আমরা যেকোনো সময় এই শর্তাবলী পরিবর্তন করার অধিকার রাখি। পরিবর্তনের পর সেবাটি চালিয়ে যাওয়া মানে আপনি নতুন শর্তাবলীতে সম্মত।</p>
            </div>
        </div>
    );
};

export default TermsPage;
