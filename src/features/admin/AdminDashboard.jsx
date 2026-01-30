import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard, Plus, Search, Edit2, Trash2, ChevronRight,
    BookOpen, Layers, Target, HelpCircle, ArrowLeft, Save
} from 'lucide-react';
import { courseService } from '../../services/courseService';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import styles from './Admin.module.css';

const AdminDashboard = () => {
    const { user } = useAuth();

    // Navigation State
    const [view, setView] = useState('courses'); // courses, units, chapters, content
    const [selection, setSelection] = useState({ course: null, unit: null, chapter: null });

    // Data State
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editItem, setEditItem] = useState(null);

    // Form State
    const [formData, setFormData] = useState({});

    useEffect(() => {
        if (user) {
            loadViewData();
        }
    }, [view, selection, user]);

    const loadViewData = async () => {
        setLoading(true);
        try {
            let res;
            if (view === 'courses') {
                res = await courseService.getAllCourses();
            } else if (view === 'units') {
                res = await courseService.getUnits(selection.course.id);
            } else if (view === 'chapters') {
                res = await courseService.getChapters(selection.unit.id);
            } else if (view === 'content') {
                res = await courseService.getChapterContent(selection.chapter.id);
            }
            setData(res || []);
        } catch (err) {
            console.error('Fetch error:', err);
            alert('Failed to load data: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleNavigate = (nextView, item = null) => {
        if (nextView === 'units') setSelection({ ...selection, course: item });
        if (nextView === 'chapters') setSelection({ ...selection, unit: item });
        if (nextView === 'content') setSelection({ ...selection, chapter: item });
        if (nextView === 'courses') setSelection({ course: null, unit: null, chapter: null });
        setView(nextView);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure?')) return;
        try {
            if (view === 'courses') await courseService.deleteCourse(id);
            else if (view === 'units') await courseService.deleteUnit(id);
            else if (view === 'chapters') await courseService.deleteChapter(id);
            loadViewData();
        } catch (err) { alert(err.message); }
    };

    const handleOpenModal = (item = null) => {
        setEditItem(item);
        if (item) {
            if (view === 'content') {
                // Prep content form with nested MCQ
                const mcq = item.mcq_questions?.[0] || {};
                setFormData({
                    title: item.title,
                    content: item.content,
                    order_index: item.order_index,
                    mcq: {
                        id: mcq.id,
                        question_text: mcq.question_text,
                        options: mcq.mcq_options || [{}, {}, {}, {}]
                    }
                });
            } else {
                setFormData({ title: item.title, order_index: item.order_index, ...item });
            }
        } else {
            setFormData({
                title: '',
                order_index: data.length + 1,
                mcq: { question_text: '', options: [{}, {}, {}, {}] }
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            console.log('--- START SAVE OPERATION ---');
            console.log('View:', view);
            console.log('Edit Item:', editItem);

            let result;
            if (view === 'courses') {
                const coursePayload = {
                    title: formData.title,
                    image_url: formData.image_url || null,
                    is_featured: formData.is_featured || false,
                };
                console.log('Payload:', coursePayload);
                if (editItem) {
                    result = await courseService.updateCourse(editItem.id, coursePayload);
                } else {
                    result = await courseService.createCourse(coursePayload);
                }
            } else if (view === 'units') {
                const unitPayload = {
                    title: formData.title,
                    order_index: parseInt(formData.order_index) || 0,
                    course_id: selection.course.id
                };
                console.log('Payload:', unitPayload);
                if (editItem) {
                    result = await courseService.updateUnit(editItem.id, unitPayload);
                } else {
                    result = await courseService.createUnit(unitPayload);
                }
            } else if (view === 'chapters') {
                const chapterPayload = {
                    title: formData.title,
                    order_index: parseInt(formData.order_index) || 0,
                    unit_id: selection.unit.id
                };
                console.log('Payload:', chapterPayload);
                if (editItem) {
                    result = await courseService.updateChapter(editItem.id, chapterPayload);
                } else {
                    result = await courseService.createChapter(chapterPayload);
                }
            } else if (view === 'content') {
                // Handle Learning Point + MCQ Saving
                const lpPayload = {
                    chapter_id: selection.chapter.id,
                    title: formData.title,
                    content: formData.content,
                    order_index: formData.order_index || data.length + 1
                };

                // 1. Save Learning Point
                const savedLP = await courseService.saveLearningPoint(
                    editItem ? { id: editItem.id, ...lpPayload } : lpPayload
                );

                // 2. Save MCQ if exists
                if (formData.mcq?.question_text) {
                    const qPayload = {
                        learning_point_id: savedLP.id,
                        question_text: formData.mcq.question_text,
                        order_index: 0
                    };
                    const savedQ = await courseService.saveQuestion(
                        formData.mcq.id ? { id: formData.mcq.id, ...qPayload } : qPayload
                    );

                    // 3. Save Options
                    if (formData.mcq.options) {
                        await courseService.saveOptions(savedQ.id, formData.mcq.options);
                    }
                }
                result = savedLP;
            }

            console.log('Result from Supabase:', result);
            console.log('--- SAVE OPERATION SUCCESSFUL ---');

            setIsModalOpen(false);
            loadViewData();
        } catch (err) {
            console.error('--- SAVE OPERATION FAILED ---');
            console.error('Error Object:', err);
            alert('Error saving data: ' + (err.message || 'Check console for details'));
        } finally {
            setSaving(false);
        }
    };

    const renderBreadcrumbs = () => (
        <div className={styles.breadcrumbs}>
            <span onClick={() => handleNavigate('courses')}>Courses</span>
            {selection.course && (
                <>
                    <ChevronRight size={14} />
                    <span onClick={() => handleNavigate('units', selection.course)}>{selection.course.title}</span>
                </>
            )}
            {selection.unit && (
                <>
                    <ChevronRight size={14} />
                    <span onClick={() => handleNavigate('chapters', selection.unit)}>{selection.unit.title}</span>
                </>
            )}
            {selection.chapter && (
                <>
                    <ChevronRight size={14} />
                    <span>{selection.chapter.title}</span>
                </>
            )}
        </div>
    );

    if (!user) {
        return (
            <div className={styles.adminLayout}>
                <div style={{ padding: '20px', color: 'white', textAlign: 'center', width: '100%' }}>
                    <h1>Access Denied</h1>
                    <p>Please log in with an admin account.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.adminLayout}>
            <aside className={styles.sidebar}>
                <div className={styles.logoArea}><div className={styles.logoText}>ও-শেখা Admin</div></div>
                <nav className={styles.navMenu}>
                    <div className={`${styles.navItem} ${view === 'courses' ? styles.activeNavItem : ''}`} onClick={() => handleNavigate('courses')}>
                        <LayoutDashboard size={20} /><span>Curriculum</span>
                    </div>
                </nav>
            </aside>

            <main className={styles.mainContent}>
                <header className={styles.header}>
                    <div className={styles.titleSection}>
                        {renderBreadcrumbs()}
                        <h1>{view.charAt(0).toUpperCase() + view.slice(1)} Management</h1>
                    </div>
                    {view !== 'content' && (
                        <button className={styles.submitBtn} onClick={() => handleOpenModal()}>
                            <Plus size={20} /> New {view.slice(0, -1)}
                        </button>
                    )}
                </header>

                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Name / Details</th>
                                <th>Order</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? <tr><td colSpan="3">Loading...</td></tr> : data.map(item => (
                                <tr key={item.id} className={styles.courseRow}>
                                    <td onClick={() => {
                                        if (view === 'courses') handleNavigate('units', item);
                                        else if (view === 'units') handleNavigate('chapters', item);
                                        // For content, we don't drill further in the same way, we edit it
                                    }} style={{ cursor: view !== 'content' ? 'pointer' : 'default' }}>
                                        <div className={styles.courseInfo}>
                                            <span className={styles.courseTitle}>
                                                {view === 'content' ? `Node ${item.order_index}: ${item.title || 'Untitled Node'}` : (item.title || item.question_text)}
                                            </span>
                                            {view === 'content' && (
                                                <div className={styles.contentPreview}>
                                                    {item.mcq_questions?.length > 0 ?
                                                        `${item.mcq_questions.length} MCQ Included` :
                                                        'No MCQ attached'}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td>{item.order_index}</td>
                                    <td>
                                        <div className={styles.actions}>
                                            <button className={`${styles.actionBtn} ${styles.editBtn}`} onClick={(e) => { e.stopPropagation(); handleOpenModal(item); }}>
                                                <Edit2 size={16} />
                                            </button>
                                            <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {isModalOpen && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal}>
                            <h2>{editItem ? 'Edit' : 'Create'} {view.slice(0, -1)}</h2>
                            <form onSubmit={handleSubmit}>
                                {view === 'content' ? (
                                    <>
                                        <div className={styles.formSection}>
                                            <h3>1. Learning Point (Explanation)</h3>
                                            <div className={styles.formGroup}>
                                                <label className={styles.label}>Section Title</label>
                                                <input
                                                    type="text" className={styles.input}
                                                    value={formData.title || ''}
                                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div className={styles.formGroup}>
                                                <label className={styles.label}>Instructions/Content</label>
                                                <textarea
                                                    className={styles.input} rows="3"
                                                    value={formData.content || ''}
                                                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                                                    placeholder="Explain the topic here..."
                                                />
                                            </div>
                                        </div>

                                        <div className={styles.formSection}>
                                            <h3>2. MCQ Question</h3>
                                            <div className={styles.formGroup}>
                                                <label className={styles.label}>Question Text</label>
                                                <input
                                                    type="text" className={styles.input}
                                                    value={formData.mcq?.question_text || ''}
                                                    onChange={e => setFormData({
                                                        ...formData,
                                                        mcq: { ...(formData.mcq || {}), question_text: e.target.value }
                                                    })}
                                                />
                                            </div>

                                            <div className={styles.optionsList}>
                                                <label className={styles.label}>Options (Mark the bullet for correct answer)</label>
                                                {[0, 1, 2, 3].map(idx => (
                                                    <div key={idx} className={styles.optionRow}>
                                                        <input
                                                            type="radio" name="correct"
                                                            checked={formData.mcq?.options?.[idx]?.is_correct === true}
                                                            onChange={() => {
                                                                const opts = [...(formData.mcq?.options || [{}, {}, {}, {}])];
                                                                opts.forEach((o, i) => o.is_correct = (i === idx));
                                                                setFormData({ ...formData, mcq: { ...formData.mcq, options: opts } });
                                                            }}
                                                        />
                                                        <input
                                                            type="text" className={styles.input}
                                                            placeholder={`Option ${idx + 1}`}
                                                            value={formData.mcq?.options?.[idx]?.option_text || ''}
                                                            onChange={e => {
                                                                const opts = [...(formData.mcq?.options || [{}, {}, {}, {}])];
                                                                opts[idx] = { ...opts[idx], option_text: e.target.value };
                                                                setFormData({ ...formData, mcq: { ...formData.mcq, options: opts } });
                                                            }}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className={styles.formGroup}>
                                            <label className={styles.label}>Title</label>
                                            <input
                                                type="text"
                                                className={styles.input}
                                                value={formData.title || ''}
                                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                                required
                                            />
                                        </div>
                                        {view === 'courses' ? (
                                            <>
                                                <div className={styles.formGroup}>
                                                    <label className={styles.label}>Image URL</label>
                                                    <input
                                                        type="text"
                                                        className={styles.input}
                                                        value={formData.image_url || ''}
                                                        onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                                                        placeholder="https://..."
                                                    />
                                                </div>
                                                <div className={styles.formGroup}>
                                                    <label className={styles.checkboxGroup}>
                                                        <input
                                                            type="checkbox"
                                                            className={styles.checkbox}
                                                            checked={formData.is_featured || false}
                                                            onChange={e => setFormData({ ...formData, is_featured: e.target.checked })}
                                                        />
                                                        <span className={styles.label} style={{ marginBottom: 0 }}>Featured</span>
                                                    </label>
                                                </div>
                                            </>
                                        ) : (
                                            <div className={styles.formGroup}>
                                                <label className={styles.label}>Order Index</label>
                                                <input
                                                    type="number"
                                                    className={styles.input}
                                                    value={formData.order_index || 0}
                                                    onChange={e => setFormData({ ...formData, order_index: e.target.value })}
                                                    required
                                                />
                                            </div>
                                        )}
                                    </>
                                )}
                                <div className={styles.modalActions}>
                                    <button type="button" className={styles.cancelBtn} onClick={() => setIsModalOpen(false)} disabled={saving}>Cancel</button>
                                    <button type="submit" className={styles.submitBtn} disabled={saving}>
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default AdminDashboard;
