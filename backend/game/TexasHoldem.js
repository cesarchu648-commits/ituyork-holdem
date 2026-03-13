const { evaluateHand } = require( './HandEvaluator' );

const SUITS = [ 'H', 'D', 'C', 'S' ];
const RANKS = [ '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A' ];

class TexasHoldem
{
    constructor( roomConfig, io )
    {
        this.roomId = roomConfig.roomId;
        this.tier = roomConfig.tier;
        this.buyIn = roomConfig.buyIn || 1000;
        this.io = io;

        this.players = [];
        this.deck = [];
        this.communityCards = [];
        this.pot = 0;
        this.currentBet = 0;

        this.dealerIndex = -1; // Index in array
        this.sbIndex = -1;
        this.bbIndex = -1;
        this.currentPlayerIndex = -1; // THE MOST CRITICAL VARIABLE

        this.sbAmount = roomConfig.sbAmount || 10;
        this.bbAmount = roomConfig.bbAmount || 20;

        this.gameState = 'WAITING';
        this.raisesThisRound = 0;
        this.handsPlayed = 0;
        this.lastRaiseAmount = 20;

        this.turnTimer = null;
        this.timeLimit = 15000;

        this.debug = true;
    }

    log ( ...args )
    {
        if ( this.debug )
        {
            console.log( `[GAME][${ this.roomId }]`, ...args );
        }
    }

    generateDeck ()
    {
        this.deck = [];
        for ( let s of SUITS )
        {
            for ( let r of RANKS )
            {
                this.deck.push( r + s );
            }
        }
        for ( let i = this.deck.length - 1; i > 0; i-- )
        {
            const j = Math.floor( Math.random() * ( i + 1 ) );
            [ this.deck[ i ], this.deck[ j ] ] = [ this.deck[ j ], this.deck[ i ] ];
        }
        this.log( "Barajando mazo..." );
    }

    startGame ()
    {
        this.log( `Intentando iniciar partida. Estado actual: ${ this.gameState }` );
        if ( this.gameState !== 'WAITING' && this.gameState !== 'SHOWDOWN' )
        {
            this.log( "Partida ya en curso, abortando inicio." );
            return false;
        }

        const activePlayers = this.players.filter( p => !p.sittingOut && p.chips > 0 );
        if ( activePlayers.length < 2 )
        {
            this.log( `No hay suficientes jugadores activos (${ activePlayers.length }), volviendo a WAITING.` );
            this.gameState = 'WAITING';
            this.broadcastState();
            return false;
        }

        this.gameState = 'PRE_FLOP';
        this.generateDeck();
        this.communityCards = [];
        this.pot = 0;
        this.currentBet = 0;
        this.raisesThisRound = 0;
        this.lastRaiseAmount = this.bbAmount;

        // Limpiar estados de ronda previa
        for ( let p of this.players )
        {
            p.holeCards = [];
            p.folded = ( p.chips <= 0 || p.sittingOut );
            p.allIn = false;
            p.bet = 0;
            p.roundBet = 0;
            p.hasActed = false;
        }

        // Dealer logic
        this.dealerIndex = ( this.dealerIndex + 1 ) % this.players.length;
        this.sbIndex = this.getNextActiveIndex( this.dealerIndex );
        this.bbIndex = this.getNextActiveIndex( this.sbIndex );

        this.log( `Dealer: ${ this.dealerIndex }, SB: ${ this.sbIndex }, BB: ${ this.bbIndex }` );

        // Blind progression: double every 5 hands in Torneos AND VIP rooms
        if ( ( this.tier === 'Torneos' || this.tier === 'VIP' ) && this.handsPlayed > 0 && this.handsPlayed % 5 === 0 )
        {
            this.sbAmount *= 2;
            this.bbAmount *= 2;
            this.log( `Ciegas suben a ${ this.sbAmount }/${ this.bbAmount }` );
            if ( this.io )
            {
                this.io.to( this.roomId ).emit( 'room_chat_message', {
                    sender: 'SISTEMA',
                    msg: `⚡ ¡CIEGAS SUBIERON! Ahora: ${ this.sbAmount }/${ this.bbAmount }`,
                    time: Date.now()
                } );
            }
        }

        // Repartir cartas
        for ( let i = 0; i < 2; i++ )
        {
            for ( let p of this.players )
            {
                if ( !p.folded ) p.holeCards.push( this.deck.pop() );
            }
        }

        // Blinds
        this.postBet( this.sbIndex, this.sbAmount );
        this.postBet( this.bbIndex, this.bbAmount );
        this.currentBet = this.bbAmount;

        // Primer turno: El jugador a la izquierda de la BB (o el dealer en 1v1)
        this.currentPlayerIndex = this.getNextActiveIndex( this.bbIndex );
        if ( this.players.length === 2 )
        {
            this.currentPlayerIndex = this.dealerIndex;
        }

        this.handsPlayed++;
        this.log( `Mano iniciada. Primer turno: idx ${ this.currentPlayerIndex } (${ this.players[ this.currentPlayerIndex ]?.user.username })` );

        this.broadcastState();
        if ( this.io ) this.io.to( this.roomId ).emit( 'play_audio', 'deal' );

        this.startTurnTimer();
        return true;
    }

    postBet ( playerIndex, amount )
    {
        let p = this.players[ playerIndex ];
        if ( !p ) return;
        let actualBet = Math.min( amount, p.chips );
        p.chips -= actualBet;
        p.bet += actualBet;
        p.roundBet += actualBet;
        this.pot += actualBet;
        if ( p.chips === 0 ) p.allIn = true;
        this.log( `Posteando apuesta: ${ p.user.username } - ${ actualBet } (Total Pot: ${ this.pot })` );
    }

    addPlayer ( player )
    {
        // Save current turn's seat to restore index after sorting
        const currentSeat = ( this.currentPlayerIndex !== -1 && this.players[ this.currentPlayerIndex ] ) ?
            this.players[ this.currentPlayerIndex ].seat : -1;

        player.ready = false;
        this.players.push( player );
        this.players.sort( ( a, b ) => a.seat - b.seat );

        // Restore index
        if ( currentSeat !== -1 )
        {
            this.currentPlayerIndex = this.players.findIndex( p => p.seat === currentSeat );
        }

        this.log( `Jugador ${ player.user.username } se unió en asiento ${ player.seat }. Index restaurado: ${ this.currentPlayerIndex }` );
        this.broadcastState();

        if ( this.players.length >= 2 && this.gameState === 'WAITING' )
        {
            // Solo auto-iniciamos si no es VIP/Torneo
            if ( this.tier !== 'VIP' && this.tier !== 'Torneos' )
            {
                setTimeout( () => this.startGame(), 3000 );
            }
        }
    }

    toggleReady ( seatIdx )
    {
        const p = this.players[ seatIdx ];
        if ( !p ) return;
        p.ready = !p.ready;
        this.log( `Jugador ${ p.user.username } ${ p.ready ? 'LISTO' : 'NO LISTO' }` );
        this.broadcastState();

        if ( this.gameState === 'WAITING' && this.players.length >= 2 )
        {
            const allReady = this.players.every( player => player.ready || player.isBot );
            if ( allReady )
            {
                this.log( "Todos listos. Iniciando partida VIP/Torneo..." );
                this.startGame();
            }
        }
    }

    startTurnTimer ()
    {
        if ( this.turnTimer ) clearTimeout( this.turnTimer );

        const p = this.players[ this.currentPlayerIndex ];
        if ( !p || p.folded || p.allIn || p.chips <= 0 )
        {
            this.log( `Saltando turno para idx ${ this.currentPlayerIndex } (invalid/folded/allin)` );
            this.nextTurn();
            return;
        }

        this.log( `Iniciando temporizador para ${ p.user.username } (idx ${ this.currentPlayerIndex })` );

        if ( this.io )
        {
            this.broadcastState();
            this.io.to( this.roomId ).emit( 'play_audio', 'turn_started' );
        }

        // Auto-action (bots / sitting out)
        if ( p.sittingOut || p.isBot )
        {
            const delay = 2000 + Math.random() * 3000;
            this.turnTimer = setTimeout( () =>
            {
                if ( p.sittingOut )
                {
                    this.handleAction( this.currentPlayerIndex, 'fold', 0 );
                } else
                {
                    const callAmount = this.currentBet - p.roundBet;
                    const potOdds = callAmount / ( this.pot + callAmount );
                    const random = Math.random();

                    if ( callAmount <= 0 )
                    {
                        // Check or Raise small
                        if ( random > 0.8 && this.raisesThisRound < 3 )
                        {
                            const raise = this.bbAmount * ( 1 + Math.floor( Math.random() * 3 ) );
                            this.handleAction( this.currentPlayerIndex, 'raise', this.currentBet + raise );
                        } else
                        {
                            this.handleAction( this.currentPlayerIndex, 'check', 0 );
                        }
                    } else if ( callAmount >= p.chips )
                    {
                        // All-in or fold
                        if ( random > 0.5 )
                        {
                            this.handleAction( this.currentPlayerIndex, 'call', 0 );
                        } else
                        {
                            this.handleAction( this.currentPlayerIndex, 'fold', 0 );
                        }
                    } else
                    {
                        // Standard decision
                        if ( random > 0.9 && this.raisesThisRound < 3 )
                        {
                            const raise = callAmount + this.bbAmount * 2;
                            this.handleAction( this.currentPlayerIndex, 'raise', this.currentBet + raise );
                        } else if ( random > 0.2 || callAmount < this.bbAmount )
                        {
                            this.handleAction( this.currentPlayerIndex, 'call', 0 );
                        } else
                        {
                            this.handleAction( this.currentPlayerIndex, 'fold', 0 );
                        }
                    }
                }
            }, delay );
            return;
        }

        this.turnTimer = setTimeout( () =>
        {
            this.log( `Timeout para ${ p.user.username }.` );
            let action = ( p.roundBet === this.currentBet ) ? 'check' : 'fold';
            this.handleAction( this.currentPlayerIndex, action, 0 );
        }, this.timeLimit );
    }

    handleAction ( seatIdx, action, amount = 0 )
    {
        if ( seatIdx !== this.currentPlayerIndex )
        {
            this.log( `Action recibida fuera de turno de seatIdx ${ seatIdx } (Current: ${ this.currentPlayerIndex })` );
            return;
        }
        if ( this.turnTimer ) clearTimeout( this.turnTimer );

        const p = this.players[ seatIdx ];
        if ( !p ) return;

        p.hasActed = true;
        this.log( `Acción de ${ p.user.username }: ${ action } (Amount: ${ amount })` );

        if ( action === 'fold' )
        {
            p.folded = true;
            if ( this.io ) this.io.to( this.roomId ).emit( 'play_audio', 'fold' );
        } else if ( action === 'call' || action === 'check' )
        {
            let callAmount = this.currentBet - p.roundBet;
            if ( callAmount > 0 )
            {
                this.postBet( seatIdx, callAmount );
            }
        } else if ( action === 'raise' || action === 'allin' )
        {
            let totalAmount = amount;
            if ( action === 'allin' ) totalAmount = p.chips + p.roundBet;

            const minRaiseTotal = this.currentBet + this.lastRaiseAmount;
            if ( totalAmount < minRaiseTotal && totalAmount < p.chips + p.roundBet )
            {
                totalAmount = minRaiseTotal;
            }
            if ( totalAmount > p.chips + p.roundBet ) totalAmount = p.chips + p.roundBet;

            let toPost = totalAmount - p.roundBet;
            const actualRaiseIncrease = ( p.roundBet + toPost ) - this.currentBet;
            this.postBet( seatIdx, toPost );

            if ( p.roundBet > this.currentBet )
            {
                this.lastRaiseAmount = Math.max( this.lastRaiseAmount, actualRaiseIncrease );
                this.currentBet = p.roundBet;
                this.raisesThisRound++;

                // Si hay subida, todos los demas deben volver a actuar
                for ( let other of this.players )
                {
                    if ( other !== p ) other.hasActed = false;
                }
            }
        }

        this.nextTurn();
    }

    nextTurn ()
    {
        // ¿Solo queda un jugador sin foldear?
        const active = this.players.filter( p => !p.folded );
        if ( active.length === 1 )
        {
            this.log( "Ganador por abandono detectado." );
            return this.endHandEarly();
        }

        // ¿Todos han actuado y las apuestas están igualadas?
        const everyoneActed = active.every( p => p.hasActed || p.allIn );
        const betsEqual = active.every( p => p.roundBet === this.currentBet || p.allIn );

        this.log( `Estado turnos: everyoneActed=${ everyoneActed }, betsEqual=${ betsEqual }` );

        if ( everyoneActed && betsEqual )
        {
            this.log( "Ronda completada." );
            // Si no quedan jugadores capaces de actuar (todos all-in o solo uno con fichas)
            const ableToAct = active.filter( p => !p.allIn && p.chips > 0 );
            if ( ableToAct.length <= 1 )
            {
                this.log( "No más acciones posibles, resolviendo mesa..." );
                this.runOutBoard();
            } else
            {
                this.advanceState();
            }
            return;
        }

        // Siguiente jugador activo
        this.currentPlayerIndex = this.getNextActiveIndex( this.currentPlayerIndex );
        this.log( `Siguiente turno: idx ${ this.currentPlayerIndex }` );
        this.startTurnTimer();
    }

    runOutBoard ()
    {
        const sequence = () =>
        {
            if ( this.gameState === 'SHOWDOWN' || this.gameState === 'WAITING' ) return;
            this.advanceStateInternal();
            this.broadcastState();
            if ( this.gameState !== 'SHOWDOWN' )
            {
                setTimeout( sequence, 1500 );
            }
        };
        sequence();
    }

    advanceStateInternal ()
    {
        this.log( `Avanzando estado. Actual: ${ this.gameState }` );
        this.currentBet = 0;
        this.raisesThisRound = 0;
        this.lastRaiseAmount = this.bbAmount;
        for ( let p of this.players )
        {
            p.roundBet = 0;
            p.hasActed = false;
        }

        if ( this.gameState === 'PRE_FLOP' )
        {
            this.deck.pop(); // burn
            this.communityCards.push( this.deck.pop(), this.deck.pop(), this.deck.pop() );
            this.gameState = 'FLOP';
        } else if ( this.gameState === 'FLOP' )
        {
            this.deck.pop();
            this.communityCards.push( this.deck.pop() );
            this.gameState = 'TURN';
        } else if ( this.gameState === 'TURN' )
        {
            this.deck.pop();
            this.communityCards.push( this.deck.pop() );
            this.gameState = 'RIVER';
        } else if ( this.gameState === 'RIVER' )
        {
            this.gameState = 'SHOWDOWN';
            this.evaluateShowdown();
        }
        this.log( `Nuevo estado: ${ this.gameState }` );
    }

    advanceState ()
    {
        this.advanceStateInternal();
        if ( this.gameState !== 'SHOWDOWN' )
        {
            this.currentPlayerIndex = this.getNextActiveIndex( this.dealerIndex );
            this.broadcastState();
            if ( this.io ) this.io.to( this.roomId ).emit( 'play_audio', 'deal' );
            this.startTurnTimer();
        }
    }

    handlePlayerLeave ( leaveIdx )
    {
        this.log( `Jugador abandonó en idx ${ leaveIdx }. Ajustando índices.` );
        if ( this.currentPlayerIndex > leaveIdx )
        {
            this.currentPlayerIndex--;
        } else if ( this.currentPlayerIndex === leaveIdx )
        {
            // El jugador que se fue tenía el turno
            if ( this.turnTimer ) clearTimeout( this.turnTimer );
            if ( this.players.length === 0 )
            {
                this.gameState = 'WAITING';
                return;
            }
            // No incrementamos currentPlayerIndex porque el siguiente jugador se movió a esta posición
            this.currentPlayerIndex = this.currentPlayerIndex % this.players.length;
            this.startTurnTimer();
        }

        if ( this.dealerIndex >= leaveIdx ) this.dealerIndex = Math.max( 0, this.dealerIndex - 1 );
        if ( this.sbIndex >= leaveIdx ) this.sbIndex = Math.max( 0, this.sbIndex - 1 );
        if ( this.bbIndex >= leaveIdx ) this.bbIndex = Math.max( 0, this.bbIndex - 1 );

        // Si solo queda 1 jugador, terminar mano
        if ( this.gameState !== 'WAITING' && this.players.filter( p => !p.folded ).length <= 1 )
        {
            this.endHandEarly();
        }
    }

    getNextActiveIndex ( current )
    {
        if ( this.players.length === 0 ) return -1;
        let idx = ( current + 1 ) % this.players.length;
        let visited = 0;
        while ( visited < this.players.length )
        {
            let p = this.players[ idx ];
            if ( !p.folded && p.chips > 0 && !p.allIn ) return idx;
            idx = ( idx + 1 ) % this.players.length;
            visited++;
        }
        // Fallback or specific case to find just not folded
        idx = ( current + 1 ) % this.players.length;
        visited = 0;
        while ( visited < this.players.length )
        {
            let p = this.players[ idx ];
            if ( !p.folded ) return idx;
            idx = ( idx + 1 ) % this.players.length;
            visited++;
        }
        return current;
    }

    endHandEarly ()
    {
        this.log( "Finalizando mano anticipadamente." );
        const winner = this.players.find( p => !p.folded );
        if ( winner )
        {
            winner.chips += this.pot;
            this.log( `Ganador: ${ winner.user.username } (+${ this.pot })` );
            if ( this.io )
            {
                this.io.to( this.roomId ).emit( 'showdown', {
                    winners: [ { seat: winner.seat, username: winner.user.username, amount: this.pot, handName: 'Abandonos' } ],
                    communityCards: this.communityCards,
                    pot: 0
                } );
                this.io.to( this.roomId ).emit( 'play_audio', 'victory' );
            }
            if ( this.onHandComplete ) this.onHandComplete( [ { username: winner.user.username, amount: this.pot } ], this.players );
        }
        this.pot = 0;
        this.gameState = 'WAITING';
        this.broadcastState();
        this.scheduleNextHand();
    }

    evaluateShowdown ()
    {
        this.log( "Evaluando Showdown..." );
        const active = this.players.filter( p => !p.folded && p.holeCards && p.holeCards.length === 2 );
        if ( active.length === 0 )
        {
            this.log( "Error: Nadie tiene cartas en Showdown." );
            this.endHandEarly();
            return;
        }

        let evaluations = active.map( p =>
        {
            const evalRes = evaluateHand( p.holeCards, this.communityCards );
            return { player: p, score: evalRes.score, handName: evalRes.name };
        } );

        evaluations.sort( ( a, b ) => b.score - a.score );
        const topScore = evaluations[ 0 ]?.score || 0;
        const winners = evaluations.filter( e => e.score === topScore );

        const splitAmount = Math.floor( this.pot / winners.length );
        const winnerObjects = winners.map( w =>
        {
            w.player.chips += splitAmount;
            this.log( `Ganador: ${ w.player.user.username } (+${ splitAmount }) con ${ w.handName }` );
            return {
                seat: w.player.seat,
                username: w.player.user.username,
                amount: splitAmount,
                handName: w.handName,
                holeCards: w.player.holeCards
            };
        } );

        this.pot = 0;
        this.gameState = 'WAITING';
        if ( this.io )
        {
            this.io.to( this.roomId ).emit( 'showdown', { winners: winnerObjects, communityCards: this.communityCards } );
            this.io.to( this.roomId ).emit( 'play_audio', 'victory' );
            this.broadcastState();
        }
        if ( this.onHandComplete ) this.onHandComplete( winnerObjects, this.players );
        this.scheduleNextHand();
    }

    scheduleNextHand ()
    {
        this.log( "Programando siguiente mano..." );
        const delay = ( this.tier === 'VIP' || this.tier === 'Torneos' ) ? 3000 : 8000;
        setTimeout( () =>
        {
            const allReady = ( this.tier === 'VIP' || this.tier === 'Torneos' ) && this.players.length >= 2 && this.players.every( p => p.ready || p.isBot );

            if ( this.tier !== 'VIP' && this.tier !== 'Torneos' || allReady )
            {
                this.startGame();
            } else
            {
                this.log( "Esperando a que los jugadores marquen LISTO en VIP/Torneo." );
            }
        }, delay );
    }

    broadcastState ()
    {
        this.log( "Broadcasting state to room." );
        if ( !this.io ) return;
        this.players.forEach( p =>
        {
            if ( !p.isBot && p.socketId )
            {
                this.io.to( p.socketId ).emit( 'room_update', this.getEmitState( p.socketId ) );
            }
        } );
        this.io.to( this.roomId ).emit( 'room_update_public', this.getEmitState( null ) );
    }

    getEmitState ( requestorSocketId = null )
    {
        return {
            roomId: this.roomId,
            tier: this.tier,
            buyIn: this.buyIn,
            gameState: this.gameState,
            pot: this.pot,
            communityCards: this.communityCards,
            currentBet: this.currentBet,
            dealerIndex: this.dealerIndex,
            sbIndex: this.sbIndex,
            bbIndex: this.bbIndex,
            bbAmount: this.bbAmount,
            currentPlayerIndex: this.currentPlayerIndex,
            lastRaiseAmount: this.lastRaiseAmount,
            players: this.players.map( ( p, idx ) =>
            {
                const isOwner = p.socketId === requestorSocketId;
                const isShowdown = this.gameState === 'SHOWDOWN' || this.gameState === 'WAITING';
                let handEval = 'Ninguna';
                if ( ( isOwner || isShowdown ) && p.holeCards?.length === 2 && !p.folded )
                {
                    handEval = evaluateHand( p.holeCards, this.communityCards ).name;
                }
                return {
                    seat: p.seat,
                    username: p.user?.username || 'Bot',
                    chips: p.chips,
                    bet: p.roundBet,
                    folded: p.folded,
                    allIn: p.allIn,
                    isBot: p.isBot,
                    sittingOut: p.sittingOut,
                    isActive: !p.folded && p.chips > 0,
                    holeCards: ( isOwner || isShowdown ) ? p.holeCards : [],
                    hasCards: p.holeCards && p.holeCards.length === 2 && !p.folded,
                    currentHandName: ( isOwner || isShowdown ) ? handEval : 'Secret',
                    ready: !!p.ready
                };
            } )
        };
    }
}

module.exports = { TexasHoldem };
