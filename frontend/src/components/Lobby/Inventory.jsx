import React from 'react';
import { Package, Lock, Star, Shield, Zap } from 'lucide-react';

const ITEMS = [
    { id: 'Golden Card Skin', name: 'Baraja de Oro', icon: <Star />, type: 'Skin', rarity: 'Legendary' },
    { id: 'Legendary Aura', name: 'Aura Legendaria', icon: <Zap />, type: 'Effect', rarity: 'Legendary' },
    { id: 'Silver Shield', name: 'Escudo de Plata', icon: <Shield />, type: 'Badge', rarity: 'Rare' },
    { id: 'VIP Pass', name: 'Pase VIP', icon: <Package />, type: 'Access', rarity: 'Epic' },
];

export default function Inventory({ user, onClose }) {
    const userInventory = user.inventory || [];

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(10px)' }}>
            <div className="glass-panel fade-in" style={{ width: '600px', padding: '40px', position: 'relative' }}>
                <h2 className="neon-text-blue" style={{ marginBottom: '30px', textAlign: 'center', fontSize: '2rem' }}>Mi Inventario</h2>

                <div className="grid-3d" style={{ maxHeight: '400px', overflowY: 'auto', padding: '10px' }}>
                    {ITEMS.map(item => {
                        const isOwned = userInventory.includes(item.id);
                        return (
                            <div key={item.id} className={`card-3d ${!isOwned ? 'locked-item' : ''}`} style={{
                                position: 'relative',
                                border: isOwned ? `1px solid ${item.rarity === 'Legendary' ? 'var(--color-gold)' : 'var(--color-neon-blue)'}` : '1px solid rgba(255,255,255,0.1)'
                            }}>
                                {!isOwned && (
                                    <div style={{ position: 'absolute', top: 10, right: 10 }}>
                                        <Lock size={14} color="gray" />
                                    </div>
                                )}
                                <div style={{ fontSize: '2rem', marginBottom: '10px', color: isOwned ? (item.rarity === 'Legendary' ? 'var(--color-gold)' : 'var(--color-neon-blue)') : 'gray' }}>
                                    {item.icon}
                                </div>
                                <h4 style={{ fontSize: '0.9rem', marginBottom: '5px' }}>{item.name}</h4>
                                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>{item.type}</span>
                                {isOwned && (
                                    <div style={{ marginTop: '10px', fontSize: '0.7rem', color: 'var(--color-neon-green)' }}>DESBLOQUEADO</div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div style={{ marginTop: '30px', textAlign: 'center' }}>
                    <button className="btn btn-glass" onClick={onClose} style={{ padding: '12px 40px' }}>Cerrar</button>
                </div>
            </div>
        </div>
    );
}
