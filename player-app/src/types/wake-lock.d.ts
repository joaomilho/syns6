// Type definitions for the Screen Wake Lock API
// https://www.w3.org/TR/screen-wake-lock/

interface WakeLockSentinel extends EventTarget {
  readonly released: boolean;
  readonly type: WakeLockType;
  release(): Promise<void>;
  addEventListener(
    type: 'release',
    listener: (this: WakeLockSentinel, ev: Event) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
}

type WakeLockType = 'screen';

interface WakeLock {
  request(type: WakeLockType): Promise<WakeLockSentinel>;
}

interface Navigator {
  readonly wakeLock?: WakeLock;
}

