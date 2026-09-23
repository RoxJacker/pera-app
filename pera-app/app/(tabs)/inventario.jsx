import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import TopBar from '../../src/components/layout/TopBar';
import Card from '../../src/components/ui/Card';
import Badge from '../../src/components/ui/Badge';
import ListRow from '../../src/components/ui/ListRow';
import Icon from '../../src/components/ui/Icon';
import { Colors } from '../../src/theme';
import { obtenerProductos } from '../../src/services/productosService';

export default function InventarioView() {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState('');
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const cargarDatos = async () => {
    try {
      const data = await obtenerProductos();
      setProductos(data || []);
    } catch (err) {
      console.warn('Error cargando inventario:', err);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  // Recargar cada vez que la pantalla recibe el foco
  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [])
  );

  const onRefresh = () => {
    setRefrescando(true);
    cargarDatos();
  };

  const productosFiltrados = productos.filter(p => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return true;
    return (
      (p.nombre && p.nombre.toLowerCase().includes(q)) ||
      (p.marca && p.marca.toLowerCase().includes(q)) ||
      (p.categoria && p.categoria.toLowerCase().includes(q))
    );
  });

  return (
    <View style={styles.screen}>
      <TopBar
        title="Inventario"
        subtitle={`${productos.length} productos registrados`}
      />
      <ScrollView
        contentContainerStyle={styles.content}
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
        {/* Buscador */}
        <View style={styles.searchBox}>
          <Icon name="search" size={15} color={Colors.stone} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre, marca o categoría..."
            placeholderTextColor={Colors.stone}
            value={busqueda}
            onChangeText={setBusqueda}
          />
          {busqueda.length > 0 && (
            <TouchableOpacity onPress={() => setBusqueda('')} style={styles.clearBtn}>
              <Icon name="close" size={14} color={Colors.stone} />
            </TouchableOpacity>
          )}
        </View>

        {/* Lista de productos */}
        {cargando ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Colors.brand} />
            <Text style={styles.loadingText}>Cargando productos...</Text>
          </View>
        ) : productosFiltrados.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View style={{ marginBottom: 6 }}>
              <Icon name="package" size={34} color={Colors.stone} />
            </View>
            <Text style={styles.emptyTitle}>
              {busqueda ? 'No se encontraron productos' : 'No hay productos en inventario'}
            </Text>
            <Text style={styles.emptyDesc}>
              {busqueda
                ? 'Prueba con otro término de búsqueda'
                : 'Presiona el botón de abajo para registrar tu primer producto'}
            </Text>
          </Card>
        ) : (
          <Card noPadding style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
            {productosFiltrados.map((p, i) => {
              const stock = parseInt(p.stock || 0, 10);
              const stockMin = parseInt(p.stockMinimo ?? p.stock_minimo ?? 3, 10);
              const precio = p.precioVenta ?? p.precio_venta ?? 0;
              const badgeVariant = stock === 0 ? 'warn' : stock <= stockMin ? 'low' : 'ok';
              const badgeLabel = stock === 0 ? 'Agotado' : `${stock} pzas`;

              return (
                <ListRow
                  key={p.id}
                  thumbnailColor={p.pedestalColor || p.pedestal_color || '#F7F1E8'}
                  imageUri={p.foto_url || p.fotoUrl}
                  name={p.nombre}
                  meta={`${p.marca ? p.marca + ' · ' : ''}${p.categoria || 'General'}`}
                  isFirst={i === 0}
                  onPress={() => router.push(`/producto/${p.id}`)}
                  right={
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={styles.price}>${precio}</Text>
                      <Badge variant={badgeVariant} label={badgeLabel} />
                    </View>
                  }
                />
              );
            })}
          </Card>
        )}

        {/* Acciones Rápidas */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnSecondary]}
            onPress={() => router.push('/entrada')}
            activeOpacity={0.8}
            accessibilityLabel="Registrar compra o entrada de stock"
          >
            <Icon name="package" size={15} color={Colors.brand} />
            <Text style={styles.actionBtnTextSecondary}>+ Entrada de stock</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnPrimary]}
            onPress={() => router.push('/producto/nuevo')}
            activeOpacity={0.8}
            accessibilityLabel="Crear nuevo producto"
          >
            <Icon name="plus" size={15} color={Colors.brandText} />
            <Text style={styles.actionBtnTextPrimary}>Nuevo producto</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  content: { padding: 18, paddingBottom: 100, gap: 12 },
  searchBox: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchIcon: { fontSize: 14 },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.ink,
  },
  clearBtn: {
    padding: 4,
  },
  clearText: {
    fontSize: 12,
    color: Colors.stone,
  },
  price: {
    fontFamily: 'Fraunces_500Medium',
    fontSize: 13,
    color: Colors.ink,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    paddingVertical: 13,
    gap: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  actionBtnPrimary: {
    backgroundColor: Colors.brand,
  },
  actionBtnSecondary: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
  },
  actionBtnTextPrimary: {
    fontSize: 12.5,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.brandText,
  },
  actionBtnTextSecondary: {
    fontSize: 12.5,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.brand,
  },
  centerContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.inkSoft,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.ink,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 11.5,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.inkSoft,
    textAlign: 'center',
  },
});
