import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
import { CheckCircle2, XCircle, Search, Award, Calendar, User, BookOpen } from 'lucide-react';
import logoImg from '../../../assets/shields/Logo_BeeLesson.png';
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
                    .select('*, courses(title), profiles(full_name, avatar_url, display_name)')
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
                         <img src={logoImg} alt="BeeLesson Logo" className={styles.beeLogo} />
                         <span>Verification</span>
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
                        <div className={styles.titleRow}>
                            <h1 className={styles.successTitle}>Official Certificate</h1>
                            <div className={styles.statusBadge}>
                                <CheckCircle2 size={16} />
                                <span>Verified</span>
                            </div>
                        </div>
                        
                        <div className={styles.recipientHeader}>
                            <div className={styles.avatarBox}>
                                {certificate.profiles?.avatar_url ? (
                                    <img src={certificate.profiles.avatar_url} alt="" className={styles.avatarImg} />
                                ) : (
                                    <div className={styles.avatarPlaceholder}><User size={24} /></div>
                                )}
                            </div>
                            <div className={styles.recipientInfo}>
                                <div className={styles.label}>CERTIFIED LEARNER</div>
                                <h2 className={styles.name}>{certificate.profiles?.full_name}</h2>
                            </div>
                        </div>

                        <div className={styles.detailsGrid}>
                            <div className={styles.detailItem}>
                                <div className={styles.detailContent}>
                                    <label>Course Completion</label>
                                    <span>{certificate.courses?.title}</span>
                                </div>
                            </div>
                            <div className={styles.detailItem}>
                                <div className={styles.detailContent}>
                                    <label>Issue Date</label>
                                    <span>{new Date(certificate.issued_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                </div>
                            </div>
                        </div>

                        <div className={styles.idBox}>
                            <div className={styles.idLabel}>VERIFICATION ID</div>
                            <code>{certificate.verification_code}</code>
                        </div>

                        <button className={styles.homeBtn} onClick={() => navigate('/')}>
                            Continue Learning
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
