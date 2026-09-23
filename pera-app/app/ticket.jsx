import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Card from '../src/components/ui/Card';
import Button from '../src/components/ui/Button';
import ListRow from '../src/components/ui/ListRow';
import Icon from '../src/components/ui/Icon';
import { Colors, Radii } from '../src/theme';
import {
  obtenerVentaPorId,
  cancelarVenta,
  generarTextoTicketWhatsApp,
} from '../src/services/ventasService';

export default function TicketView() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { ventaId } = useLocalSearchParams();

  const [venta, setVenta] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [cancelando, setCancelando] = useState(false);

  const cargarVenta = async () => {
    if (!ventaId) {
      setCargando(false);
      return;
    }
    try {
      const data = await obtenerVentaPorId(ventaId);
      setVenta(data);
    } catch (e) {
      console.warn('Error cargando venta:', e);
    } finally {
      setCargando(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarVenta();
    }, [ventaId])
  );

  const handleCompartirWhatsApp = async () => {
    if (!venta) return;
    const texto = generarTextoTicketWhatsApp(venta);
    const url = `whatsapp://send?text=${encodeURIComponent(texto)}`;
    try {
      const soportado = await Linking.canOpenURL(url);
      if (soportado) {
        await Linking.openURL(url);
      } else {
        // Fallback a web whatsapp
        await Linking.openURL(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`);
      }
    } catch (err) {
      Alert.alert('No se pudo abrir WhatsApp', 'Asegúrate de tener WhatsApp instalado en tu dispositivo.');
    }
  };

  const handleCancelarVenta = () => {
    if (!venta) return;

    Alert.alert(
      'Cancelar venta',
      `¿Estás segura de cancelar la venta ${venta.folio}? Las piezas de los productos vendidos regresarán automáticamente al inventario.`,
      [
        { text: 'No cancelar', style: 'cancel' },
        {
          text: 'Sí, cancelar venta',
          style: 'destructive',
          onPress: async () => {
            setCancelando(true);
            try {
              await cancelarVenta(venta.id);
              setVenta(prev => ({ ...prev, estado: 'cancelada' }));
              Alert.alert(
                'Venta cancelada',
                `La venta ${venta.folio} fue cancelada y las piezas vendidas fueron devueltas al inventario.`
              );
            } catch (err) {
              console.error('Error al cancelar venta:', err);
              Alert.alert('Error', err.message || 'No se pudo cancelar la venta.');
            } finally {
              setCancelando(false);
            }
          },
        },
      ]
    );
  };

  if (cargando) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color={Colors.brand} />
        <Text style={styles.loadingText}>Cargando ticket de venta...</Text>
      </View>
    );
  }

  // Si no se encontró la venta o es una visita directa sin ID
  const ventaData = venta || {
    folio: '#0042',
    fecha: new Date().toISOString(),
    items: [
      { nombre: 'Tinte Igora 5.4', cantidad: 1, subtotal: 185, precioUnitario: 185 },
      { nombre: 'Corte + peinado', cantidad: 1, subtotal: 250, precioUnitario: 250 },
    ],
    total: 435,
    metodoPago: 'Efectivo',
    estado: 'completada',
  };

  const esCancelada = ventaData.estado === 'cancelada';
  const fechaFormateada = new Date(ventaData.fecha).toLocaleTimeString('es-MX', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}>
      {/* Barra de navegación superior */}
      <View style={styles.topNav}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Regresar"
        >
          <Icon name="arrow-left" size={20} color={Colors.brand} />
        </TouchableOpacity>
        <Text style={styles.topNavTitle}>Comprobante de Venta</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Ícono de Estado */}
        <View style={[styles.checkCircle, esCancelada && styles.cancelCircle]}>
          <Icon
            name={esCancelada ? 'close' : 'check'}
            size={26}
            color={esCancelada ? Colors.terra : Colors.brandText}
          />
        </View>

        {/* Títulos */}
        <Text style={[styles.titulo, esCancelada && { color: Colors.terra }]}>
          {esCancelada ? 'Venta cancelada' : 'Venta registrada'}
        </Text>

        <Text style={styles.folio}>
          {ventaData.folio} · {fechaFormateada}
          {ventaData.clienteNombre ? ` · ${ventaData.clienteNombre}` : ''}
        </Text>

        {esCancelada && (
          <View style={styles.cancelBanner}>
            <Icon name="warning" size={14} color={Colors.terra} />
            <Text style={styles.cancelBannerText}>
              El inventario de esta venta fue restituido.
            </Text>
          </View>
        )}

        {/* Lista de Items del Ticket */}
        <Card noPadding style={styles.itemsCard}>
          {(ventaData.items || []).map((item, i) => (
            <ListRow
              key={item.id || i}
              name={item.nombre}
              meta={`${item.cantidad} pieza${item.cantidad !== 1 ? 's' : ''} × $${item.precioUnitario || item.subtotal / item.cantidad}`}
              isFirst={i === 0}
              right={
                <Text style={styles.itemPrecio}>${item.subtotal.toFixed(2)}</Text>
              }
            />
          ))}
        </Card>

        {/* Método de Pago y Total */}
        <View style={styles.totalBlock}>
          <View style={styles.metodoTag}>
            <Icon
              name={ventaData.metodoPago === 'Efectivo' ? 'dollar' : ventaData.metodoPago === 'Tarjeta' ? 'card' : 'history'}
              size={13}
              color={Colors.inkSoft}
            />
            <Text style={styles.metodoTagText}>
              Pago: {ventaData.metodoPago || 'Efectivo'}
            </Text>
          </View>
          <Text style={[styles.total, esCancelada && styles.totalCancelado]}>
            ${ventaData.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </Text>
        </View>

        {/* Acciones */}
        <View style={styles.btns}>
          <Button
            variant="ghost"
            label="Compartir por WhatsApp"
            onPress={handleCompartirWhatsApp}
            style={{ width: '100%' }}
          />

          {!esCancelada && (
            <TouchableOpacity
              style={styles.cancelarBtn}
              onPress={handleCancelarVenta}
              disabled={cancelando}
              activeOpacity={0.7}
            >
              <Icon name="trash" size={14} color={Colors.rose} />
              <Text style={styles.cancelarBtnText}>
                {cancelando ? 'Cancelando...' : 'Cancelar venta y devolver stock'}
              </Text>
            </TouchableOpacity>
          )}

          <Button
            label="Nueva venta"
            onPress={() => router.replace('/(tabs)/venta')}
            style={{ width: '100%', marginTop: 4 }}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: Radii.pill,
    backgroundColor: Colors.creamSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topNavTitle: {
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.ink,
  },
  center: { alignItems: 'center', justifyContent: 'center' },
  loadingText: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.inkSoft,
    marginTop: 10,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  checkCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelCircle: {
    backgroundColor: Colors.terraBg,
  },
  titulo: {
    fontSize: 17,
    fontFamily: 'Montserrat_800ExtraBold',
    color: Colors.ink,
  },
  folio: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.stone,
  },
  cancelBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.terraBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.pill,
  },
  cancelBannerText: {
    fontSize: 11,
    fontFamily: 'Montserrat_600SemiBold',
    color: Colors.terra,
  },
  itemsCard: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginVertical: 4,
  },
  itemPrecio: {
    fontFamily: 'Fraunces_500Medium',
    fontSize: 13,
    color: Colors.ink,
  },
  totalBlock: {
    alignItems: 'center',
    gap: 4,
    marginVertical: 4,
  },
  metodoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.creamSoft,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  metodoTagText: {
    fontSize: 11,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.inkSoft,
  },
  total: {
    fontFamily: 'Fraunces_500Medium',
    fontSize: 30,
    color: Colors.ink,
    marginTop: 2,
  },
  totalCancelado: {
    textDecorationLine: 'line-through',
    color: Colors.stone,
  },
  btns: {
    width: '100%',
    gap: 10,
    marginTop: 6,
  },
  cancelarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radii.btn,
    backgroundColor: Colors.creamSoft,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
  },
  cancelarBtnText: {
    fontSize: 12,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.terra,
  },
});
