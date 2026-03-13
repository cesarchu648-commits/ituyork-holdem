class BotManager
{
    constructor( roomManager )
    {
        this.roomManager = roomManager;
        this.botNames = [
            'Carlos_Pro', 'Elena_Poker', 'Juan_Holdem', 'Maria_VIP', 'Diego_Bet',
            'Sofia_AllIn', 'Luis_Luck', 'Ana_Ace', 'Pedro_River', 'Laura_Flop',
            'Santi_Raise', 'Gabi_Call', 'Nico_Fold', 'Vane_Bluff', 'Dani_Stack',
            'Pau_Royal', 'Hugo_Shark', 'Marta_Fish', 'Raul_King', 'Julia_Queen',
            'Don_Poker', 'La_Dama', 'El_Mago', 'Flash_Bet', 'Turbo_Allin'
        ];
        this.botCounter = Math.floor( Math.random() * 100 );
    }

    tick ()
    {
        // Every tick, check rooms. If a room has 0 players, do nothing.
        // If a room has 1 real player, add bots up to 6 players to fill the table.

        for ( let [ roomId, room ] of this.roomManager.rooms )
        {
            if ( room.tier === 'VIP' || room.tier === 'Torneos' )
            {
                // "Equilibrio de Partida: Los bots en estas salas... inician con 10,000 fichas"
                if ( room.gameState !== 'WAITING' ) continue; // Locked.
            }

            const realPlayers = room.players.filter( p => !p.isBot );
            const totalPlayers = room.players.length;

            // If there's at least 1 real player, fill with bots up to 4 or 5 max so real players can still join easily
            if ( realPlayers.length > 0 && totalPlayers < 5 )
            {
                if ( Math.random() > 0.4 )
                {
                    this.addBot( room );
                }
            }

            // If 0 real players, remove bots slowly
            if ( realPlayers.length === 0 && totalPlayers > 0 )
            {
                const botIndex = room.players.findIndex( p => p.isBot );
                if ( botIndex !== -1 )
                {
                    room.players.splice( botIndex, 1 );
                }
            }

        }
    }

    addBot ( room )
    {
        const seat = this.roomManager.findEmptySeat( room );
        let chips = room.buyIn;
        if ( room.tier === 'VIP' || room.tier === 'Torneos' )
        {
            chips = 10000;
        }
        const name = this.botNames[ this.botCounter % this.botNames.length ];
        this.botCounter++;

        const isMidHand = ( room.gameState !== 'WAITING' && room.gameState !== 'SHOWDOWN' );

        room.addPlayer( {
            seat,
            socketId: `bot_${ Date.now() }_${ seat }`,
            user: { id: `bot_${ seat }`, username: name, email: 'bot@example.com' },
            chips,
            isBot: true,
            holeCards: [],
            folded: isMidHand,
            allIn: false,
            bet: 0,
            sittingOut: false,
            roundBet: 0,
            hasActed: false
        } );
    }
}

module.exports = { BotManager };
