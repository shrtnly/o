import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const InlineLoader = ({ size = 200 }) => {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            padding: '40px 0'
        }}>
            <div style={{ width: size, height: size }}>
                <DotLottieReact
                    src="https://lottie.host/7bde8b69-e083-4fe4-aa64-4cdb96768053/bLH3ZaeDzm.lottie"
                    loop
                    autoplay
                />
            </div>
            <p style={{ color: 'var(--color-primary)', fontWeight: '700', marginTop: '-20px' }}>লোড হচ্ছে...</p>
        </div>
    );
};

export default InlineLoader;
