import { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { CHANNELS } from '../constants/channels';
import { COLORS } from '../constants/theme';

async function loadHls() {
  if (typeof window !== 'undefined' && window.Hls) return window.Hls;
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
    s.onload = () => resolve(window.Hls);
    s.onerror = () => reject(new Error('Failed to load hls.js'));
    document.head.appendChild(s);
  });
}

function getStatusFromVideo(video) {
  if (!video) return 'idle';
  if (video.readyState === 0) return 'loading';
  if (video.paused && video.readyState > 0) return 'idle';
  if (video.readyState >= 3) return 'playing';
  if (video.error) return 'error';
  return 'loading';
}

export default function VideoPlayer({ selectedChannel, onChannelChange }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [status, setStatus] = useState('idle');
  const [hlsReady, setHlsReady] = useState(false);

  useEffect(() => {
    loadHls().then(() => setHlsReady(true)).catch(() => {});
  }, []);

  const channel = selectedChannel
    ? CHANNELS.find((c) => c.id === selectedChannel)
    : CHANNELS[0];
  const streamUrl = channel?.streamUrl || null;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl || !hlsReady) return;

    let active = true;

    async function setup() {
      const Hls = window.Hls;
      if (!Hls) return;

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      if (Hls.isSupported()) {
        const hls = new Hls();
        hlsRef.current = hls;
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (active) video.play().catch(() => {});
        });
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) setStatus('error');
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
      }
    }

    setup();

    return () => {
      active = false;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl, hlsReady]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    function onEvent() { setStatus(getStatusFromVideo(video)); }
    function onError() { setStatus('error'); }

    video.addEventListener('loadstart', onEvent);
    video.addEventListener('canplay', onEvent);
    video.addEventListener('playing', onEvent);
    video.addEventListener('waiting', onEvent);
    video.addEventListener('stalled', onEvent);
    video.addEventListener('error', onError);

    return () => {
      video.removeEventListener('loadstart', onEvent);
      video.removeEventListener('canplay', onEvent);
      video.removeEventListener('playing', onEvent);
      video.removeEventListener('waiting', onEvent);
      video.removeEventListener('stalled', onEvent);
      video.removeEventListener('error', onError);
    };
  }, [streamUrl]);

  useEffect(() => { setStatus('loading'); }, [streamUrl]);

  return (
    <View style={styles.fill}>
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
              {active && status === 'playing' && (
                <Text style={styles.liveDot}>●</Text>
              )}
            </Pressable>
          );
        })}
      </View>

      {streamUrl ? (
        <video
          ref={videoRef}
          style={styles.video}
          autoPlay
          muted
          playsInline
        />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.phIcon}>📡</Text>
          <Text style={styles.phTitle}>{channel?.name}</Text>
          <Text style={styles.phSub}>{channel?.note || ''}</Text>
          <Text style={styles.phHint}>Elegí un canal arriba</Text>
        </View>
      )}

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
    width: '100%',
    height: 'auto',
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
