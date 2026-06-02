export const CHANNELS = [
  {
    id: 'telefe',
    name: 'Telefe',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Telefe_logo.svg/120px-Telefe_logo.svg.png',
    url: 'https://telefeappmitelefe1.akamaized.net/hls/live/2037985/appmitelefe/TOK/hdntl=exp=1779044750~acl=%2f*~data=hdntl~hmac=f50c478c954f9075c8cf553b47ddd24d16a6dae0325b9e18ddd68bdbec2112bc/master-mtlf.m3u8',
  },
  {
    id: 'dsports',
    name: 'DSports',
    logo: null,
    url: null,
  },
  {
    id: 'espn',
    name: 'ESPN',
    logo: null,
    url: null,
  },
  {
    id: 'tycsports',
    name: 'TyC Sports',
    logo: null,
    url: null,
  },
];

let activeChannelId = 'telefe';

export function getActiveChannel() {
  return CHANNELS.find((c) => c.id === activeChannelId);
}

export function setActiveChannel(id) {
  const channel = CHANNELS.find((c) => c.id === id);
  if (channel) activeChannelId = id;
  return channel;
}

export function getChannels() {
  return CHANNELS;
}
