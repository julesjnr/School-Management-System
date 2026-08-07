import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { Toaster } from 'react-hot-toast';
import { NotificationProvider } from './components/notifications';

let refreshTokenPromise: Promise<string | null> | null = null;

async function performSilentRefresh(): Promise<string | null> {
  if (refreshTokenPromise) {
    return refreshTokenPromise;
  }

  refreshTokenPromise = (async () => {
    try {
      const storedRefreshToken = localStorage.getItem('zenti_refresh_token');
      const headersRecord: Record<string, string> = {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      };
      if (storedRefreshToken) {
        headersRecord['x-refresh-token'] = storedRefreshToken;
      }

      const res = await originalFetch('/api/auth/refresh', {
        method: 'POST',
        headers: headersRecord,
        credentials: 'include',
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
      });

      if (!res.ok) {
        return null;
      }

      const data = await res.json();
      if (data.success && data.token) {
        localStorage.setItem('zenti_session_token', data.token);
        if (data.refreshToken) {
          localStorage.setItem('zenti_refresh_token', data.refreshToken);
        }
        return data.token as string;
      }
      return null;
    } catch {
      return null;
    } finally {
      refreshTokenPromise = null;
    }
  })();

  return refreshTokenPromise;
}

// Global Fetch Interceptor to attach JWT token, include credentials, and silently refresh on 401
const originalFetch = window.fetch;
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  init = init || {};
  init.credentials = init.credentials || 'include';
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

  const attachTokenHeader = (options: RequestInit, authToken: string) => {
    if (options.headers instanceof Headers) {
      options.headers.set('Authorization', `Bearer ${authToken}`);
    } else if (Array.isArray(options.headers)) {
      options.headers = options.headers.filter(([key]) => key.toLowerCase() !== 'authorization');
      options.headers.push(['Authorization', `Bearer ${authToken}`]);
    } else {
      const record = { ...(options.headers as Record<string, string>) };
      record['Authorization'] = `Bearer ${authToken}`;
      options.headers = record;
    }
  };

  const token = localStorage.getItem('zenti_session_token');
  if (token) {
    attachTokenHeader(init, token);
  }

  let response = await originalFetch(input, init);

  const requestUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const isRefreshEndpoint = typeof requestUrl === 'string' && requestUrl.includes('/api/auth/refresh');
  const isAuthEndpoint = typeof requestUrl === 'string' && (
    requestUrl.includes('/api/auth/login') ||
    requestUrl.includes('/api/auth/change-password') ||
    requestUrl.includes('/api/auth/change-passcode') ||
    requestUrl.includes('/api/auth/reset-request') ||
    requestUrl.includes('/api/auth/reset-requests')
  );

  const expireSession = () => {
    localStorage.removeItem("zenti_current_user_role");
    localStorage.removeItem("zenti_current_user_id");
    localStorage.removeItem("zenti_session_token");
    localStorage.removeItem("zenti_refresh_token");
    window.history.pushState({}, '', '/login');
    window.dispatchEvent(new CustomEvent('zenti-session-expired'));
  };

  if (response.status === 401 && !isAuthEndpoint && !isRefreshEndpoint) {
    const newToken = await performSilentRefresh();
    if (newToken) {
      attachTokenHeader(init, newToken);
      const retriedResponse = await originalFetch(input, init);
      // If token refresh succeeded but we still get 401, treat as expired.
      if (retriedResponse.status === 401) {
        expireSession();
        return retriedResponse;
      }
      // For other statuses (including 403), return the response so the UI can
      // show a proper 'forbidden' message instead of being forced to login.
      return retriedResponse;
    }

    // No refresh token or refresh failed: expire session.
    expireSession();
  } else if ((response.status === 401 || response.status === 403) && isRefreshEndpoint) {
    expireSession();
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
