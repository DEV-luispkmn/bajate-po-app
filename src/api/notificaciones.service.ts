import { apiFetch } from './client';

export type TipoNotificacion =
  | 'POSTULACION_APROBADA'
  | 'POSTULACION_RECHAZADA'
  | 'NUEVA_POSTULACION'
  | 'EVENTO_CANCELADO'
  | 'SISTEMA';

export interface Notificacion {
  id: number;
  jugadorId: number;
  titulo: string;
  mensaje: string;
  tipo: TipoNotificacion;
  leida: boolean;
  link?: string | null;
  createdAt: string;
}

export interface RespuestaNotificaciones {
  notificaciones: Notificacion[];
  noLeidas: number;
}

export async function listarNotificacionesApi(): Promise<RespuestaNotificaciones> {
  return apiFetch<RespuestaNotificaciones>('/notificaciones');
}

export async function marcarNotificacionLeidaApi(id: number): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/notificaciones/${id}/leer`, {
    method: 'PATCH',
  });
}

export async function marcarTodasNotificacionesLeidasApi(): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>('/notificaciones/marcar-todas', {
    method: 'PATCH',
  });
}

export async function registrarPushTokenApi(pushToken: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>('/notificaciones/push-token', {
    method: 'PATCH',
    body: JSON.stringify({ pushToken }),
  });
}
