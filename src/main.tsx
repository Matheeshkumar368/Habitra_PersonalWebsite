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

