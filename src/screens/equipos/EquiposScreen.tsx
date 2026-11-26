import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Share,
  Linking,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { REGIONES_CHILE } from '../eventos/CrearEventoScreen';
import {
  Equipo,
  MiembroEquipo,
  listarEquiposApi,
  obtenerMiEquipoApi,
  crearEquipoApi,
  unirseEquipoApi,
  unirsePorCodigoApi,
  salirEquipoApi,
  desintegrarEquipoApi,
  cambiarPostulacionesApi,
  asignarTLApi,
  modificarMiEquipoApi,
  PostulacionEquipo,
  postularEquipoApi,
  listarPostulacionesMiEquipoApi,
  responderPostulacionApi,
  obtenerMisPostulacionesApi,
  cancelarPostulacionApi,
} from '../../api/equipos.service';
import { ModalNotificaciones } from '../../components/ModalNotificaciones';
import { listarNotificacionesApi } from '../../api/notificaciones.service';
import { ModalFichaEquipo } from './components/ModalFichaEquipo';
import { ModalConfirmacionTactico } from '../../components/ModalConfirmacionTactico';

export const EquiposScreen = () => {
  const { jugador, recargarPerfil } = useAuth();
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();

  // Pestaña Principal (EXPLORAR vs MI EQUIPO)
  const [tabActual, setTabActual] = useState<'EXPLORAR' | 'MI_EQUIPO'>('EXPLORAR');

  useEffect(() => {
    if (route.params?.tab) {
      setTabActual(route.params.tab);
    }
  }, [route.params?.tab]);

  // Estados de datos
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [miEquipo, setMiEquipo] = useState<Equipo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  // Mi Región del jugador
  const miRegion = jugador?.region || 'Región Metropolitana';

  // Filtros de Exploración
  // 'MI_REGION' | 'PERSONALIZADA'
  const [modoFiltro, setModoFiltro] = useState<'MI_REGION' | 'PERSONALIZADA'>('MI_REGION');
  const [regionFiltro, setRegionFiltro] = useState<string>(miRegion);
  const [busqueda, setBusqueda] = useState<string>('');
  const [modalRegionVisible, setModalRegionVisible] = useState(false);

  // Modal Detalle de Equipo
  const [equipoDetalle, setEquipoDetalle] = useState<Equipo | null>(null);
  const [modalDetalleVisible, setModalDetalleVisible] = useState(false);
  const [uniendose, setUniendose] = useState(false);

  // Modal Crear Equipo
  const [modalCrearVisible, setModalCrearVisible] = useState(false);
  const [crearNombre, setCrearNombre] = useState('');
  const [crearLema, setCrearLema] = useState('');
  const [crearDescripcion, setCrearDescripcion] = useState('');
  const [crearRegion, setCrearRegion] = useState(miRegion);
  const [crearCiudad, setCrearCiudad] = useState(jugador?.ciudad || '');
  const [crearLogoUrl, setCrearLogoUrl] = useState('');
  const [modalRegionCrearVisible, setModalRegionCrearVisible] = useState(false);
  const [guardandoEquipo, setGuardandoEquipo] = useState(false);
  const [errorCrearModal, setErrorCrearModal] = useState<string | null>(null);

  // Modal Unirse por Código
  const [modalCodigoVisible, setModalCodigoVisible] = useState(false);
  const [codigoIngresado, setCodigoIngresado] = useState('');
  const [procesandoCodigo, setProcesandoCodigo] = useState(false);
  const [errorCodigoModal, setErrorCodigoModal] = useState<string | null>(null);

  // Gestión TL (Team Leader)
  const [cambiandoPostulaciones, setCambiandoPostulaciones] = useState(false);
  const [modalDesintegrarVisible, setModalDesintegrarVisible] = useState(false);
  const [desintegrandoEquipo, setDesintegrandoEquipo] = useState(false);

  // Modal Modificar Información del Equipo (TL / Fundador)
  const [modalEditarEquipoVisible, setModalEditarEquipoVisible] = useState(false);
  const [editNombre, setEditNombre] = useState('');
  const [editLema, setEditLema] = useState('');
  const [editDescripcion, setEditDescripcion] = useState('');
  const [editRegion, setEditRegion] = useState(miRegion);
  const [editCiudad, setEditCiudad] = useState('');
  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [modalRegionEditarVisible, setModalRegionEditarVisible] = useState(false);
  const [guardandoEdicionEquipo, setGuardandoEdicionEquipo] = useState(false);
  const [errorEditarModal, setErrorEditarModal] = useState<string | null>(null);

  // Estados de Postulaciones Tácticas
  const [postulacionesPendientes, setPostulacionesPendientes] = useState<PostulacionEquipo[]>([]);
  const [misPostulaciones, setMisPostulaciones] = useState<PostulacionEquipo[]>([]);
  const [modalPostularVisible, setModalPostularVisible] = useState(false);
  const [equipoParaPostular, setEquipoParaPostular] = useState<Equipo | null>(null);
  const [postulacionContacto, setPostulacionContacto] = useState('');
  const [postulacionMensaje, setPostulacionMensaje] = useState('');
  const [enviandoPostulacion, setEnviandoPostulacion] = useState(false);
  const [respondiendoPostulacionId, setRespondiendoPostulacionId] = useState<number | null>(null);
  const [errorPostularModal, setErrorPostularModal] = useState<string | null>(null);

  // Modal Táctico Unificado (Avisos y Confirmaciones)
  const [modalTactico, setModalTactico] = useState<{
    visible: boolean;
    titulo: string;
    mensaje: string;
    tipo: 'primario' | 'peligro' | 'advertencia' | 'exito';
    icono?: keyof typeof MaterialCommunityIcons.glyphMap;
    textoConfirmar?: string;
    textoCancelar?: string;
    soloAceptar?: boolean;
    cargando?: boolean;
    onConfirmar?: () => void;
    onCancelar?: () => void;
  }>({
    visible: false,
    titulo: '',
    mensaje: '',
    tipo: 'primario',
  });

  const mostrarAvisoTactico = (
    titulo: string,
    mensaje: string,
    tipo: 'primario' | 'peligro' | 'advertencia' | 'exito' = 'primario',
    icono?: keyof typeof MaterialCommunityIcons.glyphMap,
  ) => {
    setModalTactico({
      visible: true,
      titulo,
      mensaje,
      tipo,
      icono,
      soloAceptar: true,
      textoConfirmar: 'ENTENDIDO',
      onConfirmar: () => setModalTactico((prev) => ({ ...prev, visible: false })),
    });
  };

  const mostrarConfirmacionTactico = (
    titulo: string,
    mensaje: string,
    onConfirmar: () => void,
    opciones?: {
      tipo?: 'primario' | 'peligro' | 'advertencia' | 'exito';
      icono?: keyof typeof MaterialCommunityIcons.glyphMap;
      textoConfirmar?: string;
      textoCancelar?: string;
      onCancelar?: () => void;
    },
  ) => {
    setModalTactico({
      visible: true,
      titulo,
      mensaje,
      tipo: opciones?.tipo || 'primario',
      icono: opciones?.icono,
      textoConfirmar: opciones?.textoConfirmar || 'CONFIRMAR',
      textoCancelar: opciones?.textoCancelar || 'CANCELAR',
      soloAceptar: false,
      onConfirmar,
      onCancelar: opciones?.onCancelar || (() => setModalTactico((prev) => ({ ...prev, visible: false }))),
    });
  };

  // Notificaciones
  const [modalNotificacionesVisible, setModalNotificacionesVisible] = useState(false);
  const [conteoNoLeidas, setConteoNoLeidas] = useState(0);
  const { suscribirNotificaciones } = useSocket();

  useEffect(() => {
    if (!suscribirNotificaciones) return;
    const desuscribir = suscribirNotificaciones(() => {
      setConteoNoLeidas((prev) => prev + 1);
      cargarDatos();
    });
    return desuscribir;
  }, [suscribirNotificaciones]);

  // Modal Rechazar Postulación con Motivo
  const [modalRechazoVisible, setModalRechazoVisible] = useState(false);
  const [postulacionRechazo, setPostulacionRechazo] = useState<{ id: number; alias?: string } | null>(null);
  const [motivoRechazoTexto, setMotivoRechazoTexto] = useState('');
  const [enviandoRechazo, setEnviandoRechazo] = useState(false);

  useEffect(() => {
    if (jugador?.region) {
      setCrearRegion(jugador.region);
    }
  }, [jugador?.region]);

  const seleccionarModoMiRegion = () => {
    setModoFiltro('MI_REGION');
    setRegionFiltro(miRegion);
  };

  const seleccionarRegionEspecifica = (reg: string) => {
    if (reg === miRegion) {
      setModoFiltro('MI_REGION');
      setRegionFiltro(miRegion);
    } else {
      setModoFiltro('PERSONALIZADA');
      setRegionFiltro(reg);
    }
    setModalRegionVisible(false);
  };

  const cargarDatos = async () => {
    try {
      const regionParam = modoFiltro === 'MI_REGION' ? miRegion : regionFiltro;

      const [resEquipos, resMiEquipo, resMisPostulaciones, resNotif] = await Promise.all([
        listarEquiposApi({
          region: regionParam,
          search: busqueda.trim() || undefined,
        }),
        obtenerMiEquipoApi().catch(() => null),
        obtenerMisPostulacionesApi().catch((err) => {
          console.warn('Error al obtener mis postulaciones:', err);
          return [];
        }),
        listarNotificacionesApi().catch(() => ({ notificaciones: [], noLeidas: 0 })),
      ]);

      setEquipos(resEquipos);
      setMiEquipo(resMiEquipo);
      setMisPostulaciones(resMisPostulaciones);
      setConteoNoLeidas(resNotif.noLeidas);

      const esTlOGestor =
        resMiEquipo &&
        (resMiEquipo.tlId === jugador?.id ||
          (!resMiEquipo.tlId && resMiEquipo.fundadorId === jugador?.id) ||
          resMiEquipo.capitanId === jugador?.id);

      if (esTlOGestor) {
        const postulacionesTl = await listarPostulacionesMiEquipoApi('PENDIENTE').catch(() => []);
        setPostulacionesPendientes(postulacionesTl);
      } else {
        setPostulacionesPendientes([]);
      }
    } catch (error: any) {
      console.warn('Error al cargar equipos:', error);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [modoFiltro, regionFiltro, busqueda, jugador?.region]),
  );

  const onRefresh = () => {
    setRefrescando(true);
    cargarDatos();
  };

  // Selección de Foto de Logo para el Equipo
  const handleSeleccionarLogoGaleria = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        mostrarAvisoTactico(
          'PERMISO REQUERIDO',
          'Se necesita acceso a la galería para subir el logo de tu equipo.',
          'advertencia',
          'image-off',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.3,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        let base64Uri = asset.uri;
        if (asset.base64) {
          base64Uri = `data:image/jpeg;base64,${asset.base64}`;
        }
        setCrearLogoUrl(base64Uri);
      }
    } catch (error: any) {
      mostrarAvisoTactico('ERROR DE IMAGEN', error.message || 'No se pudo cargar la imagen.', 'peligro', 'alert-circle-outline');
    }
  };

  // Crear Equipo Oficial
  const handleCrearEquipo = async () => {
    Keyboard.dismiss();
    if (!crearNombre.trim()) {
      setErrorCrearModal('El nombre del equipo es obligatorio.');
      return;
    }
    setErrorCrearModal(null);

    try {
      setGuardandoEquipo(true);
      const nuevo = await crearEquipoApi({
        nombre: crearNombre.trim(),
        lema: crearLema.trim() || undefined,
        descripcion: crearDescripcion.trim() || undefined,
        region: crearRegion,
        ciudad: crearCiudad.trim() || undefined,
        logoUrl: crearLogoUrl || undefined,
      });

      setModalCrearVisible(false);
      setCrearNombre('');
      setCrearLema('');
      setCrearDescripcion('');
      setCrearLogoUrl('');
      setErrorCrearModal(null);

      mostrarAvisoTactico(
        '¡EQUIPO FUNDADO!',
        `Has creado exitosamente "${nuevo.nombre}". Eres el Fundador y Team Leader (TL) inicial del equipo.`,
        'exito',
        'shield-check',
      );

      setTabActual('MI_EQUIPO');
      await cargarDatos();
      if (recargarPerfil) {
        await recargarPerfil();
      }
    } catch (error: any) {
      setErrorCrearModal(error.message || 'Ocurrió un error al fundar el equipo.');
    } finally {
      setGuardandoEquipo(false);
    }
  };

  // Unirse a un Equipo
  const handleUnirmeEquipo = async (equipo: Equipo) => {
    mostrarConfirmacionTactico(
      '¿ALISTARTE A ESTE EQUIPO?',
      `¿Deseas sumarte formalmente a las filas de "${equipo.nombre}"?${
        miEquipo ? `\n\n(Dejarás de pertenecer a "${miEquipo.nombre}")` : ''
      }`,
      async () => {
        try {
          setModalTactico((prev) => ({ ...prev, visible: false }));
          setUniendose(true);
          const actualizado = await unirseEquipoApi(equipo.id);
          setModalDetalleVisible(false);
          mostrarAvisoTactico('¡BIENVENIDO CAMARADA!', `Ahora formas parte de "${actualizado.nombre}".`, 'exito', 'shield-account');
          setTabActual('MI_EQUIPO');
          await cargarDatos();
          if (recargarPerfil) {
            await recargarPerfil();
          }
        } catch (error: any) {
          mostrarAvisoTactico('ERROR DE ALISTAMIENTO', error.message || 'No se pudo completar el alistamiento.', 'peligro', 'alert-circle-outline');
        } finally {
          setUniendose(false);
        }
      },
      {
        tipo: 'primario',
        icono: 'shield-account',
        textoConfirmar: 'CONFIRMAR Y ALISTARME',
      },
    );
  };

  // Proceso de Postulación a un Equipo
  const handleAbrirModalPostulacion = (equipo: Equipo) => {
    if (miEquipo) {
      mostrarConfirmacionTactico(
        'AVISO DE TRASPASO',
        `Actualmente formas parte de "${miEquipo.nombre}". Si el Team Leader de "${equipo.nombre}" aprueba tu postulación, serás transferido a este nuevo equipo.\n\n¿Deseas continuar?`,
        () => {
          setModalTactico((prev) => ({ ...prev, visible: false }));
          setEquipoParaPostular(equipo);
          setPostulacionContacto('');
          setPostulacionMensaje('');
          setErrorPostularModal(null);
          setModalPostularVisible(true);
        },
        {
          tipo: 'advertencia',
          icono: 'swap-horizontal',
          textoConfirmar: 'CONTINUAR Y POSTULAR',
          textoCancelar: 'VOLVER',
        },
      );
      return;
    }

    setEquipoParaPostular(equipo);
    setPostulacionContacto('');
    setPostulacionMensaje('');
    setErrorPostularModal(null);
    setModalPostularVisible(true);
  };

  const handleEnviarPostulacion = async () => {
    Keyboard.dismiss();
    if (!equipoParaPostular) return;
    if (!postulacionContacto.trim()) {
      setErrorPostularModal('Ingresa tu número de WhatsApp o teléfono para que el Team Leader pueda contactarte.');
      return;
    }
    setErrorPostularModal(null);

    setEnviandoPostulacion(true);
    try {
      const nuevaPost = await postularEquipoApi(equipoParaPostular.id, {
        contacto: postulacionContacto.trim(),
        mensaje: postulacionMensaje.trim() || undefined,
      });

      // Actualizar estado local de inmediato
      setMisPostulaciones((prev) => [
        nuevaPost,
        ...prev.filter((p) => Number(p.equipoId) !== Number(equipoParaPostular.id)),
      ]);

      setModalPostularVisible(false);
      setErrorPostularModal(null);
      mostrarAvisoTactico(
        '¡POSTULACIÓN ENVIADA!',
        `Tu solicitud fue remitida con éxito al Team Leader (TL) de "${equipoParaPostular.nombre}".\n\nEl TL revisará tus datos y te contactará por WhatsApp para coordinar tu ingreso o prueba en terreno.`,
        'exito',
        'email-check-outline',
      );
      await cargarDatos();
    } catch (error: any) {
      setErrorPostularModal(error.message || 'No se pudo enviar la postulación.');
    } finally {
      setEnviandoPostulacion(false);
    }
  };

  const handleCancelarMiPostulacion = (postulacionId: number) => {
    mostrarConfirmacionTactico(
      '¿RETIRAR POSTULACIÓN?',
      '¿Deseas cancelar tu postulación enviada a este equipo?',
      async () => {
        try {
          setModalTactico((prev) => ({ ...prev, visible: false }));
          await cancelarPostulacionApi(postulacionId);
          setMisPostulaciones((prev) => prev.filter((p) => p.id !== postulacionId));
          mostrarAvisoTactico('POSTULACIÓN RETIRADA', 'Has cancelado tu solicitud correctamente.', 'advertencia', 'cancel');
          await cargarDatos();
        } catch (error: any) {
          mostrarAvisoTactico('ERROR', error.message || 'No se pudo retirar la postulación.', 'peligro', 'alert-circle-outline');
        }
      },
      {
        tipo: 'advertencia',
        icono: 'cancel',
        textoConfirmar: 'SÍ, RETIRAR',
        textoCancelar: 'NO',
      },
    );
  };

  const handleAbrirWhatsApp = (contacto?: string | null, alias?: string) => {
    if (!contacto) {
      mostrarAvisoTactico('SIN CONTACTO', 'El postulante no proporcionó número de contacto.', 'advertencia', 'phone-off');
      return;
    }
    const soloNumeros = contacto.replace(/[^0-9]/g, '');
    let numero = soloNumeros;
    if (numero.length === 9 && numero.startsWith('9')) {
      numero = '56' + numero;
    }
    const mensaje = encodeURIComponent(
      `Hola ${alias || 'camarada'}, te contacto desde la app Bájate Po! respecto a tu postulación a nuestro equipo "${miEquipo?.nombre || 'de airsoft'}".`,
    );
    const url = `https://wa.me/${numero}?text=${mensaje}`;
    Linking.openURL(url).catch(() => {
      mostrarAvisoTactico(
        'ATENCIÓN',
        `No se pudo abrir WhatsApp automáticamente. Puedes contactar directamente al número: ${contacto}`,
        'advertencia',
        'whatsapp',
      );
    });
  };

  const handleAbrirRechazo = (postulacionId: number, alias?: string) => {
    setPostulacionRechazo({ id: postulacionId, alias });
    setMotivoRechazoTexto('');
    setModalRechazoVisible(true);
  };

  const handleConfirmarRechazo = async () => {
    Keyboard.dismiss();
    if (!postulacionRechazo) return;
    try {
      setEnviandoRechazo(true);
      setRespondiendoPostulacionId(postulacionRechazo.id);
      await responderPostulacionApi(
        postulacionRechazo.id,
        'RECHAZAR',
        motivoRechazoTexto.trim() || undefined,
      );
      setModalRechazoVisible(false);
      setPostulacionRechazo(null);
      setMotivoRechazoTexto('');
      mostrarAvisoTactico('POSTULACIÓN DECLINADA', 'Se ha notificado al operador indicando el motivo de rechazo.', 'advertencia', 'account-cancel');
      await cargarDatos();
    } catch (error: any) {
      mostrarAvisoTactico('ERROR', error.message || 'No se pudo rechazar la postulación.', 'peligro', 'alert-circle-outline');
    } finally {
      setEnviandoRechazo(false);
      setRespondiendoPostulacionId(null);
    }
  };

  const handleResponderPostulacion = (
    postulacionId: number,
    decision: 'ACEPTAR' | 'RECHAZAR',
    alias?: string,
  ) => {
    if (decision === 'RECHAZAR') {
      handleAbrirRechazo(postulacionId, alias);
      return;
    }

    mostrarConfirmacionTactico(
      '¿INCORPORAR AL EQUIPO?',
      `¿Confirmas que deseas reclutar oficialmente a "${alias || 'este operador'}" en las filas de "${miEquipo?.nombre}"?`,
      async () => {
        try {
          setModalTactico((prev) => ({ ...prev, visible: false }));
          setRespondiendoPostulacionId(postulacionId);
          await responderPostulacionApi(postulacionId, 'ACEPTAR');
          mostrarAvisoTactico(
            'OPERADOR RECLUTADO',
            `"${alias || 'El operador'}" ahora forma parte activa de tu equipo.`,
            'exito',
            'shield-account',
          );
          await cargarDatos();
        } catch (error: any) {
          mostrarAvisoTactico('ERROR', error.message || 'No se pudo procesar la postulación.', 'peligro', 'alert-circle-outline');
        } finally {
          setRespondiendoPostulacionId(null);
        }
      },
      {
        tipo: 'exito',
        icono: 'account-plus',
        textoConfirmar: 'SÍ, INCORPORAR AL EQUIPO',
      },
    );
  };

  // Unirse por Código
  const handleUnirsePorCodigo = async () => {
    Keyboard.dismiss();
    if (!codigoIngresado.trim()) {
      setErrorCodigoModal('Ingresa el código táctico de 6 caracteres.');
      return;
    }

    try {
      setProcesandoCodigo(true);
      setErrorCodigoModal(null);
      const equipo = await unirsePorCodigoApi(codigoIngresado.trim().toUpperCase());
      setModalCodigoVisible(false);
      setCodigoIngresado('');
      setErrorCodigoModal(null);
      mostrarAvisoTactico('ALISTAMIENTO EXITOSO', `Te has sumado al equipo "${equipo.nombre}".`, 'exito', 'shield-check');
      setTabActual('MI_EQUIPO');
      await cargarDatos();
      if (recargarPerfil) {
        await recargarPerfil();
      }
    } catch (error: any) {
      setErrorCodigoModal(error.message || 'Código inválido o equipo no encontrado.');
    } finally {
      setProcesandoCodigo(false);
    }
  };

  // Salir del Equipo
  const handleSalirEquipo = () => {
    if (!miEquipo) return;

    mostrarConfirmacionTactico(
      '¿DESVINCULARTE DE TU EQUIPO?',
      `¿Estás seguro de que deseas salir de "${miEquipo.nombre}"?\nQuedarás registrado como operador libre (Lobo Solitario).`,
      async () => {
        try {
          setModalTactico((prev) => ({ ...prev, visible: false }));
          setCargando(true);
          await salirEquipoApi();
          mostrarAvisoTactico('DESVINCULACIÓN COMPLETA', 'Has abandonado el equipo.', 'advertencia', 'logout-variant');
          setMiEquipo(null);
          await cargarDatos();
          if (recargarPerfil) {
            await recargarPerfil();
          }
        } catch (error: any) {
          mostrarAvisoTactico('ERROR', error.message || 'No se pudo salir del equipo.', 'peligro', 'alert-circle-outline');
        } finally {
          setCargando(false);
        }
      },
      {
        tipo: 'peligro',
        icono: 'logout-variant',
        textoConfirmar: 'SÍ, DESVINCULARME',
      },
    );
  };

  // Desintegrar el Equipo (Exclusivo para el Team Leader / Fundador)
  const handleDesintegrarEquipo = () => {
    if (!miEquipo) return;
    setModalDesintegrarVisible(true);
  };

  const handleConfirmarDesintegracion = async () => {
    try {
      setDesintegrandoEquipo(true);
      await desintegrarEquipoApi();
      setModalDesintegrarVisible(false);
      setMiEquipo(null);
      setTabActual('EXPLORAR');
      await cargarDatos();
      if (recargarPerfil) {
        await recargarPerfil();
      }
    } catch (error: any) {
      mostrarAvisoTactico('ERROR AL DESINTEGRAR', error.message || 'No se pudo desintegrar el equipo.', 'peligro', 'bomb');
    } finally {
      setDesintegrandoEquipo(false);
    }
  };

  // Control TL: Abrir o Cerrar Postulaciones
  const handleTogglePostulaciones = async () => {
    if (!miEquipo) return;
    const nuevoEstado = !miEquipo.postulacionesAbiertas;
    try {
      setCambiandoPostulaciones(true);
      await cambiarPostulacionesApi(nuevoEstado);
      mostrarAvisoTactico(
        'POSTULACIONES ACTUALIZADAS',
        nuevoEstado
          ? 'Las postulaciones ahora están ABIERTAS. Cualquier operador podrá solicitar unirse desde Explorar.'
          : 'Las postulaciones ahora están CERRADAS. Los nuevos operadores solo podrán ingresar con tu código de reclutamiento oficial.',
        'primario',
        nuevoEstado ? 'lock-open-outline' : 'lock-outline',
      );
      cargarDatos();
    } catch (error: any) {
      mostrarAvisoTactico('ERROR', error.message || 'No se pudo cambiar el estado de postulaciones.', 'peligro', 'alert-circle-outline');
    } finally {
      setCambiandoPostulaciones(false);
    }
  };

  // Control TL: Nombrar a otro camarada como Team Leader (TL)
  const handleNombrarTl = (miembro: MiembroEquipo) => {
    if (!miEquipo) return;
    mostrarConfirmacionTactico(
      '¿NOMBRAR COMO TEAM LEADER (TL)?',
      `¿Deseas ceder el mando de Team Leader a "${miembro.alias}"?\n\nTendrá el rango más alto para la gestión del equipo y el control de postulaciones.`,
      async () => {
        try {
          setModalTactico((prev) => ({ ...prev, visible: false }));
          await asignarTLApi(miembro.id);
          mostrarAvisoTactico('¡NUEVO TL DESIGNADO!', `${miembro.alias} es ahora el Team Leader oficial del equipo.`, 'exito', 'crown');
          cargarDatos();
        } catch (error: any) {
          mostrarAvisoTactico('ERROR', error.message || 'No se pudo designar al nuevo TL.', 'peligro', 'alert-circle-outline');
        }
      },
      {
        tipo: 'advertencia',
        icono: 'crown-outline',
        textoConfirmar: 'SÍ, NOMBRAR COMO TL',
      },
    );
  };

  // Compartir Código del Equipo
  const handleCompartirCodigoEquipo = async () => {
    if (!miEquipo?.codigoAcceso) return;
    try {
      await Share.share({
        message: `*BÁJATE PO! AIRSOFT CHILE*\n\n*Únete a mi equipo táctico:* *${miEquipo.nombre}*\n*Región:* ${miEquipo.region || 'Chile'}\n*Código de reclutamiento:* *${miEquipo.codigoAcceso}*\n\nIngresa este código en la app Bájate Po! para sumarte a nuestras filas.`,
        title: `Reclutamiento: ${miEquipo.nombre}`,
      });
    } catch {}
  };

  // Modificar Información del Equipo (TL / Fundador)
  const handleAbrirModalEditarEquipo = () => {
    if (!miEquipo) return;
    setEditNombre(miEquipo.nombre || '');
    setEditLema(miEquipo.lema || '');
    setEditDescripcion(miEquipo.descripcion || '');
    setEditRegion(miEquipo.region || miRegion);
    setEditCiudad(miEquipo.ciudad || '');
    setEditLogoUrl(miEquipo.logoUrl || '');
    setErrorEditarModal(null);
    setModalEditarEquipoVisible(true);
  };

  const handleSeleccionarLogoEditarGaleria = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        mostrarAvisoTactico('PERMISO DENEGADO', 'Se requiere acceso a tu galería de fotos.', 'advertencia', 'image-off');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setEditLogoUrl(uri);
      }
    } catch (error: any) {
      mostrarAvisoTactico('ERROR DE IMAGEN', 'No se pudo seleccionar la imagen: ' + error.message, 'peligro', 'alert-circle-outline');
    }
  };

  const handleGuardarEdicionEquipo = async () => {
    Keyboard.dismiss();
    if (!editNombre.trim()) {
      setErrorEditarModal('El nombre del equipo no puede estar vacío.');
      return;
    }
    setErrorEditarModal(null);
    setGuardandoEdicionEquipo(true);
    try {
      await modificarMiEquipoApi({
        nombre: editNombre.trim(),
        lema: editLema.trim() || undefined,
        descripcion: editDescripcion.trim() || undefined,
        region: editRegion,
        ciudad: editCiudad.trim() || undefined,
        logoUrl: editLogoUrl || undefined,
      });
      setModalEditarEquipoVisible(false);
      setErrorEditarModal(null);
      mostrarAvisoTactico('ÉXITO', 'Los datos del equipo han sido actualizados correctamente.', 'exito', 'check-decagram');
      await cargarDatos();
    } catch (error: any) {
      setErrorEditarModal(error.message || 'No se pudo actualizar el equipo.');
    } finally {
      setGuardandoEdicionEquipo(false);
    }
  };

  // Render Tarjeta de Equipo en la Lista
  const renderItemEquipo = ({ item }: { item: Equipo }) => {
    const esMiEquipo = miEquipo?.id === item.id;
    const miPostulacionItem = misPostulaciones.find(
      (p) => Number(p.equipoId) === Number(item.id) && p.estado === 'PENDIENTE',
    );

    return (
      <View style={[styles.equipoCard, esMiEquipo && styles.equipoCardPropio]}>
        <View style={styles.equipoCardHeader}>
          {item.logoUrl ? (
            <Image source={{ uri: item.logoUrl }} style={styles.equipoLogoThumb} />
          ) : (
            <View style={styles.equipoLogoPlaceholder}>
              <MaterialCommunityIcons name="shield-account" size={26} color={colors.primary} />
            </View>
          )}

          <View style={styles.equipoHeaderInfo}>
            <View style={styles.equipoTituloRow}>
              <Text style={styles.equipoNombre} numberOfLines={1}>
                {item.nombre}
              </Text>
              {esMiEquipo && (
                <View style={styles.badgeMiEquipoMini}>
                  <Text style={styles.txtMiEquipoMini}>TU EQUIPO</Text>
                </View>
              )}
            </View>

            {item.lema ? (
              <Text style={styles.equipoLema} numberOfLines={1}>
                "{item.lema}"
              </Text>
            ) : null}

            <View style={styles.equipoMetaRow}>
              <MaterialCommunityIcons name="map-marker" size={13} color={colors.textSecondary} />
              <Text style={styles.equipoMetaTexto} numberOfLines={1}>
                {item.ciudad ? `${item.ciudad}, ` : ''}
                {item.region || 'Chile'}
              </Text>
            </View>

            {/* Badge de Postulación Pendiente o Postulaciones Abiertas / Cerradas */}
            {miPostulacionItem ? (
              <View style={styles.badgePostulacionRow}>
                <View style={styles.badgePostulacionPendienteCardList}>
                  <MaterialCommunityIcons name="clock-outline" size={12} color={colors.warning} style={{ marginRight: 4 }} />
                  <Text style={styles.txtBadgePostulacionPendienteList}>POSTULACIÓN EN REVISIÓN</Text>
                </View>
              </View>
            ) : (
              <View style={styles.badgePostulacionesRow}>
                {item.postulacionesAbiertas ? (
                  <View style={[styles.badgePostulacionesAbiertas, { flexDirection: 'row', alignItems: 'center' }]}>
                    <MaterialCommunityIcons name="circle" size={8} color="#10B981" style={{ marginRight: 5 }} />
                    <Text style={styles.txtPostulacionesAbiertas}>POSTULACIONES ABIERTAS</Text>
                  </View>
                ) : (
                  <View style={[styles.badgePostulacionesCerradas, { flexDirection: 'row', alignItems: 'center' }]}>
                    <MaterialCommunityIcons name="lock" size={10} color={colors.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={styles.txtPostulacionesCerradas}>POSTULACIONES CERRADAS</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        {item.descripcion ? (
          <Text style={styles.equipoDescripcionCorta} numberOfLines={2}>
            {item.descripcion}
          </Text>
        ) : null}

        <View style={styles.equipoCardFooter}>
          <View style={styles.equipoConteoBox}>
            <MaterialCommunityIcons name="account-multiple" size={15} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.equipoConteoTexto, { fontVariant: ['tabular-nums'] }]}>
              {item.totalMiembros} {item.totalMiembros === 1 ? 'Operador' : 'Operadores'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.btnVerFicha}
            onPress={() => {
              setEquipoDetalle(item);
              setModalDetalleVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.txtBtnVerFicha}>VER FICHA</Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const esTlDeMiEquipo = miEquipo?.tlId === jugador?.id;
  const esFundadorDeMiEquipo = miEquipo?.fundadorId === jugador?.id;
  const esTLActivo = Boolean(esTlDeMiEquipo || (!miEquipo?.tlId && esFundadorDeMiEquipo));
  const tienePoderesGestion = esTlDeMiEquipo || esFundadorDeMiEquipo;

  return (
    <View style={styles.container}>
      {/* Cabecera Superior Táctica */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 16, 58) }]}>
        <View style={styles.headerTopRowConCampana}>
          <View style={styles.headerTitleRow}>
            <MaterialCommunityIcons name="shield-account" size={24} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.headerTitle}>EQUIPOS & ESCUADRONES</Text>
          </View>
          <TouchableOpacity
            style={styles.btnCampanaHeader}
            onPress={() => setModalNotificacionesVisible(true)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name={conteoNoLeidas > 0 ? 'bell-badge' : 'bell-outline'}
              size={22}
              color={conteoNoLeidas > 0 ? colors.primary : colors.textSecondary}
            />
            {conteoNoLeidas > 0 && (
              <View style={styles.badgeCampanaContador}>
                <Text style={styles.txtBadgeCampanaContador}>
                  {conteoNoLeidas > 9 ? '9+' : conteoNoLeidas}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>
          Revisa los equipos de tu región o del país, o gestiona las filas de tu propio escuadrón.
        </Text>
      </View>

      {/* Segmented Control (Pestañas) */}
      <View style={styles.segmentedContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, tabActual === 'EXPLORAR' && styles.segmentBtnActivo]}
          onPress={() => setTabActual('EXPLORAR')}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons
            name="compass-outline"
            size={16}
            color={tabActual === 'EXPLORAR' ? '#fff' : colors.textMuted}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.segmentTxt, tabActual === 'EXPLORAR' && styles.segmentTxtActivo]}>
            EXPLORAR EQUIPOS
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, tabActual === 'MI_EQUIPO' && styles.segmentBtnActivo]}
          onPress={() => setTabActual('MI_EQUIPO')}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons
            name="shield-star"
            size={16}
            color={tabActual === 'MI_EQUIPO' ? '#fff' : colors.textMuted}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.segmentTxt, tabActual === 'MI_EQUIPO' && styles.segmentTxtActivo]}>
            MI EQUIPO
          </Text>
          {miEquipo && (
            <MaterialCommunityIcons
              name="check-circle"
              size={12}
              color={tabActual === 'MI_EQUIPO' ? '#fff' : colors.success}
              style={{ marginLeft: 4 }}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* CONTENIDO SEGÚN PESTAÑA */}
      {tabActual === 'EXPLORAR' ? (
        <View style={{ flex: 1 }}>
          {/* Barra de Filtros de Región: Solo Mi Región y Otras Regiones */}
          <View style={styles.filtrosBarChips}>
            <View style={styles.filtrosRowChips}>
              {/* 1. Mi Región (Prioritaria por defecto) */}
              <TouchableOpacity
                style={[styles.filtroChipDos, modoFiltro === 'MI_REGION' && styles.filtroChipActivo]}
                onPress={seleccionarModoMiRegion}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name="crosshairs-gps"
                  size={14}
                  color={modoFiltro === 'MI_REGION' ? '#fff' : colors.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[styles.filtroChipTxt, modoFiltro === 'MI_REGION' && styles.filtroChipTxtActivo]}
                  numberOfLines={1}
                >
                  MI REGIÓN
                </Text>
              </TouchableOpacity>

              {/* 2. Otras Regiones */}
              <TouchableOpacity
                style={[
                  styles.filtroChipDos,
                  modoFiltro === 'PERSONALIZADA' && styles.filtroChipActivo,
                ]}
                onPress={() => setModalRegionVisible(true)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name="map-search-outline"
                  size={14}
                  color={modoFiltro === 'PERSONALIZADA' ? '#fff' : colors.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.filtroChipTxt,
                    modoFiltro === 'PERSONALIZADA' && styles.filtroChipTxtActivo,
                  ]}
                  numberOfLines={1}
                >
                  {modoFiltro === 'PERSONALIZADA'
                    ? regionFiltro.replace('Región ', '')
                    : 'OTRAS REGIONES'}
                </Text>
                <MaterialCommunityIcons
                  name="menu-down"
                  size={16}
                  color={modoFiltro === 'PERSONALIZADA' ? '#fff' : colors.textSecondary}
                  style={{ marginLeft: 2 }}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Banner si hay filtro personalizado activo o región actual */}
          {modoFiltro === 'PERSONALIZADA' ? (
            <View style={styles.filtroActivoBar}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 4 }}>
                <MaterialCommunityIcons name="map-marker" size={13} color={colors.primary} />
                <Text style={styles.filtroActivoTxt} numberOfLines={1}>
                  Región explorada: {regionFiltro}
                </Text>
              </View>
              <TouchableOpacity
                onPress={seleccionarModoMiRegion}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons name="undo-variant" size={13} color={colors.textSecondary} />
                <Text style={styles.limpiarFiltroTxt}>VOLVER A MI REGIÓN</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.filtroActivoBar}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 4 }}>
                <MaterialCommunityIcons name="crosshairs-gps" size={13} color={colors.primary} />
                <Text style={styles.filtroActivoTxt} numberOfLines={1}>
                  Escuadrones en tu zona: {miRegion}
                </Text>
              </View>
            </View>
          )}

          {/* Buscador de Equipos */}
          <View style={styles.buscadorBox}>
            <View style={styles.inputSearchBox}>
              <MaterialCommunityIcons name="magnify" size={18} color={colors.textMuted} style={{ marginRight: 6 }} />
              <TextInput
                style={styles.inputSearch}
                placeholder="Buscar por nombre, lema o ciudad..."
                placeholderTextColor={colors.textMuted}
                value={busqueda}
                onChangeText={setBusqueda}
                returnKeyType="search"
                onSubmitEditing={Keyboard.dismiss}
              />
              {busqueda.length > 0 && (
                <TouchableOpacity
                  onPress={() => setBusqueda('')}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Botones de acción rápida: Fundar y Código */}
          <View style={styles.accionesBar}>
            <TouchableOpacity
              style={styles.btnAccionMiniFundar}
              onPress={() => setModalCrearVisible(true)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="plus-circle" size={15} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.txtBtnAccionMiniFundar}>FUNDAR EQUIPO</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnAccionMiniCodigo}
              onPress={() => setModalCodigoVisible(true)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="key" size={14} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={styles.txtBtnAccionMiniCodigo}>INGRESAR CÓDIGO</Text>
            </TouchableOpacity>
          </View>

          {/* Banner de Postulaciones Enviadas por el Jugador (en estado PENDIENTE) */}
          {misPostulaciones.filter((p) => p.estado === 'PENDIENTE').length > 0 && (
            <View style={styles.bannerMisPostulacionesContainer}>
              <View style={styles.bannerMisPostulacionesHeader}>
                <MaterialCommunityIcons name="clock-alert-outline" size={16} color={colors.warning} style={{ marginRight: 6 }} />
                <Text style={styles.txtBannerMisPostulacionesTitulo}>
                  TUS POSTULACIONES ACTIVAS ({misPostulaciones.filter((p) => p.estado === 'PENDIENTE').length})
                </Text>
              </View>
              {misPostulaciones
                .filter((p) => p.estado === 'PENDIENTE')
                .map((post) => (
                  <View key={post.id} style={styles.itemMiPostulacionCard}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.txtMiPostulacionEquipoNombre}>
                        {post.equipoNombre ||
                          equipos.find((e) => Number(e.id) === Number(post.equipoId))?.nombre ||
                          `Equipo #${post.equipoId}`}
                      </Text>
                      <Text style={styles.txtMiPostulacionSub}>
                        Enviada • Esperando respuesta del Team Leader
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.btnCancelarMiPostulacionMini}
                      onPress={() => handleCancelarMiPostulacion(post.id)}
                      activeOpacity={0.8}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <MaterialCommunityIcons name="close-circle-outline" size={14} color={colors.danger} style={{ marginRight: 3 }} />
                      <Text style={styles.txtBtnCancelarMiPostulacionMini}>CANCELAR</Text>
                    </TouchableOpacity>
                  </View>
                ))}
            </View>
          )}

          {/* Lista de Equipos */}
          {cargando ? (
            <View style={styles.centroCargando}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.txtCargando}>Explorando equipos tácticos...</Text>
            </View>
          ) : (
            <FlatList
              data={equipos}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderItemEquipo}
              contentContainerStyle={styles.listContainer}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              refreshControl={
                <RefreshControl refreshing={refrescando} onRefresh={onRefresh} tintColor={colors.primary} />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons name="shield-outline" size={48} color={colors.textMuted} style={{ marginBottom: 10 }} />
                  <Text style={styles.emptyTitulo}>No se encontraron equipos</Text>
                  <Text style={styles.emptySubtitulo}>
                    {modoFiltro === 'MI_REGION'
                      ? `No hay equipos tácticos registrados aún en ${miRegion}. Puedes buscar en otras regiones de Chile o fundar el primero de tu zona.`
                      : `No hay equipos registrados en ${regionFiltro}. Prueba buscando en otra región o funda un nuevo equipo.`}
                  </Text>
                  {modoFiltro === 'MI_REGION' ? (
                    <TouchableOpacity
                      style={[styles.btnFundarPrimerEquipo, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.primary, marginBottom: 8 }]}
                      onPress={() => setModalRegionVisible(true)}
                      activeOpacity={0.85}
                    >
                      <MaterialCommunityIcons name="map-search-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                      <Text style={[styles.txtBtnFundarPrimerEquipo, { color: colors.primary }]}>BUSCAR EN OTRAS REGIONES</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.btnFundarPrimerEquipo, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.primary, marginBottom: 8 }]}
                      onPress={seleccionarModoMiRegion}
                      activeOpacity={0.85}
                    >
                      <MaterialCommunityIcons name="crosshairs-gps" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                      <Text style={[styles.txtBtnFundarPrimerEquipo, { color: colors.primary }]}>VOLVER A MI REGIÓN</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.btnFundarPrimerEquipo}
                    onPress={() => setModalCrearVisible(true)}
                  >
                    <MaterialCommunityIcons name="plus-circle" size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.txtBtnFundarPrimerEquipo}>FUNDAR PRIMER EQUIPO</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          )}
        </View>
      ) : (
        /* PESTAÑA MI EQUIPO */
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.miEquipoContainer}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl refreshing={refrescando} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {miEquipo ? (
            /* Ficha Completa del Equipo del Usuario */
            <View style={styles.fichaMiEquipoCard}>
              <View style={styles.miEquipoHeader}>
                {miEquipo.logoUrl ? (
                  <Image source={{ uri: miEquipo.logoUrl }} style={styles.miEquipoLogoGrande} />
                ) : (
                  <View style={styles.miEquipoLogoGrandePlaceholder}>
                    <MaterialCommunityIcons name="shield-star" size={48} color={colors.primary} />
                  </View>
                )}

                <Text style={styles.miEquipoNombreGrande}>{miEquipo.nombre}</Text>

                {miEquipo.lema ? (
                  <Text style={styles.miEquipoLemaGrande}>"{miEquipo.lema}"</Text>
                ) : null}

                <View style={styles.miEquipoUbicacionRow}>
                  <MaterialCommunityIcons name="map-marker" size={16} color={colors.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.miEquipoUbicacionTexto}>
                    {miEquipo.ciudad ? `${miEquipo.ciudad}, ` : ''}
                    {miEquipo.region || 'Chile'}
                  </Text>
                </View>

                {/* Badge de Cargo del Jugador en la Escuadra */}
                {esTlDeMiEquipo ? (
                  <View style={styles.badgeComandanteOficial}>
                    <MaterialCommunityIcons name="star-circle" size={14} color="#F59E0B" style={{ marginRight: 4 }} />
                    <Text style={styles.txtBadgeComandanteOficial}>ERES EL TEAM LEADER (TL) OFICIAL</Text>
                  </View>
                ) : esFundadorDeMiEquipo ? (
                  <View style={styles.badgeFundadorOficial}>
                    <MaterialCommunityIcons name="shield-crown" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.txtBadgeFundadorOficial}>ERES EL FUNDADOR HISTÓRICO</Text>
                  </View>
                ) : (
                  <View style={styles.badgeOperadorOficial}>
                    <MaterialCommunityIcons name="shield-account" size={14} color={colors.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={styles.txtBadgeOperadorOficial}>OPERADOR OFICIAL DE EQUIPO</Text>
                  </View>
                )}
              </View>

              {/* Panel Exclusivo de Mando del TL / Fundador */}
              {tienePoderesGestion && (
                <View style={styles.panelTlCard}>
                  <View style={styles.panelTlHeader}>
                    <MaterialCommunityIcons name="shield-crown" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.panelTlTitulo}>PANEL DE MANDO DEL TEAM LEADER (TL)</Text>
                  </View>
                  <Text style={styles.panelTlSub}>
                    Como TL tienes el rango más alto para la gestión y control de postulaciones del equipo.
                  </Text>

                  <View style={styles.tlControlPostulacionesRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.txtControlPostulacionesLabel}>ESTADO DE POSTULACIONES:</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <MaterialCommunityIcons
                          name={miEquipo.postulacionesAbiertas ? 'radiobox-marked' : 'lock'}
                          size={13}
                          color={miEquipo.postulacionesAbiertas ? colors.success : colors.danger}
                        />
                        <Text
                          style={[
                            styles.txtControlPostulacionesValor,
                            miEquipo.postulacionesAbiertas ? { color: colors.success } : { color: colors.danger },
                          ]}
                        >
                          {miEquipo.postulacionesAbiertas ? 'ABIERTAS' : 'CERRADAS'}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.btnTogglePostulaciones,
                        miEquipo.postulacionesAbiertas ? styles.btnCerrarPostulaciones : styles.btnAbrirPostulaciones,
                      ]}
                      onPress={handleTogglePostulaciones}
                      disabled={cambiandoPostulaciones}
                      activeOpacity={0.85}
                    >
                      {cambiandoPostulaciones ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <MaterialCommunityIcons
                            name={miEquipo.postulacionesAbiertas ? 'lock' : 'lock-open-variant'}
                            size={14}
                            color="#fff"
                            style={{ marginRight: 4 }}
                          />
                          <Text style={styles.txtBtnTogglePostulaciones}>
                            {miEquipo.postulacionesAbiertas ? 'CERRAR POSTULACIONES' : 'ABRIR POSTULACIONES'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Modificar Ficha/Datos del Equipo (TL / Fundador) */}
                  <TouchableOpacity
                    style={styles.btnModificarEquipoTl}
                    onPress={handleAbrirModalEditarEquipo}
                    activeOpacity={0.85}
                  >
                    <MaterialCommunityIcons name="circle-edit-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.txtBtnModificarEquipoTl}>EDITAR INFORMACIÓN DEL EQUIPO</Text>
                  </TouchableOpacity>

                  {/* SECCIÓN POSTULACIONES DE OPERADORES PENDIENTES */}
                  <View style={styles.tlPostulacionesContainer}>
                    <View style={styles.tlPostulacionesHeaderRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialCommunityIcons name="account-clock" size={18} color={colors.warning} style={{ marginRight: 6 }} />
                        <Text style={styles.tlPostulacionesTitulo}>POSTULACIONES PENDIENTES</Text>
                      </View>
                      <View style={[styles.badgeConteoPostulaciones, postulacionesPendientes.length > 0 && styles.badgeConteoPostulacionesActivo]}>
                        <Text style={styles.txtBadgeConteoPostulaciones}>{postulacionesPendientes.length}</Text>
                      </View>
                    </View>

                    {postulacionesPendientes.length === 0 ? (
                      <Text style={styles.txtSinPostulaciones}>
                        No hay postulaciones pendientes de operadores por el momento.
                      </Text>
                    ) : (
                      postulacionesPendientes.map((post) => (
                        <View key={post.id} style={styles.postulanteCard}>
                          <View style={styles.postulanteCardTop}>
                            {post.jugadorAvatarUrl ? (
                              <Image source={{ uri: post.jugadorAvatarUrl }} style={styles.postulanteAvatar} />
                            ) : (
                              <View style={styles.postulanteAvatarPlaceholder}>
                                <MaterialCommunityIcons name="account" size={20} color={colors.textMuted} />
                              </View>
                            )}
                            <View style={{ flex: 1, marginLeft: 10 }}>
                              <Text style={styles.postulanteAlias}>{post.jugadorAlias || 'Operador'}</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                <MaterialCommunityIcons name="map-marker" size={12} color={colors.textSecondary} style={{ marginRight: 2 }} />
                                <Text style={styles.postulanteUbicacion}>
                                  {post.jugadorCiudad || post.jugadorRegion || 'Ubicación no especificada'}
                                </Text>
                              </View>
                              {post.jugadorRango && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                  <MaterialCommunityIcons name="medal-outline" size={12} color={colors.primary} style={{ marginRight: 3 }} />
                                  <Text style={styles.postulanteRango}>{post.jugadorRango}</Text>
                                </View>
                              )}
                            </View>
                          </View>

                          {/* Contacto / WhatsApp proporcionado */}
                          {post.contacto && (
                            <View style={styles.postulanteContactoBox}>
                              <MaterialCommunityIcons name="whatsapp" size={16} color="#25D366" style={{ marginRight: 6 }} />
                              <Text style={styles.txtPostulanteContacto} numberOfLines={1}>
                                {post.contacto}
                              </Text>
                              <TouchableOpacity
                                style={styles.btnChatWhatsapp}
                                onPress={() => handleAbrirWhatsApp(post.contacto, post.jugadorAlias)}
                                activeOpacity={0.8}
                              >
                                <MaterialCommunityIcons name="chat" size={13} color="#fff" style={{ marginRight: 4 }} />
                                <Text style={styles.txtBtnChatWhatsapp}>WHATSAPP</Text>
                              </TouchableOpacity>
                            </View>
                          )}

                          {/* Mensaje / Presentación */}
                          {post.mensaje ? (
                            <View style={styles.postulanteMensajeBox}>
                              <Text style={styles.txtPostulanteMensajeLabel}>PRESENTACIÓN / MOTIVACIÓN:</Text>
                              <Text style={styles.txtPostulanteMensaje}>"{post.mensaje}"</Text>
                            </View>
                          ) : null}

                          {/* Botones Aceptar / Rechazar */}
                          <View style={styles.postulanteAccionesRow}>
                            <TouchableOpacity
                              style={[styles.btnRechazarPostulante, respondiendoPostulacionId === post.id && styles.botonDeshabilitado]}
                              onPress={() => handleResponderPostulacion(post.id, 'RECHAZAR', post.jugadorAlias)}
                              disabled={respondiendoPostulacionId === post.id}
                              activeOpacity={0.8}
                            >
                              <MaterialCommunityIcons name="close" size={14} color={colors.danger} style={{ marginRight: 4 }} />
                              <Text style={styles.txtBtnRechazarPostulante}>RECHAZAR</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.btnAceptarPostulante, respondiendoPostulacionId === post.id && styles.botonDeshabilitado]}
                              onPress={() => handleResponderPostulacion(post.id, 'ACEPTAR', post.jugadorAlias)}
                              disabled={respondiendoPostulacionId === post.id}
                              activeOpacity={0.8}
                            >
                              {respondiendoPostulacionId === post.id ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <>
                                  <MaterialCommunityIcons name="check-bold" size={14} color="#fff" style={{ marginRight: 4 }} />
                                  <Text style={styles.txtBtnAceptarPostulante}>ACEPTAR AL EQUIPO</Text>
                                </>
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                </View>
              )}

              {/* Código de Invitación / Reclutamiento */}
              {miEquipo.codigoAcceso && (
                <View style={styles.codigoReclutaBox}>
                  <Text style={styles.codigoReclutaLabel}>CÓDIGO DE RECLUTAMIENTO TÁCTICO:</Text>
                  <Text style={styles.codigoReclutaValor}>{miEquipo.codigoAcceso}</Text>
                  <Text style={styles.codigoReclutaAyuda}>
                    {miEquipo.postulacionesAbiertas
                      ? 'Comparte este código con nuevos camaradas para sumarse directamente.'
                      : 'Las postulaciones públicas están cerradas; este código permite ingresar a invitados directos del TL.'}
                  </Text>
                  <TouchableOpacity
                    style={styles.btnCompartirCodigo}
                    onPress={handleCompartirCodigoEquipo}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="share-variant" size={15} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.txtBtnCompartirCodigo}>COMPARTIR CÓDIGO CON CAMARADAS</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Reseña / Historia */}
              {miEquipo.descripcion ? (
                <View style={styles.miEquipoSeccion}>
                  <Text style={styles.miEquipoSeccionTitulo}>RESEÑA & HISTORIA DEL EQUIPO</Text>
                  <Text style={styles.miEquipoDescripcionTexto}>{miEquipo.descripcion}</Text>
                </View>
              ) : null}

              {/* Roster de Operadores */}
              <View style={styles.miEquipoSeccion}>
                <View style={styles.seccionHeaderRow}>
                  <Text style={styles.miEquipoSeccionTitulo}>
                    ROSTER DE OPERADORES ({miEquipo.miembros?.length || 0})
                  </Text>
                  <Text style={styles.subConteoMiembros}>Filas oficiales</Text>
                </View>

                <View style={styles.rosterList}>
                  {miEquipo.miembros?.map((m) => (
                    <View key={m.id} style={styles.operadorRow}>
                      {m.avatarUrl ? (
                        <Image source={{ uri: m.avatarUrl }} style={styles.operadorAvatar} />
                      ) : (
                        <View style={styles.operadorAvatarPlaceholder}>
                          <MaterialCommunityIcons name="account" size={18} color={colors.textSecondary} />
                        </View>
                      )}

                      <View style={styles.operadorInfo}>
                        <View style={styles.operadorNombreRow}>
                          <Text style={styles.operadorAlias}>{m.alias}</Text>
                          {m.id === jugador?.id && (
                            <View style={styles.badgeTuMini}>
                              <Text style={styles.txtTuMini}>TÚ</Text>
                            </View>
                          )}
                          {m.esTL ? (
                            <View style={styles.badgeTlMini}>
                              <MaterialCommunityIcons name="star" size={10} color="#F59E0B" style={{ marginRight: 2 }} />
                              <Text style={styles.txtTlMini}>TL</Text>
                            </View>
                          ) : m.esFundador ? (
                            <View style={styles.badgeFundadorMini}>
                              <Text style={styles.txtFundadorMini}>FUNDADOR</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.operadorSub}>
                          {m.rango || 'Pichón'} • Rol: [{m.roles || 'ASALTO'}]
                        </Text>
                      </View>

                      {/* Botón para que el TL / Fundador transfiera el mando de TL */}
                      {tienePoderesGestion && !m.esTL && (
                        <TouchableOpacity
                          style={styles.btnDesignarTlMini}
                          onPress={() => handleNombrarTl(m)}
                          activeOpacity={0.8}
                        >
                          <MaterialCommunityIcons name="star-outline" size={11} color="#F59E0B" style={{ marginRight: 2 }} />
                          <Text style={styles.txtDesignarTlMini}>NOMBRAR TL</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              </View>

              {/* Para el TL no existe la opción de abandonar, solo la de desintegrar el equipo */}
              {esTLActivo ? (
                <View style={styles.contenedorAccionSalida}>
                  <TouchableOpacity
                    style={styles.btnDesintegrarEquipo}
                    onPress={handleDesintegrarEquipo}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="bomb" size={18} color="#EF4444" style={{ marginRight: 6 }} />
                    <Text style={styles.txtBtnDesintegrarEquipo}>DESINTEGRAR EQUIPO</Text>
                  </TouchableOpacity>
                  {(miEquipo.totalMiembros || 0) > 1 && (
                    <Text style={styles.ayudaDesintegrarTl}>
                      Como Team Leader (TL), no puedes abandonar el equipo directamente. Si deseas dejarlo sin disolverlo, primero transfiere el mando a otro operador con el botón "NOMBRAR TL".
                    </Text>
                  )}
                </View>
              ) : (
                /* Botón Salir del Equipo para miembros regulares */
                <TouchableOpacity
                  style={styles.btnSalirEquipo}
                  onPress={handleSalirEquipo}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="logout-variant" size={16} color={colors.danger} style={{ marginRight: 6 }} />
                  <Text style={styles.txtBtnSalirEquipo}>DESVINCULARME DE ESTE EQUIPO</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            /* Estado Vacío: Lobo Solitario */
            <View style={styles.sinEquipoContainer}>
              <View style={styles.sinEquipoIconoBox}>
                <MaterialCommunityIcons name="shield-off-outline" size={54} color={colors.secondary} />
              </View>
              <Text style={styles.sinEquipoTituloPrincipal}>LOBO SOLITARIO (OPERADOR LIBRE)</Text>
              <Text style={styles.sinEquipoSubtituloPrincipal}>
                Actualmente no perteneces a ningún equipo oficial. Puedes alistarte a un equipo existente de tu región, ingresar un código de invitación o fundar tu propio equipo militar.
              </Text>

              <View style={styles.sinEquipoBotones}>
                <TouchableOpacity
                  style={styles.btnFundarDesdeMiEquipo}
                  onPress={() => setModalCrearVisible(true)}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons name="shield-plus" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.txtBtnFundarDesdeMiEquipo}>FUNDAR NUEVO EQUIPO</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnIngresarCodigoDesdeMiEquipo}
                  onPress={() => {
                    setErrorCodigoModal(null);
                    setModalCodigoVisible(true);
                  }}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons name="key-variant" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.txtBtnIngresarCodigoDesdeMiEquipo}>INGRESAR CÓDIGO DE INVITACIÓN</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnExplorarDesdeMiEquipo}
                  onPress={() => setTabActual('EXPLORAR')}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons name="compass" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                  <Text style={styles.txtBtnExplorarDesdeMiEquipo}>EXPLORAR EQUIPOS DE CHILE</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* MODAL DETALLE DE EQUIPO (MODULARIZADO) */}
      <ModalFichaEquipo
        visible={modalDetalleVisible}
        equipo={equipoDetalle}
        miEquipoId={miEquipo?.id}
        misPostulaciones={misPostulaciones}
        onCerrar={() => setModalDetalleVisible(false)}
        onAbrirPostulacion={handleAbrirModalPostulacion}
        onCancelarPostulacion={handleCancelarMiPostulacion}
      />

      {/* MODAL CREAR EQUIPO */}
      <Modal
        visible={modalCrearVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          setModalCrearVisible(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={Keyboard.dismiss}
            accessible={false}
          />
          <View style={styles.modalCrearCard}>
            <Pressable
              style={styles.modalHeaderRow}
              onPress={Keyboard.dismiss}
              accessible={false}
            >
              <MaterialCommunityIcons name="shield-plus" size={24} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.modalTituloPrincipal}>FUNDAR NUEVO EQUIPO</Text>
                <Text style={styles.modalSubtituloPrincipal}>
                  Serás registrado como Fundador y Team Leader (TL) oficial inicial del equipo.
                </Text>
              </View>
            </Pressable>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 450 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              <Pressable onPress={Keyboard.dismiss} accessible={false}>
                <Text style={styles.inputLabel}>NOMBRE DEL EQUIPO *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="ej: Black Panthers Airsoft"
                  placeholderTextColor={colors.textMuted}
                  value={crearNombre}
                  onChangeText={setCrearNombre}
                  returnKeyType="done"
                />

                <Text style={styles.inputLabel}>LEMA O SLOGAN TÁCTICO (OPCIONAL)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="ej: Honor, Disciplina y Precisión"
                  placeholderTextColor={colors.textMuted}
                  value={crearLema}
                  onChangeText={setCrearLema}
                  returnKeyType="done"
                />

                <Text style={styles.inputLabel}>REGIÓN DE OPERACIONES</Text>
                <TouchableOpacity
                  style={styles.selectorRegionInput}
                  onPress={() => {
                    Keyboard.dismiss();
                    setModalRegionCrearVisible(true);
                  }}
                >
                  <Text style={styles.selectorRegionInputTxt}>{crearRegion}</Text>
                  <MaterialCommunityIcons name="menu-down" size={20} color={colors.primary} />
                </TouchableOpacity>

                <Text style={styles.inputLabel}>CIUDAD O COMUNA BASE</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="ej: Santiago, Viña del Mar, Concepción..."
                  placeholderTextColor={colors.textMuted}
                  value={crearCiudad}
                  onChangeText={setCrearCiudad}
                  returnKeyType="done"
                />

                <Text style={styles.inputLabel}>LOGOTIPO / INSIGNIA DEL EQUIPO</Text>
                <View style={styles.logoPickerRow}>
                  {crearLogoUrl ? (
                    <Image source={{ uri: crearLogoUrl }} style={styles.logoPreview} />
                  ) : (
                    <View style={styles.logoPreviewPlaceholder}>
                      <MaterialCommunityIcons name="shield-outline" size={28} color={colors.textMuted} />
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.btnElegirLogo}
                    onPress={handleSeleccionarLogoGaleria}
                  >
                    <MaterialCommunityIcons name="camera" size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.txtBtnElegirLogo}>
                      {crearLogoUrl ? 'CAMBIAR LOGO' : 'SUBIR DESDE MI TELÉFONO'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>RESEÑA HISTÓRICA / REGLAS (OPCIONAL)</Text>
                <TextInput
                  style={[styles.textInput, { minHeight: 75, textAlignVertical: 'top' }]}
                  placeholder="Describe la visión de combate, requisitos de ingreso..."
                  placeholderTextColor={colors.textMuted}
                  value={crearDescripcion}
                  onChangeText={(t) => {
                    if (errorCrearModal) setErrorCrearModal(null);
                    setCrearDescripcion(t);
                  }}
                  multiline
                  returnKeyType="done"
                  submitBehavior="blurAndSubmit"
                  onSubmitEditing={Keyboard.dismiss}
                />
              </Pressable>
            </ScrollView>

            {errorCrearModal ? (
              <View style={styles.bannerErrorCodigoModal}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.danger} />
                <Text style={styles.txtErrorCodigoModal}>{errorCrearModal}</Text>
              </View>
            ) : null}

            <View style={styles.modalBotonesRow}>
              <TouchableOpacity
                style={styles.btnCancelarModal}
                onPress={() => {
                  Keyboard.dismiss();
                  setErrorCrearModal(null);
                  setModalCrearVisible(false);
                }}
              >
                <Text style={styles.txtBtnCancelarModal}>CANCELAR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnConfirmarCrear, guardandoEquipo && styles.botonDeshabilitado]}
                onPress={handleCrearEquipo}
                disabled={guardandoEquipo}
              >
                {guardandoEquipo ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="shield-check" size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.txtBtnConfirmarCrear}>FUNDAR EQUIPO</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL INGRESAR CÓDIGO DE INVITACIÓN */}
      <Modal
        visible={modalCodigoVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          Keyboard.dismiss();
          setModalCodigoVisible(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={Keyboard.dismiss}
            accessible={false}
          />
          <View style={styles.modalCodigoCard}>
            <Pressable
              style={styles.modalHeaderRow}
              onPress={Keyboard.dismiss}
              accessible={false}
            >
              <MaterialCommunityIcons name="key" size={24} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.modalTituloPrincipal}>CÓDIGO DE INVITACIÓN</Text>
                <Text style={styles.modalSubtituloPrincipal}>
                  Ingresa el código táctico de 6 caracteres proporcionado por el Team Leader (TL):
                </Text>
              </View>
            </Pressable>

            <TextInput
              style={styles.inputCodigoGrande}
              placeholder="ej: FDEL01"
              placeholderTextColor={colors.textMuted}
              value={codigoIngresado}
              onChangeText={(t) => {
                if (errorCodigoModal) setErrorCodigoModal(null);
                setCodigoIngresado(t.toUpperCase());
              }}
              maxLength={10}
              autoCapitalize="characters"
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
            />

            {errorCodigoModal ? (
              <View style={styles.bannerErrorCodigoModal}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.danger} />
                <Text style={styles.txtErrorCodigoModal}>{errorCodigoModal}</Text>
              </View>
            ) : null}

            <View style={styles.modalBotonesRow}>
              <TouchableOpacity
                style={styles.btnCancelarModal}
                onPress={() => {
                  Keyboard.dismiss();
                  setErrorCodigoModal(null);
                  setModalCodigoVisible(false);
                }}
              >
                <Text style={styles.txtBtnCancelarModal}>CANCELAR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnConfirmarCodigo, procesandoCodigo && styles.botonDeshabilitado]}
                onPress={handleUnirsePorCodigo}
                disabled={procesandoCodigo}
              >
                {procesandoCodigo ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="login" size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.txtBtnConfirmarCodigo}>UNIRME</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL SELECTOR DE REGIÓN (FILTRO) */}
      <Modal
        visible={modalRegionVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalRegionVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalRegionContent}>
            <Text style={styles.modalRegionTitulo}>SELECCIONA OTRA REGIÓN</Text>
            <ScrollView style={{ maxHeight: 350 }}>
              {/* Opción Mi Región */}
              <TouchableOpacity
                style={[styles.itemRegion, modoFiltro === 'MI_REGION' && styles.itemRegionActivo]}
                onPress={() => {
                  seleccionarModoMiRegion();
                  setModalRegionVisible(false);
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialCommunityIcons
                    name="crosshairs-gps"
                    size={14}
                    color={modoFiltro === 'MI_REGION' ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[styles.txtRegion, modoFiltro === 'MI_REGION' && styles.txtRegionActivo]}>
                    Mi Región ({miRegion})
                  </Text>
                </View>
                {modoFiltro === 'MI_REGION' && (
                  <MaterialCommunityIcons
                    name="check"
                    size={16}
                    color={colors.primary}
                  />
                )}
              </TouchableOpacity>

              {REGIONES_CHILE.map((reg) => {
                const activo = modoFiltro === 'PERSONALIZADA' && regionFiltro === reg;
                return (
                  <TouchableOpacity
                    key={reg}
                    style={[styles.itemRegion, activo && styles.itemRegionActivo]}
                    onPress={() => seleccionarRegionEspecifica(reg)}
                  >
                    <Text style={[styles.txtRegion, activo && styles.txtRegionActivo]}>{reg}</Text>
                    {activo && (
                      <MaterialCommunityIcons
                        name="check"
                        size={16}
                        color={colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={styles.btnCerrarModalRegion}
              onPress={() => setModalRegionVisible(false)}
            >
              <Text style={styles.txtCerrarModalRegion}>CERRAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL SELECTOR DE REGIÓN (CREAR EQUIPO) */}
      <Modal
        visible={modalRegionCrearVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalRegionCrearVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalRegionContent}>
            <Text style={styles.modalRegionTitulo}>REGIÓN BASE DE TU EQUIPO</Text>
            <ScrollView style={{ maxHeight: 350 }}>
              {REGIONES_CHILE.map((reg) => {
                const activo = crearRegion === reg;
                return (
                  <TouchableOpacity
                    key={reg}
                    style={[styles.itemRegion, activo && styles.itemRegionActivo]}
                    onPress={() => {
                      setCrearRegion(reg);
                      setModalRegionCrearVisible(false);
                    }}
                  >
                    <Text style={[styles.txtRegion, activo && styles.txtRegionActivo]}>{reg}</Text>
                    {activo && (
                      <MaterialCommunityIcons
                        name="check"
                        size={16}
                        color={colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={styles.btnCerrarModalRegion}
              onPress={() => setModalRegionCrearVisible(false)}
            >
              <Text style={styles.txtCerrarModalRegion}>CERRAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL MODIFICAR EQUIPO (TL / FUNDADOR) */}
      <Modal
        visible={modalEditarEquipoVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          setModalEditarEquipoVisible(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={Keyboard.dismiss}
            accessible={false}
          />
          <View style={styles.modalCrearCard}>
            <Pressable
              style={styles.modalHeaderRow}
              onPress={Keyboard.dismiss}
              accessible={false}
            >
              <MaterialCommunityIcons name="shield-edit" size={24} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.modalTituloPrincipal}>MODIFICAR DATOS DEL EQUIPO</Text>
                <Text style={styles.modalSubtituloPrincipal}>
                  Actualiza el nombre, lema, ubicación, insignia o reseña de tu escuadrón.
                </Text>
              </View>
            </Pressable>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 450 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              <Pressable onPress={Keyboard.dismiss} accessible={false}>
                <Text style={styles.inputLabel}>NOMBRE DEL EQUIPO *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="ej: Black Panthers Airsoft"
                  placeholderTextColor={colors.textMuted}
                  value={editNombre}
                  onChangeText={setEditNombre}
                  returnKeyType="done"
                />

                <Text style={styles.inputLabel}>LEMA O SLOGAN TÁCTICO (OPCIONAL)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="ej: Honor, Disciplina y Precisión"
                  placeholderTextColor={colors.textMuted}
                  value={editLema}
                  onChangeText={setEditLema}
                  returnKeyType="done"
                />

                <Text style={styles.inputLabel}>REGIÓN DE OPERACIONES</Text>
                <TouchableOpacity
                  style={styles.selectorRegionInput}
                  onPress={() => {
                    Keyboard.dismiss();
                    setModalRegionEditarVisible(true);
                  }}
                >
                  <Text style={styles.selectorRegionInputTxt}>{editRegion}</Text>
                  <MaterialCommunityIcons name="menu-down" size={20} color={colors.primary} />
                </TouchableOpacity>

                <Text style={styles.inputLabel}>CIUDAD O COMUNA BASE</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="ej: Santiago, Viña del Mar, Concepción..."
                  placeholderTextColor={colors.textMuted}
                  value={editCiudad}
                  onChangeText={setEditCiudad}
                  returnKeyType="done"
                />

                <Text style={styles.inputLabel}>LOGOTIPO / INSIGNIA DEL EQUIPO</Text>
                <View style={styles.logoPickerRow}>
                  {editLogoUrl ? (
                    <Image source={{ uri: editLogoUrl }} style={styles.logoPreview} />
                  ) : (
                    <View style={styles.logoPreviewPlaceholder}>
                      <MaterialCommunityIcons name="shield-outline" size={28} color={colors.textMuted} />
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.btnElegirLogo}
                    onPress={handleSeleccionarLogoEditarGaleria}
                  >
                    <MaterialCommunityIcons name="camera" size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.txtBtnElegirLogo}>
                      {editLogoUrl ? 'CAMBIAR LOGO' : 'SUBIR DESDE MI TELÉFONO'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>RESEÑA HISTÓRICA / REGLAS (OPCIONAL)</Text>
                <TextInput
                  style={[styles.textInput, { minHeight: 75, textAlignVertical: 'top' }]}
                  placeholder="Describe la visión de combate, requisitos de ingreso..."
                  placeholderTextColor={colors.textMuted}
                  value={editDescripcion}
                  onChangeText={(t) => {
                    if (errorEditarModal) setErrorEditarModal(null);
                    setEditDescripcion(t);
                  }}
                  multiline
                  returnKeyType="done"
                  submitBehavior="blurAndSubmit"
                  onSubmitEditing={Keyboard.dismiss}
                />
              </Pressable>
            </ScrollView>

            {errorEditarModal ? (
              <View style={styles.bannerErrorCodigoModal}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.danger} />
                <Text style={styles.txtErrorCodigoModal}>{errorEditarModal}</Text>
              </View>
            ) : null}

            <View style={styles.modalBotonesRow}>
              <TouchableOpacity
                style={styles.btnCancelarModal}
                onPress={() => {
                  Keyboard.dismiss();
                  setErrorEditarModal(null);
                  setModalEditarEquipoVisible(false);
                }}
              >
                <Text style={styles.txtBtnCancelarModal}>CANCELAR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnConfirmarCrear, guardandoEdicionEquipo && styles.botonDeshabilitado]}
                onPress={handleGuardarEdicionEquipo}
                disabled={guardandoEdicionEquipo}
              >
                {guardandoEdicionEquipo ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="check-bold" size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.txtBtnConfirmarCrear}>GUARDAR CAMBIOS</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL SELECTOR DE REGIÓN (MODIFICAR EQUIPO) */}
      <Modal
        visible={modalRegionEditarVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalRegionEditarVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalRegionContent}>
            <Text style={styles.modalRegionTitulo}>REGIÓN BASE DE TU EQUIPO</Text>
            <ScrollView style={{ maxHeight: 350 }}>
              {REGIONES_CHILE.map((reg) => {
                const activo = editRegion === reg;
                return (
                  <TouchableOpacity
                    key={reg}
                    style={[styles.itemRegion, activo && styles.itemRegionActivo]}
                    onPress={() => {
                      setEditRegion(reg);
                      setModalRegionEditarVisible(false);
                    }}
                  >
                    <Text style={[styles.txtRegion, activo && styles.txtRegionActivo]}>{reg}</Text>
                    {activo && (
                      <MaterialCommunityIcons
                        name="check"
                        size={16}
                        color={colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={styles.btnCerrarModalRegion}
              onPress={() => setModalRegionEditarVisible(false)}
            >
              <Text style={styles.txtCerrarModalRegion}>CERRAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL ENVIAR POSTULACIÓN AL EQUIPO */}
      <Modal
        visible={modalPostularVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          setModalPostularVisible(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={Keyboard.dismiss}
            accessible={false}
          />
          <View style={styles.modalCrearCard}>
            <Pressable
              style={styles.modalHeaderRow}
              onPress={Keyboard.dismiss}
              accessible={false}
            >
              <MaterialCommunityIcons name="shield-account" size={24} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.modalTituloPrincipal}>POSTULAR AL EQUIPO</Text>
                <Text style={styles.modalSubtituloPrincipal}>
                  {equipoParaPostular ? equipoParaPostular.nombre : 'Equipo'}
                </Text>
              </View>
            </Pressable>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 420 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              <Pressable onPress={Keyboard.dismiss} accessible={false}>
                <View style={styles.infoPostulacionBanner}>
                  <MaterialCommunityIcons name="information-outline" size={18} color={colors.primary} style={{ marginRight: 8, marginTop: 2 }} />
                  <Text style={styles.txtInfoPostulacionBanner}>
                    El Team Leader (TL) revisará tus antecedentes y se pondrá en contacto contigo por WhatsApp para coordinar tu incorporación o prueba de juego.
                  </Text>
                </View>

                <Text style={styles.inputLabel}>TU WHATSAPP O TELÉFONO DE CONTACTO *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="ej: +56 9 1234 5678"
                  placeholderTextColor={colors.textMuted}
                  value={postulacionContacto}
                  onChangeText={setPostulacionContacto}
                  keyboardType="phone-pad"
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />

                <Text style={styles.inputLabel}>MENSAJE / PRESENTACIÓN TÁCTICA (OPCIONAL)</Text>
                <TextInput
                  style={[styles.textInput, { minHeight: 90, textAlignVertical: 'top' }]}
                  placeholder="Cuéntale al TL sobre tu experiencia en airsoft, réplicas, rol favorito, disponibilidad de fin de semana..."
                  placeholderTextColor={colors.textMuted}
                  value={postulacionMensaje}
                  onChangeText={setPostulacionMensaje}
                  multiline
                  returnKeyType="done"
                  submitBehavior="blurAndSubmit"
                  onSubmitEditing={Keyboard.dismiss}
                />
              </Pressable>
            </ScrollView>

            {errorPostularModal ? (
              <View style={styles.bannerErrorCodigoModal}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.danger} />
                <Text style={styles.txtErrorCodigoModal}>{errorPostularModal}</Text>
              </View>
            ) : null}

            <View style={styles.modalBotonesRow}>
              <TouchableOpacity
                style={styles.btnCancelarModal}
                onPress={() => {
                  Keyboard.dismiss();
                  setErrorPostularModal(null);
                  setModalPostularVisible(false);
                }}
              >
                <Text style={styles.txtBtnCancelarModal}>CANCELAR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnConfirmarCrear, enviandoPostulacion && styles.botonDeshabilitado]}
                onPress={handleEnviarPostulacion}
                disabled={enviandoPostulacion}
              >
                {enviandoPostulacion ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="send" size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.txtBtnConfirmarCrear}>ENVIAR POSTULACIÓN</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {/* MODAL RECHAZAR POSTULACIÓN CON MOTIVO */}
      <Modal
        visible={modalRechazoVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          Keyboard.dismiss();
          setModalRechazoVisible(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlayFondo}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={Keyboard.dismiss}
            accessible={false}
          />
          <View style={styles.modalCardRechazo}>
            <Pressable
              style={styles.modalHeaderRowRechazo}
              onPress={Keyboard.dismiss}
              accessible={false}
            >
              <MaterialCommunityIcons name="close-octagon" size={24} color={colors.danger} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.modalTituloRechazo}>DECLINAR POSTULACIÓN</Text>
                <Text style={styles.modalSubtituloRechazo}>
                  Indica el motivo para notificar a {postulacionRechazo?.alias ? `"${postulacionRechazo.alias}"` : 'este operador'}:
                </Text>
              </View>
            </Pressable>

            {/* Chips Rápidos de Motivo */}
            <Text style={styles.labelMotivosRapidos}>MOTIVOS COMUNES (TOCA PARA AUTOCOMPLETAR):</Text>
            <View style={styles.chipsMotivosContainer}>
              {[
                'Escuadra completa (sin cupos)',
                'Rango o experiencia insuficiente',
                'Incompatibilidad de horarios',
                'Ubicación / Fuera de zona',
              ].map((chip) => (
                <TouchableOpacity
                  key={chip}
                  style={[
                    styles.chipMotivo,
                    motivoRechazoTexto === chip && styles.chipMotivoActivo,
                  ]}
                  onPress={() => {
                    Keyboard.dismiss();
                    setMotivoRechazoTexto(chip);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.txtChipMotivo,
                      motivoRechazoTexto === chip && styles.txtChipMotivoActivo,
                    ]}
                  >
                    {chip}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.labelMotivosRapidos}>DETALLE O MENSAJE PERSONALIZADO:</Text>
            <TextInput
              style={styles.inputMotivoRechazo}
              placeholder="Explica el motivo del rechazo para que el postulante pueda estar al tanto..."
              placeholderTextColor={colors.textMuted}
              value={motivoRechazoTexto}
              onChangeText={setMotivoRechazoTexto}
              multiline
              numberOfLines={3}
              returnKeyType="done"
              submitBehavior="blurAndSubmit"
              onSubmitEditing={Keyboard.dismiss}
            />

            <View style={styles.avisoNotifRechazo}>
              <MaterialCommunityIcons name="information-outline" size={14} color={colors.textSecondary} style={{ marginRight: 4 }} />
              <Text style={styles.txtAvisoNotifRechazo}>
                El operador recibirá este motivo en su campana de notificaciones.
              </Text>
            </View>

            <View style={styles.modalBotonesRow}>
              <TouchableOpacity
                style={styles.btnCancelarModal}
                onPress={() => {
                  Keyboard.dismiss();
                  setModalRechazoVisible(false);
                }}
                disabled={enviandoRechazo}
              >
                <Text style={styles.txtBtnCancelarModal}>CANCELAR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnConfirmarRechazoModal, enviandoRechazo && styles.botonDeshabilitado]}
                onPress={handleConfirmarRechazo}
                disabled={enviandoRechazo}
              >
                {enviandoRechazo ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="close-circle-outline" size={16} color="#fff" style={{ marginRight: 4 }} />
                    <Text style={styles.txtBtnConfirmarRechazoModal}>DECLINAR SOLICITUD</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Táctico de Notificaciones */}
      <ModalNotificaciones
        visible={modalNotificacionesVisible}
        onClose={() => setModalNotificacionesVisible(false)}
        onActualizarConteo={setConteoNoLeidas}
      />

      {/* Modal Táctico para Desintegrar Equipo */}
      <ModalConfirmacionTactico
        visible={modalDesintegrarVisible}
        titulo="¿DESINTEGRAR EQUIPO?"
        mensaje={
          miEquipo
            ? (miEquipo.totalMiembros || 0) <= 1
              ? `Eres el único operador y Team Leader de "${miEquipo.nombre}". Al desintegrar el equipo, se eliminará definitivamente del sistema y del radar táctico.`
              : `Eres el Team Leader de "${miEquipo.nombre}". ¡Esta acción es definitiva! Disolverás el equipo por completo, desvinculando a los ${miEquipo.totalMiembros} operadores y eliminando su registro de forma permanente.`
            : ''
        }
        textoConfirmar="SÍ, DESINTEGRAR"
        textoCancelar="CANCELAR"
        tipo="peligro"
        icono="bomb"
        cargando={desintegrandoEquipo}
        onConfirmar={handleConfirmarDesintegracion}
        onCancelar={() => setModalDesintegrarVisible(false)}
      />

      {/* Modal Táctico Unificado de Confirmaciones y Avisos */}
      <ModalConfirmacionTactico
        visible={modalTactico.visible}
        titulo={modalTactico.titulo}
        mensaje={modalTactico.mensaje}
        textoConfirmar={modalTactico.textoConfirmar}
        textoCancelar={modalTactico.textoCancelar}
        tipo={modalTactico.tipo}
        icono={modalTactico.icono}
        soloAceptar={modalTactico.soloAceptar}
        cargando={modalTactico.cargando}
        onConfirmar={modalTactico.onConfirmar || (() => setModalTactico((prev) => ({ ...prev, visible: false })))}
        onCancelar={modalTactico.onCancelar || (() => setModalTactico((prev) => ({ ...prev, visible: false })))}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  headerTopRowConCampana: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  btnCampanaHeader: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeCampanaContador: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: colors.primary,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  txtBadgeCampanaContador: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 10,
    marginHorizontal: 16,
    marginVertical: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  segmentBtnActivo: {
    backgroundColor: colors.primary,
  },
  segmentTxt: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  segmentTxtActivo: {
    color: '#fff',
  },
  filtrosBarChips: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  filtrosRowChips: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
  },
  filtroChipDos: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtrosScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filtroChip: {
    backgroundColor: colors.inputBg,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filtroChipActivo: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(224, 109, 40, 0.15)',
  },
  filtroChipTxt: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  filtroChipTxtActivo: {
    color: colors.primary,
  },
  filtroActivoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(224, 109, 40, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  filtroActivoTxt: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  limpiarFiltroTxt: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: '900',
  },
  buscadorBox: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  filtrosBar: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  selectorRegionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  txtRegionSeleccionada: {
    flex: 1,
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  inputSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  inputSearch: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    paddingVertical: 8,
  },
  accionesBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 8,
  },
  btnAccionMiniFundar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
  },
  txtBtnAccionMiniFundar: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  btnAccionMiniCodigo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(224, 109, 40, 0.12)',
    borderRadius: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  txtBtnAccionMiniCodigo: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  equipoCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  equipoCardPropio: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(224, 109, 40, 0.05)',
  },
  equipoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  equipoLogoThumb: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  equipoLogoPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  equipoHeaderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  equipoTituloRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  equipoNombre: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
    flex: 1,
  },
  badgeMiEquipoMini: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  txtMiEquipoMini: {
    color: colors.success,
    fontSize: 9,
    fontWeight: '900',
  },
  equipoLema: {
    color: colors.primary,
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },
  equipoMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  equipoMetaTexto: {
    color: colors.textSecondary,
    fontSize: 11,
    marginLeft: 3,
  },
  badgePostulacionesRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  badgePostulacionRow: {
    marginTop: 6,
  },
  badgePostulacionPendienteCardList: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  txtBadgePostulacionPendienteList: {
    color: colors.warning,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  bannerMisPostulacionesContainer: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
  },
  bannerMisPostulacionesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  txtBannerMisPostulacionesTitulo: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  itemMiPostulacionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
  },
  txtMiPostulacionEquipoNombre: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  txtMiPostulacionSub: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  btnCancelarMiPostulacionMini: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minHeight: 28,
  },
  txtBtnCancelarMiPostulacionMini: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: '800',
  },
  badgePostulacionesAbiertas: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  txtPostulacionesAbiertas: {
    color: colors.success,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  badgePostulacionesCerradas: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  txtPostulacionesCerradas: {
    color: colors.danger,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  equipoDescripcionCorta: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 8,
  },
  equipoCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    marginTop: 10,
    paddingTop: 10,
  },
  equipoConteoBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  equipoConteoTexto: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  btnVerFicha: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  txtBtnVerFicha: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  centroCargando: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  txtCargando: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitulo: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptySubtitulo: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 16,
  },
  btnFundarPrimerEquipo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  txtBtnFundarPrimerEquipo: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  // Mi Equipo
  miEquipoContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  fichaMiEquipoCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  miEquipoHeader: {
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingBottom: 16,
  },
  miEquipoLogoGrande: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: colors.primary,
    marginBottom: 10,
  },
  miEquipoLogoGrandePlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    marginBottom: 10,
  },
  miEquipoNombreGrande: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  miEquipoLemaGrande: {
    color: colors.primary,
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },
  miEquipoUbicacionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  miEquipoUbicacionTexto: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  badgeComandanteOficial: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 10,
  },
  txtBadgeComandanteOficial: {
    color: colors.warning,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  badgeFundadorOficial: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(224, 109, 40, 0.15)',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 10,
  },
  txtBadgeFundadorOficial: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  badgeOperadorOficial: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 10,
  },
  txtBadgeOperadorOficial: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  panelTlCard: {
    backgroundColor: 'rgba(224, 109, 40, 0.08)',
    borderRadius: 10,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  panelTlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  panelTlTitulo: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  panelTlSub: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 10,
  },
  tlControlPostulacionesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 10,
  },
  txtControlPostulacionesLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  txtControlPostulacionesValor: {
    fontSize: 12,
    fontWeight: '900',
    marginTop: 2,
  },
  btnTogglePostulaciones: {
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnCerrarPostulaciones: {
    backgroundColor: colors.danger,
  },
  btnAbrirPostulaciones: {
    backgroundColor: colors.success,
  },
  txtBtnTogglePostulaciones: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  btnModificarEquipoTl: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  txtBtnModificarEquipoTl: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  // Postulaciones TL
  tlPostulacionesContainer: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  tlPostulacionesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tlPostulacionesTitulo: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  badgeConteoPostulaciones: {
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  badgeConteoPostulacionesActivo: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: colors.warning,
  },
  txtBadgeConteoPostulaciones: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '900',
  },
  txtSinPostulaciones: {
    color: colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
    paddingVertical: 6,
  },
  postulanteCard: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  postulanteCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postulanteAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  postulanteAvatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  postulanteAlias: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  postulanteUbicacion: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  postulanteRango: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
  postulanteContactoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(37, 211, 102, 0.08)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(37, 211, 102, 0.25)',
  },
  txtPostulanteContacto: {
    flex: 1,
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  btnChatWhatsapp: {
    backgroundColor: '#25D366',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  txtBtnChatWhatsapp: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  postulanteMensajeBox: {
    backgroundColor: colors.inputBg,
    borderRadius: 6,
    padding: 8,
    marginTop: 6,
  },
  txtPostulanteMensajeLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 2,
  },
  txtPostulanteMensaje: {
    color: colors.textSecondary,
    fontSize: 11,
    fontStyle: 'italic',
    lineHeight: 15,
  },
  postulanteAccionesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  btnRechazarPostulante: {
    flex: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 6,
    minHeight: 36,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  txtBtnRechazarPostulante: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  btnAceptarPostulante: {
    flex: 1.3,
    backgroundColor: colors.success,
    borderRadius: 6,
    minHeight: 36,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  txtBtnAceptarPostulante: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  // Postulación en Detalle Equipo
  boxPostulacionEnviada: {
    marginBottom: 8,
    width: '100%',
  },
  badgePostulacionPendienteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.warning,
    marginBottom: 6,
  },
  txtPostulacionPendienteTitulo: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  txtPostulacionPendienteSub: {
    color: colors.textSecondary,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
  },
  btnCancelarMiPostulacion: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  txtBtnCancelarMiPostulacion: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textDecorationLine: 'underline',
  },
  infoPostulacionBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(224, 109, 40, 0.1)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(224, 109, 40, 0.25)',
  },
  txtInfoPostulacionBanner: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
  },
  codigoReclutaBox: {
    backgroundColor: 'rgba(224, 109, 40, 0.08)',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(224, 109, 40, 0.3)',
  },
  codigoReclutaLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  codigoReclutaValor: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 4,
    marginVertical: 4,
  },
  codigoReclutaAyuda: {
    color: colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 10,
  },
  btnCompartirCodigo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  txtBtnCompartirCodigo: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  miEquipoSeccion: {
    marginTop: 14,
  },
  seccionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  miEquipoSeccionTitulo: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  subConteoMiembros: {
    color: colors.textMuted,
    fontSize: 11,
  },
  miEquipoDescripcionTexto: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  rosterList: {
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  operadorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  operadorAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  operadorAvatarPlaceholder: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  operadorInfo: {
    flex: 1,
    marginLeft: 10,
  },
  operadorNombreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  operadorAlias: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  badgeTuMini: {
    backgroundColor: colors.primary,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginLeft: 6,
  },
  txtTuMini: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  },
  badgeTlMini: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 6,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  txtTlMini: {
    color: colors.warning,
    fontSize: 9,
    fontWeight: '900',
  },
  badgeFundadorMini: {
    backgroundColor: 'rgba(224, 109, 40, 0.15)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginLeft: 6,
  },
  txtFundadorMini: {
    color: colors.primary,
    fontSize: 8,
    fontWeight: '800',
  },
  operadorSub: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  btnDesignarTlMini: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginLeft: 8,
  },
  txtDesignarTlMini: {
    color: colors.warning,
    fontSize: 9,
    fontWeight: '900',
  },
  contenedorAccionSalida: {
    marginTop: 20,
  },
  btnDesintegrarEquipo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.danger,
    borderRadius: 8,
    paddingVertical: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
  },
  txtBtnDesintegrarEquipo: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  ayudaDesintegrarTl: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 15,
    paddingHorizontal: 8,
  },
  btnSalirEquipo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  txtBtnSalirEquipo: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  // Sin Equipo
  sinEquipoContainer: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sinEquipoIconoBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sinEquipoTituloPrincipal: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  sinEquipoSubtituloPrincipal: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  sinEquipoBotones: {
    width: '100%',
    gap: 10,
  },
  btnFundarDesdeMiEquipo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
  },
  txtBtnFundarDesdeMiEquipo: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  btnIngresarCodigoDesdeMiEquipo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(224, 109, 40, 0.12)',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
  },
  txtBtnIngresarCodigoDesdeMiEquipo: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  btnExplorarDesdeMiEquipo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    paddingVertical: 12,
  },
  txtBtnExplorarDesdeMiEquipo: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  // Modales
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalDetalleCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 18,
    width: '100%',
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalDetalleHeader: {
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingBottom: 14,
  },
  modalDetalleLogo: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: colors.primary,
    marginBottom: 8,
  },
  modalDetalleLogoPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  modalDetalleNombre: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  modalDetalleLema: {
    color: colors.primary,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
    textAlign: 'center',
  },
  modalDetalleUbicacionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  modalDetalleUbicacionTxt: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  modalDetalleBloque: {
    marginTop: 12,
  },
  modalDetalleBloqueTitulo: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  modalDetalleBloqueTexto: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  modalDetalleRoster: {
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    padding: 8,
  },
  modalOperadorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  modalOperadorAlias: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  modalOperadorRol: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  bannerPostulacionesCerradasModal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  txtBannerPostulacionesCerradas: {
    flex: 1,
    color: colors.warning,
    fontSize: 11,
    lineHeight: 15,
  },
  modalDetalleAcciones: {
    marginTop: 18,
    gap: 8,
  },
  badgeYaPerteneces: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: 8,
    paddingVertical: 10,
  },
  txtYaPerteneces: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '900',
  },
  btnAlistarmeModal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
  },
  txtBtnAlistarmeModal: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  btnAlistarmeDeshabilitado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingVertical: 12,
  },
  txtAlistarmeDeshabilitado: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  btnCerrarModal: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  txtBtnCerrarModal: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  // Modal Crear
  modalCrearCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 18,
    width: '100%',
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTituloPrincipal: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  modalSubtituloPrincipal: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
  },
  inputLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: colors.inputBg,
    color: colors.text,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  selectorRegionInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  selectorRegionInputTxt: {
    color: colors.text,
    fontSize: 13,
  },
  logoPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  logoPreview: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  logoPreviewPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  btnElegirLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBorder,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginLeft: 10,
  },
  txtBtnElegirLogo: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  modalBotonesRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  btnCancelarModal: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    minHeight: 46,
    paddingVertical: 12,
  },
  txtBtnCancelarModal: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  btnConfirmarCrear: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    minHeight: 46,
    paddingVertical: 12,
  },
  txtBtnConfirmarCrear: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  // Modal Código
  modalCodigoCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 18,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  inputCodigoGrande: {
    backgroundColor: colors.inputBg,
    color: colors.primary,
    borderRadius: 8,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 4,
    textAlign: 'center',
    paddingVertical: 12,
    marginVertical: 14,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  btnConfirmarCodigo: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
  },
  txtBtnConfirmarCodigo: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  // Selector Región Modal
  modalRegionContent: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 18,
    width: '100%',
    maxHeight: 460,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalRegionTitulo: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  itemRegion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  itemRegionActivo: {
    backgroundColor: 'rgba(224, 109, 40, 0.12)',
    borderRadius: 6,
  },
  txtRegion: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  txtRegionActivo: {
    color: colors.primary,
    fontWeight: '800',
  },
  checkRegion: {
    color: colors.primary,
    fontWeight: '900',
    fontSize: 14,
  },
  btnCerrarModalRegion: {
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 6,
  },
  txtCerrarModalRegion: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  botonDeshabilitado: {
    opacity: 0.6,
  },
  modalOverlayFondo: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modalCardRechazo: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 18,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalHeaderRowRechazo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalTituloRechazo: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  modalSubtituloRechazo: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  labelMotivosRapidos: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 6,
  },
  chipsMotivosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  chipMotivo: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  chipMotivoActivo: {
    borderColor: colors.danger,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  txtChipMotivo: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  txtChipMotivoActivo: {
    color: colors.danger,
    fontWeight: '900',
  },
  inputMotivoRechazo: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    padding: 10,
    color: colors.text,
    fontSize: 12,
    minHeight: 75,
    textAlignVertical: 'top',
  },
  avisoNotifRechazo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 14,
  },
  txtAvisoNotifRechazo: {
    color: colors.textSecondary,
    fontSize: 10,
    flex: 1,
  },
  btnConfirmarRechazoModal: {
    flex: 1.3,
    backgroundColor: colors.danger,
    borderRadius: 8,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  txtBtnConfirmarRechazoModal: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  bannerErrorCodigoModal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  txtErrorCodigoModal: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
});
