import { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { CHANNELS } from '../constants/channels';
import { COLORS } from '../constants/theme';

const STATUS_MAP = {
  idle: 'idle',
  loading: 'loading',
  readyToPlay: 'playing',
  error: 'error',
};

export default function VideoPlayer({ selectedChannel, onChannelChange }) {
  const [status, setStatus] = useState('idle');

  const channel = selectedChannel
    ? CHANNELS.find((c) => c.id === selectedChannel)
    : CHANNELS[0];
  const streamUrl = channel?.streamUrl || null;

  const player = useVideoPlayer(streamUrl ? { uri: streamUrl } : null, (p) => {
    if (streamUrl) {
      p.play();
      p.muted = true;
    }
  });

  const { status: playerStatus } = useEvent(player, 'statusChange', {
    status: player?.status,
  });

  useEffect(() => {
    setStatus(STATUS_MAP[playerStatus] || 'idle');
  }, [playerStatus]);

  return (
    <View style={styles.fill}>
      {/* Channel selector strip */}
      <View style={styles.channelStrip}>
        {CHANNELS.map((ch) => {
          const active = ch.id === (selectedChannel || CHANNELS[0].id);
          return (
            <Pressable
              key={ch.id}
              style={[styles.chBtn, active && styles.chBtnActive]}
              onPress={() => onChannelChange?.(ch.id)}
            >
              <Text style={[styles.chLabel, active && styles.chLabelActive]}>
                {ch.name.toUpperCase()}
              </Text>
              {active && player?.playing && (
                <Text style={styles.liveDot}>●</Text>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Video / Placeholder */}
      {streamUrl ? (
        <VideoView
          player={player}
          style={styles.video}
          contentFit="cover"
          nativeControls={false}
        />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.phIcon}>📡</Text>
          <Text style={styles.phTitle}>{channel?.name}</Text>
          <Text style={styles.phSub}>{channel?.note || ''}</Text>
          <Text style={styles.phHint}>Elegí un canal arriba</Text>
        </View>
      )}

      {/* Status overlay */}
      {streamUrl && status === 'loading' && (
        <View style={styles.overlay}>
          <Text style={styles.loadingText}>Conectando...</Text>
        </View>
      )}
      {streamUrl && status === 'error' && (
        <View style={styles.overlay}>
          <Text style={styles.errorText}>Sin señal</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  channelStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.9)',
    flexDirection: 'row',
    paddingHorizontal: 10,
    gap: 6,
    zIndex: 20,
  },
  chBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    gap: 4,
  },
  chBtnActive: { backgroundColor: COLORS.goldDim },
  chLabel: { color: COLORS.dim, fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  chLabelActive: { color: COLORS.gold },
  liveDot: { color: COLORS.live, fontSize: 8 },
  video: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    bottom: 0,
  },
  placeholder: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  phIcon: { fontSize: 36 },
  phTitle: { color: COLORS.white, fontSize: 20, fontWeight: 'bold' },
  phSub: { color: COLORS.dim, fontSize: 13 },
  phHint: { color: COLORS.gold, fontSize: 11, marginTop: 8, fontStyle: 'italic' },
  overlay: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  loadingText: { color: COLORS.gold, fontSize: 15, fontWeight: '600' },
  errorText: { color: COLORS.dim, fontSize: 16, fontWeight: '600' },
});
