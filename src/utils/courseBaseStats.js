/**
 * Dummy base statistics per course.
 * The displayed student count = dummyBase + real enrolled count from DB.
 * The displayed rating = dummyRating (shown until `minReviews` real reviews accumulate).
 *
 * Matched by course title substring (Bengali).
 */
const COURSE_BASE_STATS = [
    { keyword: 'শ্রম আইন',       students: 279, rating: 4.8, minReviews: 5 },
    { keyword: 'সিভি',           students: 235, rating: 4.6, minReviews: 5 },
    { keyword: 'সাইবার',         students: 129, rating: 4.5, minReviews: 5 },
    { keyword: 'প্রোডাক্টিভিটি', students: 356, rating: 4.3, minReviews: 5 },
    { keyword: 'পাসওয়ার্ড',      students: 189, rating: 4.7, minReviews: 5 },
    { keyword: 'যোগাযোগ',       students: 755, rating: 4.7, minReviews: 5 },
];

/**
 * Returns { baseStudents, baseRating, minReviews } for a given course title.
 * Falls back to { baseStudents: 0, baseRating: 0, minReviews: 0 } if no match.
 *
 * Usage:
 *   const { baseStudents, baseRating, minReviews } = getCourseBaseStats(title);
 *   const displayedStudents = baseStudents + realEnrolledCount;
 *   const displayedRating   = (realReviewCount >= minReviews && realRating > 0)
 *                               ? realRating : baseRating;
 */
export function getCourseBaseStats(title = '') {
    const match = COURSE_BASE_STATS.find(entry => title.includes(entry.keyword));
    if (match) return { baseStudents: match.students, baseRating: match.rating, minReviews: match.minReviews };
    return { baseStudents: 0, baseRating: 0, minReviews: 0 };
}
