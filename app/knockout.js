import { useEffect, useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Animated, useWindowDimensions } from 'react-native';
import { Link } from 'expo-router';
import { fetchLiveMatches } from '../services/api';
import { matchTime, matchDate } from '../services/dates';
import NavBar from '../components/NavBar';
import TeamFlag from '../components/TeamFlag';
import { COLORS } from '../constants/theme';

const ROUNDS = [
  { key: 'r32', label: '32AVOS DE FINAL' },
  { key: 'r16', label: 'OCTAVOS DE FINAL' },
  { key: 'qf', label: 'CUARTOS DE FINAL' },
  { key: 'sf', label: 'SEMIFINALES' },
  { key: 'third', label: 'TERCER PUESTO' },
  { key: 'final', label: 'FINAL' },
];

function LivePulse() {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.5, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    a.start();
    return () => a.stop();
  }, [anim]);
  return anim;
}

function MatchCard({ match }) {
  const isLive = match.status === 'live';
  const isFinished = match.status === 'finished';
  const isUpcoming = match.status === 'upcoming';
  const pulse = isLive ? LivePulse() : null;
  const ht = !match.home_team_id || match.home_team_id === '0';
  const at = !match.away_team_id || match.away_team_id === '0';

  return (
    <Animated.View style={[
      s.card,
      isLive && { borderColor: COLORS.live, borderWidth: 2, opacity: pulse },
      isFinished && { borderColor: COLORS.gold, borderWidth: 1 },
      isUpcoming && { borderColor: '#222', borderWidth: 1 },
    ]}>
      <View style={s.cardMain}>
        <View style={s.teamRow}>
          {!ht && <TeamFlag name={match.home_team} iso2={match.home_iso2} size={18} />}
          <Text style={[s.teamName, ht && s.tbd]} numberOfLines={1}>{ht ? '?' : match.home_team}</Text>
        </View>

        <View style={s.scoreCol}>
          {isLive || isFinished ? (
            <Text style={[s.score, isLive && { color: COLORS.live }, isFinished && { color: COLORS.gold }]}>
              {match.home_score} - {match.away_score}
            </Text>
          ) : (
            <Text style={s.vs}>vs</Text>
          )}
        </View>

        <View style={s.teamRow}>
          <Text style={[s.teamName, at && s.tbd, { textAlign: 'right' }]} numberOfLines={1}>{at ? '?' : match.away_team}</Text>
          {!at && <TeamFlag name={match.away_team} iso2={match.away_iso2} size={18} />}
        </View>
      </View>

      <View style={[s.badgeRow, isLive && { backgroundColor: COLORS.live }, isFinished && { backgroundColor: 'rgba(212,175,55,0.15)' }, isUpcoming && { backgroundColor: '#1a1a1a' }]}>
        <Text style={[s.badgeText, isLive && { color: '#fff' }, isFinished && { color: COLORS.gold }, isUpcoming && { color: COLORS.dim }]}>
          {isLive ? 'EN VIVO' : isFinished ? 'FINAL' : isUpcoming && match.date ? `${matchDate(match.date, { day: 'numeric', month: 'short' })} ${matchTime(match.date)}` : 'PRÓXIMO'}
        </Text>
      </View>
    </Animated.View>
  );
}

export default function Knockout() {
  const { width: w } = useWindowDimensions();
  const scale = Math.min(1, Math.max(0.65, w / 1920));
  const isTwoCol = w >= 900;
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLiveMatches().then((d) => { setMatches(d); setLoading(false); });
  }, []);

  const byRound = useMemo(() => {
    const r = {};
    for (const m of matches) {
      if (m.type === 'group') continue;
      if (!r[m.type]) r[m.type] = [];
      r[m.type].push(m);
    }
    return r;
  }, [matches]);

  return (
    <View style={s.container}>
      <NavBar />
      <View style={{ flex: 1, padding: 5 }}>
        <Link href="/" style={[s.back, { fontSize: 15 * scale }]}>← VOLVER</Link>
        <Text style={[s.title, { fontSize: 28 * scale }]}>FASE ELIMINATORIA</Text>

        {loading ? (
          <ActivityIndicator color={COLORS.gold} size="large" style={{ marginTop: 40 }} />
        ) : (
          <ScrollView style={s.list}>
            {ROUNDS.map((round) => {
              const ms = byRound[round.key] || [];
              if (ms.length === 0) return null;
              return (
                <View key={round.key} style={s.roundBlock}>
                  <Text style={[s.roundTitle, { fontSize: 17 * scale }]}>{round.label}</Text>
                  <View style={[s.grid, isTwoCol ? s.gridTwo : s.gridOne]}>
                    {ms.map((m) => (
                      <MatchCard key={m.id} match={m} />
                    ))}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  back: { color: COLORS.gold, fontWeight: 'bold', marginBottom: 14 },
  title: { color: COLORS.gold, fontWeight: 'bold', letterSpacing: 3, marginBottom: 22 },
  list: { flex: 1 },
  roundBlock: { marginBottom: 28 },
  roundTitle: { color: COLORS.white, fontWeight: 'bold', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.gold, paddingBottom: 8, letterSpacing: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridTwo: { justifyContent: 'center' },
  gridOne: { justifyContent: 'center' },
  card: {
    backgroundColor: COLORS.panel,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    width: 320,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  teamName: { color: COLORS.white, fontWeight: '700', fontSize: 13, flexShrink: 1 },
  tbd: { color: COLORS.dim, fontStyle: 'italic' },
  scoreCol: { alignItems: 'center', minWidth: 60, marginHorizontal: 8 },
  score: { fontWeight: '900', fontSize: 20, letterSpacing: 1 },
  vs: { color: COLORS.dim, fontWeight: '700', fontSize: 14 },
  badgeRow: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'center',
  },
  badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
});
