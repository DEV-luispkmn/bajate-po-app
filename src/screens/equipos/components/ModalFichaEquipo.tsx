import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Equipo, PostulacionEquipo } from '../../../api/equipos.service';
import { colors } from '../../../theme/colors';

interface ModalFichaEquipoProps {
  visible: boolean;
  equipo: Equipo | null;
  miEquipoId?: number | null;
  misPostulaciones: PostulacionEquipo[];
  onCerrar: () => void;
  onAbrirPostulacion: (equipo: Equipo) => void;
  onCancelarPostulacion: (postulacionId: number) => void;
}

export const ModalFichaEquipo: React.FC<ModalFichaEquipoProps> = ({
  visible,
  equipo,
  miEquipoId,
  misPostulaciones,
  onCerrar,
  onAbrirPostulacion,
  onCancelarPostulacion,
}) => {
  if (!equipo) return null;

  const esMiEquipo = miEquipoId === equipo.id;
  const miPostulacionPendiente = misPostulaciones.find(
    (p) => Number(p.equipoId) === Number(equipo.id) && p.estado === 'PENDIENTE',
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCerrar}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalDetalleCard}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Cabecera: Logo, Nombre, Lema y Ubicación */}
            <View style={styles.modalDetalleHeader}>
              {equipo.logoUrl ? (
                <Image source={{ uri: equipo.logoUrl }} style={styles.modalDetalleLogo} />
              ) : (
                <View style={styles.modalDetalleLogoPlaceholder}>
                  <MaterialCommunityIcons name="shield-account" size={36} color={colors.primary} />
                </View>
              )}

              <Text style={styles.modalDetalleNombre}>{equipo.nombre}</Text>

              {equipo.lema ? (
                <Text style={styles.modalDetalleLema}>"{equipo.lema}"</Text>
              ) : null}

              <View style={styles.modalDetalleUbicacionRow}>
                <MaterialCommunityIcons name="map-marker" size={15} color={colors.primary} style={{ marginRight: 4 }} />
                <Text style={styles.modalDetalleUbicacionTxt}>
                  {equipo.ciudad ? `${equipo.ciudad}, ` : ''}
                  {equipo.region || 'Chile'}
                </Text>
              </View>

              <View style={{ marginTop: 8 }}>
                {equipo.postulacionesAbiertas ? (
                  <View style={[styles.badgePostulacionesAbiertas, { flexDirection: 'row', alignItems: 'center' }]}>
                    <MaterialCommunityIcons name="circle" size={8} color={colors.success} style={{ marginRight: 5 }} />
                    <Text style={styles.txtPostulacionesAbiertas}>POSTULACIONES ABIERTAS</Text>
                  </View>
                ) : (
                  <View style={[styles.badgePostulacionesCerradas, { flexDirection: 'row', alignItems: 'center' }]}>
                    <MaterialCommunityIcons name="lock" size={10} color={colors.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={styles.txtPostulacionesCerradas}>POSTULACIONES CERRADAS</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Briefing del Equipo */}
            {equipo.descripcion ? (
              <View style={styles.modalDetalleBloque}>
                <Text style={styles.modalDetalleBloqueTitulo}>BRIEFING DEL EQUIPO</Text>
                <Text style={styles.modalDetalleBloqueTexto}>{equipo.descripcion}</Text>
              </View>
            ) : null}

            {/* Roster de Operadores Activos */}
            <View style={styles.modalDetalleBloque}>
              <Text style={styles.modalDetalleBloqueTitulo}>
                OPERADORES ACTIVOS ({equipo.miembros?.length || 0})
              </Text>
              <View style={styles.modalDetalleRoster}>
                {equipo.miembros?.map((m) => (
                  <View key={m.id} style={styles.modalOperadorItem}>
                    <Text style={styles.modalOperadorAlias}>
                      • {m.alias}{' '}
                      <Text style={styles.modalOperadorRol}>[{m.roles || 'ASALTO'}]</Text>
                    </Text>
                    {m.esTL ? (
                      <View style={styles.badgeTlMini}>
                        <MaterialCommunityIcons name="star" size={10} color={colors.warning} style={{ marginRight: 2 }} />
                        <Text style={styles.txtTlMini}>TL</Text>
                      </View>
                    ) : m.esFundador ? (
                      <View style={styles.badgeFundadorMini}>
                        <Text style={styles.txtFundadorMini}>FUNDADOR</Text>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>

            {/* Aviso si postulaciones están cerradas */}
            {!equipo.postulacionesAbiertas && !esMiEquipo && (
              <View style={styles.bannerPostulacionesCerradasModal}>
                <MaterialCommunityIcons name="lock-alert" size={18} color={colors.warning} style={{ marginRight: 6 }} />
                <Text style={styles.txtBannerPostulacionesCerradas}>
                  Las postulaciones públicas están cerradas por el Team Leader (TL). Si tienes un código de reclutamiento táctico, ingrésalo en la pestaña "Ingresar Código".
                </Text>
              </View>
            )}

            {/* Botón de Postulación o Estado Actual */}
            <View style={styles.modalDetalleAcciones}>
              {esMiEquipo ? (
                <View style={styles.badgeYaPerteneces}>
                  <MaterialCommunityIcons name="check-circle" size={18} color={colors.success} style={{ marginRight: 6 }} />
                  <Text style={styles.txtYaPerteneces}>FORMA PARTE DE ESTE EQUIPO</Text>
                </View>
              ) : miPostulacionPendiente ? (
                <View style={styles.boxPostulacionEnviada}>
                  <View style={styles.badgePostulacionPendienteCard}>
                    <MaterialCommunityIcons name="clock-outline" size={18} color={colors.warning} style={{ marginRight: 6 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txtPostulacionPendienteTitulo}>POSTULACIÓN ENVIADA AL TL</Text>
                      <Text style={styles.txtPostulacionPendienteSub}>
                        Tu postulación está en revisión. El Team Leader te contactará por WhatsApp para coordinar.
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.btnCancelarMiPostulacion}
                    onPress={() => onCancelarPostulacion(miPostulacionPendiente.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.txtBtnCancelarMiPostulacion}>CANCELAR MI POSTULACIÓN</Text>
                  </TouchableOpacity>
                </View>
              ) : equipo.postulacionesAbiertas ? (
                <TouchableOpacity
                  style={styles.btnAlistarmeModal}
                  onPress={() => {
                    onCerrar();
                    onAbrirPostulacion(equipo);
                  }}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons name="file-document-edit-outline" size={18} color={colors.text} style={{ marginRight: 6 }} />
                  <Text style={styles.txtBtnAlistarmeModal}>POSTULAR A ESTE EQUIPO</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.btnAlistarmeDeshabilitado}>
                  <MaterialCommunityIcons name="lock" size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
                  <Text style={styles.txtAlistarmeDeshabilitado}>POSTULACIONES CERRADAS</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.btnCerrarModal}
                onPress={onCerrar}
                activeOpacity={0.8}
              >
                <Text style={styles.txtBtnCerrarModal}>CERRAR</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: 16,
  },
  modalDetalleCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalDetalleHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalDetalleLogo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: colors.primary,
    marginBottom: 10,
  },
  modalDetalleLogoPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.inputBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalDetalleNombre: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  modalDetalleLema: {
    color: colors.primary,
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 2,
  },
  modalDetalleUbicacionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  modalDetalleUbicacionTxt: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  badgePostulacionesAbiertas: {
    backgroundColor: colors.successSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.success,
  },
  txtPostulacionesAbiertas: {
    color: colors.success,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  badgePostulacionesCerradas: {
    backgroundColor: 'rgba(156, 163, 175, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.textMuted,
  },
  txtPostulacionesCerradas: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
  },
  modalDetalleBloque: {
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalDetalleBloqueTitulo: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  modalDetalleBloqueTexto: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  modalDetalleRoster: {
    gap: 6,
  },
  modalOperadorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  modalOperadorAlias: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  modalOperadorRol: {
    color: colors.textMuted,
    fontSize: 10,
  },
  badgeTlMini: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  txtTlMini: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: '900',
  },
  badgeFundadorMini: {
    backgroundColor: 'rgba(224, 109, 40, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  txtFundadorMini: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
  },
  bannerPostulacionesCerradasModal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  txtBannerPostulacionesCerradas: {
    color: colors.warning,
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
  },
  modalDetalleAcciones: {
    gap: 8,
    marginTop: 4,
  },
  badgeYaPerteneces: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
  },
  txtYaPerteneces: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  boxPostulacionEnviada: {
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 10,
    gap: 6,
  },
  badgePostulacionPendienteCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  txtPostulacionPendienteTitulo: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: '900',
  },
  txtPostulacionPendienteSub: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  btnCancelarMiPostulacion: {
    alignSelf: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  txtBtnCancelarMiPostulacion: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: '800',
  },
  btnAlistarmeModal: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  txtBtnAlistarmeModal: {
    color: colors.onPrimary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  btnAlistarmeDeshabilitado: {
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  txtAlistarmeDeshabilitado: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  btnCerrarModal: {
    minHeight: 44,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txtBtnCerrarModal: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
});
