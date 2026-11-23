import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getApiUrl } from '../api/client';
import { useAuth } from './AuthContext';
import {
  configurarNotificacionesTelefono,
  mostrarNotificacionTelefono,
  limpiarRecordatoriosDePartida,
} from '../services/deviceNotifications.service';

interface SocketContextType {
  socket: Socket | null;
  conectado: boolean;
  unirseASalaPartida: (partidaId: number) => void;
  salirDeSalaPartida: (partidaId: number) => void;
  suscribirNotificaciones: (callback: (notif: any) => void) => () => void;
}

const SocketContext = createContext<SocketContextType>({} as SocketContextType);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { jugador } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketNotif, setSocketNotif] = useState<Socket | null>(null);
  const [conectado, setConectado] = useState(false);
  const notifListenersRef = useRef<Set<(notif: any) => void>>(new Set());

  // 1. Inicializar permisos y canal de notificaciones en el teléfono
  useEffect(() => {
    configurarNotificacionesTelefono(jugador?.id);
  }, [jugador?.id]);

  // 2. Conexión a WebSockets de Partidas y Notificaciones
  useEffect(() => {
    if (!jugador) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConectado(false);
      }
      if (socketNotif) {
        socketNotif.disconnect();
        setSocketNotif(null);
      }
      return;
    }

    // Socket de Partidas
    const socketPartidasInstance = io(`${getApiUrl()}/partidas`, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      extraHeaders: {
        'ngrok-skip-browser-warning': 'true',
      },
    });

    socketPartidasInstance.on('connect', () => {
      setConectado(true);
    });

    socketPartidasInstance.on('disconnect', () => {
      setConectado(false);
    });

    setSocket(socketPartidasInstance);

    // Socket de Notificaciones Tácticas
    const socketNotifInstance = io(`${getApiUrl()}/notificaciones`, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      extraHeaders: {
        'ngrok-skip-browser-warning': 'true',
      },
    });

    socketNotifInstance.on('connect', () => {
      if (jugador?.id) {
        socketNotifInstance.emit('autenticar', { jugadorId: jugador.id });
      }
    });

    socketNotifInstance.on('nueva_notificacion', async (notif) => {
      // Mostrar notificación emergente nativa en el teléfono (sonido, vibración, banner)
      await mostrarNotificacionTelefono(notif.titulo, notif.mensaje, notif);

      // Si la partida terminó o fue cancelada, cancelar de inmediato cualquier alarma/recordatorio programado (1 día o 30 min)
      let dataLink: any = null;
      if (typeof notif?.link === 'string') {
        try {
          dataLink = JSON.parse(notif.link);
        } catch {}
      }

      const esCanceladoOFinalizado =
        notif?.tipo === 'EVENTO_CANCELADO' ||
        notif?.tipo === 'EVENTO_FINALIZADO' ||
        notif?.tipo === 'PARTIDA_FINALIZADA' ||
        dataLink?.tipo === 'EVENTO_CANCELADO' ||
        dataLink?.tipo === 'EVENTO_FINALIZADO' ||
        dataLink?.tipo === 'PARTIDA_FINALIZADA' ||
        dataLink?.estado === 'CANCELADO' ||
        dataLink?.estado === 'FINALIZADO' ||
        notif?.titulo?.toLowerCase()?.includes('cancelad') ||
        notif?.titulo?.toLowerCase()?.includes('finalizad') ||
        notif?.titulo?.toLowerCase()?.includes('terminad');

      if (esCanceladoOFinalizado) {
        const eventoId =
          notif?.eventoId ||
          notif?.datos?.eventoId ||
          dataLink?.params?.eventoId ||
          dataLink?.eventoId;
        if (eventoId) {
          await limpiarRecordatoriosDePartida(Number(eventoId));
        }
      }

      // Notificar a los componentes suscritos (para actualizar el badge de campana al instante)
      notifListenersRef.current.forEach((cb) => {
        try {
          cb(notif);
        } catch {}
      });
    });

    setSocketNotif(socketNotifInstance);

    return () => {
      socketPartidasInstance.disconnect();
      socketNotifInstance.disconnect();
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

  const suscribirNotificaciones = (callback: (notif: any) => void) => {
    notifListenersRef.current.add(callback);
    return () => {
      notifListenersRef.current.delete(callback);
    };
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        conectado,
        unirseASalaPartida,
        salirDeSalaPartida,
        suscribirNotificaciones,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
