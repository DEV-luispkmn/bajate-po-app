import { apiFetch } from './client';

export interface MiembroEquipo {
  id: number;
  alias: string;
  avatarUrl?: string | null;
  rango?: string | null;
  roles?: string | null;
  esCapitan: boolean;
  esTL: boolean;
  esFundador: boolean;
}

export interface Equipo {
  id: number;
  nombre: string;
  lema?: string | null;
  descripcion?: string | null;
  logoUrl?: string | null;
  region?: string | null;
  ciudad?: string | null;
  capitanId?: number | null;
  capitanAlias?: string | null;
  fundadorId?: number | null;
  fundadorAlias?: string | null;
  tlId?: number | null;
  tlAlias?: string | null;
  postulacionesAbiertas: boolean;
  codigoAcceso?: string | null;
  fechaFundacion?: string | null;
  createdAt: string;
  totalMiembros: number;
  miembros?: MiembroEquipo[];
}

export interface CrearEquipoDto {
  nombre: string;
  lema?: string;
  descripcion?: string;
  logoUrl?: string;
  region?: string;
  ciudad?: string;
}

export interface ModificarEquipoDto {
  nombre?: string;
  lema?: string;
  descripcion?: string;
  logoUrl?: string;
  region?: string;
  ciudad?: string;
}

export async function listarEquiposApi(filtros?: {
  region?: string;
  search?: string;
}): Promise<Equipo[]> {
  const queryParams = new URLSearchParams();
  if (filtros?.region && filtros.region !== 'TODAS' && filtros.region !== 'TODO CHILE') {
    queryParams.append('region', filtros.region);
  }
  if (filtros?.search?.trim()) {
    queryParams.append('search', filtros.search.trim());
  }

  const qs = queryParams.toString();
  return apiFetch<Equipo[]>(`/equipos${qs ? `?${qs}` : ''}`);
}

export async function obtenerEquipoApi(id: number): Promise<Equipo> {
  return apiFetch<Equipo>(`/equipos/${id}`);
}

export async function obtenerMiEquipoApi(): Promise<Equipo | null> {
  return apiFetch<Equipo | null>('/equipos/mi-equipo');
}

export async function crearEquipoApi(dto: CrearEquipoDto): Promise<Equipo> {
  return apiFetch<Equipo>('/equipos', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function unirseEquipoApi(id: number): Promise<Equipo> {
  return apiFetch<Equipo>(`/equipos/${id}/unirse`, {
    method: 'POST',
  });
}

export async function unirsePorCodigoApi(codigoAcceso: string): Promise<Equipo> {
  return apiFetch<Equipo>('/equipos/unirse-codigo', {
    method: 'POST',
    body: JSON.stringify({ codigoAcceso }),
  });
}

export async function salirEquipoApi(): Promise<{ mensaje: string }> {
  return apiFetch<{ mensaje: string }>('/equipos/salir', {
    method: 'POST',
  });
}

export async function desintegrarEquipoApi(): Promise<{ mensaje: string }> {
  return apiFetch<{ mensaje: string }>('/equipos/mi-equipo', {
    method: 'DELETE',
  });
}

export async function cambiarPostulacionesApi(abiertas: boolean): Promise<Equipo> {
  return apiFetch<Equipo>('/equipos/mi-equipo/postulaciones', {
    method: 'PATCH',
    body: JSON.stringify({ abiertas }),
  });
}

export async function asignarTLApi(nuevoTlId: number): Promise<Equipo> {
  return apiFetch<Equipo>('/equipos/mi-equipo/asignar-tl', {
    method: 'POST',
    body: JSON.stringify({ nuevoTlId }),
  });
}

export async function modificarMiEquipoApi(dto: ModificarEquipoDto): Promise<Equipo> {
  return apiFetch<Equipo>('/equipos/mi-equipo', {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
}

export type EstadoPostulacion = 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA' | 'CANCELADA';

export interface PostulacionEquipo {
  id: number;
  equipoId: number;
  jugadorId: number;
  mensaje?: string | null;
  contacto?: string | null;
  estado: EstadoPostulacion;
  motivoRechazo?: string | null;
  createdAt: string;
  updatedAt?: string;
  jugadorAlias?: string;
  jugadorAvatarUrl?: string | null;
  jugadorRango?: string | null;
  jugadorRegion?: string | null;
  jugadorCiudad?: string | null;
  jugadorEmail?: string;
  equipoNombre?: string;
  equipoLogoUrl?: string | null;
}

export interface PostularEquipoDto {
  contacto?: string;
  mensaje?: string;
}

export async function postularEquipoApi(equipoId: number, dto: PostularEquipoDto): Promise<PostulacionEquipo> {
  return apiFetch<PostulacionEquipo>(`/equipos/${equipoId}/postular`, {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function listarPostulacionesMiEquipoApi(estado?: EstadoPostulacion): Promise<PostulacionEquipo[]> {
  const qs = estado ? `?estado=${estado}` : '';
  return apiFetch<PostulacionEquipo[]>(`/equipos/mi-equipo/postulaciones${qs}`);
}

export async function responderPostulacionApi(
  postulacionId: number,
  decision: 'ACEPTAR' | 'RECHAZAR',
  motivo?: string,
): Promise<PostulacionEquipo> {
  return apiFetch<PostulacionEquipo>(`/equipos/mi-equipo/postulaciones/${postulacionId}/responder`, {
    method: 'POST',
    body: JSON.stringify({ decision, motivo: motivo?.trim() }),
  });
}

export async function obtenerMisPostulacionesApi(): Promise<PostulacionEquipo[]> {
  return apiFetch<PostulacionEquipo[]>('/equipos/mis-postulaciones');
}

export async function cancelarPostulacionApi(id: number): Promise<PostulacionEquipo> {
  return apiFetch<PostulacionEquipo>(`/equipos/mis-postulaciones/${id}`, {
    method: 'DELETE',
  });
}
