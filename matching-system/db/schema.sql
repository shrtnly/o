-- Matching Game Database Schema (MySQL)
CREATE DATABASE IF NOT EXISTS matching_db;
USE matching_db;

-- Questions Table: Stores the main question details
CREATE TABLE IF NOT EXISTS questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    timer_seconds INT DEFAULT 120, -- Default 2 minutes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Matching Pairs Table: Stores the correct pairs for each question
CREATE TABLE IF NOT EXISTS matching_pairs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question_id INT NOT NULL,
    left_content TEXT NOT NULL,
    right_content TEXT NOT NULL,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- User Scores Table: Stores results of user attempts
CREATE TABLE IF NOT EXISTS scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_name VARCHAR(100) NOT NULL,
    question_id INT NOT NULL,
    total_pairs INT NOT NULL,
    correct_matches INT NOT NULL,
    time_taken_seconds INT,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (question_id) REFERENCES questions(id)
) ENGINE=InnoDB;

-- Sample Data
INSERT INTO questions (title, description, timer_seconds) VALUES ('Password Safety Basics', 'Match the concept to its definition.', 120);

INSERT INTO matching_pairs (question_id, left_content, right_content) VALUES 
(1, 'Password', 'A digital key to your account'),
(1, 'MFA', 'Multi-factor Authentication for extra security'),
(1, 'Phishing', 'Fraudulent attempt to obtain sensitive info');
