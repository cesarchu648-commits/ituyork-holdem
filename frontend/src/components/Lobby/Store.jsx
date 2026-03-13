import React from 'react';
import { useSocket } from '../../context/useSocket';
import { ShoppingBag, Box, Gem, Zap } from 'lucide-react';

const PACKAGES = [
    { id: 'Pack_Bronze', name: 'Cofre Bronce', type: 'fichas', amount: 50000, price: 100, priceType: 'gold', color: '#cd7f32' },
    { id: 'Pack_Silver', name: 'Cofre Plata', type: 'fichas', amount: 250000, price: 450, priceType: 'gold', color: '#c0c0c0' },
    { id: 'Pack_Gold', name: 'Cofre Oro', type: 'gold', amount: 1000, price: 500000, priceType: 'fichas', color: '#ffd700' },
    { id: 'Pack_Legendary', name: 'Cofre Legendario', type: 'inventory', itemId: 'Golden Card Skin', price: 2000, priceType: 'gold', color: '#b500ff' }
];

export default function Store ( { onClose } )
{
    const { socket } = useSocket();

    const handleBuy = ( pkg ) =>
    {
        if ( socket )
        {
            socket.emit( 'buy_store_item', {
                itemId: pkg.itemId || `${ pkg.amount } ${ pkg.type }`,
                priceType: pkg.priceType,
                priceAmount: pkg.price
            } );
        }
    };

    return (
        <div style={ { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(10px)' } }>
            <div className="glass-panel fade-in" style={ { width: '700px', padding: '40px' } }>
                <h2 className="neon-text-gold" style={ { textAlign: 'center', fontSize: '2rem', marginBottom: '30px' } }><ShoppingBag size={ 30 } style={ { verticalAlign: 'middle', marginRight: '10px' } } /> Tienda de Lujo</h2>

                <div className="grid-3d">
                    { PACKAGES.map( pkg => (
                        <div key={ pkg.id } className="card-3d" style={ { border: `1px solid ${ pkg.color }` } }>
                            <div style={ { background: `linear-gradient(45deg, ${ pkg.color }22, transparent)`, borderRadius: '10px', padding: '20px', marginBottom: '15px', border: `1px dashed ${ pkg.color }` } }>
                                <Box size={ 40 } color={ pkg.color } />
                            </div>
                            <h3 style={ { fontSize: '1rem', marginBottom: '5px' } }>{ pkg.name }</h3>
                            <p style={ { fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '15px' } }>
                                Recibes: <br />
                                <strong style={ { color: pkg.color === '#b500ff' ? 'var(--color-gold)' : pkg.color } }>
                                    { pkg.amount ? pkg.amount.toLocaleString() : '' } { pkg.itemId || pkg.type.toUpperCase() }
                                </strong>
                            </p>
                            <button className="btn btn-gold" onClick={ () => handleBuy( pkg ) } style={ { width: '100%', fontSize: '0.8rem' } }>
                                COMPRAR POR <br /> { pkg.price.toLocaleString() } { pkg.priceType.toUpperCase() }
                            </button>
                        </div>
                    ) ) }
                </div>

                <div style={ { marginTop: '30px', textAlign: 'center' } }>
                    <button className="btn btn-glass" onClick={ onClose } style={ { padding: '12px 40px' } }>Cerrar Vitrina</button>
                </div>
            </div>
        </div>
    );
}
