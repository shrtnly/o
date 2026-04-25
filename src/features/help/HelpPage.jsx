import React, { useState, useMemo } from 'react';
import { 
    Search, BookOpen, CreditCard, Wrench, Mail,
    ChevronDown, Zap, Globe, X, Swords
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './HelpPage.module.css';
import { useLanguage } from '../../context/LanguageContext'; // Assuming this path

const HelpPage = () => {
    const { t, language } = useLanguage();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFaq, setActiveFaq] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);

    const categories = [
        { id: 'start', title: language === 'bn' ? 'শুরু করা' : 'Getting Started', icon: Zap, count: 6, color: '#f1c40f' },
        { id: 'course', title: language === 'bn' ? 'কোর্স ও মেম্বারশিপ' : 'Courses & Membership', icon: BookOpen, count: 4, color: '#3498db' },
        { id: 'payment', title: language === 'bn' ? 'পেমেন্ট ও বিলিং' : 'Payment & Billing', icon: CreditCard, count: 3, color: '#2ecc71' },
        { id: 'tech', title: language === 'bn' ? 'টেকনিক্যাল ইস্যু' : 'Technical Issues', icon: Wrench, count: 3, color: '#e74c3c' },
        { id: 'about', title: language === 'bn' ? 'আমাদের সম্পর্কে' : 'About Us', icon: Globe, count: 2, color: '#e67e22' },
        { id: 'battle', title: language === 'bn' ? 'ব্যাটেল চ্যালেঞ্জ' : 'Battle Challenge', icon: Swords, count: 4, color: '#9b59b6' }
    ];

    const faqs = [
        // শুরু করা (Getting Started)
        { 
            q: language === 'bn' ? 'বি লেসন (BeeLesson) কি?' : 'What is BeeLesson?', 
            a: language === 'bn' 
                ? 'বি লেসন একটি আধুনিক ইসলামিক অনলাইন লার্নিং প্ল্যাটফর্ম যেখানে আপনি সহজভাবে কুরআন, হাদিস এবং ইসলামের মৌলিক বিষয়গুলো শিখতে পারেন। আমাদের লক্ষ্য হলো প্রযুক্তির মাধ্যমে দ্বীনি শিক্ষাকে সবার কাছে সহজলভ্য করা।'
                : 'BeeLesson is a modern Islamic online learning platform where you can easily learn the Quran, Hadith, and basic Islamic principles. Our goal is to make religious education accessible to everyone through technology.',
            cat: language === 'bn' ? 'শুরু করা' : 'Getting Started'
        },
        { 
            q: language === 'bn' ? 'হানি ড্রপ (Honey Drop) এর কাজ কি?' : 'What is the purpose of Honey Drop?', 
            a: language === 'bn'
                ? 'হানি ড্রপ হলো আমাদের প্ল্যাটফর্মের এনার্জি সিস্টেম। কুইজে ভুল উত্তর দিলে আপনার হানি ড্রপ কমে যাবে। হানি ড্রপ শেষ হয়ে গেলে আপনি কুইজে অংশ নিতে পারবেন না। প্রতিদিন নতুন হানি ড্রপ পাওয়া যায় অথবা স্টোর থেকে অর্জন করা যায়।'
                : 'Honey Drop is our platform\'s energy system. If you give wrong answers in quizzes, your Honey Drops will decrease. If you run out, you won\'t be able to take more quizzes. You get new ones every day or can earn them from the store.',
            cat: language === 'bn' ? 'শুরু করা' : 'Getting Started'
        },
        { 
            q: language === 'bn' ? 'কিভাবে অ্যাকাউন্ট খুলবো?' : 'How do I open an account?', 
            a: language === 'bn'
                ? 'অ্যাকাউন্ট খুলতে আমাদের ওয়েবসাইটের মেনু থেকে "লগইন" বাটনে ক্লিক করুন, তারপর "সাইন আপ" অপশনে যান। আপনার ইমেইল এবং একটি পাসওয়ার্ড দিয়ে খুব সহজেই অ্যাকাউন্ট তৈরি করতে পারবেন।'
                : 'To open an account, click "Login" from the menu, then go to "Sign Up". You can easily create an account with your email and a password.',
            cat: language === 'bn' ? 'শুরু করা' : 'Getting Started'
        },
        { 
            q: language === 'bn' ? 'স্ট্রিক (Streak) কি?' : 'What is a Streak?', 
            a: language === 'bn'
                ? 'স্ট্রিক হলো আপনার প্রতিদিনের পড়ার ধারাবাহিকতা। আপনি যদি প্রতিদিন অন্তত একটি লেসন বা কুইজ সম্পন্ন করেন, তবে আপনার স্ট্রিক ১ দিন করে বাড়বে। কোনো দিন বাদ দিলে স্ট্রিক শূন্য (০) হয়ে যাবে।'
                : 'A streak is your daily learning consistency. If you complete at least one lesson or quiz every day, your streak will increase by 1 day. If you miss a day, your streak will reset to zero (0).',
            cat: language === 'bn' ? 'শুরু করা' : 'Getting Started'
        },
        { 
            q: language === 'bn' ? 'স্ট্রিক স্কোর (Streak Score) কি?' : 'What is a Streak Score?', 
            a: language === 'bn'
                ? 'স্ট্রিক স্কোর আপনার বর্তমান মাসের ধারাবাহিকতার একটি পরিমাপ। এটি আপনার সক্রিয় দিন এবং মাসের মোট দিনের অনুপাতের ওপর ভিত্তি করে হিসাব করা হয়, যা আপনাকে নিয়মিত পড়াশোনায় উৎসাহিত করে।'
                : 'Streak Score is a measure of your consistency for the current month. It is calculated based on the ratio of your active days to the total days in the month, encouraging you to study regularly.',
            cat: language === 'bn' ? 'শুরু করা' : 'Getting Started'
        },
        { 
            q: language === 'bn' ? 'ইনভাইট লিঙ্ক (Invite Link) কীভাবে কাজ করে?' : 'How does the Invite Link work?', 
            a: language === 'bn'
                ? 'আপনার প্রোফাইল পেজে একটি ইউনিক ইনভাইট লিঙ্ক পাবেন। কোনো বন্ধু যদি আপনার লিঙ্কে ক্লিক করে সাইন আপ করে, তবে আপনি বনাস হিসেবে ৫টি হানি ড্রপ (Honey Drop) পাবেন। এভাবে আপনি যত খুশি বন্ধুকে ইনভাইট করতে পারেন!'
                : 'You will find a unique invite link on your profile page. If a friend signs up using your link, you will receive 5 Honey Drops as a bonus. You can invite as many friends as you want!',
            cat: language === 'bn' ? 'শুরু করা' : 'Getting Started'
        },

        // কোর্স ও মেম্বারশিপ (Courses & Membership)
        { 
            q: language === 'bn' ? 'কিভাবে নতুন কোর্সে ভর্তি হবো?' : 'How do I enroll in a new course?', 
            a: language === 'bn'
                ? 'লগইন করার পর "কোর্সসমূহ" ট্যাবে যান, আপনার পছন্দের কোর্সটি সিলেক্ট করুন এবং "এনরোল করুন" বাটনে ক্লিক করলেই আপনি কোর্সটি শুরু করতে পারবেন। বেশিরভাগ কোর্সই আমাদের প্ল্যাটফর্মে ফ্রি।'
                : 'After logging in, go to the "Courses" tab, select your preferred course, and click "Enroll" to start. Most courses on our platform are free.',
            cat: language === 'bn' ? 'কোর্স ও মেম্বারশিপ' : 'Courses & Membership'
        },
        { 
            q: language === 'bn' ? 'সার্টিফিকেট কিভাবে পাওয়া যাবে?' : 'How to get a certificate?', 
            a: language === 'bn'
                ? 'একটি কোর্সের সকল লেসন এবং কুইজ সফলভাবে সম্পন্ন করার পর আপনি আপনার প্রোফাইল থেকে ওই কোর্সের জন্য একটি ডিজিটাল সার্টিফিকেট ডাউনলোড করতে পারবেন। সার্টিফিকেটটি আপনি লিঙ্কডইন বা অন্য কোথাও শেয়ার করতে পারবেন।'
                : 'After successfully completing all lessons and quizzes of a course, you can download a digital certificate from your profile. You can share the certificate on LinkedIn or elsewhere.',
            cat: language === 'bn' ? 'কোর্স ও মেম্বারশিপ' : 'Courses & Membership'
        },
        { 
            q: language === 'bn' ? 'আমি কি একই সাথে একাধিক কোর্স করতে পারি?' : 'Can I take multiple courses at the same time?', 
            a: language === 'bn'
                ? 'হ্যাঁ, আপনি একই সাথে যত খুশি কোর্স করতে পারেন। আপনার প্রোফাইলে সকল এনরোল করা কোর্সের প্রগতি আলাদাভাবে দেখতে পাবেন।'
                : 'Yes, you can take as many courses as you want simultaneously. You can track the progress of all enrolled courses separately from your profile.',
            cat: language === 'bn' ? 'কোর্স ও মেম্বারশিপ' : 'Courses & Membership'
        },
        { 
            q: language === 'bn' ? 'সুপার মেম্বারশিপ এর সুবিধা কি?' : 'What are the benefits of Super Membership?', 
            a: language === 'bn'
                ? 'সুপার মেম্বারশিপ নিলে আপনি আনলিমিটেড হানি ড্রপ পাবেন, কোনো অ্যাড থাকবে না এবং স্পেশাল ব্যাজ পাবেন। এটি আপনার শেখার গতিকে আরও বাড়িয়ে দেবে।'
                : 'With Super Membership, you get unlimited Honey Drops, an ad-free experience, and special badges. It will boost your learning speed.',
            cat: language === 'bn' ? 'কোর্স ও মেম্বারশিপ' : 'Courses & Membership'
        },

        // পেমেন্ট ও বিলিং (Payment & Billing)
        { 
            q: language === 'bn' ? 'পেমেন্ট এর জন্য কি কি মাধ্যম আছে?' : 'What payment methods are available?', 
            a: language === 'bn'
                ? 'আমরা বিকাশ, নগদ এবং সকল প্রকার ডেবিট/ক্রেডিট কার্ড সাপোর্ট করি। আমাদের পেমেন্ট গেটওয়ের মাধ্যমে আপনি খুব সহজেই এবং নিরাপদে পেমেন্ট সম্পন্ন করতে পারবেন।'
                : 'We support Bkash, Nagad, and all types of Debit/Credit cards. You can easily and securely complete payments through our payment gateway.',
            cat: language === 'bn' ? 'পেমেন্ট ও বিলিং' : 'Payment & Billing'
        },
        { 
            q: language === 'bn' ? 'পেমেন্ট এর পর প্রিমিয়াম এক্সেস পেতে কত সময় লাগে?' : 'How long does it take to get premium access after payment?', 
            a: language === 'bn'
                ? 'পেমেন্ট সফল হওয়ার সাথে সাথেই আপনার অ্যাকাউন্ট প্রিমিয়াম বা "সুপার" মেম্বারশিপে আপডেট হয়ে যাবে। কোনো কারণে দেরি হলে আমাদের সাপোর্ট টিমে যোগাযোগ করুন।'
                : 'Your account will be updated to Premium or "Super" immediately after a successful payment. If there\'s any delay, please contact our support team.',
            cat: language === 'bn' ? 'পেমেন্ট ও বিলিং' : 'Payment & Billing'
        },
        { 
            q: language === 'bn' ? 'পেমেন্ট রিফান্ড পলিসি কি?' : 'What is the refund policy?', 
            a: language === 'bn'
                ? 'যদি পেমেন্টে কোনো সমস্যা হয় বা ভুল অ্যাকাউন্টে টাকা কাটে, তবে ৪৮ ঘণ্টার মধ্যে আবেদন করলে আমরা বিষয়টি খতিয়ে দেখে রিফান্ড নিশ্চিত করি।'
                : 'If there\'s any payment issue or money is deducted from the wrong account, we ensure a refund after investigating if you apply within 48 hours.',
            cat: language === 'bn' ? 'পেমেন্ট ও বিলিং' : 'Payment & Billing'
        },

        // টেকনিক্যাল ইস্যু (Technical Issues)
        { 
            q: language === 'bn' ? 'ভিডিও লোড হচ্ছে না, কি করবো?' : 'Video is not loading, what to do?', 
            a: language === 'bn'
                ? 'প্রথমে আপনার ইন্টারনেট কানেকশন চেক করুন। ব্রাউজারের ক্যাশ ফাইল ক্লিয়ার করে আবার চেষ্টা করুন। যদি কাজ না করে, তবে অন্য কোনো ব্রাউজার (যেমন: ক্রোম বা ফায়ারফক্স) ব্যবহার করে দেখুন।'
                : 'First, check your internet connection. Try clearing your browser cache. If it doesn\'t work, try a different browser like Chrome or Firefox.',
            cat: language === 'bn' ? 'টেকনিক্যাল ইস্যু' : 'Technical Issues'
        },
        { 
            q: language === 'bn' ? 'মোবাইল অ্যাপ কি আছে?' : 'Is there a mobile app?', 
            a: language === 'bn'
                ? 'বর্তমানে আমরা একটি রেসপন্সিভ ওয়েব প্ল্যাটফর্ম হিসেবে কাজ করছি, যা আপনার ফোনের ব্রাউজারে অ্যাপের মতোই সাবলীলভাবে কাজ করবে। শীঘ্রই আমাদের ডেডিকেটেড মোবাইল অ্যাপ উন্মুক্ত করা হবে।'
                : 'Currently, we operate as a responsive web platform that works smoothly as an app in your phone\'s browser. A dedicated mobile app will be released soon.',
            cat: language === 'bn' ? 'টেকনিক্যাল ইস্যু' : 'Technical Issues'
        },
        { 
            q: language === 'bn' ? 'পাসওয়ার্ড ভুলে গেলে কি করবো?' : 'What if I forget my password?', 
            a: language === 'bn'
                ? 'লগইন পেজে গিয়ে "ফোরগট পাসওয়ার্ড" লিঙ্কে ক্লিক করুন। আপনার রেজিস্টার্ড ইমেইল এড্রেসটি দিলে একটি পাসওয়ার্ড রিসেট লিঙ্ক পাঠানো হবে।'
                : 'Go to the login page and click "Forgot Password". A reset link will be sent to your registered email address.',
            cat: language === 'bn' ? 'টেকনিক্যাল ইস্যু' : 'Technical Issues'
        },

        // আমাদের সম্পর্কে (About Us)
        { 
            q: language === 'bn' ? 'বি লেসন (BeeLesson) এর উদ্দেশ্য কি?' : 'What is the goal of BeeLesson?', 
            a: language === 'bn'
                ? 'আমাদের মূল উদ্দেশ্য হলো নির্ভরযোগ্য ইসলামিক তথ্য এবং শিক্ষাকে প্রযুক্তির মাধ্যমে সবার ঘরে ঘরে পৌঁছে দেওয়া। আমরা চাই মানুষ যাতে সহজ এবং আনন্দদায়ক উপায়ে ইসলামের মৌলিক বিষয়গুলো শিখতে পারে।'
                : 'Our main goal is to deliver reliable Islamic information and education to every home through technology. We want people to learn basic Islamic principles in an easy and enjoyable way.',
            cat: language === 'bn' ? 'আমাদের সম্পর্কে' : 'About Us'
        },
        { 
            q: language === 'bn' ? 'কিভাবে কন্ট্রিবিউট করতে পারি?' : 'How can I contribute?', 
            a: language === 'bn'
                ? 'আপনি যদি এই প্রজেক্টে কন্ট্রিবিউট করতে চান বা কোনো ফিডব্যাক দিতে চান, তবে আমাদের ইমেইল (support@beelesson.com) করুন। আপনার পরামর্শ আমাদের জন্য অত্যন্ত মূল্যবান।'
                : 'If you want to contribute to this project or give feedback, email us at support@beelesson.com. Your suggestions are highly valuable to us.',
            cat: language === 'bn' ? 'আমাদের সম্পর্কে' : 'About Us'
        },
        
        // ব্যাটেল চ্যালেঞ্জ (Battle Challenge)
        { 
            q: language === 'bn' ? 'ব্যাটেল (Battle) কি?' : 'What is Battle?', 
            a: language === 'bn'
                ? 'ব্যাটেল হলো একটি রিয়েল-টাইম কুইজ প্রতিযোগিতা যেখানে আপনি অন্য একজন শিক্ষার্থীর সাথে সরাসরি লড়তে পারেন। নির্দিষ্ট সময়ের মধ্যে বেশি সঠিক উত্তর দিয়ে আপনি জয়ী হতে পারেন এবং অতিরিক্ত পুরষ্কার অর্জন করতে পারেন।'
                : 'Battle is a real-time quiz competition where you can compete directly with another learner. You can win and earn extra rewards by giving more correct answers within a specified time.',
            cat: language === 'bn' ? 'ব্যাটেল চ্যালেঞ্জ' : 'Battle Challenge'
        },
        { 
            q: language === 'bn' ? 'ব্যাটেল শুরু করবো কীভাবে?' : 'How to start a Battle?', 
            a: language === 'bn'
                ? 'আপনি কানেকশন ট্যাব থেকে যেকোনো শিক্ষার্থীকে চ্যালেঞ্জ পাঠাতে পারেন অথবা সরাসরি ব্যাটেল লবিতে গিয়ে "র‍্যান্ডম ম্যাচ" বা "রুম কোড" ব্যবহার করে নতুন ব্যাটেল শুরু করতে পারেন।'
                : 'You can send a challenge to any learner from the connections tab or directly go to the battle lobby and start a new battle using "Random Match" or a "Room Code".',
            cat: language === 'bn' ? 'ব্যাটেল চ্যালেঞ্জ' : 'Battle Challenge'
        },
        { 
            q: language === 'bn' ? 'ব্যাটেল মোড (Battle Mode) অন/অফ করা যায়?' : 'Can I turn off Battle Mode?', 
            a: language === 'bn'
                ? 'হ্যাঁ, আপনি যদি কারো চ্যালেঞ্জ পেতে না চান, তবে ব্যাটেল লবিতে গিয়ে "ব্যাটেল মোড" সুইচটি অফ করে রাখতে পারেন। মোড অফ থাকলে কেউ আপনাকে চ্যালেঞ্জ পাঠাতে পারবে না এবং আপনি গ্লোবাল চ্যালেঞ্জ নোটিফিকেশন পাবেন না।'
                : 'Yes, if you don\'t want to receive challenges, you can turn off the "Battle Mode" switch in the battle lobby. When off, no one can send you challenges and you won\'t receive global challenge notifications.',
            cat: language === 'bn' ? 'ব্যাটেল চ্যালেঞ্জ' : 'Battle Challenge'
        },
        { 
            q: language === 'bn' ? 'ব্যাটেল জিতলে কি পুরস্কার পাওয়া যায়?' : 'What rewards do I get for winning?', 
            a: language === 'bn'
                ? 'ব্যাটেল জিতলে আপনি অতিরিক্ত XP এবং মধুরেণু (Pollen) পুরস্কার হিসেবে পাবেন। কমপক্ষে ৫০% নির্ভুল উত্তর দিলে আপনি এই পুরস্কারগুলো পাবেন। এটি আপনার লিডারবোর্ড র‍্যাঙ্ক বাড়াতে দারুণ সাহায্য করবে।'
                : 'Winning a battle awards you extra XP and Pollen. You will receive these rewards if you achieve at least 50% accuracy. This significantly helps in increasing your leaderboard rank.',
            cat: language === 'bn' ? 'ব্যাটেল চ্যালেঞ্জ' : 'Battle Challenge'
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

    return (
        <div className={styles.helpPage}>
            <section className={styles.heroSection}>
                <div className={styles.heroContent}>
                    
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
