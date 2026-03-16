import React, { useState, useEffect } from 'react';
import { useSocket } from '../../context/useSocket';
import { Trophy, Award, Zap, Star, Shield, Users } from 'lucide-react';

export default function GlobalRank ( { onClose } )
{
    const { socket } = useSocket();
    const [ ranking, setRanking ] = useState( [] );
    const [ filter, setFilter ] = useState( 'historical' );

    useEffect( () =>
    {
        if ( socket )
        {
            socket.emit( 'get_filtered_ranking', filter );
            socket.on( 'filtered_ranking_update', (data) => {
                setRanking(data);
            });
            return () => socket.off( 'filtered_ranking_update' );
        }
    }, [ socket, filter ] );

    const top3 = ranking.slice( 0, 3 );
    const others = ranking.slice( 3 );

    return (
        <div style={ { 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: 'rgba(0,0,0,0.9)', 
            zIndex: 999999, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            backdropFilter: 'blur(10px)' 
        } }>
            <div className="glass-panel fade-in" style={ { width: '85vw', maxWidth: '800px', padding: '30px', maxHeight: '95vh', overflowY: 'auto', border: '2px solid var(--color-gold)' } }>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 className="neon-text-gold" style={ { fontSize: '2rem', margin: 0 } }>🏆 TOP 10 RANKING</h2>
                    <button className="btn btn-glass" onClick={ onClose } style={ { padding: '5px 15px' } }>X</button>
                </div>

                {/* Filter Tabs */ }
                <div style={ { display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '25px' } }>
                    { [
                        { id: 'historical', label: 'Nivel', icon: <Award size={ 16 } /> },
                        { id: 'best_hand', label: 'Manos', icon: <Trophy size={ 16 } /> },
                        { id: 'vip_tournaments', label: 'VIP/Torneos', icon: <Shield size={ 16 } /> },
                        { id: 'fichas_won', label: 'Fichas', icon: <Zap size={ 16 } /> },
                        { id: 'gold_won', label: 'Gold', icon: <Star size={ 16 } /> }
                    ].map( t => (
                        <button
                            key={ t.id }
                            className={ `btn ${ filter === t.id ? 'btn-gold' : 'btn-glass' }` }
                            onClick={ () => setFilter( t.id ) }
                            style={ { padding: '8px 12px', fontSize: '0.75rem' } }
                        >
                            { t.icon } { t.label }
                        </button>
                    ) ) }
                </div>

                {/* Podium */ }
                <div className="podium-container" style={{ margin: '60px 0 20px' }}>
                    { top3[ 1 ] && (
                        <div className="podium-step silver">
                            <div className="podium-avatar" style={ { background: '#c0c0c0' } } />
                            <Award size={ 20 } color="#c0c0c0" />
                            <span style={ { fontSize: '0.7rem', fontWeight: 'bold' } }>{ top3[ 1 ].username }</span>
                        </div>
                    ) }
                    { top3[ 0 ] && (
                        <div className="podium-step gold">
                            <div className="podium-avatar" style={ { background: '#ffd700', width: '50px', height: '50px', top: '-60px' } } />
                            <Trophy size={ 24 } color="#ffd700" />
                            <span style={ { fontSize: '0.8rem', fontWeight: 'bold' } }>{ top3[ 0 ].username }</span>
                        </div>
                    ) }
                    { top3[ 2 ] && (
                        <div className="podium-step bronze">
                            <div className="podium-avatar" style={ { background: '#cd7f32' } } />
                            <Award size={ 20 } color="#cd7f32" />
                            <span style={ { fontSize: '0.7rem', fontWeight: 'bold' } }>{ top3[ 2 ].username }</span>
                        </div>
                    ) }
                </div>

                {/* Others List */ }
                <div style={ { marginTop: '20px' } }>
                    <table style={ { width: '100%', borderCollapse: 'collapse' } }>
                        <thead>
                            <tr style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <th style={{ padding: '8px' }}>#</th>
                                <th style={{ padding: '8px' }}>Jugador</th>
                                <th style={{ padding: '8px', textAlign: 'right' }}>Logro</th>
                            </tr>
                        </thead>
                        <tbody>
                            { ranking.map( ( u, i ) => {
                                let displayStat = (u.fichas || 0).toLocaleString();
                                if (filter === 'historical') displayStat = `LVL ${u.level || 1}`;
                                if (filter === 'best_hand') displayStat = u.bestHandName || 'Carta Alta';
                                if (filter === 'vip_tournaments') displayStat = `${(u.tournamentsWon || 0) + (u.vipRoomsWon || 0)} 🏆`;
                                if (filter === 'fichas_won') displayStat = `${(u.totalFichasWon || 0).toLocaleString()} 🪙`;
                                if (filter === 'gold_won') displayStat = `${(u.totalGoldWon || 0).toLocaleString()} 💎`;

                                return (
                                    <tr key={ u.id } style={ { borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' } }>
                                        <td style={ { padding: '10px', color: 'gray' } }>#{ i + 1 }</td>
                                        <td style={ { padding: '10px', fontWeight: 'bold' } }>{ u.username }</td>
                                        <td style={ { padding: '10px', textAlign: 'right' } } className="neon-text-blue">
                                            {displayStat}
                                        </td>
                                    </tr>
                                );
                            } ) }
                            { ranking.length === 0 && (
                                <tr>
                                    <td colSpan="3" style={{ padding: '40px', textAlign: 'center', color: 'gray' }}>
                                        Cargando datos...
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div style={ { marginTop: '30px', textAlign: 'center' } }>
                    <button className="btn btn-glass" onClick={ onClose } style={ { width: '100%', padding: '15px' } }>Cerrar</button>
                </div>
            </div>
        </div>
    );
}
