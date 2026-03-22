import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
import { CheckCircle2, XCircle, Search, Award, Calendar, User, BookOpen, GraduationCap } from 'lucide-react';
import LoadingScreen from '../../../components/ui/LoadingScreen';
import styles from './CertificateVerificationPage.module.css';

const CertificateVerificationPage = () => {
    const { code } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [certificate, setCertificate] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const verifyCertificate = async () => {
            try {
                setLoading(true);
                const { data, error: certError } = await supabase
                    .from('certificates')
                    .select('*, courses(title), profiles(full_name)')
                    .eq('verification_code', code)
                    .single();

                if (certError || !data) {
                    setError('Certificate not found or invalid verification code.');
                } else {
                    setCertificate(data);
                }
            } catch (err) {
                console.error('Verification error:', err);
                setError('An error occurred during verification.');
            } finally {
                setLoading(false);
            }
        };

        if (code) verifyCertificate();
    }, [code]);

    if (loading) return <LoadingScreen />;

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <div className={styles.logo}>
                         <GraduationCap size={32} color="#F1C40F" />
                         <span>BeeLesson <small>Verification</small></span>
                    </div>
                </div>

                {error ? (
                    <div className={styles.resultArea}>
                        <div className={styles.errorIcon}>
                            <XCircle size={64} color="#E74C3C" />
                        </div>
                        <h1 className={styles.errorTitle}>Verification Failed</h1>
                        <p className={styles.errorMsg}>{error}</p>
                        <button className={styles.homeBtn} onClick={() => navigate('/')}>
                            Go to BeeLesson
                        </button>
                    </div>
                ) : (
                    <div className={styles.resultArea}>
                        <div className={styles.successIcon}>
                            <CheckCircle2 size={64} color="#2ECC71" />
                        </div>
                        <h1 className={styles.successTitle}>Verified Certificate</h1>
                        <p className={styles.successMsg}>
                            This certificate was officially issued by BeeLesson and is valid.
                        </p>

                        <div className={styles.detailsGrid}>
                            <div className={styles.detailItem}>
                                <User size={18} />
                                <div className={styles.detailContent}>
                                    <label>Recipient</label>
                                    <span>{certificate.profiles?.full_name}</span>
                                </div>
                            </div>
                            <div className={styles.detailItem}>
                                <BookOpen size={18} />
                                <div className={styles.detailContent}>
                                    <label>Course Name</label>
                                    <span>{certificate.courses?.title}</span>
                                </div>
                            </div>
                            <div className={styles.detailItem}>
                                <Calendar size={18} />
                                <div className={styles.detailContent}>
                                    <label>Issued On</label>
                                    <span>{new Date(certificate.issued_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                </div>
                            </div>
                            <div className={styles.detailItem}>
                                <Search size={18} />
                                <div className={styles.detailContent}>
                                    <label>Verification Code</label>
                                    <span>{certificate.verification_code}</span>
                                </div>
                            </div>
                        </div>

                        <div className={styles.infoBox}>
                             <Award size={20} />
                             <p>This learner has demonstrated full mastery of all course modules.</p>
                        </div>

                        <button className={styles.homeBtn} onClick={() => navigate('/')}>
                            Explore More Courses
                        </button>
                    </div>
                )}
            </div>
            
            <footer className={styles.footer}>
                &copy; {new Date().getFullYear()} BeeLesson Learning Platform. All rights reserved.
            </footer>
        </div>
    );
};

export default CertificateVerificationPage;
