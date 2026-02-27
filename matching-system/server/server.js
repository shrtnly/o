const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Database Connection
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'matching_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// GET: Fetch a question with its matching pairs (Shuffled Right Side)
app.get('/api/questions/:id', async (req, res) => {
    try {
        const questionId = req.params.id;

        // Fetch question details
        const [questions] = await pool.query('SELECT * FROM questions WHERE id = ?', [questionId]);
        if (questions.length === 0) return res.status(404).json({ message: 'Question not found' });

        // Fetch matching pairs
        const [pairs] = await pool.query('SELECT left_content, right_content FROM matching_pairs WHERE question_id = ?', [questionId]);

        // Shuffle only the right side
        const rightSide = pairs.map(p => p.right_content);
        for (let i = rightSide.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [rightSide[i], rightSide[j]] = [rightSide[j], rightSide[i]];
        }

        res.json({
            ...questions[0],
            leftItems: pairs.map(p => p.left_content),
            shuffledRightSide: rightSide
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST: Verify matches and calculate score
app.post('/api/verify', async (req, res) => {
    try {
        const { questionId, userName, matches, timeTaken } = req.body;
        // matches: Array of { left: "content", right: "content" }

        // Fetch correct pairs from DB to verify
        const [correctPairs] = await pool.query('SELECT left_content, right_content FROM matching_pairs WHERE question_id = ?', [questionId]);

        let score = 0;
        const results = matches.map(userMatch => {
            const correctPair = correctPairs.find(p => p.left_content === userMatch.left);
            const isCorrect = correctPair && correctPair.right_content === userMatch.right;
            if (isCorrect) score++;
            return { ...userMatch, isCorrect };
        });

        // Save score to DB
        await pool.query(
            'INSERT INTO scores (user_name, question_id, total_pairs, correct_matches, time_taken_seconds) VALUES (?, ?, ?, ?, ?)',
            [userName, questionId, correctPairs.length, score, timeTaken]
        );

        res.json({
            score,
            total: correctPairs.length,
            results
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
