import { apiFetch, guardarToken, borrarToken } from './client';

export interface Jugador {
  id: number;
  alias: string;
  email: string;
  rango?: string;
  avatarUrl?: string;
  region?: string | null;
  ciudad?: string | null;
  roles?: string | null;
  equipoId?: number;
}

export interface PartidaHistorialItem {
  id: number;
  eventoId: number;
  tituloEvento: string;
  canchaNombre: string;
  fecha: string | Date;
  rol: string;
  bandoNombre: string;
  resultado: 'VICTORIA' | 'DERROTA' | 'EMPATE' | 'EN_JUEGO';
  marcador: string;
}

export interface PerfilCompleto {
  id: number;
  alias: string;
  email: string;
  rango: string;
  avatarUrl: string;
  region?: string | null;
  ciudad?: string | null;
  roles?: string | null;
  createdAt: string;
  equipo: {
    id: number;
    nombre: string;
    descripcion?: string | null;
    logoUrl?: string | null;
  } | null;
  estadisticas: {
    eventosParticipados: number;
    rondasGanadas: number;
    rolPredilecto: string;
  };
  medallas: {
    id: string;
    titulo: string;
    descripcion: string;
    icono: string;
    obtenida: boolean;
  }[];
  historialPartidas: PartidaHistorialItem[];
}

export interface LoginResponse {
  accessToken: string;
  jugador: Jugador;
}

export interface RegistrarInput {
  alias: string;
  email: string;
  password: string;
  region?: string;
  ciudad?: string;
  avatarUrl?: string;
  roles?: string;
}

export async function loginApi(identificador: string, password: string): Promise<LoginResponse> {
  const res = await apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identificador, password }),
  });

  if (res.accessToken) {
    await guardarToken(res.accessToken);
  }

  return res;
}

export async function registrarApi(
  dataOrAlias: RegistrarInput | string,
  email?: string,
  password?: string,
): Promise<Jugador> {
  const payload =
    typeof dataOrAlias === 'string'
      ? { alias: dataOrAlias, email, password }
      : dataOrAlias;

  return apiFetch<Jugador>('/jugadores', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function obtenerMiPerfilApi(): Promise<Jugador> {
  return apiFetch<Jugador>('/auth/me');
}

export async function obtenerPerfilCompletoApi(): Promise<PerfilCompleto> {
  return apiFetch<PerfilCompleto>('/jugadores/perfil');
}

export async function actualizarPerfilApi(data: {
  alias?: string;
  rango?: string;
  avatarUrl?: string;
  region?: string;
  ciudad?: string;
  roles?: string;
}): Promise<Jugador> {
  return apiFetch<Jugador>('/jugadores/perfil', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function logoutApi(): Promise<void> {
  await borrarToken();
}
