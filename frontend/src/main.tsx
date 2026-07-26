import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { Toaster } from 'react-hot-toast';
import { NotificationProvider } from './components/notifications';

// Global Fetch Interceptor to attach JWT token and bypass ngrok warning
const originalFetch = window.fetch;
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  init = init || {};
  init.headers = init.headers || {};

  // Add ngrok bypass header to all requests
  if (init.headers instanceof Headers) {
    init.headers.set('ngrok-skip-browser-warning', 'true');
  } else if (Array.isArray(init.headers)) {
    init.headers.push(['ngrok-skip-browser-warning', 'true']);
  } else {
    const headersRecord = init.headers as Record<string, string>;
    headersRecord['ngrok-skip-browser-warning'] = 'true';
  }

  const token = localStorage.getItem('zenti_session_token');
  if (token) {
    if (init.headers instanceof Headers) {
      if (!init.headers.has('Authorization')) {
        init.headers.set('Authorization', `Bearer ${token}`);
      }
    } else if (Array.isArray(init.headers)) {
      const hasAuth = init.headers.some(([key]) => key.toLowerCase() === 'authorization');
      if (!hasAuth) {
        init.headers.push(['Authorization', `Bearer ${token}`]);
      }
    } else {
      const headersRecord = init.headers as Record<string, string>;
      if (!headersRecord['Authorization'] && !headersRecord['authorization']) {
        headersRecord['Authorization'] = `Bearer ${token}`;
      }
    }
  }

  const response = await originalFetch(input, init);

  // A 401 from the auth endpoints themselves means "these credentials are wrong", not
  // "your session expired" - let the login / change-password form surface its own error
  // instead of tearing down the session and redirecting away from it.
  const requestUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const isAuthEndpoint = typeof requestUrl === 'string' && requestUrl.includes('/api/auth/');

  if (response.status === 401 && !isAuthEndpoint) {
    localStorage.removeItem("zenti_current_user_role");
    localStorage.removeItem("zenti_current_user_id");
    localStorage.removeItem("zenti_session_token");
    window.dispatchEvent(new CustomEvent('zenti-session-expired'));
  }
  return response;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NotificationProvider>
      <App />
    </NotificationProvider>
    <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
  </StrictMode>,
);
