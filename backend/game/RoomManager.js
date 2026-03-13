const { TexasHoldem } = require( './TexasHoldem' );
const { BotManager } = require( './BotManager' );

class RoomManager
{
    constructor( io )
    {
        this.io = io;
        this.rooms = new Map(); // roomId -> TexasHoldem instance
        this.botManager = new BotManager( this );

        // Initialize default rooms
        this.createRoom( 'principiante_1', 'Principiante', 1000 );
        this.createRoom( 'pro_1', 'Pro', 5000 );
        this.createRoom( 'vip_1', 'VIP', 10000 ); // 10k Gold required
        this.createRoom( 'torneo_1', 'Torneos', 0 ); // 0 base, or maybe 10k Gold per user query

        // Periodically run bots
        setInterval( () => this.botManager.tick(), 5000 );
    }

    createRoom ( roomId, tier, buyIn )
    {
        const room = new TexasHoldem( { roomId, tier, buyIn }, this.io );
        room.onHandComplete = ( winners, players ) =>
        {
            if ( this.onStatsSync ) this.onStatsSync( roomId, winners, players, tier );
        };
        this.rooms.set( roomId, room );
    }

    getRoomsList ()
    {
        const list = [];
        for ( let [ id, room ] of this.rooms )
        {
            list.push( {
                id,
                tier: room.tier,
                buyIn: room.buyIn,
                playersCount: room.players.length,
                maxPlayers: 6
            } );
        }
        return list;
    }

    joinRoom ( socketId, user, roomId )
    {
        const room = this.rooms.get( roomId );
        if ( !room ) return { success: false, msg: 'Room not found' };

        // Survivor Mode Estricto / Closed table (VIP / Torneos)
        if ( room.tier === 'VIP' || room.tier === 'Torneos' )
        {
            if ( room.gameState !== 'WAITING' )
            {
                return { success: false, msg: 'Survivor Mode: La mesa está en juego y bloqueada.' };
            }
        }

        if ( room.players.length >= 6 )
        {
            // Check if we can kick a bot
            const botIndex = room.players.findIndex( p => p.isBot );
            if ( botIndex !== -1 )
            {
                // Free up the bot's seat safer
                const bot = room.players[ botIndex ];
                room.players.splice( botIndex, 1 );
                // Adjust currentPlayerIndex if needed
                if ( room.currentPlayerIndex > botIndex )
                {
                    room.currentPlayerIndex--;
                } else if ( room.currentPlayerIndex === botIndex )
                {
                    // Bot was playing! Move to next player
                    room.nextTurn();
                }
                this.io.to( roomId ).emit( 'global_chat_message', { sender: 'System', msg: 'Bot desplazado por un jugador real.' } );
            } else
            {
                return { success: false, msg: 'La sala está completamente llena de jugadores reales.' };
            }
        }

        let chipsToTable = 0;

        if ( room.tier === 'Principiante' || room.tier === 'Pro' )
        {
            if ( user.fichas < room.buyIn ) return { success: false, msg: 'Fichas insuficientes.' };
            chipsToTable = Math.min( user.fichas, room.buyIn * 5 ); // Allow bringing up to 5x buyIn max, or just buyIn?
            // "empiezas con 1000 fichas" means you bring 1000 exactly?
            chipsToTable = room.buyIn;
        } else if ( room.tier === 'VIP' || room.tier === 'Torneos' )
        {
            if ( user.gold < 10000 ) return { success: false, msg: 'Requiere 10,000 Fichas Gold.' };
            chipsToTable = 10000;
        }

        const isMidHand = ( room.gameState !== 'WAITING' && room.gameState !== 'SHOWDOWN' );

        const newPlayer = {
            seat: this.findEmptySeat( room ),
            socketId,
            user: { id: user.id, username: user.username, email: user.email },
            chips: chipsToTable,
            isBot: false,
            holeCards: [],
            folded: isMidHand,
            allIn: false,
            bet: 0,
            roundBet: 0,
            hasActed: false,
            sittingOut: false
        };

        room.addPlayer( newPlayer );

        return { success: true, roomState: room.getEmitState( socketId ), newPlayer };
    }

    leaveRoom ( socketId, roomId )
    {
        const room = this.rooms.get( roomId );
        if ( !room ) return;
        const idx = room.players.findIndex( p => p.socketId === socketId );
        if ( idx !== -1 )
        {
            const p = room.players[ idx ];
            room.players.splice( idx, 1 );
            room.handlePlayerLeave( idx );
            room.broadcastState();

            return { success: true, chipsToReturn: p.chips, wasBot: p.isBot };
        }
        return { success: false };
    }

    findEmptySeat ( room )
    {
        const taken = room.players.map( p => p.seat );
        for ( let i = 0; i < 6; i++ )
        {
            if ( !taken.includes( i ) ) return i;
        }
        return -1;
    }

    startGameIfReady ( roomId )
    {
        const room = this.rooms.get( roomId );
        if ( room && room.players.length >= 2 && room.gameState === 'WAITING' )
        {
            room.startGame(); // This will emit game_started by itself in TexasHoldem.js!
        }
    }

    serializeRoom ( room )
    {
        return room.getEmitState();
    }
}

module.exports = { RoomManager };
