import { createContext, useContext } from 'react';

export const SocketContext = createContext();

export const useSocket = () =>
{
    const context = useContext( SocketContext );
    if ( !context )
    {
        throw new Error( 'useSocket must be used within a SocketProvider' );
    }
    return context;
};
