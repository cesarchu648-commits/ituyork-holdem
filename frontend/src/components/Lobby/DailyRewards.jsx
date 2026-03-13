import React, { useState, useEffect, useMemo } from 'react';
import { useSocket } from '../../context/useSocket';
import { Gift, CheckCircle, Box, Star } from 'lucide-react';

const REWARDS = [
    { day: 1, fichas: 500, gold: 0 },
    { day: 2, fichas: 1000, gold: 0 },
    { day: 3, fichas: 1500, gold: 0 },
    { day: 4, fichas: 2000, gold: 0 },
    { day: 5, fichas: 2500, gold: 0 },
    { day: 6, fichas: 3000, gold: 10 },
    { day: 7, fichas: 10000, gold: 100, legendary: true }
];

export default function DailyRewards ( { user, onClose } )
{
    const { socket } = useSocket();
    const claimedToday = useMemo( () =>
    {
        if ( !user.lastClaimDate ) return false;
        const last = new Date( user.lastClaimDate );
        const now = new Date();
        return last.getDate() === now.getDate() &&
            last.getMonth() === now.getMonth() &&
            last.getFullYear() === now.getFullYear();
    }, [ user.lastClaimDate ] );

    const [ justClaimed, setJustClaimed ] = useState( false );
    const [ animationDay, setAnimationDay ] = useState( 0 );

    useEffect( () =>
    {
        if ( socket )
        {
            socket.on( 'daily_reward_claim_success', ( data ) =>
            {
                setAnimationDay( data.day );
                setJustClaimed( true );
            } );
            return () => socket.off( 'daily_reward_claim_success' );
        }
    }, [ socket ] );

    const handleClaim = () =>
    {
        if ( socket && !claimedToday && !justClaimed )
        {
            socket.emit( 'claim_daily_reward' );
        }
    };

    return (
        <div style={ { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(15px)' } }>
            <div className="glass-panel fade-in" style={ { width: '800px', padding: '40px', textAlign: 'center' } }>
                <h2 className="neon-text-gold" style={ { fontSize: '2.5rem', marginBottom: '10px' } }>Recompensas Diarias</h2>
                <p style={ { color: 'var(--color-text-muted)', marginBottom: '30px' } }>¡Inicia sesión todos los días para desbloquear el Cofre Legendario!</p>

                <div style={ { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', marginBottom: '40px' } }>
                    { REWARDS.map( r =>
                    {
                        const isClaimed = r.day <= user.consecutiveDays;
                        const isNext = r.day === ( user.consecutiveDays || 0 ) + 1 && !claimedToday && !justClaimed;
                        const isAnimating = animationDay === r.day;

                        return (
                            <div key={ r.day } className="glass-panel" style={ {
                                padding: '15px 5px', height: '140px', display: 'flex', flexDirection: 'column',
                                justifyContent: 'center', alignItems: 'center', gap: '10px',
                                border: isNext ? '2px solid var(--color-neon-blue)' : ( isClaimed ? '1px solid var(--color-neon-green)' : '1px solid var(--glass-border)' ),
                                boxShadow: isNext ? '0 0 15px var(--color-neon-blue)' : 'none',
                                background: isClaimed ? 'rgba(57, 255, 20, 0.05)' : 'transparent',
                                position: 'relative',
                                transform: isAnimating ? 'scale(1.1)' : 'scale(1)',
                                transition: 'all 0.3s'
                            } }>
                                { isClaimed && <CheckCircle size={ 16 } color="#39ff14" style={ { position: 'absolute', top: 5, right: 5 } } /> }
                                <span style={ { fontSize: '0.7rem', color: 'gray' } }>Día { r.day }</span>
                                <div style={ { color: r.legendary ? 'var(--color-gold)' : ( isClaimed ? '#39ff14' : 'gray' ) } }>
                                    { r.legendary ? <Star size={ 30 } className="animate-neon-bounce" /> : <Gift size={ 24 } /> }
                                </div>
                                <div style={ { fontSize: '0.7rem', fontWeight: 'bold' } }>
                                    { r.fichas.toLocaleString() } <br /> FICHAS
                                </div>
                                { r.gold > 0 && (
                                    <div style={ { fontSize: '0.7rem', color: 'var(--color-gold)' } }>+{ r.gold } GOLD</div>
                                ) }
                            </div>
                        );
                    } ) }
                </div>

                { ( !claimedToday && !justClaimed ) ? (
                    <button className="btn btn-gold" onClick={ handleClaim } style={ { padding: '15px 60px', fontSize: '1.2rem', boxShadow: '0 0 30px rgba(255,215,0,0.4)' } }>
                        RECLAMAR PREMIO DE HOY
                    </button>
                ) : (
                    <div style={ { textAlign: 'center' } }>
                        <div className="neon-text-green" style={ { fontSize: '1.2rem', marginBottom: '20px' } }>¡Vuelve en 24 horas para tu siguiente premio!</div>
                        <button className="btn btn-glass" onClick={ onClose }>Cerrar Calendario</button>
                    </div>
                ) }

                { animationDay === 7 && (
                    <div className="winner-celebration" style={ { marginTop: '20px' } }>
                        <h3 className="neon-text-gold">¡Día 7 Completado! Cofre Legendario Abierto</h3>
                    </div>
                ) }
            </div>
        </div>
    );
}
