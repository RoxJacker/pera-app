import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Radii, Spacing } from '../../theme';

/**
 * ListRow — Fila de lista con thumbnail, info y valor derecho
 * Props:
 *   thumbnailColor: string (color del placeholder)
 *   imageUri: string (URL o URI de imagen)
 *   roundThumb: boolean — thumbnail circular (para servicios)
 *   name: string
 *   meta: string
 *   right: ReactNode — contenido a la derecha (precio, badge, etc.)
 *   onPress: () => void
 *   isFirst: boolean — omite el separador superior
 */
export default function ListRow({ thumbnailColor, imageUri, roundThumb, name, meta, right, onPress, isFirst, children }) {
  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      style={[styles.row, isFirst && styles.firstRow]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={[
            styles.thumb,
            roundThumb && styles.thumbRound,
            { backgroundColor: thumbnailColor || Colors.creamSoft },
          ]}
        />
      ) : thumbnailColor !== undefined ? (
        <View
          style={[
            styles.thumb,
            roundThumb && styles.thumbRound,
            { backgroundColor: thumbnailColor },
          ]}
        />
      ) : null}
      {children ? children : (
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          {!!meta && <Text style={styles.meta}>{meta}</Text>}
        </View>
      )}
      {!!right && <View style={styles.right}>{right}</View>}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: Spacing.listRowPadding,
    borderTopWidth: 1,
    borderTopColor: Colors.stoneLight,
  },
  firstRow: {
    borderTopWidth: 0,
  },
  thumb: {
    width: Spacing.thumbSize,
    height: Spacing.thumbSize,
    borderRadius: Radii.thumb,
    flexShrink: 0,
  },
  thumbRound: {
    borderRadius: Radii.thumbRound,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 12.5,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.ink,
  },
  meta: {
    fontSize: 10.5,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.stone,
    marginTop: 1,
  },
  right: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
});
