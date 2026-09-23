import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import TopBar from '../../src/components/layout/TopBar';
import Card from '../../src/components/ui/Card';
import Button from '../../src/components/ui/Button';
import ListRow from '../../src/components/ui/ListRow';
import Icon from '../../src/components/ui/Icon';
import { Colors, Radii } from '../../src/theme';
import {
  obtenerResumenGananciasMes,
  guardarGastosFijosMes,
  obtenerMesClave,
} from '../../src/services/gananciasService';

export default function GananciasView() {
  const [resumen, setResumen] = useState({
    mesClave: obtenerMesClave(),
    mesNombre: 'Septiembre 2026',
    gananciaBruta: 0,
    gastosFijos: 0,
    gananciaNeta: 0,
    porProductos: 0,
    porServicios: 0,
  });

  const [inputGastosFijos, setInputGastosFijos] = useState('0');
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const cargarGanancias = async (esRefresco = false) => {
    if (!esRefresco) setCargando(true);
    try {
      const data = await obtenerResumenGananciasMes();
      setResumen(data);
      setInputGastosFijos(String(data.gastosFijos || 0));
    } catch (e) {
      console.warn('Error cargando resumen de ganancias:', e);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarGanancias();
    }, [])
  );

  const onRefresh = () => {
    setRefrescando(true);
    cargarGanancias(true);
  };

  // Cálculo en vivo de la ganancia neta según lo que el usuario esté escribiendo
  const gastosFijosNum = parseFloat(inputGastosFijos || '0') || 0;
  const gananciaNetaCalculada = resumen.gananciaBruta - gastosFijosNum;

  const handleGuardarGastos = async () => {
    setGuardando(true);
    setMensajeExito(false);
    try {
      await guardarGastosFijosMes(resumen.mesClave, gastosFijosNum);
      setResumen((prev) => ({
        ...prev,
        gastosFijos: gastosFijosNum,
        gananciaNeta: prev.gananciaBruta - gastosFijosNum,
      }));
      setMensajeExito(true);
      setTimeout(() => setMensajeExito(false), 3000);
    } catch (err) {
      Alert.alert('Error', 'No se pudieron guardar los gastos fijos. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <View style={styles.screen}>
      <TopBar title="Ganancias" subtitle="Bruta y neta del mes" />
      <ScrollView
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
        {/* Hero Card con LinearGradient Nativo */}
        <LinearGradient
          colors={[Colors.brand, Colors.brandMid]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Text style={styles.heroLbl}>Lo que realmente ganas este mes</Text>
          <Text style={styles.heroBig}>
            ${gananciaNetaCalculada.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <Text style={styles.heroCaption}>
            Ganancia neta de {resumen.mesNombre} · actualizado en tiempo real
          </Text>

          {/* Sub-tarjetas Bruta / Gastos */}
          <View style={styles.splitRow}>
            <View style={styles.splitCol}>
              <Text style={styles.splitLabel}>Bruta (ventas)</Text>
              <Text style={styles.splitValue}>
                ${resumen.gananciaBruta.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.splitDivider} />
            <View style={styles.splitCol}>
              <Text style={styles.splitLabel}>Gastos fijos</Text>
              <Text style={styles.splitValue}>
                –${gastosFijosNum.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Explicación amigable */}
        <Card>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionTitle}>¿Cómo se calcula?</Text>
            <Icon name="sparkles" size={16} color={Colors.brand} />
          </View>
          <Text style={styles.bodyText}>
            <Text style={{ fontFamily: 'Montserrat_700Bold', color: Colors.ink }}>Ganancia bruta</Text>
            {' '}= suma de (precio de venta − costo) de todo lo vendido en el mes actual.{'\n\n'}
            <Text style={{ fontFamily: 'Montserrat_700Bold', color: Colors.ink }}>Ganancia neta</Text>
            {' '}= ganancia bruta − tus gastos fijos del mes (renta, luz, insumos generales), que capturas aquí como un único monto mensual.
          </Text>
        </Card>

        {/* Captura de Gastos Fijos Mensuales */}
        <Card>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionTitle}>Gastos fijos de {resumen.mesNombre}</Text>
            <Icon name="dollar" size={16} color={Colors.brand} />
          </View>
          <Text style={styles.fieldHelpText}>
            Captura el total de costos fijos que tuviste este mes:
          </Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.currencyPrefix}>$</Text>
            <TextInput
              style={styles.input}
              value={inputGastosFijos}
              onChangeText={setInputGastosFijos}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={Colors.stone}
            />
          </View>

          {mensajeExito && (
            <View style={styles.successBox}>
              <Icon name="check" size={14} color="#4E5A38" />
              <Text style={styles.successText}>¡Monto guardado correctamente!</Text>
            </View>
          )}

          <Button
            variant="ghost"
            label={guardando ? 'Guardando en base de datos...' : 'Actualizar monto'}
            onPress={handleGuardarGastos}
            disabled={guardando}
            style={{ marginTop: 4 }}
          />
        </Card>

        {/* Desglose de Ganancia por Tipo */}
        <Card>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionTitle}>Ganancia bruta por tipo</Text>
            <Icon name="trending" size={16} color={Colors.sage} />
          </View>
          <ListRow
            name="Productos vendidos"
            meta="Venta menos costo unitario"
            isFirst
            right={
              <Text style={styles.rowPrice}>
                +${resumen.porProductos.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            }
          />
          <ListRow
            name="Servicios realizados"
            meta="100% ganancia (sin insumos descontados)"
            right={
              <Text style={styles.rowPrice}>
                +${resumen.porServicios.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            }
          />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  content: { padding: 18, paddingBottom: 100, gap: 12 },
  heroCard: {
    borderRadius: 20,
    padding: 22,
    shadowColor: Colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  heroLbl: {
    fontSize: 12,
    fontFamily: 'Montserrat_600SemiBold',
    color: Colors.blush,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroBig: {
    fontSize: 34,
    fontFamily: 'Fraunces_500Medium',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  heroCaption: {
    fontSize: 11,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.creamSoft,
    marginBottom: 16,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: Radii.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  splitCol: {
    flex: 1,
  },
  splitDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 10,
  },
  splitLabel: {
    fontSize: 10,
    fontFamily: 'Montserrat_500Medium',
    color: Colors.blush,
    textTransform: 'uppercase',
  },
  splitValue: {
    fontSize: 15,
    fontFamily: 'Fraunces_500Medium',
    color: '#FFFFFF',
    marginTop: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.ink,
  },
  bodyText: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.inkSoft,
    lineHeight: 18,
  },
  fieldHelpText: {
    fontSize: 11.5,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.inkSoft,
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.creamSoft,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  currencyPrefix: {
    fontSize: 18,
    fontFamily: 'Fraunces_500Medium',
    color: Colors.ink,
    marginRight: 6,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 18,
    fontFamily: 'Fraunces_500Medium',
    color: Colors.ink,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.sageBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radii.md,
    marginBottom: 8,
  },
  successText: {
    fontSize: 11.5,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#4E5A38',
  },
  rowPrice: {
    fontSize: 13,
    fontFamily: 'Fraunces_500Medium',
    color: Colors.ink,
  },
});
