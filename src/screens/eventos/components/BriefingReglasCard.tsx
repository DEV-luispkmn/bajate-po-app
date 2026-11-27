import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  AcentoReglaPrincipal,
  parsearBriefingReglas,
  TipoItemSeguridad,
} from '../../../constants/reglasPartida';
import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

interface BriefingReglasCardProps {
  descripcion: string;
  inicialAbierto?: boolean;
}

const COLORES_ACENTO: Record<AcentoReglaPrincipal, { fg: string; bg: string }> = {
  primary: { fg: colors.primary, bg: colors.primarySoft },
  warning: { fg: colors.warning, bg: colors.warningSoft },
  danger: { fg: colors.danger, bg: colors.dangerSoft },
  secondary: { fg: colors.secondary, bg: colors.successSoft },
  blueTeam: { fg: colors.blueTeam, bg: 'rgba(49, 130, 206, 0.16)' },
};

function obtenerIconoSeguridad(tipo: TipoItemSeguridad): {
  nombre: 'check-circle-outline' | 'close-circle-outline' | 'alert-circle-outline' | 'information-outline';
  color: string;
} {
  switch (tipo) {
    case 'obligatorio':
    case 'permitido':
      return { nombre: 'check-circle-outline', color: colors.success };
    case 'prohibido':
      return { nombre: 'close-circle-outline', color: colors.danger };
    case 'alerta':
      return { nombre: 'alert-circle-outline', color: colors.warning };
    default:
      return { nombre: 'information-outline', color: colors.secondary };
  }
}

export const BriefingReglasCard: React.FC<BriefingReglasCardProps> = ({
  descripcion,
  inicialAbierto = false,
}) => {
  const [abierto, setAbierto] = useState(inicialAbierto);
  const parseado = useMemo(() => parsearBriefingReglas(descripcion), [descripcion]);

  const chipsResumen = useMemo(
    () => (parseado ? parseado.reglasPrincipales.filter((r) => Boolean(r.labelCorto)) : []),
    [parseado],
  );

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.headerTouch}
        onPress={() => setAbierto((prev) => !prev)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityState={{ expanded: abierto }}
        accessibilityLabel="Briefing y reglas de combate"
      >
        <View style={styles.headerIconBox}>
          <MaterialCommunityIcons
            name={parseado?.presetIcono || 'clipboard-text-outline'}
            size={18}
            color={colors.primary}
          />
        </View>

        <View style={styles.headerTextCol}>
          <Text style={styles.headerTitulo}>BRIEFING & REGLAS DE COMBATE</Text>
          <Text style={styles.headerSubtitulo} numberOfLines={1}>
            {parseado ? parseado.presetTitulo : 'Instrucciones y reglas de la operación'}
          </Text>
        </View>

        <MaterialCommunityIcons
          name={abierto ? 'chevron-up' : 'chevron-down'}
          size={22}
          color={colors.primary}
        />
      </TouchableOpacity>

      {abierto && (
        <View style={styles.contenidoDesplegable}>
          {parseado ? (
            <>
              {chipsResumen.length > 0 && (
                <View style={styles.chipsRow}>
                  {chipsResumen.map((regla) => {
                    const acento = COLORES_ACENTO[regla.acento];
                    return (
                      <View key={`chip-${regla.clave}`} style={styles.chipResumen}>
                        <MaterialCommunityIcons
                          name={regla.icono}
                          size={12}
                          color={acento.fg}
                        />
                        <Text style={styles.txtChipResumen}>{regla.labelCorto}</Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {parseado.reglasPrincipales.length > 0 && (
                <View>
                  <Text style={styles.subtituloSeccion}>REGLAS DE CAMPO</Text>
                  {parseado.reglasPrincipales.map((regla, index) => {
                    const acento = COLORES_ACENTO[regla.acento];
                    const esUltima = index === parseado.reglasPrincipales.length - 1;
                    return (
                      <View
                        key={`regla-${regla.clave}-${index}`}
                        style={[styles.filaRegla, esUltima && styles.filaReglaUltima]}
                      >
                        <View style={[styles.iconoReglaBox, { backgroundColor: acento.bg }]}>
                          <MaterialCommunityIcons
                            name={regla.icono}
                            size={16}
                            color={acento.fg}
                          />
                        </View>

                        <View style={styles.reglaTextoCol}>
                          <Text style={styles.reglaClave}>{regla.clave.toUpperCase()}</Text>
                          {regla.subItems && regla.subItems.length > 0 ? (
                            <>
                              {regla.encabezadoDetalle ? (
                                <Text style={styles.reglaValor}>{regla.encabezadoDetalle}</Text>
                              ) : null}
                              <View style={styles.subItemsLista}>
                                {regla.subItems.map((sub, subIdx) => (
                                  <View key={`sub-${subIdx}`} style={styles.subItemPill}>
                                    <Text style={styles.txtSubItem}>{sub}</Text>
                                  </View>
                                ))}
                              </View>
                            </>
                          ) : (
                            <Text style={styles.reglaValor}>{regla.valor}</Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {parseado.seguridad.length > 0 && (
                <View style={styles.seccionSeguridad}>
                  <View style={styles.seccionSeguridadHeader}>
                    <MaterialCommunityIcons
                      name="shield-check-outline"
                      size={14}
                      color={colors.secondary}
                    />
                    <Text style={styles.subtituloSeccionInline}>SEGURIDAD & FAIR PLAY</Text>
                  </View>

                  {parseado.seguridad.map((item, index) => {
                    const icono = obtenerIconoSeguridad(item.tipo);
                    return (
                      <View key={`seg-${index}`} style={styles.filaSeguridad}>
                        <MaterialCommunityIcons
                          name={icono.nombre}
                          size={15}
                          color={icono.color}
                          style={styles.iconoSeguridad}
                        />
                        <Text style={styles.txtSeguridad}>{item.texto}</Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {parseado.notasAdicionales ? (
                <View style={styles.calloutNotas}>
                  <View style={styles.calloutNotasHeader}>
                    <MaterialCommunityIcons
                      name="note-text-outline"
                      size={14}
                      color={colors.primary}
                    />
                    <Text style={styles.txtTituloNotas}>NOTAS ADICIONALES</Text>
                  </View>
                  <Text style={styles.txtContenidoNotas}>{parseado.notasAdicionales}</Text>
                </View>
              ) : null}
            </>
          ) : (
            <Text style={styles.textoLibre}>{descripcion}</Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
    marginBottom: 16,
  },
  headerTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  headerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCol: {
    flex: 1,
    marginHorizontal: 10,
  },
  headerTitulo: {
    color: colors.primary,
    fontSize: 13,
    fontFamily: fonts.displayBold,
    letterSpacing: 0.7,
  },
  headerSubtitulo: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  contenidoDesplegable: {
    borderTopWidth: 1,
    borderTopColor: colors.surfaceSubtle,
    marginTop: 12,
    paddingTop: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  chipResumen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  txtChipResumen: {
    color: colors.text,
    fontSize: 11,
    fontFamily: fonts.displaySemiBold,
  },
  subtituloSeccion: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: fonts.displayBold,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  subtituloSeccionInline: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: fonts.displayBold,
    letterSpacing: 0.8,
  },
  filaRegla: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceSubtle,
    gap: 10,
  },
  filaReglaUltima: {
    borderBottomWidth: 0,
    paddingBottom: 2,
  },
  iconoReglaBox: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  reglaTextoCol: {
    flex: 1,
  },
  reglaClave: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: fonts.displaySemiBold,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  reglaValor: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  subItemsLista: {
    marginTop: 6,
    gap: 4,
  },
  subItemPill: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  txtSubItem: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 16,
    fontVariant: ['tabular-nums'],
  },
  seccionSeguridad: {
    marginTop: 14,
  },
  seccionSeguridadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  filaSeguridad: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 5,
  },
  iconoSeguridad: {
    marginTop: 1,
  },
  txtSeguridad: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  calloutNotas: {
    marginTop: 14,
    backgroundColor: colors.surfaceElevated,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    borderRadius: 8,
    padding: 12,
  },
  calloutNotasHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  txtTituloNotas: {
    color: colors.primary,
    fontSize: 11,
    fontFamily: fonts.displayBold,
    letterSpacing: 0.7,
  },
  txtContenidoNotas: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  textoLibre: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 20,
  },
});
