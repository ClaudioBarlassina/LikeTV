import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { fetchStandings } from '../services/api';
import { COLORS, FONTS } from '../constants/theme';

export default function GroupTable() {
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    fetchStandings().then(setGroups);
  }, []);

  const group = groups[0];

  if (!group) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>TABLA</Text>
        <ActivityIndicator color={COLORS.gold} size="small" />
      </View>
    );
  }

  const sorted = [...group.teams].sort((a, b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>GRUPO {group.group}</Text>
      <View style={styles.table}>
        {sorted.map((team, i) => (
          <View key={team.name} style={[styles.row, i === 0 && styles.rowActive]}>
            <Text style={[styles.teamName, i === 0 && styles.textActive]}>
              {team.rank}. {team.name}
            </Text>
            <Text style={styles.pts}>{team.points} pts</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 15 },
  title: { color: COLORS.gold, fontSize: FONTS.sectionTitle, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 2, borderBottomWidth: 2, borderBottomColor: '#333', paddingBottom: 15 },
  table: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  rowActive: { backgroundColor: COLORS.goldDim, borderRadius: 6 },
  teamName: { color: COLORS.white, fontSize: FONTS.tableTeam },
  textActive: { color: COLORS.gold, fontWeight: 'bold' },
  pts: { color: COLORS.gold, fontWeight: 'bold', fontSize: FONTS.tablePts },
});
