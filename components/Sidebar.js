import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import FinishedMatches from './FinishedMatches';
import GroupTable from './GroupTable';
import UpcomingMatches from './UpcomingMatches';
import TeamFlag from './TeamFlag';
import { COLORS } from '../constants/theme';

export default function Sidebar({ matchA, matches, refreshKey }) {
  const { width: windowWidth } = useWindowDimensions();
  const scale = Math.min(1, Math.max(0.65, windowWidth / 1920));
  const sideW = 440 * scale;
  const sidePad = 25 * scale;

  const liveMatches = (matches || []).filter(m => m.status === 'live');
  const [liveIdx, setLiveIdx] = useState(0);
  const liveTimer = useRef(null);

  useEffect(() => {
    if (liveMatches.length < 2) {
      setLiveIdx(0);
      if (liveTimer.current) clearInterval(liveTimer.current);
      return;
    }
    if (liveTimer.current) clearInterval(liveTimer.current);
    liveTimer.current = setInterval(() => {
      setLiveIdx(prev => (prev + 1) % liveMatches.length);
    }, 6000);
    return () => { if (liveTimer.current) clearInterval(liveTimer.current); };
  }, [liveMatches.length, refreshKey]);

  const currentLive = liveMatches.length > 0 ? liveMatches[liveIdx % liveMatches.length] : null;

  return (
    <View style={[styles.sidebar, { width: sideW }]}>
      <View style={{ flex: 1, padding: sidePad, gap: 12, justifyContent: 'flex-start' }}>

        {/* EN VIVO */}
        {currentLive && (
          <>
            <Text style={styles.title}>EN VIVO</Text>
            <View style={[styles.liveCard, { padding: sidePad * 0.7 }]}>
              <View style={styles.liveHeader}>
                <View style={styles.liveDot} />
                <Text style={styles.liveLabel}>EN VIVO</Text>
                {currentLive.time_elapsed && currentLive.time_elapsed !== 'notstarted' && (
                  <Text style={styles.liveTime}>{currentLive.time_elapsed}&apos;</Text>
                )}
              </View>
              <View style={styles.liveTeams}>
                <View style={styles.liveTeamRow}>
                  <TeamFlag name={currentLive.home_team} iso2={currentLive.home_iso2} size={22 * scale} />
                  <Text style={[styles.liveTeamName, { fontSize: 15 * scale }]} numberOfLines={1}>{currentLive.home_team}</Text>
                </View>
                <Text style={[styles.liveScore, { fontSize: 32 * scale }]}>
                  {currentLive.home_score} - {currentLive.away_score}
                </Text>
                <View style={styles.liveTeamRow}>
                  <TeamFlag name={currentLive.away_team} iso2={currentLive.away_iso2} size={22 * scale} />
                  <Text style={[styles.liveTeamName, { fontSize: 15 * scale }]} numberOfLines={1}>{currentLive.away_team}</Text>
                </View>
              </View>
            </View>
          </>
        )}

        <FinishedMatches matches={matches} />
        <GroupTable refreshKey={refreshKey} />
        <UpcomingMatches matches={matches} />

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    backgroundColor: COLORS.panel,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
    gap: 20,
  },
  title: {
    color: COLORS.gold,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 6,
    fontSize: 16,
  },
  liveCard: {
    backgroundColor: 'rgba(255,0,0,0.08)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.live,
    gap: 10,
  },
  liveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.live,
  },
  liveLabel: {
    color: COLORS.live,
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 1,
  },
  liveTime: {
    color: COLORS.live,
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 'auto',
  },
  liveTeams: {
    gap: 6,
  },
  liveTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveTeamName: {
    color: COLORS.white,
    fontWeight: 'bold',
    flex: 1,
  },
  liveScore: {
    color: COLORS.gold,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 3,
  },
});
