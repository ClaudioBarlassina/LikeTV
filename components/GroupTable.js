import { useEffect, useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Pressable } from 'react-native';
import { fetchStandings } from '../services/api';
import { COLORS, FONTS } from '../constants/theme';

export default function GroupTable({ refreshKey = 0 }) {
  const [groups, setGroups] = useState([]);
  const [selected, setSelected] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    fetchStandings().then((data) => {
      setGroups(data);
      setSelected(prev => Math.min(prev, data.length - 1));
    });
  }, [refreshKey]);

  useEffect(() => {
    if (groups.length <= 1) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSelected(prev => (prev + 1) % groups.length);
    }, 10000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [groups.length]);

  const handlePress = (i) => {
    setSelected(i);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSelected(prev => (prev + 1) % groups.length);
    }, 10000);
  };

  const group = groups[selected];

  const sorted = useMemo(() => {
    if (!group) return [];
    return [...group.teams].sort((a, b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga));
  }, [group]);

  if (!group) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>TABLA</Text>
        <ActivityIndicator color={COLORS.gold} size="small" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>GRUPO {group.group}</Text>

      {groups.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.groupRow}>
            {groups.map((g, i) => (
              <Pressable
                key={g.group}
                style={[styles.groupBtn, i === selected && styles.groupBtnActive]}
                onPress={() => handlePress(i)}
              >
                <Text style={[styles.groupLabel, i === selected && styles.groupLabelActive]}>
                  {g.group}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}

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
  container: { gap: 8 },
  title: { color: COLORS.gold, fontSize: 16, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, borderBottomWidth: 1, borderBottomColor: '#333', paddingBottom: 6 },
  groupRow: { flexDirection: 'row', gap: 4 },
  groupBtn: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.06)' },
  groupBtnActive: { backgroundColor: COLORS.goldDim },
  groupLabel: { color: COLORS.dim, fontSize: 11, fontWeight: '600' },
  groupLabelActive: { color: COLORS.gold },
  table: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 6, padding: 3 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  rowActive: { backgroundColor: COLORS.goldDim, borderRadius: 6 },
  teamName: { color: COLORS.white, fontSize: FONTS.tableTeam },
  textActive: { color: COLORS.gold, fontWeight: 'bold' },
  pts: { color: COLORS.gold, fontWeight: 'bold', fontSize: FONTS.tablePts },
});
