import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Jugador,
  RegistrarInput,
  loginApi,
  registrarApi,
  obtenerMiPerfilApi,
  logoutApi,
} from '../api/auth.service';
import { obtenerToken } from '../api/client';

interface AuthContextType {
  jugador: Jugador | null;
  isLoading: boolean;
  login: (identificador: string, password: string) => Promise<void>;
  registro: (
    dataOrAlias: RegistrarInput | string,
    email?: string,
    password?: string,
  ) => Promise<void>;
  recargarPerfil: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [jugador, setJugador] = useState<Jugador | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function verificarSesion() {
      try {
        const token = await obtenerToken();
        if (token) {
          const perfil = await obtenerMiPerfilApi();
          setJugador(perfil);
        }
      } catch {
        await logoutApi();
        setJugador(null);
      } finally {
        setIsLoading(false);
      }
    }

    verificarSesion();
  }, []);

  const login = async (identificador: string, password: string) => {
    const res = await loginApi(identificador, password);
    const perfil = await obtenerMiPerfilApi().catch(() => null);
    setJugador(perfil || res.jugador);
  };

  const registro = async (
    dataOrAlias: RegistrarInput | string,
    email?: string,
    password?: string,
  ) => {
    let emailLogin = '';
    let passLogin = '';

    if (typeof dataOrAlias === 'string') {
      await registrarApi(dataOrAlias, email, password);
      emailLogin = email || '';
      passLogin = password || '';
    } else {
      await registrarApi(dataOrAlias);
      emailLogin = dataOrAlias.email;
      passLogin = dataOrAlias.password;
    }

    // Después de registrarse, iniciamos sesión automáticamente y aseguramos la región completa
    const res = await loginApi(emailLogin, passLogin);
    const perfil = await obtenerMiPerfilApi().catch(() => null);
    setJugador(perfil || res.jugador);
  };

  const recargarPerfil = async () => {
    try {
      const perfil = await obtenerMiPerfilApi();
      setJugador(perfil);
    } catch {
      // Silencioso
    }
  };

  const logout = async () => {
    await logoutApi();
    setJugador(null);
  };

  return (
    <AuthContext.Provider value={{ jugador, isLoading, login, registro, recargarPerfil, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
