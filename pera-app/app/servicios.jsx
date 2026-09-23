import { useState, useCallback } from 'react';
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
  obtenerServicios,
  crearServicio,
  actualizarServicio,
  eliminarServicio,
} from '../src/services/serviciosService';

const DURACIONES_PRESET = [30, 45, 60, 90, 120];

const COLORES_PRESET = [
  '#EBD9CC', // Warm Nude
  '#E4D9CB', // Soft Sand
  '#D9C2AC', // Terracotta Light
  '#F3DFD5', // Rose Nude
  '#E7EBDC', // Sage Tint
  '#F5E3C4', // Peach Warm
  '#F7F1E8', // Cream Pearl
];

export default function ServiciosView() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [servicios, setServicios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  // Estado del modal de crear / editar
  const [modalVisible, setModalVisible] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [servicioActualId, setServicioActualId] = useState(null);

  // Campos del formulario
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [duracion, setDuracion] = useState('45');
  const [pedestalColor, setPedestalColor] = useState(COLORES_PRESET[0]);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  const cargarDatos = async () => {
    try {
      const data = await obtenerServicios();
      setServicios(data || []);
    } catch (e) {
      console.warn('Error cargando servicios:', e);
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

  const abrirModalCrear = () => {
    setModoEdicion(false);
    setServicioActualId(null);
    setNombre('');
    setPrecio('');
    setDuracion('45');
    setPedestalColor(COLORES_PRESET[0]);
    setModalVisible(true);
  };

  const abrirModalEditar = (servicio) => {
    setModoEdicion(true);
    setServicioActualId(servicio.id);
    setNombre(servicio.nombre || '');
    setPrecio(String(servicio.precio || ''));
    setDuracion(String(servicio.duracion_min || servicio.duracion || 45));
    setPedestalColor(servicio.pedestal_color || servicio.pedestalColor || COLORES_PRESET[0]);
    setModalVisible(true);
  };

  const handleGuardar = async () => {
    if (!nombre.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresa el nombre del servicio.');
      return;
    }

    const precioNum = parseFloat(precio);
    if (isNaN(precioNum) || precioNum < 0) {
      Alert.alert('Precio inválido', 'Por favor ingresa un precio válido mayor o igual a 0.');
      return;
    }

    const duracionNum = parseInt(duracion, 10);
    if (isNaN(duracionNum) || duracionNum <= 0) {
      Alert.alert('Duración inválida', 'La duración estimada en minutos debe ser mayor a 0.');
      return;
    }

    setGuardando(true);
    try {
      if (modoEdicion && servicioActualId) {
        await actualizarServicio(servicioActualId, {
          nombre: nombre.trim(),
          precio: precioNum,
          duracion_min: duracionNum,
          pedestal_color: pedestalColor,
        });
      } else {
        await crearServicio({
          nombre: nombre.trim(),
          precio: precioNum,
          duracion_min: duracionNum,
          pedestal_color: pedestalColor,
        });
      }

      setModalVisible(false);
      await cargarDatos();
    } catch (err) {
      console.error('Error guardando servicio:', err);
      Alert.alert('Error', err.message || 'No se pudo guardar el servicio.');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = () => {
    if (!servicioActualId) return;

    Alert.alert(
      'Eliminar servicio',
      `¿Estás segura de que deseas eliminar "${nombre}"? Ya no aparecerá en el punto de venta.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setEliminando(true);
            try {
              await eliminarServicio(servicioActualId);
              setModalVisible(false);
              await cargarDatos();
            } catch (err) {
              console.error('Error al eliminar servicio:', err);
              Alert.alert('Error', err.message || 'No se pudo eliminar el servicio.');
            } finally {
              setEliminando(false);
            }
          },
        },
      ]
    );
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
          <Text style={styles.title}>Servicios</Text>
          <Text style={styles.subtitle}>Cobro unitario, sin receta</Text>
        </View>
        <TouchableOpacity onPress={abrirModalCrear} style={styles.addHeaderBtn} activeOpacity={0.7}>
          <Icon name="plus" size={16} color={Colors.brand} />
        </TouchableOpacity>
      </View>

      {/* Contenido principal */}
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
            <Text style={styles.loadingText}>Cargando catálogo de servicios...</Text>
          </View>
        ) : servicios.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Icon name="sparkles" size={28} color={Colors.brand} />
            </View>
            <Text style={styles.emptyTitle}>No hay servicios registrados</Text>
            <Text style={styles.emptySubtitle}>Agrega tu primer servicio para cobrarlo en caja</Text>
            <Button
              label="+ Agregar primer servicio"
              onPress={abrirModalCrear}
              style={{ marginTop: 12 }}
            />
          </View>
        ) : (
          <Card noPadding style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
            {servicios.map((s, i) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.serviceRow, i > 0 && styles.serviceRowBorder]}
                onPress={() => abrirModalEditar(s)}
                activeOpacity={0.7}
              >
                {/* Ícono pedestal */}
                <View
                  style={[
                    styles.servicePedestal,
                    { backgroundColor: s.pedestal_color || s.pedestalColor || Colors.creamSoft },
                  ]}
                >
                  <Icon name="sparkles" size={16} color={Colors.brand} />
                </View>

                {/* Info */}
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName} numberOfLines={1}>
                    {s.nombre}
                  </Text>
                  <View style={styles.serviceMetaRow}>
                    <Icon name="clock" size={11} color={Colors.stone} />
                    <Text style={styles.serviceMeta}>{s.duracion_min || s.duracion} min</Text>
                  </View>
                </View>

                {/* Precio y flecha */}
                <View style={styles.serviceRight}>
                  <Text style={styles.servicePrice}>${s.precio}</Text>
                  <Icon name="chevron-right" size={14} color={Colors.stone} />
                </View>
              </TouchableOpacity>
            ))}
          </Card>
        )}

        {/* Botón secundario para agregar */}
        {!cargando && servicios.length > 0 && (
          <Button
            variant="ghost"
            label="+ Agregar servicio"
            onPress={abrirModalCrear}
          />
        )}

        {/* Nota explicativa de regla de negocio */}
        <Card soft style={styles.notaCard}>
          <View style={styles.notaRow}>
            <Icon name="info" size={16} color={Colors.inkSoft} />
            <Text style={styles.nota}>
              Los servicios se cobran a precio fijo. No descuentan insumos de inventario de forma automática — si un servicio usa producto, ese consumo se registra manualmente cuando haga falta.
            </Text>
          </View>
        </Card>
      </ScrollView>

      {/* Modal de Crear / Editar Servicio */}
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
            {/* Cabecera del modal */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modoEdicion ? 'Editar servicio' : 'Nuevo servicio'}
              </Text>
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
              {/* Campo Nombre */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nombre del servicio *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej. Balayage completo"
                  placeholderTextColor={Colors.stone}
                  autoCapitalize="words"
                  value={nombre}
                  onChangeText={setNombre}
                />
              </View>

              {/* Fila: Precio y Duración */}
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Precio ($) *</Text>
                  <View style={styles.inputWithPrefix}>
                    <Text style={styles.prefixText}>$</Text>
                    <TextInput
                      style={styles.innerInput}
                      placeholder="0.00"
                      placeholderTextColor={Colors.stone}
                      keyboardType="decimal-pad"
                      value={precio}
                      onChangeText={setPrecio}
                    />
                  </View>
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Duración (min) *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="45"
                    placeholderTextColor={Colors.stone}
                    keyboardType="number-pad"
                    value={duracion}
                    onChangeText={setDuracion}
                  />
                </View>
              </View>

              {/* Chips rápidos de duración */}
              <View style={styles.duracionChipsContainer}>
                <Text style={styles.formSubLabel}>Atajos de duración:</Text>
                <View style={styles.duracionChipsRow}>
                  {DURACIONES_PRESET.map((min) => {
                    const activo = String(min) === String(duracion);
                    return (
                      <TouchableOpacity
                        key={min}
                        style={[styles.duracionChip, activo && styles.duracionChipActivo]}
                        onPress={() => setDuracion(String(min))}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.duracionChipText,
                            activo && styles.duracionChipTextActivo,
                          ]}
                        >
                          {min}m
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Selector de Color de Pedestal / Etiqueta */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Color de identificación</Text>
                <View style={styles.coloresRow}>
                  {COLORES_PRESET.map((c) => {
                    const isSelected = pedestalColor === c;
                    return (
                      <TouchableOpacity
                        key={c}
                        style={[
                          styles.colorBubble,
                          { backgroundColor: c },
                          isSelected && styles.colorBubbleSelected,
                        ]}
                        onPress={() => setPedestalColor(c)}
                        activeOpacity={0.8}
                      >
                        {isSelected && <Icon name="check" size={14} color={Colors.ink} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Botones de acción */}
              <View style={styles.modalActions}>
                <Button
                  label={modoEdicion ? 'Guardar cambios' : 'Crear servicio'}
                  onPress={handleGuardar}
                  loading={guardando}
                  disabled={guardando || eliminando}
                />

                {modoEdicion && (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={handleEliminar}
                    disabled={guardando || eliminando}
                    activeOpacity={0.7}
                  >
                    <Icon name="trash" size={15} color={Colors.rose} />
                    <Text style={styles.deleteBtnText}>
                      {eliminando ? 'Eliminando...' : 'Eliminar servicio'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
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
  addHeaderBtn: {
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
  content: { padding: 18, paddingBottom: 40, gap: 14 },
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
    width: 52,
    height: 52,
    borderRadius: 26,
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
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
  },
  serviceRowBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.stoneLight,
  },
  servicePedestal: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceInfo: { flex: 1 },
  serviceName: {
    fontSize: 13,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.ink,
  },
  serviceMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  serviceMeta: {
    fontSize: 10.5,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.stone,
  },
  serviceRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  servicePrice: {
    fontFamily: 'Fraunces_500Medium',
    fontSize: 14.5,
    color: Colors.brand,
  },
  notaCard: {
    padding: 14,
  },
  notaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  nota: {
    flex: 1,
    fontSize: 10.5,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.inkSoft,
    lineHeight: 16,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
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
    gap: 14,
  },
  formGroup: {
    gap: 6,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formLabel: {
    fontSize: 11,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  formSubLabel: {
    fontSize: 10.5,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.stone,
    marginBottom: 6,
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
  inputWithPrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cream,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  prefixText: {
    fontSize: 13,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.stone,
    marginRight: 4,
  },
  innerInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.ink,
  },
  duracionChipsContainer: {
    marginTop: -4,
  },
  duracionChipsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  duracionChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
    backgroundColor: Colors.cream,
  },
  duracionChipActivo: {
    backgroundColor: Colors.brand,
    borderColor: Colors.brand,
  },
  duracionChipText: {
    fontSize: 11,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.inkSoft,
  },
  duracionChipTextActivo: {
    color: Colors.brandText,
  },
  coloresRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  colorBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.stoneLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorBubbleSelected: {
    borderColor: Colors.brand,
    transform: [{ scale: 1.1 }],
  },
  modalActions: {
    marginTop: 10,
    gap: 10,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  deleteBtnText: {
    fontSize: 12,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.rose,
  },
});
