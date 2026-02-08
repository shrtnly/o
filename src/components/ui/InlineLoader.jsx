import React from 'react';

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
                <dotlottie-wc
                    src="https://lottie.host/e03ae8f1-72a8-4959-a9f6-ea75a0f49206/noztfmtntu.lottie"
                    style={{ width: '100%', height: '100%' }}
                    autoplay
                    loop
                ></dotlottie-wc>
            </div>
            <p style={{ color: 'var(--color-primary)', fontWeight: '700', marginTop: '-20px' }}>লোড হচ্ছে...</p>
        </div>
    );
};

export default InlineLoader;
