import React, { useEffect, useState, useCallback } from 'react';
import { useSocket } from '../../context/useSocket';
import { LogOut, Volume2, VolumeX, Settings } from 'lucide-react';
import PokerCard from './PokerCard';
import { useAudio } from '../../context/useAudio';
import ChipsAnimation from './ChipsAnimation';

export default function PokerTable ()
{
    const { socket, user } = useSocket();
    const { playFx } = useAudio();
    const [ roomState, setRoomState ] = useState( null );
    const [ showdownData, setShowdownData ] = useState( null );
    const [ raiseAmount, setRaiseAmount ] = useState( 0 );
    const [ timer, setTimer ] = useState( 0 );
    const [ chatMsg, setChatMsg ] = useState( '' );
    const [ chatMessages, setChatMessages ] = useState( [] );
    const [ animationBet, setAnimationBet ] = useState( null );
    const [ actionMessage, setActionMessage ] = useState( null );
    const [ potAnimating, setPotAnimating ] = useState( false );
    const [ tournamentWinner, setTournamentWinner ] = useState( null );

    const handleAction = useCallback( ( action, amount = 0 ) =>
    {
        if ( socket ) socket.emit( 'player_action', { action, amount } );
    }, [ socket ] );

    const leaveRoom = useCallback( () =>
    {
        if ( socket ) socket.emit( 'leave_room', roomState?.roomId );
    }, [ socket, roomState?.roomId ] );

    const toggleSitOut = useCallback( () =>
    {
        if ( socket ) socket.emit( 'toggle_sit_out' );
    }, [ socket ] );

    const toggleReady = useCallback( () =>
    {
        if ( socket ) socket.emit( 'toggle_ready' );
    }, [ socket ] );

    const sendRoomChat = ( e ) =>
    {
        e.preventDefault();
        if ( chatMsg.trim() && socket && roomState?.roomId )
        {
            socket.emit( 'room_chat_message', { roomId: roomState.roomId, msg: chatMsg } );
            setChatMsg( '' );
        }
    };

    useEffect( () =>
    {
        if ( socket )
        {
            socket.on( 'room_update', ( data ) =>
            {
                setRoomState( prev =>
                {
                    if ( prev && prev.currentPlayerIndex !== data.currentPlayerIndex )
                    {
                        setTimer( 15 );
                    }
                    
                    // Trigger chip animation if someone bet or raised
                    data.players.forEach((p) => {
                        const prevP = prev?.players?.find(oldP => oldP.username === p.username);
                        if (prevP && p.bet > prevP.bet) {
                            const diff = p.bet - prevP.bet;
                            setAnimationBet({
                                seat: p.seat,
                                id: Date.now() + Math.random()
                            });
                            setActionMessage({
                                text: `${p.username} apostó ${diff.toLocaleString()}`,
                                id: Date.now()
                            });
                        }
                    });

                    // Pot animation
                    if (prev && data.pot > prev.pot) {
                        setPotAnimating(true);
                        setTimeout(() => setPotAnimating(false), 1000);
                    }

                    return data;
                } );
            } );
            socket.on( 'game_started', ( data ) =>
            {
                setRoomState( data );
                setTimer( 15 );
            } );
            socket.on( 'turn_started', ( data ) =>
            {
                setTimer( data.timeLimit / 1000 );
            } );
            socket.on( 'showdown', ( data ) =>
            {
                setShowdownData( data );
                setTimeout( () => setShowdownData( null ), 8000 );
            } );
            socket.on( 'tournament_ended', () =>
            {
                setTournamentWinner( user.username );
                setTimeout( () => setTournamentWinner( null ), 8000 ); // Match the logout delay
                setTimeout( () => leaveRoom(), 8000 );
            } );
            socket.on( 'room_chat_message', ( msgData ) =>
            {
                setChatMessages( prev => [ ...prev, msgData ].slice( -30 ) );
            } );
            return () =>
            {
                socket.off( 'room_update' );
                socket.off( 'game_started' );
                socket.off( 'turn_started' );
                socket.off( 'showdown' );
                socket.off( 'tournament_ended' );
                socket.off( 'room_chat_message' );
            };
        }
    }, [ socket, leaveRoom, user.username ] );

    useEffect( () =>
    {
        let interval = null;
        if ( timer > 0 )
        {
            interval = setInterval( () =>
            {
                setTimer( prev => prev - 1 );
            }, 1000 );

            const currPlayer = roomState?.players?.[ roomState?.currentPlayerIndex ];
            if ( timer <= 6 && currPlayer?.username === user.username )
            {
                if ( timer <= 5 ) playFx( 'tick' );
            }

        } else if ( timer <= 0 )
        {
            clearInterval( interval );
        }
        return () => clearInterval( interval );
    }, [ timer, roomState, user.username, playFx ] );

    useEffect( () =>
    {
        if ( showdownData && roomState )
        {
            const me = roomState.players.find( p => p.username === user.username );
            if ( me && me.chips <= 0 )
            {
                const kickTimer = setTimeout( () =>
                {
                    leaveRoom();
                }, 4000 );
                return () => clearTimeout( kickTimer );
            }
        }
    }, [ showdownData, roomState, user.username, leaveRoom ] );

    useEffect( () =>
    {
        if ( actionMessage )
        {
            const timer = setTimeout( () => setActionMessage( null ), 3000 );
            return () => clearTimeout( timer );
        }
    }, [ actionMessage ] );

    if ( !roomState ) return <div className="app-container" style={ { justifyContent: 'center', alignItems: 'center' } }>Cargando Mesa...</div>;

    if ( tournamentWinner )
    {
        return (
            <div className="victory-overlay fade-in">
                <div className="victory-content scale-in">
                    <h1 className="neon-text-gold" style={ { fontSize: '4rem', marginBottom: '10px' } }>¡CAMPEÓN!</h1>
                    <p style={ { fontSize: '1.5rem', color: 'white' } }>{ tournamentWinner.toUpperCase() }</p>
                    <div className="stars-animation">✨🏆✨</div>
                </div>
                <style>{`
                    .victory-overlay {
                        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                        background: rgba(0,0,0,0.95); display: flex; justify-content: center;
                        align-items: center; z-index: 10000; backdrop-filter: blur(15px);
                    }
                    .victory-content { text-align: center; }
                    .scale-in { animation: scaleIn 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
                    @keyframes scaleIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                    .stars-animation { font-size: 3rem; margin-top: 20px; animation: bounce 1s infinite alternate; }
                    @keyframes bounce { from { transform: translateY(0); } to { transform: translateY(-20px); } }
                `}</style>
            </div>
        );
    }

    const myPlayer = roomState.players.find( p => p.username === user.username );
    const mySeat = myPlayer ? myPlayer.seat : 0;

    const getRotatedSeatPosition = ( actualSeat ) =>
    {
        const diff = ( actualSeat - mySeat + 6 ) % 6;
        // Pos 0: Bottom Center (Me) - RAISED to 22% back from 10%
        // Pos 1: Bottom Left
        // Pos 2: Top Left
        // Pos 3: Top Center
        // Pos 4: Top Right
        // Pos 5: Bottom Right
        const positions = [
            { bottom: '22%', left: '50%', transform: 'translateX(-50%)' }, // My position raised
            { bottom: '35%', left: '10%' },
            { top: '30%', left: '10%' },
            { top: '10%', left: '50%', transform: 'translateX(-50%)' },
            { top: '30%', right: '10%' },
            { bottom: '35%', right: '10%' }
        ];
        return positions[ diff ];
    };


    const currentBet = roomState.currentBet || 0;
    const lastRaise = roomState.lastRaiseAmount || roomState.bbAmount || 20;
    const isMyTurn = roomState.currentPlayerIndex !== -1 && roomState.players[ roomState.currentPlayerIndex ]?.username === user.username;
    const currentCallAmount = Math.max( 0, currentBet - ( myPlayer?.bet || 0 ) );
    const minRaiseAmount = currentBet + lastRaise;

    return (
        <div className="app-container" style={ {
            background: 'linear-gradient(135deg, #050505 0%, #111 100%)',
            position: 'relative',
            overflow: 'hidden'
        } }>
            <div style={ {
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(20, 20, 20, 0.4) 0%, rgba(0, 0, 0, 0.9) 100%), url("https://www.transparenttextures.com/patterns/carbon-fibre.png")',
                opacity: 0.8, pointerEvents: 'none', zIndex: 0
            } }></div>

            { animationBet && (
                <ChipsAnimation 
                    key={animationBet.id}
                    fromPos={getRotatedSeatPosition(animationBet.seat)}
                    onComplete={() => setAnimationBet(null)}
                />
            )}

            { actionMessage && (
                <div className="action-notification-hud fade-in-up">
                    <div className="action-notification-content">
                        <span className="action-notification-icon">🔔</span>
                        <span className="action-notification-text">{ actionMessage.text }</span>
                    </div>
                </div>
            )}

            {/* Top Toolbar */ }
            <div style={ { position: 'absolute', top: 15, left: 20, zIndex: 20, display: 'flex', gap: '10px' } }>
                <button className="btn btn-glass" style={ { scale: '0.8', transformOrigin: 'left center' } } onClick={ leaveRoom }><LogOut size={ 16 } /> Salir</button>
                <button className="btn btn-glass" style={ { scale: '0.8', transformOrigin: 'left center' } } onClick={ toggleSitOut }>
                    { myPlayer?.sittingOut ? 'Regresar' : 'Sentarse afuera' }
                </button>
            </div>

            <div style={ { position: 'absolute', top: 15, right: 20, zIndex: 20 } }>
                <div className="glass-panel fade-in" style={ { padding: '8px 15px', display: 'flex', gap: '15px', fontSize: '13px' } }>
                    <span className="neon-text-blue">⚡ { user.fichas.toLocaleString() }</span>
                    <span className="neon-text-gold">💎 { user.gold.toLocaleString() }</span>
                </div>
                <MusicSelector />
            </div>

            {/* The Poker Table */ }
            <div style={ {
                position: 'absolute', top: '48%', left: '50%', transform: 'translate(-50%, -50%)',
                width: '75%', height: '55%', borderRadius: '50% / 50%',
                border: '15px solid #1a1a1a',
                background: roomState.tier === 'VIP' 
                    ? 'radial-gradient(circle, #3d2b00 0%, #1a1200 100%)' 
                    : roomState.tier === 'Torneos' 
                        ? 'radial-gradient(circle, #001a3d 0%, #000a1a 100%)'
                        : 'radial-gradient(circle, #0d3b14 0%, #051408 100%)',
                boxShadow: roomState.tier === 'VIP'
                    ? '0 40px 80px rgba(0,0,0,1), inset 0 0 100px rgba(0,0,0,0.8), 0 0 30px rgba(255,215,0,0.2)'
                    : roomState.tier === 'Torneos'
                        ? '0 40px 80px rgba(0,0,0,1), inset 0 0 100px rgba(0,0,0,0.8), 0 0 30px rgba(0,150,255,0.2)'
                        : '0 40px 80px rgba(0,0,0,1), inset 0 0 100px rgba(0,0,0,0.8), 0 0 30px rgba(0,255,100,0.1)',
                display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column'
            } }>
                <div style={ {
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundImage: 'url("https://www.transparenttextures.com/patterns/pool-table.png")',
                    opacity: 0.3, pointerEvents: 'none', borderRadius: '50% / 50%'
                } }></div>

                <h2 style={ { color: 'rgba(255,255,255,0.05)', position: 'absolute', top: '25%', textTransform: 'uppercase', letterSpacing: '10px', fontSize: '18px' } }>
                    ITUYORK
                </h2>

                <div style={ { display: 'flex', gap: '10px', height: '110px', marginBottom: '10px', alignItems: 'center', zIndex: 5 } }>
                    { roomState.communityCards.map( ( c, i ) => (
                        <PokerCard key={ i } card={ c } width={ 80 } />
                    ) ) }
                    { Array.from( { length: 5 - roomState.communityCards.length } ).map( ( _, i ) => (
                        <div key={ i } style={ { width: '80px', height: '110px', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', background: 'rgba(0,0,0,0.1)' } }></div>
                    ) ) }
                </div>

                <div style={ {
                    fontSize: '20px', fontWeight: '900',
                    background: 'rgba(0,0,0,0.6)', padding: '5px 25px',
                    borderRadius: '50px', border: '1px solid #ffd70044',
                    color: '#ffd700', textShadow: '0 0 10px rgba(255,215,0,0.3)', zIndex: 5
                } }>
                    BOTE: <span className={ potAnimating ? 'pot-value-animating' : '' }>{ roomState.pot.toLocaleString() }</span>
                </div>
            </div>

            {/* Players around table */ }
            { roomState.players.map( ( p, i ) =>
            {
                const pos = getRotatedSeatPosition( p.seat );
                const isMe = p.username === user.username;
                const isTurn = roomState.currentPlayerIndex === i;

                return (
                    <div key={ p.seat } style={ {
                        position: 'absolute', ...pos,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: isTurn ? 100 : 10
                    } }>
                        { p.bet > 0 && (
                            <div style={ {
                                position: 'absolute',
                                top: ( pos.bottom ? '-40px' : '90px' ),
                                background: 'rgba(5,5,5,0.8)', padding: '3px 10px',
                                borderRadius: '20px', color: '#ffd700', border: '1px solid #ffd70033', fontSize: '11px'
                            } }>
                                🪙 { p.bet }
                            </div>
                        ) }

                        {/* Dealer / SB / BB Buttons */ }
                        <div style={ { position: 'absolute', top: '-10px', right: '-10px', display: 'flex', gap: '5px', zIndex: 110 } }>
                            { roomState.dealerIndex === i && <div className="dealer-btn">D</div> }
                            { roomState.sbIndex === i && <div className="sb-btn">SB</div> }
                            { roomState.bbIndex === i && <div className="bb-btn">BB</div> }
                        </div>

                        { isTurn && timer > 0 && (
                            <div className="timer-ring">
                                { timer }
                            </div>
                        ) }

                        <div className="player-bubble" style={ {
                            border: isTurn ? '2px solid #39ff14' : '1px solid rgba(255,255,255,0.15)',
                            boxShadow: isTurn ? '0 0 15px #39ff1444' : '0 10px 20px rgba(0,0,0,0.5)',
                            background: isTurn ? 'rgba(57, 255, 20, 0.05)' : 'rgba(20,20,20,0.9)',
                            opacity: p.isActive || isMe ? 1 : 0.4
                        } }>
                            <span style={ { fontSize: '11px', fontWeight: 'bold' } }>{ p.username }</span>
                            <div className="player-chips-container">
                                <span className="player-chips-text">🪙 { p.chips.toLocaleString() }</span>
                            </div>
                            { p.sittingOut && <span style={ { fontSize: '9px', color: '#ff4444' } }>AUSENTE</span> }
                            { p.ready && roomState.gameState === 'WAITING' && <span className="neon-text-gold" style={ { fontSize: '9px', fontWeight: 'bold' } }>LISTO</span> }
                        </div>

                        { ( isMe || p.hasCards ) && (
                            <div style={ {
                                display: 'flex', gap: '3px', position: 'absolute',
                                bottom: isMe ? '75px' : '-25px',
                                zIndex: 105
                            } }>
                                { ( p.holeCards?.length > 0 ? p.holeCards : [ null, null ] ).map( ( card, idx ) =>
                                {
                                    const showCard = isMe || ( roomState.gameState === 'SHOWDOWN' && !p.folded );
                                    return (
                                        <PokerCard key={ idx } card={ card } hidden={ !showCard } width={ 65 } rotate={ idx === 0 ? -8 : 8 } />
                                    );
                                } ) }
                            </div>
                        ) }

                        { isMe && p.currentHandName && p.currentHandName !== 'Ninguna' && !p.folded && (
                            <div className="hand-eval-badge">
                                { p.currentHandName }
                            </div>
                        ) }

                        <div style={ { position: 'relative', marginTop: '5px' } }>
                            { p.folded && <div className="status-badge red">FOLD</div> }
                            { p.allIn && <div className="status-badge purple">ALL-IN</div> }
                        </div>
                    </div>
                );
            } ) }

            {/* New Compact Bottom Action Panel */ }
            { isMyTurn && myPlayer && !myPlayer.folded && !myPlayer.allIn && (
                <div className="action-panel-container">
                    <div className="action-bar-glass">
                        <button className="btn-action fold" onClick={ () => handleAction( 'fold' ) }>FOLD</button>

                        { currentCallAmount === 0 ? (
                            <button className="btn-action check" onClick={ () => handleAction( 'check' ) }>CHECK</button>
                        ) : (
                            <button className="btn-action call" onClick={ () => handleAction( 'call' ) }>
                                <span>IGUALAR</span>
                                <small>{ currentCallAmount.toLocaleString() }</small>
                            </button>
                        ) }

                        <div className="raise-control-group">
                            <div className="raise-info">
                                <span>SUBIR</span>
                                <strong>{ Math.max( minRaiseAmount, raiseAmount || 0 ).toLocaleString() }</strong>
                            </div>
                            <input
                                type="range"
                                min={ minRaiseAmount }
                                max={ myPlayer.chips + myPlayer.bet }
                                step={ roomState.bbAmount || 20 }
                                value={ Math.max( minRaiseAmount, raiseAmount || 0 ) }
                                onChange={ e => setRaiseAmount( Number( e.target.value ) ) }
                                className="raise-slider"
                            />
                            <button className="btn-action raise-confirm" onClick={ () => handleAction( 'raise', Math.max( minRaiseAmount, raiseAmount || 0 ) ) }>
                                OK
                            </button>
                        </div>

                        <button className="btn-action allin" onClick={ () => handleAction( 'allin' ) }>ALL-IN</button>
                    </div>
                </div>
            ) }

            {/* Ready Button for VIP/Torneo rooms when waiting */ }
            { roomState.gameState === 'WAITING' && ( roomState.tier === 'VIP' || roomState.tier === 'Torneos' ) && myPlayer && !myPlayer.ready && (
                <div style={ {
                    position: 'absolute', bottom: '120px', left: '50%', transform: 'translateX(-50%)',
                    zIndex: 2005
                } }>
                    <button className="btn btn-gold animate-pulse" onClick={ toggleReady } style={ { padding: '15px 40px', fontSize: '18px' } }>
                        ESTOY LISTO
                    </button>
                </div>
            ) }

            {/* Room Chat Sidebar (Right) */ }
            <div className="glass-panel room-chat-container">
                <div className="room-chat-header">CHAT DE SALA</div>
                <div className="room-chat-messages">
                    { chatMessages.map( ( m, i ) => (
                        <div key={ i } className="room-chat-bubble">
                            <span className="room-chat-sender">{ m.sender }: </span>
                            <span className="room-chat-text">{ m.msg }</span>
                        </div>
                    ) ) }
                </div>
                <form className="room-chat-input-form" onSubmit={ sendRoomChat }>
                    <input
                        type="text"
                        placeholder="..."
                        value={ chatMsg }
                        onChange={ e => setChatMsg( e.target.value ) }
                        onFocus={ ( e ) => ( e.target.placeholder = '' ) }
                        onBlur={ ( e ) => ( e.target.placeholder = '...' ) }
                    />
                </form>
            </div>

            { showdownData && (
                <div className="winner-overlay">
                    <h1 className="winner-title neon-text-gold">¡GANADOR!</h1>
                    <div className="winners-list">
                        { showdownData.winners.map( w => (
                            <div key={ w.username } className="winner-card">
                                <h3>{ w.username }</h3>
                                { w.holeCards && w.holeCards.length > 0 && (
                                    <div className="winner-hole-cards">
                                        <PokerCard card={ w.holeCards[ 0 ] } width={ 70 } rotate={ -5 } />
                                        <PokerCard card={ w.holeCards[ 1 ] } width={ 70 } rotate={ 5 } />
                                    </div>
                                ) }
                                <span className="winner-hand">{ w.handName }</span>
                                <span className="winner-amount">+{ w.amount.toLocaleString() } 🪙</span>
                            </div>
                        ) ) }
                    </div>
                </div>
            ) }

            <style>{ `
                .player-bubble {
                    width: 75px; height: 75px; border-radius: 50%;
                    display: flex; flexDirection: column; justifyContent: center; alignItems: center;
                    transition: all 0.3s ease;
                }
                .dealer-btn, .sb-btn, .bb-btn {
                    width: 22px; height: 22px; border-radius: 50%;
                    display: flex; justify-content: center; align-items: center;
                    font-size: 9px; font-weight: 900; box-shadow: 0 4px 10px rgba(0,0,0,0.5);
                }
                .dealer-btn { background: #fff; color: #000; }
                .sb-btn { background: #00f0ff; color: #000; }
                .bb-btn { background: #b500ff; color: #fff; }

                .timer-ring {
                    position: absolute; top: -12px; left: -12px;
                    background: #ff0000; color: white; border-radius: 50%;
                    width: 26px; height: 26px; display: flex; justify-content: center;
                    align-items: center; font-size: 13px; font-weight: bold;
                    border: 2px solid #fff; z-index: 120;
                }

                .hand-eval-badge {
                    position: absolute; bottom: -42px; padding: 2px 10px;
                    border-radius: 4px; font-size: 10px; background: rgba(0,0,0,0.85);
                    border: 1px solid #39ff1444; color: #39ff14; font-weight: bold;
                    text-transform: uppercase; z-index: 110;
                }

                .status-badge {
                    padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 900;
                }
                .status-badge.red { background: #ff4444; color: white; }
                .status-badge.purple { background: #b500ff; color: white; }

                .action-panel-container {
                    position: absolute; bottom: 0; left: 0; right: 0;
                    height: 100px; display: flex; justify-content: center; align-items: flex-end;
                    padding-bottom: 10px; z-index: 2000; pointer-events: none;
                }
                .action-bar-glass {
                    background: rgba(10, 10, 10, 0.95);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 215, 0, 0.2);
                    border-radius: 12px;
                    padding: 8px 15px;
                    display: flex; gap: 12px; align-items: center;
                    box-shadow: 0 -20px 40px rgba(0,0,0,0.8);
                    pointer-events: auto;
                }
                .btn-action {
                    padding: 8px 20px; border-radius: 8px; border: none; font-weight: 900;
                    cursor: pointer; display: flex; flex-direction: column; align-items: center;
                    transition: all 0.2s; min-width: 80px;
                }
                .btn-action.fold { background: #222; color: #ff4444; border: 1px solid #ff444433; }
                .btn-action.check { background: #0077ff; color: white; }
                .btn-action.call { background: #0077ff; color: white; }
                .btn-action.allin { background: linear-gradient(135deg, #b500ff, #7000cc); color: white; }
                .btn-action.raise-confirm { background: #ffd700; color: black; padding: 4px 15px; min-width: 50px; margin-top: 2px;}
                
                .raise-control-group {
                    display: flex; flex-direction: column; align-items: center; min-width: 140px;
                    padding: 0 10px; border-left: 1px solid rgba(255,255,255,0.1); border-right: 1px solid rgba(255,255,255,0.1);
                }
                .raise-info { display: flex; gap: 8px; font-size: 11px; align-items: center; margin-bottom: 2px; }
                .raise-info span { color: #888; }
                .raise-info strong { color: #ffd700; font-size: 13px; }
                .raise-slider { width: 100%; accent-color: #ffd700; height: 4px; border-radius: 2px; }

                .winner-overlay {
                    position: absolute; top:0; left:0; right:0; bottom:0;
                    background: rgba(0,0,0,0.9); z-index: 3000;
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                }
                .winner-card {
                    background: rgba(20,20,20,0.8); border: 1px solid #ffd70044;
                    padding: 20px; border-radius: 15px; display: flex; flex-direction: column; align-items: center;
                }

                .room-chat-container {
                    position: absolute; right: 20px; bottom: 20px; width: 220px; height: 180px;
                    display: flex; flex-direction: column; z-index: 100; padding: 10px;
                    font-size: 11px; backdrop-filter: blur(15px);
                }
                .room-chat-header { font-weight: 900; color: #888; margin-bottom: 5px; text-align: center; }
                .room-chat-messages { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; margin-bottom: 5px; }
                .room-chat-bubble { background: rgba(0,0,0,0.3); padding: 4px 8px; border-radius: 6px; }
                .room-chat-sender { color: var(--color-neon-blue); font-weight: bold; }
                .room-chat-input-form input {
                    width:100%; height:25px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 4px; color: white; padding: 0 8px; outline: none;
                }
                .animate-pulse { animation: pulse 2s infinite; }
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.4); }
                    70% { box-shadow: 0 0 0 15px rgba(255, 215, 0, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0); }
                }

                .status-badge.gold { background: var(--color-gold); color: black; }

                .action-notification-hud {
                    position: absolute; top: 15%; left: 50%; transform: translateX(-50%);
                    z-index: 2500; pointer-events: none;
                }
                .action-notification-content {
                    background: rgba(0, 0, 0, 0.85);
                    border: 1px solid #ffd700;
                    border-radius: 30px;
                    padding: 8px 25px;
                    display: flex; align-items: center; gap: 10px;
                    box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
                }
                .action-notification-text { color: white; font-weight: 900; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }

                .pot-value-animating {
                    display: inline-block;
                    animation: pot-pulse 0.6s ease-out;
                }
                @keyframes pot-pulse {
                    0% { transform: scale(1); color: #ffd700; }
                    50% { transform: scale(1.4); color: #fff; text-shadow: 0 0 20px #ffd700; }
                    100% { transform: scale(1); color: #ffd700; }
                }

                .player-chips-container {
                    background: rgba(0,0,0,0.6);
                    padding: 2px 8px;
                    border-radius: 10px;
                    margin: 2px 0;
                    border: 1px solid rgba(255,215,0,0.15);
                }
                .player-chips-text {
                    font-size: 11px; color: #ffd700; font-weight: 900;
                    text-shadow: 0 0 5px rgba(255, 215, 0, 0.5);
                }

                .fade-in-up {
                    animation: fadeInUp 0.4s ease-out;
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translate(-50%, 20px); }
                    to { opacity: 1; transform: translate(-50%, 0); }
                }
            `}</style>
        </div>
    );
}

function MusicSelector() {
    const { songs, currentSongIndex, changeMusic, isMuted, toggleMute } = useAudio();
    const [ isOpen, setIsOpen ] = useState( false );

    return (
        <div style={{ position: 'relative' }}>
            <button className="btn btn-glass" style={{ padding: '8px' }} onClick={() => setIsOpen(!isOpen)}>
                <Settings size={18} className={isOpen ? 'rotate-90' : ''} style={{ transition: 'transform 0.3s' }} />
            </button>
            { isOpen && (
                <div className="glass-panel" style={{
                    position: 'absolute', top: '45px', right: 0, width: '180px',
                    padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px',
                    zIndex: 100
                }}>
                    <button className="btn btn-glass" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={toggleMute}>
                        { isMuted ? <VolumeX size={14} /> : <Volume2 size={14} /> }
                        { isMuted ? 'Activar Sonido' : 'Silenciar' }
                    </button>
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                    <span style={{ fontSize: '10px', color: '#888', fontWeight: 'bold' }}>CAMBIAR MÚSICA</span>
                    { songs.map((song, i) => (
                        <button 
                            key={i} 
                            className={`btn btn-glass ${currentSongIndex === i ? 'neon-border-blue' : ''}`}
                            style={{ fontSize: '11px', textAlign: 'left', padding: '5px 10px' }}
                            onClick={() => changeMusic(i)}
                        >
                            {song.name}
                        </button>
                    ))}
                </div>
            ) }
        </div>
    );
}
