import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { cspManager } from '@/utils/secureCSP';

type ChatwootConfig = {
  baseUrl: string;
  websiteToken: string;
};

function getChatwootConfig(): ChatwootConfig | null {
  const baseUrl = (import.meta as any).env?.VITE_CHATWOOT_BASE_URL as string | undefined;
  const websiteToken = (import.meta as any).env?.VITE_CHATWOOT_WEBSITE_TOKEN as string | undefined;

  if (!baseUrl || !websiteToken) return null;

  return {
    baseUrl: baseUrl.replace(/\/$/, ''),
    websiteToken,
  };
}

function ensureChatwootScript(config: ChatwootConfig) {
  const w = window as any;
  if (w.__CHATWOOT_LOADED__) return;

  // Liberar o domínio no CSP (img/connect/frame) e usar nonce no script.
  try {
    cspManager.addTrustedDomain(config.baseUrl);
  } catch {
    // ignore
  }

  w.chatwootSettings = w.chatwootSettings || {};

  const scriptId = 'chatwoot-sdk';
  if (document.getElementById(scriptId)) {
    w.__CHATWOOT_LOADED__ = true;
    return;
  }

  const script = document.createElement('script');
  script.id = scriptId;
  script.async = true;
  script.defer = true;
  script.src = `${config.baseUrl}/packs/js/sdk.js`;

  // CSP: permitir este script via nonce
  try {
    script.setAttribute('nonce', cspManager.getNonce());
  } catch {
    // ignore
  }

  script.onload = () => {
    w.__CHATWOOT_LOADED__ = true;
    if (w.chatwootSDK?.run) {
      w.chatwootSDK.run({
        websiteToken: config.websiteToken,
        baseUrl: config.baseUrl,
      });
    }
  };

  document.head.appendChild(script);
}

export function ChatwootWidget() {
  const location = useLocation();

  const config = useMemo(() => getChatwootConfig(), []);

  const enabled =
    !!config &&
    !location.pathname.startsWith('/whatsapp') &&
    !location.pathname.startsWith('/whats');

  useEffect(() => {
    if (!enabled || !config) return;
    ensureChatwootScript(config);
  }, [enabled, config]);

  return null;
}
