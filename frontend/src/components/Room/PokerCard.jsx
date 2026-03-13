import React from 'react';

const SUIT_SYMBOLS = {
    'H': '♥', 'D': '♦', 'C': '♣', 'S': '♠'
};
const SUIT_COLORS = {
    'H': '#ff2a2a', 'D': '#ff2a2a', 'C': '#1a1a1a', 'S': '#1a1a1a'
};

export default function PokerCard({ card, hidden, width = 60, rotate = 0 }) {
    const height = width * 1.4;

    if (hidden || !card) {
        return (
            <div className="card-deal" style={{
                '--target-rotate': `${rotate}deg`,
                width: `${width}px`, height: `${height}px`,
                background: 'linear-gradient(135deg, #0a1931 0%, #150e56 100%)',
                border: '3px solid #ffd700',
                borderRadius: `${width * 0.12}px`,
                boxShadow: '0 10px 20px rgba(0,0,0,0.8), inset 0 0 30px rgba(255,215,0,0.1)',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                transform: `rotate(${rotate}deg)`, transition: 'transform 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
                position: 'relative', overflow: 'hidden'
            }}>
                {/* Gold Pattern Inside */}
                <div style={{
                    width: '85%', height: '88%',
                    border: '1px solid rgba(255,215,0,0.3)',
                    borderRadius: '6px',
                    background: 'url("https://www.transparenttextures.com/patterns/cubes.png")',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#ffd700', fontSize: `${width * 0.4}px`
                }}>
                    ♣
                </div>
            </div>
        );
    }

    const value = card[0].replace('T', '10');
    const suit = card[1];
    const symbol = SUIT_SYMBOLS[suit];
    const color = SUIT_COLORS[suit];

    return (
        <div className="card-deal" style={{
            '--target-rotate': `${rotate}deg`,
            width: `${width}px`, height: `${height}px`,
            background: '#ffffff', border: '1px solid #dcdcdc',
            borderRadius: `${width * 0.12}px`,
            boxShadow: '0 5px 15px rgba(0,0,0,0.6)',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            padding: `${width * 0.06}px`, position: 'relative',
            color: color, transform: `rotate(${rotate}deg)`, transition: 'transform 0.3s ease',
            fontFamily: '"Outfit", sans-serif', userSelect: 'none'
        }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', alignSelf: 'flex-start', lineHeight: '0.9' }}>
                <span style={{ fontSize: `${width * 0.35}px`, fontWeight: '900', letterSpacing: '-1px' }}>{value}</span>
                <span style={{ fontSize: `${width * 0.3}px` }}>{symbol}</span>
            </div>

            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: `${width * 0.8}px`, opacity: 0.9 }}>
                {symbol}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', alignSelf: 'flex-end', transform: 'rotate(180deg)', lineHeight: '0.9' }}>
                <span style={{ fontSize: `${width * 0.35}px`, fontWeight: '900', letterSpacing: '-1px' }}>{value}</span>
                <span style={{ fontSize: `${width * 0.3}px` }}>{symbol}</span>
            </div>
        </div>
    );
}
