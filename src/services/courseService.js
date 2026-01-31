import { supabase } from '../lib/supabaseClient';

export const courseService = {
    async getFeaturedCourses() {
        const { data, error } = await supabase
            .from('courses')
            .select('*')
            .eq('is_featured', true)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    async getAllCourses() {
        const { data, error } = await supabase
            .from('courses')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    async getCourseById(id) {
        const { data, error } = await supabase
            .from('courses')
            .select('*')
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
        return data ? data[0] : null;
    },

    async updateCourse(id, courseData) {
        const { data, error } = await supabase
            .from('courses')
            .update(courseData)
            .eq('id', id)
            .select();

        if (error) throw error;
        return data ? data[0] : null;
    },

    async deleteCourse(id) {
        const { error } = await supabase
            .from('courses')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    },

    // Units
    async getUnits(courseId) {
        const { data, error } = await supabase
            .from('units')
            .select('*')
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
            .select('*')
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
        const { id, ...dataToSave } = lpData;
        if (id) {
            const { data, error } = await supabase
                .from('learning_points')
                .update(dataToSave)
                .eq('id', id)
                .select()
                .single();
            if (error) {
                console.error('Error updating learning point:', error);
                throw error;
            }
            return data;
        } else {
            const { data, error } = await supabase
                .from('learning_points')
                .insert([dataToSave])
                .select()
                .single();
            if (error) {
                console.error('Error inserting learning point:', error);
                throw error;
            }
            return data;
        }
    },
    async saveQuestion(qData) {
        const { id, ...dataToSave } = qData;
        if (id) {
            const { data, error } = await supabase
                .from('mcq_questions')
                .update(dataToSave)
                .eq('id', id)
                .select()
                .single();
            if (error) {
                console.error('Error updating question:', error);
                throw error;
            }
            return data;
        } else {
            const { data, error } = await supabase
                .from('mcq_questions')
                .insert([dataToSave])
                .select()
                .single();
            if (error) {
                console.error('Error inserting question:', error);
                throw error;
            }
            return data;
        }
    },
    async saveOptions(questionId, options) {
        // Delete old options and insert new ones
        await supabase.from('mcq_options').delete().eq('question_id', questionId);

        // Filter out options with no text and strip id/created_at
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
    }
};
