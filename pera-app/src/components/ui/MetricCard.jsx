import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../theme';

/**
 * MetricCard — Tarjeta de métrica con etiqueta, valor y delta opcional
 * Props:
 *   label: string — etiqueta en mayúsculas
 *   value: string — valor principal (usa Fraunces si es dinero)
 *   delta: string — variación ej. "↑ 18%"
 *   deltaType: 'up' | 'down' | 'neutral'
 *   isMoney: boolean — aplica Fraunces al valor
 *   children: ReactNode — contenido custom en vez de value
 */
export default function MetricCard({ label, value, delta, deltaType = 'neutral', isMoney = false, children }) {
  const deltaColor =
    deltaType === 'up' ? Colors.sage :
    deltaType === 'down' ? Colors.terra :
    Colors.stone;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      {children ?? (
        <Text style={[styles.value, isMoney && styles.valueMoney]}>{value}</Text>
      )}
      {!!delta && (
        <Text style={[styles.delta, { color: deltaColor }]}>{delta}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
    paddingHorizontal: 14,
    paddingVertical: 13,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
    flex: 1,
  },
  label: {
    fontSize: 10,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.stone,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  value: {
    fontSize: 22,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.ink,
  },
  valueMoney: {
    fontFamily: 'Fraunces_500Medium',
  },
  delta: {
    fontSize: 10.5,
    fontFamily: 'Montserrat_700Bold',
    marginTop: 5,
  },
});
