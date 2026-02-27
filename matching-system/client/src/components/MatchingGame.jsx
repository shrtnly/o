import React, { useState, useEffect, useCallback } from 'react';
import { Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import './MatchingGame.css';

const MatchingGame = ({ questionId = 1, userName = "Admin" }) => {
    const [data, setData] = useState(null);
    const [leftItems, setLeftItems] = useState([]);
    const [rightItems, setRightItems] = useState([]);
    const [matches, setMatches] = useState({}); // Stores { leftIndex: rightContent }
    const [timeLeft, setTimeLeft] = useState(120);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [results, setResults] = useState(null);
    const [draggedItem, setDraggedItem] = useState(null);

    // 1. Fetch Question Data on Mount
    useEffect(() => {
        fetch(`http://localhost:5000/api/questions/${questionId}`)
            .then(res => res.json())
            .then(json => {
                setData(json);
                setLeftItems(json.leftItems);
                setRightItems(json.shuffledRightSide);
                setTimeLeft(json.timer_seconds || 120);
            })
            .catch(err => console.error("Error fetching data:", err));
    }, [questionId]);

    // 2. Timer Logic
    useEffect(() => {
        if (timeLeft > 0 && !isSubmitted) {
            const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
            return () => clearInterval(timer);
        } else if (timeLeft === 0 && !isSubmitted) {
            handleSubmit();
        }
    }, [timeLeft, isSubmitted]);

    // 3. Drag and Drop Handlers
    const onDragStart = (e, index, content) => {
        if (isSubmitted) return;
        setDraggedItem({ index, content });
        e.dataTransfer.setData("content", content);
    };

    const onDrop = (e, leftIndex) => {
        e.preventDefault();
        if (isSubmitted) return;
        const content = e.dataTransfer.getData("content");

        // Ensure the content isn't already matched elsewhere
        const newMatches = { ...matches };
        Object.keys(newMatches).forEach(key => {
            if (newMatches[key] === content) delete newMatches[key];
        });

        setMatches({ ...newMatches, [leftIndex]: content });
    };

    const allowDrop = (e) => e.preventDefault();

    // 4. Submit and Verify (Backend Re-check)
    const handleSubmit = async () => {
        if (isSubmitted) return;
        setIsSubmitted(true);

        const matchArray = Object.entries(matches).map(([lIdx, rContent]) => ({
            left: leftItems[parseInt(lIdx)],
            right: rContent
        }));

        try {
            const response = await fetch('http://localhost:5000/api/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    questionId,
                    userName,
                    matches: matchArray,
                    timeTaken: 120 - timeLeft
                })
            });
            const resultJson = await response.json();
            setResults(resultJson);
        } catch (err) {
            console.error("Verification failed:", err);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    if (!data) return <div className="matching-wrapper">Loading Dashboard...</div>;

    return (
        <div className="matching-wrapper">
            <header className="dashboard-header">
                <div>
                    <h1>{data.title}</h1>
                    <p>{data.description}</p>
                </div>
                <div className="timer">
                    <Clock size={20} style={{ marginRight: '8px' }} />
                    {formatTime(timeLeft)}
                </div>
            </header>

            <div className="matching-grid">
                {/* Left Column: Static items with drop zones */}
                <div className="card-column">
                    <h3 className="column-title">Target Concept</h3>
                    <div className="card-list">
                        {leftItems.map((item, idx) => (
                            <div key={idx} className="left-item-container">
                                <div className="matching-card disabled">
                                    {item}
                                </div>
                                <div
                                    className={`placeholder ${matches[idx] ? 'active' : ''} ${isSubmitted ? (results?.results?.find(r => r.left === item)?.isCorrect ? 'correct' : 'wrong') : ''}`}
                                    onDrop={(e) => onDrop(e, idx)}
                                    onDragOver={allowDrop}
                                >
                                    {matches[idx] || "Drop Answer Here"}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column: Draggable options */}
                <div className="card-column">
                    <h3 className="column-title">Definitions</h3>
                    <div className="card-list">
                        {rightItems.map((item, idx) => {
                            const isUsed = Object.values(matches).includes(item);
                            return (
                                <div
                                    key={idx}
                                    draggable={!isSubmitted && !isUsed}
                                    onDragStart={(e) => onDragStart(e, idx, item)}
                                    className={`matching-card ${isUsed ? 'disabled opacity-50' : ''} ${isSubmitted ? 'disabled' : ''}`}
                                >
                                    {item}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="submit-section">
                {!isSubmitted ? (
                    <button
                        className="submit-btn"
                        onClick={handleSubmit}
                        disabled={Object.keys(matches).length === 0}
                    >
                        Submit Assignment
                    </button>
                ) : (
                    <div className="results-banner">
                        <h2>Final Score: {results?.score} / {results?.total}</h2>
                        {results?.score === results?.total ? (
                            <p style={{ color: 'var(--success-green)' }}><CheckCircle size={20} inline /> Excellent work!</p>
                        ) : (
                            <p style={{ color: 'var(--error-red)' }}><AlertCircle size={20} inline /> Review and try again.</p>
                        )}
                        <button className="submit-btn" style={{ marginTop: '1rem' }} onClick={() => window.location.reload()}>
                            <RefreshCw size={18} style={{ marginRight: '8px' }} /> Retry
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MatchingGame;
