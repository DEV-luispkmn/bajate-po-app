import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Pressable,
  StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DetalleEventoResponse } from '../../../api/eventos.service';
import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';
import { modalSheetStyles } from './modalSheetStyles';

export interface ReplicaAlistamientoItem {
  id: string;
  tipoReplica: 'PRIMARIA' | 'PRIMARIA_2' | 'SECUNDARIA' | 'RESPALDO';
  categoria: string;
  modelo: string;
  fpsEstimado: string;
}

interface ModalAlistamientoMilsimProps {
  visible: boolean;
  onClose: () => void;
  evento: DetalleEventoResponse['evento'];
  jugadores: DetalleEventoResponse['jugadores'];
  pasoAlistamiento: 1 | 2 | 3 | 4;
  setPasoAlistamiento: React.Dispatch<React.SetStateAction<1 | 2 | 3 | 4>>;
  reglasAceptadas: boolean;
  setReglasAceptadas: (val: boolean) => void;
  bandoAlistamientoId: number | null;
  setBandoAlistamientoId: (id: number | null) => void;
  replicasAlistamiento: ReplicaAlistamientoItem[];
  actualizarReplicaAlistamiento: (
    id: string,
    campo: 'categoria' | 'modelo' | 'fpsEstimado',
    valor: string,
  ) => void;
  agregarReplicaSecundaria: () => void;
  agregarReplicaPrimaria2: () => void;
  eliminarReplicaAlistamiento: (id: string) => void;
  notifDiaAntesAlistamiento: boolean;
  setNotifDiaAntesAlistamiento: (val: boolean) => void;
  notif30MinAlistamiento: boolean;
  setNotif30MinAlistamiento: (val: boolean) => void;
  alistandoseMilsim: boolean;
  onConfirmarAlistamiento: () => void;
}

export const ModalAlistamientoMilsim: React.FC<ModalAlistamientoMilsimProps> = ({
  visible,
  onClose,
  evento,
  jugadores,
  pasoAlistamiento,
  setPasoAlistamiento,
  reglasAceptadas,
  setReglasAceptadas,
  bandoAlistamientoId,
  setBandoAlistamientoId,
  replicasAlistamiento,
  actualizarReplicaAlistamiento,
  agregarReplicaSecundaria,
  agregarReplicaPrimaria2,
  eliminarReplicaAlistamiento,
  notifDiaAntesAlistamiento,
  setNotifDiaAntesAlistamiento,
  notif30MinAlistamiento,
  setNotif30MinAlistamiento,
  alistandoseMilsim,
  onConfirmarAlistamiento,
}) => {
  const limites =
    evento.tacsop?.limitesCrono && evento.tacsop.limitesCrono.length > 0
      ? evento.tacsop.limitesCrono
      : [
          { categoria: 'ASALTO', fpsMax: 400, joulesMax: 1.49, medMetros: 5, modoDisparo: 'SEMI' },
          { categoria: 'SOPORTE', fpsMax: 400, joulesMax: 1.49, medMetros: 15, modoDisparo: 'AUTO' },
          { categoria: 'DMR', fpsMax: 450, joulesMax: 1.88, medMetros: 20, modoDisparo: 'SEMI' },
          { categoria: 'SNIPER', fpsMax: 550, joulesMax: 2.81, medMetros: 30, modoDisparo: 'BOLT' },
          { categoria: 'PISTOLA', fpsMax: 328, joulesMax: 1.0, medMetros: 0, modoDisparo: 'SEMI' },
        ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        Keyboard.dismiss();
        if (!alistandoseMilsim) onClose();
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={modalSheetStyles.modalOverlay}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={Keyboard.dismiss} accessible={false} />
        <View style={styles.modalContentAlistamiento}>
          <Pressable style={styles.headerAlistamiento} onPress={Keyboard.dismiss} accessible={false}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons
                name="shield-check"
                size={20}
                color={colors.primary}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.tituloAlistamiento}>PROTOCOLO DE ALISTAMIENTO</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                Keyboard.dismiss();
                onClose();
              }}
              disabled={alistandoseMilsim}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Cerrar alistamiento MilSim"
            >
              <MaterialCommunityIcons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </Pressable>

          <View style={styles.stepperContainer}>
            {[
              { paso: 1, label: 'Reglas' },
              { paso: 2, label: 'Réplicas' },
              { paso: 3, label: 'Facción' },
              { paso: 4, label: 'Revisión' },
            ].map((st) => {
              const activo = pasoAlistamiento === st.paso;
              const completado = pasoAlistamiento > st.paso;
              return (
                <View key={st.paso} style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepCircle,
                      activo && styles.stepCircleActivo,
                      completado && styles.stepCircleCompletado,
                    ]}
                  >
                    {completado ? (
                      <MaterialCommunityIcons name="check" size={13} color={colors.text} />
                    ) : (
                      <Text style={[styles.txtStepNumber, activo && styles.txtStepNumberActivo]}>
                        {st.paso}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.txtStepLabel,
                      activo && styles.txtStepLabelActivo,
                      completado && styles.txtStepLabelCompletado,
                    ]}
                  >
                    {st.label}
                  </Text>
                </View>
              );
            })}
          </View>

          <ScrollView
            style={{ maxHeight: 420 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {pasoAlistamiento === 1 && (
              <View style={styles.cuerpoPasoAlistamiento}>
                <Text style={styles.subtituloPasoAlistamiento}>
                  1. REGLAMENTO TACSOP Y CONDICIONES
                </Text>
                <Text style={styles.descPasoAlistamiento}>
                  Revisa las normas oficiales y confirma tu compromiso antes de ingresar a la operación:
                </Text>

                <View style={styles.tacsopBoxAlistamiento}>
                  <Text style={styles.tacsopBoxTitulo}>LÍMITES DE CRONO HOMOLOGADOS (0.20g):</Text>
                  <View style={styles.tablaCronoAlistamiento}>
                    {limites.map((l: any, idx: number) => (
                      <View key={idx} style={styles.filaCronoAlistamiento}>
                        <Text style={styles.colCatCrono}>{l.categoria}:</Text>
                        <Text style={styles.colStatsCrono}>
                          {l.fpsMax} FPS ({l.joulesMax} J) | MED {l.medMetros}m | {l.modoDisparo}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.tacsopBoxAlistamiento}>
                  <Text style={styles.tacsopBoxTitulo}>NORMAS DE COMBATE Y SEGURIDAD:</Text>
                  <View style={styles.reglaItemRow}>
                    <MaterialCommunityIcons
                      name="heart-pulse"
                      size={15}
                      color={colors.danger}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.txtReglaItem}>
                      Vidas por operador:{' '}
                      <Text style={{ color: colors.text, fontWeight: 'bold' }}>
                        {evento.tacsop?.vidasMax || 2}
                      </Text>{' '}
                      (requiere torniquete homologado).
                    </Text>
                  </View>
                  <View style={styles.reglaItemRow}>
                    <MaterialCommunityIcons
                      name="clock-outline"
                      size={15}
                      color={colors.warning}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.txtReglaItem}>
                      Tiempo de desangrado:{' '}
                      <Text style={{ color: colors.text, fontWeight: 'bold' }}>
                        {evento.tacsop?.tiempoDesangradoMin || 5} min
                      </Text>{' '}
                      para rescate de médico.
                    </Text>
                  </View>
                  <View style={styles.reglaItemRow}>
                    <MaterialCommunityIcons
                      name="flag"
                      size={15}
                      color={colors.danger}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.txtReglaItem}>
                      Bajas:{' '}
                      <Text style={{ color: colors.text, fontWeight: 'bold' }}>
                        Pañuelo rojo obligatorio
                      </Text>{' '}
                      de día, luz roja/azul de noche.
                    </Text>
                  </View>
                  <View style={styles.reglaItemRow}>
                    <MaterialCommunityIcons
                      name="radio-handheld"
                      size={15}
                      color={colors.primary}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.txtReglaItem}>
                      Comunicaciones: Radios Baofeng UV-5R con frecuencias asignadas por escuadra.
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.checkboxContainer, reglasAceptadas && styles.checkboxContainerAceptado]}
                  onPress={() => setReglasAceptadas(!reglasAceptadas)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons
                    name={reglasAceptadas ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={22}
                    color={reglasAceptadas ? colors.primary : colors.textMuted}
                  />
                  <Text style={[styles.txtCheckbox, reglasAceptadas && styles.txtCheckboxAceptado]}>
                    He leído y me comprometo a cumplir estrictamente el reglamento TACSOP y las normas de seguridad de esta operación.
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {pasoAlistamiento === 2 && (
              <View style={styles.cuerpoPasoAlistamiento}>
                <Text style={styles.subtituloPasoAlistamiento}>
                  2. DECLARACIÓN DE RÉPLICAS EN DESPLIEGUE
                </Text>
                <Text style={styles.descPasoAlistamiento}>
                  Registra las réplicas que llevarás a la mesa de cronómetro oficial:
                </Text>

                {replicasAlistamiento.map((rep) => {
                  const fpsNum = parseInt(rep.fpsEstimado, 10) || 0;
                  const joulesAprox = (0.5 * 0.0002 * Math.pow(fpsNum * 0.3048, 2)).toFixed(2);
                  return (
                    <View key={rep.id} style={styles.cardReplicaAlistamiento}>
                      <View style={styles.headerReplicaAlistamiento}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <MaterialCommunityIcons
                            name={rep.tipoReplica === 'SECUNDARIA' ? 'pistol' : 'crosshairs-gps'}
                            size={16}
                            color={colors.primary}
                            style={{ marginRight: 6 }}
                          />
                          <Text style={styles.txtTipoReplicaHeader}>
                            {rep.tipoReplica === 'PRIMARIA'
                              ? 'RÉPLICA PRIMARIA'
                              : rep.tipoReplica === 'PRIMARIA_2'
                              ? 'SEGUNDA PRIMARIA'
                              : rep.tipoReplica === 'SECUNDARIA'
                              ? 'RÉPLICA SECUNDARIA'
                              : 'RÉPLICA DE RESPALDO'}
                          </Text>
                        </View>
                        {replicasAlistamiento.length > 1 && (
                          <TouchableOpacity
                            onPress={() => eliminarReplicaAlistamiento(rep.id)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            accessibilityRole="button"
                            accessibilityLabel="Eliminar réplica"
                          >
                            <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.danger} />
                          </TouchableOpacity>
                        )}
                      </View>

                      <Text style={styles.labelCampoReplica}>ROL / CATEGORÍA:</Text>
                      <View style={styles.rolesGridReplica}>
                        {['ASALTO', 'DMR', 'SNIPER', 'SOPORTE', 'PISTOLA'].map((cat) => {
                          const seleccionado = rep.categoria === cat;
                          return (
                            <TouchableOpacity
                              key={cat}
                              style={[styles.chipCatReplica, seleccionado && styles.chipCatReplicaActivo]}
                              onPress={() => actualizarReplicaAlistamiento(rep.id, 'categoria', cat)}
                            >
                              <Text
                                style={[
                                  styles.txtChipCatReplica,
                                  seleccionado && styles.txtChipCatReplicaActivo,
                                ]}
                              >
                                {cat}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      <Text style={styles.labelCampoReplica}>MODELO O NOMBRE DE LA RÉPLICA:</Text>
                      <TextInput
                        style={styles.inputReplicaModelo}
                        value={rep.modelo}
                        onChangeText={(txt) => actualizarReplicaAlistamiento(rep.id, 'modelo', txt)}
                        placeholder="ej. Specna Arms M4, Tokyo Marui Hi-Capa, etc."
                        placeholderTextColor={colors.textMuted}
                      />

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.labelCampoReplica}>FPS ESTIMADO (0.20g):</Text>
                          <TextInput
                            style={styles.inputReplicaFps}
                            value={rep.fpsEstimado}
                            onChangeText={(txt) =>
                              actualizarReplicaAlistamiento(rep.id, 'fpsEstimado', txt.replace(/[^0-9]/g, ''))
                            }
                            placeholder="380"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="numeric"
                          />
                        </View>
                        <View style={styles.cajaJoulesCalculados}>
                          <Text style={styles.txtSubJoules}>POTENCIA ESTIMADA:</Text>
                          <Text style={styles.txtJoulesCalculados}>≈ {joulesAprox} J</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}

                <View style={styles.botonesAgregarReplicasRow}>
                  {!replicasAlistamiento.some((r) => r.tipoReplica === 'SECUNDARIA') && (
                    <TouchableOpacity style={styles.btnAgregarReplicaMini} onPress={agregarReplicaSecundaria}>
                      <MaterialCommunityIcons name="plus" size={14} color={colors.primary} />
                      <Text style={styles.txtBtnAgregarReplicaMini}>+ SECUNDARIA (PISTOLA)</Text>
                    </TouchableOpacity>
                  )}
                  {replicasAlistamiento.length < 3 && (
                    <TouchableOpacity style={styles.btnAgregarReplicaMini} onPress={agregarReplicaPrimaria2}>
                      <MaterialCommunityIcons name="plus" size={14} color={colors.primary} />
                      <Text style={styles.txtBtnAgregarReplicaMini}>+ 2DA PRIMARIA / RESPALDO</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {pasoAlistamiento === 3 && (
              <View style={styles.cuerpoPasoAlistamiento}>
                <Text style={styles.subtituloPasoAlistamiento}>3. SELECCIÓN DE FACCIÓN (ORBAT)</Text>
                <Text style={styles.descPasoAlistamiento}>
                  Elige el bando en el que combatirás durante la operación:
                </Text>

                {evento.bandos?.map((bando) => {
                  const inscritos = jugadores.filter((j) => j.bandoId === bando.id);
                  const cupoLleno = bando.cupoMax ? inscritos.length >= bando.cupoMax : false;
                  const seleccionado = bandoAlistamientoId === bando.id;

                  return (
                    <TouchableOpacity
                      key={bando.id}
                      style={[
                        styles.cardBandoAlistamiento,
                        seleccionado && styles.cardBandoAlistamientoSeleccionado,
                        cupoLleno && styles.cardBandoAlistamientoLleno,
                      ]}
                      disabled={cupoLleno}
                      onPress={() => setBandoAlistamientoId(bando.id)}
                      activeOpacity={0.8}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <View
                            style={[
                              styles.dotBandoAlistamiento,
                              { backgroundColor: bando.colorHex || colors.primary },
                            ]}
                          />
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.nombreBandoAlistamiento,
                                seleccionado && { color: colors.primary },
                              ]}
                            >
                              {bando.nombre}
                            </Text>
                            <Text style={styles.liderBandoAlistamiento}>
                              Comandante: {bando.liderAlias || 'Sin líder asignado'}
                            </Text>
                          </View>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.cupoBandoAlistamiento}>
                            {inscritos.length}
                            {bando.cupoMax ? `/${bando.cupoMax}` : ''} Op.
                          </Text>
                          {cupoLleno ? (
                            <Text style={styles.badgeCupoLleno}>CUPO LLENO</Text>
                          ) : seleccionado ? (
                            <Text style={styles.badgeSeleccionado}>✓ ELEGIDA</Text>
                          ) : null}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {pasoAlistamiento === 4 && (
              <View style={styles.cuerpoPasoAlistamiento}>
                <Text style={styles.subtituloPasoAlistamiento}>
                  4. REVISIÓN FINAL Y NOTIFICACIONES
                </Text>
                <Text style={styles.descPasoAlistamiento}>
                  Verifica tus datos antes de formalizar tu alistamiento en el orden de batalla:
                </Text>

                <View style={styles.resumenAlistamientoCard}>
                  <View style={styles.filaResumenItem}>
                    <Text style={styles.lblResumen}>FACCIÓN SELECCIONADA:</Text>
                    <Text style={styles.valResumenDestacado}>
                      {evento.bandos?.find((b) => b.id === bandoAlistamientoId)?.nombre ||
                        'No seleccionada'}
                    </Text>
                  </View>
                  <View style={styles.filaResumenItem}>
                    <Text style={styles.lblResumen}>ARMAMENTO RÉPLICA:</Text>
                    {replicasAlistamiento.map((r, idx) => (
                      <Text key={idx} style={styles.valResumen}>
                        • {r.tipoReplica}:{' '}
                        <Text style={{ color: colors.text, fontWeight: 'bold' }}>{r.categoria}</Text>{' '}
                        {r.modelo ? `(${r.modelo})` : ''} - {r.fpsEstimado} FPS
                      </Text>
                    ))}
                  </View>
                  <View style={[styles.filaResumenItem, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                    <Text style={styles.lblResumen}>REGLAMENTO TACSOP:</Text>
                    <Text style={[styles.valResumen, { color: colors.success }]}>
                      ✓ Términos y límites aceptados
                    </Text>
                  </View>
                </View>

                <View style={styles.notificacionesAlistamientoBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <MaterialCommunityIcons
                      name="bell-ring-outline"
                      size={16}
                      color={colors.primary}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.tituloNotifAlistamiento}>
                      ALERTAS TÁCTICAS EN TU TELÉFONO
                    </Text>
                  </View>
                  <Text style={styles.descNotifAlistamiento}>
                    Activa recordatorios automáticos para no olvidar réplicas ni retrasar tu despliegue:
                  </Text>

                  <View style={styles.switchNotifRow}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={styles.txtSwitchNotifTitulo}>Día anterior (24 horas antes)</Text>
                      <Text style={styles.txtSwitchNotifDesc}>
                        Aviso táctico 24 hrs antes para alistar réplicas y baterías
                      </Text>
                    </View>
                    <Switch
                      value={notifDiaAntesAlistamiento}
                      onValueChange={setNotifDiaAntesAlistamiento}
                      trackColor={{ false: colors.inputBg, true: colors.primary }}
                      thumbColor={notifDiaAntesAlistamiento ? colors.text : colors.textMuted}
                    />
                  </View>

                  <View style={[styles.switchNotifRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={styles.txtSwitchNotifTitulo}>30 minutos antes</Text>
                      <Text style={styles.txtSwitchNotifDesc}>
                        Aviso media hora antes para presentación en crono
                      </Text>
                    </View>
                    <Switch
                      value={notif30MinAlistamiento}
                      onValueChange={setNotif30MinAlistamiento}
                      trackColor={{ false: colors.inputBg, true: colors.primary }}
                      thumbColor={notif30MinAlistamiento ? colors.text : colors.textMuted}
                    />
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.footerAlistamientoBotones}>
            {pasoAlistamiento > 1 ? (
              <TouchableOpacity
                style={styles.btnVolverAlistamiento}
                onPress={() => setPasoAlistamiento((prev) => (prev - 1) as 1 | 2 | 3 | 4)}
                disabled={alistandoseMilsim}
              >
                <MaterialCommunityIcons
                  name="arrow-left"
                  size={16}
                  color={colors.text}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.txtBtnVolverAlistamiento}>VOLVER</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.btnVolverAlistamiento}
                onPress={onClose}
                disabled={alistandoseMilsim}
              >
                <Text style={styles.txtBtnVolverAlistamiento}>CANCELAR</Text>
              </TouchableOpacity>
            )}

            {pasoAlistamiento < 4 ? (
              <TouchableOpacity
                style={[
                  styles.btnSiguienteAlistamiento,
                  (pasoAlistamiento === 1 && !reglasAceptadas) ||
                  (pasoAlistamiento === 3 && !bandoAlistamientoId)
                    ? modalSheetStyles.botonDeshabilitado
                    : null,
                ]}
                disabled={
                  (pasoAlistamiento === 1 && !reglasAceptadas) ||
                  (pasoAlistamiento === 3 && !bandoAlistamientoId)
                }
                onPress={() => setPasoAlistamiento((prev) => (prev + 1) as 1 | 2 | 3 | 4)}
              >
                <Text style={styles.txtBtnSiguienteAlistamiento}>
                  {pasoAlistamiento === 1
                    ? 'REGISTRAR RÉPLICAS ➔'
                    : pasoAlistamiento === 2
                    ? 'ELEGIR FACCIÓN ➔'
                    : 'REVISAR ALISTAMIENTO ➔'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.btnFinalizarAlistamiento,
                  alistandoseMilsim && modalSheetStyles.botonDeshabilitado,
                ]}
                disabled={alistandoseMilsim}
                onPress={onConfirmarAlistamiento}
              >
                {alistandoseMilsim ? (
                  <ActivityIndicator color={colors.onPrimary} size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="check-decagram"
                      size={18}
                      color={colors.onPrimary}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.txtBtnFinalizarAlistamiento}>CONFIRMAR ALISTAMIENTO</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContentAlistamiento: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    width: '100%',
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  headerAlistamiento: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tituloAlistamiento: {
    color: colors.primary,
    fontSize: 14,
    fontFamily: fonts.displayBold,
    letterSpacing: 0.8,
  },
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    padding: 8,
    marginBottom: 12,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActivo: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepCircleCompletado: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  txtStepNumber: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  txtStepNumberActivo: {
    color: colors.onPrimary,
  },
  txtStepLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  txtStepLabelActivo: {
    color: colors.primary,
  },
  txtStepLabelCompletado: {
    color: colors.success,
  },
  cuerpoPasoAlistamiento: {
    paddingVertical: 4,
  },
  subtituloPasoAlistamiento: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 4,
  },
  descPasoAlistamiento: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 10,
  },
  tacsopBoxAlistamiento: {
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 10,
    marginBottom: 10,
  },
  tacsopBoxTitulo: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  tablaCronoAlistamiento: {
    gap: 4,
  },
  filaCronoAlistamiento: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceSubtle,
  },
  colCatCrono: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    width: 65,
  },
  colStatsCrono: {
    color: colors.text,
    fontSize: 10,
    fontFamily: fonts.monoBold,
    fontVariant: ['tabular-nums'],
    flex: 1,
    textAlign: 'right',
  },
  reglaItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  txtReglaItem: {
    color: colors.textSecondary,
    fontSize: 10,
    flex: 1,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
    marginTop: 4,
    gap: 10,
  },
  checkboxContainerAceptado: {
    borderColor: colors.primary,
    backgroundColor: colors.warningSoft,
  },
  txtCheckbox: {
    color: colors.textSecondary,
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
  },
  txtCheckboxAceptado: {
    color: colors.text,
    fontWeight: '600',
  },
  cardReplicaAlistamiento: {
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
    marginBottom: 10,
  },
  headerReplicaAlistamiento: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    paddingBottom: 6,
  },
  txtTipoReplicaHeader: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
  },
  labelCampoReplica: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
    marginTop: 4,
  },
  rolesGridReplica: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  chipCatReplica: {
    backgroundColor: colors.card,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  chipCatReplicaActivo: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.primary,
  },
  txtChipCatReplica: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  txtChipCatReplicaActivo: {
    color: colors.primary,
    fontWeight: '900',
  },
  inputReplicaModelo: {
    backgroundColor: colors.card,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 10,
    paddingVertical: 7,
    color: colors.text,
    fontSize: 11,
  },
  inputReplicaFps: {
    backgroundColor: colors.card,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 10,
    paddingVertical: 7,
    color: colors.text,
    fontSize: 12,
    fontFamily: fonts.monoBold,
    fontVariant: ['tabular-nums'],
  },
  cajaJoulesCalculados: {
    backgroundColor: colors.card,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignItems: 'center',
  },
  txtSubJoules: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  txtJoulesCalculados: {
    color: colors.primary,
    fontSize: 12,
    fontFamily: fonts.monoBold,
    fontVariant: ['tabular-nums'],
  },
  botonesAgregarReplicasRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
    marginBottom: 6,
  },
  btnAgregarReplicaMini: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  txtBtnAgregarReplicaMini: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  cardBandoAlistamiento: {
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
    marginBottom: 8,
  },
  cardBandoAlistamientoSeleccionado: {
    borderColor: colors.primary,
    backgroundColor: colors.warningSoft,
  },
  cardBandoAlistamientoLleno: {
    opacity: 0.5,
  },
  dotBandoAlistamiento: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  nombreBandoAlistamiento: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
  },
  liderBandoAlistamiento: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  cupoBandoAlistamiento: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  badgeCupoLleno: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '900',
    marginTop: 2,
  },
  badgeSeleccionado: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    marginTop: 2,
  },
  resumenAlistamientoCard: {
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
    marginBottom: 10,
  },
  filaResumenItem: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceSubtle,
  },
  lblResumen: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 2,
  },
  valResumenDestacado: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  valResumen: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  notificacionesAlistamientoBox: {
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
  },
  tituloNotifAlistamiento: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  descNotifAlistamiento: {
    color: colors.textSecondary,
    fontSize: 10,
    marginBottom: 10,
    lineHeight: 14,
  },
  switchNotifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceSubtle,
  },
  txtSwitchNotifTitulo: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
  },
  txtSwitchNotifDesc: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  footerAlistamientoBotones: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: 12,
  },
  btnVolverAlistamiento: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  txtBtnVolverAlistamiento: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
  },
  btnSiguienteAlistamiento: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  txtBtnSiguienteAlistamiento: {
    color: colors.onPrimary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  btnFinalizarAlistamiento: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  txtBtnFinalizarAlistamiento: {
    color: colors.onPrimary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
