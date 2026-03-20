import * as Sentry from '@sentry/react';

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // Captura 10% das transações em prod
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    // Captura 10% das sessões em prod, 100% em erros
    replaysSessionSampleRate: import.meta.env.PROD ? 0.1 : 0,
    replaysOnErrorSampleRate: 1.0,
    // Ignora erros de rede esperados (AbortError, chunk load)
    ignoreErrors: [
      'AbortError',
      'Failed to fetch dynamically imported module',
      'Importing a module script failed',
      'Load failed',
      'NetworkError',
    ],
    beforeSend(event) {
      // Não enviar erros gerados por extensões do Chrome
      if (event.exception?.values?.[0]?.stacktrace?.frames?.some(
        (frame) => frame.filename?.includes('chrome-extension://')
      )) {
        return null;
      }
      return event;
    },
  });
}

export { Sentry };
