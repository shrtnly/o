import { supabase } from '../lib/supabaseClient';

export const surveyService = {
    async getQuestionsByCourse(courseId) {
        // For now, we return mock questions. 
        // In production, you would fetch these from Supabase:
        // const { data, error } = await supabase.from('survey_questions').select('*').eq('course_id', courseId).order('step_number');

        return [
            {
                id: 1,
                question: "আপনি কেন এই কোর্সটি শিখতে চাচ্ছেন?",
                options: [
                    { id: 'a', text: 'নিজের দক্ষতা বৃদ্ধির জন্য' },
                    { id: 'b', text: 'নতুন কিছু শেখার শখ থেকে' },
                    { id: 'c', text: 'ক্যারিয়ারে উন্নতির জন্য' },
                    { id: 'd', text: 'অন্যান্য' }
                ]
            },
            {
                id: 2,
                question: "আপনার বর্তমান দক্ষতার স্তর কি?",
                options: [
                    { id: 'a', text: 'একদম নতুন (Beginner)' },
                    { id: 'b', text: 'মাঝারি (Intermediate)' },
                    { id: 'c', text: 'দক্ষ (Advanced)' }
                ]
            },
            {
                id: 3,
                question: "আপনি প্রতিদিন কতটা সময় দিতে পারবেন?",
                options: [
                    { id: 'a', text: '১৫-৩০ মিনিট' },
                    { id: 'b', text: '১ ঘণ্টা' },
                    { id: 'c', text: '২ ঘণ্টার বেশি' }
                ]
            }
        ];
    },

    async saveSurveyResponse(courseId, responses) {
        // Normally you would save this to a table:
        // const { data, error } = await supabase.from('survey_responses').insert([{ course_id: courseId, answers: responses }]);
        console.log('Saving survey responses for course:', courseId, responses);
        return { success: true };
    }
};
