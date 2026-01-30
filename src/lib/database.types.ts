export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    public: {
        Tables: {
            chapters: {
                Row: {
                    created_at: string | null
                    id: string
                    order_index: number
                    title: string
                    unit_id: string | null
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    order_index: number
                    title: string
                    unit_id?: string | null
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    order_index?: number
                    title?: string
                    unit_id?: string | null
                }
            }
            courses: {
                Row: {
                    created_at: string | null
                    id: string
                    image_url: string | null
                    is_featured: boolean | null
                    rating: number | null
                    students_count: number | null
                    title: string
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    image_url?: string | null
                    is_featured?: boolean | null
                    rating?: number | null
                    students_count?: number | null
                    title: string
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    image_url?: string | null
                    is_featured?: boolean | null
                    rating?: number | null
                    students_count?: number | null
                    title?: string
                }
            }
            learning_points: {
                Row: {
                    chapter_id: string | null
                    content: string | null
                    created_at: string | null
                    id: string
                    order_index: number
                    title: string
                }
                Insert: {
                    chapter_id?: string | null
                    content?: string | null
                    created_at?: string | null
                    id?: string
                    order_index: number
                    title: string
                }
                Update: {
                    chapter_id?: string | null
                    content?: string | null
                    created_at?: string | null
                    id?: string
                    order_index?: number
                    title?: string
                }
            }
            mcq_options: {
                Row: {
                    created_at: string | null
                    id: string
                    is_correct: boolean | null
                    option_text: string
                    question_id: string | null
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    is_correct?: boolean | null
                    option_text: string
                    question_id?: string | null
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    is_correct?: boolean | null
                    option_text?: string
                    question_id?: string | null
                }
            }
            mcq_questions: {
                Row: {
                    created_at: string | null
                    explanation: string | null
                    id: string
                    learning_point_id: string | null
                    order_index: number
                    question_text: string
                }
                Insert: {
                    created_at?: string | null
                    explanation?: string | null
                    id?: string
                    learning_point_id?: string | null
                    order_index: number
                    question_text: string
                }
                Update: {
                    created_at?: string | null
                    explanation?: string | null
                    id?: string
                    learning_point_id?: string | null
                    order_index?: number
                    question_text?: string
                }
            }
            units: {
                Row: {
                    course_id: string | null
                    created_at: string | null
                    id: string
                    order_index: number
                    title: string
                }
                Insert: {
                    course_id?: string | null
                    created_at?: string | null
                    id?: string
                    order_index: number
                    title: string
                }
                Update: {
                    course_id?: string | null
                    created_at?: string | null
                    id?: string
                    order_index?: number
                    title?: string
                }
            }
        }
    }
}
