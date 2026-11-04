import { apiFetch } from './client';

export interface Bando {
  id: number;
  eventoId: number;
  nombre: string;
  colorHex?: string;
  qrToken?: string;
  jugadoresCount?: number;
}

export interface JugadorEnBando {
  eventoId: number;
  jugadorId: number;
  bandoId?: number | null;
  rol: string;
  alias?: string;
  avatarUrl?: string;
}

export interface JugadorInscritoResumen {
  jugadorId: number;
  bandoId?: number | null;
  rol: string;
}

export interface Evento {
  id: number;
  titulo: string;
  descripcion?: string;
  tipo: 'PICHANGA' | 'VERSUS' | 'TORNEO' | 'EVENTO_MASIVO';
  privacidad: 'ABIERTO' | 'CERRADO';
  canchaId: number;
  organizadorId: number;
  estado: 'PROGRAMADO' | 'EN_CURSO' | 'FINALIZADO' | 'CANCELADO';
  fechaInicio?: string;
  fechaFin?: string;
  region?: string;
  ciudad?: string;
  equipoAId?: number;
  equipoBId?: number;
  codigoInvitacion?: string;
  bandos?: Bando[];
  canchaNombre?: string;
  organizadorAlias?: string;
  jugadoresInscritos?: JugadorInscritoResumen[];
  motivoCancelacion?: string;
}

export interface EquipoResumen {
  id: number;
  nombre: string;
  descripcion?: string | null;
  logoUrl?: string | null;
}

export interface DetalleEventoResponse {
  evento: Evento;
  jugadores: JugadorEnBando[];
}

export interface CrearEventoInput {
  titulo: string;
  descripcion?: string;
  tipo: 'PICHANGA' | 'VERSUS' | 'TORNEO' | 'EVENTO_MASIVO';
  privacidad: 'ABIERTO' | 'CERRADO';
  canchaId: number;
  fechaInicio?: string;
  fechaFin?: string;
  region?: string;
  ciudad?: string;
  equipoAId?: number;
  equipoBId?: number;
  rolOrganizador?: string;
  bandoOrganizadorIndex?: number;
  bandos?: { nombre: string; colorHex?: string }[];
}

export async function listarEventosApi(params?: {
  estado?: string;
  tipo?: string;
  region?: string;
}): Promise<Evento[]> {
  const query = new URLSearchParams();
  if (params?.estado) query.append('estado', params.estado);
  if (params?.tipo) query.append('tipo', params.tipo);
  if (params?.region) query.append('region', params.region);
  const qs = query.toString() ? `?${query.toString()}` : '';
  return apiFetch<Evento[]>(`/eventos${qs}`);
}

export async function obtenerEventoApi(id: number): Promise<DetalleEventoResponse> {
  return apiFetch<DetalleEventoResponse>(`/eventos/${id}`);
}

export async function listarEquiposApi(): Promise<EquipoResumen[]> {
  return apiFetch<EquipoResumen[]>('/eventos/equipos');
}

export async function crearEventoApi(input: CrearEventoInput): Promise<Evento> {
  return apiFetch<Evento>('/eventos', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function cambiarEstadoEventoApi(
  id: number,
  estado: 'PROGRAMADO' | 'EN_CURSO' | 'FINALIZADO' | 'CANCELADO',
  motivoCancelacion?: string,
): Promise<Evento> {
  return apiFetch<Evento>(`/eventos/${id}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ estado, motivoCancelacion }),
  });
}

export async function modificarEventoApi(
  id: number,
  data: Partial<CrearEventoInput>,
): Promise<Evento> {
  return apiFetch<Evento>(`/eventos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function eliminarEventoApi(id: number): Promise<{ mensaje: string }> {
  return apiFetch<{ mensaje: string }>(`/eventos/${id}`, {
    method: 'DELETE',
  });
}

export async function unirseEventoApi(params: {
  eventoId?: number;
  qrToken?: string;
  codigoInvitacion?: string;
  bandoId?: number;
  rol?: string;
}): Promise<JugadorEnBando> {
  return apiFetch<JugadorEnBando>('/eventos/unirse', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function buscarEventoPorCodigoApi(
  codigo: string,
): Promise<DetalleEventoResponse> {
  return apiFetch<DetalleEventoResponse>(
    `/eventos/codigo/${encodeURIComponent(codigo.trim().toUpperCase())}`,
  );
}

