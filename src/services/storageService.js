import { supabase } from '../lib/supabaseClient';

/**
 * Storage Service for handling file uploads to Supabase Storage
 */

const AVATAR_BUCKET = 'avatars';
const COVER_BUCKET = 'covers';
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_COVER_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export const storageService = {
    /**
     * Upload a user avatar
     * @param {File} file - The image file to upload
     * @param {string} userId - The user's ID
     * @returns {Promise<{url: string, path: string}>} - The public URL and storage path
     */
    async uploadAvatar(file, userId) {
        try {
            // Validate file
            if (!file) {
                throw new Error('কোনো ফাইল নির্বাচন করা হয়নি');
            }

            // Check file size
            if (file.size > MAX_AVATAR_SIZE) {
                throw new Error('ফাইলের আকার ৫MB এর বেশি হতে পারবে না');
            }

            // Check file type
            if (!ALLOWED_FILE_TYPES.includes(file.type)) {
                throw new Error('শুধুমাত্র JPG, PNG, এবং WebP ফরম্যাট সমর্থিত');
            }

            // Generate unique filename
            const fileExt = file.name.split('.').pop();
            const fileName = `${userId}-${Date.now()}.${fileExt}`;
            const filePath = `${userId}/${fileName}`;

            // Upload file to Supabase Storage
            const { data, error } = await supabase.storage
                .from(AVATAR_BUCKET)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                console.error('Upload error:', error);
                throw new Error('ফাইল আপলোড করতে সমস্যা হয়েছে');
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from(AVATAR_BUCKET)
                .getPublicUrl(filePath);

            return {
                url: publicUrl,
                path: filePath
            };
        } catch (error) {
            console.error('Error uploading avatar:', error);
            throw error;
        }
    },

    /**
     * Delete an avatar file
     * @param {string} filePath - The storage path of the file to delete
     * @returns {Promise<void>}
     */
    async deleteAvatar(filePath) {
        try {
            if (!filePath) return;

            // Extract the path from URL if full URL is provided
            let path = filePath;
            if (filePath.includes('/storage/v1/object/public/')) {
                path = filePath.split('/storage/v1/object/public/avatars/')[1];
            }

            const { error } = await supabase.storage
                .from(AVATAR_BUCKET)
                .remove([path]);

            if (error) {
                console.error('Delete error:', error);
                // Don't throw error for delete failures, just log it
            }
        } catch (error) {
            console.error('Error deleting avatar:', error);
            // Don't throw error for delete failures
        }
    },

    /**
     * Update user's avatar URL in the database
     * @param {string} userId - The user's ID
     * @param {string} avatarUrl - The new avatar URL
     * @returns {Promise<object>} - Updated profile data
     */
    async updateUserAvatar(userId, avatarUrl) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .update({ avatar_url: avatarUrl })
                .eq('id', userId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating user avatar:', error);
            throw new Error('প্রোফাইল আপডেট করতে সমস্যা হয়েছে');
        }
    },

    /**
     * Complete avatar upload process: upload file, delete old avatar, update database
     * @param {File} file - The image file to upload
     * @param {string} userId - The user's ID
     * @param {string} oldAvatarUrl - The old avatar URL to delete (optional)
     * @returns {Promise<object>} - Updated profile data
     */
    async changeAvatar(file, userId, oldAvatarUrl = null) {
        try {
            // Upload new avatar
            const { url, path } = await this.uploadAvatar(file, userId);

            // Update database
            const updatedProfile = await this.updateUserAvatar(userId, url);

            // Delete old avatar if exists
            if (oldAvatarUrl) {
                await this.deleteAvatar(oldAvatarUrl);
            }

            return updatedProfile;
        } catch (error) {
            console.error('Error changing avatar:', error);
            throw error;
        }
    },

    /**
     * Upload a cover image
     * @param {File} file - The image file to upload
     * @param {string} userId - The user's ID
     * @returns {Promise<{url: string, path: string}>} - The public URL and storage path
     */
    async uploadCover(file, userId) {
        try {
            // Validate file
            if (!file) {
                throw new Error('কোনো ফাইল নির্বাচন করা হয়নি');
            }

            // Check file size
            if (file.size > MAX_COVER_SIZE) {
                throw new Error('ফাইলের আকার ১০MB এর বেশি হতে পারবে না');
            }

            // Check file type
            if (!ALLOWED_FILE_TYPES.includes(file.type)) {
                throw new Error('শুধুমাত্র JPG, PNG, এবং WebP ফরম্যাট সমর্থিত');
            }

            // Generate unique filename
            const fileExt = file.name.split('.').pop();
            const fileName = `${userId}-${Date.now()}.${fileExt}`;
            const filePath = `${userId}/${fileName}`;

            // Upload file to Supabase Storage
            const { data, error } = await supabase.storage
                .from(COVER_BUCKET)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                console.error('Upload error:', error);
                throw new Error('ফাইল আপলোড করতে সমস্যা হয়েছে');
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from(COVER_BUCKET)
                .getPublicUrl(filePath);

            return {
                url: publicUrl,
                path: filePath
            };
        } catch (error) {
            console.error('Error uploading cover:', error);
            throw error;
        }
    },

    /**
     * Delete a cover image file
     * @param {string} filePath - The storage path of the file to delete
     * @returns {Promise<void>}
     */
    async deleteCover(filePath) {
        try {
            if (!filePath) return;

            // Extract the path from URL if full URL is provided
            let path = filePath;
            if (filePath.includes('/storage/v1/object/public/')) {
                path = filePath.split('/storage/v1/object/public/covers/')[1];
            }

            const { error } = await supabase.storage
                .from(COVER_BUCKET)
                .remove([path]);

            if (error) {
                console.error('Delete error:', error);
                // Don't throw error for delete failures, just log it
            }
        } catch (error) {
            console.error('Error deleting cover:', error);
            // Don't throw error for delete failures
        }
    },

    /**
     * Update user's cover URL in the database
     * @param {string} userId - The user's ID
     * @param {string} coverUrl - The new cover URL
     * @returns {Promise<object>} - Updated profile data
     */
    async updateUserCover(userId, coverUrl) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .update({ cover_url: coverUrl })
                .eq('id', userId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating user cover:', error);
            throw new Error('প্রোফাইল আপডেট করতে সমস্যা হয়েছে');
        }
    },

    /**
     * Complete cover upload process: upload file, delete old cover, update database
     * @param {File} file - The image file to upload
     * @param {string} userId - The user's ID
     * @param {string} oldCoverUrl - The old cover URL to delete (optional)
     * @returns {Promise<object>} - Updated profile data
     */
    async changeCover(file, userId, oldCoverUrl = null) {
        try {
            // Upload new cover
            const { url, path } = await this.uploadCover(file, userId);

            // Update database
            const updatedProfile = await this.updateUserCover(userId, url);

            // Delete old cover if exists
            if (oldCoverUrl) {
                await this.deleteCover(oldCoverUrl);
            }

            return updatedProfile;
        } catch (error) {
            console.error('Error changing cover:', error);
            throw error;
        }
    }
};
