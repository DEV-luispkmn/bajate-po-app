import { apiFetch } from './client';

export interface CanchaFotoItem {
  id?: number;
  url: string;
  descripcion?: string;
}

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
  activa?: boolean;
  estado?: 'EN_REVISION' | 'ACTIVA' | 'RECHAZADA';
  creadorId?: number;
  fotos?: CanchaFotoItem[];
  createdAt?: string;
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
  fotos?: { url: string; descripcion?: string }[];
}

export async function listarCanchasApi(
  filtro?: string | { region?: string; regiones?: string[] },
  usuarioId?: number,
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
  if (usuarioId) {
    query.append('usuarioId', String(usuarioId));
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
