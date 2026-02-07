import { supabase } from '../lib/supabaseClient';

export const surveyService = {
    async getQuestionsByCourse(courseId) {
        // For now, we return mock questions. 
        // In production, you would fetch these from Supabase:
        // const { data, error } = await supabase.from('survey_questions').select('*').eq('course_id', courseId).order('step_number');

        return [
            {
                id: 1,
                question: "আপনি আমাদের কীভাবে খুঁজে পেয়েছেন?",
                options: [
                    { id: 'a', text: 'ফেসবুক থেকে' },
                    { id: 'b', text: 'ইউটিউব থেকে' },
                    { id: 'c', text: 'বন্ধুদের মাধ্যমে' },
                    { id: 'd', text: 'গুগল সার্চ' },
                    { id: 'e', text: 'অন্যান্য' }
                ]
            },
            {
                id: 2,
                question: "আপনার শেখার উদ্দেশ্য কী?",
                options: [
                    { id: 'a', text: 'নতুন কিছু শেখা' },
                    { id: 'b', text: 'ক্যারিয়ারে উন্নতি' },
                    { id: 'c', text: 'স্কিল বাড়ানো' },
                    { id: 'd', text: 'শখের বসে' }
                ]
            },
            {
                id: 3,
                question: "প্রতিদিন কতক্ষণ সময় শিখতে চান?",
                options: [
                    { id: 'a', text: '১০-২০ মিনিট' },
                    { id: 'b', text: '৩০-৬০ মিনিট' },
                    { id: 'c', text: '১-২ ঘণ্টা' },
                    { id: 'd', text: '২ ঘণ্টার বেশি' }
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
