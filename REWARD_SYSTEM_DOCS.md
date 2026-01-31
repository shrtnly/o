# O-Sekha Reward System Documentation

## Overview
The O-Sekha platform now features a comprehensive reward system that tracks XP (Experience Points), Gems, and Hearts with full transaction logging and atomic database operations.

## Database Schema

### 1. `user_reward_transactions` Table
Tracks every reward transaction for complete audit trail and analytics.

**Columns:**
- `id` (UUID) - Primary key
- `user_id` (UUID) - Reference to auth.users
- `transaction_type` (VARCHAR) - Type: 'xp_earned', 'gem_earned', 'heart_lost', 'heart_gained', 'gem_spent'
- `amount` (INTEGER) - Amount of reward/penalty
- `source` (VARCHAR) - Source: 'mcq_correct', 'chapter_complete', 'mystery_box', 'heart_box', 'gem_box', 'daily_quest', 'streak_bonus', 'purchase'
- `chapter_id` (UUID) - Optional reference to chapter
- `course_id` (UUID) - Optional reference to course
- `metadata` (JSONB) - Additional data (accuracy, total questions, etc.)
- `created_at` (TIMESTAMPTZ) - Transaction timestamp

### 2. `user_progress` Table Updates
Enhanced to track detailed MCQ statistics:
- `total_questions` (INTEGER) - Total questions in chapter
- `correct_answers` (INTEGER) - Number of correct answers
- `xp_earned` (INTEGER) - XP earned from this chapter

### 3. Database Functions

#### `award_user_xp()`
Awards XP to a user atomically with transaction logging.

**Parameters:**
- `p_user_id` (UUID) - User ID
- `p_amount` (INTEGER) - XP amount
- `p_source` (VARCHAR) - Source of XP
- `p_chapter_id` (UUID, optional) - Chapter ID
- `p_course_id` (UUID, optional) - Course ID
- `p_metadata` (JSONB, optional) - Additional metadata

**Returns:** `{new_xp, transaction_id}`

#### `award_user_gems()`
Awards gems to a user atomically with transaction logging.

**Parameters:** Same as `award_user_xp()`
**Returns:** `{new_gems, transaction_id}`

#### `deduct_user_hearts()`
Deducts hearts from a user with transaction logging.

**Parameters:**
- `p_user_id` (UUID) - User ID
- `p_amount` (INTEGER) - Hearts to deduct (default: 1)

**Returns:** `{new_hearts, transaction_id}`

### 4. `user_stats_summary` View
Provides aggregated user statistics:
- Total XP, gems, hearts
- Chapters completed
- Courses enrolled
- Total correct answers
- Total questions attempted
- Accuracy percentage

## Reward Rules

### XP (Experience Points)
- **1 XP per correct MCQ answer**
- Awarded when chapter is completed
- Tracked in `user_reward_transactions` with metadata
- Displayed in sidebar and completion statistics

### Gems
- Awarded from mystery boxes and gem boxes
- Can be used for purchases (future feature)
- Tracked with full transaction history

### Hearts
- Lost when answering MCQ incorrectly (-1 heart per wrong answer)
- Can be gained from heart boxes
- Minimum value: 0 (cannot go negative)
- Tracked with transaction logging

## Implementation Guide

### 1. Database Setup
Run the migration script:
```bash
# Open Supabase SQL Editor and run:
# database_migration_rewards.sql
```

### 2. Using the Reward Service

#### Award XP
```javascript
import { rewardService } from '../services/rewardService';

const result = await rewardService.awardXP(
    userId, 
    5, // 5 XP
    'mcq_correct',
    {
        chapterId: 'chapter-uuid',
        courseId: 'course-uuid',
        total_questions: 10,
        correct_answers: 5,
        accuracy: 50
    }
);

console.log(`New XP: ${result.newXp}`);
```

#### Award Gems
```javascript
const result = await rewardService.awardGems(
    userId,
    10, // 10 gems
    'mystery_box',
    { chapterId: 'chapter-uuid' }
);
```

#### Deduct Hearts
```javascript
const result = await rewardService.deductHearts(userId, 1);
console.log(`Remaining hearts: ${result.newHearts}`);
```

#### Get User Statistics
```javascript
const stats = await rewardService.getUserStats(userId);
console.log(stats);
// {
//   xp: 150,
//   gems: 25,
//   hearts: 8,
//   chapters_completed: 5,
//   courses_enrolled: 2,
//   total_correct_answers: 150,
//   total_questions_attempted: 200,
//   accuracy_percentage: 75.00
// }
```

## Frontend Integration

### StatsSidebar Component
The sidebar automatically displays:
- Current XP (with Zap icon)
- Current Gems (with Gem icon)
- Current Hearts (with Heart icon)

Data is fetched from the `profiles` table and updated in real-time.

### StudyPage Component
- Awards 1 XP per correct MCQ answer
- Deducts 1 heart per incorrect answer
- Shows completion statistics with total XP earned
- Updates `user_progress` table with detailed statistics

### LearningPage Component
- Mystery boxes award XP/gems/hearts
- Tracks completion status
- Updates sidebar stats in real-time

## Analytics & Reporting

### Transaction History
Query all transactions for a user:
```sql
SELECT * FROM user_reward_transactions
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC;
```

### User Performance
Use the `user_stats_summary` view:
```sql
SELECT * FROM user_stats_summary
WHERE user_id = 'user-uuid';
```

### Leaderboard Query
```sql
SELECT 
    p.id,
    p.full_name,
    p.xp,
    p.gems,
    uss.chapters_completed,
    uss.accuracy_percentage
FROM profiles p
LEFT JOIN user_stats_summary uss ON p.id = uss.user_id
ORDER BY p.xp DESC
LIMIT 10;
```

## Error Handling

The reward service includes automatic fallbacks:
1. **Primary:** Use database functions (atomic, with transaction logging)
2. **Fallback:** Direct table updates (if functions don't exist yet)
3. **Error Logging:** All errors are logged to console

## Security

- Row Level Security (RLS) enabled on all tables
- Users can only view/modify their own data
- Database functions use `SECURITY DEFINER` for controlled access
- All operations are atomic to prevent race conditions

## Future Enhancements

1. **Daily Quests:** Track daily XP goals
2. **Streak Bonuses:** Award extra XP for consecutive days
3. **Leaderboards:** Rank users by XP
4. **Achievements:** Unlock badges for milestones
5. **Gem Shop:** Spend gems on hearts, power-ups, etc.
6. **XP Multipliers:** Temporary boosts for special events

## Troubleshooting

### Functions Not Found
If you get "function does not exist" errors:
1. Ensure the migration script was run successfully
2. Check Supabase SQL Editor for any errors
3. Verify function permissions are granted

### Stats Not Updating
1. Check browser console for errors
2. Verify RLS policies are correctly set
3. Ensure user is authenticated
4. Check network tab for failed requests

### Transaction Logging Issues
1. Verify `user_reward_transactions` table exists
2. Check table permissions
3. Review RLS policies

## Support
For issues or questions, check the Supabase logs or contact the development team.
