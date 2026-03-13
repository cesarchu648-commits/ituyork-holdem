import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from './useSocket';
import { AudioContext } from './useAudio';

export const AudioProvider = ( { children } ) =>
{
    const [ isMuted, setIsMuted ] = useState( false );
    const { socket } = useSocket();
    const bgmRef = useRef( null );
    const audioCtxRef = useRef( null );

    const playFx = useCallback( async ( fxName ) =>
    {
        if ( isMuted ) return;

        if ( !audioCtxRef.current )
        {
            audioCtxRef.current = new ( window.AudioContext || window.webkitAudioContext )();
        }

        const ctx = audioCtxRef.current;
        if ( ctx.state === 'suspended' )
        {
            await ctx.resume();
        }

        if ( fxName === 'chips' )
        {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime( 3000, ctx.currentTime );
            osc.frequency.exponentialRampToValueAtTime( 100, ctx.currentTime + 0.1 );
            gain.gain.setValueAtTime( 0.5, ctx.currentTime );
            gain.gain.exponentialRampToValueAtTime( 0.01, ctx.currentTime + 0.1 );
            osc.connect( gain );
            gain.connect( ctx.destination );
            osc.start();
            osc.stop( ctx.currentTime + 0.1 );
        } else if ( fxName === 'deal' )
        {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime( 400, ctx.currentTime );
            osc.frequency.exponentialRampToValueAtTime( 50, ctx.currentTime + 0.15 );
            gain.gain.setValueAtTime( 0.3, ctx.currentTime );
            gain.gain.exponentialRampToValueAtTime( 0.01, ctx.currentTime + 0.15 );
            osc.connect( gain );
            gain.connect( ctx.destination );
            osc.start();
            osc.stop( ctx.currentTime + 0.15 );
        } else if ( fxName === 'fold' )
        {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime( 200, ctx.currentTime );
            osc.frequency.linearRampToValueAtTime( 50, ctx.currentTime + 0.3 );
            gain.gain.setValueAtTime( 0.4, ctx.currentTime );
            gain.gain.linearRampToValueAtTime( 0.01, ctx.currentTime + 0.3 );
            osc.connect( gain );
            gain.connect( ctx.destination );
            osc.start();
            osc.stop( ctx.currentTime + 0.3 );
        } else if ( fxName === 'tick' )
        {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime( 800, ctx.currentTime );
            gain.gain.setValueAtTime( 0.1, ctx.currentTime );
            gain.gain.exponentialRampToValueAtTime( 0.01, ctx.currentTime + 0.05 );
            osc.connect( gain );
            gain.connect( ctx.destination );
            osc.start();
            osc.stop( ctx.currentTime + 0.05 );
        } else if ( fxName === 'victory' )
        {
            const notes = [ 523.25, 659.25, 783.99, 1046.50 ];
            notes.forEach( ( freq, i ) =>
            {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime( 0, ctx.currentTime + i * 0.1 );
                gain.gain.linearRampToValueAtTime( 0.3, ctx.currentTime + i * 0.1 + 0.05 );
                gain.gain.exponentialRampToValueAtTime( 0.01, ctx.currentTime + i * 0.1 + 0.3 );
                osc.connect( gain );
                gain.connect( ctx.destination );
                osc.start( ctx.currentTime + i * 0.1 );
                osc.stop( ctx.currentTime + i * 0.1 + 0.3 );
            } );
        }
    }, [ isMuted ] );

    const [ currentSongIndex, setCurrentSongIndex ] = useState( 0 );
    const songs = React.useMemo( () => [
        { name: 'Poker Lounge', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
        { name: 'Night Chill', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
        { name: 'Classic Gold', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3' },
        { name: 'Soft Melody', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3' },
        { name: 'Ambient Cards', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3' }
    ], [] );

    const changeMusic = useCallback( ( index ) => {
        const idx = index % songs.length;
        setCurrentSongIndex( idx );
        if ( bgmRef.current ) {
            bgmRef.current.src = songs[ idx ].url;
            if ( !isMuted ) {
                bgmRef.current.play().catch( e => console.log( 'BGM change play failed:', e ) );
            }
        }
    }, [ isMuted, songs ] );

    const toggleMute = useCallback( () =>
    {
        const nextMute = !isMuted;
        setIsMuted( nextMute );
        if ( bgmRef.current )
        {
            if ( nextMute ) bgmRef.current.pause();
            else bgmRef.current.play().catch( e => console.log( e ) );
        }
    }, [ isMuted ] );

    useEffect( () =>
    {
        if ( !bgmRef.current )
        {
            bgmRef.current = new Audio( songs[ 0 ].url );
            bgmRef.current.loop = true;
            bgmRef.current.volume = 0.2;
        }

        const currentBgm = bgmRef.current;

        const initContext = () =>
        {
            if ( !audioCtxRef.current )
            {
                audioCtxRef.current = new ( window.AudioContext || window.webkitAudioContext )();
            }
            if ( audioCtxRef.current.state === 'suspended' )
            {
                audioCtxRef.current.resume();
            }
            // Also try to play BGM if not muted
            if ( !isMuted && currentBgm.paused )
            {
                currentBgm.play().catch( e => console.log( 'BGM play failed:', e ) );
            }
        };

        window.addEventListener( 'click', initContext );
        window.addEventListener( 'touchstart', initContext );

        if ( socket )
        {
            socket.on( 'play_audio', ( fxName ) =>
            {
                playFx( fxName );
            } );
        }

        return () =>
        {
            if ( socket ) socket.off( 'play_audio' );
            window.removeEventListener( 'click', initContext );
            window.removeEventListener( 'touchstart', initContext );
        };
    }, [ socket, isMuted, playFx, songs ] );

    return (
        <AudioContext.Provider value={ { isMuted, toggleMute, playFx, songs, currentSongIndex, changeMusic } }>
            { children }
        </AudioContext.Provider>
    );
};
