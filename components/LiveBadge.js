import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS, FONTS } from '../constants/theme';

export default function LiveBadge({ isLive = false }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isLive) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [isLive, pulseAnim]);

  return (
    <View style={[styles.badge, !isLive && styles.badgeOff]}>
      {isLive && <Animated.View style={[styles.dot, { opacity: pulseAnim }]} />}
      <Text style={styles.text}>{isLive ? 'TELEFE EN VIVO' : 'TELEFE'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: COLORS.live,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
    zIndex: 10,
  },
  badgeOff: { backgroundColor: COLORS.panel },
  dot: {
    width: 12,
    height: 12,
    backgroundColor: COLORS.liveDot,
    borderRadius: 6,
    marginRight: 10,
  },
  text: { color: COLORS.white, fontWeight: 'bold', fontSize: FONTS.liveBadge },
});
