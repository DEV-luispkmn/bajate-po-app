import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getApiUrl } from '../api/client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  conectado: boolean;
  unirseASalaPartida: (partidaId: number) => void;
  salirDeSalaPartida: (partidaId: number) => void;
}

const SocketContext = createContext<SocketContextType>({} as SocketContextType);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { jugador } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [conectado, setConectado] = useState(false);

  useEffect(() => {
    if (!jugador) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConectado(false);
      }
      return;
    }

    const socketInstance = io(`${getApiUrl()}/partidas`, {
      transports: ['websocket'],
      autoConnect: true,
    });

    socketInstance.on('connect', () => {
      setConectado(true);
    });

    socketInstance.on('disconnect', () => {
      setConectado(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [jugador]);

  const unirseASalaPartida = (partidaId: number) => {
    if (socket && conectado) {
      socket.emit('unirse_partida', { partidaId });
    }
  };

  const salirDeSalaPartida = (partidaId: number) => {
    if (socket && conectado) {
      socket.emit('salir_partida', { partidaId });
    }
  };

  return (
    <SocketContext.Provider
      value={{ socket, conectado, unirseASalaPartida, salirDeSalaPartida }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
