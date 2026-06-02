import { View, Text, StyleSheet, Image } from 'react-native';

const FLAG_BASE = 'https://flagcdn.com/w80/';

// Simple color fallbacks when image fails
const FALLBACKS = {
  Argentina: '#75AADB',
  Brazil: '#009739',
  France: '#002395',
  default: '#333',
};

export default function TeamFlag({ name, iso2, size = 24 }) {
  const uri = iso2 ? `${FLAG_BASE}${iso2.toLowerCase()}.png` : null;

  return (
    <View style={[styles.wrapper, { width: size * 1.6, height: size }]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size * 1.6, height: size, borderRadius: 3 }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            styles.fallback,
            {
              width: size * 1.6,
              height: size,
              backgroundColor: FALLBACKS[name] || FALLBACKS.default,
            },
          ]}
        >
          <Text style={[styles.fallbackText, { fontSize: size * 0.4 }]}>
            {name ? name.slice(0, 3).toUpperCase() : '?'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { borderRadius: 3, overflow: 'hidden' },
  fallback: { justifyContent: 'center', alignItems: 'center', borderRadius: 3 },
  fallbackText: { color: '#fff', fontWeight: '800' },
});
