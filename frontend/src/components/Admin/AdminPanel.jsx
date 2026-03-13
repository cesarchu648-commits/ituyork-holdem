import React, { useState, useEffect } from 'react';
import { useSocket } from '../../context/useSocket';

export default function AdminPanel ()
{
    const { socket } = useSocket();
    const [ users, setUsers ] = useState( [] );
    const [ amounts, setAmounts ] = useState( {} ); // { userId: { fichas: 0, gold: 0 } }

    const handleAmountChange = ( userId, type, val ) => {
        setAmounts( prev => ({
            ...prev,
            [userId]: {
                ...(prev[userId] || { fichas: 0, gold: 0 }),
                [type]: parseInt(val) || 0
            }
        }));
    };

    useEffect( () =>
    {
        if ( socket )
        {
            socket.emit( 'get_global_session' );
            socket.on( 'global_session_update', setUsers );
            return () => socket.off( 'global_session_update' );
        }
    }, [ socket ] );

    const addFunds = ( targetUserId, type, amount ) =>
    {
        if ( socket ) socket.emit( 'admin_add_funds', { targetUserId, type, amount } );
    };

    return (
        <div className="app-container" style={ { padding: '20px' } }>
            <h1 className="neon-text-gold" style={ { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' } }>
                ⚙️ Panel de Administrador Global
            </h1>

            <div className="glass-panel" style={ { padding: '20px', flex: 1, overflowY: 'auto' } }>
                <table style={ { width: '100%', textAlign: 'left', borderCollapse: 'collapse' } }>
                    <thead>
                        <tr style={ { borderBottom: '1px solid var(--glass-border)', color: 'var(--color-neon-blue)' } }>
                            <th style={ { padding: '10px' } }>Usuario</th>
                            <th>Estado / Sala</th>
                            <th>Fichas</th>
                            <th>Gold</th>
                            <th>Acciones Fichas</th>
                            <th>Acciones Gold</th>
                        </tr>
                    </thead>
                    <tbody>
                         { users.map( u => (
                            <tr key={ u.id } style={ { borderBottom: '1px solid rgba(255,255,255,0.05)' } }>
                                <td style={ { padding: '10px' } }>{ u.username } <span style={ { fontSize: '10px', color: 'gray' } }>{ u.email }</span></td>
                                <td>{ u.state } { u.roomId ? `(${ u.roomId })` : '' }</td>
                                <td>{ u.fichas.toLocaleString() }</td>
                                <td className="neon-text-gold">{ u.gold.toLocaleString() }</td>
                                <td>
                                    <div style={{ display: 'flex', gap: '5px' }}>
                                        <input 
                                            type="number" 
                                            placeholder="Monto"
                                            className="input-glass"
                                            style={{ width: '80px', fontSize: '12px', padding: '5px' }}
                                            value={amounts[u.id]?.fichas || ''}
                                            onChange={(e) => handleAmountChange(u.id, 'fichas', e.target.value)}
                                        />
                                        <button className="btn btn-glass" style={ { fontSize: '10px', padding: '5px' } } onClick={ () => addFunds( u.id, 'fichas', amounts[u.id]?.fichas || 0 ) }>Añadir</button>
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '5px' }}>
                                        <input 
                                            type="number" 
                                            placeholder="Monto"
                                            className="input-glass"
                                            style={{ width: '80px', fontSize: '12px', padding: '5px' }}
                                            value={amounts[u.id]?.gold || ''}
                                            onChange={(e) => handleAmountChange(u.id, 'gold', e.target.value)}
                                        />
                                        <button className="btn btn-gold" style={ { fontSize: '10px', padding: '5px' } } onClick={ () => addFunds( u.id, 'gold', amounts[u.id]?.gold || 0 ) }>Añadir</button>
                                    </div>
                                </td>
                            </tr>
                        ) ) }
                    </tbody>
                </table>
            </div>
        </div>
    )
}
