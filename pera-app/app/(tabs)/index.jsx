import { useState, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import TopBar from '../../src/components/layout/TopBar';
import Card from '../../src/components/ui/Card';
import MetricCard from '../../src/components/ui/MetricCard';
import ListRow from '../../src/components/ui/ListRow';
import Badge from '../../src/components/ui/Badge';
import Icon from '../../src/components/ui/Icon';
import { Colors } from '../../src/theme';
import { obtenerConteoCitasMañana } from '../../src/services/citasService';
import {
  obtenerMetricasDashboard,
  obtenerProductosStockBajo,
} from '../../src/services/dashboardService';

const diasSemana = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const barMaxH = 90;

const hoyFormateado = new Date().toLocaleDateString('es-MX', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

export default function DashboardView() {
  const router = useRouter();

  const [metricas, setMetricas] = useState({
    gananciaHoy: 0,
    gananciaHoyDelta: 0,
    gananciaSemana: 0,
    gananciaSemanaDelta: 0,
    ventasHoy: 0,
    ventasProductos: 0,
    ventasServicios: 0,
    barras: [0, 0, 0, 0, 0, 0, 0],
  });
  const [stockBajo, setStockBajo] = useState([]);
  const [conteoManana, setConteoManana] = useState(0);
  const [refrescando, setRefrescando] = useState(false);

  // Obtener índice de hoy en la semana (0: Lunes, ..., 6: Domingo)
  const diaHoy = new Date().getDay();
  const diaHoyIdx = diaHoy === 0 ? 6 : diaHoy - 1;

  const cargarDatos = async () => {
    try {
      const [dataMetricas, dataStock, numCitas] = await Promise.all([
        obtenerMetricasDashboard(),
        obtenerProductosStockBajo(),
        obtenerConteoCitasMañana(),
      ]);

      setMetricas(dataMetricas);
      setStockBajo(dataStock);
      setConteoManana(numCitas);
    } catch (e) {
      console.warn('Error cargando datos del dashboard:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [])
  );

  const onRefresh = async () => {
    setRefrescando(true);
    await cargarDatos();
    setRefrescando(false);
  };

  const maxVal = Math.max(...(metricas.barras || [1]), 1);

  return (
    <View style={styles.screen}>
      <TopBar title="Belleza Pera" subtitle={hoyFormateado} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={onRefresh}
            tintColor={Colors.brand}
            colors={[Colors.brand]}
          />
        }
      >
        {/* Tarjeta de recordatorio de citas para mañana */}
        {conteoManana > 0 && (
          <TouchableOpacity
            onPress={() => router.push('/agenda')}
            activeOpacity={0.8}
          >
            <Card style={styles.citasCard}>
              <Icon name="calendar" size={16} color={Colors.brand} />
              <Text style={styles.citasText}>
                Tienes <Text style={styles.citasNum}>{conteoManana} cita{conteoManana !== 1 ? 's' : ''}</Text> mañana
              </Text>
              <Text style={styles.citasLink}>Ver agenda →</Text>
            </Card>
          </TouchableOpacity>
        )}

        {/* Métricas Fila 1: Ganancia Hoy y Ganancia Semana */}
        <View style={styles.grid2}>
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => router.push('/(tabs)/ganancias')}
            activeOpacity={0.8}
            accessibilityLabel="Ver detalle de ganancias"
          >
            <MetricCard
              label="Ganancia hoy"
              value={`$${metricas.gananciaHoy.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              delta={metricas.gananciaHoyDelta ? `↑ ${metricas.gananciaHoyDelta}%` : undefined}
              deltaType="up"
              isMoney
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => router.push('/(tabs)/ganancias')}
            activeOpacity={0.8}
            accessibilityLabel="Ver detalle de ganancias de la semana"
          >
            <MetricCard
              label="Ganancia semana"
              value={`$${metricas.gananciaSemana.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              delta={metricas.gananciaSemanaDelta ? `↑ ${metricas.gananciaSemanaDelta}%` : undefined}
              deltaType="up"
              isMoney
            />
          </TouchableOpacity>
        </View>

        {/* Métricas Fila 2: Ventas Hoy e Historial */}
        <View style={[styles.grid2, { marginTop: 0 }]}>
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => router.push('/historial')}
            activeOpacity={0.8}
            accessibilityLabel="Ver historial de ventas de hoy"
          >
            <MetricCard
              label="Ventas hoy"
              value={String(metricas.ventasHoy)}
              delta={`${metricas.ventasProductos} prod · ${metricas.ventasServicios} serv`}
              deltaType="neutral"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => router.push('/(tabs)/ganancias')}
            activeOpacity={0.8}
            accessibilityLabel="Ver ganancias del mes"
          >
            <MetricCard label="Este mes">
              <View style={styles.verGananciasRow}>
                <Text style={styles.verGanancias}>Ver ganancias</Text>
                <Icon name="arrow-right" size={12} color={Colors.brand} />
              </View>
            </MetricCard>
          </TouchableOpacity>
        </View>

        {/* Gráfica de Ventas Semanal */}
        <Card>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Ventas de la semana</Text>
            <Text style={styles.sectionSub}>Lunes a Domingo</Text>
          </View>

          <View style={styles.barsContainer}>
            {metricas.barras.map((val, i) => {
              const esHoy = i === diaHoyIdx;
              const esFuturo = i > diaHoyIdx;
              const barHeight = val > 0 ? Math.max((val / maxVal) * barMaxH, 6) : 4;

              return (
                <View key={i} style={styles.barCol}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: barHeight,
                        backgroundColor: esHoy
                          ? Colors.brand
                          : val > 0
                          ? Colors.tan
                          : Colors.stoneLight,
                        opacity: esFuturo ? 0.35 : 1,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.barLabel,
                      esHoy && styles.barLabelActive,
                    ]}
                  >
                    {diasSemana[i]}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Alertas de Stock Bajo con Productos Reales y Acceso Rápido a Entrada */}
        {stockBajo.length > 0 ? (
          <Card>
            <View style={styles.stockHeaderRow}>
              <Text style={styles.sectionTitle}>Stock bajo</Text>
              <View style={styles.warningBadge}>
                <Icon name="warning" size={13} color={Colors.terra} />
                <Text style={styles.warningBadgeText}>{stockBajo.length} por resurtir</Text>
              </View>
            </View>
            {stockBajo.map((p, i) => (
              <ListRow
                key={p.id}
                name={p.nombre}
                meta={p.categoria}
                isFirst={i === 0}
                right={
                  <Badge
                    variant="low"
                    label={`${p.stock} pza${p.stock !== 1 ? 's' : ''} (mín ${p.stockMinimo})`}
                  />
                }
              />
            ))}
            <TouchableOpacity
              style={styles.resurtirBtn}
              onPress={() => router.push('/entrada')}
              activeOpacity={0.75}
            >
              <Text style={styles.resurtirBtnText}>Registrar entrada de mercancía</Text>
              <Icon name="arrow-right" size={12} color={Colors.brand} />
            </TouchableOpacity>
          </Card>
        ) : (
          <Card style={styles.stockOkCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="check" size={16} color={Colors.sage} />
              <Text style={styles.stockOkText}>
                Inventario al día: todos los productos tienen stock suficiente.
              </Text>
            </View>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  scroll: { flex: 1 },
  content: { padding: 18, paddingBottom: 100, gap: 12 },
  grid2: { flexDirection: 'row', gap: 10 },
  sectionTitle: { fontSize: 13, fontFamily: 'Montserrat_700Bold', color: Colors.ink },
  sectionSub: { fontSize: 10.5, fontFamily: 'Montserrat_400Regular', color: Colors.inkSoft },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    height: 100,
    marginTop: 14,
    marginBottom: 4,
  },
  barCol: { flex: 1, alignItems: 'center', gap: 5 },
  bar: { width: '100%', borderRadius: 5, alignSelf: 'flex-end' },
  barLabel: { fontSize: 10, fontFamily: 'Montserrat_500Medium', color: Colors.stone },
  barLabelActive: { fontFamily: 'Montserrat_800ExtraBold', color: Colors.brand },
  verGananciasRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  verGanancias: {
    fontSize: 13,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.brand,
  },
  citasCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.creamSoft,
    shadowOpacity: 0,
  },
  citasText: { flex: 1, fontSize: 12, fontFamily: 'Montserrat_400Regular', color: Colors.inkSoft },
  citasNum: { fontFamily: 'Montserrat_700Bold', color: Colors.brand },
  citasLink: { fontSize: 11, fontFamily: 'Montserrat_700Bold', color: Colors.brand },
  stockHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.terraBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  warningBadgeText: {
    fontSize: 10,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.terra,
  },
  stockOkCard: {
    padding: 14,
    backgroundColor: Colors.creamSoft,
  },
  stockOkText: {
    fontSize: 12,
    fontFamily: 'Montserrat_500Medium',
    color: Colors.inkSoft,
    flex: 1,
  },
  resurtirBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.creamSoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  resurtirBtnText: {
    fontSize: 11.5,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.brand,
  },
});
