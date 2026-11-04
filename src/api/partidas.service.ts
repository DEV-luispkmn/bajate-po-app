import { apiFetch } from './client';

export interface Ronda {
  id: number;
  partidaId: number;
  numeroRonda: number;
  bandoGanadorId?: number;
  estadoSync: 'PENDIENTE_SYNC' | 'SINCRONIZADO';
  fechaRegistro: string;
  bandoGanadorNombre?: string;
}

export interface Partida {
  id: number;
  eventoId: number;
  estado: 'PENDIENTE' | 'EN_CURSO' | 'FINALIZADA';
  nombre?: string;
  rondas?: Ronda[];
  marcador?: Record<number, number>;
  modalidadId?: number;
  modalidadNombre?: string;
}

export async function crearPartidaApi(input: {
  eventoId: number;
  nombre?: string;
  modalidadId?: number;
  modalidadNombre?: string;
}): Promise<Partida> {
  return apiFetch<Partida>('/partidas', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export interface DetallePartidaResponse {
  partida: Partida;
  bandos: { id: number; nombre: string; colorHex?: string }[];
  organizadorId: number;
  tituloEvento: string;
}

export async function obtenerPartidaApi(id: number): Promise<DetallePartidaResponse> {
  return apiFetch<DetallePartidaResponse>(`/partidas/${id}`);
}

export async function cambiarEstadoPartidaApi(
  id: number,
  estado: 'PENDIENTE' | 'EN_CURSO' | 'FINALIZADA',
): Promise<Partida> {
  return apiFetch<Partida>(`/partidas/${id}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ estado }),
  });
}

export async function listarPartidasPorEventoApi(eventoId: number): Promise<Partida[]> {
  return apiFetch<Partida[]>(`/partidas/evento/${eventoId}`);
}

export async function registrarRondaApi(
  partidaId: number,
  numeroRonda: number,
  bandoGanadorId?: number,
): Promise<Ronda> {
  return apiFetch<Ronda>(`/partidas/${partidaId}/rondas`, {
    method: 'POST',
    body: JSON.stringify({ numeroRonda, bandoGanadorId }),
  });
}

export async function sincronizarRondasOfflineApi(
  partidaId: number,
  rondas: { numeroRonda: number; bandoGanadorId?: number; fechaRegistro: string }[],
): Promise<Ronda[]> {
  return apiFetch<Ronda[]>(`/partidas/${partidaId}/rondas/sincronizar`, {
    method: 'POST',
    body: JSON.stringify({ rondas }),
  });
}
