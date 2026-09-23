import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Modal,
  Alert,
  Linking,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Card from '../src/components/ui/Card';
import Badge from '../src/components/ui/Badge';
import Button from '../src/components/ui/Button';
import Icon from '../src/components/ui/Icon';
import { Colors, Radii } from '../src/theme';
import {
  obtenerHistorialVentas,
  cancelarVenta,
  generarTextoTicketWhatsApp,
} from '../src/services/ventasService';

const FILTROS_FECHA = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'semana', label: 'Esta semana' },
  { id: 'mes', label: 'Este mes' },
  { id: 'todas', label: 'Todas' },
];

function formatearFecha12h(fechaIso) {
  if (!fechaIso) return '';
  const d = new Date(fechaIso);
  if (isNaN(d.getTime())) return fechaIso;

  const fecha = d.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
  });
  let horas = d.getHours();
  const minutos = d.getMinutes().toString().padStart(2, '0');
  const ampm = horas >= 12 ? 'pm' : 'am';
  horas = horas % 12;
  horas = horas ? horas : 12;
  return `${fecha}, ${horas}:${minutos} ${ampm}`;
}

function getMetodoIcon(metodo) {
  switch (metodo?.toLowerCase()) {
    case 'efectivo':
      return 'dollar';
    case 'tarjeta':
      return 'credit-card';
    case 'transferencia':
      return 'repeat';
    default:
      return 'tag';
  }
}

export default function HistorialView() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [filtroFecha, setFiltroFecha] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  const [ventas, setVentas] = useState([]);
  const [metricas, setMetricas] = useState({
    totalVentas: 0,
    ventasCompletadasCount: 0,
    montoTotal: 0,
    gananciaTotal: 0,
  });
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  // Modal de detalle de venta
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
  const [cancelando, setCancelando] = useState(false);

  const cargarHistorial = async (esRefresco = false) => {
    if (!esRefresco) setCargando(true);
    try {
      const { ventas: listaVentas, metricas: stats } = await obtenerHistorialVentas({
        filtroFecha,
        busqueda,
      });
      setVentas(listaVentas);
      setMetricas(stats);
      // Si la venta seleccionada está abierta, actualizar sus datos
      if (ventaSeleccionada) {
        const vActualizada = listaVentas.find(v => String(v.id) === String(ventaSeleccionada.id));
        if (vActualizada) setVentaSeleccionada(vActualizada);
      }
    } catch (e) {
      console.warn('Error cargando historial de ventas:', e);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarHistorial();
    }, [filtroFecha, busqueda])
  );

  const onRefresh = () => {
    setRefrescando(true);
    cargarHistorial(true);
  };

  const handleCompartirWhatsApp = async (venta) => {
    if (!venta) return;
    const texto = generarTextoTicketWhatsApp(venta);
    const url = `whatsapp://send?text=${encodeURIComponent(texto)}`;
    try {
      const soportado = await Linking.canOpenURL(url);
      if (soportado) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`);
      }
    } catch (err) {
      Alert.alert('No se pudo abrir WhatsApp', 'Verifica que WhatsApp esté instalado en tu dispositivo.');
    }
  };

  const handleCancelarVenta = (venta) => {
    if (!venta) return;

    Alert.alert(
      'Cancelar venta',
      `¿Deseas cancelar la venta ${venta.folio}? Las piezas de productos vendidos regresarán automáticamente al inventario.`,
      [
        { text: 'No cancelar', style: 'cancel' },
        {
          text: 'Sí, cancelar venta',
          style: 'destructive',
          onPress: async () => {
            setCancelando(true);
            try {
              await cancelarVenta(venta.id);
              Alert.alert(
                'Venta cancelada',
                `La venta ${venta.folio} fue cancelada y el stock fue restituido al inventario.`
              );
              // Recargar historial
              await cargarHistorial(true);
              // Cerrar modal de detalle
              setVentaSeleccionada(null);
            } catch (err) {
              console.error('Error cancelando venta:', err);
              Alert.alert('Error', err.message || 'No se pudo cancelar la venta.');
            } finally {
              setCancelando(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header Superior */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Regresar"
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Icon name="arrow-left" size={20} color={Colors.brand} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.title}>Historial de Ventas</Text>
          <Text style={styles.subtitle}>
            {metricas.totalVentas} {metricas.totalVentas === 1 ? 'operación' : 'operaciones'} registradas
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Buscador en Vivo */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Icon name="search" size={16} color={Colors.inkSoft} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por folio (#0043) o clienta..."
            placeholderTextColor={Colors.stone}
            value={busqueda}
            onChangeText={setBusqueda}
            autoCapitalize="none"
          />
          {busqueda.length > 0 && (
            <TouchableOpacity
              onPress={() => setBusqueda('')}
              style={styles.clearBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="x" size={14} color={Colors.inkSoft} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Selector de Filtros de Fecha */}
      <View style={styles.filterPillsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsContent}
        >
          {FILTROS_FECHA.map(f => {
            const activo = filtroFecha === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                onPress={() => setFiltroFecha(f.id)}
                style={[styles.filterPill, activo && styles.filterPillActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterPillText, activo && styles.filterPillTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Resumen de Métricas del Periodo */}
      <View style={styles.metricsRow}>
        <View style={styles.metricCardMini}>
          <Text style={styles.metricLabel}>Total vendido</Text>
          <Text style={styles.metricValorTotal}>
            ${metricas.montoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>
        <View style={styles.metricCardMini}>
          <Text style={styles.metricLabel}>Ganancia bruta</Text>
          <Text style={styles.metricValorGanancia}>
            +${metricas.gananciaTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>
        <View style={[styles.metricCardMini, { flex: 0.8 }]}>
          <Text style={styles.metricLabel}>Ventas</Text>
          <Text style={styles.metricValorCount}>
            {metricas.ventasCompletadasCount}
          </Text>
        </View>
      </View>

      {/* Listado de Ventas con Pull-to-Refresh */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={onRefresh}
            tintColor={Colors.brand}
            colors={[Colors.brand]}
          />
        }
      >
        {cargando && !refrescando ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.brand} />
            <Text style={styles.loadingText}>Cargando ventas...</Text>
          </View>
        ) : ventas.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Icon name="history" size={28} color={Colors.brand} />
            </View>
            <Text style={styles.emptyTitle}>No hay ventas en este periodo</Text>
            <Text style={styles.emptySubtitle}>
              {busqueda
                ? `No encontramos resultados para "${busqueda}".`
                : 'No se encontraron registros de ventas con el filtro actual.'}
            </Text>
            {(busqueda.length > 0 || filtroFecha !== 'todas') && (
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => {
                  setBusqueda('');
                  setFiltroFecha('todas');
                }}
              >
                <Text style={styles.resetBtnText}>Restablecer filtros</Text>
              </TouchableOpacity>
            )}
          </Card>
        ) : (
          ventas.map((v) => {
            const esCancelada = v.estado === 'cancelada';
            const resumenItems = (v.items || [])
              .map(it => `${it.cantidad}x ${it.nombre}`)
              .join(', ');

            return (
              <TouchableOpacity
                key={v.id}
                onPress={() => setVentaSeleccionada(v)}
                activeOpacity={0.8}
              >
                <Card style={[styles.saleCard, esCancelada && styles.saleCardCanceled]}>
                  {/* Fila superior: Folio, Fecha y Estado */}
                  <View style={styles.saleHeader}>
                    <View style={styles.folioWrap}>
                      <Text style={styles.saleFolio}>{v.folio}</Text>
                      {esCancelada ? (
                        <Badge variant="low" label="Cancelada" />
                      ) : (
                        <Badge variant="ok" label="Completada" />
                      )}
                    </View>
                    <Text style={styles.saleFecha}>{formatearFecha12h(v.fecha)}</Text>
                  </View>

                  {/* Fila intermedia: Cliente y Método de pago */}
                  <View style={styles.saleMetaRow}>
                    <View style={styles.paymentPill}>
                      <Icon name={getMetodoIcon(v.metodoPago)} size={11} color={Colors.inkSoft} />
                      <Text style={styles.paymentText}>{v.metodoPago}</Text>
                    </View>
                    {v.clienteNombre ? (
                      <View style={styles.clientPill}>
                        <Icon name="user" size={11} color={Colors.inkSoft} />
                        <Text style={styles.clientText} numberOfLines={1}>
                          {v.clienteNombre}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Resumen de items vendidos */}
                  <Text style={styles.saleItemsSummary} numberOfLines={2}>
                    {resumenItems || 'Detalle de items de venta'}
                  </Text>

                  {/* Separador sutil */}
                  <View style={styles.saleDivider} />

                  {/* Fila inferior: Total, Ganancia y Acción */}
                  <View style={styles.saleFooter}>
                    <View>
                      <Text style={styles.totalLabel}>Total cobrado</Text>
                      <Text style={[styles.saleTotal, esCancelada && styles.saleTotalCanceled]}>
                        ${v.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                    </View>
                    <View style={styles.rightFooter}>
                      {!esCancelada && v.gananciaBruta > 0 && (
                        <View style={styles.gananciaPill}>
                          <Text style={styles.gananciaPillText}>
                            +${v.gananciaBruta.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ganancia
                          </Text>
                        </View>
                      )}
                      <View style={styles.arrowCircle}>
                        <Icon name="arrow-right" size={12} color={Colors.brand} />
                      </View>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Modal de Detalle Completo de Venta */}
      <Modal
        visible={!!ventaSeleccionada}
        transparent
        animationType="slide"
        onRequestClose={() => setVentaSeleccionada(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 20 }]}>
            {/* Tirador visual */}
            <View style={styles.sheetHandle} />

            {/* Cabecera del detalle */}
            <View style={styles.detailHeader}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.detailFolio}>{ventaSeleccionada?.folio}</Text>
                  {ventaSeleccionada?.estado === 'cancelada' ? (
                    <Badge variant="low" label="Cancelada" />
                  ) : (
                    <Badge variant="ok" label="Completada" />
                  )}
                </View>
                <Text style={styles.detailFecha}>
                  {formatearFecha12h(ventaSeleccionada?.fecha)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setVentaSeleccionada(null)}
                style={styles.closeBtn}
              >
                <Icon name="x" size={18} color={Colors.ink} />
              </TouchableOpacity>
            </View>

            {/* Datos adicionales */}
            <View style={styles.detailMetaCard}>
              <View style={styles.detailMetaCol}>
                <Text style={styles.detailMetaLabel}>Método de pago</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Icon name={getMetodoIcon(ventaSeleccionada?.metodoPago)} size={13} color={Colors.brand} />
                  <Text style={styles.detailMetaVal}>{ventaSeleccionada?.metodoPago}</Text>
                </View>
              </View>
              {ventaSeleccionada?.clienteNombre ? (
                <View style={styles.detailMetaCol}>
                  <Text style={styles.detailMetaLabel}>Clienta</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Icon name="user" size={13} color={Colors.brand} />
                    <Text style={styles.detailMetaVal}>{ventaSeleccionada.clienteNombre}</Text>
                  </View>
                </View>
              ) : null}
            </View>

            {/* Desglose de Items */}
            <Text style={styles.detailSectionTitle}>Desglose de la compra</Text>
            <ScrollView style={styles.itemsScroll} showsVerticalScrollIndicator={false}>
              {(ventaSeleccionada?.items || []).map((it, idx) => (
                <View key={it.id || idx} style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemNombre}>{it.nombre}</Text>
                    <Text style={styles.itemMeta}>
                      {it.cantidad} {it.cantidad === 1 ? 'pieza' : 'piezas'} × ${it.precioUnitario?.toFixed(2)}
                      {it.tipo === 'servicio' ? ' · Servicio' : ''}
                    </Text>
                  </View>
                  <Text style={styles.itemSubtotal}>
                    ${it.subtotal?.toFixed(2)}
                  </Text>
                </View>
              ))}
            </ScrollView>

            {/* Totales */}
            <View style={styles.detailTotalsBox}>
              <View style={styles.detailTotalRow}>
                <Text style={styles.detailTotalLabel}>Total cobrado:</Text>
                <Text style={styles.detailTotalMonto}>
                  ${ventaSeleccionada?.total?.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
              {ventaSeleccionada?.estado !== 'cancelada' && (
                <View style={styles.detailTotalRow}>
                  <Text style={styles.detailGananciaLabel}>Ganancia bruta estimada:</Text>
                  <Text style={styles.detailGananciaMonto}>
                    +${ventaSeleccionada?.gananciaBruta?.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
              )}
            </View>

            {/* Botones de acción */}
            <View style={styles.modalActions}>
              <View style={styles.actionsRow}>
                <Button
                  label="Ver ticket digital"
                  icon="tag"
                  variant="outline"
                  onPress={() => {
                    const vid = ventaSeleccionada.id;
                    setVentaSeleccionada(null);
                    router.push({ pathname: '/ticket', params: { ventaId: vid } });
                  }}
                  style={{ flex: 1 }}
                />
                <Button
                  label="WhatsApp"
                  icon="send"
                  variant="secondary"
                  onPress={() => handleCompartirWhatsApp(ventaSeleccionada)}
                  style={{ flex: 1 }}
                />
              </View>

              {ventaSeleccionada?.estado !== 'cancelada' && (
                <TouchableOpacity
                  style={styles.cancelarVentaBtn}
                  onPress={() => handleCancelarVenta(ventaSeleccionada)}
                  disabled={cancelando}
                >
                  {cancelando ? (
                    <ActivityIndicator size="small" color={Colors.terra} />
                  ) : (
                    <>
                      <Icon name="trash" size={14} color={Colors.terra} />
                      <Text style={styles.cancelarVentaText}>Cancelar venta y regresar stock</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: Colors.cream,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.pill,
    backgroundColor: Colors.creamSoft,
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontFamily: 'Montserrat_800ExtraBold',
    color: Colors.ink,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 11,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.inkSoft,
    textAlign: 'center',
    marginTop: 1,
  },

  // Buscador
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Montserrat_500Medium',
    fontSize: 13,
    color: Colors.ink,
    padding: 0,
  },
  clearBtn: {
    padding: 4,
  },

  // Chips de fecha
  filterPillsContainer: {
    paddingBottom: 8,
  },
  filterPillsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    backgroundColor: Colors.creamSoft,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
  },
  filterPillActive: {
    backgroundColor: Colors.brand,
    borderColor: Colors.brand,
  },
  filterPillText: {
    fontSize: 11.5,
    fontFamily: 'Montserrat_600SemiBold',
    color: Colors.inkSoft,
  },
  filterPillTextActive: {
    color: Colors.brandText,
  },

  // Métricas
  metricsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  metricCardMini: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
  },
  metricLabel: {
    fontSize: 9.5,
    fontFamily: 'Montserrat_600SemiBold',
    color: Colors.inkSoft,
    textTransform: 'uppercase',
  },
  metricValorTotal: {
    fontSize: 14,
    fontFamily: 'Fraunces_500Medium',
    color: Colors.ink,
    marginTop: 2,
  },
  metricValorGanancia: {
    fontSize: 12,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.sage,
    marginTop: 2,
  },
  metricValorCount: {
    fontSize: 14,
    fontFamily: 'Montserrat_800ExtraBold',
    color: Colors.brand,
    marginTop: 2,
  },

  // Listado
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 10,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 13,
    color: Colors.inkSoft,
  },

  // Tarjeta de venta
  saleCard: {
    padding: 14,
    borderRadius: Radii.lg,
  },
  saleCardCanceled: {
    opacity: 0.7,
    borderLeftWidth: 4,
    borderLeftColor: Colors.terra,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  folioWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saleFolio: {
    fontFamily: 'Montserrat_800ExtraBold',
    fontSize: 15,
    color: Colors.ink,
  },
  saleFecha: {
    fontSize: 11,
    fontFamily: 'Montserrat_500Medium',
    color: Colors.inkSoft,
  },
  saleMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  paymentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.creamSoft,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Radii.pill,
  },
  paymentText: {
    fontSize: 10.5,
    fontFamily: 'Montserrat_600SemiBold',
    color: Colors.inkSoft,
  },
  clientPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.creamSoft,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Radii.pill,
    maxWidth: 160,
  },
  clientText: {
    fontSize: 10.5,
    fontFamily: 'Montserrat_600SemiBold',
    color: Colors.brand,
  },
  saleItemsSummary: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.inkSoft,
    lineHeight: 16,
    marginBottom: 8,
  },
  saleDivider: {
    height: 1,
    backgroundColor: Colors.creamSoft,
    marginBottom: 8,
  },
  saleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: 9.5,
    fontFamily: 'Montserrat_500Medium',
    color: Colors.inkSoft,
    textTransform: 'uppercase',
  },
  saleTotal: {
    fontFamily: 'Fraunces_500Medium',
    fontSize: 16,
    color: Colors.ink,
  },
  saleTotalCanceled: {
    textDecorationLine: 'line-through',
    color: Colors.inkSoft,
  },
  rightFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gananciaPill: {
    backgroundColor: Colors.sageBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.pill,
  },
  gananciaPillText: {
    fontSize: 10.5,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.sage,
  },
  arrowCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.creamSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Estado vacío
  emptyCard: {
    padding: 30,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.creamSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.ink,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.inkSoft,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 17,
  },
  resetBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.brand,
    borderRadius: Radii.pill,
  },
  resetBtnText: {
    color: Colors.brandText,
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
  },

  // Modal Detalle
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.stoneLight,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '85%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.stoneLight,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  detailFolio: {
    fontSize: 20,
    fontFamily: 'Montserrat_800ExtraBold',
    color: Colors.ink,
  },
  detailFecha: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.inkSoft,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.creamSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailMetaCard: {
    flexDirection: 'row',
    backgroundColor: Colors.creamSoft,
    borderRadius: Radii.md,
    padding: 10,
    marginBottom: 14,
    gap: 16,
  },
  detailMetaCol: {
    flex: 1,
  },
  detailMetaLabel: {
    fontSize: 9.5,
    fontFamily: 'Montserrat_600SemiBold',
    color: Colors.inkSoft,
    textTransform: 'uppercase',
  },
  detailMetaVal: {
    fontSize: 12.5,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.ink,
  },
  detailSectionTitle: {
    fontSize: 12,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  itemsScroll: {
    maxHeight: 180,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.creamSoft,
  },
  itemInfo: {
    flex: 1,
    paddingRight: 12,
  },
  itemNombre: {
    fontSize: 13,
    fontFamily: 'Montserrat_600SemiBold',
    color: Colors.ink,
  },
  itemMeta: {
    fontSize: 11,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.inkSoft,
    marginTop: 1,
  },
  itemSubtotal: {
    fontSize: 13,
    fontFamily: 'Fraunces_500Medium',
    color: Colors.ink,
  },
  detailTotalsBox: {
    backgroundColor: Colors.creamSoft,
    borderRadius: Radii.md,
    padding: 12,
    marginBottom: 14,
    gap: 4,
  },
  detailTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailTotalLabel: {
    fontSize: 13,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.ink,
  },
  detailTotalMonto: {
    fontSize: 18,
    fontFamily: 'Fraunces_500Medium',
    color: Colors.ink,
  },
  detailGananciaLabel: {
    fontSize: 11,
    fontFamily: 'Montserrat_500Medium',
    color: Colors.inkSoft,
  },
  detailGananciaMonto: {
    fontSize: 13,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.sage,
  },
  modalActions: {
    gap: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelarVentaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  cancelarVentaText: {
    fontSize: 12,
    fontFamily: 'Montserrat_600SemiBold',
    color: Colors.terra,
  },
});
