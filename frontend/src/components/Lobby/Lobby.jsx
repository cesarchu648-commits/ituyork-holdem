import React, { useState, useEffect } from 'react';
import { useSocket } from '../../context/useSocket';
import { useAudio } from '../../context/useAudio';
import { Settings, Users, Trophy, MessageSquare, LogOut, Volume2, VolumeX } from 'lucide-react';
import AdminPanel from '../Admin/AdminPanel';
import Inventory from './Inventory';
import GlobalRanking from './GlobalRanking';
import Profile from './Profile';
import Store from './Store';
import DailyRewards from './DailyRewards';

export default function Lobby ()
{
    const { socket, user } = useSocket();
    const { isMuted, toggleMute } = useAudio();
    const [ rooms, setRooms ] = useState( [] );
    const [ chatMsg, setChatMsg ] = useState( '' );
    const [ messages, setMessages ] = useState( [] );
    const [ showAdmin, setShowAdmin ] = useState( false );
    const [ showInventory, setShowInventory ] = useState( false );
    const [ showRanking, setShowRanking ] = useState( false );
    const [ showProfile, setShowProfile ] = useState( false );
    const [ showStore, setShowStore ] = useState( false );
    const [ showDailyRewards, setShowDailyRewards ] = useState( false );

    // Custom hook logically
    useEffect( () =>
    {
        if ( socket )
        {
            socket.emit( 'get_rooms' );
            socket.on( 'rooms_list', setRooms );

            socket.on( 'global_chat_message', ( msgData ) =>
            {
                setMessages( prev => [ ...prev, msgData ].slice( -50 ) ); // keep last 50
            } );

            socket.on( 'global_session_update', ( data ) =>
            {
                // Not strictly needed for UI now as we removed users display, 
                // but kept for potential future use or debugging
            } );
            socket.emit( 'get_global_session' );

            return () =>
            {
                socket.off( 'rooms_list' );
                socket.off( 'global_chat_message' );
                socket.off( 'global_session_update' );
            };
        }
    }, [ socket ] );

    const handleJoinRoom = ( roomId ) =>
    {
        socket.emit( 'join_room', roomId );
    };

    useEffect( () =>
    {
        if ( socket )
        {
            const errHandler = ( msg ) => alert( msg );
            socket.on( 'error_notification', errHandler );
            return () => socket.off( 'error_notification', errHandler );
        }
    }, [ socket ] );

    // Daily Rewards Auto-Popup
    useEffect( () =>
    {
        if ( !user ) return;

        let shouldShow = false;
        if ( !user.lastClaimDate )
        {
            shouldShow = true;
        } else
        {
            const last = new Date( user.lastClaimDate );
            const now = new Date();
            if ( last.getDate() !== now.getDate() || last.getMonth() !== now.getMonth() || last.getFullYear() !== now.getFullYear() )
            {
                shouldShow = true;
            }
        }

        if ( shouldShow )
        {
            // Set timeout to break the sync render loop if needed, 
            // though derive logic is usually better. Here it's a modal popup.
            const t = setTimeout( () => setShowDailyRewards( true ), 100 );
            return () => clearTimeout( t );
        }
    }, [ user?.lastClaimDate ] );

    const sendGlobalChat = ( e ) =>
    {
        e.preventDefault();
        if ( chatMsg.trim() && socket )
        {
            socket.emit( 'global_chat_message', chatMsg );
            setChatMsg( '' );
        }
    };

    const handleLogout = () =>
    {
        window.location.reload(); // Quick reset for MVP
    };

    if ( showAdmin && user.isAdmin )
    {
        return (
            <div style={ { display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' } }>
                <div style={ { padding: '20px' } }>
                    <button className="btn btn-glass" onClick={ () => setShowAdmin( false ) }>⬅ Volver al Lobby</button>
                </div>
                <AdminPanel />
            </div>
        );
    }

    return (
        <div className="app-container" style={ { padding: '20px', gap: '20px', flexDirection: 'column', overflow: 'hidden' } }>

            {/* Top Header Bar */ }
            <div className="glass-panel fade-in" style={ { padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }>
                <div style={ { width: '100px' } }>
                    <button className="btn btn-glass" onClick={ toggleMute } title="Toggle Audio" style={ { padding: '8px' } }>
                        { isMuted ? <VolumeX size={ 18 } /> : <Volume2 size={ 18 } /> }
                    </button>
                </div>

                <div style={ { flex: 1, textAlign: 'center', position: 'relative' } }>
                    <h1 className="logo-animated" style={ { fontSize: '1.8rem', margin: 0 } }>
                        { "Ituyork-Hold'em".split( '' ).map( ( char, index ) => (
                            <span key={ index } style={ { animationDelay: `${ index * 0.05 }s` } }>{ char }</span>
                        ) ) }
                    </h1>
                    { user.email === 'ituyork19@gmail.com' && (
                        <div style={ { position: 'absolute', top: '50%', right: '10px', transform: 'translateY(-50%)' } }>
                            <button className="btn btn-gold" onClick={ () => setShowAdmin( true ) } title="Panel Admin" style={ { padding: '8px', borderRadius: '50%' } }>
                                <Settings size={ 20 } />
                            </button>
                        </div>
                    ) }
                </div>

                <div style={ { width: '100px', display: 'flex', justifyContent: 'flex-end' } }>
                    {/* Empty space for balance */ }
                </div>
            </div>

            <div style={ { display: 'flex', gap: '20px', flex: 1, overflow: 'hidden' } }>

                {/* Sidebar: Profile & Inventory */ }
                <div className="glass-panel fade-in" style={ { width: '300px', display: 'flex', flexDirection: 'column', padding: '20px' } }>
                    <h2 className="neon-text-blue" style={ { marginBottom: '20px', textAlign: 'center' } }>Perfil</h2>

                    <div style={ { textAlign: 'center', marginBottom: '20px', cursor: 'pointer' } } onClick={ () => setShowProfile( true ) }>
                        <div style={ { width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(45deg, #00f0ff, #b500ff)', margin: '0 auto 10px', border: '2px solid white', boxShadow: '0 0 10px rgba(0,240,255,0.3)' } } />
                        <h3>{ user.username }</h3>
                        <div style={ { fontSize: '0.8rem', color: 'var(--color-neon-blue)', fontWeight: 'bold' } }>Nivel { user.level || 1 }</div>
                    </div>

                    <div className="glass-panel" style={ { padding: '15px', marginBottom: '20px' } }>
                        <div style={ { display: 'flex', justifyContent: 'space-between', marginBottom: '10px' } }>
                            <span>Fichas Comunes:</span>
                            <span className="neon-text-blue">{ user.fichas.toLocaleString() }</span>
                        </div>
                        <div style={ { display: 'flex', justifyContent: 'space-between' } }>
                            <span>Fichas Gold:</span>
                            <span className="neon-text-gold">{ user.gold.toLocaleString() }</span>
                        </div>
                    </div>

                    <div style={ { flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' } }>
                        <button className="btn btn-primary" onClick={ () => setShowInventory( true ) } style={ { width: '100%', padding: '15px', display: 'flex', justifyContent: 'center', gap: '10px' } }>
                            <Trophy size={ 18 } /> Inventario
                        </button>
                        <button className="btn btn-gold" onClick={ () => setShowRanking( true ) } style={ { width: '100%', padding: '15px', display: 'flex', justifyContent: 'center', gap: '10px' } }>
                            <Users size={ 18 } /> Ranking Global
                        </button>
                        <button className="btn btn-glass" onClick={ () => setShowStore( true ) } style={ { width: '100%', padding: '15px', display: 'flex', justifyContent: 'center', gap: '10px', border: '1px solid var(--color-gold)' } }>
                            <Settings size={ 18 } color="gold" /> Tienda VIP
                        </button>
                    </div>

                    <div style={ { marginTop: 'auto' } }>
                        <button onClick={ handleLogout } className="btn btn-glass" style={ { width: '100%', padding: '15px' } }>
                            <LogOut size={ 16 } /> Salir del Juego
                        </button>
                    </div>
                </div>

                {/* Modals for Interactivity */ }
                { showInventory && <Inventory user={ user } onClose={ () => setShowInventory( false ) } /> }
                { showRanking && <GlobalRanking onClose={ () => setShowRanking( false ) } /> }
                { showProfile && <Profile user={ user } onClose={ () => setShowProfile( false ) } /> }
                { showStore && <Store onClose={ () => setShowStore( false ) } /> }
                { showDailyRewards && <DailyRewards user={ user } onClose={ () => setShowDailyRewards( false ) } /> }

                {/* Main Content: Rooms & Chat */ }
                <div style={ { flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' } }>

                    {/* Rooms Listing */ }
                    <div className="glass-panel fade-in" style={ { flex: 2, padding: '20px', overflowY: 'auto' } }>
                        <h2 className="neon-text-blue" style={ { marginBottom: '20px' } }>Salas (Tiers)</h2>
                        <div style={ { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' } }>
                            { rooms.map( r => (
                                <div key={ r.id } className="glass-panel" style={ { padding: '20px', border: r.tier === 'VIP' ? '1px solid var(--color-gold)' : undefined } }>
                                    <div style={ { display: 'flex', justifyContent: 'space-between', marginBottom: '15px' } }>
                                        <h3 className={ r.tier === 'VIP' ? 'neon-text-gold' : '' }>{ r.tier }</h3>
                                        <span style={ { color: 'var(--color-text-muted)' } }><Users size={ 16 } /> { r.playersCount }/{ r.maxPlayers }</span>
                                    </div>
                                    <p style={ { marginBottom: '20px', color: 'var(--color-text-muted)' } }>
                                        Entrada: { r.tier === 'VIP' || r.tier === 'Torneos' ? '10k Gold' : `${ r.buyIn.toLocaleString() } Fichas` }
                                    </p>
                                    <button className={ r.tier === 'VIP' ? 'btn btn-gold' : 'btn btn-primary' } style={ { width: '100%' } } onClick={ () => handleJoinRoom( r.id ) }>
                                        JUGAR
                                    </button>
                                </div>
                            ) ) }
                        </div>
                    </div>

                    {/* Global Chat */ }
                    <div className="glass-panel fade-in" style={ { flex: 1, padding: '20px', display: 'flex', flexDirection: 'column' } }>
                        <h3 style={ { marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' } }><MessageSquare size={ 18 } /> Chat Global</h3>
                        <div style={ { flex: 1, overflowY: 'auto', marginBottom: '10px', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' } }>
                            { messages.map( ( m, i ) => (
                                <div key={ i } style={ { marginBottom: '5px' } }>
                                    <strong style={ { color: m.sender === 'System' ? 'var(--color-neon-purple)' : 'var(--color-neon-blue)' } }>{ m.sender }: </strong>
                                    <span>{ m.msg }</span>
                                </div>
                            ) ) }
                        </div>
                        <form onSubmit={ sendGlobalChat } style={ { display: 'flex', gap: '10px' } }>
                            <input
                                type="text"
                                value={ chatMsg }
                                onChange={ e => setChatMsg( e.target.value ) }
                                placeholder="Escribe un mensaje..."
                                style={ { flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.3)', color: '#fff' } }
                            />
                            <button type="submit" className="btn btn-primary">Enviar</button>
                        </form>
                    </div>

                </div>

            </div>

            <footer style={ { marginTop: 'auto', textAlign: 'center', padding: '10px 0', color: 'rgba(255,255,255,0.4)', fontSize: '14px', letterSpacing: '2px' } }>
                <span className="animate-neon-bounce" style={ { display: 'inline-block' } }>Software Developer By: Chuintwo</span>
            </footer>
        </div>
    );
}
