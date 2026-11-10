import { useState } from 'react';
import { Tabs } from 'expo-router';
import { TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MoreSheet from '../../src/components/layout/MoreSheet';
import Icon from '../../src/components/ui/Icon';
import { useTheme } from '../../src/context/ThemeContext';

export default function TabsLayout() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // En Android con barra de 3 botones (Home, Back, Recents), insets.bottom suele ser 0 o ~20-24.
  // Garantizamos al menos 16-20dp de padding inferior para que la clienta
  // no pulse accidentalmente el botón Home/Atrás de Android al tocar la barra de pestañas.
  const bottomPadding = Platform.OS === 'ios'
    ? Math.max(insets.bottom, 8)
    : Math.max(insets.bottom, 16);

  const barHeight = Platform.OS === 'ios'
    ? 56 + insets.bottom
    : 66 + (insets.bottom > 0 ? insets.bottom : 12);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.brand,
          tabBarInactiveTintColor: theme.stone,
          tabBarShowLabel: true,
          tabBarLabelStyle: {
            fontSize: 10.5,
            fontFamily: 'Montserrat_700Bold',
            marginTop: 2,
            marginBottom: Platform.OS === 'android' ? 6 : 0,
          },
          tabBarStyle: {
            backgroundColor: theme.surface,
            borderTopColor: theme.stoneLight,
            borderTopWidth: 1,
            height: barHeight,
            paddingBottom: bottomPadding,
            paddingTop: 8,
            elevation: 8,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
          },
          tabBarItemStyle: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: 2,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Inicio',
            tabBarIcon: ({ color, focused }) => (
              <Icon name="home" size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="venta"
          options={{
            title: 'Venta',
            tabBarIcon: ({ color, focused }) => (
              <Icon name="shopping-bag" size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="inventario"
          options={{
            title: 'Stock',
            tabBarIcon: ({ color, focused }) => (
              <Icon name="package" size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="ganancias"
          options={{
            title: 'Ganancias',
            tabBarIcon: ({ color, focused }) => (
              <Icon name="trending" size={22} color={color} />
            ),
          }}
        />
        {/* Tab Más — abre el MoreSheet con la misma alineación y dimensiones */}
        <Tabs.Screen
          name="mas"
          options={{
            title: 'Más',
            tabBarIcon: ({ color, focused }) => (
              <Icon name="more" size={22} color={color} />
            ),
            tabBarButton: (props) => (
              <TouchableOpacity
                {...props}
                onPress={() => setSheetOpen(true)}
                activeOpacity={0.7}
                accessibilityLabel="Más opciones"
              />
            ),
          }}
        />
      </Tabs>

      <MoreSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}

