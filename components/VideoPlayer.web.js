import { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { CHANNELS, isMpdUrl } from '../constants/channels';
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

async function loadShaka() {
  if (typeof window !== 'undefined' && window.shaka?.Player) return window.shaka;
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/shaka-player@4.13.0/dist/shaka-player.compiled.js';
    s.onload = () => {
      if (window.shaka) {
        window.shaka.polyfill.installAll();
        resolve(window.shaka);
      } else {
        reject(new Error('shaka-player loaded but not found'));
      }
    };
    s.onerror = () => reject(new Error('Failed to load shaka-player'));
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
  const shakaRef = useRef(null);
  const [status, setStatus] = useState('idle');
  const [hlsReady, setHlsReady] = useState(false);
  const [shakaReady, setShakaReady] = useState(false);

  useEffect(() => {
    Promise.all([
      loadHls().then(() => setHlsReady(true)).catch(() => {}),
      loadShaka().then(() => setShakaReady(true)).catch(() => {}),
    ]);
  }, []);

  const channel = selectedChannel
    ? CHANNELS.find((c) => c.id === selectedChannel)
    : CHANNELS[0];
  const streamUrl = channel?.streamUrl || null;
  const isMpd = isMpdUrl(streamUrl);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    if (isMpd) {
      if (!shakaReady) return;
    } else {
      if (!hlsReady) return;
    }

    let active = true;

    if (shakaRef.current) {
      shakaRef.current.destroy();
      shakaRef.current = null;
    }
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    async function setupShaka() {
      try {
        const player = new window.shaka.Player();
        shakaRef.current = player;
        player.attach(video, true);

        player.addEventListener('error', (event) => {
          if (active) {
            console.error('[Shaka]', event.detail?.category, event.detail?.code, event.detail?.data, event);
            setStatus('error');
          }
        });
        player.addEventListener('buffering', (event) => {
          if (active) setStatus(event.buffering ? 'loading' : 'playing');
        });

        // Try to detect DRM license URL from PlayReady PSSH in the MPD
        try {
          const mpdText = await (await fetch(streamUrl)).text();
          const laMatch = mpdText.match(/<LA_URL>([^<]+)<\/LA_URL>/i);
          if (laMatch) {
            const prUrl = laMatch[1];
            const wvUrl = prUrl.replace('prls.', 'wvls.');
            player.configure({ drm: { servers: {
              'com.widevine.alpha': wvUrl,
              'com.microsoft.playready': prUrl,
            }}});
            console.log('[Shaka] DRM configured:', { wvUrl, prUrl });
          }
        } catch (drmErr) {
          console.warn('[Shaka] DRM detection failed, trying without:', drmErr);
        }

        await player.load(streamUrl);
        if (active) video.play().catch(() => {});
      } catch (e) {
        if (active) {
          console.error('[Shaka] setup error', e);
          setStatus('error');
        }
      }
    }

    function setupHls() {
      const Hls = window.Hls;
      if (!Hls) return;

      if (Hls.isSupported()) {
        const hls = new Hls();
        hlsRef.current = hls;
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (active) video.play().catch(() => {});
        });
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal && active) setStatus('error');
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
      }
    }

    if (isMpd) {
      setupShaka();
    } else {
      setupHls();
    }

    return () => {
      active = false;
      if (shakaRef.current) {
        shakaRef.current.destroy();
        shakaRef.current = null;
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl, hlsReady, shakaReady, isMpd]);

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
          crossOrigin="anonymous"
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
