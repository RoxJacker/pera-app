import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Card from '../src/components/ui/Card';
import Button from '../src/components/ui/Button';
import Icon from '../src/components/ui/Icon';
import Badge from '../src/components/ui/Badge';
import { Colors, Radii } from '../src/theme';
import { obtenerProductos } from '../src/services/productosService';
import { registrarEntrada } from '../src/services/inventarioService';

export default function EntradaView() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [productos, setProductos] = useState([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [busquedaModal, setBusquedaModal] = useState('');

  // Formulario
  const [cantidad, setCantidad] = useState('10');
  const [costoUnitario, setCostoUnitario] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargarCatalogo();
  }, []);

  const cargarCatalogo = async () => {
    setCargandoProductos(true);
    try {
      const data = await obtenerProductos();
      setProductos(data || []);
      if (data && data.length > 0) {
        seleccionarProducto(data[0]);
      }
    } catch (e) {
      console.warn('Error cargando catálogo en entrada:', e);
    } finally {
      setCargandoProductos(false);
    }
  };

  const seleccionarProducto = (prod) => {
    setProductoSeleccionado(prod);
    const costoActual = prod.costo != null ? String(prod.costo) : '0';
    setCostoUnitario(costoActual);
    setModalVisible(false);
  };

  const stockActual = parseInt(productoSeleccionado?.stock || 0, 10);
  const cantNum = parseInt(cantidad || '0', 10);
  const stockResultante = stockActual + (isNaN(cantNum) ? 0 : cantNum);
  const costoNum = parseFloat(costoUnitario || '0');
  const totalInversion = (isNaN(cantNum) ? 0 : cantNum) * (isNaN(costoNum) ? 0 : costoNum);

  const handleRegistrar = async () => {
    if (!productoSeleccionado) {
      Alert.alert('Selección requerida', 'Por favor selecciona un producto.');
      return;
    }
    if (isNaN(cantNum) || cantNum <= 0) {
      Alert.alert('Cantidad inválida', 'La cantidad a ingresar debe ser mayor a 0.');
      return;
    }

    setGuardando(true);
    try {
      await registrarEntrada({
        productoId: productoSeleccionado.id,
        cantidad: cantNum,
        costoUnitario: costoNum,
        proveedor: proveedor.trim(),
      });

      Alert.alert(
        '¡Entrada registrada!',
        `Se agregaron ${cantNum} piezas a "${productoSeleccionado.nombre}".\nNuevo stock: ${stockResultante} pzas.\nNuevo costo: $${costoNum.toFixed(2)}`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err) {
      console.error('Error al registrar entrada:', err);
      Alert.alert('Error', err.message || 'No se pudo registrar la entrada.');
    } finally {
      setGuardando(false);
    }
  };

  const productosFiltrados = productos.filter(p => {
    const q = busquedaModal.toLowerCase().trim();
    if (!q) return true;
    return (
      (p.nombre && p.nombre.toLowerCase().includes(q)) ||
      (p.marca && p.marca.toLowerCase().includes(q)) ||
      (p.categoria && p.categoria.toLowerCase().includes(q))
    );
  });

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header con hitSlop generoso */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Regresar"
        >
          <Icon name="arrow-left" size={18} color={Colors.brand} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.title}>Nueva entrada</Text>
          <Text style={styles.subtitle}>Registrar compra de mercadería</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Selector de Producto */}
          <Card>
            <Text style={styles.fieldLabel}>Producto a ingresar *</Text>
            <TouchableOpacity
              style={styles.productPickerBtn}
              onPress={() => {
                Keyboard.dismiss();
                setModalVisible(true);
              }}
              activeOpacity={0.75}
            >
              {cargandoProductos ? (
                <ActivityIndicator size="small" color={Colors.brand} />
              ) : productoSeleccionado ? (
                <View style={styles.selectedRow}>
                  <View
                    style={[
                      styles.thumb,
                      { backgroundColor: productoSeleccionado.pedestalColor || '#F7F1E8' },
                    ]}
                  >
                    {productoSeleccionado.foto_url || productoSeleccionado.fotoUrl ? (
                      <Image
                        source={{
                          uri: productoSeleccionado.foto_url || productoSeleccionado.fotoUrl,
                        }}
                        style={styles.thumbImg}
                      />
                    ) : (
                      <Icon name="package" size={18} color={Colors.brand} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectedName} numberOfLines={1}>
                      {productoSeleccionado.nombre}
                    </Text>
                    <Text style={styles.selectedMeta}>
                      {productoSeleccionado.marca ? `${productoSeleccionado.marca} · ` : ''}
                      Stock actual: {stockActual} pzas
                    </Text>
                  </View>
                  <Icon name="chevron-down" size={16} color={Colors.stone} />
                </View>
              ) : (
                <View style={styles.selectedRow}>
                  <Text style={styles.placeholderText}>Toca para elegir un producto...</Text>
                  <Icon name="chevron-down" size={16} color={Colors.stone} />
                </View>
              )}
            </TouchableOpacity>

            {/* Cantidad con Stepper y Chips Rápidos, y Costo */}
            <View style={styles.grid2}>
              <View style={{ flex: 1 }}>
                <View style={fieldStyles.field}>
                  <Text style={fieldStyles.label}>Cantidad a ingresar *</Text>
                  <View style={fieldStyles.stepperWrap}>
                    <TouchableOpacity
                      style={fieldStyles.stepperBtn}
                      onPress={() => {
                        const cur = parseInt(cantidad || '0', 10) || 0;
                        setCantidad(String(Math.max(1, cur - 1)));
                      }}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Icon name="minus" size={13} color={Colors.ink} />
                    </TouchableOpacity>
                    <TextInput
                      style={fieldStyles.stepperInput}
                      value={cantidad}
                      onChangeText={setCantidad}
                      placeholder="10"
                      placeholderTextColor={Colors.stone}
                      keyboardType="number-pad"
                      textAlign="center"
                    />
                    <TouchableOpacity
                      style={fieldStyles.stepperBtn}
                      onPress={() => {
                        const cur = parseInt(cantidad || '0', 10) || 0;
                        setCantidad(String(cur + 1));
                      }}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Icon name="plus" size={13} color={Colors.ink} />
                    </TouchableOpacity>
                  </View>
                  {/* Chips rápidos de cantidad */}
                  <View style={styles.chipsRow}>
                    {[1, 5, 10, 20].map((n) => (
                      <TouchableOpacity
                        key={n}
                        style={styles.qtyChip}
                        onPress={() => {
                          const cur = parseInt(cantidad || '0', 10) || 0;
                          setCantidad(String(cur + n));
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.qtyChipText}>+{n}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="Nuevo costo unitario *"
                  value={costoUnitario}
                  onChangeText={setCostoUnitario}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  prefix="$"
                />
              </View>
            </View>

            <Field
              label="Proveedor (opcional)"
              value={proveedor}
              onChangeText={setProveedor}
              placeholder="Ej. Distribuidora Belleza"
              autoCapitalize="words"
            />

            <Field
              label="Fecha del movimiento"
              value={new Date().toLocaleDateString('es-MX', {
                weekday: 'short',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              editable={false}
            />
          </Card>

          {/* Tarjeta de Resumen y Stock Resultante */}
          <Card soft style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View>
                <Text style={styles.summaryLabel}>Stock resultante</Text>
                <View style={styles.stockCompRow}>
                  <Text style={styles.stockOld}>{stockActual}</Text>
                  <Text style={styles.stockArrow}>→</Text>
                  <Text style={styles.stockNew}>{stockResultante} pzas</Text>
                </View>
              </View>
              <Badge
                variant="ok"
                label={cantNum > 0 ? `+${cantNum} pzas` : '0 pzas'}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.summaryTotalRow}>
              <Text style={styles.totalLabel}>Inversión estimada de compra:</Text>
              <Text style={styles.totalVal}>${totalInversion.toFixed(2)}</Text>
            </View>
            <Text style={styles.costoNote}>
              * El costo de referencia del producto se actualizará automáticamente a ${costoNum.toFixed(2)}.
            </Text>
          </Card>

          {/* Botón de Acción */}
          <Button
            label="Registrar entrada"
            onPress={handleRegistrar}
            loading={guardando}
            disabled={!productoSeleccionado || cantNum <= 0}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal Selector de Producto */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar producto</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeModalBtn}
              >
                <Icon name="close" size={18} color={Colors.ink} />
              </TouchableOpacity>
            </View>

            {/* Buscador dentro del modal */}
            <View style={styles.modalSearchBox}>
              <Icon name="search" size={15} color={Colors.stone} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Buscar por nombre o marca..."
                placeholderTextColor={Colors.stone}
                value={busquedaModal}
                onChangeText={setBusquedaModal}
              />
              {busquedaModal.length > 0 && (
                <TouchableOpacity onPress={() => setBusquedaModal('')}>
                  <Icon name="close" size={14} color={Colors.stone} />
                </TouchableOpacity>
              )}
            </View>

            {/* Opción para crear nuevo producto */}
            <TouchableOpacity
              style={styles.createNewBtn}
              onPress={() => {
                setModalVisible(false);
                router.push('/producto/nuevo');
              }}
              activeOpacity={0.7}
            >
              <View style={styles.createIconCircle}>
                <Icon name="plus" size={16} color={Colors.brand} />
              </View>
              <Text style={styles.createNewText}>+ Crear nuevo producto en catálogo</Text>
            </TouchableOpacity>

            {/* Lista de productos */}
            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {productosFiltrados.length === 0 ? (
                <View style={styles.emptyList}>
                  <Icon name="package" size={28} color={Colors.stone} />
                  <Text style={styles.emptyListText}>No se encontraron productos</Text>
                </View>
              ) : (
                productosFiltrados.map((p, idx) => {
                  const isSelected = productoSeleccionado?.id === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[
                        styles.modalProdItem,
                        isSelected && styles.modalProdItemSelected,
                        idx === 0 && { borderTopWidth: 0 },
                      ]}
                      onPress={() => seleccionarProducto(p)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.modalThumb,
                          { backgroundColor: p.pedestalColor || p.pedestal_color || '#F7F1E8' },
                        ]}
                      >
                        {p.foto_url || p.fotoUrl ? (
                          <Image
                            source={{ uri: p.foto_url || p.fotoUrl }}
                            style={styles.thumbImg}
                          />
                        ) : (
                          <Icon name="package" size={16} color={Colors.brand} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalProdName} numberOfLines={1}>
                          {p.nombre}
                        </Text>
                        <Text style={styles.modalProdMeta}>
                          {p.marca ? `${p.marca} · ` : ''}Costo actual: ${p.costo ?? 0}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Badge
                          variant={parseInt(p.stock, 10) <= 3 ? 'low' : 'ok'}
                          label={`${p.stock} pzas`}
                        />
                        {isSelected && <Icon name="check" size={14} color={Colors.brand} />}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  prefix,
  editable = true,
  autoCapitalize = 'none',
}) {
  return (
    <View style={fieldStyles.field}>
      <Text style={fieldStyles.label}>{label}</Text>
      <View style={fieldStyles.inputRow}>
        {prefix ? <Text style={fieldStyles.prefix}>{prefix}</Text> : null}
        <TextInput
          style={[
            fieldStyles.input,
            prefix && { paddingLeft: 24 },
            !editable && { backgroundColor: Colors.stoneLight, color: Colors.inkSoft },
          ]}
          placeholder={placeholder}
          placeholderTextColor={Colors.stone}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType || 'default'}
          editable={editable}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
        />
      </View>
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  field: { marginBottom: 12 },
  label: {
    fontSize: 10.5,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.inkSoft,
    marginBottom: 5,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', position: 'relative' },
  prefix: {
    fontSize: 13,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.brand,
    position: 'absolute',
    left: 10,
    zIndex: 2,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radii.input,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
    backgroundColor: Colors.creamSoft,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: Colors.ink,
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.creamSoft,
    borderRadius: Radii.input,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
    overflow: 'hidden',
  },
  stepperBtn: {
    width: 34,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  stepperInput: {
    flex: 1,
    height: 38,
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.ink,
    paddingHorizontal: 2,
  },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
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
  content: { padding: 18, paddingBottom: 40, gap: 12 },
  grid2: { flexDirection: 'row', gap: 10 },
  fieldLabel: {
    fontSize: 10.5,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.inkSoft,
    marginBottom: 5,
  },
  productPickerBtn: {
    borderWidth: 1,
    borderColor: Colors.stoneLight,
    borderRadius: Radii.input,
    backgroundColor: Colors.creamSoft,
    padding: 10,
    marginBottom: 12,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  thumb: {
    width: 42,
    height: 42,
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  selectedName: {
    fontSize: 13,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.ink,
  },
  selectedMeta: {
    fontSize: 11,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.inkSoft,
    marginTop: 1,
  },
  placeholderText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.stone,
  },
  summaryCard: {
    padding: 14,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 10.5,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.inkSoft,
    textTransform: 'uppercase',
  },
  stockCompRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 2,
  },
  stockOld: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 16,
    color: Colors.stone,
    textDecorationLine: 'line-through',
  },
  stockArrow: {
    fontSize: 14,
    color: Colors.stone,
  },
  stockNew: {
    fontFamily: 'Fraunces_500Medium',
    fontSize: 20,
    color: Colors.ink,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.stoneLight,
    marginVertical: 4,
  },
  summaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 12,
    fontFamily: 'Montserrat_600SemiBold',
    color: Colors.inkSoft,
  },
  totalVal: {
    fontFamily: 'Fraunces_500Medium',
    fontSize: 16,
    color: Colors.brand,
  },
  costoNote: {
    fontSize: 9.5,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.stone,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.stoneLight,
    paddingTop: 16,
    paddingHorizontal: 18,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 15,
    fontFamily: 'Montserrat_800ExtraBold',
    color: Colors.ink,
  },
  closeModalBtn: {
    padding: 4,
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.creamSoft,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 10,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.ink,
  },
  createNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 6,
    marginBottom: 6,
  },
  createIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.creamSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createNewText: {
    fontSize: 12,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.brand,
  },
  modalList: {
    maxHeight: 340,
  },
  modalProdItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.stoneLight,
  },
  modalProdItemSelected: {
    backgroundColor: Colors.creamSoft,
    borderRadius: 8,
    paddingHorizontal: 6,
  },
  modalThumb: {
    width: 38,
    height: 38,
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalProdName: {
    fontSize: 12.5,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.ink,
  },
  modalProdMeta: {
    fontSize: 10.5,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.stone,
    marginTop: 1,
  },
  emptyList: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  emptyListText: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.stone,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
  },
  qtyChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
  },
  qtyChipText: {
    fontSize: 10,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.brand,
  },
});
