import { getChannelsFromServer } from '../services/subscription';

const IS_WEB = typeof window !== 'undefined' && !!window.document;
const PROXY_PORT = 4000;

function proxyUrl(url) {
  if (!url || !IS_WEB) return url;
  return `http://localhost:${PROXY_PORT}/proxy/video?url=${encodeURIComponent(url)}`;
}

const DEFAULTS = [
  { id: 'telefe', name: 'Telefe', country: 'Argentina', logo: null, streamUrl: proxyUrl(null), note: 'Disponible durante el Mundial' },
  { id: 'dsports', name: 'DSports', country: 'Argentina', logo: null, streamUrl: proxyUrl('https://ub2dr.envivoslatam.org/dsports/tracks-v1a1/mono.m3u8?ip=181.118.186.80&token=5fe3860bb095d872d5c536bb9bb0d9cf771980b1-db-1780394798-1780340798'), note: 'Deportes en vivo' },
  { id: 'espn', name: 'ESPN', country: 'Argentina', logo: null, streamUrl: proxyUrl(null), note: 'Disponible durante el Mundial' },
  { id: 'tycsports', name: 'TyC Sports', country: 'Argentina', logo: null, streamUrl: proxyUrl(null), note: 'Disponible durante el Mundial' },
];

export const CHANNELS = [...DEFAULTS];

let _loaded = false;

export async function loadChannels() {
  if (_loaded) return;
  try {
    const server = await getChannelsFromServer();
    if (server && server.length > 0) {
      CHANNELS.length = 0;
      CHANNELS.push(...server.map((ch) => ({
        ...ch,
        streamUrl: proxyUrl(ch.streamUrl),
      })));
    }
  } catch {}
  _loaded = true;
}


