import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../theme';

/**
 * Componente unificado de iconos vectoriales para toda la app (sin emojis)
 *
 * Mapeo semántico de nombres comunes:
 * - 'search' -> Lupa
 * - 'bell' -> Notificaciones
 * - 'camera' -> Cámara / Foto
 * - 'calendar' -> Calendario / Citas
 * - 'warning' -> Alerta stock bajo
 * - 'package' -> Inventario / Productos / Caja
 * - 'sparkles' -> Servicios / Belleza
 * - 'scissors' -> Servicios / Corte
 * - 'history' -> Historial de ventas / Recibo
 * - 'settings' -> Configuración
 * - 'check' -> Listo / Aprobado
 * - 'close' -> Cerrar / Limpiar (X)
 * - 'plus' -> Agregar (+)
 * - 'note' -> Notas de citas
 * - 'home' -> Inicio
 * - 'trending' -> Ganancias / Métricas
 * - 'more' -> Tres puntos
 */
export default function Icon({ name, size = 20, color = Colors.ink, style }) {
  switch (name) {
    case 'search':
      return <Feather name="search" size={size} color={color} style={style} />;
    case 'bell':
      return <Feather name="bell" size={size} color={color} style={style} />;
    case 'camera':
      return <Feather name="camera" size={size} color={color} style={style} />;
    case 'calendar':
      return <Feather name="calendar" size={size} color={color} style={style} />;
    case 'warning':
    case 'alert':
      return <Feather name="alert-triangle" size={size} color={color} style={style} />;
    case 'package':
    case 'box':
      return <Feather name="package" size={size} color={color} style={style} />;
    case 'sparkles':
      return <Ionicons name="sparkles-outline" size={size} color={color} style={style} />;
    case 'scissors':
      return <Feather name="scissors" size={size} color={color} style={style} />;
    case 'history':
    case 'receipt':
      return <MaterialCommunityIcons name="receipt-text-outline" size={size} color={color} style={style} />;
    case 'settings':
      return <Feather name="settings" size={size} color={color} style={style} />;
    case 'check':
      return <Feather name="check" size={size} color={color} style={style} />;
    case 'close':
    case 'x':
      return <Feather name="x" size={size} color={color} style={style} />;
    case 'plus':
      return <Feather name="plus" size={size} color={color} style={style} />;
    case 'note':
      return <Feather name="edit-3" size={size} color={color} style={style} />;
    case 'home':
      return <Feather name="home" size={size} color={color} style={style} />;
    case 'trending':
      return <Feather name="trending-up" size={size} color={color} style={style} />;
    case 'more':
      return <Feather name="more-horizontal" size={size} color={color} style={style} />;
    case 'dollar':
      return <Feather name="dollar-sign" size={size} color={color} style={style} />;
    case 'credit-card':
      return <Feather name="credit-card" size={size} color={color} style={style} />;
    case 'repeat':
      return <Feather name="repeat" size={size} color={color} style={style} />;
    case 'user':
      return <Feather name="user" size={size} color={color} style={style} />;
    case 'arrow-right':
      return <Feather name="arrow-right" size={size} color={color} style={style} />;
    case 'chevron-down':
      return <Feather name="chevron-down" size={size} color={color} style={style} />;
    case 'arrow-left':
      return <Feather name="arrow-left" size={size} color={color} style={style} />;
    case 'send':
      return <Feather name="send" size={size} color={color} style={style} />;
    case 'trash':
      return <Feather name="trash-2" size={size} color={color} style={style} />;
    case 'shopping-bag':
    case 'bag':
      return <Feather name="shopping-bag" size={size} color={color} style={style} />;
    case 'minus':
      return <Feather name="minus" size={size} color={color} style={style} />;
    case 'card':
      return <Feather name="credit-card" size={size} color={color} style={style} />;
    case 'clock':
      return <Feather name="clock" size={size} color={color} style={style} />;
    case 'tag':
      return <Feather name="tag" size={size} color={color} style={style} />;
    default:
      return <Feather name="circle" size={size} color={color} style={style} />;
  }
}
