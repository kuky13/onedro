import type { QueryClient } from '@tanstack/react-query';

/**
 * Clean up all authentication-related data from storage
 * This prevents "limbo" states where users get stuck in redirect loops
 */
export const cleanupAuthState = (): void => {
  try {
    // Remove standard auth tokens from localStorage
    const keysToRemove: string[] = [];
    
    // Collect all Supabase auth keys
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-') || key.startsWith('sb.')) {
        keysToRemove.push(key);
      }
    });
    
    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
    });
    
    // Also clean sessionStorage if it exists
    if (typeof sessionStorage !== 'undefined') {
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-') || key.startsWith('sb.')) {
          sessionStorage.removeItem(key);
        }
      });
    }

    // Best effort to clear cookies
    try {
      const cookies = document.cookie.split(";");
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        if (!cookie) continue;
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        // Also try with common domains
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname;
      }
    } catch (e) {
      void e;
    }
  } catch (error) {
    void error;
  }
};

export const invalidateAuthCache = async (queryClient: QueryClient) => {
  await queryClient.invalidateQueries();
};
