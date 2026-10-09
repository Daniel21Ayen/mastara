// apps/mobile/src/core/network/connectivity.ts
import NetInfo from '@react-native-community/netinfo';
import type { NetInfoState } from '@react-native-community/netinfo';
import { useSyncExternalStore } from 'react';

type Listener = () => void;

let deviceOnline = true;
let forcedOffline = false;
const listeners = new Set<Listener>();

const notify = () => listeners.forEach((listener) => listener());

function fromNetInfo(state: NetInfoState): boolean {
  return state.isConnected !== false && state.isInternetReachable !== false;
}

// Start watching as soon as this file is first imported.
void NetInfo.fetch().then((state) => {
  deviceOnline = fromNetInfo(state);
  notify();
});
NetInfo.addEventListener((state) => {
  deviceOnline = fromNetInfo(state);
  notify();
});

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
