import React, { useEffect, useState } from 'react';

export default function ChipsAnimation({ fromPos, onComplete }) {
    const [style, setStyle] = useState({
        position: 'absolute',
        left: fromPos.left,
        top: fromPos.top,
        bottom: fromPos.bottom,
        right: fromPos.right,
        transform: fromPos.transform || 'none',
        transition: 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        zIndex: 1000,
        pointerEvents: 'none',
        display: 'flex',
        gap: '2px'
    });

    useEffect(() => {
        const timer = setTimeout(() => {
            setStyle(prev => ({
                ...prev,
                left: '50%',
                top: '50%',
                bottom: 'auto',
                right: 'auto',
                transform: 'translate(-50%, -50%) scale(0.5)',
                opacity: 0
            }));
        }, 50);

        const endTimer = setTimeout(() => {
            if (onComplete) onComplete();
        }, 700);

        return () => {
            clearTimeout(timer);
            clearTimeout(endTimer);
        };
    }, [onComplete]);

    return (
        <div style={style}>
            {[1, 2, 3].map(i => (
                <div key={i} style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, #ffd700 0%, #b8860b 100%)',
                    border: '2px dashed rgba(255,255,255,0.5)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                    marginTop: `${i * -2}px`
                }} />
            ))}
        </div>
    );
}
