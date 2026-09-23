import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Card from '../../src/components/ui/Card';
import Button from '../../src/components/ui/Button';
import Icon from '../../src/components/ui/Icon';
import { Colors, Radii } from '../../src/theme';
import {
  obtenerProductoPorId,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
} from '../../src/services/productosService';

const CATEGORIAS = [
  'Coloración',
  'Decoloración',
  'Cuidado',
  'Estilizado',
  'Herramientas',
  'Uñas',
  'General',
];

const COLORES_PEDESTAL = [
  { label: 'Crema', hex: '#F7F1E8' },
  { label: 'Ámbar', hex: '#F5E3C4' },
  { label: 'Terra', hex: '#F3DFD5' },
  { label: 'Salvia', hex: '#E7EBDC' },
  { label: 'Piedra', hex: '#E4D9CB' },
];

export default function ProductoView() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const esNuevo = id === 'nuevo';

  const [cargando, setCargando] = useState(!esNuevo);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  // Campos de formulario
  const [nombre, setNombre] = useState('');
  const [marca, setMarca] = useState('');
  const [categoria, setCategoria] = useState('General');
  const [costo, setCosto] = useState('');
  const [precioVenta, setPrecioVenta] = useState('');
  const [stock, setStock] = useState('0');
  const [stockMinimo, setStockMinimo] = useState('3');
  const [fotoUri, setFotoUri] = useState(null);
  const [pedestalColor, setPedestalColor] = useState('#F7F1E8');

  // Modal para seleccionar categoría
  const [modalCatVisible, setModalCatVisible] = useState(false);

  useEffect(() => {
    if (!esNuevo) {
      cargarProducto();
    }
  }, [id]);

  const cargarProducto = async () => {
    setCargando(true);
    try {
      const prod = await obtenerProductoPorId(id);
      if (prod) {
        setNombre(prod.nombre || '');
        setMarca(prod.marca || '');
        setCategoria(prod.categoria || 'General');
        setCosto(prod.costo != null ? String(prod.costo) : '');
        setPrecioVenta(
          prod.precioVenta != null
            ? String(prod.precioVenta)
            : prod.precio_venta != null
            ? String(prod.precio_venta)
            : ''
        );
        setStock(String(prod.stock ?? 0));
        setStockMinimo(String(prod.stockMinimo ?? prod.stock_minimo ?? 3));
        setFotoUri(prod.foto_url || prod.fotoUrl || null);
        setPedestalColor(prod.pedestalColor || prod.pedestal_color || '#F7F1E8');
      } else {
        Alert.alert('No encontrado', 'El producto solicitado no existe.', [
          { text: 'Volver', onPress: () => router.back() },
        ]);
      }
    } catch (e) {
      console.warn('Error al cargar producto:', e);
    } finally {
      setCargando(false);
    }
  };

  const seleccionarFoto = async () => {
    try {
      const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permiso.granted) {
        Alert.alert(
          'Permiso requerido',
          'Necesitamos acceso a tus fotos para añadir una imagen del producto.'
        );
        return;
      }

      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!resultado.canceled && resultado.assets?.[0]?.uri) {
        setFotoUri(resultado.assets[0].uri);
      }
    } catch (error) {
      console.warn('Error seleccionando imagen:', error);
    }
  };

  const tomarFoto = async () => {
    try {
      const permiso = await ImagePicker.requestCameraPermissionsAsync();
      if (!permiso.granted) {
        Alert.alert(
          'Permiso requerido',
          'Necesitamos acceso a la cámara para tomar la foto del producto.'
        );
        return;
      }

      const resultado = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!resultado.canceled && resultado.assets?.[0]?.uri) {
        setFotoUri(resultado.assets[0].uri);
      }
    } catch (error) {
      console.warn('Error tomando foto:', error);
    }
  };

  const mostrarOpcionesFoto = () => {
    Alert.alert('Foto del producto', 'Selecciona el origen de la foto', [
      { text: 'Cámara', onPress: tomarFoto },
      { text: 'Galería de fotos', onPress: seleccionarFoto },
      fotoUri ? { text: 'Quitar foto', style: 'destructive', onPress: () => setFotoUri(null) } : null,
      { text: 'Cancelar', style: 'cancel' },
    ].filter(Boolean));
  };

  const handleGuardar = async () => {
    if (!nombre.trim()) {
      Alert.alert('Campo obligatorio', 'Por favor ingresa el nombre del producto.');
      return;
    }
    if (!precioVenta.trim() || isNaN(parseFloat(precioVenta))) {
      Alert.alert('Precio inválido', 'Por favor ingresa un precio de venta numérico válido.');
      return;
    }

    setGuardando(true);
    try {
      const payload = {
        nombre: nombre.trim(),
        marca: marca.trim(),
        categoria,
        costo: parseFloat(costo) || 0,
        precioVenta: parseFloat(precioVenta) || 0,
        stock: parseInt(stock, 10) || 0,
        stockMinimo: parseInt(stockMinimo, 10) || 3,
        pedestalColor,
      };

      if (esNuevo) {
        await crearProducto(payload, fotoUri);
        Alert.alert('¡Listo!', 'Producto creado correctamente.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        await actualizarProducto(id, payload, fotoUri);
        Alert.alert('¡Listo!', 'Cambios guardados correctamente.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (err) {
      console.error('Error guardando producto:', err);
      Alert.alert('Error', 'No se pudo guardar el producto. Inténtalo de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = () => {
    Alert.alert(
      'Eliminar producto',
      `¿Estás segura de eliminar "${nombre}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setEliminando(true);
            try {
              await eliminarProducto(id);
              Alert.alert('Eliminado', 'El producto ha sido eliminado.', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (err) {
              Alert.alert('Error', 'No se pudo eliminar el producto.');
            } finally {
              setEliminando(false);
            }
          },
        },
      ]
    );
  };

  if (cargando) {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.brand} />
        <Text style={styles.loadingText}>Cargando información del producto...</Text>
      </View>
    );
  }

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
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.title}>{esNuevo ? 'Nuevo producto' : 'Editar producto'}</Text>
          {!esNuevo && <Text style={styles.subtitle} numberOfLines={1}>{nombre}</Text>}
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
          {/* Foto del producto */}
          <TouchableOpacity
            style={[styles.fotoArea, { backgroundColor: pedestalColor }]}
            onPress={mostrarOpcionesFoto}
            activeOpacity={0.85}
          >
            {fotoUri ? (
              <Image source={{ uri: fotoUri }} style={styles.fotoImg} />
            ) : (
              <View style={styles.fotoPlaceholder}>
                <Icon name="camera" size={30} color={Colors.brand} />
                <Text style={styles.fotoLabel}>Tocar para añadir foto</Text>
                <Text style={styles.fotoSub}>Cámara o Galería (~800px)</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Color de fondo / pedestal */}
          <View style={styles.pedestalSection}>
            <Text style={styles.sectionLabel}>Color de tarjeta</Text>
            <View style={styles.paletaRow}>
              {COLORES_PEDESTAL.map(c => (
                <TouchableOpacity
                  key={c.hex}
                  style={[
                    styles.paletaItem,
                    { backgroundColor: c.hex },
                    pedestalColor === c.hex && styles.paletaSelected,
                  ]}
                  onPress={() => setPedestalColor(c.hex)}
                >
                  {pedestalColor === c.hex && <Icon name="check" size={14} color={Colors.brand} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Formulario */}
          <Card>
            <Field
              label="Nombre del producto *"
              value={nombre}
              onChangeText={setNombre}
              placeholder="Ej. Tinte Igora 5.4"
              autoCapitalize="words"
            />

            <View style={styles.grid2}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Marca"
                  value={marca}
                  onChangeText={setMarca}
                  placeholder="Ej. Schwarzkopf"
                  autoCapitalize="words"
                />
              </View>
              <View style={{ flex: 1 }}>
                <TouchableOpacity
                  style={fieldStyles.field}
                  onPress={() => {
                    Keyboard.dismiss();
                    setModalCatVisible(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={fieldStyles.label}>Categoría</Text>
                  <View style={[fieldStyles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                    <Text style={{ fontSize: 13, fontFamily: 'Montserrat_400Regular', color: Colors.ink }}>
                      {categoria}
                    </Text>
                    <Icon name="chevron-down" size={14} color={Colors.stone} />
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.grid2}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Costo unitario ($)"
                  value={costo}
                  onChangeText={setCosto}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="Precio venta ($) *"
                  value={precioVenta}
                  onChangeText={setPrecioVenta}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.grid2}>
              <View style={{ flex: 1 }}>
                <StepperField
                  label="Stock actual (pzas)"
                  value={stock}
                  onChangeText={setStock}
                  placeholder="0"
                />
              </View>
              <View style={{ flex: 1 }}>
                <StepperField
                  label="Stock mínimo (alerta)"
                  value={stockMinimo}
                  onChangeText={setStockMinimo}
                  placeholder="3"
                  min={1}
                />
              </View>
            </View>
          </Card>

          {/* Botones de acción */}
          <Button
            label={esNuevo ? 'Guardar producto' : 'Guardar cambios'}
            onPress={handleGuardar}
            loading={guardando}
            disabled={eliminando}
          />

          {!esNuevo && (
            <Button
              variant="danger"
              label="Eliminar producto"
              onPress={handleEliminar}
              loading={eliminando}
              disabled={guardando}
              style={{ marginTop: 4 }}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal Selector de Categoría */}
      <Modal
        visible={modalCatVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalCatVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalCatVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecciona una categoría</Text>
            {CATEGORIAS.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.modalItem, categoria === cat && styles.modalItemSelected]}
                onPress={() => {
                  setCategoria(cat);
                  setModalCatVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.modalItemText,
                    categoria === cat && styles.modalItemTextSelected,
                  ]}
                >
                  {cat}
                </Text>
                {categoria === cat && <Icon name="check" size={14} color={Colors.brand} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType, autoCapitalize = 'none' }) {
  return (
    <View style={fieldStyles.field}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        style={fieldStyles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.stone}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
      />
    </View>
  );
}

function StepperField({ label, value, onChangeText, placeholder, min = 0 }) {
  const num = parseInt(value || '0', 10) || 0;
  const decrement = () => {
    const next = Math.max(min, num - 1);
    onChangeText(String(next));
  };
  const increment = () => {
    onChangeText(String(num + 1));
  };

  return (
    <View style={fieldStyles.field}>
      <Text style={fieldStyles.label}>{label}</Text>
      <View style={fieldStyles.stepperWrap}>
        <TouchableOpacity
          style={fieldStyles.stepperBtn}
          onPress={decrement}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="minus" size={13} color={Colors.ink} />
        </TouchableOpacity>
        <TextInput
          style={fieldStyles.stepperInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.stone}
          keyboardType="number-pad"
          textAlign="center"
        />
        <TouchableOpacity
          style={fieldStyles.stepperBtn}
          onPress={increment}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="plus" size={13} color={Colors.ink} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  field: { marginBottom: 13 },
  label: { fontSize: 10.5, fontFamily: 'Montserrat_700Bold', color: Colors.inkSoft, marginBottom: 5 },
  input: {
    width: '100%',
    paddingHorizontal: 12,
    paddingVertical: 11,
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
    width: 36,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  stepperInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.ink,
    paddingHorizontal: 4,
  },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  center: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 12, fontFamily: 'Montserrat_400Regular', color: Colors.inkSoft },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 20, color: Colors.brand, fontFamily: 'Montserrat_700Bold' },
  title: { fontSize: 17, fontFamily: 'Montserrat_800ExtraBold', color: Colors.ink, textAlign: 'center' },
  subtitle: { fontSize: 10.5, fontFamily: 'Montserrat_400Regular', color: Colors.inkSoft, textAlign: 'center' },
  content: { padding: 18, paddingBottom: 40, gap: 12 },
  grid2: { flexDirection: 'row', gap: 10 },
  fotoArea: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.stoneLight,
  },
  fotoImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  fotoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  fotoIcon: { fontSize: 32 },
  fotoLabel: { fontSize: 12, fontFamily: 'Montserrat_700Bold', color: Colors.brand },
  fotoSub: { fontSize: 10, fontFamily: 'Montserrat_400Regular', color: Colors.stone },
  pedestalSection: {
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 14,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.stone,
    textTransform: 'uppercase',
  },
  paletaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  paletaItem: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paletaSelected: {
    borderColor: Colors.brand,
    borderWidth: 2,
    transform: [{ scale: 1.08 }],
  },
  paletaCheck: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.brand,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
    padding: 18,
    gap: 6,
  },
  modalTitle: {
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.ink,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  modalItemSelected: {
    backgroundColor: Colors.creamSoft,
  },
  modalItemText: {
    fontSize: 13,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.ink,
  },
  modalItemTextSelected: {
    fontFamily: 'Montserrat_700Bold',
    color: Colors.brand,
  },
});
