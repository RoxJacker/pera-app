import { useState } from 'react';
import { Tabs } from 'expo-router';
import { TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MoreSheet from '../../src/components/layout/MoreSheet';
import Icon from '../../src/components/ui/Icon';
import { Colors } from '../../src/theme';

export default function TabsLayout() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const bottomPadding = Math.max(insets.bottom, 6);
  const barHeight = Platform.OS === 'ios' ? 56 + insets.bottom : 64;

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.brand,
          tabBarInactiveTintColor: Colors.stone,
          tabBarShowLabel: true,
          tabBarLabelStyle: {
            fontSize: 10,
            fontFamily: 'Montserrat_700Bold',
            marginTop: 2,
            marginBottom: Platform.OS === 'android' ? 4 : 0,
          },
          tabBarStyle: {
            backgroundColor: Colors.surface,
            borderTopColor: Colors.stoneLight,
            borderTopWidth: 1,
            height: barHeight,
            paddingBottom: bottomPadding,
            paddingTop: 8,
          },
          tabBarItemStyle: {
            alignItems: 'center',
            justifyContent: 'center',
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

