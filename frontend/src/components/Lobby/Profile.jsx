import React from 'react';
import { User, Shield, Target, Flame, TrendingUp } from 'lucide-react';

export default function Profile({ user, onClose }) {
    const nextLevelXp = (user.level || 1) * 200;
    const progress = ((user.xp || 0) / nextLevelXp) * 100;

    const stats = [
        { label: 'Agresividad', value: user.playStats?.aggressiveness || 50, icon: <Flame size={16} />, color: '#ff4b2b' },
        { label: 'Suerte', value: user.playStats?.luck || 50, icon: <Target size={16} />, color: '#39ff14' },
        { label: 'Faroleo', value: user.playStats?.bluff || 50, icon: <TrendingUp size={16} />, color: '#b500ff' }
    ];

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(10px)' }}>
            <div className="glass-panel fade-in" style={{ width: '550px', padding: '40px' }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <div style={{
                        width: '100px', height: '100px', borderRadius: '50%',
                        background: 'linear-gradient(45deg, #00f0ff, #b500ff)',
                        margin: '0 auto 15px', display: 'flex', justifyContent: 'center', alignItems: 'center',
                        boxShadow: '0 0 20px rgba(0,240,255,0.4)', border: '3px solid white'
                    }}>
                        <User size={50} color="white" />
                    </div>
                    <h2 style={{ fontSize: '1.8rem' }}>{user.username}</h2>
                    <p style={{ color: 'var(--color-neon-blue)', fontWeight: 'bold' }}>Nivel {user.level || 1}</p>
                </div>

                {/* Level Progress */}
                <div style={{ marginBottom: '30px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '5px' }}>
                        <span>Progreso de Nivel</span>
                        <span>{user.xp} / {nextLevelXp} XP</span>
                    </div>
                    <div className="chart-bar-container">
                        <div className="chart-bar-fill" style={{ width: `${progress}%` }} />
                    </div>
                </div>

                {/* Interactive Stats Charts */}
                <div style={{ marginBottom: '30px' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '15px', color: 'var(--color-text-muted)' }}>Estilo de Juego</h3>
                    {stats.map(s => (
                        <div key={s.label} style={{ marginBottom: '15px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '5px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ color: s.color }}>{s.icon}</span>
                                    {s.label}
                                </div>
                                <span style={{ fontWeight: 'bold' }}>{s.value}%</span>
                            </div>
                            <div className="chart-bar-container">
                                <div className="chart-bar-fill" style={{ width: `${s.value}%`, background: s.color }} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Insignias / Badges */}
                <div style={{ marginBottom: '30px' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '15px', color: 'var(--color-text-muted)' }}>Colección de Insignias</h3>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {(user.badges || []).length > 0 ? (
                            user.badges.map(b => (
                                <div key={b} style={{
                                    background: 'rgba(255,215,0,0.1)', border: '1px solid var(--color-gold)',
                                    padding: '5px 12px', borderRadius: '20px', fontSize: '0.7rem', color: 'var(--color-gold)',
                                    display: 'flex', alignItems: 'center', gap: '5px'
                                }}>
                                    <Shield size={12} /> {b}
                                </div>
                            ))
                        ) : (
                            <span style={{ color: 'gray', fontSize: '0.8rem italic' }}>Aún no tienes insignias.</span>
                        )}
                    </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                    <button className="btn btn-glass" onClick={onClose} style={{ padding: '12px 40px' }}>Cerrar</button>
                </div>
            </div>
        </div>
    );
}
