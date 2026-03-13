import React, { useState, useEffect } from 'react';
import { useSocket } from '../../context/useSocket';
import { Trophy, Medal, Calendar, Clock, Award } from 'lucide-react';

export default function GlobalRanking ( { onClose } )
{
    const { socket } = useSocket();
    const [ ranking, setRanking ] = useState( [] );
    const [ filter, setFilter ] = useState( 'historical' ); // 'daily', 'weekly', 'historical'

    useEffect( () =>
    {
        if ( socket )
        {
            socket.emit( 'get_filtered_ranking', filter );
            socket.on( 'filtered_ranking_update', setRanking );
            return () => socket.off( 'filtered_ranking_update' );
        }
    }, [ socket, filter ] );

    const top3 = ranking.slice( 0, 3 );
    const others = ranking.slice( 3 );

    return (
        <div style={ { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(10px)' } }>
            <div className="glass-panel fade-in" style={ { width: '700px', padding: '40px', maxHeight: '90vh', overflowY: 'auto' } }>
                <h2 className="neon-text-gold" style={ { textAlign: 'center', fontSize: '2rem', marginBottom: '30px' } }>🏆 Ranking Global</h2>

                {/* Filter Tabs */ }
                <div style={ { display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '30px' } }>
                    { [
                        { id: 'daily', label: 'Diario', icon: <Clock size={ 16 } /> },
                        { id: 'weekly', label: 'Semanal', icon: <Calendar size={ 16 } /> },
                        { id: 'historical', label: 'Histórico', icon: <Award size={ 16 } /> }
                    ].map( t => (
                        <button
                            key={ t.id }
                            className={ `btn ${ filter === t.id ? 'btn-gold' : 'btn-glass' }` }
                            onClick={ () => setFilter( t.id ) }
                            style={ { padding: '8px 20px', fontSize: '0.9rem' } }
                        >
                            { t.icon } { t.label }
                        </button>
                    ) ) }
                </div>

                {/* Podium */ }
                <div className="podium-container">
                    {/* Silver (Rank 2) */ }
                    { top3[ 1 ] && (
                        <div className="podium-step silver">
                            <div className="podium-avatar" style={ { background: '#c0c0c0' } } />
                            <Medal size={ 24 } color="#c0c0c0" style={ { marginTop: '10px' } } />
                            <span style={ { fontSize: '0.8rem', fontWeight: 'bold', marginTop: '5px' } }>{ top3[ 1 ].username }</span>
                            <span className="neon-text-blue" style={ { fontSize: '0.7rem' } }>LVL { top3[ 1 ].level }</span>
                        </div>
                    ) }
                    {/* Gold (Rank 1) */ }
                    { top3[ 0 ] && (
                        <div className="podium-step gold">
                            <div className="podium-avatar" style={ { background: '#ffd700', width: '50px', height: '50px', top: '-60px' } } />
                            <Trophy size={ 30 } color="#ffd700" style={ { marginTop: '10px' } } />
                            <span style={ { fontSize: '0.9rem', fontWeight: 'bold', marginTop: '5px' } }>{ top3[ 0 ].username }</span>
                            <span className="neon-text-gold" style={ { fontSize: '0.8rem' } }>LVL { top3[ 0 ].level }</span>
                        </div>
                    ) }
                    {/* Bronze (Rank 3) */ }
                    { top3[ 2 ] && (
                        <div className="podium-step bronze">
                            <div className="podium-avatar" style={ { background: '#cd7f32' } } />
                            <Medal size={ 24 } color="#cd7f32" style={ { marginTop: '10px' } } />
                            <span style={ { fontSize: '0.8rem', fontWeight: 'bold', marginTop: '5px' } }>{ top3[ 2 ].username }</span>
                            <span className="neon-text-blue" style={ { fontSize: '0.7rem' } }>LVL { top3[ 2 ].level }</span>
                        </div>
                    ) }
                </div>

                {/* Others List */ }
                <div style={ { marginTop: '40px' } }>
                    <table style={ { width: '100%', borderCollapse: 'collapse' } }>
                        <tbody>
                            { others.map( ( u, i ) => (
                                <tr key={ u.id } style={ { borderBottom: '1px solid rgba(255,255,255,0.05)' } }>
                                    <td style={ { padding: '12px', color: 'gray' } }>#{ i + 4 }</td>
                                    <td style={ { padding: '12px', fontWeight: 'bold' } }>{ u.username }</td>
                                    <td style={ { padding: '12px', textAlign: 'center' } }>
                                        <div style={ { background: 'rgba(0,240,255,0.1)', border: '1px solid var(--color-neon-blue)', borderRadius: '10px', fontSize: '0.7rem', padding: '2px 8px', display: 'inline-block' } }>
                                            Nivel { u.level }
                                        </div>
                                    </td>
                                    <td style={ { padding: '12px', textAlign: 'right' } } className="neon-text-blue">
                                        { filter === 'daily' ? `${(u.tournamentsWon || 0) + (u.vipRoomsWon || 0)} 🏆` : u.fichas.toLocaleString() + ' 🪙' }
                                    </td>
                                </tr>
                            ) ) }
                        </tbody>
                    </table>
                </div>

                <div style={ { marginTop: '30px', textAlign: 'center' } }>
                    <button className="btn btn-glass" onClick={ onClose } style={ { padding: '12px 40px' } }>Cerrar</button>
                </div>
            </div>
        </div>
    );
}
