import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../../theme/colors';

interface MisionesCombateFase2Props {
  evento: any;
  soyOrganizador: boolean;
  soyLiderDeBando: boolean;
  miBando: any;
  esFase3Debriefing: boolean;
  onAbrirModalNuevaMision: () => void;
  onCambiarEstadoMision: (misionId: number, nuevoEstado: string) => void;
  onEliminarMision: (misionId: number) => void;
  onAbrirFotoMision: (url: string) => void;
}

export const MisionesCombateFase2: React.FC<MisionesCombateFase2Props> = ({
  evento,
  soyOrganizador,
  soyLiderDeBando,
  miBando,
  esFase3Debriefing,
  onAbrirModalNuevaMision,
  onCambiarEstadoMision,
  onEliminarMision,
  onAbrirFotoMision,
}) => {
  return (
    <View style={styles.container}>
      {/* ======================================================== */}
      {/* VISTA ORGANIZADOR: GESTIÓN Y ASIGNACIÓN DE MISIONES       */}
      {/* ======================================================== */}
      {soyOrganizador && (
        <View style={styles.cardMisionesOrg}>
          <View style={styles.headerMisionesOrg}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialCommunityIcons name="target-account" size={20} color={colors.primary} />
              <Text style={styles.txtTituloMisionesOrg}>
                {esFase3Debriefing ? 'MISIONES DE LA JORNADA (DEBRIEFING)' : 'MISIONES TÁCTICAS DE COMBATE'}
              </Text>
            </View>
            {!esFase3Debriefing ? (
              <TouchableOpacity
                style={styles.btnNuevaMisionMini}
                onPress={onAbrirModalNuevaMision}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="plus" size={14} color={colors.onPrimary} />
                <Text style={styles.txtBtnNuevaMisionMini}>+ NUEVA MISIÓN</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.badgeFaseDebriefingCerrada}>
                <Text style={styles.txtBadgeFaseDebriefingCerrada}>MISIONES CONCLUIDAS</Text>
              </View>
            )}
          </View>

          {!evento.misiones || evento.misiones.length === 0 ? (
            <View style={styles.sinMisionesBox}>
              <Text style={styles.txtSinMisiones}>
                {esFase3Debriefing
                  ? 'No se registraron misiones de combate en esta jornada.'
                  : 'Aún no se han transmitido órdenes de misión táctica para esta fase.'}
              </Text>
              {!esFase3Debriefing && (
                <TouchableOpacity
                  style={styles.btnAsignarPrimeraMision}
                  onPress={onAbrirModalNuevaMision}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="crosshairs-gps" size={16} color={colors.onPrimary} />
                  <Text style={styles.txtBtnAsignarPrimeraMision}>ASIGNAR PRIMERA ORDEN DE MISIÓN</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={{ gap: 10, marginTop: 6 }}>
              {evento.misiones.map((m: any) => {
                const bandoAsignado = evento.bandos?.find((b: any) => b.id === m.bandoId);
                const colorBando = bandoAsignado?.colorHex || colors.primary;
                const bordeLateralColor =
                  m.estado === 'COMPLETADA'
                    ? colors.success
                    : m.estado === 'CANCELADA'
                    ? colors.danger
                    : colorBando;

                return (
                  <View
                    key={m.id}
                    style={[
                      styles.itemMisionOrg,
                      { borderLeftWidth: 4, borderLeftColor: bordeLateralColor },
                    ]}
                  >
                    <View style={styles.headerItemMisionOrg}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <View style={[styles.dotBandoMision, { backgroundColor: colorBando }]} />
                          <Text style={[styles.txtBandoAsignadoMision, { color: colorBando }]}>
                            {bandoAsignado?.nombre || 'Facción'}
                          </Text>
                          {m.tipoObjetivo && (
                            <View style={styles.badgeTipoObjetivo}>
                              <Text style={styles.txtBadgeTipoObjetivo}>{m.tipoObjetivo}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.txtTituloMisionOrg}>{m.titulo}</Text>
                      </View>

                      {/* Estado de la Misión */}
                      <View
                        style={[
                          styles.badgeEstadoMision,
                          m.estado === 'COMPLETADA'
                            ? styles.badgeMisionCumplida
                            : m.estado === 'CANCELADA'
                            ? styles.badgeMisionCancelada
                            : styles.badgeMisionActiva,
                        ]}
                      >
                        <Text style={styles.txtBadgeEstadoMision}>{m.estado}</Text>
                      </View>
                    </View>

                    <Text style={styles.txtItemMisionDescLider}>
                      <Text style={{ fontWeight: 'bold', color: colors.warning }}>Líder: </Text>
                      {m.descripcionLider}
                    </Text>
                    <Text style={styles.txtItemMisionDescOp}>
                      <Text style={{ fontWeight: 'bold', color: colors.textSecondary }}>Operadores: </Text>
                      {m.descripcionOperadores}
                    </Text>

                    {/* Foto táctica si existe */}
                    {m.fotoUrl ? (
                      <TouchableOpacity
                        style={styles.touchFotoMisionOrg}
                        onPress={() => onAbrirFotoMision(m.fotoUrl)}
                        activeOpacity={0.8}
                      >
                        <Image source={{ uri: m.fotoUrl }} style={styles.imgFotoMisionOrgPreview} resizeMode="cover" />
                        <View style={styles.overlayAmpliarFotoMini}>
                          <MaterialCommunityIcons name="magnify-plus-outline" size={14} color={colors.text} />
                          <Text style={styles.txtAmpliarFotoMini}>Ver imagen táctica</Text>
                        </View>
                      </TouchableOpacity>
                    ) : null}

                    {/* Acciones de gestión */}
                    <View style={styles.accionesMisionOrgRow}>
                      {m.estado === 'ACTIVA' && !esFase3Debriefing && (
                        <>
                          <TouchableOpacity
                            style={[styles.btnAccionMision, styles.btnMarcarCumplida]}
                            onPress={() => onCambiarEstadoMision(m.id, 'COMPLETADA')}
                            activeOpacity={0.8}
                          >
                            <MaterialCommunityIcons name="check" size={13} color={colors.text} />
                            <Text style={styles.txtBtnAccionMision}>Marcar Cumplida</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.btnAccionMision, styles.btnCancelarMision]}
                            onPress={() => onCambiarEstadoMision(m.id, 'CANCELADA')}
                            activeOpacity={0.8}
                          >
                            <MaterialCommunityIcons name="close" size={13} color={colors.danger} />
                            <Text style={[styles.txtBtnAccionMision, { color: colors.danger }]}>Cancelar</Text>
                          </TouchableOpacity>
                        </>
                      )}
                      <TouchableOpacity
                        style={styles.btnEliminarMisionIcon}
                        onPress={() => onEliminarMision(m.id)}
                        activeOpacity={0.8}
                      >
                        <MaterialCommunityIcons name="trash-can-outline" size={15} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* ======================================================== */}
      {/* VISTA LÍDER DE FACCIÓN: ÓRDENES CLASIFICADAS              */}
      {/* ======================================================== */}
      {!soyOrganizador && soyLiderDeBando && miBando?.bandoId && (() => {
        if (esFase3Debriefing) {
          return (
            <View style={styles.cardMisionLiderVacia}>
              <MaterialCommunityIcons name="flag-checkered" size={24} color={colors.success} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.txtMisionLiderVaciaTitulo, { color: colors.success }]}>
                  FASE 3: CONCLUSIÓN Y DEBRIEFING
                </Text>
                <Text style={styles.txtMisionLiderVaciaDesc}>
                  Las misiones de combate han finalizado. Reúne a tu facción para el debriefing táctico y la evaluación final de la comandancia.
                </Text>
              </View>
            </View>
          );
        }

        const misionesDeMiFac = (evento.misiones || []).filter(
          (m: any) => m.bandoId === miBando.bandoId && m.estado === 'ACTIVA',
        );
        if (misionesDeMiFac.length === 0) {
          return (
            <View style={styles.cardMisionLiderVacia}>
              <MaterialCommunityIcons name="shield-lock-outline" size={24} color={colors.warning} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.txtMisionLiderVaciaTitulo}>CANAL DE MANDO CLASIFICADO</Text>
                <Text style={styles.txtMisionLiderVaciaDesc}>
                  Sin misiones activas por el momento. Mantén a tus escuadras listas en radio y espera las órdenes de comandancia.
                </Text>
              </View>
            </View>
          );
        }

        return (
          <View style={{ gap: 10, marginVertical: 6 }}>
            {misionesDeMiFac.map((m: any) => (
              <View key={m.id} style={styles.cardMisionLiderActiva}>
                <View style={styles.headerMisionLiderActiva}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <MaterialCommunityIcons name="star-shooting" size={16} color={colors.warning} />
                      <Text style={styles.txtHeaderMisionLiderEtiqueta}>ORDEN CLASIFICADA PARA EL LÍDER</Text>
                    </View>
                    <Text style={styles.txtMisionLiderTitulo}>{m.titulo}</Text>
                  </View>
                  <View style={styles.badgeMisionActiva}>
                    <Text style={styles.txtBadgeEstadoMision}>MISIÓN EN CURSO</Text>
                  </View>
                </View>

                {/* Briefing clasificado para el líder */}
                <View style={styles.cajaBriefingClasificadoLider}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <MaterialCommunityIcons name="shield-key" size={15} color={colors.warning} style={{ marginRight: 6 }} />
                    <Text style={styles.txtTituloBriefingClasificado}>INSTRUCCIÓN DE MANDO CONFIDENCIAL:</Text>
                  </View>
                  <Text style={styles.txtCuerpoBriefingClasificado}>{m.descripcionLider}</Text>
                </View>

                {/* Foto táctica adjunta si existe */}
                {m.fotoUrl ? (
                  <View style={styles.seccionFotoMisionLider}>
                    <TouchableOpacity
                      style={styles.touchFotoMisionLider}
                      onPress={() => onAbrirFotoMision(m.fotoUrl)}
                      activeOpacity={0.85}
                    >
                      <Image source={{ uri: m.fotoUrl }} style={styles.imgFotoMisionLider} resizeMode="cover" />
                      <View style={styles.overlayAmpliarFoto}>
                        <MaterialCommunityIcons name="magnify-plus-outline" size={16} color={colors.text} style={{ marginRight: 4 }} />
                        <Text style={styles.txtAmpliarFoto}>Tocar para ampliar mapa de misión</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {/* Orden pública de tropa */}
                <View style={styles.cajaOrdenTropasLider}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <MaterialCommunityIcons name="bullhorn-outline" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.txtTituloOrdenTropas}>ORDEN TRANSMITIDA A TUS OPERADORES:</Text>
                  </View>
                  <Text style={styles.txtCuerpoOrdenTropas}>{m.descripcionOperadores}</Text>
                </View>

                {/* Botón reportar cumplimiento */}
                <TouchableOpacity
                  style={styles.btnReportarCumplimientoLider}
                  onPress={() => onCambiarEstadoMision(m.id, 'COMPLETADA')}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="check-decagram" size={18} color={colors.text} style={{ marginRight: 6 }} />
                  <Text style={styles.txtBtnReportarCumplimientoLider}>REPORTAR OBJETIVO CUMPLIDO</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        );
      })()}

      {/* ======================================================== */}
      {/* VISTA OPERADORES COMUNES: ORDEN DE COMBATE DE FACCIÓN     */}
      {/* ======================================================== */}
      {!soyOrganizador && !soyLiderDeBando && miBando?.bandoId && (() => {
        if (esFase3Debriefing) {
          return (
            <View style={styles.cardMisionOpVacia}>
              <MaterialCommunityIcons name="flag-checkered" size={22} color={colors.success} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.txtMisionOpVaciaTitulo, { color: colors.success }]}>
                  FASE 3: CONCLUSIÓN Y DEBRIEFING
                </Text>
                <Text style={styles.txtMisionOpVaciaDesc}>
                  Misiones de combate finalizadas. Retira el cargador de tus réplicas, pon el seguro y asiste a la zona de debriefing.
                </Text>
              </View>
            </View>
          );
        }

        const misionesDeMiFac = (evento.misiones || []).filter(
          (m: any) => m.bandoId === miBando.bandoId && m.estado === 'ACTIVA',
        );
        if (misionesDeMiFac.length === 0) {
          return (
            <View style={styles.cardMisionOpVacia}>
              <MaterialCommunityIcons name="target" size={22} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.txtMisionOpVaciaTitulo}>A LA ESPERA DE ÓRDENES DE MISIÓN</Text>
                <Text style={styles.txtMisionOpVaciaDesc}>
                  Mantente en tu frecuencia de radio asignada y sigue las directivas de tu líder de facción y escuadra.
                </Text>
              </View>
            </View>
          );
        }

        return (
          <View style={{ gap: 10, marginVertical: 6 }}>
            {misionesDeMiFac.map((m: any) => (
              <View key={m.id} style={styles.cardMisionOpActiva}>
                <View style={styles.headerMisionOpActiva}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <MaterialCommunityIcons name="target" size={16} color={colors.primary} />
                      <Text style={styles.txtHeaderMisionOpEtiqueta}>OBJETIVO DE COMBATE DE TU FACCIÓN</Text>
                    </View>
                    <Text style={styles.txtMisionOpTitulo}>{m.titulo}</Text>
                  </View>
                  <View style={styles.badgeMisionActiva}>
                    <Text style={styles.txtBadgeEstadoMision}>ACTIVA</Text>
                  </View>
                </View>

                <View style={styles.cajaMisionOpContenido}>
                  <Text style={styles.txtCuerpoMisionOp}>{m.descripcionOperadores}</Text>
                </View>
              </View>
            ))}
          </View>
        );
      })()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  cardMisionesOrg: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    padding: 14,
    marginBottom: 12,
  },
  headerMisionesOrg: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  txtTituloMisionesOrg: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  btnNuevaMisionMini: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  txtBtnNuevaMisionMini: {
    color: colors.onPrimary,
    fontSize: 10,
    fontWeight: '900',
  },
  badgeFaseDebriefingCerrada: {
    backgroundColor: colors.successSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  txtBadgeFaseDebriefingCerrada: {
    color: colors.success,
    fontSize: 10,
    fontWeight: '900',
  },
  sinMisionesBox: {
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  txtSinMisiones: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  btnAsignarPrimeraMision: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    marginTop: 10,
  },
  txtBtnAsignarPrimeraMision: {
    color: colors.onPrimary,
    fontSize: 11,
    fontWeight: '900',
  },
  itemMisionOrg: {
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
  },
  headerItemMisionOrg: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  dotBandoMision: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  txtBandoAsignadoMision: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  badgeTipoObjetivo: {
    backgroundColor: colors.disabled,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  txtBadgeTipoObjetivo: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  txtTituloMisionOrg: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },
  badgeEstadoMision: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeMisionActiva: {
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  badgeMisionCumplida: {
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: colors.success,
  },
  badgeMisionCancelada: {
    backgroundColor: colors.disabled,
  },
  txtBadgeEstadoMision: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  txtItemMisionDescLider: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  txtItemMisionDescOp: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
  },
  touchFotoMisionOrg: {
    borderRadius: 8,
    overflow: 'hidden',
    marginVertical: 8,
  },
  imgFotoMisionOrgPreview: {
    width: '100%',
    height: 100,
    borderRadius: 8,
  },
  overlayAmpliarFotoMini: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderTopLeftRadius: 6,
    gap: 4,
  },
  txtAmpliarFotoMini: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '700',
  },
  accionesMisionOrgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  btnAccionMision: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  btnMarcarCumplida: {
    backgroundColor: colors.success,
  },
  btnCancelarMision: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  btnEliminarMisionIcon: {
    marginLeft: 'auto',
    padding: 4,
  },
  txtBtnAccionMision: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
  },
  cardMisionLiderVacia: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
    marginVertical: 6,
  },
  txtMisionLiderVaciaTitulo: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: '900',
  },
  txtMisionLiderVaciaDesc: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  cardMisionLiderActiva: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    padding: 14,
  },
  headerMisionLiderActiva: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  txtHeaderMisionLiderEtiqueta: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  txtMisionLiderTitulo: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  cajaBriefingClasificadoLider: {
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  txtTituloBriefingClasificado: {
    color: colors.warning,
    fontSize: 10,
    fontWeight: '800',
  },
  txtCuerpoBriefingClasificado: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 16,
  },
  seccionFotoMisionLider: {
    marginBottom: 10,
  },
  touchFotoMisionLider: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  imgFotoMisionLider: {
    width: '100%',
    height: 140,
    borderRadius: 8,
  },
  overlayAmpliarFoto: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderTopLeftRadius: 6,
  },
  txtAmpliarFoto: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '700',
  },
  cajaOrdenTropasLider: {
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  txtTituloOrdenTropas: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  txtCuerpoOrdenTropas: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 16,
  },
  btnReportarCumplimientoLider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    borderRadius: 8,
    paddingVertical: 10,
  },
  txtBtnReportarCumplimientoLider: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cardMisionOpVacia: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
    marginVertical: 6,
  },
  txtMisionOpVaciaTitulo: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  txtMisionOpVaciaDesc: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  cardMisionOpActiva: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    padding: 14,
  },
  headerMisionOpActiva: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  txtHeaderMisionOpEtiqueta: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  txtMisionOpTitulo: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  cajaMisionOpContenido: {
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  txtCuerpoMisionOp: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 16,
  },
});
