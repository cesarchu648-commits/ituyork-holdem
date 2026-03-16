import React from 'react';

export default function GlobalRanking({ onClose }) {
    return (
        <div style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: 'rgba(255,0,0,0.9)', 
            zIndex: 99999, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center' 
        }}>
            <div style={{ background: 'white', padding: '50px', borderRadius: '20px', color: 'black' }}>
                <h1 style={{ marginBottom: '20px' }}>DEBUG: RANKING WINDOW</h1>
                <button 
                    onClick={onClose} 
                    style={{ padding: '20px', fontSize: '20px', cursor: 'pointer' }}
                >
                    CLICK HERE TO CLOSE
                </button>
            </div>
        </div>
    );
}
