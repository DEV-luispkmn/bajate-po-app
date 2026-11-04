import { apiFetch } from './client';

export interface Cancha {
  id: number;
  nombre: string;
  descripcion?: string | null;
  latitud?: number;
  longitud?: number;
  region?: string | null;
  ciudad?: string | null;
  esAbierta?: boolean;
  adminEquipoId?: number | null;
  equipoAdminNombre?: string | null;
}

export interface CrearCanchaInput {
  nombre: string;
  descripcion?: string;
  latitud?: number;
  longitud?: number;
  region?: string;
  ciudad?: string;
  esAbierta?: boolean;
  adminEquipoId?: number | null;
}

export async function listarCanchasApi(
  filtro?: string | { region?: string; regiones?: string[] },
): Promise<Cancha[]> {
  const query = new URLSearchParams();
  if (typeof filtro === 'string') {
    if (filtro.trim()) query.append('region', filtro.trim());
  } else if (filtro) {
    if (filtro.region?.trim()) query.append('region', filtro.region.trim());
    if (filtro.regiones && filtro.regiones.length > 0) {
      query.append('regiones', filtro.regiones.join(','));
    }
  }
  const qs = query.toString() ? `?${query.toString()}` : '';
  return apiFetch<Cancha[]>(`/canchas${qs}`);
}

export async function crearCanchaApi(data: CrearCanchaInput): Promise<Cancha> {
  return apiFetch<Cancha>('/canchas', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function modificarCanchaApi(
  id: number,
  data: Partial<CrearCanchaInput>,
): Promise<Cancha> {
  return apiFetch<Cancha>(`/canchas/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
