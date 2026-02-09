import React from 'react';
import { HelpCircle, MessageCircle, FileText, Search, ExternalLink, ChevronRight } from 'lucide-react';
import styles from './HelpPage.module.css';

const HelpPage = () => {
    const categories = [
        { title: 'শুরু করা', icon: Search, id: 'getting-started' },
        { title: 'অ্যাকাউন্ট ও প্রোফাইল', icon: ExternalLink, id: 'account' },
        { title: 'কোর্স ও পাঠ', icon: MessageCircle, id: 'courses' },
        { title: 'পেমেন্ট ও সাবস্ক্রিপশন', icon: FileText, id: 'billing' }
    ];

    const faqs = [
        { q: 'আমি কিভাবে শুরু করব?', a: 'প্রথমে একটি কোর্স সিলেক্ট করুন এবং "শিখুন" বাটনে ক্লিক করুন।' },
        { q: 'আমার পাসওয়ার্ড ভুলে গেলে কি করব?', a: 'লগইন পেজে "পাসওয়ার্ড ভুলে গেছেন" লিঙ্কে ক্লিক করুন এবং আপনার ইমেল প্রদান করুন।' },
        { q: 'আমি কি অফলাইনে শিখতে পারি?', a: 'বর্তমানে আমাদের অফলাইন মোড ডেভেলপমেন্টাধীন আছে। খুব শীঘ্রই এটি চালু করা হবে।' }
    ];

    return (
        <div className={styles.helpPage}>
            <header className={styles.header}>
                <div className={styles.headerTitle}>
                    <HelpCircle className={styles.headerIcon} />
                    <h1>সহায়তা কেন্দ্র</h1>
                </div>
                <div className={styles.searchBar}>
                    <Search className={styles.searchIcon} />
                    <input type="text" placeholder="আপনার সমস্যাটি লিখুন..." />
                </div>
            </header>

            <div className={styles.content}>
                <section className={styles.categories}>
                    {categories.map((cat, idx) => (
                        <div key={idx} className={styles.catCard}>
                            <cat.icon className={styles.catIcon} />
                            <h3>{cat.title}</h3>
                        </div>
                    ))}
                </section>

                <section className={styles.faqSection}>
                    <div className={styles.sectionTitle}>
                        <h2>সচরাচর জিজ্ঞাসিত প্রশ্ন (FAQ)</h2>
                    </div>
                    <div className={styles.faqList}>
                        {faqs.map((faq, idx) => (
                            <div key={idx} className={styles.faqCard}>
                                <div className={styles.faqQ}>
                                    <h3>{faq.q}</h3>
                                    <ChevronRight size={20} />
                                </div>
                                <p className={styles.faqA}>{faq.a}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className={styles.contactSection}>
                    <div className={styles.contactCard}>
                        <h2>আরও সাহায্য প্রয়োজন?</h2>
                        <p>আমাদের সাপোর্ট টিমের সাথে সরাসরি যোগাযোগ করুন।</p>
                        <button className={styles.contactBtn}>আমাদের লিখে জানান</button>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default HelpPage;
