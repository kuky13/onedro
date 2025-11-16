/**
 * Detecta se o user-agent é de um bot/crawler (WhatsApp, Facebook, etc.)
 * para mostrar meta tags específicas para prévia de links
 */

const BOT_USER_AGENTS = [
  // WhatsApp
  'WhatsApp',
  'facebookexternalhit',
  
  // Facebook
  'facebookexternalhit/1.1',
  'Facebot',
  
  // Twitter
  'Twitterbot',
  'twitterbot',
  
  // Telegram
  'TelegramBot',
  
  // LinkedIn
  'LinkedInBot',
  
  // Discord
  'Discordbot',
  
  // Slack
  'Slackbot',
  
  // Google (para SEO)
  'Googlebot',
  'Google-StructuredDataTestingTool',
  
  // Outros crawlers comuns
  'bingbot',
  'YandexBot',
  'DuckDuckBot',
  'Applebot',
  'ia_archiver',
  'SemrushBot',
  'AhrefsBot',
  'MJ12bot',
  'DotBot',
  'Baiduspider',
  'YisouSpider',
  'SogouSpider',
  'exabot',
  'facebookplatform',
  'Embedly',
  'quora link preview',
  'showyoubot',
  'outbrain',
  'pinterest/0.',
  'developers.google.com/+/web/snippet',
  'slackbot',
  'vkShare',
  'W3C_Validator',
  'redditbot',
  'Applebot',
  'WhatsApp/2',
  'SkypeUriPreview',
  'nuzzel',
  'Discordbot',
  'Google Page Speed',
  'Qwantify',
  'bitlybot',
  'tumblr',
  'bitlybot',
  'SkypeUriPreview',
  'nuzzel',
  'Discordbot',
  'Google Page Speed',
  'Qwantify'
];

/**
 * Verifica se o user-agent atual é de um bot/crawler
 */
export function isBotUserAgent(userAgent?: string): boolean {
  if (!userAgent) {
    userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  }
  
  if (!userAgent) {
    return false;
  }

  const lowerUserAgent = userAgent.toLowerCase();
  
  return BOT_USER_AGENTS.some(botAgent => 
    lowerUserAgent.includes(botAgent.toLowerCase())
  );
}

/**
 * Verifica se é um bot específico do WhatsApp
 */
export function isWhatsAppBot(userAgent?: string): boolean {
  if (!userAgent) {
    userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  }
  
  if (!userAgent) {
    return false;
  }

  const lowerUserAgent = userAgent.toLowerCase();
  
  return lowerUserAgent.includes('whatsapp') || 
         lowerUserAgent.includes('facebookexternalhit');
}

/**
 * Verifica se é um bot de redes sociais
 */
export function isSocialMediaBot(userAgent?: string): boolean {
  if (!userAgent) {
    userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  }
  
  if (!userAgent) {
    return false;
  }

  const lowerUserAgent = userAgent.toLowerCase();
  const socialBots = [
    'whatsapp',
    'facebookexternalhit',
    'twitterbot',
    'telegrambot',
    'linkedinbot',
    'discordbot',
    'slackbot'
  ];
  
  return socialBots.some(bot => lowerUserAgent.includes(bot));
}

/**
 * Detecta o tipo de bot/crawler
 */
export function getBotType(userAgent?: string): string | null {
  if (!userAgent) {
    userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  }
  
  if (!userAgent) {
    return null;
  }

  const lowerUserAgent = userAgent.toLowerCase();
  
  if (lowerUserAgent.includes('whatsapp')) return 'whatsapp';
  if (lowerUserAgent.includes('facebookexternalhit')) return 'facebook';
  if (lowerUserAgent.includes('twitterbot')) return 'twitter';
  if (lowerUserAgent.includes('telegrambot')) return 'telegram';
  if (lowerUserAgent.includes('linkedinbot')) return 'linkedin';
  if (lowerUserAgent.includes('discordbot')) return 'discord';
  if (lowerUserAgent.includes('slackbot')) return 'slack';
  if (lowerUserAgent.includes('googlebot')) return 'google';
  
  return isBotUserAgent(userAgent) ? 'other' : null;
}