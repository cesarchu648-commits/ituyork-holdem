const SPANISH_HANDS = [
    "Carta Alta",
    "Par",
    "Doble Par",
    "Trío",
    "Escalera",
    "Color",
    "Full House",
    "Poker",
    "Escalera de Color",
    "Escalera Real"
];

const CARD_VALUES = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

// Evaluate the best 5-card hand from available cards (2 hole cards + up to 5 community cards)
function evaluateHand ( holeCards, communityCards )
{
    if ( !Array.isArray( holeCards ) ) holeCards = [];
    if ( !Array.isArray( communityCards ) ) communityCards = [];
    const allCards = [ ...holeCards, ...communityCards ];
    if ( allCards.length === 0 ) return { name: "Ninguna", score: 0 };

    // Calculate scores and find best 5 cards (or fewer)
    const comboSize = Math.min( allCards.length, 5 );
    const bestHand = combinations( allCards, comboSize ).reduce( ( best, currentComb ) =>
    {
        const evaluation = evaluateFlexibleCards( currentComb );
        if ( !best || evaluation.score > best.score )
        {
            return evaluation;
        }
        return best;
    }, null );

    return bestHand || { name: "Evaluando...", score: 0 };
}

function evaluateFlexibleCards ( cards )
{
    // Sort cards descending by value
    cards.sort( ( a, b ) => CARD_VALUES[ b[ 0 ] ] - CARD_VALUES[ a[ 0 ] ] );

    const isFlush = cards.length >= 5 && new Set( cards.map( c => c[ 1 ] ) ).size === 1;

    // Check straight
    let isStraight = cards.length >= 5;
    if ( isStraight )
    {
        for ( let i = 0; i < 4; i++ )
        {
            if ( CARD_VALUES[ cards[ i ][ 0 ] ] - 1 !== CARD_VALUES[ cards[ i + 1 ][ 0 ] ] )
            {
                isStraight = false;
                break;
            }
        }
        // Special case: A 5 4 3 2
        if ( !isStraight && cards[ 0 ][ 0 ] === 'A' && cards[ 1 ][ 0 ] === '5' && cards[ 2 ][ 0 ] === '4' && cards[ 3 ][ 0 ] === '3' && cards[ 4 ][ 0 ] === '2' )
        {
            isStraight = true;
            cards.push( cards.shift() ); // Move Ace to end so 5 is the highest
        }
    }

    const counts = {};
    cards.forEach( c =>
    {
        counts[ c[ 0 ] ] = ( counts[ c[ 0 ] ] || 0 ) + 1;
    } );

    const freqs = Object.values( counts ).sort( ( a, b ) => b - a );

    let rank = 0; // High card
    let handName = SPANISH_HANDS[ 0 ];

    if ( isStraight && isFlush )
    {
        if ( cards[ 0 ][ 0 ] === 'A' && cards[ 1 ][ 0 ] === 'K' )
        {
            rank = 9; handName = SPANISH_HANDS[ 9 ]; // Royal Flush
        } else
        {
            rank = 8; handName = SPANISH_HANDS[ 8 ]; // Straight Flush
        }
    } else if ( freqs[ 0 ] === 4 )
    {
        rank = 7; handName = SPANISH_HANDS[ 7 ]; // Quads / Poker
    } else if ( freqs[ 0 ] === 3 && freqs[ 1 ] >= 2 )
    {
        rank = 6; handName = SPANISH_HANDS[ 6 ]; // Full House
    } else if ( isFlush )
    {
        rank = 5; handName = SPANISH_HANDS[ 5 ]; // Flush
    } else if ( isStraight )
    {
        rank = 4; handName = SPANISH_HANDS[ 4 ]; // Straight
    } else if ( freqs[ 0 ] === 3 )
    {
        rank = 3; handName = SPANISH_HANDS[ 3 ]; // Three of a kind
    } else if ( freqs[ 0 ] === 2 && freqs[ 1 ] === 2 )
    {
        rank = 2; handName = SPANISH_HANDS[ 2 ]; // Two Pair
    } else if ( freqs[ 0 ] === 2 )
    {
        rank = 1; handName = SPANISH_HANDS[ 1 ]; // Pair
    }

    // Calculate tiebreaker score
    // We can represent the total strength as a single hex-like number combining rank and card values.
    let scoreBase = rank * 10000000000;

    // For sorting by groups of grouped amounts
    const sortedByFreqList = Object.keys( counts ).sort( ( a, b ) =>
    {
        if ( counts[ b ] !== counts[ a ] ) return counts[ b ] - counts[ a ];
        return CARD_VALUES[ b ] - CARD_VALUES[ a ];
    } ).map( val => CARD_VALUES[ val ] );

    // Append hex-like representation
    let multiplier = 100000000;
    for ( let val of sortedByFreqList )
    {
        for ( let i = 0; i < counts[ Object.keys( CARD_VALUES ).find( key => CARD_VALUES[ key ] === val ) ]; i++ )
        {
            scoreBase += val * multiplier;
            multiplier /= 100;
        }
    }

    return { name: handName, score: scoreBase, cards: cards };
}

// Generate combinations
function combinations ( array, size )
{
    const result = [];
    const helper = ( start, combo ) =>
    {
        if ( combo.length === size )
        {
            result.push( [ ...combo ] );
            return;
        }
        for ( let i = start; i < array.length; i++ )
        {
            combo.push( array[ i ] );
            helper( i + 1, combo );
            combo.pop();
        }
    };
    helper( 0, [] );
    return result;
}

module.exports = { evaluateHand, SPANISH_HANDS };
