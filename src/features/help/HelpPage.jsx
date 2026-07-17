import React, { useState, useMemo } from 'react';
import { 
    Search, BookOpen, CreditCard, Wrench, Mail,
    ChevronDown, Zap, Globe, X, Swords
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './HelpPage.module.css';
import { useLanguage } from '../../context/LanguageContext'; // Assuming this path
import SEO from '../../components/SEO';

const HelpPage = () => {
    const { t, language } = useLanguage();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFaq, setActiveFaq] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);

    const categories = [
        { id: 'start', title: language === 'bn' ? 'শুরু করা' : 'Getting Started', icon: Zap, color: '#FFB800' },
        { id: 'course', title: language === 'bn' ? 'কোর্স ও সার্টিফিকেট' : 'Courses & Certificates', icon: BookOpen, color: '#3498db' },
        { id: 'battle', title: language === 'bn' ? 'ব্যাটেল চ্যালেঞ্জ' : 'Battle Challenge', icon: Swords, color: '#9b59b6' },
        { id: 'shop', title: language === 'bn' ? 'শপ ও মেম্বারশিপ' : 'Shop & Membership', icon: CreditCard, color: '#2ecc71' },
        { id: 'tech', title: language === 'bn' ? 'অ্যাকাউন্ট ও টেকনিক্যাল' : 'Account & Technical', icon: Wrench, color: '#e74c3c' }
    ];

    const faqs = [
        // শুরু করা (Getting Started)
        { 
            q: language === 'bn' ? 'বি লেসন (BeeLesson) কী?' : 'What is BeeLesson?', 
            a: language === 'bn' 
                ? 'বি লেসন (BeeLesson) হলো বাংলাদেশের প্রথম সম্পূর্ণ গেমিফাইড লার্নিং প্ল্যাটফর্ম। গেম খেলার মতো সহজ এবং আনন্দদায়ক উপায়ে এখানে আপনি বাস্তব জীবন ও পেশাদার ক্যারিয়ারের জন্য অত্যন্ত প্রয়োজনীয় বিভিন্ন দক্ষতা অর্জন করতে পারবেন।'
                : 'BeeLesson is Bangladesh\'s first fully gamified learning platform. Here, you can acquire essential real-world and professional skills in an easy, interactive, and game-like environment.',
            cat: language === 'bn' ? 'শুরু করা' : 'Getting Started'
        },
        { 
            q: language === 'bn' ? 'হানি ড্রপ (Honey Drop) কী এবং কীভাবে কাজ করে?' : 'What is Honey Drop and how does it work?', 
            a: language === 'bn'
                ? 'হানি ড্রপ হলো আমাদের প্ল্যাটফর্মের এনার্জি বা লাইফ সিস্টেম। কুইজে ভুল উত্তর দিলে আপনার ১টি করে হানি ড্রপ কমে যাবে। হানি ড্রপ সম্পূর্ণ শেষ হয়ে গেলে আপনি নতুন কুইজে অংশ নিতে পারবেন না। প্রতিদিন এটি স্বয়ংক্রিয়ভাবে রিফিল হয়, অথবা মধুরেণু (Pollen) এক্সচেঞ্জ করে শপ থেকে অর্জন করা যায়।'
                : 'Honey Drop is our platform\'s energy or life system. A wrong answer in quizzes will reduce your Honey Drops by 1. If you run out, you cannot take new quizzes. They regenerate daily, or you can purchase/refill them from the shop using Pollen.',
            cat: language === 'bn' ? 'শুরু করা' : 'Getting Started'
        },
        { 
            q: language === 'bn' ? 'মধু (XP) এবং মধুরেণু (Pollen) এর মধ্যে পার্থক্য কী?' : 'What is the difference between XP and Pollen?', 
            a: language === 'bn'
                ? 'মধু (XP) হলো আপনার শেখার প্রগতির পরিমাপক। প্রতিটি চ্যাপ্টার ও কুইজ সম্পন্ন করলে আপনি মধু (XP) পাবেন, যা লিডারবোর্ডে আপনার র‍্যাঙ্ক বাড়াতে সাহায্য করে। আর মধুরেণু (Pollen) হলো আমাদের প্ল্যাটফর্মের ভার্চুয়াল রিওয়ার্ড কারেন্সি, যা দিয়ে আপনি শপে হানি ড্রপ রিফিল কিনতে পারবেন।'
                : 'XP is the measure of your learning progress. Completing chapters and quizzes awards you XP, which determines your leaderboard rank. Pollen is our virtual reward currency, which can be exchanged in the shop for Honey Drops.',
            cat: language === 'bn' ? 'শুরু করা' : 'Getting Started'
        },
        { 
            q: language === 'bn' ? 'দৈনিক স্ট্রিক (Streak) ও স্ট্রিক স্কোর কীভাবে কাজ করে?' : 'How do Streak and Streak Score work?', 
            a: language === 'bn'
                ? 'প্রতিদিন অন্তত একটি লেসন বা কুইজ সম্পন্ন করলে আপনার দৈনিক স্ট্রিক ১ দিন করে বাড়বে। কোনো দিন বাদ দিলে স্ট্রিক শূন্য (০) হয়ে যাবে। স্ট্রিক স্কোর আপনার বর্তমান মাসের ধারাবাহিকতার একটি পরিমাপ, যা আপনার সক্রিয় দিন ও মাসের মোট দিনের অনুপাতের ওপর ভিত্তি করে হিসাব করা হয়।'
                : 'Completing at least one lesson or quiz daily increases your daily streak by 1 day. Missing a day resets it to zero (0). Streak Score measures your monthly consistency based on the ratio of active learning days to total days.',
            cat: language === 'bn' ? 'শুরু করা' : 'Getting Started'
        },

        // কোর্স ও সার্টিফিকেট (Courses & Certificates)
        { 
            q: language === 'bn' ? 'বি লেসন প্ল্যাটফর্মে বর্তমানে কী কী কোর্স আছে?' : 'What courses are currently available on BeeLesson?', 
            a: language === 'bn'
                ? 'আমাদের প্ল্যাটফর্মে বর্তমানে ৫টি বিশেষায়িত কোর্স রয়েছে: ১. সিভি ও ইন্টারভিউ প্রস্তুতি, ২. বাংলাদেশ শ্রম আইন, ৩. সাইবার সিকিউরিটি ও স্ক্যাম, ৪. প্রোডাক্টিভিটি হ্যাকস ও টাইম ম্যানেজমেন্ট এবং ৫. পাসওয়ার্ড ও অ্যাকাউন্ট সিকিউরিটি। প্রতিটি কোর্স বাস্তবমুখী উদাহরণ ও কুইজ দিয়ে সাজানো হয়েছে।'
                : 'We currently offer 5 specialized courses: 1. CV & Interview Preparation, 2. Bangladesh Labour Law, 3. Cyber Security & Scam, 4. Productivity Hacks & Time Management, and 5. Password & Account Security.',
            cat: language === 'bn' ? 'কোর্স ও সার্টিফিকেট' : 'Courses & Certificates'
        },
        { 
            q: language === 'bn' ? 'কোর্স শেষে কীভাবে সার্টিফিকেট ডাউনলোড করবো?' : 'How to get and download a certificate after course completion?', 
            a: language === 'bn'
                ? 'একটি কোর্সের সকল লেসন, লার্নিং পয়েন্ট এবং কুইজ ১০০% সম্পন্ন করার পর আপনার প্রোফাইল পেজের "সার্টিফিকেট" ট্যাব থেকে ওই কোর্সের জন্য একটি সুন্দর ডিজিটাল সার্টিফিকেট জেনারেট হবে। আপনি এটি সরাসরি পিডিএফ আকারে ডাউনলোড করে আপনার সিভি বা লিঙ্কডইনে শেয়ার করতে পারবেন।'
                : 'Upon 100% completion of all lessons and quizzes in a course, a digital certificate will generate in the "Certificates" tab of your profile. You can download it directly as a PDF for your resume or LinkedIn.',
            cat: language === 'bn' ? 'কোর্স ও সার্টিফিকেট' : 'Courses & Certificates'
        },
        { 
            q: language === 'bn' ? 'আমি কি আমার কোনো কোর্সের প্রগতি রিসেট করতে পারি?' : 'Can I reset my progress in a course?', 
            a: language === 'bn'
                ? 'হ্যাঁ, আপনি যদি কোনো কোর্স একদম নতুন করে শুরু করতে চান, তবে প্রোফাইলের সেটিংস থেকে "কোর্স সেটিংস" অপশনে গিয়ে উক্ত কোর্সের প্রগতি রিসেট করতে পারবেন। তবে মনে রাখবেন, রিসেট করলে ওই কোর্সের আগের সকল প্রোগ্রেস ও কুইজ রেকর্ড স্থায়ীভাবে মুছে যাবে।'
                : 'Yes, if you wish to start a course from scratch, go to Profile Settings -> Course Settings to reset it. Please note that this action is permanent and will delete all previous progress and quiz records for that course.',
            cat: language === 'bn' ? 'কোর্স ও সার্টিফিকেট' : 'Courses & Certificates'
        },

        // ব্যাটেল চ্যালেঞ্জ (Battle Challenge)
        { 
            q: language === 'bn' ? 'ব্যাটেল চ্যালেঞ্জ (Battle Challenge) কী?' : 'What is Battle Challenge?', 
            a: language === 'bn'
                ? 'ব্যাটেল চ্যালেঞ্জ হলো বি লেসন-এর একটি অন্যতম রোমাঞ্চকর ফিচার। এটি একটি রিয়েল-টাইম কুইজ প্রতিযোগিতা যেখানে আপনি অন্য একজন সক্রিয় শিক্ষার্থীর সাথে সরাসরি নির্দিষ্ট মডিউলের ওপর লড়াই করতে পারেন এবং নিজের মেধা যাচাই করতে পারেন।'
                : 'Battle Challenge is one of the most exciting features of BeeLesson. It is a real-time multiplayer quiz competition where you can compete directly against another active learner on specific modules.',
            cat: language === 'bn' ? 'ব্যাটেল চ্যালেঞ্জ' : 'Battle Challenge'
        },
        { 
            q: language === 'bn' ? 'কীভাবে অন্য কোনো শিক্ষার্থীর সাথে ব্যাটেল শুরু করবো?' : 'How do I start a battle with another learner?', 
            a: language === 'bn'
                ? 'আপনি প্রোফাইলের "ব্যাটেল রুম" ট্যাব থেকে রুম তৈরি করে বন্ধুদের আমন্ত্রণ জানাতে পারেন। এছাড়া ব্যাটেল লবি থেকে সরাসরি "র্যান্ডম ম্যাচ" শুরু করতে পারেন অথবা একটি ইউনিক "রুম কোড" ব্যবহার করে বন্ধুকে আপনার তৈরি করা রুমে যুক্ত করতে পারেন।'
                : 'You can create a room from the "Battle Room" tab and invite friends. Alternatively, you can start a "Random Match" from the battle lobby or share a unique "Room Code" to join the same room.',
            cat: language === 'bn' ? 'ব্যাটেল চ্যালেঞ্জ' : 'Battle Challenge'
        },
        { 
            q: language === 'bn' ? 'ব্যাটেল মোড (Battle Mode) বন্ধ করার কোনো উপায় আছে কি?' : 'Is there a way to turn off Battle Mode?', 
            a: language === 'bn'
                ? 'হ্যাঁ, আপনি যদি কোনো চ্যালেঞ্জের নোটিফিকেশন পেতে না চান, তবে ব্যাটেল লবিতে গিয়ে "ব্যাটেল মোড" সুইচটি অফ করে রাখতে পারেন। নিষ্ক্রিয় অবস্থায় থাকলে কেউ আপনাকে ব্যাটেল চ্যালেঞ্জ পাঠাতে পারবে না।'
                : 'Yes, if you do not wish to receive challenge requests, you can turn off the "Battle Mode" switch in the battle lobby. When disabled, other users will not be able to challenge you.',
            cat: language === 'bn' ? 'ব্যাটেল চ্যালেঞ্জ' : 'Battle Challenge'
        },
        { 
            q: language === 'bn' ? 'ব্যাটেল জিতলে কী পুরস্কার দেওয়া হয়?' : 'What rewards are given for winning a battle?', 
            a: language === 'bn'
                ? 'ব্যাটেল জিতলে আপনি বোনাস হিসেবে অতিরিক্ত XP (মধু) এবং মধুরেণু (Pollen) পুরস্কার পাবেন। তবে পুরস্কারের দাবিদার হতে আপনাকে প্রতিযোগিতায় কমপক্ষে ৫০% নির্ভুল উত্তর দিতে হবে।'
                : 'Winning a battle awards you extra XP and Pollen. However, you must achieve at least 50% accuracy during the competition to claim these rewards.',
            cat: language === 'bn' ? 'ব্যাটেল চ্যালেঞ্জ' : 'Battle Challenge'
        },

        // শপ ও মেম্বারশিপ (Shop & Membership)
        { 
            q: language === 'bn' ? 'বি লেসন শপ (Shop) থেকে কী কী কেনা যায়?' : 'What can I purchase from the BeeLesson Shop?', 
            a: language === 'bn'
                ? 'শপ থেকে আপনি আপনার অর্জিত মধুরেণু (Pollen) এক্সচেঞ্জ করে হানি ড্রপ রিফিল কিনতে পারেন, অথবা সরাসরি ১ দিনের জন্য আনলিমিটেড হানি ড্রপ সক্রিয় করতে পারেন। এছাড়া আপনি সুপার মেম্বারশিপের জন্য সাবস্ক্রিপশন কিনতে পারেন।'
                : 'From the shop, you can exchange your Pollen to refill Honey Drops, or activate 1-day unlimited Honey Drops. You can also purchase a Super Membership subscription.',
            cat: language === 'bn' ? 'শপ ও মেম্বারশিপ' : 'Shop & Membership'
        },
        { 
            q: language === 'bn' ? 'সুপার মেম্বারশিপ (Super Membership) এর সুবিধা কী?' : 'What are the benefits of Super Membership?', 
            a: language === 'bn'
                ? 'সুপার মেম্বারশিপের গ্রাহকেরা সম্পূর্ণ আনলিমিটেড হানি ড্রপ সুবিধা পান, যার ফলে ভুল উত্তরের জন্য আপনার শেখার প্রগতি থেমে থাকে না। এছাড়া বিজ্ঞাপন-মুক্ত অভিজ্ঞতার পাশাপাশি আপনার প্রোফাইলে একটি বিশেষ সুপার ব্যাজ প্রদর্শিত হয়।'
                : 'Super Membership subscribers enjoy unlimited Honey Drops (no learning interruption for wrong answers), an ad-free learning environment, and a special premium badge on their profile.',
            cat: language === 'bn' ? 'শপ ও মেম্বারশিপ' : 'Shop & Membership'
        },
        { 
            q: language === 'bn' ? 'পেমেন্ট করার পর সুপার এক্সেস পেতে কত সময় লাগে?' : 'How long does it take to get super access after payment?', 
            a: language === 'bn'
                ? 'আমাদের গেটওয়ের মাধ্যমে পেমেন্ট (বিকাশ, নগদ বা কার্ড) সফল হওয়ার সাথে সাথেই আপনার অ্যাকাউন্ট সুপার মেম্বারশিপে উন্নীত হবে। কোনো সমস্যা হলে আমাদের সাপোর্ট টিমে সরাসরি ইমেইল করুন।'
                : 'Your account will be upgraded immediately after a successful payment via bKash, Nagad, or cards. In case of any technical delays, please email our support team directly.',
            cat: language === 'bn' ? 'শপ ও মেম্বারশিপ' : 'Shop & Membership'
        },

        // অ্যাকাউন্ট ও টেকনিক্যাল (Account & Technical)
        { 
            q: language === 'bn' ? 'পাসওয়ার্ড ভুলে গেলে কীভাবে অ্যাকাউন্ট উদ্ধার করবো?' : 'How do I recover my account if I forget my password?', 
            a: language === 'bn'
                ? 'লগইন পেজে গিয়ে "পাসওয়ার্ড ভুলে গেছেন?" লিঙ্কে ক্লিক করুন। আপনার রেজিস্টার্ড ইমেইল এড্রেসটি দিলে সেখানে একটি নিরাপদ পাসওয়ার্ড রিসেট করার লিঙ্ক পাঠানো হবে। লিঙ্কে ক্লিক করে আপনি নতুন পাসওয়ার্ড সেট করতে পারবেন।'
                : 'Go to the login page and click "Forgot Password?". Enter your registered email address to receive a secure password reset link, where you can easily set a new password.',
            cat: language === 'bn' ? 'অ্যাকাউন্ট ও টেকনিক্যাল' : 'Account & Technical'
        },
        { 
            q: language === 'bn' ? 'পাবলিক প্রোফাইল ও প্রাইভেট প্রোফাইলের মধ্যে পার্থক্য কী?' : 'What is the difference between Public and Private profiles?', 
            a: language === 'bn'
                ? 'পাবলিক প্রোফাইল থাকলে অন্যান্য শিক্ষার্থীরা লিডারবোর্ডে আপনার প্রগতি দেখতে পারবে এবং আপনাকে ফ্রেন্ড রিকোয়েস্ট পাঠাতে পারবে। প্রোফাইল প্রাইভেট করে রাখলে আপনার কোনো তথ্য অন্য কেউ দেখতে পাবে না এবং কেউ চ্যালেঞ্জ পাঠাতে পারবে না।'
                : 'A public profile allows other users to view your progress on the leaderboard and send connection requests. A private profile hides your progress and prevents others from challenging you.',
            cat: language === 'bn' ? 'অ্যাকাউন্ট ও টেকনিক্যাল' : 'Account & Technical'
        },
        { 
            q: language === 'bn' ? 'প্রোফাইল ছবি এবং মৌমাছি অ্যানিমেশন কীভাবে কাস্টমাইজ করবো?' : 'How do I customize my profile picture and bee animation?', 
            a: language === 'bn'
                ? 'আপনার প্রোফাইলের "সম্পাদন করুন" (Edit Profile) বাটনে ক্লিক করে কভার ছবি, ডিসপ্লে পিকচার পরিবর্তন করতে পারবেন। এছাড়া সেটিংসের "ব্যক্তিগত অভিজ্ঞতা" থেকে পড়াশোনার সময় আপনার পছন্দের মৌমাছি অ্যানিমেশন ও সাউন্ড সিলেক্ট করতে পারবেন।'
                : 'Click "Edit Profile" on your profile page to change your cover photo or avatar. Additionally, go to Settings -> Preferences to choose your favorite bee animation and customize sounds.',
            cat: language === 'bn' ? 'অ্যাকাউন্ট ও টেকনিক্যাল' : 'Account & Technical'
        },
        { 
            q: language === 'bn' ? 'অ্যাপের বর্তমান সংস্করণ কত এবং কোনো কারিগরি ত্রুটি বা কন্টেন্টে ভুল পেলে কীভাবে রিপোর্ট করবো?' : 'What is the current app version and how do I report technical errors or content mistakes?', 
            a: language === 'bn'
                ? 'আমাদের প্ল্যাটফর্মটি বর্তমানে প্রাথমিক কারিগরি সংস্করণ ১.০ (Version 1.0) রিলিজ হিসেবে চলছে। অ্যাপে যেকোনো ধরনের কারিগরি ত্রুটি (technical bug/error) পেলে অথবা কোনো কুইজ প্রশ্ন ও কনটেন্টে কোনো ভুল খুঁজে পেলে সরাসরি support@beelesson.com ইমেইলে আমাদের রিপোর্ট করুন।'
                : 'Our platform is currently running its initial technical release version 1.0. If you find any type of technical error or bug, or if any quiz question or learning content is incorrect, please report it directly to support@beelesson.com.',
            cat: language === 'bn' ? 'অ্যাকাউন্ট ও টেকনিক্যাল' : 'Account & Technical'
        }
    ];

    const filteredFaqs = useMemo(() => {
        let result = faqs;
        const isBrowsing = !!selectedCategory || searchQuery.trim().length > 0;
        
        if (selectedCategory) {
            const catTitle = categories.find(c => c.id === selectedCategory)?.title;
            result = result.filter(f => f.cat === catTitle);
        }

        if (searchQuery.trim()) {
            const lowQuery = searchQuery.toLowerCase();
            result = result.filter(f => 
                f.q.toLowerCase().includes(lowQuery) || 
                f.a.toLowerCase().includes(lowQuery)
            );
        }
        
        // By default, show only the most relevant top 6 questions
        // If searching or category is selected, show all matches
        return isBrowsing ? result : result.slice(0, 6);
    }, [searchQuery, selectedCategory, language]);

    const handleCategoryClick = (catId) => {
        setSelectedCategory(catId === selectedCategory ? null : catId);
        setActiveFaq(null);
    };

    const isBn = language === 'bn';
    const seoTitle = 'BeeLesson | গেমস খেলে শিখুন';
        
    const seoDescription = isBn 
        ? 'সার্টিফিকেট, পেমেন্ট, অ্যাকাউন্ট বা কোর্স সম্পর্কিত যেকোনো প্রশ্নের উত্তর পেতে বি লেসন হেল্প সেন্টারে চোখ রাখুন অথবা সরাসরি সাপোর্ট টিমের সাথে যোগাযোগ করুন।' 
        : 'Find answers about certificates, payments, accounts, or courses at the BeeLesson Help Center or contact support.';

    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqs.map(faq => ({
            "@type": "Question",
            "name": faq.q,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.a
            }
        }))
    };

    return (
        <div className={styles.helpPage}>
            <SEO 
                title={seoTitle} 
                description={seoDescription} 
                schema={faqSchema}
            />
            <section className={styles.heroSection}>
                <div className={styles.heroContent}>
                    <div className={styles.heroIconWrap}>
                        <BookOpen size={40} />
                    </div>
                    <h1>{t('help_center')}</h1>
                    <p>{t('how_can_we_help')}</p>
                    <div className={styles.searchContainer}>
                        <Search className={styles.searchIcon} size={20} />
                        <input 
                            type="text" 
                            placeholder={t('search_placeholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button 
                                className={styles.clearBtn}
                                onClick={() => setSearchQuery('')}
                                aria-label={t('clear_search')}
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </section>

            <div className={styles.container}>
                <section className={styles.categoriesGrid}>
                    {categories.map((cat, idx) => (
                        <motion.div
                            key={cat.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * idx }}
                            className={`${styles.categoryCard} ${selectedCategory === cat.id ? styles.catActive : ''}`}
                            onClick={() => handleCategoryClick(cat.id)}
                            whileHover={{ y: -2 }}
                        >
                            <h3>{cat.title}</h3>
                        </motion.div>
                    ))}
                </section>

                <section className={styles.faqSection}>
                    <div className={styles.sectionHeader}>
                        <h2>
                            {selectedCategory 
                                ? categories.find(c => c.id === selectedCategory)?.title 
                                : t('faq_title')}
                        </h2>
                        <p>{t('faq_subtitle')}</p>
                    </div>

                    <div className={styles.faqList}>
                        <AnimatePresence mode='wait'>
                            {filteredFaqs.length > 0 ? (
                                filteredFaqs.map((faq, idx) => (
                                    <motion.div 
                                        key={idx} 
                                        className={`${styles.faqItem} ${activeFaq === idx ? styles.faqActive : ''}`}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                    >
                                        <button 
                                            className={styles.faqTrigger}
                                            onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                                        >
                                            <span className={styles.faqBadge}>{faq.cat}</span>
                                            <span className={styles.faqQ}>{faq.q}</span>
                                            <ChevronDown className={styles.faqCaret} size={18} />
                                        </button>
                                        <AnimatePresence>
                                            {activeFaq === idx && (
                                                <motion.div 
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className={styles.faqAnswer}
                                                >
                                                    <p>{faq.a}</p>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                ))
                            ) : (
                                <motion.div 
                                    className={styles.noResults}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                >
                                    <Search size={48} opacity={0.1} />
                                    <p>{t('no_results_found')} "{searchQuery}"</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </section>

                <section className={styles.supportSection}>
                    <div className={styles.supportCard}>
                        <div className={styles.supportInfo}>
                            <h3>{t('need_direct_help')}</h3>
                            <p>{t('mail_support_desc')}</p>
                        </div>
                        <div className={styles.supportActions}>
                            <a href="mailto:support@beelesson.com" className={styles.primaryContact}>
                                <Mail size={18} />
                                support@beelesson.com
                            </a>
                        </div>
                    </div>
                </section>

                <footer className={styles.helpFooter}>
                    <p>{t('help_footer')}</p>
                </footer>
            </div>
        </div>
    );
};

export default HelpPage;
