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
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            // 1. Save survey responses
            const { error: surveyError } = await supabase
                .from('survey_responses')
                .insert([{
                    user_id: user.id,
                    course_id: courseId,
                    answers: responses
                }]);

            if (surveyError) console.error('Error saving survey:', surveyError);

            // 2. Enroll user in the course
            const { error: enrollError } = await supabase
                .from('user_courses')
                .upsert([{
                    user_id: user.id,
                    course_id: courseId
                }], { onConflict: 'user_id,course_id' });

            if (enrollError) throw enrollError;

            return { success: true };
        } catch (error) {
            console.error('Error in saveSurveyResponse:', error);
            throw error;
        }
    }
};
