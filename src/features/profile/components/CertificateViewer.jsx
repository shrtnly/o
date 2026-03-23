import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';
import { Download, Share2, X, Check, Copy, Twitter, Facebook, Linkedin, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './CertificateViewer.module.css';
import logoImg from '../../../assets/shields/Logo_BeeLesson.png';
import signatureImg from '../../../assets/shields/signature.png';

export const CertificateViewer = ({ certificate, learnerName, onClose }) => {
    const certRef = useRef(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [showShareMenu, setShowShareMenu] = useState(false);
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

    const getCertificateFile = async () => {
        const node = certRef.current;
        if (!node) return null;

        let captureContainer = null;
        try {
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

            const clone = node.cloneNode(true);
            clone.classList.add(styles.isDesktopCapture);
            captureContainer.appendChild(clone);
            document.body.appendChild(captureContainer);

            await new Promise(resolve => setTimeout(resolve, 500));

            const dataUrl = await toPng(clone, {
                pixelRatio: 2.2,
                cacheBust: true,
                backgroundColor: '#ffffff',
                includeFont: true
            });

            const res = await fetch(dataUrl);
            const blob = await res.blob();
            return new File([blob], `Certificate_${certificate.course_title.replace(/\s+/g, '_')}.png`, { type: 'image/png' });

        } catch (err) {
            console.error('File generation error:', err);
            return null;
        } finally {
            if (captureContainer && document.body.contains(captureContainer)) {
                document.body.removeChild(captureContainer);
            }
        }
    };

    const getShareContent = () => {
        const title = certificate.course_title;
        const url = verificationUrl;
        const text = `I'm so proud to share that I've successfully completed the course "${title}" on BeeLesson.com! 🐝🎓\n\nIt was an amazing learning journey and I've gained valuable skills. Check out my verified certificate here:`;
        const hashtags = "#BeeLesson #Learning #Certificate #Education #CourseCompletion #Skills";
        
        return { title, text, url, hashtags };
    };

    const shareCertificate = async () => {
        const { text, url, hashtags } = getShareContent();

        if (navigator.share) {
            setIsSharing(true);
            try {
                // For Mobile: Attempt to include the generated image
                const file = await getCertificateFile();
                
                if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        title: 'My BeeLesson Certificate',
                        text: `${text}\n\n${url}\n\n${hashtags}`,
                        files: [file]
                    });
                } else {
                    await navigator.share({
                        title: 'My BeeLesson Certificate',
                        text: `${text}\n\n${url}\n\n${hashtags}`,
                        url: url
                    });
                }
            } catch (err) {
                console.log('Share failed or cancelled', err);
            } finally {
                setIsSharing(false);
            }
        } else {
            setShowShareMenu(true);
        }
    };

    const handleSocialShare = (platform) => {
        const { text, url, hashtags } = getShareContent();
        const fullPost = `${text}\n\n${url}\n\n${hashtags}`;
        const encodedCombined = encodeURIComponent(fullPost);

        // Copy to clipboard as a fallback/helper for all platforms
        copyToClipboard(fullPost);

        let shareUrl = '';
        switch (platform) {
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?text=${encodedCombined}`;
                break;
            case 'facebook':
                // Facebook 'quote' is mostly deprecated, so we rely on clipboard + share URL
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
                break;
            case 'linkedin':
                shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
                break;
            case 'whatsapp':
                shareUrl = `https://wa.me/?text=${encodedCombined}`;
                break;
            default:
                break;
        }

        if (shareUrl) {
            window.open(shareUrl, '_blank', 'width=600,height=400');
        }
        setShowShareMenu(false);
    };

    const copyToClipboard = (text) => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }).catch(() => {
                // Fallback to execCommand if clipboard API fails
                fallbackCopyToClipboard(text);
            });
        } else {
            fallbackCopyToClipboard(text);
        }
    };

    const fallbackCopyToClipboard = (text) => {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Fallback copy failed:', err);
        }
        document.body.removeChild(textArea);
    };

    const handleCopyLink = () => {
        copyToClipboard(verificationUrl);
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
                        <div className={styles.btnGroup}>
                            <button
                                className={styles.downloadBtn}
                                onClick={downloadCertificate}
                                disabled={isDownloading || isSharing}
                            >
                                <span>{isDownloading ? 'Generating...' : 'Download Certificate'}</span>
                            </button>
                            <div className={styles.shareWrapper}>
                                <button
                                    className={styles.shareBtn}
                                    onClick={shareCertificate}
                                    disabled={isDownloading || isSharing}
                                >
                                    <Share2 size={18} />
                                    <span>{isSharing ? 'Preparing Image...' : 'Share Certificate'}</span>
                                </button>

                                <AnimatePresence>
                                    {showShareMenu && (
                                        <motion.div
                                            className={styles.shareMenu}
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        >
                                            <div className={styles.shareMenuHeader}>
                                                <span>Share to</span>
                                                <button onClick={() => setShowShareMenu(false)}><X size={14} /></button>
                                            </div>
                                            <div className={styles.shareOptions}>
                                                <button onClick={() => handleSocialShare('facebook')} title="Facebook">
                                                    <Facebook size={20} fill="#1877F2" color="#1877F2" />
                                                </button>
                                                <button onClick={() => handleSocialShare('twitter')} title="Twitter">
                                                    <Twitter size={20} fill="#1DA1F2" color="#1DA1F2" />
                                                </button>
                                                <button onClick={() => handleSocialShare('linkedin')} title="LinkedIn">
                                                    <Linkedin size={20} fill="#0A66C2" color="#0A66C2" />
                                                </button>
                                                <button onClick={() => handleSocialShare('whatsapp')} title="WhatsApp">
                                                    <MessageCircle size={20} fill="#25D366" color="#25D366" />
                                                </button>
                                            </div>
                                            <div className={styles.shareMenuTip}>
                                                <span>💡 {copied ? 'Post text copied! You can paste it now.' : 'Tip: Post text is auto-copied to clipboard for pasting!'}</span>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        <button className={styles.copyBtn} onClick={handleCopyLink}>
                            {copied ? <Check size={18} color="#2ECC71" /> : <Copy size={18} />}
                            {copied ? 'Copied Link!' : 'Copy Link'}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default CertificateViewer;
