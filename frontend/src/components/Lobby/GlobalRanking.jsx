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
                <div style={ { display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '30px' } }>
                    { [
                        { id: 'historical', label: 'Nivel', icon: <Award size={ 16 } /> },
                        { id: 'best_hand', label: 'Manos', icon: <Trophy size={ 16 } /> },
                        { id: 'vip_tournaments', label: 'VIP/Torneos', icon: <Medal size={ 16 } /> },
                        { id: 'fichas_won', label: 'Fichas', icon: <Zap size={ 16 } /> },
                        { id: 'gold_won', label: 'Gold', icon: <Gem size={ 16 } /> }
                    ].map( t => (
                        <button
                            key={ t.id }
                            className={ `btn ${ filter === t.id ? 'btn-gold' : 'btn-glass' }` }
                            onClick={ () => setFilter( t.id ) }
                            style={ { padding: '8px 15px', fontSize: '0.8rem' } }
                        >
                            { t.icon } { t.label }
                        </button>
                    ) ) }
                </div>

                {/* Podium Rendering Logic adjustment */ }
                <div className="podium-container">
                    { top3.map((u, i) => {
                        const rank = [1, 0, 2][i]; // Gold, Silver, Bronze order in CSS usually
                        const player = top3[rank];
                        if (!player) return null;
                        
                        let displayStat = `LVL ${player.level}`;
                        if (filter === 'best_hand') displayStat = player.bestHandName;
                        if (filter === 'vip_tournaments') displayStat = `${(player.tournamentsWon || 0) + (player.vipRoomsWon || 0)} 🏆`;
                        if (filter === 'fichas_won') displayStat = `${player.totalFichasWon.toLocaleString()} 🪙`;
                        if (filter === 'gold_won') displayStat = `${player.totalGoldWon.toLocaleString()} 💎`;

                        const colors = ['#ffd700', '#c0c0c0', '#cd7f32'];
                        const classes = ['gold', 'silver', 'bronze'];
                        
                        return (
                            <div key={player.id} className={`podium-step ${classes[rank]}`}>
                                <div className="podium-avatar" style={ { background: colors[rank], width: rank === 0 ? '55px' : '45px', height: rank === 0 ? '55px' : '45px', top: rank === 0 ? '-70px' : '-55px' } } />
                                {rank === 0 ? <Trophy size={30} color={colors[rank]} /> : <Medal size={24} color={colors[rank]} />}
                                <span style={ { fontSize: rank === 0 ? '1rem' : '0.8rem', fontWeight: 'bold', marginTop: '5px' } }>{ player.username }</span>
                                <span className={rank === 0 ? "neon-text-gold" : "neon-text-blue"} style={ { fontSize: '0.75rem' } }>{displayStat}</span>
                            </div>
                        );
                    })}
                </div>

                {/* Others List */ }
                <div style={ { marginTop: '40px' } }>
                    <table style={ { width: '100%', borderCollapse: 'collapse' } }>
                        <thead>
                            <tr style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <th style={{ padding: '10px' }}>#</th>
                                <th style={{ padding: '10px' }}>Jugador</th>
                                <th style={{ padding: '10px', textAlign: 'center' }}>Nivel</th>
                                <th style={{ padding: '10px', textAlign: 'right' }}>Logro</th>
                            </tr>
                        </thead>
                        <tbody>
                            { others.map( ( u, i ) => {
                                let displayStat = u.fichas.toLocaleString() + ' 🪙';
                                if (filter === 'historical') displayStat = `Nivel ${u.level}`;
                                if (filter === 'best_hand') displayStat = u.bestHandName;
                                if (filter === 'vip_tournaments') displayStat = `${(u.tournamentsWon || 0) + (u.vipRoomsWon || 0)} 🏆`;
                                if (filter === 'fichas_won') displayStat = `${u.totalFichasWon.toLocaleString()} 🪙`;
                                if (filter === 'gold_won') displayStat = `${u.totalGoldWon.toLocaleString()} 💎`;

                                return (
                                    <tr key={ u.id } style={ { borderBottom: '1px solid rgba(255,255,255,0.05)' } }>
                                        <td style={ { padding: '12px', color: 'gray' } }>#{ i + 4 }</td>
                                        <td style={ { padding: '12px', fontWeight: 'bold' } }>{ u.username }</td>
                                        <td style={ { padding: '12px', textAlign: 'center' } }>
                                            <div style={ { background: 'rgba(0,240,255,0.1)', border: '1px solid var(--color-neon-blue)', borderRadius: '10px', fontSize: '0.7rem', padding: '2px 8px', display: 'inline-block' } }>
                                                LVL { u.level }
                                            </div>
                                        </td>
                                        <td style={ { padding: '12px', textAlign: 'right' } } className="neon-text-blue">
                                            {displayStat}
                                        </td>
                                    </tr>
                                );
                            } ) }
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
