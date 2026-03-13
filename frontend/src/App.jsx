import React from 'react';
import { SocketProvider } from './context/SocketContext';
import { useSocket } from './context/useSocket';
import { AudioProvider } from './context/AudioContext';
import Login from './components/Auth/Login';
import Lobby from './components/Lobby/Lobby';
import PokerTable from './components/Room/PokerTable';

function AppContent ()
{
  const { user } = useSocket();

  if ( !user )
  {
    return <Login />;
  }

  if ( user.state === 'Room' )
  {
    return <PokerTable />;
  }

  return <Lobby />;
}

export default function App ()
{
  return (
    <SocketProvider>
      <AudioProvider>
        <AppContent />
      </AudioProvider>
    </SocketProvider>
  );
}
