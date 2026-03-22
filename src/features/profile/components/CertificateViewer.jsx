import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';
import { Download, Share2, X, Check, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './CertificateViewer.module.css';
import logoImg from '../../../assets/shields/Logo_BeeLesson.png';
import signatureImg from '../../../assets/shields/signature.png';

export const CertificateViewer = ({ certificate, learnerName, onClose }) => {
    const certRef = useRef(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [copied, setCopied] = useState(false);

    const verificationUrl = `${window.location.origin}/verify/${certificate.certificate?.verification_code || 'DEMO'}`;

    const downloadCertificate = async () => {
        const node = certRef.current;
        if (!node) return;

        setIsDownloading(true);

        let captureContainer = null;

        try {
            await new Promise(resolve => setTimeout(resolve, 300));

            // Create container for isolation
            captureContainer = document.createElement('div');
            Object.assign(captureContainer.style, {
                position: 'fixed',
                top: '0',
                left: '-10000px',
                width: '1056px',
                height: '747px',
                background: '#fff',
                zIndex: '-9999',
                overflow: 'hidden'
            });

            // Clone the certificate 
            const clone = node.cloneNode(true);

            // Add the FORCE DESKTOP class
            clone.classList.add(styles.isDesktopCapture);

            captureContainer.appendChild(clone);
            document.body.appendChild(captureContainer);

            // Let fonts and layout settle
            await new Promise(resolve => setTimeout(resolve, 500));

            const dataUrl = await toPng(clone, {
                pixelRatio: 2.2,
                cacheBust: true,
                backgroundColor: '#ffffff',
                includeFont: true
            });

            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `Certificate_${certificate.course_title.replace(/\s+/g, '_')}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (err) {
            console.error('Download error:', err);
            if (!err.message?.includes('cssRules')) {
                alert('An error occurred. Please try taking a screenshot or use desktop.');
            }
        } finally {
            if (captureContainer && document.body.contains(captureContainer)) {
                document.body.removeChild(captureContainer);
            }
            setIsDownloading(false);
        }
    };

    const shareCertificate = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'BeeLesson Certificate',
                    text: `I've successfully completed "${certificate.course_title}" on BeeLesson! Check my verified certificate:`,
                    url: verificationUrl
                });
            } catch (err) {
                console.log('Share failed or cancelled');
            }
        } else {
            copyToClipboard();
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(verificationUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <AnimatePresence>
            <motion.div
                className={styles.modalOverlay}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className={styles.modalContent}
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    onClick={e => e.stopPropagation()}
                >
                    <div className={styles.header}>
                        <h2 className={styles.modalTitle}>Your Certificate</h2>
                        <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
                    </div>

                    <div className={styles.certWrapper}>
                        {/* THE ACTUAL CERTIFICATE (Hidden from normal flow but captured by html-to-image) */}
                        <div ref={certRef} className={styles.certificate}>
                            <div className={styles.certInner}>
                                {/* Border Decoration */}
                                <div className={styles.borderDecorTL}></div>
                                <div className={styles.borderDecorTR}></div>
                                <div className={styles.borderDecorBL}></div>
                                <div className={styles.borderDecorBR}></div>

                                <div className={styles.content}>
                                    <div className={styles.logoSection}>
                                        <div className={styles.logoImgBox}>
                                            <img src={logoImg} alt="BeeLesson Logo" className={styles.certLogoImg} />
                                        </div>
                                    </div>

                                    <div className={styles.mainHeading}>CERTIFICATE OF COMPLETION</div>
                                    <div className={styles.subtext}>This is to certify that</div>
                                    <div className={styles.learnerName}>{learnerName}</div>

                                    <div className={styles.courseDetails}>
                                        has successfully completed the course <span className={styles.highlight}> {certificate.course_title} </span>
                                        <br />
                                        offered by <span className={styles.highlight}>BeeLesson.com</span> on {new Date(certificate.certificate?.issued_at || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.
                                    </div>

                                    <div className={styles.certFooter}>
                                        <div className={styles.signatureSection}>
                                            <div className={styles.signatureBox}>
                                                <img src={signatureImg} alt="Authorized Signature" className={styles.signatureImg} />
                                            </div>
                                            <div className={styles.signatureLine}></div>
                                            <p className={styles.signatureLabel}>Authorized Signature</p>
                                            <p className={styles.siteUrl}>BeeLesson.com</p>
                                        </div>

                                        <div className={styles.qrSection}>
                                            <div className={styles.qrCode}>
                                                <QRCodeSVG
                                                    value={verificationUrl}
                                                    size={80}
                                                    includeMargin={true}
                                                    level="M"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.actions}>
                        <button
                            className={styles.downloadBtn}
                            onClick={downloadCertificate}
                            disabled={isDownloading}
                        >
                            <span>{isDownloading ? 'Generating...' : 'Download Certificate'}</span>
                        </button>
                        <button className={styles.shareBtn} onClick={shareCertificate}>
                            <Share2 size={18} /> Share Link
                        </button>
                        <button className={styles.copyBtn} onClick={copyToClipboard}>
                            {copied ? <Check size={18} color="#2ECC71" /> : <Copy size={18} />}
                            {copied ? 'Copied!' : 'Copy Link'}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default CertificateViewer;
