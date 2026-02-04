/**
 * Date utility functions for consistent date handling across the app
 * Avoids timezone issues by using local date formatting
 */

/**
 * Format a Date object to YYYY-MM-DD string in local timezone
 * @param {Date} date - Date object to format
 * @returns {string} - Formatted date string (YYYY-MM-DD)
 */
export const formatLocalDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Get today's date in YYYY-MM-DD format (local timezone)
 * @returns {string} - Today's date
 */
export const getTodayDate = () => {
    return formatLocalDate(new Date());
};

/**
 * Get date N days ago in YYYY-MM-DD format (local timezone)
 * @param {number} days - Number of days to go back
 * @returns {string} - Date string
 */
export const getDaysAgo = (days) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return formatLocalDate(date);
};

/**
 * Check if two dates are the same day (ignoring time)
 * @param {Date} date1 
 * @param {Date} date2 
 * @returns {boolean}
 */
export const isSameDay = (date1, date2) => {
    return formatLocalDate(date1) === formatLocalDate(date2);
};
