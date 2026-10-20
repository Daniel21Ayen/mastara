import { useSyncExternalStore } from 'react';

let NetInfo: typeof import('@react-native-community/netinfo').default | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@react-native-community/netinfo');
  NetInfo = mod.default ?? mod;
} catch {
  NetInfo = null;
}


type Listener = () => void;

let deviceOnline = true;
let forcedOffline = false;
const listeners = new Set<Listener>();

const notify = () => listeners.forEach((listener) => listener());

function fromNetInfo(state: { isConnected: boolean | null; isInternetReachable: boolean | null }): boolean {
  return state.isConnected !== false && state.isInternetReachable !== false;
}

// Start watching as soon as this file is first imported (if NetInfo is available in native runtime).
if (NetInfo) {
  void NetInfo.fetch().then((state) => {
    deviceOnline = fromNetInfo(state);
    notify();
  });
  NetInfo.addEventListener((state) => {
    deviceOnline = fromNetInfo(state);
    notify();
  });
}


/** True when the phone can reach the internet (and the demo "simulate offline" switch is off). */
export function isOnline(): boolean {
  return deviceOnline && !forcedOffline;
}

/** Demo switch used while the server is a mock. Real offline testing: use airplane mode. */
export function setForcedOffline(value: boolean): void {
  forcedOffline = value;
  notify();
}

export function subscribeOnline(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, isOnline, isOnline);
}
