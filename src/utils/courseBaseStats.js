/**
 * Dummy base statistics per course.
 * The displayed student count = dummyBase + real enrolled count from DB.
 * The displayed rating = dummyRating (shown unless DB has a real non-zero rating).
 *
 * Matched by course title substring (Bengali).
 */
const COURSE_BASE_STATS = [
    { keyword: 'শ্রম আইন',       students: 279, rating: 4.8 },
    { keyword: 'সিভি',           students: 235, rating: 4.6 },
    { keyword: 'সাইবার',         students: 129, rating: 4.5 },
    { keyword: 'প্রোডাক্টিভিটি', students: 356, rating: 4.3 },
    { keyword: 'পাসওয়ার্ড',      students: 189, rating: 4.7 },
];

/**
 * Returns { baseStudents, baseRating } for a given course title.
 * Falls back to { baseStudents: 0, baseRating: 0 } if no match.
 */
export function getCourseBaseStats(title = '') {
    const match = COURSE_BASE_STATS.find(entry => title.includes(entry.keyword));
    if (match) return { baseStudents: match.students, baseRating: match.rating };
    return { baseStudents: 0, baseRating: 0 };
}
