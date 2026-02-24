import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

const PrivacyPage = () => {
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
            <h1 style={{ color: 'var(--color-primary)', marginBottom: '24px' }}>প্রাইভেসি পলিসি</h1>
            <div style={{ lineHeight: '1.6' }}>
                <p>BeeLesson আপনার গোপনীয়তাকে গুরুত্ব দেয়। আমরা কীভাবে আপনার তথ্য সংগ্রহ এবং ব্যবহার করি তা নিচে দেওয়া হলো:</p>
                <h3 style={{ marginTop: '20px' }}>১. তথ্য সংগ্রহ</h3>
                <p>আমরা আপনার নাম, ইমেইল, লিঙ্গ এবং অবস্থান সংগ্রহ করি যখন আপনি সাইন আপ করেন। এছাড়া আপনার কোর্সের অগ্রগতি এবং অ্যাপ ব্যবহারের তথ্যও সংরক্ষিত হয়।</p>
                <h3 style={{ marginTop: '20px' }}>২. তথ্যের ব্যবহার</h3>
                <p>আপনার শেখার অভিজ্ঞতা উন্নত করতে, নতুন কোর্সের আপডেট দিতে এবং অ্যাপের সিকিউরিটি নিশ্চিত করতে আমরা এই তথ্যগুলো ব্যবহার করি।</p>
                <h3 style={{ marginTop: '20px' }}>৩. ডাটা সিকিউরিটি</h3>
                <p>আমরা সর্বাধুনিক প্রযুক্তি ব্যবহার করে আপনার ব্যক্তিগত তথ্য সুরক্ষিত রাখি। আপনার অনুমতি ছাড়া আমরা কোনো তৃতীয় পক্ষের কাছে আপনার তথ্য বিক্রি বা শেয়ার করি না।</p>
                <h3 style={{ marginTop: '20px' }}>৪. আপনার নিয়ন্ত্রণ</h3>
                <p>আপনি যেকোনো সময় আপনার প্রোফাইল তথ্য আপডেট করতে পারেন অথবা আপনার অ্যাকাউন্ট ডিলিট করার অনুরোধ জানাতে পারেন।</p>
            </div>
        </div>
    );
};

export default PrivacyPage;
