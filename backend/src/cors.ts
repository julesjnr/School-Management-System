import cors from 'cors';

const defaultOrigins = [
  'http://localhost:8000',
  'http://127.0.0.1:8000',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

function parseEnvOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS;
  if (!raw) return [];
  return raw.split(',').map((origin) => origin.trim()).filter(Boolean);
}

export function getAllowedOrigins(): string[] {
  const origins = new Set<string>([
    ...defaultOrigins,
    ...parseEnvOrigins(),
    process.env.APP_URL,
    process.env.FRONTEND_URL,
  ].filter((origin): origin is string => Boolean(origin)));

  return Array.from(origins);
}

export function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  return allowedOrigins.some(
    (allowed) => allowed === origin || origin.startsWith(allowed),
  ) || /\.ngrok-free\.dev$/.test(origin) || /\.ngrok\.io$/.test(origin);
}

export function createCorsMiddleware() {
  const allowedOrigins = getAllowedOrigins();

  return cors({
    origin: (origin, callback) => {
      if (!origin || isOriginAllowed(origin, allowedOrigins)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-role', 'x-user-id', 'x-session-token'],
    credentials: true,
  });
}
