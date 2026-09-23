import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Card from '../src/components/ui/Card';
import Button from '../src/components/ui/Button';
import Icon from '../src/components/ui/Icon';
import { Colors, Radii } from '../src/theme';
import {
  obtenerCitas,
  crearCita,
  actualizarEstadoCita,
  eliminarCita,
  verificarTraslape,
  HOY_ISO,
  MANANA_ISO,
  getFechaLocalISO,
} from '../src/services/citasService';
import { obtenerServicios } from '../src/services/serviciosService';

const ESTADO_CONFIG = {
  pendiente: { label: 'Pendiente', bg: Colors.amberBg, text: Colors.amberInk, icon: 'clock' },
  confirmada: { label: 'Confirmada', bg: Colors.sageBg, text: '#4E5A38', icon: 'check' },
  completada: { label: 'Completada', bg: Colors.creamSoft, text: Colors.brand, icon: 'sparkles' },
  cancelada: { label: 'Cancelada', bg: Colors.terraBg, text: '#8C4127', icon: 'close' },
};

const FILTROS = ['Hoy', 'Mañana', 'Esta semana', 'Todas'];

const HORAS_PRESET = [
  '9:00 am',
  '10:00 am',
  '11:00 am',
  '11:30 am',
  '12:30 pm',
  '2:00 pm',
  '3:30 pm',
  '4:30 pm',
  '5:30 pm',
  '6:00 pm',
];

const DIAS_SEMANA_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function formatearFechaLarga(fechaIso) {
  if (!fechaIso) return '';
  const partes = fechaIso.split('-');
  if (partes.length !== 3) return fechaIso;
  const d = new Date(parseInt(partes[0], 10), parseInt(partes[1], 10) - 1, parseInt(partes[2], 10));
  const nombreDia = d.toLocaleDateString('es-MX', { weekday: 'long' });
  const nombreMes = d.toLocaleDateString('es-MX', { month: 'long' });
  const diaNum = d.getDate();
  const esHoy = fechaIso === HOY_ISO;
  const esManana = fechaIso === MANANA_ISO;
  const prefijo = esHoy ? 'Hoy · ' : esManana ? 'Mañana · ' : '';
  const diaCap = nombreDia.charAt(0).toUpperCase() + nombreDia.slice(1);
  return `${prefijo}${diaCap}, ${diaNum} de ${nombreMes}`;
}

export default function AgendaView() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [citas, setCitas] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [filtroActivo, setFiltroActivo] = useState('Hoy');

  // Modal Nueva Cita
  const [modalVisible, setModalVisible] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Pop-up Calendario
  const [calendarioVisible, setCalendarioVisible] = useState(false);
  const [mesCalendario, setMesCalendario] = useState(new Date());

  // Formulario
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(HOY_ISO);
  const [horaSeleccionada, setHoraSeleccionada] = useState('10:00 am');
  const [duracionMin, setDuracionMin] = useState('45');
  const [notas, setNotas] = useState('');
  const [conflictoAviso, setConflictoAviso] = useState(null);

  const cargarDatos = async () => {
    try {
      const [citasData, serviciosData] = await Promise.all([
        obtenerCitas(),
        obtenerServicios(),
      ]);
      setCitas(citasData || []);
      setServicios(serviciosData || []);
    } catch (e) {
      console.warn('Error cargando agenda:', e);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [])
  );

  const onRefresh = () => {
    setRefrescando(true);
    cargarDatos();
  };

  // Cálculo del rango de la semana actual
  const inicioSemana = useMemo(() => {
    const d = new Date();
    const diaSem = (d.getDay() + 6) % 7; // 0 = Lunes
    d.setDate(d.getDate() - diaSem);
    return getFechaLocalISO(d);
  }, []);

  const finSemana = useMemo(() => {
    const d = new Date();
    const diaSem = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - diaSem + 6); // Domingo
    return getFechaLocalISO(d);
  }, []);

  // Filtrado de citas según la pestaña seleccionada
  const citasFiltradas = useMemo(() => {
    if (filtroActivo === 'Hoy') {
      return citas.filter(c => c.fecha === HOY_ISO);
    }
    if (filtroActivo === 'Mañana') {
      return citas.filter(c => c.fecha === MANANA_ISO);
    }
    if (filtroActivo === 'Esta semana') {
      return citas.filter(c => c.fecha >= inicioSemana && c.fecha <= finSemana);
    }
    return citas; // 'Todas'
  }, [citas, filtroActivo, inicioSemana, finSemana]);

  // Agrupación por fecha
  const citasPorDia = useMemo(() => {
    const grupos = {};
    citasFiltradas.forEach(cita => {
      const f = cita.fecha;
      if (!grupos[f]) grupos[f] = [];
      grupos[f].push(cita);
    });
    return grupos;
  }, [citasFiltradas]);

  const abrirModalNuevaCita = () => {
    setClienteNombre('');
    setClienteTelefono('');
    const servInicial = servicios.length > 0 ? servicios[0] : null;
    setServicioSeleccionado(servInicial);
    setDuracionMin(String(servInicial?.duracion_min || servInicial?.duracion || 45));
    setFechaSeleccionada(HOY_ISO);
    setHoraSeleccionada('10:00 am');
    setNotas('');
    setConflictoAviso(null);
    setMesCalendario(new Date());
    setModalVisible(true);
  };

  const seleccionarServicio = (serv) => {
    setServicioSeleccionado(serv);
    setDuracionMin(String(serv.duracion_min || serv.duracion || 45));
    verificarConflicto(fechaSeleccionada, horaSeleccionada, serv.duracion_min || 45);
  };

  const seleccionarHora = (hora) => {
    setHoraSeleccionada(hora);
    verificarConflicto(fechaSeleccionada, hora, duracionMin);
  };

  const seleccionarFecha = (f) => {
    setFechaSeleccionada(f);
    verificarConflicto(f, horaSeleccionada, duracionMin);
  };

  const verificarConflicto = async (f, h, dur) => {
    const res = await verificarTraslape(f, h, dur);
    if (res.hayTraslape) {
      setConflictoAviso(
        `Ya tienes una cita a las ${res.citaConflicto.hora} (${res.citaConflicto.clienteNombre})`
      );
    } else {
      setConflictoAviso(null);
    }
  };

  // Lógica del calendario emergente
  const cambiarMes = (delta) => {
    setMesCalendario(prev => {
      const nuevo = new Date(prev);
      nuevo.setMonth(prev.getMonth() + delta);
      return nuevo;
    });
  };

  const diasDelMes = useMemo(() => {
    const year = mesCalendario.getFullYear();
    const month = mesCalendario.getMonth();
    const primerDiaSemana = new Date(year, month, 1).getDay(); // 0 = Domingo
    const totalDias = new Date(year, month + 1, 0).getDate();

    const celdas = [];
    // Espacios en blanco para alinear el primer día
    for (let i = 0; i < primerDiaSemana; i++) {
      celdas.push({ dia: null, iso: null });
    }
    // Días del mes
    for (let d = 1; d <= totalDias; d++) {
      const fecha = new Date(year, month, d);
      celdas.push({
        dia: d,
        iso: getFechaLocalISO(fecha),
      });
    }
    return celdas;
  }, [mesCalendario]);

  const seleccionarFechaCalendario = (iso) => {
    if (!iso) return;
    seleccionarFecha(iso);
    setCalendarioVisible(false);
  };

  const handleCrearCita = async () => {
    if (!clienteNombre.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresa el nombre de la clienta.');
      return;
    }
    if (!servicioSeleccionado) {
      Alert.alert('Servicio requerido', 'Por favor selecciona un servicio.');
      return;
    }

    setGuardando(true);
    try {
      await crearCita({
        cliente_nombre: clienteNombre.trim(),
        cliente_telefono: clienteTelefono.trim(),
        servicio_id: servicioSeleccionado.id,
        servicio_nombre: servicioSeleccionado.nombre,
        fecha: fechaSeleccionada,
        hora: horaSeleccionada,
        duracion_min: parseInt(duracionMin, 10),
        precio: servicioSeleccionado.precio,
        notas: notas.trim(),
        estado: 'pendiente',
      });

      setModalVisible(false);
      await cargarDatos();
    } catch (e) {
      console.error('Error guardando cita:', e);
      Alert.alert('Error', e.message || 'No se pudo agendar la cita.');
    } finally {
      setGuardando(false);
    }
  };

  const handleCambiarEstado = async (citaId, nuevoEstado) => {
    try {
      await actualizarEstadoCita(citaId, nuevoEstado);
      await cargarDatos();
    } catch (e) {
      Alert.alert('Error', 'No se pudo actualizar el estado de la cita.');
    }
  };

  const handleCobrarCita = (cita) => {
    router.push({
      pathname: '/(tabs)/venta',
      params: {
        servicioId: cita.servicioId || cita.servicio_id,
        clienteNombre: cita.clienteNombre || cita.cliente_nombre,
      },
    });
  };

  const formatFechaTitulo = (fechaIso) => {
    if (fechaIso === HOY_ISO) return 'Hoy';
    if (fechaIso === MANANA_ISO) return 'Mañana';
    const partes = fechaIso.split('-');
    if (partes.length === 3) {
      const d = new Date(parseInt(partes[0], 10), parseInt(partes[1], 10) - 1, parseInt(partes[2], 10));
      return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' });
    }
    return fechaIso;
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Icon name="arrow-left" size={18} color={Colors.brand} />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.title}>Agenda</Text>
          <Text style={styles.subtitle}>Citas de servicios</Text>
        </View>
        <TouchableOpacity onPress={abrirModalNuevaCita} style={styles.addBtn} activeOpacity={0.7}>
          <Icon name="plus" size={15} color={Colors.cream} />
          <Text style={styles.addBtnText}>Nueva</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs de Filtro */}
      <View style={styles.filtrosBar}>
        {FILTROS.map((f) => {
          const activo = filtroActivo === f;
          return (
            <TouchableOpacity
              key={f}
              style={[styles.filtroTab, activo && styles.filtroTabActivo]}
              onPress={() => setFiltroActivo(f)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filtroText, activo && styles.filtroTextActivo]}>{f}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Contenido de Citas */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={onRefresh} tintColor={Colors.brand} />
        }
      >
        {cargando ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Colors.brand} />
            <Text style={styles.loadingText}>Cargando agenda de citas...</Text>
          </View>
        ) : citasFiltradas.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Icon name="calendar" size={30} color={Colors.brand} />
            </View>
            <Text style={styles.emptyTitle}>Sin citas para {filtroActivo.toLowerCase()}</Text>
            <Text style={styles.emptySubtitle}>
              {filtroActivo === 'Esta semana'
                ? 'No tienes citas programadas para esta semana'
                : 'Tu agenda está libre para este periodo'}
            </Text>
            <Button
              label="+ Agendar nueva cita"
              onPress={abrirModalNuevaCita}
              style={{ marginTop: 10 }}
            />
          </View>
        ) : (
          Object.keys(citasPorDia).map((fechaIso) => (
            <View key={fechaIso} style={styles.diaGrupo}>
              <View style={styles.diaHeader}>
                <Icon name="calendar" size={13} color={Colors.stone} />
                <Text style={styles.diaTitulo}>{formatFechaTitulo(fechaIso)}</Text>
                <Text style={styles.diaContador}>
                  ({citasPorDia[fechaIso].length} cita{citasPorDia[fechaIso].length !== 1 ? 's' : ''})
                </Text>
              </View>

              {citasPorDia[fechaIso].map((cita) => {
                const est = ESTADO_CONFIG[cita.estado] || ESTADO_CONFIG.pendiente;
                return (
                  <Card key={cita.id} style={styles.citaCard}>
                    {/* Fila superior: Badge y Hora */}
                    <View style={styles.citaHeader}>
                      <View style={[styles.estadoBadge, { backgroundColor: est.bg }]}>
                        <Icon name={est.icon} size={11} color={est.text} />
                        <Text style={[styles.estadoText, { color: est.text }]}>{est.label}</Text>
                      </View>
                      <View style={styles.horaRow}>
                        <Icon name="clock" size={13} color={Colors.brand} />
                        <Text style={styles.citaHora}>{cita.hora}</Text>
                        <Text style={styles.citaDuracion}>({cita.duracionMin || 45}m)</Text>
                      </View>
                    </View>

                    {/* Cliente y Servicio */}
                    <Text style={styles.citaCliente}>{cita.clienteNombre}</Text>
                    {!!cita.clienteTelefono && (
                      <View style={styles.telRow}>
                        <Icon name="phone" size={12} color={Colors.stone} />
                        <Text style={styles.citaTel}>{cita.clienteTelefono}</Text>
                      </View>
                    )}

                    <View style={styles.servicioRow}>
                      <View style={styles.servicioBadge}>
                        <Icon name="sparkles" size={12} color={Colors.brand} />
                        <Text style={styles.citaServicio}>{cita.servicioNombre}</Text>
                      </View>
                      <Text style={styles.citaPrecio}>${cita.precio}</Text>
                    </View>

                    {!!cita.notas && (
                      <View style={styles.notaRow}>
                        <Icon name="note" size={12} color={Colors.stone} />
                        <Text style={styles.citaNota}>{cita.notas}</Text>
                      </View>
                    )}

                    {/* Botones de acción */}
                    <View style={styles.accionesRow}>
                      {cita.estado === 'pendiente' && (
                        <>
                          <TouchableOpacity
                            style={[styles.btnAccion, styles.btnConfirmar]}
                            onPress={() => handleCambiarEstado(cita.id, 'confirmada')}
                            activeOpacity={0.7}
                          >
                            <Icon name="check" size={13} color={Colors.cream} />
                            <Text style={styles.btnAccionText}>Confirmar</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.btnAccion, styles.btnGhost]}
                            onPress={() => handleCambiarEstado(cita.id, 'cancelada')}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.btnAccionText, { color: Colors.stone }]}>
                              Cancelar
                            </Text>
                          </TouchableOpacity>
                        </>
                      )}

                      {cita.estado === 'confirmada' && (
                        <>
                          <TouchableOpacity
                            style={[styles.btnAccion, styles.btnCompletar]}
                            onPress={() => handleCambiarEstado(cita.id, 'completada')}
                            activeOpacity={0.7}
                          >
                            <Icon name="sparkles" size={13} color={Colors.cream} />
                            <Text style={styles.btnAccionText}>Marcar realizada</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.btnAccion, styles.btnCobrar]}
                            onPress={() => handleCobrarCita(cita)}
                            activeOpacity={0.7}
                          >
                            <Icon name="cart" size={13} color={Colors.brand} />
                            <Text style={styles.btnCobrarText}>Cobrar en caja →</Text>
                          </TouchableOpacity>
                        </>
                      )}

                      {cita.estado === 'completada' && (
                        <TouchableOpacity
                          style={[styles.btnAccion, styles.btnCobrarFull]}
                          onPress={() => handleCobrarCita(cita)}
                          activeOpacity={0.7}
                        >
                          <Icon name="cart" size={14} color={Colors.cream} />
                          <Text style={styles.btnCobrarFullText}>Cobrar esta cita en POS →</Text>
                        </TouchableOpacity>
                      )}

                      {cita.estado === 'cancelada' && (
                        <TouchableOpacity
                          style={[styles.btnAccion, styles.btnGhost]}
                          onPress={() => handleCambiarEstado(cita.id, 'pendiente')}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.btnAccionText, { color: Colors.stone }]}>
                            Reactivar cita
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </Card>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal Nueva Cita */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
            {/* Cabecera */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Agendar nueva cita</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeModalBtn}
                activeOpacity={0.7}
              >
                <Icon name="close" size={18} color={Colors.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalFormContent}
            >
              {/* Cliente */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nombre de la clienta *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej. Carmen Salinas"
                  placeholderTextColor={Colors.stone}
                  autoCapitalize="words"
                  value={clienteNombre}
                  onChangeText={setClienteNombre}
                />
              </View>

              {/* Teléfono */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Teléfono (referencia interna)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="333-000-0000"
                  placeholderTextColor={Colors.stone}
                  keyboardType="phone-pad"
                  value={clienteTelefono}
                  onChangeText={setClienteTelefono}
                />
              </View>

              {/* Selector de Servicio */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Servicio *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                  <View style={styles.chipsRow}>
                    {servicios.map((s) => {
                      const sel = servicioSeleccionado?.id === s.id;
                      return (
                        <TouchableOpacity
                          key={s.id}
                          style={[styles.serviceChip, sel && styles.serviceChipSelected]}
                          onPress={() => seleccionarServicio(s)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.serviceChipText, sel && styles.serviceChipTextSelected]}>
                            {s.nombre}
                          </Text>
                          <Text style={[styles.serviceChipPrice, sel && styles.serviceChipTextSelected]}>
                            ${s.precio}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              {/* Selector de Fecha con Calendario Pop-Up */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Día de la cita *</Text>

                {/* Tarjeta de fecha seleccionada (Al presionar abre el calendario emergente) */}
                <TouchableOpacity
                  style={styles.fechaDisplayCard}
                  onPress={() => setCalendarioVisible(true)}
                  activeOpacity={0.75}
                >
                  <View style={styles.fechaDisplayLeft}>
                    <View style={styles.fechaIconCircle}>
                      <Icon name="calendar" size={16} color={Colors.brand} />
                    </View>
                    <View>
                      <Text style={styles.fechaDisplayLarga}>
                        {formatearFechaLarga(fechaSeleccionada)}
                      </Text>
                      <Text style={styles.fechaDisplayHint}>
                        Toca para abrir el calendario
                      </Text>
                    </View>
                  </View>
                  <View style={styles.fechaCambiarBtn}>
                    <Icon name="calendar" size={13} color={Colors.cream} />
                    <Text style={styles.fechaCambiarText}>Cambiar</Text>
                  </View>
                </TouchableOpacity>

                {/* Atajos rápidos de fecha */}
                <View style={styles.fechaChipsRow}>
                  <TouchableOpacity
                    style={[styles.fechaChip, fechaSeleccionada === HOY_ISO && styles.fechaChipActivo]}
                    onPress={() => seleccionarFecha(HOY_ISO)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.fechaChipText,
                        fechaSeleccionada === HOY_ISO && styles.fechaChipTextActivo,
                      ]}
                    >
                      Hoy
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.fechaChip,
                      fechaSeleccionada === MANANA_ISO && styles.fechaChipActivo,
                    ]}
                    onPress={() => seleccionarFecha(MANANA_ISO)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.fechaChipText,
                        fechaSeleccionada === MANANA_ISO && styles.fechaChipTextActivo,
                      ]}
                    >
                      Mañana
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.fechaChip,
                      styles.fechaChipCalendar,
                      fechaSeleccionada !== HOY_ISO && fechaSeleccionada !== MANANA_ISO && styles.fechaChipActivo,
                    ]}
                    onPress={() => setCalendarioVisible(true)}
                    activeOpacity={0.7}
                  >
                    <Icon
                      name="calendar"
                      size={12}
                      color={
                        fechaSeleccionada !== HOY_ISO && fechaSeleccionada !== MANANA_ISO
                          ? Colors.cream
                          : Colors.brand
                      }
                    />
                    <Text
                      style={[
                        styles.fechaChipText,
                        fechaSeleccionada !== HOY_ISO && fechaSeleccionada !== MANANA_ISO && styles.fechaChipTextActivo,
                      ]}
                    >
                      Calendario
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Selector de Hora (Formato 12 Horas) */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Horario (Formato 12 horas: am/pm) *</Text>
                <View style={styles.horasChipsRow}>
                  {HORAS_PRESET.map((h) => {
                    const sel = horaSeleccionada === h;
                    return (
                      <TouchableOpacity
                        key={h}
                        style={[styles.horaChip, sel && styles.horaChipActivo]}
                        onPress={() => seleccionarHora(h)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.horaChipText, sel && styles.horaChipTextActivo]}>
                          {h}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TextInput
                  style={[styles.formInput, { marginTop: 6 }]}
                  placeholder="O escribe otra hora (ej. 1:15 pm, 4:00 pm)"
                  placeholderTextColor={Colors.stone}
                  value={horaSeleccionada}
                  onChangeText={seleccionarHora}
                />
              </View>

              {/* Alerta de traslape */}
              {conflictoAviso && (
                <View style={styles.avisoConflictCard}>
                  <Icon name="warning" size={15} color={Colors.amberInk} />
                  <Text style={styles.avisoConflictText}>{conflictoAviso}</Text>
                </View>
              )}

              {/* Notas opcionales */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Notas o indicaciones (opcional)</Text>
                <TextInput
                  style={[styles.formInput, { minHeight: 60, textAlignVertical: 'top' }]}
                  placeholder="Ej. Tinte rubio, diseño especial, primera visita..."
                  placeholderTextColor={Colors.stone}
                  multiline
                  numberOfLines={2}
                  value={notas}
                  onChangeText={setNotas}
                />
              </View>

              {/* Botón de agendar */}
              <Button
                label="Agendar cita"
                onPress={handleCrearCita}
                loading={guardando}
                disabled={guardando}
                style={{ marginTop: 6 }}
              />
            </ScrollView>
          </View>

          {/* POP-UP CALENDARIO INTERACTIVO (Overlay que cubre toda la pantalla del modal) */}
          {calendarioVisible && (
            <View style={styles.calendarModalOverlay}>
              <TouchableOpacity
                style={StyleSheet.absoluteFill}
                activeOpacity={1}
                onPress={() => setCalendarioVisible(false)}
              />
              <View style={styles.calendarModalContent}>
                {/* Header del Calendario */}
                <View style={styles.calendarHeader}>
                  <Text style={styles.calendarTitle}>Seleccionar día</Text>
                  <TouchableOpacity
                    onPress={() => setCalendarioVisible(false)}
                    style={styles.calendarCloseBtn}
                    activeOpacity={0.7}
                  >
                    <Icon name="close" size={18} color={Colors.ink} />
                  </TouchableOpacity>
                </View>

                {/* Selector de Mes */}
                <View style={styles.monthNavRow}>
                  <TouchableOpacity
                    onPress={() => cambiarMes(-1)}
                    style={styles.monthArrowBtn}
                    activeOpacity={0.7}
                  >
                    <Icon name="chevron-left" size={16} color={Colors.brand} />
                  </TouchableOpacity>

                  <Text style={styles.monthNavTitle}>
                    {MESES[mesCalendario.getMonth()]} {mesCalendario.getFullYear()}
                  </Text>

                  <TouchableOpacity
                    onPress={() => cambiarMes(1)}
                    style={styles.monthArrowBtn}
                    activeOpacity={0.7}
                  >
                    <Icon name="chevron-right" size={16} color={Colors.brand} />
                  </TouchableOpacity>
                </View>

                {/* Días de la semana */}
                <View style={styles.diasSemanaHeader}>
                  {DIAS_SEMANA_CORTO.map((d) => (
                    <Text key={d} style={styles.diaSemanaText}>
                      {d}
                    </Text>
                  ))}
                </View>

                {/* Grilla de Días del Mes */}
                <View style={styles.calendarGrid}>
                  {diasDelMes.map((item, idx) => {
                    if (!item.dia) {
                      return <View key={`blank_${idx}`} style={styles.calendarCell} />;
                    }

                    const esSeleccionado = item.iso === fechaSeleccionada;
                    const esHoy = item.iso === HOY_ISO;

                    return (
                      <TouchableOpacity
                        key={item.iso}
                        style={[
                          styles.calendarCell,
                          esSeleccionado && styles.calendarCellSelected,
                          esHoy && !esSeleccionado && styles.calendarCellToday,
                        ]}
                        onPress={() => seleccionarFechaCalendario(item.iso)}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[
                            styles.calendarCellText,
                            esSeleccionado && styles.calendarCellTextSelected,
                            esHoy && !esSeleccionado && styles.calendarCellTextToday,
                          ]}
                        >
                          {item.dia}
                        </Text>
                        {esHoy && (
                          <View
                            style={[
                              styles.todayDot,
                              esSeleccionado && { backgroundColor: Colors.cream },
                            ]}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Botón rápido "Seleccionar Hoy" y "Listo" */}
                <View style={styles.calendarFooter}>
                  <TouchableOpacity
                    style={styles.calendarTodayBtn}
                    onPress={() => {
                      setMesCalendario(new Date());
                      seleccionarFechaCalendario(HOY_ISO);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.calendarTodayBtnText}>Ir a Hoy</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.calendarDoneBtn}
                    onPress={() => setCalendarioVisible(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.calendarDoneBtnText}>Listo</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitles: { alignItems: 'center' },
  title: {
    fontSize: 17,
    fontFamily: 'Montserrat_800ExtraBold',
    color: Colors.ink,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 10.5,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.inkSoft,
    textAlign: 'center',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.brand,
    borderRadius: Radii.pill,
  },
  addBtnText: {
    fontSize: 11,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.cream,
  },
  filtrosBar: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingBottom: 8,
    gap: 8,
  },
  filtroTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtroTabActivo: {
    backgroundColor: Colors.brand,
    borderColor: Colors.brand,
  },
  filtroText: {
    fontSize: 11,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.inkSoft,
  },
  filtroTextActivo: {
    color: Colors.cream,
  },
  content: {
    padding: 18,
    paddingBottom: 40,
    gap: 16,
  },
  centerContainer: {
    paddingVertical: 50,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.inkSoft,
  },
  emptyContainer: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
    gap: 8,
  },
  emptyIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Colors.creamSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.ink,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 11.5,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.inkSoft,
    textAlign: 'center',
  },
  diaGrupo: {
    gap: 8,
  },
  diaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  diaTitulo: {
    fontSize: 12,
    fontFamily: 'Montserrat_800ExtraBold',
    color: Colors.ink,
    textTransform: 'capitalize',
  },
  diaContador: {
    fontSize: 11,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.stone,
  },
  citaCard: {
    padding: 14,
    gap: 8,
    borderRadius: 14,
  },
  citaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  estadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.pill,
  },
  estadoText: {
    fontSize: 10,
    fontFamily: 'Montserrat_700Bold',
    textTransform: 'uppercase',
  },
  horaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  citaHora: {
    fontSize: 12.5,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.ink,
  },
  citaDuracion: {
    fontSize: 11,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.stone,
  },
  citaCliente: {
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.ink,
  },
  telRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: -4,
  },
  citaTel: {
    fontSize: 11,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.stone,
  },
  servicioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.creamSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  servicioBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  citaServicio: {
    fontSize: 12,
    fontFamily: 'Montserrat_600SemiBold',
    color: Colors.ink,
  },
  citaPrecio: {
    fontFamily: 'Fraunces_500Medium',
    fontSize: 13,
    color: Colors.brand,
  },
  notaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  citaNota: {
    fontSize: 11,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.inkSoft,
    fontStyle: 'italic',
  },
  accionesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.stoneLight,
  },
  btnAccion: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: Radii.btn,
  },
  btnConfirmar: {
    backgroundColor: '#4E5A38',
  },
  btnCompletar: {
    backgroundColor: Colors.brand,
  },
  btnCobrar: {
    backgroundColor: Colors.creamSoft,
    borderWidth: 1,
    borderColor: Colors.brand,
  },
  btnCobrarText: {
    fontSize: 11.5,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.brand,
  },
  btnCobrarFull: {
    backgroundColor: Colors.brand,
    paddingVertical: 10,
  },
  btnCobrarFullText: {
    fontSize: 12,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.cream,
  },
  btnGhost: {
    backgroundColor: Colors.creamSoft,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
  },
  btnAccionText: {
    fontSize: 11.5,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.cream,
  },

  // Modal Nueva Cita
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderTopColor: Colors.stoneLight,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.stoneLight,
  },
  modalTitle: {
    fontSize: 15,
    fontFamily: 'Montserrat_800ExtraBold',
    color: Colors.ink,
  },
  closeModalBtn: {
    padding: 4,
  },
  modalFormContent: {
    padding: 20,
    gap: 13,
  },
  formGroup: {
    gap: 6,
  },
  formLabel: {
    fontSize: 11,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  formInput: {
    backgroundColor: Colors.cream,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.ink,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
  },
  serviceChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radii.card,
    backgroundColor: Colors.cream,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
    alignItems: 'center',
  },
  serviceChipSelected: {
    backgroundColor: Colors.brand,
    borderColor: Colors.brand,
  },
  serviceChipText: {
    fontSize: 11.5,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.ink,
  },
  serviceChipPrice: {
    fontSize: 10.5,
    fontFamily: 'Fraunces_500Medium',
    color: Colors.brand,
    marginTop: 2,
  },
  serviceChipTextSelected: {
    color: Colors.brandText,
  },

  // Fecha Display y Chips
  fechaDisplayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cream,
    borderWidth: 1.5,
    borderColor: Colors.brand,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  fechaDisplayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  fechaIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fechaDisplayLarga: {
    fontSize: 12.5,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.ink,
  },
  fechaDisplayHint: {
    fontSize: 10,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.stone,
    marginTop: 1,
  },
  fechaCambiarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.brand,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.pill,
  },
  fechaCambiarText: {
    fontSize: 11,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.brandText,
  },
  fechaChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  fechaChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: Radii.pill,
    backgroundColor: Colors.cream,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fechaChipCalendar: {
    flexDirection: 'row',
    gap: 5,
  },
  fechaChipActivo: {
    backgroundColor: Colors.brand,
    borderColor: Colors.brand,
  },
  fechaChipText: {
    fontSize: 11,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.inkSoft,
  },
  fechaChipTextActivo: {
    color: Colors.brandText,
  },
  horasChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  horaChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    backgroundColor: Colors.cream,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
  },
  horaChipActivo: {
    backgroundColor: Colors.brand,
    borderColor: Colors.brand,
  },
  horaChipText: {
    fontSize: 11,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.inkSoft,
  },
  horaChipTextActivo: {
    color: Colors.brandText,
  },
  avisoConflictCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.amberBg,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.amberInk + '40',
  },
  avisoConflictText: {
    flex: 1,
    fontSize: 11,
    fontFamily: 'Montserrat_600SemiBold',
    color: Colors.amberInk,
  },

  // Pop-up Modal Calendario
  calendarModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
    zIndex: 99999,
    elevation: 50,
  },
  calendarModalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
    padding: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 25,
    zIndex: 100000,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.stoneLight,
  },
  calendarTitle: {
    fontSize: 15,
    fontFamily: 'Montserrat_800ExtraBold',
    color: Colors.ink,
  },
  calendarCloseBtn: {
    padding: 4,
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  monthNavTitle: {
    fontSize: 13.5,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.ink,
  },
  monthArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.creamSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diasSemanaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.stoneLight,
    marginBottom: 6,
  },
  diaSemanaText: {
    width: 36,
    textAlign: 'center',
    fontSize: 11,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.stone,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  calendarCell: {
    width: '14.28%', // 7 columnas
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
    borderRadius: 20,
    position: 'relative',
  },
  calendarCellSelected: {
    backgroundColor: Colors.brand,
  },
  calendarCellToday: {
    borderWidth: 1,
    borderColor: Colors.brand,
    backgroundColor: Colors.creamSoft,
  },
  calendarCellText: {
    fontSize: 12.5,
    fontFamily: 'Montserrat_600SemiBold',
    color: Colors.ink,
  },
  calendarCellTextSelected: {
    color: Colors.cream,
    fontFamily: 'Montserrat_700Bold',
  },
  calendarCellTextToday: {
    color: Colors.brand,
    fontFamily: 'Montserrat_700Bold',
  },
  todayDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.brand,
  },
  calendarFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.stoneLight,
  },
  calendarTodayBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radii.pill,
    backgroundColor: Colors.creamSoft,
  },
  calendarTodayBtnText: {
    fontSize: 11.5,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.brand,
  },
  calendarDoneBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: Radii.pill,
    backgroundColor: Colors.brand,
  },
  calendarDoneBtnText: {
    fontSize: 11.5,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.cream,
  },
});
