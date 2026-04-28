import { supabase } from '../lib/supabaseClient';

// Simple in-memory cache
const cache = {
    courses: null,
    stats: null,
    lastFetched: {
        courses: 0,
        stats: 0
    }
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const COURSE_COLUMNS = 'id, title, title_en, description, description_en, image_url, is_featured, created_at, category, status, students_count, rating';
const UNIT_COLUMNS = 'id, course_id, title, order_index';
const CHAPTER_COLUMNS = 'id, unit_id, title, order_index, type, is_trophy, is_claimed, reward_hearts, reward_gems, estimated_time';

export const courseService = {
    async getFeaturedCourses() {
        const { data, error } = await supabase
            .from('courses')
            .select(COURSE_COLUMNS)
            .eq('is_featured', true)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    async getAllCourses(forceRefresh = false) {
        const now = Date.now();
        if (!forceRefresh && cache.courses && (now - cache.lastFetched.courses < CACHE_DURATION)) {
            return cache.courses;
        }

        const { data, error } = await supabase
            .from('courses')
            .select(COURSE_COLUMNS)
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        cache.courses = data;
        cache.lastFetched.courses = now;
        return data;
    },

    async getCourseById(id) {
        const { data, error } = await supabase
            .from('courses')
            .select(COURSE_COLUMNS)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    async createCourse(courseData) {
        const { data, error } = await supabase
            .from('courses')
            .insert([courseData])
            .select();

        if (error) throw error;
        cache.courses = null; // Invalidate cache
        return data ? data[0] : null;
    },

    async updateCourse(id, courseData) {
        const { data, error } = await supabase
            .from('courses')
            .update(courseData)
            .eq('id', id)
            .select();

        if (error) throw error;
        cache.courses = null; // Invalidate cache
        return data ? data[0] : null;
    },

    async deleteCourse(id) {
        const { error } = await supabase
            .from('courses')
            .delete()
            .eq('id', id);

        if (error) throw error;
        cache.courses = null; // Invalidate cache
        return true;
    },

    // Units
    async getUnits(courseId) {
        const { data, error } = await supabase
            .from('units')
            .select(UNIT_COLUMNS)
            .eq('course_id', courseId)
            .order('order_index', { ascending: true });
        if (error) throw error;
        return data;
    },
    async createUnit(unitData) {
        const { data, error } = await supabase.from('units').insert([unitData]).select();
        if (error) throw error;
        return data ? data[0] : null;
    },
    async updateUnit(id, unitData) {
        const { data, error } = await supabase.from('units').update(unitData).eq('id', id).select();
        if (error) throw error;
        return data ? data[0] : null;
    },
    async deleteUnit(id) {
        const { error } = await supabase.from('units').delete().eq('id', id);
        if (error) throw error;
        return true;
    },

    // Chapters
    async getChapters(unitId) {
        const { data, error } = await supabase
            .from('chapters')
            .select(CHAPTER_COLUMNS)
            .eq('unit_id', unitId)
            .order('order_index', { ascending: true });
        if (error) throw error;
        return data;
    },
    async createChapter(chapterData) {
        const { data, error } = await supabase.from('chapters').insert([chapterData]).select();
        if (error) throw error;
        return data ? data[0] : null;
    },
    async updateChapter(id, chapterData) {
        const { data, error } = await supabase.from('chapters').update(chapterData).eq('id', id).select();
        if (error) throw error;
        return data ? data[0] : null;
    },
    async deleteChapter(id) {
        const { error } = await supabase.from('chapters').delete().eq('id', id);
        if (error) throw error;
        return true;
    },

    // Content (Learning Points & Questions)
    async getChapterContent(chapterId) {
        // Here we keep * as we need most content for the learning experience
        const { data: points, error: pErr } = await supabase
            .from('learning_points')
            .select('*, mcq_questions(*, mcq_options(*))')
            .eq('chapter_id', chapterId)
            .order('order_index', { ascending: true })
            .order('order_index', { foreignTable: 'mcq_questions', ascending: true })
            .order('order_index', { foreignTable: 'mcq_questions.mcq_options', ascending: true });
        if (pErr) throw pErr;
        return points;
    },
    async saveLearningPoint(lpData) {
        const { id, mcq_questions, ...dataToSave } = lpData;
        if (id) {
            const { data, error } = await supabase
                .from('learning_points')
                .update(dataToSave)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        } else {
            const { data, error } = await supabase
                .from('learning_points')
                .insert([dataToSave])
                .select()
                .single();
            if (error) throw error;
            return data;
        }
    },
    async saveQuestion(qData) {
        const { id, mcq_options, ...dataToSave } = qData;
        if (id) {
            const { data, error } = await supabase
                .from('mcq_questions')
                .update(dataToSave)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        } else {
            const { data, error } = await supabase
                .from('mcq_questions')
                .insert([dataToSave])
                .select()
                .single();
            if (error) throw error;
            return data;
        }
    },
    async saveOptions(questionId, options) {
        await supabase.from('mcq_options').delete().eq('question_id', questionId);

        const cleanOptions = options
            .filter(o => o.option_text && o.option_text.trim() !== '')
            .map(({ id, created_at, ...o }) => ({
                ...o,
                question_id: questionId,
                is_correct: !!o.is_correct
            }));

        if (cleanOptions.length === 0) return [];

        const { data, error } = await supabase.from('mcq_options').insert(cleanOptions).select();
        if (error) throw error;
        return data;
    },

    async deleteLearningPoint(id) {
        const { error } = await supabase.from('learning_points').delete().eq('id', id);
        if (error) throw error;
        return true;
    },

    async getLastPracticedCourseId(userId) {
        if (!userId) return null;

        try {
            const { data: progressData } = await supabase
                .from('user_progress')
                .select('course_id')
                .eq('user_id', userId)
                .order('last_accessed', { ascending: false })
                .limit(1);

            if (progressData && progressData.length > 0) {
                return progressData[0].course_id;
            }

            const { data: enrollmentData } = await supabase
                .from('user_courses')
                .select('course_id')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(1);

            return enrollmentData && enrollmentData.length > 0 ? enrollmentData[0].course_id : null;
        } catch (error) {
            console.error('Error fetching last practiced course:', error);
            return null;
        }
    },

    async checkEnrollment(userId, courseId) {
        const { data, error } = await supabase
            .from('user_courses')
            .select('id')
            .eq('user_id', userId)
            .eq('course_id', courseId)
            .maybeSingle();

        if (error) throw error;
        return !!data;
    },

    async enrollUserInCourse(userId, courseId) {
        // Optimization: Directly attempt insert and handle conflict
        const { data, error } = await supabase
            .from('user_courses')
            .insert([{ user_id: userId, course_id: courseId }])
            .select('id');

        if (error) {
            if (error.code === '23505') return true; // Already enrolled (Unique constraint conflict)
            console.error('Error enrolling user:', error);
            throw error;
        }

        // Update public stats via RPC if possible, otherwise keep optimized JS logic
        try {
            const { data: stats } = await supabase
                .from('course_public_stats')
                .select('enrolled_count')
                .eq('course_id', courseId)
                .maybeSingle();

            if (stats) {
                await supabase
                    .from('course_public_stats')
                    .update({ enrolled_count: (stats.enrolled_count || 0) + 1 })
                    .eq('course_id', courseId);
            } else {
                await supabase
                    .from('course_public_stats')
                    .insert([{ course_id: courseId, enrolled_count: 1 }]);
            }
            cache.stats = null; // Invalidate stats cache
        } catch (err) {
            console.error('Error updating public stats:', err);
        }

        return data;
    },

    async getUserEnrolledCourses(userId) {
        const { data, error } = await supabase
            .from('user_course_progress')
            .select('*')
            .eq('user_id', userId);

        if (error) throw error;
        return data || [];
    },

    async resetCourseProgress(userId, courseId) {
        const { error } = await supabase
            .from('user_progress')
            .delete()
            .eq('user_id', userId)
            .eq('course_id', courseId);

        if (error) throw error;
        return true;
    },

    async submitReview(userId, courseId, rating, feedback = '') {
        const { data, error } = await supabase
            .from('course_reviews')
            .upsert({
                user_id: userId,
                course_id: courseId,
                rating,
                feedback,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'course_id,user_id'
            })
            .select('id');

        if (error) throw error;
        
        // Optimized avg calculation: fetch only needed stats
        try {
            const { data: reviewStats, error: statErr } = await supabase
                .from('course_reviews')
                .select('rating')
                .eq('course_id', courseId);
            
            if (reviewStats && reviewStats.length > 0) {
                const totalRating = reviewStats.reduce((acc, curr) => acc + curr.rating, 0);
                const avg = (totalRating / reviewStats.length).toFixed(1);
                
                await supabase
                    .from('course_public_stats')
                    .upsert({ 
                        course_id: courseId, 
                        average_rating: avg,
                        review_count: reviewStats.length 
                    }, { onConflict: 'course_id' });
                
                cache.stats = null; // Invalidate stats cache
            }
        } catch (err) {
            console.error('Error updating public rating:', err);
        }

        return data;
    },

    async getCourseReviews(courseId) {
        const { data, error } = await supabase
            .from('course_reviews')
            .select('id, rating, feedback, created_at, profiles(full_name, avatar_url)')
            .eq('course_id', courseId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    async getAverageRating(courseId) {
        const { data, error } = await supabase
            .from('course_public_stats')
            .select('average_rating')
            .eq('course_id', courseId)
            .maybeSingle();

        if (error) return 0;
        return data?.average_rating || 0;
    },

    async getBulkCourseStats(forceRefresh = false) {
        const now = Date.now();
        if (!forceRefresh && cache.stats && (now - cache.lastFetched.stats < CACHE_DURATION)) {
            return cache.stats;
        }

        try {
            const { data, error } = await supabase
                .from('course_public_stats')
                .select('course_id, enrolled_count, average_rating');
            
            if (error) throw error;

            const stats = {};
            data.forEach(s => {
                stats[s.course_id] = {
                    count: s.enrolled_count || 0,
                    rating: s.average_rating || 0
                };
            });

            cache.stats = stats;
            cache.lastFetched.stats = now;
            return stats;
        } catch (err) {
            console.error('Error fetching bulk stats:', err);
            return cache.stats || {};
        }
    },

    async getStudentCount(courseId) {
        const { data, error } = await supabase
            .from('course_public_stats')
            .select('enrolled_count')
            .eq('course_id', courseId)
            .maybeSingle();

        if (error) return 0;
        return data?.enrolled_count || 0;
    },

    async getTotalStudentCount() {
        const { data, error } = await supabase
            .from('course_public_stats')
            .select('enrolled_count');

        if (error) return 0;
        return data?.reduce((acc, curr) => acc + (curr.enrolled_count || 0), 0) || 0;
    }
};

