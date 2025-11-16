import { useState, useEffect } from 'react';

// Static admin image URLs mapping
const ADMIN_IMAGE_URLS: Record<string, string> = {
  'system-logo': '/images/system-logo.png',
  'license-active-icon': '/images/license-active.svg',
  'license-expired-icon': '/images/license-expired.svg',
  'license-expiring-icon': '/images/license-expiring.svg',
  'hero-background': '/images/hero-bg.jpg',
  'promotional-banner': '/images/promo-banner.jpg'
};

/**
 * Get admin image URL by name
 * Returns a fallback URL if image not found
 */
export const getAdminImageUrl = async (imageName: string, fallbackUrl?: string): Promise<string> => {
  try {
    const imageUrl = ADMIN_IMAGE_URLS[imageName];
    return imageUrl || fallbackUrl || '';
  } catch (error) {
    console.error('Error fetching admin image:', error);
    return fallbackUrl || '';
  }
};

/**
 * React hook to get admin image URL
 * Useful for components that need reactive image URLs
 */
export const useAdminImageUrl = (imageName: string, fallbackUrl?: string) => {
  const [imageUrl, setImageUrl] = useState<string>(fallbackUrl || '');

  useEffect(() => {
    getAdminImageUrl(imageName, fallbackUrl).then(setImageUrl);
  }, [imageName, fallbackUrl]);

  return imageUrl;
};

// Common admin image names for easy reference
export const ADMIN_IMAGE_NAMES = {
  SYSTEM_LOGO: 'system-logo',
  LICENSE_ACTIVE: 'license-active-icon',
  LICENSE_EXPIRED: 'license-expired-icon',
  LICENSE_EXPIRING: 'license-expiring-icon',
  HERO_BACKGROUND: 'hero-background',
  PROMOTIONAL_BANNER: 'promotional-banner'
} as const;