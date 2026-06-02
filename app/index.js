import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import VideoPanel from '../components/VideoPanel';
import Sidebar from '../components/Sidebar';
import BottomBar from '../components/BottomBar';
import NavBar from '../components/NavBar';
import Countdown from '../components/Countdown';
import { fetchLiveMatches } from '../services/api';
import { COLORS } from '../constants/theme';

const TOP_OFFSET = 90;
const BOTTOM_RESERVED = 275;
const COMPACT_BREAK = 800;

export default function LiveMatch() {
  const [matches, setMatches] = useState([]);
  const [matchA, setMatchA] = useState(null);
  const [matchB, setMatchB] = useState(null);
  const [matchC, setMatchC] = useState(null);
  const [channelA, setChannelA] = useState(null);
  const [channelB, setChannelB] = useState(null);
  const [channelC, setChannelC] = useState(null);
  const [focused, setFocused] = useState('A');
  const [layout, setLayout] = useState('full');
  const [giant, setGiant] = useState(false);
  const [focusKey, setFocusKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      return () => setFocusKey((k) => k + 1);
    }, [])
  );

  const matchARef = useRef(null);
  const matchBRef = useRef(null);

  const fetchData = useCallback(async () => {
    const data = await fetchLiveMatches();
    setMatches(data);

    setMatchA((prev) => {
      const match = prev ? data.find((m) => m.id === prev.id) : null;
      return match || data.find((m) => m.status === 'live') || data[0] || null;
    });

    setMatchB((prev) => {
      const match = prev ? data.find((m) => m.id === prev.id) : null;
      if (match) return match;
      const idA = matchARef.current?.id || data[0]?.id;
      return data.find((m) => m.id !== idA) || data[1] || null;
    });
  }, []);

  useEffect(() => { matchARef.current = matchA; }, [matchA]);
  useEffect(() => { matchBRef.current = matchB; }, [matchB]);

  useEffect(() => {
    if (!matchA || !matchB) return;
    setMatchC((prev) => {
      if (prev && matches.find((m) => m.id === prev.id)) return prev;
      const ids = [matchA.id, matchB.id];
      const third = matches.find((m) => !ids.includes(m.id));
      return third || matches[2] || null;
    });
  }, [matchA, matchB, matches]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const promoteToMain = useCallback((target) => {
    if (target === 'B') {
      setMatchA(matchB);
      setMatchB(matchA);
      setChannelA(channelB);
      setChannelB(channelA);
      setFocused('A');
    } else if (target === 'C') {
      setMatchA(matchC);
      setMatchC(matchA);
      setChannelA(channelC);
      setChannelC(channelA);
      setFocused('A');
    }
  }, [matchA, matchB, matchC, channelA, channelB, channelC]);

  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const compact = windowWidth < COMPACT_BREAK;
  const scale = Math.min(1, Math.max(0.7, windowWidth / 1920));
  const margin = compact ? 8 : 40 * scale;
  const topOffset = compact ? 50 : TOP_OFFSET;
  const bottomReserved = compact ? 130 : BOTTOM_RESERVED;
  const availHeight = Math.max(compact ? 120 : 300, windowHeight - topOffset - bottomReserved);
  const splitHeight = Math.round(availHeight * 0.66);
  const tripleSmallHeight = Math.round((availHeight - (compact ? 4 : 20)) / 2);
  const mainWidth = compact ? windowWidth - margin * 2 : 1360 * scale;
  const halfW = compact ? (windowWidth - margin * 2 - 10) / 2 : 670 * scale;
  const tripleMainW = compact ? (windowWidth - margin * 2) * 0.6 : 900 * scale;
  const tripleSideW = compact ? (windowWidth - margin * 2) * 0.4 - 5 : 440 * scale;
  const togglePos = compact ? { right: margin } : { left: margin };

  const activeMatch = focused === 'A' ? matchA : focused === 'B' ? matchB : matchC;
  const hasContent = matches.some((m) => m.status !== 'upcoming');

  return (
    <View style={styles.container}>
      {!giant && <NavBar />}

      {/* Layout toggle */}
      {!giant && (
        <View style={[styles.layoutToggle, { top: compact ? 52 : 55, ...togglePos }]}>
          <Pressable
            style={[styles.layoutBtn, layout === 'full' && styles.layoutBtnActive, { paddingHorizontal: compact ? 8 : 12 * scale, paddingVertical: compact ? 5 : 8 * scale, borderRadius: compact ? 4 : 6 * scale }]}
            onPress={() => { setLayout('full'); setGiant(false); }}
          >
            <Text style={[styles.layoutLabel, layout === 'full' && styles.layoutLabelActive, { fontSize: compact ? 11 : 11 * scale }]}>FULL</Text>
          </Pressable>
          <Pressable
            style={[styles.layoutBtn, layout === 'split' && styles.layoutBtnActive, { paddingHorizontal: compact ? 8 : 12 * scale, paddingVertical: compact ? 5 : 8 * scale, borderRadius: compact ? 4 : 6 * scale }]}
            onPress={() => { setLayout('split'); setGiant(false); }}
          >
            <Text style={[styles.layoutLabel, layout === 'split' && styles.layoutLabelActive, { fontSize: compact ? 11 : 11 * scale }]}>SPLIT</Text>
          </Pressable>
          <Pressable
            style={[styles.layoutBtn, layout === 'triple' && styles.layoutBtnActive, { paddingHorizontal: compact ? 8 : 12 * scale, paddingVertical: compact ? 5 : 8 * scale, borderRadius: compact ? 4 : 6 * scale }]}
            onPress={() => { setLayout('triple'); setGiant(false); }}
          >
            <Text style={[styles.layoutLabel, layout === 'triple' && styles.layoutLabelActive, { fontSize: compact ? 11 : 11 * scale }]}>1+2</Text>
          </Pressable>
        </View>
      )}

      {/* FULL: 1 big panel */}
      {layout === 'full' && !giant && (
        <View style={[styles.fullContainer, { height: availHeight, width: mainWidth, top: topOffset, left: margin }]}>
          <VideoPanel
            key={`full-${focusKey}`}
            match={matchA} channelId={channelA} onChannelChange={setChannelA}
            onFocus={() => setFocused('A')} focused muted={false}
          />
          <Pressable style={[styles.giantBtn, { top: compact ? 4 : 8, right: compact ? 4 : 8, paddingHorizontal: compact ? 6 : 10 * scale, paddingVertical: compact ? 4 : 6 * scale, borderRadius: compact ? 4 : 6 * scale }]} onPress={() => setGiant(true)}>
            <Text style={[styles.giantBtnText, { fontSize: compact ? 13 : 14 * scale }]}>⛶</Text>
          </Pressable>
        </View>
      )}

      {/* GIANT: pantalla gigante */}
      {layout === 'full' && giant && (
        <View style={styles.giantContainer}>
          <VideoPanel
            key={`giant-${focusKey}`}
            match={matchA} channelId={channelA} onChannelChange={setChannelA}
            onFocus={() => setFocused('A')} focused muted={false}
          />
          <Pressable style={[styles.giantBtn, { top: compact ? 10 : 20, right: compact ? 10 : 20, paddingHorizontal: compact ? 8 : 12 * scale, paddingVertical: compact ? 5 : 8 * scale, borderRadius: compact ? 4 : 6 * scale }]} onPress={() => setGiant(false)}>
            <Text style={[styles.giantBtnText, { fontSize: compact ? 11 : 11 * scale }]}>SALIR</Text>
          </Pressable>
        </View>
      )}

      {/* SPLIT: 2 equal panels */}
      {layout === 'split' && (
        <View style={[styles.videoRow, { height: splitHeight, width: mainWidth, top: topOffset, left: margin }]}>
          <View style={[styles.panelHalf, { height: splitHeight, width: halfW }]}>
            <VideoPanel
              key={`split-a-${focusKey}`}
              match={matchA} channelId={channelA} onChannelChange={setChannelA}
              onFocus={() => setFocused('A')} focused={focused === 'A'} muted={false}
            />
          </View>
          {!compact && <View style={styles.divider} />}
          <View style={[styles.panelHalf, { height: splitHeight, width: halfW }]}>
            <VideoPanel
              key={`split-b-${focusKey}`}
              match={matchB} channelId={channelB} onChannelChange={setChannelB}
              onFocus={() => setFocused('B')} focused={focused === 'B'} muted={false}
            />
          </View>
        </View>
      )}

      {/* TRIPLE: 1 big left + 2 small stacked right */}
      {layout === 'triple' && (
        <View style={[styles.tripleContainer, { height: availHeight, width: mainWidth, top: topOffset, left: margin }]}>
          <View style={[styles.tripleMain, { height: availHeight, width: tripleMainW }]}>
            <VideoPanel
              key={`triple-a-${focusKey}`}
              match={matchA} channelId={channelA} onChannelChange={setChannelA}
              onFocus={() => setFocused('A')} focused={focused === 'A'} muted={false}
            />
          </View>
          {!compact && <View style={styles.dividerSm} />}
          <View style={[styles.tripleSide, { height: availHeight, width: tripleSideW }]}>
            <View style={[styles.tripleSmall, { height: tripleSmallHeight, width: tripleSideW }]}>
              <VideoPanel
                key={`triple-b-${focusKey}`}
                match={matchB} channelId={channelB} onChannelChange={setChannelB}
                onFocus={() => promoteToMain('B')} focused={false} muted
              />
            </View>
            <View style={[styles.tripleSmall, { height: tripleSmallHeight, width: tripleSideW }]}>
              <VideoPanel
                key={`triple-c-${focusKey}`}
                match={matchC} channelId={channelC} onChannelChange={setChannelC}
                onFocus={() => promoteToMain('C')} focused={false} muted
              />
            </View>
          </View>
        </View>
      )}

      {!giant && !compact && <Sidebar match={activeMatch} matches={matches} />}

      {!giant && !hasContent ? (
        <View style={[styles.countdownWrapper, { width: mainWidth, height: compact ? 170 : 235, bottom: compact ? margin : 40, left: margin }]}>
          <Countdown />
        </View>
      ) : !giant ? (
        <BottomBar compact={compact} margin={margin} />
      ) : null}


    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  layoutToggle: {
    position: 'absolute', zIndex: 50,
    flexDirection: 'row', gap: 4,
  },
  layoutBtn: {
    backgroundColor: COLORS.panel, borderWidth: 1, borderColor: '#333',
  },
  layoutBtnActive: { backgroundColor: COLORS.goldDim, borderColor: COLORS.gold },
  layoutLabel: { color: COLORS.dim, fontWeight: '600', letterSpacing: 1 },
  layoutLabelActive: { color: COLORS.gold },

  // Full (1 big)
  fullContainer: {
    position: 'absolute',
  },
  // Giant (fullscreen)
  giantContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 100,
  },
  giantBtn: {
    position: 'absolute',
    backgroundColor: COLORS.panel, borderWidth: 1, borderColor: '#333',
    zIndex: 110,
  },
  giantBtnText: { color: COLORS.gold, fontWeight: '600', letterSpacing: 1 },

  // Split (2 equal)
  videoRow: {
    position: 'absolute',
    flexDirection: 'row', alignItems: 'stretch',
  },
  panelHalf: {},
  divider: { width: 1, height: '100%', backgroundColor: COLORS.border, marginHorizontal: 9 },

  // Triple (1 big left + 2 small right)
  tripleContainer: {
    position: 'absolute',
    flexDirection: 'row', alignItems: 'stretch',
  },
  tripleMain: {},
  tripleSide: {
    justifyContent: 'space-between',
  },
  tripleSmall: {},
  dividerSm: { width: 1, height: '100%', backgroundColor: COLORS.border, marginHorizontal: 9 },

  countdownWrapper: {
    position: 'absolute',
    backgroundColor: COLORS.panel, justifyContent: 'center', alignItems: 'center',
  },
});
