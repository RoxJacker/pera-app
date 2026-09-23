import { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, Pressable,
  StyleSheet, Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Radii } from '../../theme';
import Icon from '../ui/Icon';

const SHEET_ITEMS = [
  { label: 'Historial de ventas', route: '/historial', iconName: 'history' },
  { label: 'Servicios', route: '/servicios', iconName: 'scissors' },
  { label: 'Nueva entrada', route: '/entrada', iconName: 'package' },
  { label: 'Agenda de citas', route: '/agenda', iconName: 'calendar' },
  { label: 'Configuración', route: '/config', iconName: 'settings' },
];

/**
 * MoreSheet — Panel "Más opciones" que se activa desde el tab Más
 * Props:
 *   visible: boolean
 *   onClose: () => void
 */
export default function MoreSheet({ visible, onClose }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const navigate = (route) => {
    onClose();
    setTimeout(() => router.push(route), 250);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Más opciones</Text>

          {SHEET_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={item.route}
              style={[styles.sheetItem, i === 0 && styles.firstItem]}
              onPress={() => navigate(item.route)}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <View style={styles.iconCircle}>
                <Icon name={item.iconName} size={16} color={Colors.brand} />
              </View>
              <Text style={styles.sheetItemLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radii.sheet,
    borderTopRightRadius: Radii.sheet,
    borderTopWidth: 1,
    borderTopColor: Colors.stoneLight,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.stoneLight,
    borderRadius: Radii.pill,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 13,
    fontFamily: 'Montserrat_800ExtraBold',
    color: Colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: Colors.stoneLight,
  },
  firstItem: {
    borderTopWidth: 0,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.creamSoft,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetItemLabel: {
    fontSize: 13.5,
    fontFamily: 'Montserrat_600SemiBold',
    color: Colors.ink,
  },
});
