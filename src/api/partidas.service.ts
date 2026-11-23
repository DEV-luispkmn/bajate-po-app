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

export interface JugadorPartidaInfo {
  jugadorId: number;
  alias?: string;
  avatarUrl?: string;
  bandoId: number;
  bandoNombre?: string;
  rol?: string;
  fama?: number;
}

export interface MvpInfo {
  bandoId: number;
  bandoNombre?: string;
  jugadorId: number;
  alias?: string;
  avatarUrl?: string;
  votos: number;
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
  jugadores?: JugadorPartidaInfo[];
  mvps?: MvpInfo[];
  finalizadaAt?: string;
  createdAt?: string;
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
  jugadores?: JugadorPartidaInfo[];
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

export async function votarMvpPartidaApi(
  partidaId: number,
  candidatoId: number,
): Promise<{ mensaje: string }> {
  return apiFetch<{ mensaje: string }>(`/partidas/${partidaId}/votar-mvp`, {
    method: 'POST',
    body: JSON.stringify({ candidatoId }),
  });
}

export async function unirsePartidaApi(
  partidaId: number,
  input?: { bandoId?: number; rol?: string },
): Promise<{
  mensaje: string;
  bandoId: number;
  bandoNombre?: string;
  rol: string;
  jugadores: JugadorPartidaInfo[];
}> {
  return apiFetch(`/partidas/${partidaId}/unirse`, {
    method: 'POST',
    body: JSON.stringify(input || {}),
  });
}

export type TipoEvaluacionFama = 'REPORTE' | 'RECONOCIMIENTO';

export const CATEGORIAS_REPORTES = [
  { id: 'INMORTAL', label: 'Inmortal / Highlander', desc: 'No canta las bajas recibidas ni levanta el trapo rojo' },
  { id: 'CONFLICTIVO', label: 'Conflictivo', desc: 'Genera peleas, agresiones verbales o reclamos desmedidos' },
  { id: 'INFALIBLE', label: 'Infalible', desc: 'Asegura impactar todo sin certeza o acusa sin fundamento' },
  { id: 'MAL_COMPANERO', label: 'Mal Compañero', desc: 'Falta el respeto o descuida la seguridad del grupo' },
  { id: 'NO_TRABAJA_EN_EQUIPO', label: 'No trabaja en equipo', desc: 'Ignora las órdenes de escuadra o juega solo de forma perjudicial' },
] as const;

export const CATEGORIAS_RECONOCIMIENTOS = [
  { id: 'HONESTO', label: 'Honesto', desc: 'Canta sus bajas inmediatamente con total honradez' },
  { id: 'BUEN_COMPANERO', label: 'Buen Compañero', desc: 'Apoya, cubre y comparte consumibles o ánimo con los suyos' },
  { id: 'ESTRATEGA', label: 'Estratega', desc: 'Gran liderazgo táctico, lectura de campo y coordinación' },
  { id: 'ULTIMO_HOMBRE_EN_PIE', label: 'Último Hombre en Pie', desc: 'Defendió la posición con coraje hasta el final' },
] as const;

export interface EvaluacionFamaItem {
  id: number;
  evaluadoId: number;
  tipo: TipoEvaluacionFama;
  categoria: string;
  createdAt: string;
}

export async function evaluarFamaApi(
  partidaId: number,
  evaluadoId: number,
  tipo: TipoEvaluacionFama,
  categoria: string,
): Promise<{
  mensaje: string;
  evaluadoId: number;
  tipo: TipoEvaluacionFama;
  categoria: string;
  esAliado: boolean;
  mismoEquipo: boolean;
  deltaFama: number;
  nuevaFama: number;
}> {
  return apiFetch(`/partidas/${partidaId}/evaluar-fama`, {
    method: 'POST',
    body: JSON.stringify({ evaluadoId, tipo, categoria }),
  });
}

export async function obtenerMisEvaluacionesFamaApi(
  partidaId: number,
): Promise<EvaluacionFamaItem[]> {
  return apiFetch<EvaluacionFamaItem[]>(`/partidas/${partidaId}/mis-evaluaciones-fama`);
}
