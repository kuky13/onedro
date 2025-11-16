/**
 * Authentication cleanup utilities to prevent infinite loops and auth issues
 */

/**
 * Clean up all authentication-related data from storage
 * This prevents "limbo" states where users get stuck in redirect loops
 */
export const cleanupAuthState = (): void => {
  console.log('🧹 Limpando estado de autenticação...');
  
  try {
    // Remove standard auth tokens from localStorage
    const keysToRemove: string[] = [];
    
    // Collect all Supabase auth keys
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-') || key.startsWith('sb.')) {
        keysToRemove.push(key);
      }
    });
    
    // Remove collected keys
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`🗑️ Removed: ${key}`);
    });
    
    // Also clean sessionStorage if it exists
    if (typeof sessionStorage !== 'undefined') {
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-') || key.startsWith('sb.')) {
          sessionStorage.removeItem(key);
          console.log(`🗑️ Removed from session: ${key}`);
        }
      });
    }
    
    console.log('✅ Estado de autenticação limpo');
  } catch (error) {
    console.warn('⚠️ Erro ao limpar estado de autenticação:', error);
  }
};

/**
 * Force a complete page reload to ensure clean state
 */
export const forceReload = (delay: number = 100): void => {
  setTimeout(() => {
    window.location.href = window.location.origin + '/';
  }, delay);
};

/**
 * Safe redirect that prevents loops by cleaning state first
 */
export const safeAuthRedirect = (path: string): void => {
  cleanupAuthState();
  setTimeout(() => {
    window.location.href = window.location.origin + path;
  }, 100);
};