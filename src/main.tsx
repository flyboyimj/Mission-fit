import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Installable PWA when served from a normal web host. Service workers are not
// available inside sandboxed previews, so failures are ignored.
if ('serviceWorker' in navigator && location.protocol === 'https:' && !(window as unknown as { __NO_SW__?: boolean }).__NO_SW__) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      // Check for a new deploy whenever the app comes back to the foreground.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
    }).catch(() => {});
  });
}
