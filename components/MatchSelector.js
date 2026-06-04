import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { COLORS } from '../constants/theme';

export default function MatchSelector({ matches, selectedId, onSelect }) {
  if (!matches || matches.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {matches.map((m) => {
          const isSelected = m.id === selectedId;
          const isLive = m.status === 'live';
          return (
            <Pressable
              key={m.id}
              style={({ focused }) => [styles.card, isSelected && styles.cardSelected, isLive && styles.cardLive, focused && styles.cardFocused]}
              onPress={() => onSelect(m)}
            >
              <Text style={[styles.teams, isSelected && styles.textSelected]}>
                {m.home_team}
              </Text>
              <Text style={[styles.score, isSelected && styles.textSelected]}>
                {m.status === 'upcoming'
                  ? 'vs'
                  : isLive
                    ? `${m.home_score} - ${m.away_score}`
                    : `${m.home_score} - ${m.away_score}`}
              </Text>
              <Text style={[styles.teams, isSelected && styles.textSelected]}>
                {m.away_team}
              </Text>
              <Text style={styles.meta}>
                {isLive ? 'EN VIVO' : `Grupo ${m.group}`}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Text style={styles.hint}>Seleccioná un partido para verlo</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  card: {
    backgroundColor: COLORS.panel,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#222',
    alignItems: 'center',
    minWidth: 140,
  },
  cardSelected: { borderColor: COLORS.gold, backgroundColor: COLORS.goldDim },
  cardLive: { borderColor: COLORS.live },
  cardFocused: { borderColor: COLORS.gold, borderWidth: 2 },
  teams: { color: COLORS.white, fontSize: 12, fontWeight: '600' },
  score: { color: COLORS.gold, fontSize: 16, fontWeight: '800', marginVertical: 4 },
  textSelected: { color: COLORS.gold },
  meta: { color: COLORS.dim, fontSize: 9, fontWeight: '600', marginTop: 4 },
  hint: { color: COLORS.dim, fontSize: 10, textAlign: 'center', fontStyle: 'italic' },
});
