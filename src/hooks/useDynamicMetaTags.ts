import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { isBotUserAgent, isSocialMediaBot } from '@/utils/botDetection';
import { APP_CONFIG } from '@/config/app';

interface MetaTagsConfig {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  twitterUrl?: string;
  canonicalUrl?: string;
  robots?: string;
}

const normalizeSiteUrl = (url: string) => url.replace(/\/+$/, '');

const toAbsoluteUrl = (siteUrl: string, maybeRelativeUrl: string) => {
  const normalizedSiteUrl = normalizeSiteUrl(siteUrl);
  if (!maybeRelativeUrl) return maybeRelativeUrl;
  if (maybeRelativeUrl.startsWith('http://') || maybeRelativeUrl.startsWith('https://')) return maybeRelativeUrl;
  if (maybeRelativeUrl.startsWith('/')) return `${normalizedSiteUrl}${maybeRelativeUrl}`;
  return `${normalizedSiteUrl}/${maybeRelativeUrl}`;
};

const defaultMetaTags: MetaTagsConfig = {
  title: APP_CONFIG.name,
  description: 'Sistema para assistências técnicas: orçamentos, ordens de serviço e loja online.',
  ogTitle: APP_CONFIG.name,
  ogDescription: 'Sistema para assistências técnicas: orçamentos, ordens de serviço e loja online.',
  ogImage: toAbsoluteUrl(APP_CONFIG.urls.main, '/icons/icon-512x512.png'),
  ogUrl: `${normalizeSiteUrl(APP_CONFIG.urls.main)}/`,
  twitterTitle: APP_CONFIG.name,
  twitterDescription: 'Sistema para assistências técnicas: orçamentos, ordens de serviço e loja online.',
  twitterImage: toAbsoluteUrl(APP_CONFIG.urls.main, '/icons/icon-512x512.png'),
  twitterUrl: `${normalizeSiteUrl(APP_CONFIG.urls.main)}/`,
  canonicalUrl: `${normalizeSiteUrl(APP_CONFIG.urls.main)}/`
};

const shareOrderMetaTags: MetaTagsConfig = {
  title: `${APP_CONFIG.name} | Ordem de serviço`,
  description: 'Acompanhe o status da sua ordem de serviço.',
  ogTitle: `${APP_CONFIG.name} | Ordem de serviço`,
  ogDescription: 'Acompanhe o status da sua ordem de serviço.',
  ogImage: toAbsoluteUrl(APP_CONFIG.urls.main, '/icons/icon-512x512.png'),
  twitterTitle: `${APP_CONFIG.name} | Ordem de serviço`,
  twitterDescription: 'Acompanhe o status da sua ordem de serviço.',
  twitterImage: toAbsoluteUrl(APP_CONFIG.urls.main, '/icons/icon-512x512.png'),
  robots: 'noindex, nofollow'
};

export function useDynamicMetaTags() {
  const location = useLocation();

  const updateMetaTag = (selector: string, attribute: string, value: string) => {
    let element = document.querySelector(selector) as HTMLMetaElement;
    
    if (!element) {
      element = document.createElement('meta');
      if (attribute === 'property') {
        element.setAttribute('property', selector.replace('meta[property="', '').replace('"]', ''));
      } else if (attribute === 'name') {
        element.setAttribute('name', selector.replace('meta[name="', '').replace('"]', ''));
      }
      document.head.appendChild(element);
    }
    
    element.setAttribute('content', value);
  };

  const updateLinkTag = (selector: string, value: string) => {
    let element = document.querySelector(selector) as HTMLLinkElement;
    if (!element) {
      element = document.createElement('link');
      const relMatch = selector.match(/^link\[rel="([^"]+)"\]$/);
      if (relMatch?.[1]) {
        element.setAttribute('rel', relMatch[1]);
      }
      document.head.appendChild(element);
    }
    element.setAttribute('href', value);
  };

  const updateTitle = (title: string) => {
    document.title = title;
  };

  const applyMetaTags = (config: MetaTagsConfig) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : normalizeSiteUrl(APP_CONFIG.urls.main);
    const resolvedCanonical = config.canonicalUrl ?? `${origin}${location.pathname}`;
    const resolvedOgUrl = config.ogUrl ?? resolvedCanonical;
    const resolvedTwitterUrl = config.twitterUrl ?? resolvedCanonical;

    if (config.title) {
      updateTitle(config.title);
    }

    if (config.description) {
      updateMetaTag('meta[name="description"]', 'name', config.description);
    }

    if (config.robots) {
      updateMetaTag('meta[name="robots"]', 'name', config.robots);
    }

    if (config.ogTitle) {
      updateMetaTag('meta[property="og:title"]', 'property', config.ogTitle);
    }

    if (config.ogDescription) {
      updateMetaTag('meta[property="og:description"]', 'property', config.ogDescription);
    }

    if (config.ogImage) {
      updateMetaTag('meta[property="og:image"]', 'property', config.ogImage);
    }

    if (resolvedOgUrl) {
      updateMetaTag('meta[property="og:url"]', 'property', resolvedOgUrl);
    }

    if (config.twitterTitle) {
      updateMetaTag('meta[name="twitter:title"]', 'name', config.twitterTitle);
    }

    if (config.twitterDescription) {
      updateMetaTag('meta[name="twitter:description"]', 'name', config.twitterDescription);
    }

    if (config.twitterImage) {
      updateMetaTag('meta[name="twitter:image"]', 'name', config.twitterImage);
    }

    if (resolvedTwitterUrl) {
      updateMetaTag('meta[name="twitter:url"]', 'name', resolvedTwitterUrl);
    }

    if (resolvedCanonical) {
      updateLinkTag('link[rel="canonical"]', resolvedCanonical);
    }
  };

  useEffect(() => {
    // Detecta se estamos na rota de compartilhamento de ordem de serviço
    const isShareOrderRoute = location.pathname.startsWith('/share/service-order/');
    
    if (isShareOrderRoute) {
      applyMetaTags({
        ...shareOrderMetaTags,
        canonicalUrl: `${(typeof window !== 'undefined' ? window.location.origin : normalizeSiteUrl(APP_CONFIG.urls.main))}${location.pathname}`,
        ogUrl: `${(typeof window !== 'undefined' ? window.location.origin : normalizeSiteUrl(APP_CONFIG.urls.main))}${location.pathname}`,
        twitterUrl: `${(typeof window !== 'undefined' ? window.location.origin : normalizeSiteUrl(APP_CONFIG.urls.main))}${location.pathname}`
      });
    } else {
      // Aplica meta tags padrão para outras rotas
      applyMetaTags({
        ...defaultMetaTags,
        canonicalUrl: `${(typeof window !== 'undefined' ? window.location.origin : normalizeSiteUrl(APP_CONFIG.urls.main))}${location.pathname}`,
        ogUrl: `${(typeof window !== 'undefined' ? window.location.origin : normalizeSiteUrl(APP_CONFIG.urls.main))}${location.pathname}`,
        twitterUrl: `${(typeof window !== 'undefined' ? window.location.origin : normalizeSiteUrl(APP_CONFIG.urls.main))}${location.pathname}`
      });
    }

    // Cleanup function para restaurar meta tags padrão quando sair da rota
    return () => {
      if (isShareOrderRoute) {
        applyMetaTags(defaultMetaTags);
      }
    };
  }, [location.pathname]);

  return {
    applyMetaTags,
    updateTitle,
    isShareOrderRoute: location.pathname.startsWith('/share/service-order/'),
    isBot: isBotUserAgent() || isSocialMediaBot(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
  };
}
