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

export type IconoReglaPrincipal =
  | 'speedometer'
  | 'flash'
  | 'heart-pulse'
  | 'hand-wave-outline'
  | 'ammunition'
  | 'shield-check-outline';

export type AcentoReglaPrincipal =
  | 'primary'
  | 'warning'
  | 'danger'
  | 'secondary'
  | 'blueTeam';

export type TipoItemSeguridad =
  | 'obligatorio'
  | 'prohibido'
  | 'permitido'
  | 'alerta'
  | 'info';

export interface ReglaPrincipalParseada {
  clave: string;
  valor: string;
  labelCorto?: string;
  encabezadoDetalle?: string;
  subItems?: string[];
  icono: IconoReglaPrincipal;
  acento: AcentoReglaPrincipal;
}

export interface ItemSeguridadParseado {
  texto: string;
  tipo: TipoItemSeguridad;
}

export interface BriefingReglasParseado {
  presetId?: PresetReglasPartida;
  presetTitulo: string;
  presetIcono: PresetReglaMeta['icono'];
  reglasPrincipales: ReglaPrincipalParseada[];
  seguridad: ItemSeguridadParseado[];
  notasAdicionales?: string;
}

function buscarLabelCortoPorValor<T extends string>(
  opciones: OpcionRegla<T>[],
  valor: string,
): string | undefined {
  const valorNorm = valor.trim().toLowerCase();
  return opciones.find((o) => o.detalle.trim().toLowerCase() === valorNorm)?.labelCorto;
}

function resolverMetaReglaPrincipal(clave: string, valor: string): ReglaPrincipalParseada {
  const claveNorm = clave.toLowerCase();

  if (claveNorm.includes('crono')) {
    const labelCorto = buscarLabelCortoPorValor(OPCIONES_CRONO, valor);
    const indiceGuion = valor.indexOf(' — ');
    if (indiceGuion !== -1) {
      const encabezadoDetalle = valor.slice(0, indiceGuion).trim();
      const cuerpoSubItems = valor.slice(indiceGuion + 3).trim().replace(/\.$/, '');
      const subItems = cuerpoSubItems
        .split(' · ')
        .map((item) => item.trim())
        .filter(Boolean);
      return {
        clave,
        valor,
        labelCorto,
        encabezadoDetalle,
        subItems: subItems.length > 0 ? subItems : undefined,
        icono: 'speedometer',
        acento: 'primary',
      };
    }
    return {
      clave,
      valor,
      labelCorto,
      icono: 'speedometer',
      acento: 'primary',
    };
  }

  if (claveNorm.includes('disparo')) {
    return {
      clave,
      valor,
      labelCorto: buscarLabelCortoPorValor(OPCIONES_MODO_DISPARO, valor),
      icono: 'flash',
      acento: 'warning',
    };
  }

  if (claveNorm.includes('bajas') || claveNorm.includes('respawn')) {
    return {
      clave,
      valor,
      labelCorto: buscarLabelCortoPorValor(OPCIONES_SISTEMA_BAJAS, valor),
      icono: 'heart-pulse',
      acento: 'danger',
    };
  }

  if (claveNorm.includes('cortes')) {
    return {
      clave,
      valor,
      labelCorto: buscarLabelCortoPorValor(OPCIONES_CORTESIA, valor),
      icono: 'hand-wave-outline',
      acento: 'secondary',
    };
  }

  if (claveNorm.includes('cargador')) {
    return {
      clave,
      valor,
      labelCorto: buscarLabelCortoPorValor(OPCIONES_CARGADORES, valor),
      icono: 'ammunition',
      acento: 'blueTeam',
    };
  }

  return {
    clave,
    valor,
    icono: 'shield-check-outline',
    acento: 'primary',
  };
}

function clasificarItemSeguridad(texto: string): TipoItemSeguridad {
  const textoNorm = texto.toLowerCase();
  if (textoNorm.includes('prohibido') || textoNorm.includes('no permitidas')) {
    return 'prohibido';
  }
  if (textoNorm.includes('obligatoria') || textoNorm.includes('obligatorio')) {
    return 'obligatorio';
  }
  if (textoNorm.includes('permitidas')) {
    return 'permitido';
  }
  if (textoNorm.includes('fuego amigo cuenta')) {
    return 'alerta';
  }
  return 'info';
}

export function parsearBriefingReglas(
  descripcion?: string | null,
): BriefingReglasParseado | null {
  if (!descripcion) return null;

  const lineas = descripcion.replace(/\r\n/g, '\n').split('\n');
  const primerIndice = lineas.findIndex((l) => l.trim().length > 0);
  if (primerIndice === -1) return null;

  const matchHeader = lineas[primerIndice].trim().match(/^\[REGLAMENTO:\s*(.+?)\]$/i);
  if (!matchHeader) return null;

  const presetTitulo = matchHeader[1].trim();
  const presetMeta = PRESETS_REGLAS_PARTIDA.find(
    (p) => p.titulo.toLowerCase() === presetTitulo.toLowerCase(),
  );

  const reglasPrincipales: ReglaPrincipalParseada[] = [];
  const seguridad: ItemSeguridadParseado[] = [];
  const notasLineas: string[] = [];

  let seccion: 'REGLAS' | 'SEGURIDAD' | 'NOTAS' = 'REGLAS';

  for (let i = primerIndice + 1; i < lineas.length; i++) {
    const linea = lineas[i];
    const trimmed = linea.trim();

    if (seccion !== 'NOTAS') {
      if (/^Seguridad\s*&\s*Fair\s*Play\s*:?$/i.test(trimmed)) {
        seccion = 'SEGURIDAD';
        continue;
      }
      if (/^Notas\s+adicionales\s*:?$/i.test(trimmed)) {
        seccion = 'NOTAS';
        continue;
      }
    }

    if (seccion === 'NOTAS') {
      notasLineas.push(linea);
      continue;
    }

    if (!trimmed) continue;

    const sinBullet = trimmed.replace(/^[•\-*]\s*/, '').trim();
    if (!sinBullet) continue;

    if (seccion === 'REGLAS') {
      const indiceDosPuntos = sinBullet.indexOf(':');
      if (indiceDosPuntos === -1) continue;
      const clave = sinBullet.slice(0, indiceDosPuntos).trim();
      const valor = sinBullet.slice(indiceDosPuntos + 1).trim();
      if (!clave || !valor) continue;
      reglasPrincipales.push(resolverMetaReglaPrincipal(clave, valor));
    } else if (seccion === 'SEGURIDAD') {
      seguridad.push({
        texto: sinBullet,
        tipo: clasificarItemSeguridad(sinBullet),
      });
    }
  }

  const notasAdicionales = notasLineas.join('\n').trim() || undefined;

  if (reglasPrincipales.length === 0 && seguridad.length === 0 && !notasAdicionales) {
    return null;
  }

  return {
    presetId: presetMeta?.id,
    presetTitulo,
    presetIcono: presetMeta?.icono || 'tune-variant',
    reglasPrincipales,
    seguridad,
    notasAdicionales,
  };
}
