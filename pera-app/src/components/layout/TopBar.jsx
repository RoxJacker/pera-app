import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Shadows, Radii } from '../../theme';
import Icon from '../ui/Icon';

/**
 * TopBar — Barra superior fija con centro de avisos integrado
 * Props:
 *   title: string
 *   subtitle: string
 *   onNotification?: () => void
 */
export default function TopBar({ title, subtitle, onNotification }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [modalAvisos, setModalAvisos] = useState(false);

  const handlePressBell = () => {
    if (onNotification) {
      onNotification();
    } else {
      setModalAvisos(true);
    }
  };

  return (
    <>
      <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
        <View>
          <Text style={styles.title}>{title}</Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        <TouchableOpacity
          style={styles.notifBtn}
          onPress={handlePressBell}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Avisos y notificaciones"
          accessibilityRole="button"
        >
          <Icon name="bell" size={15} color={Colors.brand} />
        </TouchableOpacity>
      </View>

      {/* Modal Centro de Avisos Rápidos */}
      <Modal
        visible={modalAvisos}
        transparent
        animationType="fade"
        onRequestClose={() => setModalAvisos(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setModalAvisos(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="bell" size={16} color={Colors.brand} />
                <Text style={styles.modalTitle}>Avisos de Belleza Pera</Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalAvisos(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="close" size={16} color={Colors.inkSoft} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.avisoItem}
              onPress={() => {
                setModalAvisos(false);
                router.push('/agenda');
              }}
              activeOpacity={0.75}
            >
              <View style={styles.avisoIconCircle}>
                <Icon name="calendar" size={16} color={Colors.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.avisoItemTitle}>Agenda de citas</Text>
                <Text style={styles.avisoItemSub}>Revisa las citas programadas para hoy y los próximos días</Text>
              </View>
              <Icon name="arrow-right" size={14} color={Colors.brand} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.avisoItem}
              onPress={() => {
                setModalAvisos(false);
                router.push('/entrada');
              }}
              activeOpacity={0.75}
            >
              <View style={[styles.avisoIconCircle, { backgroundColor: Colors.terraBg }]}>
                <Icon name="warning" size={16} color={Colors.terra} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.avisoItemTitle}>Registrar compra de stock</Text>
                <Text style={styles.avisoItemSub}>Ingresa nueva mercancía para mantener surtido tu negocio</Text>
              </View>
              <Icon name="arrow-right" size={14} color={Colors.brand} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.avisoItem, { borderBottomWidth: 0 }]}
              onPress={() => {
                setModalAvisos(false);
                router.push('/historial');
              }}
              activeOpacity={0.75}
            >
              <View style={[styles.avisoIconCircle, { backgroundColor: Colors.sageBg }]}>
                <Icon name="history" size={16} color="#4E5A38" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.avisoItemTitle}>Historial de ventas</Text>
                <Text style={styles.avisoItemSub}>Consulta tickets emitidos y comparte comprobantes</Text>
              </View>
              <Icon name="arrow-right" size={14} color={Colors.brand} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.cream,
    paddingHorizontal: 18,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.topBar,
  },
  title: {
    ...Typography.screenTitle,
  },
  subtitle: {
    ...Typography.screenSub,
    marginTop: 1,
  },
  notifBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.iconBtn,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
    padding: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.stoneLight,
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.ink,
  },
  avisoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.stoneLight,
    gap: 12,
  },
  avisoIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.creamSoft,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avisoItemTitle: {
    fontSize: 13,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.ink,
  },
  avisoItemSub: {
    fontSize: 11,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.inkSoft,
    marginTop: 2,
    lineHeight: 15,
  },
});
