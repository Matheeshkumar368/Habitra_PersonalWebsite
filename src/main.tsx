// Ensure window.fetch has a setter so extension inspectors can intercept fetch without throwing
if (typeof window !== 'undefined') {
  try {
    const _nativeFetch = typeof window.fetch === 'function' ? window.fetch.bind(window) : window.fetch;
    let _currentFetch = _nativeFetch;
    Object.defineProperty(window, 'fetch', {
      configurable: true,
      enumerable: true,
      get() {
        return _currentFetch;
      },
      set(val) {
        _currentFetch = val;
      },
    });
  } catch {
    // Ignore if already patched or not configurable
  }
}

import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

const isElectronRuntime =
  typeof window !== 'undefined' &&
  (Boolean((window as unknown as { habitraDesktop?: unknown }).habitraDesktop) ||
    window.location.protocol === 'file:');

if (!isElectronRuntime && typeof window !== 'undefined') {
  registerSW({
    immediate: true,
    onOfflineReady() {
      // Habitra is cached for 100% offline local operation
    },
  });
}

createRoot(document.getElementById('root')!).render(<App />);

