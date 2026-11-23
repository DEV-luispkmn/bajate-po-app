import { apiFetch } from './client';

export interface Escuadra {
  id: number;
  bandoId: number;
  nombre: string;
  cupoMax: number;
  liderId?: number;
  liderAlias?: string;
  jugadoresCount?: number;
  frecuenciaRadio?: string;
  subtonoRadio?: string;
}

export interface Bando {
  id: number;
  eventoId: number;
  nombre: string;
  colorHex?: string;
  qrToken?: string;
  cupoMax?: number;
  jugadoresCount?: number;
  liderId?: number;
  liderAlias?: string;
  escuadras?: Escuadra[];
  frecuenciaRadio?: string;
  subtonoRadio?: string;
}

export interface JugadorEnBando {
  eventoId: number;
  jugadorId: number;
  bandoId?: number | null;
  rol: string;
  alias?: string;
  avatarUrl?: string;
  escuadraId?: number | null;
  escuadraNombre?: string;
  fama?: number;
}

export interface JugadorInscritoResumen {
  jugadorId: number;
  bandoId?: number | null;
  escuadraId?: number | null;
  rol: string;
}

export interface CoorganizadorInfo {
  jugadorId: number;
  alias?: string;
}

export interface LimiteCronoItem {
  categoria: string;
  maxJoules: number;
  maxFps?: number;
  medMetros: number;
  tipoDisparo: string;
}

export interface EventoTacsop {
  id?: number;
  eventoId?: number;
  presetTipo: string;
  vidasMax: number;
  requiereTorniquete: boolean;
  torniquetesPorJugador: number;
  tiempoDesangradoMin: number;
  soloMedicoRevive: boolean;
  requierePanueloRojo: boolean;
  luzRojaNocturna: string;
  tipoCargadores: string;
  limiteMunicionBbs?: number | null;
  pirotecniaPermitida: boolean;
  humoFrioPermitido: boolean;
  limitesCrono?: LimiteCronoItem[] | null;
  frecuenciaEmergencia?: string | null;
  frecuenciaStaff?: string | null;
  subtonoStaff?: string | null;
  reglasAdicionales?: string | null;
}

export interface FaseEvento {
  id: number;
  eventoId: number;
  orden: number;
  nombre: string;
  descripcion?: string | null;
  horaInicio?: string | null;
  horaFin?: string | null;
  esFaseCrono: boolean;
  activa: boolean;
  completada: boolean;
}

export interface RegistroCronoReplica {
  id: number;
  eventoId: number;
  jugadorId: number;
  tipoReplica: string;
  categoria: string;
  modelo?: string | null;
  joules: number;
  fps?: number | null;
  gramajeBb?: number | null;
  aprobado: boolean;
  notas?: string | null;
  cronoPorId?: number | null;
  createdAt: string;
  jugadorAlias?: string;
}

export interface MapaPinItem {
  id: string;
  x: number;
  y: number;
  tipo: 'FOB_A' | 'FOB_B' | 'RESPAWN' | 'OBJETIVO' | 'SAFE_ZONE';
  etiqueta: string;
  descripcion?: string;
}

export interface MisionEvento {
  id: number;
  eventoId: number;
  bandoId: number;
  titulo: string;
  descripcionLider: string;
  descripcionOperadores: string;
  fotoUrl?: string | null;
  estado: string;
  createdAt: string;
  updatedAt?: string;
  bandoNombre?: string;
  bandoColorHex?: string;
}

export interface Evento {
  id: number;
  titulo: string;
  descripcion?: string;
  tipo: 'PICHANGA' | 'VERSUS' | 'TORNEO' | 'EVENTO_MASIVO';
  privacidad: 'ABIERTO' | 'CERRADO';
  canchaId?: number | null;
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
  inscripcionesAbiertas?: boolean;
  coorganizadores?: CoorganizadorInfo[];
  latitud?: number | null;
  longitud?: number | null;
  direccionTexto?: string | null;
  mapaTacticoUrl?: string | null;
  mapaPines?: MapaPinItem[] | null;
  tacsop?: EventoTacsop | null;
  fases?: FaseEvento[];
  registrosCrono?: RegistroCronoReplica[];
  misiones?: MisionEvento[];
}

export interface CrearEventoInput {
  titulo: string;
  descripcion?: string;
  tipo: 'PICHANGA' | 'VERSUS' | 'TORNEO' | 'EVENTO_MASIVO';
  privacidad: 'ABIERTO' | 'CERRADO';
  canchaId?: number | null;
  latitud?: number | null;
  longitud?: number | null;
  direccionTexto?: string | null;
  mapaTacticoUrl?: string | null;
  mapaPines?: MapaPinItem[] | null;
  tacsop?: Partial<EventoTacsop>;
  fases?: Partial<FaseEvento>[];
  fechaInicio?: string;
  fechaFin?: string;
  region?: string;
  ciudad?: string;
  equipoAId?: number;
  equipoBId?: number;
  rolOrganizador?: string;
  bandoOrganizadorIndex?: number;
  bandos?: { nombre: string; colorHex?: string; cupoMax?: number; frecuenciaRadio?: string; subtonoRadio?: string }[];
}

export interface DetalleEventoResponse {
  evento: Evento;
  jugadores: JugadorEnBando[];
}

export interface EquipoResumen {
  id: number;
  nombre: string;
  escudoUrl?: string | null;
}

export async function listarEventosApi(
  params?: {
    estado?: string;
    tipo?: string;
    region?: string;
  },
  jugadorId?: number,
): Promise<Evento[]> {
  const query = new URLSearchParams();
  if (params?.estado) query.append('estado', params.estado);
  if (params?.tipo) query.append('tipo', params.tipo);
  if (params?.region) query.append('region', params.region);
  if (jugadorId) query.append('jugadorId', jugadorId.toString());
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

export interface ReplicaDeclaradaParam {
  tipoReplica: 'PRIMARIA' | 'PRIMARIA_2' | 'SECUNDARIA' | 'RESPALDO';
  categoria: string;
  modelo?: string;
  fpsEstimado?: number;
  joulesEstimados?: number;
}

export async function unirseEventoApi(params: {
  eventoId?: number;
  qrToken?: string;
  codigoInvitacion?: string;
  bandoId?: number;
  rol?: string;
  replicas?: ReplicaDeclaradaParam[];
}): Promise<JugadorEnBando> {
  return apiFetch<JugadorEnBando>('/eventos/unirse', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function desinscribirseEventoApi(eventoId: number): Promise<{ mensaje: string }> {
  return apiFetch<{ mensaje: string }>(`/eventos/${Number(eventoId)}/desinscribirse`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function buscarEventoPorCodigoApi(
  codigo: string,
): Promise<DetalleEventoResponse> {
  return apiFetch<DetalleEventoResponse>(
    `/eventos/codigo/${encodeURIComponent(codigo.trim().toUpperCase())}`,
  );
}

// --- Métodos para Eventos Masivos: Inscripciones, Facciones, Escuadras y Co-organizadores ---

export async function gestionarInscripcionesApi(
  eventoId: number,
  abiertas: boolean,
): Promise<{ mensaje: string; evento: Evento }> {
  return apiFetch<{ mensaje: string; evento: Evento }>(`/eventos/${eventoId}/inscripciones`, {
    method: 'PATCH',
    body: JSON.stringify({ abiertas }),
  });
}

export async function designarLiderBandoApi(
  eventoId: number,
  bandoId: number,
  jugadorId: number | null,
): Promise<{ mensaje: string; evento: Evento }> {
  return apiFetch<{ mensaje: string; evento: Evento }>(`/eventos/${eventoId}/bandos/${bandoId}/lider`, {
    method: 'PATCH',
    body: JSON.stringify({ jugadorId }),
  });
}

export async function crearEscuadraApi(
  eventoId: number,
  bandoId: number,
  data: { nombre: string; cupoMax?: number; liderId?: number },
): Promise<{ mensaje: string; escuadra: Escuadra; evento: Evento }> {
  return apiFetch<{ mensaje: string; escuadra: Escuadra; evento: Evento }>(
    `/eventos/${eventoId}/bandos/${bandoId}/escuadras`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );
}

export async function generarEscuadrasApi(
  eventoId: number,
  bandoId: number,
  data: { cantidad: number; prefijo?: string; cupoMax?: number },
): Promise<{ mensaje: string; escuadras: Escuadra[]; evento: Evento }> {
  return apiFetch<{ mensaje: string; escuadras: Escuadra[]; evento: Evento }>(
    `/eventos/${eventoId}/bandos/${bandoId}/escuadras/generar`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );
}

export async function eliminarEscuadraApi(
  eventoId: number,
  escuadraId: number,
): Promise<{ mensaje: string; evento: Evento }> {
  return apiFetch<{ mensaje: string; evento: Evento }>(
    `/eventos/${eventoId}/escuadras/${escuadraId}`,
    {
      method: 'DELETE',
    },
  );
}

export async function unirseEscuadraApi(
  eventoId: number,
  escuadraId: number,
): Promise<{ mensaje: string; escuadraId: number; evento: Evento }> {
  return apiFetch<{ mensaje: string; escuadraId: number; evento: Evento }>(
    `/eventos/${eventoId}/escuadras/${escuadraId}/unirse`,
    {
      method: 'POST',
    },
  );
}

export async function salirEscuadraApi(
  eventoId: number,
): Promise<{ mensaje: string; evento: Evento }> {
  return apiFetch<{ mensaje: string; evento: Evento }>(
    `/eventos/${eventoId}/escuadras/salir`,
    {
      method: 'DELETE',
    },
  );
}

export async function agregarCoorganizadorApi(
  eventoId: number,
  jugadorId: number,
): Promise<{ mensaje: string; evento: Evento }> {
  return apiFetch<{ mensaje: string; evento: Evento }>(
    `/eventos/${eventoId}/organizadores`,
    {
      method: 'POST',
      body: JSON.stringify({ jugadorId }),
    },
  );
}

export async function removerCoorganizadorApi(
  eventoId: number,
  jugadorId: number,
): Promise<{ mensaje: string; evento: Evento }> {
  return apiFetch<{ mensaje: string; evento: Evento }>(
    `/eventos/${eventoId}/organizadores/${jugadorId}`,
    {
      method: 'DELETE',
    },
  );
}

// --- TACSOP, COMMS, FASES Y CRONO ---

export async function guardarTacsopApi(
  eventoId: number,
  data: Partial<EventoTacsop>,
): Promise<{ mensaje: string; tacsop: EventoTacsop; evento: Evento }> {
  return apiFetch<{ mensaje: string; tacsop: EventoTacsop; evento: Evento }>(
    `/eventos/${eventoId}/tacsop`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    },
  );
}

export async function actualizarCommsBandoApi(
  eventoId: number,
  bandoId: number,
  data: { frecuenciaRadio?: string; subtonoRadio?: string },
): Promise<{ mensaje: string; evento: Evento }> {
  return apiFetch<{ mensaje: string; evento: Evento }>(
    `/eventos/${eventoId}/bandos/${bandoId}/comms`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    },
  );
}

export async function actualizarCommsEscuadraApi(
  eventoId: number,
  escuadraId: number,
  data: { frecuenciaRadio?: string; subtonoRadio?: string },
): Promise<{ mensaje: string; evento: Evento }> {
  return apiFetch<{ mensaje: string; evento: Evento }>(
    `/eventos/${eventoId}/escuadras/${escuadraId}/comms`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    },
  );
}

export async function actualizarMapaTacticoApi(
  eventoId: number,
  data: { mapaTacticoUrl?: string; mapaPines?: any },
): Promise<{ mensaje: string; evento: Evento }> {
  return apiFetch<{ mensaje: string; evento: Evento }>(
    `/eventos/${eventoId}/mapa-tactico`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    },
  );
}

export async function crearFaseApi(
  eventoId: number,
  data: {
    nombre: string;
    descripcion?: string;
    orden?: number;
    horaInicio?: string;
    horaFin?: string;
    esFaseCrono?: boolean;
    activa?: boolean;
  },
): Promise<{ mensaje: string; fase: FaseEvento; evento: Evento }> {
  return apiFetch<{ mensaje: string; fase: FaseEvento; evento: Evento }>(
    `/eventos/${eventoId}/fases`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );
}

export async function actualizarFaseApi(
  eventoId: number,
  faseId: number,
  data: Partial<FaseEvento>,
): Promise<{ mensaje: string; fase: FaseEvento; evento: Evento }> {
  return apiFetch<{ mensaje: string; fase: FaseEvento; evento: Evento }>(
    `/eventos/${eventoId}/fases/${faseId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    },
  );
}

export async function eliminarFaseApi(
  eventoId: number,
  faseId: number,
): Promise<{ mensaje: string; evento: Evento }> {
  return apiFetch<{ mensaje: string; evento: Evento }>(
    `/eventos/${eventoId}/fases/${faseId}`,
    {
      method: 'DELETE',
    },
  );
}

export async function activarFaseApi(
  eventoId: number,
  faseId: number,
): Promise<{ mensaje: string; faseActiva: FaseEvento; evento: Evento }> {
  return apiFetch<{ mensaje: string; faseActiva: FaseEvento; evento: Evento }>(
    `/eventos/${eventoId}/fases/${faseId}/activar`,
    {
      method: 'POST',
    },
  );
}

export async function registrarCronoReplicaApi(
  eventoId: number,
  data: {
    jugadorId: number;
    tipoReplica?: string;
    categoria: string;
    modelo?: string;
    joules: number;
    fps?: number;
    gramajeBb?: number;
    aprobado?: boolean;
    notas?: string;
  },
): Promise<{ mensaje: string; registro: RegistroCronoReplica; evento: Evento }> {
  return apiFetch<{ mensaje: string; registro: RegistroCronoReplica; evento: Evento }>(
    `/eventos/${eventoId}/crono`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );
}

export async function eliminarRegistroCronoApi(
  eventoId: number,
  cronoId: number,
): Promise<{ mensaje: string; evento: Evento }> {
  return apiFetch<{ mensaje: string; evento: Evento }>(
    `/eventos/${eventoId}/crono/${cronoId}`,
    {
      method: 'DELETE',
    },
  );
}

export async function crearMisionApi(
  eventoId: number,
  data: {
    bandoId: number;
    titulo: string;
    descripcionLider: string;
    descripcionOperadores: string;
    fotoUrl?: string;
  },
): Promise<{ mensaje: string; mision: MisionEvento; evento: Evento }> {
  return apiFetch<{ mensaje: string; mision: MisionEvento; evento: Evento }>(
    `/eventos/${eventoId}/misiones`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );
}

export async function actualizarEstadoMisionApi(
  eventoId: number,
  misionId: number,
  estado: string,
): Promise<{ mensaje: string; mision: MisionEvento; evento: Evento }> {
  return apiFetch<{ mensaje: string; mision: MisionEvento; evento: Evento }>(
    `/eventos/${eventoId}/misiones/${misionId}/estado`,
    {
      method: 'PATCH',
      body: JSON.stringify({ estado }),
    },
  );
}

export async function eliminarMisionApi(
  eventoId: number,
  misionId: number,
): Promise<{ mensaje: string; evento: Evento }> {
  return apiFetch<{ mensaje: string; evento: Evento }>(
    `/eventos/${eventoId}/misiones/${misionId}`,
    {
      method: 'DELETE',
    },
  );
}

