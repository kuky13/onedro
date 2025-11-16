/**
 * Componente de Headers de Segurança
 * OneDrip - CSP e Meta Security Tags
 */

import { useEffect, useRef } from 'react';

// Flag global para evitar múltiplos overrides
let consoleErrorOverridden = false;
let originalConsoleError: typeof console.error | null = null;

export const SecurityHeaders = () => {
  const isInitialized = useRef(false);

  useEffect(() => {
    // Evitar múltiplas inicializações
    if (isInitialized.current) return;
    isInitialized.current = true;
    // Configurar Content Security Policy
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://oghjlypdnmqecaavekyr.supabase.co wss://oghjlypdnmqecaavekyr.supabase.co https://api.stripe.com",
      "frame-src 'self' https://www.youtube.com https://www.google.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests"
    ];

    // Aplicar CSP via meta tag
    let cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (!cspMeta) {
      cspMeta = document.createElement('meta');
      cspMeta.setAttribute('http-equiv', 'Content-Security-Policy');
      document.head.appendChild(cspMeta);
    }
    cspMeta.setAttribute('content', cspDirectives.join('; '));

    // Meta tags de segurança básicas (apenas as que são seguras via meta tag)
    const securityMetas = [
      { name: 'referrer', content: 'strict-origin-when-cross-origin' },
      { name: 'robots', content: 'index, follow' } // Permitir indexação para produção
    ];

    securityMetas.forEach(meta => {
      let existingMeta = document.querySelector(`meta[name="${meta.name}"]`);
      
      if (!existingMeta) {
        existingMeta = document.createElement('meta');
        existingMeta.setAttribute('name', meta.name);
        document.head.appendChild(existingMeta);
      }
      
      existingMeta.setAttribute('content', meta.content);
    });

    // Configurar headers de performance e segurança
    if ('serviceWorker' in navigator) {
      // Registrar service worker para cache seguro
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Falha silenciosa
      });
    }

    // Configurações de segurança do localStorage
    try {
      // Limpar dados sensíveis antigos, mas preservar tokens de autenticação do Supabase
      const sensitiveKeys = Object.keys(localStorage).filter(key => 
        (key.includes('password') || 
         key.includes('token') ||
         key.includes('secret')) &&
        !key.includes('sb-') && // Preservar tokens do Supabase
        !key.includes('supabase') // Preservar dados do Supabase
      );
      
      sensitiveKeys.forEach(key => {
        localStorage.removeItem(key);
      });
    } catch {
      // Falha silenciosa
    }

    // Configuração básica de segurança sem override do console
    // (removido para evitar conflitos e loops infinitos)

    return () => {
      // Cleanup básico
    };
  }, []);

  return null; // Componente só para efeitos colaterais
};

export default SecurityHeaders;