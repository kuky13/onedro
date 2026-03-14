/// <reference types="vite/client" />

// Extend if you add custom env vars. Vite already provides: MODE, BASE_URL, PROD, DEV, SSR.
interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const __APP_VERSION__: string;
