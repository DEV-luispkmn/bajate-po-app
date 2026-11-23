import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../../theme/colors';

interface MesaCronometrajeFase1Props {
  evento: any;
  jugadores: any[];
  soyOrganizador: boolean;
  jugadorId: number | undefined;
  filtroCronoStaff: string;
  setFiltroCronoStaff: (val: string) => void;
  fpsInputsStaff: Record<number, string>;
  setFpsInputsStaff: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  guardandoCronoRapidoId: number | null;
  onAbrirModalCrono: (jugadorId?: number) => void;
  onAprobarCronoRapido: (replica: any, aprobado: boolean) => void;
  onEliminarCrono: (replicaId: number) => void;
  onAbrirTablaLimites: () => void;
  onAbrirMapaTactico?: () => void;
}

export const MesaCronometrajeFase1: React.FC<MesaCronometrajeFase1Props> = ({
  evento,
  jugadores,
  soyOrganizador,
  jugadorId,
  filtroCronoStaff,
  setFiltroCronoStaff,
  fpsInputsStaff,
  setFpsInputsStaff,
  guardandoCronoRapidoId,
  onAbrirModalCrono,
  onAprobarCronoRapido,
  onEliminarCrono,
  onAbrirTablaLimites,
  onAbrirMapaTactico,
}) => {
  return (
    <View style={styles.cronoFaseCard}>
      {/* Cabecera de la Fase de Crono */}
      <View style={styles.cronoFaseHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <MaterialCommunityIcons name="speedometer" size={24} color={colors.warning} />
          <View>
            <Text style={styles.cronoFaseTitulo}>MESA DE CRONÓGRAFO OFICIAL</Text>
            <Text style={styles.cronoFaseSub}>Acreditación y homologación de réplicas en terreno</Text>
          </View>
        </View>
        <View style={styles.badgeFaseCronoActiva}>
          <Text style={styles.txtBadgeFaseCronoActiva}>CRONO EN VIVO</Text>
        </View>
      </View>

      {/* Módulo para el Staff / Organizador: MESA DE CRONÓGRAFO VISIBLE EN PANTALLA */}
      {soyOrganizador && (
        <View style={styles.staffCronoBox}>
          <View style={styles.headerStaffStatsRow}>
            <Text style={styles.txtStaffCronoCount}>
              Réplicas homologadas:{' '}
              <Text style={[styles.txtStaffCronoCountNum, { fontVariant: ['tabular-nums'] }]}>
                {evento.registrosCrono?.length || 0}
              </Text>
            </Text>
            <TouchableOpacity
              style={styles.btnAgregarReplicaStaffHeader}
              onPress={() => onAbrirModalCrono(undefined)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="plus" size={14} color="#000" />
              <Text style={styles.txtBtnAgregarReplicaStaffHeader}>+ CRONAR OTRA RÉPLICA</Text>
            </TouchableOpacity>
          </View>

          {/* Buscador Rápido de Operadores para el Staff */}
          <View style={styles.cronoBuscadorStaffBox}>
            <MaterialCommunityIcons name="magnify" size={18} color={colors.textMuted} style={{ marginRight: 6 }} />
            <TextInput
              style={styles.inputCronoBuscadorStaff}
              placeholder="Buscar operador por alias..."
              placeholderTextColor={colors.textMuted}
              value={filtroCronoStaff}
              onChangeText={setFiltroCronoStaff}
            />
            {filtroCronoStaff ? (
              <TouchableOpacity
                onPress={() => setFiltroCronoStaff('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Lista Directa de Operadores en Terreno */}
          {(() => {
            const operadoresFiltrados = jugadores.filter((j) => {
              if (!filtroCronoStaff.trim()) return true;
              const q = filtroCronoStaff.toLowerCase();
              return j.alias?.toLowerCase().includes(q) || j.rol?.toLowerCase().includes(q);
            });

            if (operadoresFiltrados.length === 0) {
              return (
                <View style={{ paddingVertical: 10, alignItems: 'center' }}>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>No se encontraron operadores.</Text>
                </View>
              );
            }

            return (
              <View style={{ gap: 8, marginTop: 4 }}>
                {operadoresFiltrados.map((j) => {
                  const bandoDelJugador = evento.bandos?.find((b: any) => b.id === j.bandoId);
                  const replicasDelJugador =
                    evento.registrosCrono?.filter((r: any) => r.jugadorId === j.jugadorId) || [];
                  const tieneAprobada = replicasDelJugador.some((r: any) => r.aprobado);

                  return (
                    <View
                      key={j.jugadorId}
                      style={[
                        styles.tarjetaOperadorCronoStaff,
                        {
                          borderLeftWidth: 3,
                          borderLeftColor: tieneAprobada ? '#10B981' : '#D97706',
                        },
                      ]}
                    >
                      <View style={styles.headerOperadorCronoStaff}>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View
                            style={[
                              styles.colorDotMini,
                              { backgroundColor: bandoDelJugador?.colorHex || colors.primary },
                            ]}
                          />
                          <Text style={styles.txtAliasCronoStaff}>{j.alias}</Text>
                          <Text style={styles.txtRolCronoStaff}>[{j.rol}]</Text>
                        </View>
                        <View
                          style={[
                            styles.badgeAprobadoCronoMini,
                            tieneAprobada ? styles.badgeVerde : styles.badgeAmarillo,
                          ]}
                        >
                          <MaterialCommunityIcons
                            name={tieneAprobada ? 'check-circle' : 'clock-alert-outline'}
                            size={11}
                            color="#fff"
                            style={{ marginRight: 3 }}
                          />
                          <Text style={styles.txtBadgeCronoMini}>
                            {tieneAprobada ? 'HABILITADO' : 'PENDIENTE'}
                          </Text>
                        </View>
                      </View>

                      {replicasDelJugador.length === 0 ? (
                        <View style={styles.sinReplicasCronoBox}>
                          <Text style={styles.txtSinReplicasCrono}>Sin réplicas cronadas en terreno</Text>
                          <TouchableOpacity
                            style={styles.btnAgregarReplicaStaffMini}
                            onPress={() => onAbrirModalCrono(j.jugadorId)}
                            activeOpacity={0.7}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <MaterialCommunityIcons name="plus" size={13} color="#000" />
                            <Text style={styles.txtBtnAgregarReplicaStaffMini}>CRONAR RÉPLICA</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={{ gap: 6, marginTop: 4 }}>
                          {replicasDelJugador.map((rep: any) => {
                            const fpsInputActual =
                              fpsInputsStaff[rep.id] ?? (rep.fps ? String(rep.fps) : '');
                            const guardandoEste = guardandoCronoRapidoId === rep.id;

                            return (
                              <View key={rep.id} style={styles.filaReplicaCronoStaff}>
                                <View style={{ flex: 1.1 }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Text style={styles.txtTipoReplicaStaff}>
                                      {rep.tipoReplica} - {rep.categoria}
                                    </Text>
                                    <View
                                      style={[
                                        styles.badgeAprobadoCronoMini,
                                        rep.aprobado ? styles.badgeVerde : styles.badgeRojo,
                                      ]}
                                    >
                                      <Text style={styles.txtBadgeCronoMini}>
                                        {rep.aprobado ? 'APROBADA' : 'RECHAZADA'}
                                      </Text>
                                    </View>
                                  </View>
                                  <Text style={[styles.txtDetalleReplicaStaff, { fontVariant: ['tabular-nums'] }]}>
                                    {rep.joules ? `${rep.joules.toFixed(2)} J` : ''}
                                    {rep.fps ? ` | ${rep.fps} FPS` : ''}
                                    {rep.modelo ? ` (${rep.modelo})` : ''}
                                  </Text>
                                </View>

                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <TextInput
                                    style={styles.inputFpsRapido}
                                    placeholder="FPS"
                                    placeholderTextColor={colors.textMuted}
                                    keyboardType="numeric"
                                    value={fpsInputActual}
                                    onChangeText={(val) =>
                                      setFpsInputsStaff((prev) => ({ ...prev, [rep.id]: val }))
                                    }
                                  />
                                  {guardandoEste ? (
                                    <ActivityIndicator size="small" color={colors.primary} />
                                  ) : (
                                    <>
                                      <TouchableOpacity
                                        style={[styles.btnAccionCronoRapida, styles.btnAprobarCronoRapido]}
                                        onPress={() => onAprobarCronoRapido(rep, true)}
                                        activeOpacity={0.7}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                      >
                                        <MaterialCommunityIcons name="check" size={16} color="#fff" />
                                      </TouchableOpacity>
                                      <TouchableOpacity
                                        style={[styles.btnAccionCronoRapida, styles.btnRechazarCronoRapido]}
                                        onPress={() => onAprobarCronoRapido(rep, false)}
                                        activeOpacity={0.7}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                      >
                                        <MaterialCommunityIcons name="close" size={16} color="#fff" />
                                      </TouchableOpacity>
                                      <TouchableOpacity
                                        style={styles.btnEliminarCronoMini}
                                        onPress={() => onEliminarCrono(rep.id)}
                                        activeOpacity={0.7}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                      >
                                        <MaterialCommunityIcons
                                          name="trash-can-outline"
                                          size={16}
                                          color={colors.danger}
                                        />
                                      </TouchableOpacity>
                                    </>
                                  )}
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })()}
        </View>
      )}

      {/* Estado de réplicas y Acreditación del Operador actual */}
      {!soyOrganizador && (
        <View style={{ marginVertical: 8 }}>
          <Text style={styles.preMisionSubseccionTitulo}>TU ESTADO DE ACREDITACIÓN:</Text>
          {(() => {
            const misReplicas = evento.registrosCrono?.filter((r: any) => r.jugadorId === jugadorId) || [];
            const yoHabilitado = misReplicas.some((r: any) => r.aprobado);

            return (
              <>
                {yoHabilitado ? (
                  <View style={styles.bannerCronoHabilitado}>
                    <MaterialCommunityIcons name="check-decagram" size={24} color="#10B981" />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.txtBannerCronoHabilitadoTitulo}>HABILITADO PARA DESPLIEGUE</Text>
                      <Text style={styles.txtBannerCronoHabilitadoDesc}>
                        Tus réplicas han sido homologadas por los jueces. Ya puedes integrarte a una escuadra táctica.
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.bannerCronoPendiente}>
                    <MaterialCommunityIcons name="alert-circle" size={24} color={colors.warning} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.txtBannerCronoPendienteTitulo}>PENDIENTE DE CRONAJE</Text>
                      <Text style={styles.txtBannerCronoPendienteDesc}>
                        Acércate a la mesa de jueces con tus réplicas descargadas y sin cargador puesto para ser cronado antes de ingresar a una escuadra.
                      </Text>
                    </View>
                  </View>
                )}

                {misReplicas.length > 0 && (
                  <View style={[styles.listaMisReplicas, { marginTop: 8 }]}>
                    {misReplicas.map((rep: any) => (
                      <View key={rep.id} style={styles.itemReplicaCronada}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.txtTipoReplica}>{rep.tipoReplica}:</Text>
                            <Text style={styles.txtCatReplica}>{rep.categoria}</Text>
                            <View
                              style={[
                                styles.badgeAprobadoCrono,
                                !rep.aprobado && styles.badgeRechazadoCrono,
                              ]}
                            >
                              <Text style={styles.txtBadgeAprobadoCrono}>
                                {rep.aprobado ? 'APROBADA' : 'RECHAZADA'}
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.txtStatsCrono, { fontVariant: ['tabular-nums'] }]}>
                            {rep.joules.toFixed(2)} J {rep.fps ? `| ${rep.fps} FPS` : ''}{' '}
                            {rep.gramajeBb ? `| BB ${rep.gramajeBb}g` : ''}{' '}
                            {rep.modelo ? `(${rep.modelo})` : ''}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </>
            );
          })()}
        </View>
      )}

      {/* Accesos rápidos a Tabla de Límites de Crono y Mapa */}
      <View style={styles.accesosTacsopRow}>
        <TouchableOpacity
          style={styles.btnAccesoTacsop}
          onPress={onAbrirTablaLimites}
          activeOpacity={0.8}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <MaterialCommunityIcons name="speedometer" size={16} color={colors.primary} />
          <Text style={styles.txtBtnAccesoTacsop}>TABLA LÍMITES CRONO</Text>
        </TouchableOpacity>
        {evento.mapaTacticoUrl && onAbrirMapaTactico ? (
          <TouchableOpacity
            style={styles.btnAccesoTacsop}
            onPress={onAbrirMapaTactico}
            activeOpacity={0.8}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <MaterialCommunityIcons name="map-legend" size={16} color={colors.primary} />
            <Text style={styles.txtBtnAccesoTacsop}>MAPA TÁCTICO</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cronoFaseCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(214, 158, 46, 0.4)',
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    padding: 14,
    marginBottom: 14,
  },
  cronoFaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cronoFaseTitulo: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cronoFaseSub: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  badgeFaseCronoActiva: {
    backgroundColor: 'rgba(214, 158, 46, 0.2)',
    borderWidth: 1,
    borderColor: colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  txtBadgeFaseCronoActiva: {
    color: colors.warning,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  staffCronoBox: {
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
    marginBottom: 10,
  },
  headerStaffStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  txtStaffCronoCount: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  txtStaffCronoCountNum: {
    color: colors.primary,
    fontWeight: '900',
  },
  btnAgregarReplicaStaffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  txtBtnAgregarReplicaStaffHeader: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cronoBuscadorStaffBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  inputCronoBuscadorStaff: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    padding: 0,
  },
  tarjetaOperadorCronoStaff: {
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 10,
  },
  headerOperadorCronoStaff: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  colorDotMini: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  txtAliasCronoStaff: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  txtRolCronoStaff: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  badgeAprobadoCronoMini: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeVerde: {
    backgroundColor: '#10B981',
  },
  badgeAmarillo: {
    backgroundColor: '#D97706',
  },
  badgeRojo: {
    backgroundColor: colors.danger,
  },
  txtBadgeCronoMini: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  sinReplicasCronoBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  txtSinReplicasCrono: {
    color: colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
  },
  btnAgregarReplicaStaffMini: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  txtBtnAgregarReplicaStaffMini: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
  },
  filaReplicaCronoStaff: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  txtTipoReplicaStaff: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  txtDetalleReplicaStaff: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  inputFpsRapido: {
    backgroundColor: colors.inputBg,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    paddingHorizontal: 8,
    paddingVertical: 6,
    minHeight: 34,
    width: 65,
    textAlign: 'center',
  },
  btnAccionCronoRapida: {
    width: 34,
    height: 34,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnAprobarCronoRapido: {
    backgroundColor: '#10B981',
  },
  btnRechazarCronoRapido: {
    backgroundColor: '#D97706',
  },
  btnEliminarCronoMini: {
    width: 34,
    height: 34,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  preMisionSubseccionTitulo: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  bannerCronoHabilitado: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 10,
    padding: 12,
  },
  txtBannerCronoHabilitadoTitulo: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  txtBannerCronoHabilitadoDesc: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  bannerCronoPendiente: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(214, 158, 46, 0.12)',
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 10,
    padding: 12,
  },
  txtBannerCronoPendienteTitulo: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  txtBannerCronoPendienteDesc: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  listaMisReplicas: {
    gap: 6,
  },
  itemReplicaCronada: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 10,
  },
  txtTipoReplica: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  txtCatReplica: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  badgeAprobadoCrono: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeRechazadoCrono: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  txtBadgeAprobadoCrono: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  txtStatsCrono: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 3,
  },
  accesosTacsopRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  btnAccesoTacsop: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 10,
    gap: 6,
  },
  txtBtnAccesoTacsop: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
