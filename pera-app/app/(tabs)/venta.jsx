import { useState, useCallback, useMemo } from 'react';
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

const CATEGORIAS_BASE = ['Todos', 'Maquillaje', 'Cuidado Facial', 'Capilar', 'Depilación', 'Herramientas', 'Coloración', 'Decoloración', 'Cuidado', 'Estilizado', 'Uñas', 'General', 'Servicios'];
const METODOS_PAGO = ['Efectivo', 'Tarjeta', 'Transferencia'];
const BILLETES_RAPIDOS = [100, 200, 500, 1000];

function getHoyISO() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getAyerISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const DIAS_SEMANA_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function formatearFechaBonita(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const hoy = getHoyISO();
  const ayer = getAyerISO();
  const prefijo = iso === hoy ? 'Hoy · ' : iso === ayer ? 'Ayer · ' : '';
  const diaNom = date.toLocaleDateString('es-MX', { weekday: 'short' });
  const diaCap = diaNom.charAt(0).toUpperCase() + diaNom.slice(1);
  const mesNom = date.toLocaleDateString('es-MX', { month: 'short' });
  return `${prefijo}${diaCap}, ${d} de ${mesNom}`;
}

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

  // Fecha de la venta (soporte para ventas históricas)
  const [fechaVenta, setFechaVenta] = useState(getHoyISO());
  const [calendarioCobroVisible, setCalendarioCobroVisible] = useState(false);
  const [mesCalendarioCobro, setMesCalendarioCobro] = useState(new Date());

  // Estado del Modal de Venta Única
  const [modalVentaUnicaVisible, setModalVentaUnicaVisible] = useState(false);
  const [ventaUnicaNombre, setVentaUnicaNombre] = useState('');
  const [ventaUnicaPrecio, setVentaUnicaPrecio] = useState('');
  const [ventaUnicaError, setVentaUnicaError] = useState('');

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
            fotoUrl: servEncontrado.foto_url || servEncontrado.fotoUrl || null,
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
      fotoUrl: s.foto_url || s.fotoUrl || null,
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

  // Lógica del calendario de fecha de venta
  const cambiarMesCobro = (delta) => {
    setMesCalendarioCobro(prev => {
      const nuevo = new Date(prev);
      nuevo.setMonth(prev.getMonth() + delta);
      return nuevo;
    });
  };

  const diasDelMesCobro = useMemo(() => {
    const year = mesCalendarioCobro.getFullYear();
    const month = mesCalendarioCobro.getMonth();
    const primerDiaSemana = new Date(year, month, 1).getDay(); // 0 = Domingo
    const totalDias = new Date(year, month + 1, 0).getDate();

    const celdas = [];
    for (let i = 0; i < primerDiaSemana; i++) {
      celdas.push({ dia: null, iso: null });
    }
    for (let d = 1; d <= totalDias; d++) {
      const m = String(month + 1).padStart(2, '0');
      const diaStr = String(d).padStart(2, '0');
      celdas.push({
        dia: d,
        iso: `${year}-${m}-${diaStr}`,
      });
    }
    return celdas;
  }, [mesCalendarioCobro]);

  const seleccionarFechaCobro = (iso) => {
    if (!iso) return;
    setFechaVenta(iso);
    setCalendarioCobroVisible(false);
  };

  const abrirModalCobro = () => {
    if (carrito.length === 0) return;
    setMontoRecibido(String(totalCarrito));
    setFechaVenta(getHoyISO());
    setMesCalendarioCobro(new Date());
    setModalCobroVisible(true);
  };

  const abrirModalVentaUnica = () => {
    setVentaUnicaNombre('');
    setVentaUnicaPrecio('');
    setVentaUnicaError('');
    setModalVentaUnicaVisible(true);
  };

  const handleAgregarVentaUnica = () => {
    const nombre = ventaUnicaNombre.trim();
    const precio = parseFloat(ventaUnicaPrecio);

    if (!nombre) {
      setVentaUnicaError('Escribe un nombre para identificar la venta.');
      return;
    }
    if (!ventaUnicaPrecio.trim() || isNaN(precio) || precio <= 0) {
      setVentaUnicaError('Ingresa un precio válido mayor a $0.');
      return;
    }

    // Generar ID único para que pueda agregarse varias veces como ítems separados
    const idUnico = `unico_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const itemUnico = {
      id: idUnico,
      nombre,
      tipo: 'unico',
      precioVenta: precio,
      stock: 9999,
      pedestalColor: '#F3DFD5',
      fotoUrl: null,
      cantidad: 1,
    };

    setCarrito(prev => [...prev, itemUnico]);
    setModalVentaUnicaVisible(false);
  };

  const handleConfirmarVenta = async () => {
    if (carrito.length === 0) return;

    if (metodoPago === 'Efectivo' && montoRecibidoNum < totalCarrito) {
      Alert.alert('Pago incompleto', 'El monto recibido en efectivo es menor al total a pagar.');
      return;
    }

    setProcesandoVenta(true);
    try {
      // Calcular fecha final de venta (si es fecha pasada, asignar la hora del día para mantener orden cronológico)
      let fechaVentaIso = new Date().toISOString();
      if (fechaVenta && fechaVenta !== getHoyISO()) {
        const [y, m, d] = fechaVenta.split('-').map(Number);
        const ahora = new Date();
        const fechaCompuesta = new Date(y, m - 1, d, ahora.getHours(), ahora.getMinutes(), ahora.getSeconds());
        fechaVentaIso = fechaCompuesta.toISOString();
      }

      const res = await procesarVenta({
        items: carrito,
        metodoPago,
        clienteNombre: clienteNombreVenta || params?.clienteNombre || null,
        fechaVenta: fechaVentaIso,
      });

      // Éxito: limpiar carrito y navegar al ticket
      setCarrito([]);
      setModalCobroVisible(false);
      setAvisoCita(null);
      setClienteNombreVenta('');
      setFechaVenta(getHoyISO());

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

      {/* Buscador + botón Venta Única */}
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
        {/* Botón Venta Única */}
        <TouchableOpacity
          style={styles.ventaUnicaBtn}
          onPress={abrirModalVentaUnica}
          activeOpacity={0.75}
          accessibilityLabel="Agregar venta única sin registrar producto"
        >
          <Icon name="plus" size={14} color={Colors.brand} />
          <Text style={styles.ventaUnicaBtnText}>Venta única</Text>
        </TouchableOpacity>
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
                    ) : item.tipo === 'unico' ? (
                      <Icon name="tag" size={22} color={Colors.brand} />
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

      {/* MODAL VENTA ÚNICA */}
      <Modal
        visible={modalVentaUnicaVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVentaUnicaVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 16) + 10 }]}>
            {/* Cabecera */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Venta única</Text>
                <Text style={styles.modalSubtitle}>Sin registrar en inventario</Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVentaUnicaVisible(false)}
                style={styles.closeBtn}
                activeOpacity={0.7}
              >
                <Icon name="close" size={18} color={Colors.ink} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContentScroll}>
              {/* Descripción */}
              <View style={styles.ventaUnicaInfoBanner}>
                <Icon name="tag" size={15} color={Colors.brand} />
                <Text style={styles.ventaUnicaInfoText}>
                  Ideal para artículos de una sola vez o cosas que no se volverán a surtir.
                </Text>
              </View>

              {/* Campo Nombre */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>Nombre o descripción *</Text>
                <TextInput
                  style={styles.clienteInput}
                  placeholder="Ej. Accesorio para cabello, Crema importada…"
                  placeholderTextColor={Colors.stone}
                  value={ventaUnicaNombre}
                  onChangeText={text => { setVentaUnicaNombre(text); setVentaUnicaError(''); }}
                  autoCapitalize="sentences"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>

              {/* Campo Precio */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>Precio de venta ($) *</Text>
                <TextInput
                  style={styles.clienteInput}
                  placeholder="0.00"
                  placeholderTextColor={Colors.stone}
                  keyboardType="decimal-pad"
                  value={ventaUnicaPrecio}
                  onChangeText={text => { setVentaUnicaPrecio(text); setVentaUnicaError(''); }}
                  returnKeyType="done"
                  onSubmitEditing={handleAgregarVentaUnica}
                />
              </View>

              {/* Error */}
              {!!ventaUnicaError && (
                <View style={styles.ventaUnicaErrorRow}>
                  <Icon name="warning" size={13} color={Colors.rose} />
                  <Text style={styles.ventaUnicaErrorText}>{ventaUnicaError}</Text>
                </View>
              )}

              {/* Botón agregar */}
              <TouchableOpacity
                style={styles.ventaUnicaConfirmBtn}
                onPress={handleAgregarVentaUnica}
                activeOpacity={0.8}
              >
                <Icon name="plus" size={15} color={Colors.brandText} />
                <Text style={styles.ventaUnicaConfirmText}>Agregar al carrito</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
                            name={item.tipo === 'servicio' ? 'sparkles' : item.tipo === 'unico' ? 'tag' : 'package'}
                            size={16}
                            color={Colors.brand}
                          />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                          <Text style={styles.cartItemName} numberOfLines={1}>
                            {item.nombre}
                          </Text>
                          {item.tipo === 'unico' && (
                            <View style={styles.unicoBadge}>
                              <Text style={styles.unicoBadgeText}>Único</Text>
                            </View>
                          )}
                        </View>
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

              {/* Fecha de la venta (soporte histórico) */}
              <View style={styles.sectionBlock}>
                <View style={styles.fechaCobroHeader}>
                  <Text style={styles.sectionLabel}>Fecha de la venta</Text>
                  {fechaVenta < getHoyISO() && (
                    <View style={styles.historicaBadge}>
                      <Icon name="clock" size={10} color={Colors.amberInk} />
                      <Text style={styles.historicaBadgeText}>Histórica</Text>
                    </View>
                  )}
                </View>

                {/* Tarjeta de fecha seleccionada */}
                <TouchableOpacity
                  style={[
                    styles.fechaCobroCard,
                    fechaVenta < getHoyISO() && styles.fechaCobroCardHistorica,
                  ]}
                  onPress={() => setCalendarioCobroVisible(true)}
                  activeOpacity={0.75}
                >
                  <View style={styles.fechaCobroLeft}>
                    <View style={[
                      styles.fechaCobroIconCircle,
                      fechaVenta < getHoyISO() && { backgroundColor: Colors.amberBg },
                    ]}>
                      <Icon
                        name="calendar"
                        size={15}
                        color={fechaVenta < getHoyISO() ? Colors.amberInk : Colors.brand}
                      />
                    </View>
                    <View>
                      <Text style={styles.fechaCobroLarga}>
                        {formatearFechaBonita(fechaVenta)}
                      </Text>
                      <Text style={styles.fechaCobroSub}>
                        {fechaVenta === getHoyISO()
                          ? 'Venta en tiempo real'
                          : 'Se sumará al corte de ese día'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.fechaCobroCambiarBtn}>
                    <Icon name="calendar" size={12} color={Colors.brandText} />
                    <Text style={styles.fechaCobroCambiarText}>Cambiar</Text>
                  </View>
                </TouchableOpacity>

                {/* Atajos rápidos de fecha */}
                <View style={styles.fechaCobroChipsRow}>
                  <TouchableOpacity
                    style={[
                      styles.fechaCobroChip,
                      fechaVenta === getHoyISO() && styles.fechaCobroChipActivo,
                    ]}
                    onPress={() => setFechaVenta(getHoyISO())}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.fechaCobroChipText,
                        fechaVenta === getHoyISO() && styles.fechaCobroChipTextActivo,
                      ]}
                    >
                      Hoy
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.fechaCobroChip,
                      fechaVenta === getAyerISO() && styles.fechaCobroChipActivo,
                    ]}
                    onPress={() => setFechaVenta(getAyerISO())}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.fechaCobroChipText,
                        fechaVenta === getAyerISO() && styles.fechaCobroChipTextActivo,
                      ]}
                    >
                      Ayer
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.fechaCobroChip,
                      fechaVenta !== getHoyISO() && fechaVenta !== getAyerISO() && styles.fechaCobroChipActivo,
                    ]}
                    onPress={() => setCalendarioCobroVisible(true)}
                    activeOpacity={0.7}
                  >
                    <Icon
                      name="calendar"
                      size={12}
                      color={
                        fechaVenta !== getHoyISO() && fechaVenta !== getAyerISO()
                          ? Colors.brandText
                          : Colors.brand
                      }
                    />
                    <Text
                      style={[
                        styles.fechaCobroChipText,
                        fechaVenta !== getHoyISO() && fechaVenta !== getAyerISO() && styles.fechaCobroChipTextActivo,
                      ]}
                    >
                      Otra fecha
                    </Text>
                  </TouchableOpacity>
                </View>

                {fechaVenta < getHoyISO() && (
                  <View style={styles.avisoHistoricoBox}>
                    <Icon name="clock" size={13} color={Colors.amberInk} />
                    <Text style={styles.avisoHistoricoText}>
                      Esta venta se guardará en la fecha indicada y actualizará las ganancias de ese periodo.
                    </Text>
                  </View>
                )}
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

            {/* POP-UP CALENDARIO INTERACTIVO PARA COBRO */}
            {calendarioCobroVisible && (
              <View style={styles.calendarModalOverlay}>
                <TouchableOpacity
                  style={StyleSheet.absoluteFill}
                  activeOpacity={1}
                  onPress={() => setCalendarioCobroVisible(false)}
                />
                <View style={styles.calendarModalContent}>
                  {/* Header del Calendario */}
                  <View style={styles.calendarHeader}>
                    <Text style={styles.calendarTitle}>Fecha de la venta</Text>
                    <TouchableOpacity
                      onPress={() => setCalendarioCobroVisible(false)}
                      style={styles.calendarCloseBtn}
                      activeOpacity={0.7}
                    >
                      <Icon name="close" size={18} color={Colors.ink} />
                    </TouchableOpacity>
                  </View>

                  {/* Selector de Mes */}
                  <View style={styles.monthNavRow}>
                    <TouchableOpacity
                      onPress={() => cambiarMesCobro(-1)}
                      style={styles.monthArrowBtn}
                      activeOpacity={0.7}
                    >
                      <Icon name="chevron-left" size={16} color={Colors.brand} />
                    </TouchableOpacity>

                    <Text style={styles.monthNavTitle}>
                      {MESES[mesCalendarioCobro.getMonth()]} {mesCalendarioCobro.getFullYear()}
                    </Text>

                    <TouchableOpacity
                      onPress={() => cambiarMesCobro(1)}
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
                    {diasDelMesCobro.map((item, idx) => {
                      if (!item.dia) {
                        return <View key={`blank_c_${idx}`} style={styles.calendarCell} />;
                      }

                      const esSeleccionado = item.iso === fechaVenta;
                      const esHoy = item.iso === getHoyISO();

                      return (
                        <TouchableOpacity
                          key={item.iso}
                          style={[
                            styles.calendarCell,
                            esSeleccionado && styles.calendarCellSelected,
                            esHoy && !esSeleccionado && styles.calendarCellToday,
                          ]}
                          onPress={() => seleccionarFechaCobro(item.iso)}
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

                  {/* Footer del Calendario */}
                  <View style={styles.calendarFooter}>
                    <TouchableOpacity
                      style={styles.calendarTodayBtn}
                      onPress={() => {
                        setMesCalendarioCobro(new Date());
                        seleccionarFechaCobro(getHoyISO());
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.calendarTodayBtnText}>Ir a Hoy</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.calendarDoneBtn}
                      onPress={() => setCalendarioCobroVisible(false)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.calendarDoneBtnText}>Listo</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
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
  searchContainer: { paddingHorizontal: 18, paddingVertical: 10, gap: 8 },
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
  // Botón Venta Única en buscador
  ventaUnicaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.brand,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  ventaUnicaBtnText: {
    fontSize: 12,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.brand,
  },
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
  // Venta Única — Badge en carrito
  unicoBadge: {
    backgroundColor: Colors.terraBg,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  unicoBadgeText: {
    fontSize: 9,
    fontFamily: 'Montserrat_700Bold',
    color: '#8C4127',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  // Venta Única Modal
  ventaUnicaInfoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.terraBg,
    borderRadius: 10,
    paddingHorizontal: 12,    paddingVertical: 10,
    marginBottom: 4,
  },
  ventaUnicaInfoText: {
    flex: 1,
    fontSize: 11.5,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.inkSoft,
    lineHeight: 16,
  },
  ventaUnicaErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
    marginTop: -4,
  },
  ventaUnicaErrorText: {
    fontSize: 11,
    fontFamily: 'Montserrat_600SemiBold',
    color: Colors.rose,
  },
  ventaUnicaConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: Colors.brand,
    borderRadius: 13,
    paddingVertical: 14,
    marginTop: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  ventaUnicaConfirmText: {
    fontSize: 13,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.brandText,
  },

  // Selector de Fecha en Cobro
  fechaCobroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  historicaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.amberBg,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radii.pill,
  },
  historicaBadgeText: {
    fontSize: 10,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.amberInk,
    textTransform: 'uppercase',
  },
  fechaCobroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cream,
    borderWidth: 1.5,
    borderColor: Colors.stoneLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  fechaCobroCardHistorica: {
    borderColor: Colors.amberInk + '80',
    backgroundColor: Colors.amberBg + '20',
  },
  fechaCobroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  fechaCobroIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fechaCobroLarga: {
    fontSize: 12.5,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.ink,
  },
  fechaCobroSub: {
    fontSize: 10,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.stone,
    marginTop: 1,
  },
  fechaCobroCambiarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.brand,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: Radii.pill,
  },
  fechaCobroCambiarText: {
    fontSize: 10.5,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.brandText,
  },
  fechaCobroChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  fechaCobroChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
    borderRadius: Radii.pill,
    backgroundColor: Colors.cream,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
  },
  fechaCobroChipActivo: {
    backgroundColor: Colors.brand,
    borderColor: Colors.brand,
  },
  fechaCobroChipText: {
    fontSize: 11,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.inkSoft,
  },
  fechaCobroChipTextActivo: {
    color: Colors.brandText,
  },
  avisoHistoricoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.amberBg,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 6,
    borderWidth: 1,
    borderColor: Colors.amberInk + '30',
  },
  avisoHistoricoText: {
    flex: 1,
    fontSize: 10.5,
    fontFamily: 'Montserrat_600SemiBold',
    color: Colors.amberInk,
    lineHeight: 14,
  },

  // Modal Calendario dentro de Cobro
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
    width: '14.28%',
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
