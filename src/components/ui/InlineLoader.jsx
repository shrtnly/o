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
            <p style={{ color: 'var(--color-primary)', fontWeight: '700' }}>লোড হচ্ছে...</p>
        </div>
    );
};

export default InlineLoader;
