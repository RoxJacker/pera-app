import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Radii, Shadows } from '../../theme';

/**
 * CartBar — Barra flotante de carrito sobre el BottomNav
 * Props:
 *   itemCount: number
 *   total: number
 *   onPress: () => void
 */
export default function CartBar({ itemCount, total, onPress }) {
  if (!itemCount) return null;

  return (
    <TouchableOpacity
      style={styles.bar}
      onPress={onPress}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={`Ver venta, ${itemCount} artículos, total $${total}`}
    >
      <View>
        <Text style={styles.line1}>Ver venta · {itemCount} artículo{itemCount !== 1 ? 's' : ''}</Text>
        <Text style={styles.line2}>Toca para cobrar</Text>
      </View>
      <Text style={styles.amount}>${total.toLocaleString('es-MX')} →</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 80, // justo sobre el BottomNav (74px) + gap
    backgroundColor: Colors.brand,
    borderRadius: Radii.card,
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.cartBar,
  },
  line1: {
    fontSize: 12,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.cream,
  },
  line2: {
    fontSize: 10,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.cream,
    opacity: 0.8,
    marginTop: 1,
  },
  amount: {
    fontFamily: 'Fraunces_500Medium',
    fontSize: 16,
    color: Colors.cream,
  },
});
