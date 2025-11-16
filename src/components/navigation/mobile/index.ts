// @ts-nocheck
// Main navigation system
export { MobileNavigationSystem } from './MobileNavigationSystem';
export { default as MobileNavigationSystemDefault } from './MobileNavigationSystem';

// Individual components
export { MobileBreadcrumbs } from './MobileBreadcrumbs';
export { BottomTabNavigation } from './BottomTabNavigation';
export { MobileCommandPalette } from './MobileCommandPalette';
export { FloatingActionButton } from './FloatingActionButton';
export { NativeGestures } from './NativeGestures';
export { GlobalSearch } from './GlobalSearch';
export { FavoritesSystem } from './FavoritesSystem';
export { PWAConfig, PWAMetaTags } from './PWAConfig';

// Example implementation
// MobileNavigationExample removed - was unused

// Types
export interface NavigationTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  path: string;
  badge?: number;
}

export interface BreadcrumbItem {
  label: string;
  path: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}

export interface Command {
  id: string;
  label: string;
  description?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  action: () => void;
  keywords?: string[];
  category?: string;
}

export interface SearchResult {
  id: string;
  title: string;
  description?: string;
  path: string;
  type: 'page' | 'action' | 'content';
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}

export interface FavoriteItem {
  id: string;
  title: string;
  path: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  order: number;
}

export interface FABAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  action: () => void;
  color?: string;
}

// Utility functions
export const generateBreadcrumbs = (pathname: string): BreadcrumbItem[] => {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Home', path: '/' }
  ];

  let currentPath = '';
  segments.forEach(segment => {
    currentPath += `/${segment}`;
    const label = segment.charAt(0).toUpperCase() + segment.slice(1);
    breadcrumbs.push({ label, path: currentPath });
  });

  return breadcrumbs;
};

export const hapticFeedback = (type: 'light' | 'medium' | 'heavy' = 'light'): void => {
  if ('vibrate' in navigator) {
    const patterns = {
      light: [10],
      medium: [30],
      heavy: [50]
    };
    navigator.vibrate(patterns[type]);
  }
};

export const isIOSDevice = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
};

export const isSafari = (): boolean => {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
};

export const isPWAInstalled = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches;
};

export const canInstallPWA = (): boolean => {
  return 'serviceWorker' in navigator && 'PushManager' in window;
};