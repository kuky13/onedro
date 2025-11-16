// Global type definitions

declare global {
  interface Window {
    gtag?: (
      command: 'config' | 'event' | 'set',
      targetId: string | any,
      config?: any
    ) => void;
  }
}

export {};