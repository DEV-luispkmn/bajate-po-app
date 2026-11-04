import { apiFetch } from './client';

export interface ModalidadPartida {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  reglas?: string | null;
  icono?: string | null;
  activa: boolean;
}

export interface RolTactico {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  icono?: string | null;
  activo: boolean;
}

export interface RangoMilitar {
  id: number;
  orden: number;
  codigo: string;
  nombre: string;
  puntosRequeridos: number;
  logrosRequeridos: number;
  insigniaUrl?: string | null;
  descripcion?: string | null;
  logrosDesbloquean?: Logro[];
}

export interface Logro {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  icono?: string | null;
  puntosOtorgados: number;
  hitoTipo: string;
  metaHito: number;
  rangoDesbloqueadoId?: number | null;
  rangoDesbloqueado?: RangoMilitar | null;
}

export interface TicketSoporte {
  id: number;
  jugadorId: number;
  tipo: 'IDEA' | 'SUGERENCIA' | 'PROBLEMA' | 'CANCHA' | 'OTRO';
  titulo: string;
  mensaje: string;
  estado: 'PENDIENTE' | 'EN_REVISION' | 'RESPONDIDO' | 'CERRADO';
  respuestaAdmin?: string | null;
  createdAt: string;
}

export async function listarModalidadesApi(): Promise<ModalidadPartida[]> {
  return apiFetch<ModalidadPartida[]>('/configuracion/modalidades');
}

export async function listarRolesTacticosApi(): Promise<RolTactico[]> {
  return apiFetch<RolTactico[]>('/configuracion/roles');
}

export async function listarRangosMilitaresApi(): Promise<RangoMilitar[]> {
  return apiFetch<RangoMilitar[]>('/configuracion/rangos');
}

export async function listarLogrosApi(): Promise<Logro[]> {
  return apiFetch<Logro[]>('/configuracion/logros');
}

export async function crearTicketApi(input: {
  tipo: string;
  titulo: string;
  mensaje: string;
}): Promise<TicketSoporte> {
  return apiFetch<TicketSoporte>('/configuracion/tickets', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function listarMisTicketsApi(): Promise<TicketSoporte[]> {
  return apiFetch<TicketSoporte[]>('/configuracion/mis-tickets');
}

export async function actualizarPreferenciaNotificacionesApi(
  recibeNotificaciones: boolean,
): Promise<{ recibeNotificaciones: boolean }> {
  return apiFetch<{ recibeNotificaciones: boolean }>('/configuracion/notificaciones', {
    method: 'PATCH',
    body: JSON.stringify({ recibeNotificaciones }),
  });
}
