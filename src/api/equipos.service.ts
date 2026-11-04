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
