import { supabase } from '../lib/supabaseClient';
import { courseService } from './courseService';

export const surveyService = {
    async getQuestionsByCourse(courseId) {
        try {
            // Priority 1: Fetch from database
            const { data, error } = await supabase
                .from('survey_questions')
                .select('*')
                .order('step_number', { ascending: true });

            if (error) throw error;

            if (data && data.length > 0) {
                // Map database columns to names used in the UI (camelCase)
                return data.map(q => ({
                    id: q.id,
                    questionBn: q.question_bn,
                    questionEn: q.question_en,
                    options: q.options,
                    step_number: q.step_number
                }));
            }
        } catch (error) {
            console.error("Error fetching survey questions from DB:", error);
        }

        // Priority 2: Fallback to mock data if database is empty or fails
        return [
            {
                id: 1,
                questionBn: "আপনার শেখার মূল লক্ষ্য কী?",
                questionEn: "What is your primary goal for learning?",
                options: [
                    { id: 'hobby', textBn: 'শুধু শখের জন্য', textEn: 'Just as a hobby' },
                    { id: 'skills', textBn: 'দক্ষতা বাড়াতে', textEn: 'To improve skills' },
                    { id: 'career', textBn: 'ক্যারিয়ারের উন্নতির জন্য', textEn: 'For career growth' },
                    { id: 'other', textBn: 'অন্যান্য', textEn: 'Other' }
                ]
            },
            {
                id: 2,
                questionBn: "আপনি কি আগে কখনো এই বিষয়ে কোর্স করেছেন?",
                questionEn: "Have you ever taken a course on this subject before?",
                options: [
                    { id: 'yes', textBn: 'হ্যাঁ', textEn: 'Yes' },
                    { id: 'no', textBn: 'না', textEn: 'No' },
                    { id: 'somewhat', textBn: 'কিছুটা জানি', textEn: 'Know a little bit' }
                ]
            },
            {
                id: 3,
                questionBn: "প্রতিদিন কতক্ষণ সময় দিতে পারবেন?",
                questionEn: "How much time can you spend every day?",
                options: [
                    { id: '5m', textBn: '৫ মিনিট', textEn: '5 minutes' },
                    { id: '10m', textBn: '১০ মিনিট', textEn: '10 minutes' },
                    { id: '15m', textBn: '১৫ মিনিট', textEn: '15 minutes' },
                    { id: '30m_plus', textBn: '৩০+ মিনিট', textEn: '30+ minutes' }
                ]
            },
            {
                id: 4,
                questionBn: "আপনি কি রিমাইন্ডার পেতে চান?",
                questionEn: "Do you want to receive reminders?",
                options: [
                    { id: 'yes', textBn: 'হ্যাঁ', textEn: 'Yes' },
                    { id: 'no', textBn: 'না', textEn: 'No' },
                    { id: 'decide_later', textBn: 'পরে সিদ্ধান্ত নেব', textEn: 'Decide later' }
                ]
            }
        ];
    },

    async saveSurveyResponse(courseId, responses) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            // 1. Save all survey responses for analytics/tracking
            const { error: surveyError } = await supabase
                .from('survey_responses')
                .insert([{
                    user_id: user.id,
                    course_id: courseId,
                    answers: responses
                }]);

            if (surveyError) console.error('Error saving survey responses:', surveyError);

            // 2. Intelligent synchronization for personalized progress tracking
            const updates = [];

            // Mapping the duration response (index 2) to daily_goal_minutes
            const goalMap = { '5m': 5, '10m': 10, '15m': 15, '30m_plus': 30 };
            const dailyGoal = goalMap[responses[2]]; 
            
            if (dailyGoal) {
                updates.push(
                    supabase.from('profiles').update({ daily_goal_minutes: dailyGoal }).eq('id', user.id)
                );
            }

            // Mapping the reminder preference (index 3) to user_notifications
            const reminderEnabled = responses[3] === 'yes';
            updates.push(
                supabase.from('user_notifications').upsert({
                    user_id: user.id,
                    daily_reminder_enabled: reminderEnabled,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' })
            );

            // Wait for profile and notification updates to finish
            await Promise.allSettled(updates);

            // 3. Finally, enroll the user in the course
            await courseService.enrollUserInCourse(user.id, courseId);

            return { success: true };
        } catch (error) {
            console.error('Error in saveSurveyResponse:', error);
            throw error;
        }
    }
};
