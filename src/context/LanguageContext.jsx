import React, { createContext, useContext, useState, useEffect } from 'react';

const translations = {
    bn: {
        // Common
        settings: "সেটিংস",
        preferences: "প্রেফারেন্স",
        profile: "প্রোফাইল",
        notifications: "নোটিফিকেশন",
        courses: "কোর্স",
        privacy: "প্রাইভেসি",
        language: "ভাষা",
        dark_mode: "ডার্ক মুড",
        loading: "লোড হচ্ছে...",
        save: "সংরক্ষণ করুন",
        cancel: "বাতিল",
        confirm: "নিশ্চিত",
        reset: "রিসেট",
        login: "লগইন",
        signup: "সাইন আপ",
        logout: "লগআউট",
        error_fetch_courses: "কোর্স তালিকা লোড করতে সমস্যা হয়েছে",
        reset_course: "কোর্স রিসেট",
        confirm_reset_msg: "আপনি কি নিশ্চিত যে এই কোর্সের সকল প্রগতি মুছে ফেলতে চান?",
        irreversible: "এটি আর ফিরিয়ে আনা সম্ভব নয়।",

        // Settings
        pref_settings: "প্রেফারেন্স সেটিংস",
        pref_desc: "আপনার ব্যক্তিগত ব্যবহারের অভিজ্ঞতা কাস্টমাইজ করুন",
        dark_mode_desc: "চোখের আরামের জন্য কালো থিম ব্যবহার করুন",
        study_anim: "স্টাডি পেজ অ্যানিমেশন",
        study_anim_desc: "আপনার পছন্দের মৌমাছি অ্যানিমেশন নির্বাচন করুন",
        lang_desc: "আপনার পছন্দের ভাষা নির্বাচন করুন",

        profile_settings: "প্রোফাইল সেটিংস",
        profile_desc: "আপনার ব্যক্তিগত তথ্য এবং প্রোফাইল দৃশ্যমানতা পরিচালনা করুন",
        public_profile: "পাবলিক প্রোফাইল",
        public_profile_desc: "অন্যান্য ব্যবহারকারীরা আপনার শেখার অগ্রগতি দেখতে পারবে",
        change_pic: "পরিবর্তন",
        // Profile
        change_cover: "কভার পরিবর্তন করুন",
        current_streak: "বর্তমান স্ট্রিক",
        days: "দিন",
        learner: "শিক্ষার্থী",
        welcome_tagline: "শেখার যাত্রায় আপনাকে স্বাগতম",
        joined: "যোগদান",
        earned_shield: "অর্জিত শিল্ড",
        level: "লেভেল",
        efficiency: "নির্ভুলতা",
        my_courses: "আমার কোর্সসমূহ",
        see_all: "সবগুলো দেখুন",
        progress: "অগ্রগতি",
        chapters: "অধ্যায়",
        start_course: "কোর্স শুরু করুন",
        recent_activity: "সাম্প্রতিক কার্যকলাপ",
        practice_xp: "অনুশীলন সম্পন্ন করে XP পেয়েছেন",
        reward_gems: "পুরস্কারস্বরূপ জেম পেয়েছেন",
        lost_hearts: "ভুল উত্তরের জন্য হার্ট হারিয়েছেন",
        refilled_hearts: "হার্ট রিফিল হয়েছে",
        no_activity: "কোনো কার্যকলাপের রেকর্ড পাওয়া যায়নি।",
        edit_profile: "প্রোফাইল সম্পাদন করুন",
        full_name: "পুরো নাম",
        designation: "পদবী",
        dept: "বিভাগ/দপ্তর",
        bio: "আপনার সম্পর্কে",
        location: "অবস্থান",
        update_error: "প্রোফাইল আপডেট করতে সমস্যা হয়েছে।",
        confirm_logout_msg: "আপনি কি নিশ্চিত যে লগআউট করতে চান?",

        notif_settings: "নোটিফিকেশন সেটিংস",
        notif_desc: "আপনি কিভাবে আপডেট এবং স্মরণিকা পাবেন তা নিয়ন্ত্রণ করুন",
        push_notif: "পুশ নোটিফিকেশন",
        push_notif_desc: "আপনার মোবাইল বা ব্রাউজারে সরাসরি আপডেট পান",
        email_notif: "ইমেল নোটিফিকেশন",
        email_notif_desc: "সাপ্তাহিক প্রগতি রিপোর্ট এবং গুরুত্বপূর্ণ আপডেট পান",

        course_settings: "কোর্স সেটিংস",
        course_settings_desc: "আপনার এনরোল করা কোর্সসমূহ পরিচালনা করুন",
        completed: "সম্পন্ন",
        no_courses: "কোনো কোর্স পাওয়া যায়নি",
        no_courses_desc: "আপনি এখনও কোনো কোর্সে এনরোল করেননি।",
        warning_reset: "সতর্কতা: প্রগতি রিসেট বা কোর্স ডিলিট করলে তা আর পুনরুদ্ধার করা সম্ভব নয়।",

        // Shop
        shop_title: "বী-লেসন শপ",
        shop_subtitle: "আপনার শেখার অভিজ্ঞতাকে আরও সমৃদ্ধ করুন",
        super_membership: "সুপার মেম্বারশিপ",
        super_desc: "আপনি এখন আনলিমিটেড হার্ট এবং অ্যাড-ফ্রি অভিজ্ঞতা উপভোগ করছেন।",
        active_super: "সুপার সদস্যপদ সক্রিয়",
        unlimited_hearts: "আনলিমিটেড হার্টস",
        ad_free: "অ্যাড-ফ্রি লার্নিং",
        quick_progress: "দ্রুত প্রগ্রেস",
        special_badge: "স্পেশাল ব্যাজ",
        monthly: "মাসিক",
        yearly: "বার্ষিক",
        discount: "-২০%",
        gem_exchange: "জেম এক্সচেঞ্জ",
        exchange: "এক্সচেঞ্জ",
        gem_packs: "জেম প্যাক",
        popular: "জনপ্রিয়",
        best_value: "সেরা মূল্য",
        confirm_payment: "পেমেন্ট নিশ্চিত করুন",
        payment_desc: "আপনার অর্ডারটি সম্পন্ন করতে পেমেন্ট মেথড নির্বাচন করুন",
        order_summary: "অর্ডার সামারি",
        item: "আইটেম",
        total_price: "মোট মূল্য",
        pay_now: "পেমেন্ট সম্পন্ন করুন",
        insufficient_gems: "আপনার কাছে যথেষ্ট জেম নেই।",
        hearts_added: "টি নতুন হার্ট যোগ করা হয়েছে!",
        gems_added: "টি জেম যোগ করা হয়েছে!",
        congrats_premium: "অভিনন্দন! আপনি এখন সুপার সাবস্ক্রাইবার।",
        payment_failed: "পেমেন্ট সফল হয়নি। পুনরায় চেষ্টা করুন।",
        loading_shop: "লোড হচ্ছে...",

        // Gem Pack Labels
        gem_pocket: "জেম পকেট",
        gem_chest: "জেম চেস্ট",
        gem_cart: "জেম কার্ট",
        gem_vault: "জেম ভল্ট",

        // Navbar
        learn: "শিখুন",
        shop: "শপ",
        leaderboard: "লিডারবোর্ড",
        login_btn: "লগইন করুন",

        // Courses
        courses_title: "আপনার পছন্দের",
        courses_highlight: "কোর্সসমূহ",
        courses_suffix: "যুক্ত করুন",
        all_courses: "সব কোর্স",
        no_courses_cat: "এই ক্যাটাগরিতে কোনো কোর্স পাওয়া যায়নি।",

        // Categories
        cat_digital_security_literacy: "ডিজিটাল লিটারেসি ও নিরাপত্তা",
        cat_legal_rights: "আইনি সচেতনতা ও নাগরিক অধিকার",
        cat_finance_banking: "আর্থিক সচেতনতা ও স্মার্ট ব্যাংকিং",
        cat_career_skills: "ক্যারিয়ার ও দক্ষতা",
        cat_mental_health: "মানসিক স্বাস্থ্য ও আত্মউন্নয়ন",

        // Landing Page Generic
        proven_title: "বৈজ্ঞানিকভাবে প্রমাণিত",
        proven_desc: "আমাদের পাঠদান পদ্ধতি গবেষণালব্ধ এবং কার্যকর। প্রতিটি পাঠ ডিজাইন করা হয়েছে যাতে আপনি দ্রুত এবং আনন্দদায়ক উপায়ে শিখতে পারেন।",
        footer_copy: "২০২৪ BeeLesson. সকল স্বত্ব সংরক্ষিত।"
    },
    en: {
        // Common
        settings: "Settings",
        preferences: "Preferences",
        profile: "Profile",
        notifications: "Notifications",
        courses: "Courses",
        privacy: "Privacy",
        language: "Language",
        dark_mode: "Dark Mode",
        loading: "Loading...",
        save: "Save",
        cancel: "Cancel",
        confirm: "Confirm",
        reset: "Reset",
        login: "Login",
        signup: "Sign Up",
        logout: "Logout",
        error_fetch_courses: "Error loading course list",
        reset_course: "Reset Course",
        confirm_reset_msg: "Are you sure you want to delete all progress for this course?",
        irreversible: "This action cannot be undone.",

        // Settings
        pref_settings: "Preference Settings",
        pref_desc: "Customize your personal experience",
        dark_mode_desc: "Use dark theme for eye comfort",
        study_anim: "Study Page Animation",
        study_anim_desc: "Select your preferred bee animation",
        lang_desc: "Select your preferred language",

        profile_settings: "Profile Settings",
        profile_desc: "Manage your personal information and profile visibility",
        public_profile: "Public Profile",
        public_profile_desc: "Other users will be able to see your learning progress",
        change_pic: "Change",
        // Profile
        change_cover: "Change Cover",
        current_streak: "Current Streak",
        days: "Days",
        learner: "Learner",
        welcome_tagline: "Welcome to your learning journey",
        joined: "Joined",
        earned_shield: "Earned Shield",
        level: "Level",
        efficiency: "Efficiency",
        my_courses: "My Courses",
        see_all: "View All",
        progress: "Progress",
        chapters: "Chapters",
        start_course: "Start Course",
        recent_activity: "Recent Activity",
        practice_xp: "Earned XP by completing practice",
        reward_gems: "Received gems as reward",
        lost_hearts: "Lost hearts for wrong answer",
        refilled_hearts: "Hearts refilled",
        no_activity: "No activity records found.",
        edit_profile: "Edit Profile",
        full_name: "Full Name",
        designation: "Designation",
        dept: "Department",
        bio: "Bio",
        location: "Location",
        update_error: "Problem updating profile.",
        confirm_logout_msg: "Are you sure you want to logout?",

        notif_settings: "Notification Settings",
        // Courses
        courses_title: "Add your favorite",
        courses_highlight: "Courses",
        courses_suffix: "to your list",
        all_courses: "All Courses",
        no_courses_cat: "No courses found in this category.",

        // Categories
        cat_digital_security_literacy: "Digital Literacy & Security",
        cat_legal_rights: "Legal Awareness & Citizen Rights",
        cat_finance_banking: "Financial Awareness & Smart Banking",
        cat_career_skills: "Career & Skills",
        cat_mental_health: "Mental Health & Self-Development",

        notif_desc: "Control how you receive updates and reminders",
        push_notif: "Push Notifications",
        push_notif_desc: "Get updates directly on your mobile or browser",
        email_notif: "Email Notifications",
        email_notif_desc: "Get weekly progress reports and important updates",

        course_settings: "Course Settings",
        course_settings_desc: "Manage your enrolled courses",
        completed: "Completed",
        no_courses: "No courses found",
        no_courses_desc: "You haven't enrolled in any courses yet.",
        warning_reset: "Warning: Resetting progress or deleting a course cannot be undone.",

        // Shop
        shop_title: "BeeLesson Shop",
        shop_subtitle: "Enrich your learning experience",
        super_membership: "Super Membership",
        super_desc: "You are now enjoying unlimited hearts and an ad-free experience.",
        active_super: "Super Membership Active",
        unlimited_hearts: "Unlimited Hearts",
        ad_free: "Ad-Free Learning",
        quick_progress: "Quick Progress",
        special_badge: "Special Badge",
        monthly: "Monthly",
        yearly: "Yearly",
        discount: "-20%",
        gem_exchange: "Gem Exchange",
        exchange: "Exchange",
        gem_packs: "Gem Packs",
        popular: "Popular",
        best_value: "Best Value",
        confirm_payment: "Confirm Payment",
        payment_desc: "Select a payment method to complete your order",
        order_summary: "Order Summary",
        item: "Item",
        total_price: "Total Price",
        pay_now: "Complete Payment",
        insufficient_gems: "You don't have enough gems.",
        hearts_added: " new hearts have been added!",
        gems_added: " gems have been added!",
        congrats_premium: "Congratulations! You are now a Super subscriber.",
        payment_failed: "Payment failed. Please try again.",
        loading_shop: "Loading...",

        // Gem Pack Labels
        gem_pocket: "Gem Pocket",
        gem_chest: "Gem Chest",
        gem_cart: "Gem Cart",
        gem_vault: "Gem Vault",

        // Navbar
        learn: "Learn",
        shop: "Shop",
        leaderboard: "Leaderboard",
        login_btn: "Login",

        // Hero
        hero_badge: "Short on time, big on interest?",
        hero_title_br: "Learn Easily and Free",
        hero_highlight: "The Attractive Way to Get Skilled!",
        hero_description: "Keep learning whenever and wherever you want — in an easy, fun, and effective way.",
        start_learning: "Start Learning",

        // Landing Page Generic
        proven_title: "Scientifically Proven",
        proven_desc: "Our teaching methods are research-based and effective. Each lesson is designed so you can learn quickly and in an enjoyable way.",
        footer_copy: "2024 BeeLesson. All rights reserved."
    }
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState(() => {
        const saved = localStorage.getItem('language');
        return saved || 'bn';
    });

    useEffect(() => {
        localStorage.setItem('language', language);
        // Force document language attribute update
        document.documentElement.lang = language;
    }, [language]);

    const t = (key) => {
        return translations[language][key] || key;
    };

    const toggleLanguage = () => {
        setLanguage(prev => prev === 'bn' ? 'en' : 'bn');
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
