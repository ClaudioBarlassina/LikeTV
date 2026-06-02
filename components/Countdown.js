import { View, Text, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { COLORS, FONTS } from '../constants/theme';

function calcTimeLeft() {
  const start = new Date('2026-06-11T00:00:00').getTime();
  const now = Date.now();
  const diff = Math.max(0, start - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds, started: diff === 0 };
}

export default function Countdown() {
  const [time, setTime] = useState(calcTimeLeft);

  useEffect(() => {
    const id = setInterval(() => setTime(calcTimeLeft), 1000);
    return () => clearInterval(id);
  }, []);

  if (time.started) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>FALTA</Text>
      <View style={styles.row}>
        <View style={styles.block}>
          <Text style={styles.num}>{String(time.days).padStart(2, '0')}</Text>
          <Text style={styles.unit}>DÍAS</Text>
        </View>
        <Text style={styles.colon}>:</Text>
        <View style={styles.block}>
          <Text style={styles.num}>{String(time.hours).padStart(2, '0')}</Text>
          <Text style={styles.unit}>HRS</Text>
        </View>
        <Text style={styles.colon}>:</Text>
        <View style={styles.block}>
          <Text style={styles.num}>{String(time.minutes).padStart(2, '0')}</Text>
          <Text style={styles.unit}>MIN</Text>
        </View>
        <Text style={styles.colon}>:</Text>
        <View style={styles.block}>
          <Text style={styles.num}>{String(time.seconds).padStart(2, '0')}</Text>
          <Text style={styles.unit}>SEG</Text>
        </View>
      </View>
      <Text style={styles.date}>11 de Junio 2026 · EE.UU.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 20 },
  label: { color: COLORS.dim, fontSize: 14, fontWeight: '600', letterSpacing: 3, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  block: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, minWidth: 50 },
  num: { color: COLORS.gold, fontSize: 28, fontWeight: '800' },
  unit: { color: COLORS.dim, fontSize: 9, fontWeight: '600', letterSpacing: 1, marginTop: 2 },
  colon: { color: COLORS.gold, fontSize: 24, fontWeight: '800', marginBottom: 14 },
  date: { color: COLORS.dim, fontSize: 12, marginTop: 10, fontStyle: 'italic' },
});
