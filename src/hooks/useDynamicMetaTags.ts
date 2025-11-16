import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { isBotUserAgent, isSocialMediaBot } from '@/utils/botDetection';

interface MetaTagsConfig {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
}

const defaultMetaTags: MetaTagsConfig = {
  title: 'OneDrip',
  description: 'Sistema completo para assistências técnicas gerenciarem orçamentos, clientes e relatórios de forma eficiente e organizada.',
  ogTitle: 'OneDrip',
  ogDescription: 'O melhor sistema de orçamentos para sua empresa',
  ogImage: '/icons/icon-512x512.png',
  twitterTitle: 'OneDrip',
  twitterDescription: 'O melhor sistema de orçamentos para sua empresa',
  twitterImage: '/icons/icon-512x512.png'
};

// Meta tags específicas para bots na rota de compartilhamento (prévia do WhatsApp) - VAZIO
const shareOrderBotMetaTags: MetaTagsConfig = {
  title: ' ',
  description: ' ',
  ogTitle: ' ',
  ogDescription: ' ',
  ogImage: '',
  twitterTitle: ' ',
  twitterDescription: ' ',
  twitterImage: ''
};

// Meta tags para usuários reais (quando clicam no link)
const shareOrderUserMetaTags: MetaTagsConfig = {
  title: 'OneDrip',
  description: 'O melhor sistema de orçamentos para sua empresa',
  ogTitle: 'OneDrip',
  ogDescription: 'O melhor sistema de orçamentos para sua empresa',
  ogImage: '/icons/icon-512x512.png',
  twitterTitle: 'OneDrip',
  twitterDescription: 'O melhor sistema de orçamentos para sua empresa',
  twitterImage: '/icons/icon-512x512.png'
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

  const updateTitle = (title: string) => {
    document.title = title;
  };

  const applyMetaTags = (config: MetaTagsConfig) => {
    if (config.title) {
      updateTitle(config.title);
    }

    if (config.description) {
      updateMetaTag('meta[name="description"]', 'name', config.description);
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

    if (config.twitterTitle) {
      updateMetaTag('meta[property="twitter:title"]', 'property', config.twitterTitle);
    }

    if (config.twitterDescription) {
      updateMetaTag('meta[property="twitter:description"]', 'property', config.twitterDescription);
    }

    if (config.twitterImage) {
      updateMetaTag('meta[property="twitter:image"]', 'property', config.twitterImage);
    }
  };

  useEffect(() => {
    // Detecta se estamos na rota de compartilhamento de ordem de serviço
    const isShareOrderRoute = location.pathname.startsWith('/share/service-order/');
    
    if (isShareOrderRoute) {
      // Detecta se é um bot/crawler ou usuário real
      const isBot = isBotUserAgent() || isSocialMediaBot();
      
      if (isBot) {
        // Para bots (prévia do WhatsApp): meta tags vazias
        applyMetaTags(shareOrderBotMetaTags);
      } else {
        // Para usuários reais: mostra "OneDrip"
        applyMetaTags(shareOrderUserMetaTags);
      }
    } else {
      // Aplica meta tags padrão para outras rotas
      applyMetaTags(defaultMetaTags);
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