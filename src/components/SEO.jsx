import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

/**
 * Reusable SEO component for dynamic head tag manipulation (title, description, OG tags, Schema, etc.)
 */
const SEO = ({
    title,
    description,
    keywords,
    ogImage,
    ogType = 'website',
    canonicalUrl,
    schema
}) => {
    const { language } = useLanguage();
    const location = useLocation();

    // Default translations/fallbacks for general SEO
    const defaults = {
        bn: {
            title: 'BeeLesson | গেমস খেলে শিখুন',
            description: 'বি লেসন (BeeLesson) বাংলাদেশের প্রথম গ্যামিফাইড লার্নিং প্ল্যাটফর্ম। ইন্টারেক্টিভ কুইজ ও গেম খেলার মাধ্যমে ফ্রিতে শিখুন ক্যারিয়ার গাইড, আইনি সচেতনতা, ডিজিটাল নিরাপত্তা ও স্মার্ট ব্যাংকিং।',
            keywords: 'বি লেসন, BeeLesson, ও-শেখা, গ্যামিফাইড লার্নিং, আইনি সচেতনতা, ডিজিটাল নিরাপত্তা, ক্যারিয়ার গাইড, স্মার্ট ব্যাংকিং, বাংলাদেশ শিক্ষা, ইন্টারেক্টিভ কুইজ',
        },
        en: {
            title: 'BeeLesson | গেমস খেলে শিখুন',
            description: 'BeeLesson is Bangladesh\'s first gamified learning platform. Learn career skills, legal awareness, digital security, and smart banking through interactive stories, quizzes, and games.',
            keywords: 'BeeLesson, O-sekha, gamified learning Bangladesh, legal awareness app, digital safety course, career guidance Bangla, smart banking interactive, interactive quizzes',
        }
    };

    const currentLang = language === 'bn' ? 'bn' : 'en';
    const finalTitle = title || defaults[currentLang].title;
    const finalDescription = description || defaults[currentLang].description;
    const finalKeywords = keywords || defaults[currentLang].keywords;
    
    // Determine the base site URL
    const siteUrl = 'https://www.beelesson.com';
    const finalCanonicalUrl = canonicalUrl || `${siteUrl}${location.pathname}${location.search}`;
    const defaultOgImage = `${siteUrl}/beelessonhero.webp`;
    const finalOgImage = ogImage 
        ? (ogImage.startsWith('http') ? ogImage : `${siteUrl}${ogImage}`)
        : defaultOgImage;

    useEffect(() => {
        // 1. Update HTML language code
        document.documentElement.lang = language === 'bn' ? 'bn' : 'en';

        // 2. Update Page Title
        document.title = finalTitle;

        // Helper function to set or create meta tags
        const setMetaTag = (attributeName, attributeValue, contentValue) => {
            if (!contentValue) return;
            let element = document.querySelector(`meta[${attributeName}="${attributeValue}"]`);
            if (!element) {
                element = document.createElement('meta');
                element.setAttribute(attributeName, attributeValue);
                document.head.appendChild(element);
            }
            element.setAttribute('content', contentValue);
        };

        // 3. Update Standard Meta Tags
        setMetaTag('name', 'description', finalDescription);
        setMetaTag('name', 'keywords', finalKeywords);
        setMetaTag('name', 'author', 'BeeLesson');
        setMetaTag('name', 'robots', 'index, follow');

        // 4. Update Open Graph Meta Tags
        setMetaTag('property', 'og:title', finalTitle);
        setMetaTag('property', 'og:description', finalDescription);
        setMetaTag('property', 'og:image', finalOgImage);
        setMetaTag('property', 'og:url', finalCanonicalUrl);
        setMetaTag('property', 'og:type', ogType);
        setMetaTag('property', 'og:site_name', 'BeeLesson');
        setMetaTag('property', 'og:locale', language === 'bn' ? 'bn_BD' : 'en_US');

        // 5. Update Twitter Card Meta Tags
        setMetaTag('name', 'twitter:card', 'summary_large_image');
        setMetaTag('name', 'twitter:title', finalTitle);
        setMetaTag('name', 'twitter:description', finalDescription);
        setMetaTag('name', 'twitter:image', finalOgImage);

        // 6. Update/Create Canonical Tag
        let canonicalElement = document.querySelector('link[rel="canonical"]');
        if (!canonicalElement) {
            canonicalElement = document.createElement('link');
            canonicalElement.setAttribute('rel', 'canonical');
            document.head.appendChild(canonicalElement);
        }
        canonicalElement.setAttribute('href', finalCanonicalUrl);

        // 7. Inject JSON-LD Schema Markup
        let schemaElement = document.getElementById('seo-json-ld');
        if (schemaElement) {
            schemaElement.remove();
        }

        if (schema) {
            schemaElement = document.createElement('script');
            schemaElement.id = 'seo-json-ld';
            schemaElement.type = 'application/ld+json';
            schemaElement.innerHTML = JSON.stringify(schema);
            document.head.appendChild(schemaElement);
        }

        // Clean up schema on unmount to avoid stale markup
        return () => {
            const el = document.getElementById('seo-json-ld');
            if (el) el.remove();
        };
    }, [finalTitle, finalDescription, finalKeywords, finalCanonicalUrl, finalOgImage, ogType, language, schema]);

    // This component renders nothing visually
    return null;
};

export default SEO;
