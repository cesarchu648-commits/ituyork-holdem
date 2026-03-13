import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { SocketContext } from './useSocket';

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [user, setUser] = useState(null);
    const socketRef = useRef(null);

    useEffect(() => {
        if (!socketRef.current) {
            const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
            const newSocket = io(BACKEND_URL);
            socketRef.current = newSocket;

            newSocket.on('connect', () => {
                setSocket(newSocket);
            });

            newSocket.on('login_success', (data) => {
                setUser(data.user);
            });

            newSocket.on('user_update', (updatedUser) => {
                setUser(updatedUser);
            });

            newSocket.on('error_notification', (msg) => {
                alert(msg);
            });

            newSocket.on('notification', (msg) => {
                alert(msg);
            });
        }

        return () => {
            if (socketRef.current) {
                socketRef.current.close();
                socketRef.current = null;
            }
        };
    }, []);

    return (
        <SocketContext.Provider value={{ socket, user, setUser }}>
            {children}
        </SocketContext.Provider>
    );
};
