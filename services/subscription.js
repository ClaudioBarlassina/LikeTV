import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

const API_BASE = 'https://dashtv.onrender.com';
const SUBSCRIPTION_FILE = FileSystem.documentDirectory + 'dash_subscription.json';
const DEVICE_ID_FILE = FileSystem.documentDirectory + 'dash_device_id.json';

let _deviceIdPromise = null;

async function getDeviceId() {
  try {
    if (Platform.OS === 'web') {
      const stored = localStorage.getItem('dash_device_id');
      if (stored) return stored;
    } else {
      try {
        const stored = await FileSystem.readAsStringAsync(DEVICE_ID_FILE);
        if (stored) return stored.replace(/^"|"$/g, '');
      } catch {}
    }
  } catch {}
  const id = 'tv_' + Math.random().toString(36).slice(2, 10);
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem('dash_device_id', id);
    } else {
      await FileSystem.writeAsStringAsync(DEVICE_ID_FILE, JSON.stringify(id));
    }
  } catch {}
  return id;
}

function ensureDeviceId() {
  if (!_deviceIdPromise) {
    _deviceIdPromise = getDeviceId();
  }
  return _deviceIdPromise;
}

export function getChannelsFromServer() {
  return fetch(`${API_BASE}/api/channels`)
    .then((r) => r.json())
    .catch(() => []);
}

export async function getSubscription() {
  try {
    if (Platform.OS === 'web') {
      const raw = localStorage.getItem('dash_subscription');
      return raw ? JSON.parse(raw) : null;
    }
    const raw = await FileSystem.readAsStringAsync(SUBSCRIPTION_FILE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveSubscription(data) {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem('dash_subscription', JSON.stringify(data));
    } else {
      await FileSystem.writeAsStringAsync(SUBSCRIPTION_FILE, JSON.stringify(data));
    }
  } catch {}
}

export async function clearSubscription() {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem('dash_subscription');
    } else {
      try {
        await FileSystem.deleteAsync(SUBSCRIPTION_FILE, { idempotent: true });
      } catch {}
    }
  } catch {}
}

export async function checkSubscription() {
  try {
    const deviceId = await ensureDeviceId();
    const res = await fetch(
      `${API_BASE}/api/subscriptions/verify?deviceId=${encodeURIComponent(deviceId)}`
    );
    const data = await res.json();
    if (data.valid) {
      await saveSubscription(data);
      return { valid: true, channels: data.channels || [], expiresAt: data.expiresAt };
    }
    await clearSubscription();
    return { valid: false, channels: data.channels || [] };
  } catch {
    const cached = await getSubscription();
    if (cached) return { valid: true, ...cached };
    return { valid: false, channels: [] };
  }
}

export async function activateCode(code) {
  const deviceId = await ensureDeviceId();
  const res = await fetch(`${API_BASE}/api/subscriptions/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      deviceId,
      deviceName: Platform.OS === 'web' ? 'Web' : Platform.OS,
    }),
  });
  const data = await res.json();
  if (data.success) {
    await saveSubscription(data);
  }
  return data;
}
