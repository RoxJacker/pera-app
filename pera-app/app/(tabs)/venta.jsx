import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TopBar from '../../src/components/layout/TopBar';
import CartBar from '../../src/components/ui/CartBar';
import Button from '../../src/components/ui/Button';
import Icon from '../../src/components/ui/Icon';
import { Colors, Radii } from '../../src/theme';
import { obtenerProductos } from '../../src/services/productosService';
import { obtenerServicios } from '../../src/services/serviciosService';
import { procesarVenta } from '../../src/services/ventasService';

const CATEGORIAS_BASE = ['Todos', 'Coloración', 'Decoloración', 'Cuidado', 'Estilizado', 'Uñas', 'Servicios'];
const METODOS_PAGO = ['Efectivo', 'Tarjeta', 'Transferencia'];
const BILLETES_RAPIDOS = [100, 200, 500, 1000];

export default function POSView() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const [busqueda, setBusqueda] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [carrito, setCarrito] = useState([]);
  const [productos, setProductos] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [servicioPrecargadoId, setServicioPrecargadoId] = useState(null);
  const [avisoCita, setAvisoCita] = useState(null);

  // Estado del Modal de Cobro
  const [modalCobroVisible, setModalCobroVisible] = useState(false);
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [clienteNombreVenta, setClienteNombreVenta] = useState('');
  const [procesandoVenta, setProcesandoVenta] = useState(false);

  const cargarItems = async () => {
    try {
      const [prods, servs] = await Promise.all([
        obtenerProductos(),
        obtenerServicios(),
      ]);
      setProductos(prods || []);
      setServicios(servs || []);

      // Si viene desde la Agenda para cobrar una cita
      if (params?.servicioId && params.servicioId !== servicioPrecargadoId) {
        const servEncontrado = servs?.find(s => String(s.id) === String(params.servicioId));
        if (servEncontrado) {
          const itemServicio = {
            ...servEncontrado,
            tipo: 'servicio',
            precioVenta: servEncontrado.precio,
            pedestalColor: servEncontrado.pedestalColor || servEncontrado.pedestal_color || '#EBD9CC',
            fotoUrl: null,
          };
          setCarrito(prev => {
            const existe = prev.find(c => c.id === itemServicio.id);
            if (existe) {
              return prev.map(c => (c.id === itemServicio.id ? { ...c, cantidad: c.cantidad + 1 } : c));
            }
            return [...prev, { ...itemServicio, cantidad: 1 }];
          });
          setServicioPrecargadoId(params.servicioId);
          if (params.clienteNombre) {
            setClienteNombreVenta(params.clienteNombre);
            setAvisoCita(`Servicio de la cita de "${params.clienteNombre}" agregado al carrito.`);
          }
        }
      }
    } catch (e) {
      console.warn('Error cargando catálogo en POS:', e);
    } finally {
      setCargando(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarItems();
    }, [params?.servicioId])
  );

  const todosItems = [
    ...productos.map(p => ({
      ...p,
      tipo: 'producto',
      precioVenta: p.precioVenta ?? p.precio_venta ?? 0,
      stock: parseInt(p.stock || 0, 10),
      pedestalColor: p.pedestalColor || p.pedestal_color || '#F7F1E8',
      fotoUrl: p.foto_url || p.fotoUrl,
    })),
    ...servicios.map(s => ({
      ...s,
      tipo: 'servicio',
      precioVenta: s.precio,
      stock: 9999, // servicios no limitan stock
      pedestalColor: s.pedestalColor || s.pedestal_color || '#EBD9CC',
      fotoUrl: null,
    })),
  ];

  const itemsFiltrados = todosItems.filter(item => {
    const q = busqueda.toLowerCase().trim();
    const matchBusqueda = !q || (item.nombre && item.nombre.toLowerCase().includes(q));
    const matchCategoria =
      categoriaActiva === 'Todos' ||
      (categoriaActiva === 'Servicios' && item.tipo === 'servicio') ||
      item.categoria === categoriaActiva;
    return matchBusqueda && matchCategoria;
  });

  const agregarAlCarrito = (item) => {
    // Validar stock antes de agregar producto
    if (item.tipo === 'producto' && item.stock <= 0) {
      Alert.alert('Sin existencias', `El producto "${item.nombre}" está agotado en inventario.`);
      return;
    }

    setCarrito(prev => {
      const existe = prev.find(c => c.id === item.id);
      if (existe) {
        if (item.tipo === 'producto' && existe.cantidad >= item.stock) {
          Alert.alert('Límite de stock', `Solo hay ${item.stock} piezas disponibles de "${item.nombre}".`);
          return prev;
        }
        return prev.map(c => (c.id === item.id ? { ...c, cantidad: c.cantidad + 1 } : c));
      }
      return [...prev, { ...item, cantidad: 1 }];
    });
  };

  const modificarCantidad = (item, delta) => {
    setCarrito(prev => {
      const actual = prev.find(c => c.id === item.id);
      if (!actual) return prev;

      const nuevaCantidad = actual.cantidad + delta;
      if (nuevaCantidad <= 0) {
        return prev.filter(c => c.id !== item.id);
      }

      if (item.tipo === 'producto' && nuevaCantidad > item.stock) {
        Alert.alert('Límite de stock', `Solo hay ${item.stock} piezas disponibles de este producto.`);
        return prev;
      }

      return prev.map(c => (c.id === item.id ? { ...c, cantidad: nuevaCantidad } : c));
    });
  };

  const eliminarDelCarrito = (id) => {
    setCarrito(prev => prev.filter(c => c.id !== id));
  };

  const totalCarrito = carrito.reduce((s, c) => s + c.precioVenta * c.cantidad, 0);
  const itemsEnCarrito = carrito.reduce((s, c) => s + c.cantidad, 0);

  // Cálculos de cambio para efectivo
  const montoRecibidoNum = parseFloat(montoRecibido || '0');
  const cambioEfectivo = montoRecibidoNum >= totalCarrito ? montoRecibidoNum - totalCarrito : 0;
  const montoInsuficiente = metodoPago === 'Efectivo' && montoRecibido.trim() !== '' && montoRecibidoNum < totalCarrito;

  const abrirModalCobro = () => {
    if (carrito.length === 0) return;
    setMontoRecibido(String(totalCarrito));
    setModalCobroVisible(true);
  };

  const handleConfirmarVenta = async () => {
    if (carrito.length === 0) return;

    if (metodoPago === 'Efectivo' && montoRecibidoNum < totalCarrito) {
      Alert.alert('Pago incompleto', 'El monto recibido en efectivo es menor al total a pagar.');
      return;
    }

    setProcesandoVenta(true);
    try {
      const res = await procesarVenta({
        items: carrito,
        metodoPago,
        clienteNombre: clienteNombreVenta || params?.clienteNombre || null,
      });

      // Éxito: limpiar carrito y navegar al ticket
      setCarrito([]);
      setModalCobroVisible(false);
      setAvisoCita(null);
      setClienteNombreVenta('');

      // Recargar catálogo para refrescar los stocks locales
      await cargarItems();

      router.push({
        pathname: '/ticket',
        params: { ventaId: res.venta_id },
      });
    } catch (err) {
      console.error('Error al procesar venta:', err);
      Alert.alert('No se pudo procesar la venta', err.message || 'Verifica el stock disponible e intenta de nuevo.');
    } finally {
      setProcesandoVenta(false);
    }
  };

  return (
    <View style={styles.screen}>
      <TopBar title="Nueva venta" subtitle="Selecciona productos o servicios" />

      {/* Aviso de cita precargada */}
      {avisoCita && (
        <View style={styles.citaAvisoContainer}>
          <Icon name="sparkles" size={15} color={Colors.brand} />
          <Text style={styles.citaAvisoText}>{avisoCita}</Text>
          <TouchableOpacity onPress={() => setAvisoCita(null)} style={styles.citaAvisoClose}>
            <Icon name="close" size={13} color={Colors.inkSoft} />
          </TouchableOpacity>
        </View>
      )}

      {/* Buscador */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Icon name="search" size={15} color={Colors.stone} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar producto o servicio..."
            placeholderTextColor={Colors.stone}
            value={busqueda}
            onChangeText={setBusqueda}
          />
          {busqueda.length > 0 && (
            <TouchableOpacity onPress={() => setBusqueda('')} style={styles.clearBtn}>
              <Icon name="close" size={14} color={Colors.stone} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs de categoría */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContent}
      >
        {CATEGORIAS_BASE.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.tab, categoriaActiva === cat && styles.tabActive]}
            onPress={() => setCategoriaActiva(cat)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, categoriaActiva === cat && styles.tabTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Grid de productos */}
      <ScrollView
        style={styles.grid}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
      >
        {cargando ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Colors.brand} />
            <Text style={styles.loadingText}>Cargando catálogo...</Text>
          </View>
        ) : itemsFiltrados.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={{ marginBottom: 6 }}>
              <Icon name="search" size={32} color={Colors.stone} />
            </View>
            <Text style={styles.emptyTitle}>No hay resultados</Text>
            <Text style={styles.emptySubtitle}>Intenta con otra búsqueda o categoría</Text>
          </View>
        ) : (
          <View style={styles.grid3}>
            {itemsFiltrados.map(item => {
              const enCarrito = carrito.find(c => c.id === item.id);
              const agotado = item.tipo === 'producto' && item.stock <= 0;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.prodCard,
                    enCarrito && styles.prodCardInCart,
                    agotado && styles.prodCardAgotado,
                  ]}
                  onPress={() => agregarAlCarrito(item)}
                  activeOpacity={0.75}
                  disabled={agotado}
                >
                  {/* Badge de cantidad en carrito */}
                  {enCarrito && (
                    <View style={styles.cartBadge}>
                      <Text style={styles.cartBadgeText}>{enCarrito.cantidad}</Text>
                    </View>
                  )}

                  {/* Foto o Pedestal */}
                  <View style={[styles.pedestal, { backgroundColor: item.pedestalColor }]}>
                    {item.fotoUrl ? (
                      <Image source={{ uri: item.fotoUrl }} style={styles.pedestalImg} />
                    ) : item.tipo === 'servicio' ? (
                      <Icon name="sparkles" size={22} color={Colors.brand} />
                    ) : (
                      <Icon name="package" size={22} color={Colors.stone} />
                    )}
                  </View>

                  <Text style={styles.prodName} numberOfLines={2}>
                    {item.nombre}
                  </Text>

                  {agotado ? (
                    <Text style={styles.agotadoText}>Agotado</Text>
                  ) : (
                    <Text style={styles.prodPrice}>${item.precioVenta}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* CartBar flotante */}
      <CartBar
        itemCount={itemsEnCarrito}
        total={totalCarrito}
        onPress={abrirModalCobro}
      />

      {/* MODAL / BOTTOM SHEET DE COBRO Y CARRITO */}
      <Modal
        visible={modalCobroVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalCobroVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 16) + 10 }]}>
            {/* Cabecera del modal */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Carrito de Venta</Text>
                <Text style={styles.modalSubtitle}>
                  {itemsEnCarrito} item{itemsEnCarrito !== 1 ? 's' : ''} seleccionado{itemsEnCarrito !== 1 ? 's' : ''}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalCobroVisible(false)}
                style={styles.closeBtn}
                activeOpacity={0.7}
              >
                <Icon name="close" size={18} color={Colors.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalContentScroll}
              keyboardShouldPersistTaps="handled"
            >
              {/* Lista de items en el carrito */}
              <View style={styles.cartItemsList}>
                {carrito.map(item => (
                  <View key={item.id} style={styles.cartItemRow}>
                    <View style={styles.cartItemLeft}>
                      <View
                        style={[
                          styles.cartItemThumb,
                          { backgroundColor: item.pedestalColor || Colors.creamSoft },
                        ]}
                      >
                        {item.fotoUrl ? (
                          <Image source={{ uri: item.fotoUrl }} style={styles.cartItemThumbImg} />
                        ) : (
                          <Icon
                            name={item.tipo === 'servicio' ? 'sparkles' : 'package'}
                            size={16}
                            color={Colors.brand}
                          />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cartItemName} numberOfLines={1}>
                          {item.nombre}
                        </Text>
                        <Text style={styles.cartItemUnitPrice}>
                          ${item.precioVenta} c/u · Subtotal: ${(item.precioVenta * item.cantidad).toFixed(2)}
                        </Text>
                      </View>
                    </View>

                    {/* Controles de Cantidad */}
                    <View style={styles.cartItemControls}>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => modificarCantidad(item, -1)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Icon name="minus" size={13} color={Colors.ink} />
                      </TouchableOpacity>

                      <Text style={styles.qtyText}>{item.cantidad}</Text>

                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => modificarCantidad(item, 1)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Icon name="plus" size={13} color={Colors.ink} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.deleteItemBtn}
                        onPress={() => eliminarDelCarrito(item.id)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Icon name="trash" size={14} color={Colors.rose} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>

              {/* Selector de Método de Pago */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>Método de pago *</Text>
                <View style={styles.metodosRow}>
                  {METODOS_PAGO.map(m => {
                    const activo = metodoPago === m;
                    const iconName = m === 'Efectivo' ? 'dollar' : m === 'Tarjeta' ? 'credit-card' : 'repeat';
                    return (
                      <TouchableOpacity
                        key={m}
                        style={[styles.metodoBtn, activo && styles.metodoBtnActivo]}
                        onPress={() => setMetodoPago(m)}
                        activeOpacity={0.7}
                      >
                        <Icon
                          name={iconName}
                          size={15}
                          color={activo ? Colors.brandText : Colors.brand}
                        />
                        <Text style={[styles.metodoText, activo && styles.metodoTextActivo]}>
                          {m}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Calculadora de Efectivo y Cambio */}
              {metodoPago === 'Efectivo' && (
                <View style={styles.efectivoBox}>
                  <View style={styles.efectivoInputsRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.efectivoLabel}>Paga con ($)</Text>
                      <TextInput
                        style={styles.efectivoInput}
                        placeholder={String(totalCarrito)}
                        placeholderTextColor={Colors.stone}
                        keyboardType="decimal-pad"
                        value={montoRecibido}
                        onChangeText={setMontoRecibido}
                      />
                    </View>

                    <View style={styles.cambioContainer}>
                      <Text style={styles.cambioLabel}>Cambio</Text>
                      <Text
                        style={[
                          styles.cambioValor,
                          montoInsuficiente && styles.cambioInsuficiente,
                        ]}
                      >
                        {montoInsuficiente ? 'Incompleto' : `$${cambioEfectivo.toFixed(2)}`}
                      </Text>
                    </View>
                  </View>

                  {/* Chips rápidos de billetes */}
                  <View style={styles.billetesChipsRow}>
                    {BILLETES_RAPIDOS.map(billete => (
                      <TouchableOpacity
                        key={billete}
                        style={styles.billeteChip}
                        onPress={() => setMontoRecibido(String(billete))}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.billeteChipText}>
                          {billete === totalCarrito ? 'Exacto' : `$${billete}`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Nombre de la clienta (opcional) */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>Nombre de la clienta (opcional)</Text>
                <TextInput
                  style={styles.clienteInput}
                  placeholder="Ej. María López"
                  placeholderTextColor={Colors.stone}
                  value={clienteNombreVenta}
                  onChangeText={setClienteNombreVenta}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>

              {/* Resumen Total y Botón de Cobro */}
              <View style={styles.cobroFooter}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total a cobrar:</Text>
                  <Text style={styles.totalMonto}>${totalCarrito.toFixed(2)}</Text>
                </View>

                <Button
                  label={`Confirmar venta · $${totalCarrito.toFixed(2)}`}
                  onPress={handleConfirmarVenta}
                  loading={procesandoVenta}
                  disabled={procesandoVenta || montoInsuficiente}
                />
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
  citaAvisoContainer: {
    marginHorizontal: 18,
    marginTop: 6,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.sageBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4E5A3840',
  },
  citaAvisoText: {
    flex: 1,
    fontSize: 11.5,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#4E5A38',
  },
  citaAvisoClose: {
    padding: 3,
  },
  searchContainer: { paddingHorizontal: 18, paddingVertical: 10 },
  searchBox: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.ink,
  },
  clearBtn: { padding: 4 },
  tabsScroll: { flexGrow: 0 },
  tabsContent: { paddingHorizontal: 18, gap: 6, paddingBottom: 10 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
    backgroundColor: Colors.surface,
  },
  tabActive: { backgroundColor: Colors.brand, borderColor: Colors.brand },
  tabText: { fontSize: 11.5, fontFamily: 'Montserrat_700Bold', color: Colors.inkSoft },
  tabTextActive: { color: Colors.brandText },
  grid: { flex: 1 },
  gridContent: { paddingHorizontal: 18, paddingBottom: 160 },
  grid3: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  prodCard: {
    width: '31%',
    backgroundColor: Colors.surface,
    borderRadius: Radii.prodCard,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
    padding: 10,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
    position: 'relative',
    minHeight: 120,
    justifyContent: 'space-between',
  },
  prodCardInCart: {
    borderColor: Colors.brand,
    borderWidth: 1.5,
  },
  prodCardAgotado: {
    opacity: 0.5,
  },
  cartBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: Colors.brand,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    borderWidth: 1.5,
    borderColor: Colors.surface,
  },
  cartBadgeText: {
    color: Colors.brandText,
    fontSize: 10,
    fontFamily: 'Montserrat_700Bold',
  },
  pedestal: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginBottom: 6,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pedestalImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  prodName: {
    fontSize: 10.5,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.ink,
    textAlign: 'center',
    lineHeight: 13,
  },
  prodPrice: {
    fontFamily: 'Fraunces_500Medium',
    fontSize: 13.5,
    color: Colors.brand,
    marginTop: 2,
  },
  agotadoText: {
    fontSize: 10,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.rose,
    marginTop: 2,
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
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.ink,
  },
  emptySubtitle: {
    fontSize: 11,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.inkSoft,
  },

  // Modal de Cobro
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
    fontSize: 16,
    fontFamily: 'Montserrat_800ExtraBold',
    color: Colors.ink,
  },
  modalSubtitle: {
    fontSize: 11,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.stone,
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
  },
  modalContentScroll: {
    padding: 20,
    gap: 16,
  },
  cartItemsList: {
    gap: 10,
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cream,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
  },
  cartItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  cartItemThumb: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartItemThumbImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cartItemName: {
    fontSize: 12.5,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.ink,
  },
  cartItemUnitPrice: {
    fontSize: 10.5,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.stone,
    marginTop: 1,
  },
  cartItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: 13,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.ink,
    minWidth: 16,
    textAlign: 'center',
  },
  deleteItemBtn: {
    padding: 4,
    marginLeft: 4,
  },
  sectionBlock: {
    gap: 6,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metodosRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metodoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radii.pill,
    backgroundColor: Colors.cream,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
  },
  metodoBtnActivo: {
    backgroundColor: Colors.brand,
    borderColor: Colors.brand,
  },
  metodoText: {
    fontSize: 11.5,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.inkSoft,
  },
  metodoTextActivo: {
    color: Colors.brandText,
  },
  efectivoBox: {
    backgroundColor: Colors.cream,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
    gap: 10,
  },
  efectivoInputsRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  efectivoLabel: {
    fontSize: 11,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.inkSoft,
    marginBottom: 4,
  },
  efectivoInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    fontFamily: 'Fraunces_500Medium',
    color: Colors.ink,
  },
  cambioContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  cambioLabel: {
    fontSize: 11,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.stone,
  },
  cambioValor: {
    fontSize: 18,
    fontFamily: 'Fraunces_500Medium',
    color: '#4E5A38',
    marginTop: 2,
  },
  cambioInsuficiente: {
    fontSize: 12,
    color: Colors.rose,
    fontFamily: 'Montserrat_700Bold',
  },
  billetesChipsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  billeteChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
  },
  billeteChipText: {
    fontSize: 11,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.ink,
  },
  billeteExactoChip: {
    backgroundColor: Colors.sageBg,
    borderColor: '#4E5A3840',
  },
  billeteExactoText: {
    fontSize: 11,
    fontFamily: 'Montserrat_700Bold',
    color: '#4E5A38',
  },
  clienteInput: {
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
  cobroFooter: {
    gap: 12,
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.stoneLight,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.inkSoft,
  },
  totalMonto: {
    fontFamily: 'Fraunces_500Medium',
    fontSize: 24,
    color: Colors.brand,
  },
});
