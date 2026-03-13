import React, { useState } from 'react';
import { useSocket } from '../../context/useSocket';

export default function Login ()
{
    const { socket } = useSocket();
    const [ email, setEmail ] = useState( '' );
    const [ password, setPassword ] = useState( '' );

    const handleLogin = ( e ) =>
    {
        e.preventDefault();
        if ( socket && email )
        {
            socket.emit( 'login', { email, password } );
        }
    };

    return (
        <div className="app-container" style={ { justifyContent: 'center', alignItems: 'center' } }>
            <div className="glass-panel fade-in" style={ { padding: '40px', width: '100%', maxWidth: '400px', textAlign: 'center' } }>
                <h1 className="logo-animated" style={ { marginBottom: '30px' } }>
                    { "Ituyork-Hold'em".split( '' ).map( ( char, index ) => (
                        <span key={ index } style={ { animationDelay: `${ index * 0.05 }s` } }>
                            { char }
                        </span>
                    ) ) }
                </h1>
                <form onSubmit={ handleLogin } style={ { display: 'flex', flexDirection: 'column', gap: '20px' } }>
                    <input
                        type="email"
                        placeholder="Correo Eletcrónico"
                        value={ email }
                        onChange={ ( e ) => setEmail( e.target.value ) }
                        style={ { padding: '12px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.3)', color: '#fff' } }
                        required
                    />
                    <input
                        type="password"
                        placeholder="Contraseña (Opcional si no eres Admin)"
                        value={ password }
                        onChange={ ( e ) => setPassword( e.target.value ) }
                        style={ { padding: '12px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.3)', color: '#fff' } }
                    />
                    <button type="submit" className="btn btn-primary animate-neon-bounce" style={ { marginTop: '10px' } }>
                        ENTRAR
                    </button>
                </form>
            </div>

            <footer style={ { marginTop: '50px', color: 'rgba(255,255,255,0.4)', fontSize: '14px', letterSpacing: '2px', textAlign: 'center' } }>
                <span className="animate-neon-bounce" style={ { display: 'inline-block' } }>Software Developer By: Chuintwo</span>
            </footer>
        </div>
    );
}
