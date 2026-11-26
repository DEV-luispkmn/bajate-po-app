export type PresetReglasPartida = 'DOMINGUERA' | 'CQB' | 'VERSUS_TACTICO' | 'CUSTOM';

export type CronoDominguero = 'ESTANDAR_CL' | 'CQB_350' | 'MIXTO_380';

export type ModoDisparoDominguero = 'SOLO_SEMI' | 'SEMI_INTERIOR' | 'LIBRE_RAFAGA_CORTA';

export type SistemaBajasDominguero = 'RESPAWN_DIRECTO' | 'MEDICO_RAPIDO' | 'ELIMINACION_RONDA';

export type ReglaCortesia = 'OPCIONAL_5M' | 'OBLIGATORIA_5M' | 'SIN_CORTESIA';

export type CargadoresDominguero = 'LIBRE' | 'MID_CAP';

export interface ConfigReglasPartida {
  preset: PresetReglasPartida;
  crono: CronoDominguero;
  modoDisparo: ModoDisparoDominguero;
  sistemaBajas: SistemaBajasDominguero;
  cortesia: ReglaCortesia;
  cargadores: CargadoresDominguero;
  proteccionOcularObligatoria: boolean;
  panueloRojoObligatorio: boolean;
  prohibidoTiroACiegas: boolean;
  replicaYRebotesNoCuentan: boolean;
  fuegoAmigoCuenta: boolean;
  granadasPermitidas: boolean;
}

export interface PresetReglaMeta {
  id: PresetReglasPartida;
  titulo: string;
  icono: 'pine-tree' | 'door-open' | 'sword-cross' | 'tune-variant';
  resumen: string;
}

export const PRESETS_REGLAS_PARTIDA: PresetReglaMeta[] = [
  {
    id: 'DOMINGUERA',
    titulo: 'DOMINGUERA CLÁSICA',
    icono: 'pine-tree',
    resumen: 'Bosque / Mixto estándar Chile · Asalto 400 FPS · Semi en interiores · Respawn directo',
  },
  {
    id: 'CQB',
    titulo: 'CQB / RECINTO CERRADO',
    icono: 'door-open',
    resumen: 'Máx. 350 FPS todas las réplicas · Solo Semi · Sin DMR/Sniper · Mid-Cap',
  },
  {
    id: 'VERSUS_TACTICO',
    titulo: 'VERSUS TÁCTICO',
    icono: 'sword-cross',
    resumen: 'Duelo de escuadras · Estándar Chile · Eliminación por rondas · Sin cortesía · Mid-Cap',
  },
  {
    id: 'CUSTOM',
    titulo: 'PERSONALIZADO (CUSTOM)',
    icono: 'tune-variant',
    resumen: 'Ajusta crono, disparo, bajas, cortesía y reglas de seguridad a tu medida',
  },
];

export interface OpcionRegla<T extends string> {
  id: T;
  labelCorto: string;
  detalle: string;
}

export const OPCIONES_CRONO: OpcionRegla<CronoDominguero>[] = [
  {
    id: 'ESTANDAR_CL',
    labelCorto: 'Estándar CL',
    detalle:
      'Estándar Chile (0.20g) — CQB/Pistola ≤350 FPS (0m) · Asalto ≤400 FPS (5m) · Apoyo ≤415 FPS (15m) · DMR ≤450 FPS Semi (20m) · Sniper ≤550 FPS Cerrojo (25m).',
  },
  {
    id: 'CQB_350',
    labelCorto: 'CQB ≤350',
    detalle:
      'CQB / Recinto Cerrado (0.20g) — Máx. 350 FPS (1.14 J) todas las réplicas · MED 0m · Sin DMR ni Sniper.',
  },
  {
    id: 'MIXTO_380',
    labelCorto: 'Mixto ≤380',
    detalle:
      'Cancha Mediana (0.20g) — CQB/Asalto ≤380 FPS (5m) · DMR ≤420 FPS Semi (15m) · Sin Sniper.',
  },
];

export const OPCIONES_MODO_DISPARO: OpcionRegla<ModoDisparoDominguero>[] = [
  {
    id: 'SOLO_SEMI',
    labelCorto: 'Solo Semi',
    detalle: 'Solo tiro en SEMI en toda la cancha.',
  },
  {
    id: 'SEMI_INTERIOR',
    labelCorto: 'Semi interior',
    detalle: 'SEMI obligatorio en interiores y corta distancia · Ráfaga corta en exterior.',
  },
  {
    id: 'LIBRE_RAFAGA_CORTA',
    labelCorto: 'Ráfaga corta',
    detalle: 'Libre con ráfagas cortas controladas (sin sobre-disparar).',
  },
];

export const OPCIONES_SISTEMA_BAJAS: OpcionRegla<SistemaBajasDominguero>[] = [
  {
    id: 'RESPAWN_DIRECTO',
    labelCorto: 'Respawn directo',
    detalle: 'Baja directa al respawn (gritar "¡Baja!" y levantar la mano).',
  },
  {
    id: 'MEDICO_RAPIDO',
    labelCorto: 'Médico rápido',
    detalle: '1 curación rápida en terreno (toque 20s) antes de volver a respawn.',
  },
  {
    id: 'ELIMINACION_RONDA',
    labelCorto: 'Por rondas',
    detalle: 'Eliminación directa por rondas (sin respawn hasta la siguiente ronda).',
  },
];

export const OPCIONES_CORTESIA: OpcionRegla<ReglaCortesia>[] = [
  {
    id: 'OPCIONAL_5M',
    labelCorto: 'Opcional <5m',
    detalle:
      'Tiro de cortesía ("¡Bájate po!") opcional a menos de 5m; si el rival no se baja, 1 tiro semi a zona segura.',
  },
  {
    id: 'OBLIGATORIA_5M',
    labelCorto: 'Obligatoria <5m',
    detalle:
      'Tiro de cortesía ("¡Bájate po!") obligatorio a menos de 5m; prohibido disparar a quemarropa.',
  },
  {
    id: 'SIN_CORTESIA',
    labelCorto: 'Solo impacto',
    detalle:
      'Sin tiro de cortesía: solo cuenta impacto directo de BB o toque con la mano (cuchillo).',
  },
];

export const OPCIONES_CARGADORES: OpcionRegla<CargadoresDominguero>[] = [
  {
    id: 'LIBRE',
    labelCorto: 'Libre',
    detalle: 'Libre (Hi-Cap / Mid-Cap permitidos).',
  },
  {
    id: 'MID_CAP',
    labelCorto: 'Mid-Cap',
    detalle: 'Solo Mid-Cap / Real-Cap (sin Hi-Cap).',
  },
];

const CONFIG_PRESETS: Record<
  Exclude<PresetReglasPartida, 'CUSTOM'>,
  ConfigReglasPartida
> = {
  DOMINGUERA: {
    preset: 'DOMINGUERA',
    crono: 'ESTANDAR_CL',
    modoDisparo: 'SEMI_INTERIOR',
    sistemaBajas: 'RESPAWN_DIRECTO',
    cortesia: 'OPCIONAL_5M',
    cargadores: 'LIBRE',
    proteccionOcularObligatoria: true,
    panueloRojoObligatorio: true,
    prohibidoTiroACiegas: true,
    replicaYRebotesNoCuentan: true,
    fuegoAmigoCuenta: false,
    granadasPermitidas: false,
  },
  CQB: {
    preset: 'CQB',
    crono: 'CQB_350',
    modoDisparo: 'SOLO_SEMI',
    sistemaBajas: 'RESPAWN_DIRECTO',
    cortesia: 'OPCIONAL_5M',
    cargadores: 'MID_CAP',
    proteccionOcularObligatoria: true,
    panueloRojoObligatorio: true,
    prohibidoTiroACiegas: true,
    replicaYRebotesNoCuentan: true,
    fuegoAmigoCuenta: true,
    granadasPermitidas: true,
  },
  VERSUS_TACTICO: {
    preset: 'VERSUS_TACTICO',
    crono: 'ESTANDAR_CL',
    modoDisparo: 'SEMI_INTERIOR',
    sistemaBajas: 'ELIMINACION_RONDA',
    cortesia: 'SIN_CORTESIA',
    cargadores: 'MID_CAP',
    proteccionOcularObligatoria: true,
    panueloRojoObligatorio: true,
    prohibidoTiroACiegas: true,
    replicaYRebotesNoCuentan: true,
    fuegoAmigoCuenta: true,
    granadasPermitidas: true,
  },
};

export function obtenerConfigPreset(
  preset: Exclude<PresetReglasPartida, 'CUSTOM'>,
): ConfigReglasPartida {
  return { ...CONFIG_PRESETS[preset] };
}

function buscarDetalle<T extends string>(
  opciones: OpcionRegla<T>[],
  id: T,
): string {
  return opciones.find((o) => o.id === id)?.detalle || id;
}

export function buscarLabelCorto<T extends string>(
  opciones: OpcionRegla<T>[],
  id: T,
): string {
  return opciones.find((o) => o.id === id)?.labelCorto || id;
}

export function construirBriefingReglas(
  config: ConfigReglasPartida,
  notasAdicionales?: string,
): string {
  const nombrePreset =
    PRESETS_REGLAS_PARTIDA.find((p) => p.id === config.preset)?.titulo ||
    'PERSONALIZADO (CUSTOM)';

  const seguridad: string[] = [];
  seguridad.push(
    config.proteccionOcularObligatoria
      ? '• Protección ocular certificada obligatoria en toda la cancha (prohibido retirarse las antiparras).'
      : '• Protección ocular según normativa del campo.',
  );
  seguridad.push(
    config.panueloRojoObligatorio
      ? '• Pañuelo rojo / muerto visible obligatorio al ser dado de baja.'
      : '• Señalización de baja con mano en alto y grito claro.',
  );
  seguridad.push(
    config.prohibidoTiroACiegas
      ? '• Prohibido tiro a ciegas (Blind Fire): siempre apuntar viendo el objetivo.'
      : '• Tiro a ciegas sujeto a criterio de la organización en cancha.',
  );
  seguridad.push(
    config.replicaYRebotesNoCuentan
      ? '• Rebotes e impacto en réplica NO cuentan como baja.'
      : '• Impacto en réplica inutiliza la réplica o cuenta según ronda.',
  );
  seguridad.push(
    config.fuegoAmigoCuenta
      ? '• Fuego amigo CUENTA como baja para ambos o el impactado.'
      : '• Fuego amigo NO cuenta como baja (solo advertencia táctica).',
  );
  seguridad.push(
    config.granadasPermitidas
      ? '• Granadas de sonido / BBs permitidas (radio 3–5m, sin pirotecnia casera).'
      : '• Granadas no permitidas en esta partida.',
  );

  const lineas = [
    `[REGLAMENTO: ${nombrePreset}]`,
    `• Crono y MED: ${buscarDetalle(OPCIONES_CRONO, config.crono)}`,
    `• Modo de disparo: ${buscarDetalle(OPCIONES_MODO_DISPARO, config.modoDisparo)}`,
    `• Bajas y Respawn: ${buscarDetalle(OPCIONES_SISTEMA_BAJAS, config.sistemaBajas)}`,
    `• Cortesía: ${buscarDetalle(OPCIONES_CORTESIA, config.cortesia)}`,
    `• Cargadores: ${buscarDetalle(OPCIONES_CARGADORES, config.cargadores)}`,
    '',
    'Seguridad & Fair Play:',
    ...seguridad,
  ];

  const notasLimpias = notasAdicionales?.trim();
  if (notasLimpias) {
    lineas.push('', 'Notas adicionales:', notasLimpias);
  }

  return lineas.join('\n');
}
