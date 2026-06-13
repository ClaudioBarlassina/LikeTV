import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import MatchCard from './MatchCard';
import { COLORS } from '../constants/theme';

export default function FinishedMatches({ matches = [] }) {
  const { width: windowWidth } = useWindowDimensions();
  const isMobile = windowWidth < 500;
  const scale = Math.min(1, Math.max(0.65, windowWidth / 1920));

  const finished = matches.filter((m) => m.status === 'finished');

  if (finished.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={[styles.title, { fontSize: isMobile ? 14 : 16 * scale }]}>FINALIZADOS</Text>
        <Text style={[styles.empty, { fontSize: isMobile ? 12 : 13 * scale }]}>Sin partidos finalizados</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { fontSize: isMobile ? 14 : 16 * scale }]}>FINALIZADOS</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.carousel, { gap: isMobile ? 8 : 12 * scale }]}>
        {finished.map((m) => (
          <MatchCard
            key={m.id}
            team1={m.home_team || 'TBD'}
            team2={m.away_team || 'TBD'}
            score1={m.home_score}
            score2={m.away_score}
            flag1={m.home_flag}
            flag2={m.away_flag}
            iso1={m.home_iso2}
            iso2={m.away_iso2}
            status="FINALIZADO"
            isLive={false}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  title: { color: COLORS.gold, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, borderBottomWidth: 1, borderBottomColor: '#333', paddingBottom: 6 },
  carousel: { paddingRight: 8 },
  empty: { color: COLORS.dim, textAlign: 'center', fontStyle: 'italic', paddingVertical: 10 },
});
